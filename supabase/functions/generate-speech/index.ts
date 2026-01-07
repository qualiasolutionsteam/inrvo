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
}
const voiceProfileCache = new Map<string, CachedVoiceProfile>();
const VOICE_CACHE_TTL = 3600000; // 1 hour (voice profiles rarely change)

// Cleanup voice cache periodically
function cleanupVoiceCache(): void {
  const now = Date.now();
  for (const [key, entry] of voiceProfileCache.entries()) {
    if (now > entry.expiry) {
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

// TTS request timeout (120 seconds for long meditations)
const TTS_TIMEOUT_MS = 120000;

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
    const { text, voiceId, elevenLabsVoiceId, voiceSettings }: GenerateSpeechRequest = await req.json();

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

        // Cache the profile
        voiceProfileCache.set(cacheKey, {
          data: voiceProfile,
          expiry: Date.now() + VOICE_CACHE_TTL,
        });
        log.info('Voice profile cached', { voiceId, ttl: VOICE_CACHE_TTL });
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

    // Generate speech with circuit breaker protection
    const result = await withCircuitBreaker(
      'elevenlabs',
      CIRCUIT_CONFIGS['elevenlabs'],
      () => runElevenLabsTTS(text, targetVoiceId!, voiceSettings, ELEVENLABS_API_KEY!, log)
    );

    log.info('TTS generation successful', { audioSize: result.base64.length });

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
