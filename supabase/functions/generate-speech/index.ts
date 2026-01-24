import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, createCompressedResponse } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { arrayBufferToBase64 } from "../_shared/encoding.ts";
import { addSecurityHeaders } from "../_shared/securityHeaders.ts";
import { withCircuitBreaker, CIRCUIT_CONFIGS, CircuitBreakerError } from "../_shared/circuitBreaker.ts";
import { getModelId, getVoiceSettings, USE_V3_MODEL, ELEVENLABS_MODELS } from "../_shared/elevenlabsConfig.ts";
import { prepareMeditationText } from "../_shared/textPreprocessing.ts";
import { sanitizeScriptContent, INPUT_LIMITS } from "../_shared/sanitization.ts";
import { chunkText, needsChunking, type TextChunk } from "../_shared/textChunking.ts";

/**
 * Generate Speech - Unified TTS endpoint using ElevenLabs
 *
 * ElevenLabs is the primary (and only) TTS provider.
 * Web Speech API fallback is handled client-side.
 *
 * V3 Alpha Model Features:
 * - Native audio tags: [sighs], [whispers], [calm], [thoughtfully]
 * - Natural breathing sounds for meditation content
 * - Improved emotional expression
 * - Use USE_V3_MODEL flag to toggle between V3 and V2
 *
 * Performance optimizations:
 * - Native base64 encoding (60-70% faster)
 * - Voice profile caching (saves 50-150ms per request)
 * - Environment variables cached at module level
 * - Circuit breaker for resilience
 */

interface GenerateSpeechRequest {
  text: string;
  voiceId?: string;             // Voice profile ID (UUID)
  elevenLabsVoiceId?: string;   // Direct ElevenLabs voice ID (for preset voices)
  stream?: boolean;             // If true, stream audio directly (no base64)
  voiceSettings?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  };
}

interface GenerateSpeechResponse {
  success: boolean;
  audioBase64?: string;
  format?: string;
  error?: string;
  requestId?: string;
}

// ============================================================================
// Module-level caches (persist across warm starts)
// ============================================================================

// Cache environment variable at module level (saves 1-2ms per request)
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

// Voice profile cache (saves 50-150ms database lookup per request)
interface CachedVoiceProfile {
  data: {
    elevenlabs_voice_id: string | null;
    voice_sample_url: string | null;
    provider: string | null;
    cloning_status: string | null;
  };
  expiry: number;
  lastAccess: number; // For LRU eviction
}
const voiceProfileCache = new Map<string, CachedVoiceProfile>();
const VOICE_CACHE_TTL = 3600000; // 1 hour (voice profiles rarely change)
const VOICE_CACHE_MAX_SIZE = 100; // Max entries to prevent unbounded growth

// Cleanup voice cache with LRU eviction
function cleanupVoiceCache(): void {
  const now = Date.now();

  // First, remove expired entries
  for (const [key, entry] of voiceProfileCache.entries()) {
    if (now > entry.expiry) {
      voiceProfileCache.delete(key);
    }
  }

  // Then, if still over max size, evict least recently used
  if (voiceProfileCache.size > VOICE_CACHE_MAX_SIZE) {
    const entries = [...voiceProfileCache.entries()]
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    // Remove oldest entries until under limit
    const toRemove = entries.slice(0, voiceProfileCache.size - VOICE_CACHE_MAX_SIZE);
    for (const [key] of toRemove) {
      voiceProfileCache.delete(key);
    }
  }
}

// Lazy-load Supabase client
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }
  return supabaseClient;
}

// ============================================================================
// ElevenLabs TTS (Primary Provider)
// ============================================================================

// TTS request timeout (8 minutes for very long meditations)
// ElevenLabs can take 4-5 minutes for 10+ minute meditations
const TTS_TIMEOUT_MS = 480000;

/**
 * Stream TTS audio from ElevenLabs
 * Uses the streaming endpoint to get audio chunks as they're generated
 * This prevents timeout issues by starting the response immediately
 */
async function streamElevenLabsTTS(
  text: string,
  elevenLabsVoiceId: string,
  options: GenerateSpeechRequest['voiceSettings'],
  apiKey: string,
  log: ReturnType<typeof createLogger>
): Promise<Response> {
  const modelId = getModelId();

  log.info('Streaming speech with ElevenLabs', {
    voiceId: elevenLabsVoiceId,
    textLength: text.length,
    model: modelId,
    useV3: USE_V3_MODEL,
  });

  const { text: preparedText, warnings, originalLength, processedLength } = prepareMeditationText(text);

  if (warnings.length > 0) {
    log.warn('Text preprocessing warnings', { warnings, originalLength, processedLength });
  }

  const voiceSettings = USE_V3_MODEL
    ? getVoiceSettings(ELEVENLABS_MODELS.V3, {
        stability: options?.stability,
        similarity_boost: options?.similarityBoost,
      })
    : getVoiceSettings(ELEVENLABS_MODELS.V2, {
        stability: options?.stability,
        similarity_boost: options?.similarityBoost,
        style: options?.style,
        use_speaker_boost: options?.useSpeakerBoost,
      });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

  try {
    // Use streaming endpoint - returns audio chunks as they're generated
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}/stream?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: preparedText,
          model_id: modelId,
          voice_settings: voiceSettings,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      log.error('ElevenLabs streaming API error', { status: response.status, error: errorText });

      if (response.status === 401) {
        throw new Error('ElevenLabs authentication failed. Please check your API key.');
      }
      if (response.status === 429) {
        throw new Error('ElevenLabs rate limit exceeded. Please try again later.');
      }
      if (response.status === 400) {
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(`ElevenLabs error: ${errorJson.detail?.message || errorText}`);
        } catch {
          throw new Error(`ElevenLabs API error: ${errorText}`);
        }
      }
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    log.info('ElevenLabs streaming started');
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('ElevenLabs request timed out. Please try again.');
    }
    throw error;
  }
}

async function runElevenLabsTTS(
  text: string,
  elevenLabsVoiceId: string,
  options: GenerateSpeechRequest['voiceSettings'],
  apiKey: string,
  log: ReturnType<typeof createLogger>
): Promise<{ base64: string; format: string }> {
  // Get model ID based on feature flag
  const modelId = getModelId();

  log.info('Generating speech with ElevenLabs', {
    voiceId: elevenLabsVoiceId,
    textLength: text.length,
    model: modelId,
    useV3: USE_V3_MODEL,
  });

  // Prepare text for meditation (V3 uses native audio tags, V2 uses ellipses)
  const { text: preparedText, warnings, originalLength, processedLength } = prepareMeditationText(text);

  // Log any text processing warnings
  if (warnings.length > 0) {
    log.warn('Text preprocessing warnings', { warnings, originalLength, processedLength });
  }

  // Get voice settings based on model version
  const voiceSettings = USE_V3_MODEL
    ? getVoiceSettings(ELEVENLABS_MODELS.V3, {
        stability: options?.stability,
        similarity_boost: options?.similarityBoost,
      })
    : getVoiceSettings(ELEVENLABS_MODELS.V2, {
        stability: options?.stability,
        similarity_boost: options?.similarityBoost,
        style: options?.style,
        use_speaker_boost: options?.useSpeakerBoost,
      });

  // Add timeout protection to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: preparedText,
          model_id: modelId,
          voice_settings: voiceSettings,
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      log.error('ElevenLabs API error', { status: response.status, error: errorText });

      if (response.status === 401) {
        throw new Error('ElevenLabs authentication failed. Please check your API key.');
      }
      if (response.status === 429) {
        throw new Error('ElevenLabs rate limit exceeded. Please try again later.');
      }
      if (response.status === 400) {
        // Parse error for more specific message
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(`ElevenLabs error: ${errorJson.detail?.message || errorText}`);
        } catch {
          throw new Error(`ElevenLabs API error: ${errorText}`);
        }
      }
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();

    // Use native base64 encoding (60-70% faster than manual chunked approach)
    const base64 = arrayBufferToBase64(audioBuffer);

    log.info('ElevenLabs TTS successful', { audioSize: audioBuffer.byteLength });
    return { base64, format: 'audio/mpeg' };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('ElevenLabs request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// Chunked TTS for Long Text (>5000 characters)
// ============================================================================

/**
 * Generate TTS for a single chunk with context for continuity
 */
async function generateChunkAudio(
  chunk: TextChunk,
  elevenLabsVoiceId: string,
  options: GenerateSpeechRequest['voiceSettings'],
  apiKey: string,
  log: ReturnType<typeof createLogger>
): Promise<ArrayBuffer> {
  const modelId = getModelId();
  const { text: preparedText } = prepareMeditationText(chunk.text);

  const voiceSettings = USE_V3_MODEL
    ? getVoiceSettings(ELEVENLABS_MODELS.V3, {
        stability: options?.stability,
        similarity_boost: options?.similarityBoost,
      })
    : getVoiceSettings(ELEVENLABS_MODELS.V2, {
        stability: options?.stability,
        similarity_boost: options?.similarityBoost,
        style: options?.style,
        use_speaker_boost: options?.useSpeakerBoost,
      });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

  try {
    const requestBody: Record<string, unknown> = {
      text: preparedText,
      model_id: modelId,
      voice_settings: voiceSettings,
    };

    // Add context for continuity between chunks
    if (chunk.previousText) {
      requestBody.previous_text = chunk.previousText;
    }
    if (chunk.nextText) {
      requestBody.next_text = chunk.nextText;
    }

    log.info(`Generating chunk ${chunk.index + 1}`, {
      textLength: preparedText.length,
      hasPreviousContext: !!chunk.previousText,
      hasNextContext: !!chunk.nextText,
    });

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      log.error(`ElevenLabs chunk ${chunk.index + 1} error`, { status: response.status, error: errorText });
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    return await response.arrayBuffer();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate TTS for long text by chunking and concatenating
 * Uses previous_text/next_text for smooth transitions between chunks
 */
async function runChunkedElevenLabsTTS(
  text: string,
  elevenLabsVoiceId: string,
  options: GenerateSpeechRequest['voiceSettings'],
  apiKey: string,
  log: ReturnType<typeof createLogger>
): Promise<{ base64: string; format: string }> {
  const chunks = chunkText(text);

  log.info('Starting chunked TTS generation', {
    totalLength: text.length,
    chunkCount: chunks.length,
    chunkSizes: chunks.map(c => c.text.length),
  });

  // Generate audio for each chunk sequentially (to maintain order and use context properly)
  const audioBuffers: ArrayBuffer[] = [];

  for (const chunk of chunks) {
    const audioBuffer = await generateChunkAudio(
      chunk,
      elevenLabsVoiceId,
      options,
      apiKey,
      log
    );
    audioBuffers.push(audioBuffer);
    log.info(`Chunk ${chunk.index + 1}/${chunks.length} complete`, {
      audioSize: audioBuffer.byteLength,
    });
  }

  // Concatenate all audio buffers
  const totalSize = audioBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const combined = new Uint8Array(totalSize);
  let offset = 0;

  for (const buffer of audioBuffers) {
    combined.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }

  log.info('Chunked TTS complete', {
    totalAudioSize: totalSize,
    chunkCount: chunks.length,
  });

  return {
    base64: arrayBufferToBase64(combined.buffer),
    format: 'audio/mpeg',
  };
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const requestId = getRequestId(req);
  const tracingHeaders = getTracingHeaders(requestId);
  const allHeaders = addSecurityHeaders({ ...corsHeaders, ...tracingHeaders });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: allHeaders });
  }

  const log = createLogger({ requestId, operation: 'generate-speech' });

  try {
    // Check if API key is configured
    if (!ELEVENLABS_API_KEY) {
      log.error('ELEVENLABS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'TTS service not configured', requestId }),
        { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header', requestId }),
        { status: 401, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', requestId }),
        { status: 401, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit check
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.tts);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, allHeaders);
    }

    // Parse request
    const { text: rawText, voiceId, elevenLabsVoiceId, voiceSettings, stream }: GenerateSpeechRequest = await req.json();

    // Sanitize text input to prevent control characters and limit length
    const textSanitization = sanitizeScriptContent(rawText || '', INPUT_LIMITS.script);
    const text = textSanitization.sanitized;

    if (textSanitization.wasModified) {
      log.warn('TTS text was sanitized', {
        originalLength: rawText?.length || 0,
        sanitizedLength: text.length,
        truncated: textSanitization.truncated,
      });
    }

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Missing text parameter', requestId }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine the ElevenLabs voice ID to use
    let targetVoiceId = elevenLabsVoiceId;

    // If no direct ElevenLabs ID provided, look up from voice profile
    if (!targetVoiceId && voiceId) {
      // Check voice profile cache first (saves 50-150ms database lookup)
      const cacheKey = `${user.id}:${voiceId}`;
      let voiceProfile: CachedVoiceProfile['data'] | null = null;

      const cached = voiceProfileCache.get(cacheKey);
      if (cached && Date.now() < cached.expiry) {
        voiceProfile = cached.data;
        cached.lastAccess = Date.now(); // Update LRU timestamp
        log.info('Voice profile cache hit', { voiceId });
      } else {
        // Cleanup old cache entries periodically
        cleanupVoiceCache();

        // Fetch from database
        const { data, error: profileError } = await supabase
          .from('voice_profiles')
          .select('elevenlabs_voice_id, voice_sample_url, provider, cloning_status')
          .eq('id', voiceId)
          .eq('user_id', user.id)
          .single();

        if (profileError || !data) {
          log.error('Voice profile not found', { voiceId, error: profileError?.message });
          return new Response(
            JSON.stringify({ error: 'Voice not found. Please select a different voice.', requestId }),
            { status: 404, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
          );
        }

        voiceProfile = data;

        // Cache the profile with LRU timestamp
        const now = Date.now();
        voiceProfileCache.set(cacheKey, {
          data: voiceProfile,
          expiry: now + VOICE_CACHE_TTL,
          lastAccess: now,
        });
        log.info('Voice profile cached', { voiceId, ttl: VOICE_CACHE_TTL, cacheSize: voiceProfileCache.size });
      }

      log.info('Found voice profile', {
        voiceId,
        provider: voiceProfile.provider,
        hasElevenLabsId: !!voiceProfile.elevenlabs_voice_id,
        cloningStatus: voiceProfile.cloning_status,
      });

      // Check if voice needs re-cloning (legacy Fish Audio/Chatterbox voice)
      if (voiceProfile.cloning_status === 'NEEDS_RECLONE' || !voiceProfile.elevenlabs_voice_id) {
        return new Response(
          JSON.stringify({
            error: 'This voice needs to be re-cloned with ElevenLabs. Please go to Voice Settings and re-clone your voice.',
            needsReclone: true,
            requestId,
          }),
          { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
        );
      }

      targetVoiceId = voiceProfile.elevenlabs_voice_id;
    }

    if (!targetVoiceId) {
      return new Response(
        JSON.stringify({ error: 'No voice ID provided', requestId }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Streaming mode: stream audio directly from ElevenLabs
    // This prevents timeout issues by starting response immediately
    if (stream) {
      log.info('Using streaming mode for TTS');

      const elevenLabsResponse = await withCircuitBreaker(
        'elevenlabs',
        CIRCUIT_CONFIGS['elevenlabs'],
        () => streamElevenLabsTTS(text, targetVoiceId!, voiceSettings, ELEVENLABS_API_KEY!, log)
      );

      // Pass through the streaming response with our headers
      return new Response(elevenLabsResponse.body, {
        status: 200,
        headers: {
          ...allHeaders,
          'Content-Type': 'audio/mpeg',
          'X-Request-ID': requestId,
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    // Non-streaming mode: return base64 JSON (legacy behavior)
    // Use chunked TTS for long texts (>5000 chars) to avoid ElevenLabs limit
    const usesChunking = needsChunking(text);

    if (usesChunking) {
      log.info('Text exceeds limit, using chunked TTS', { textLength: text.length });
    }

    const result = await withCircuitBreaker(
      'elevenlabs',
      CIRCUIT_CONFIGS['elevenlabs'],
      () => usesChunking
        ? runChunkedElevenLabsTTS(text, targetVoiceId!, voiceSettings, ELEVENLABS_API_KEY!, log)
        : runElevenLabsTTS(text, targetVoiceId!, voiceSettings, ELEVENLABS_API_KEY!, log)
    );

    log.info('TTS generation successful', { audioSize: result.base64.length, chunked: usesChunking });

    // Skip compression for audio responses (MP3 is already compressed)
    return await createCompressedResponse(
      {
        success: true,
        audioBase64: result.base64,
        format: result.format,
        requestId,
      } as GenerateSpeechResponse,
      allHeaders,
      { minSize: 0, skipCompression: true }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    log.error('Error generating speech', error instanceof Error ? error : new Error(String(error)));

    const isCircuitOpen = error instanceof CircuitBreakerError;

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        isCircuitOpen,
        retryAfterMs: isCircuitOpen ? (error as CircuitBreakerError).retryAfterMs : undefined,
        requestId,
      }),
      { status: isCircuitOpen ? 503 : 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
