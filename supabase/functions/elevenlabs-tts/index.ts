import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, createCompressedResponse } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { withCircuitBreaker, CIRCUIT_CONFIGS, CircuitBreakerError } from "../_shared/circuitBreaker.ts";
import { addSecurityHeaders } from "../_shared/securityHeaders.ts";

/**
 * ElevenLabs TTS Edge Function
 *
 * Uses ElevenLabs API for high-quality TTS with voice cloning.
 * Primary voice provider for INrVO meditation app.
 *
 * ElevenLabs advantages:
 * - Industry-leading voice quality
 * - Excellent voice cloning
 * - Stable API with good uptime
 * - Character-level timing for sync (optional)
 *
 * Settings optimized for cloned voices (meditation):
 * - Model: eleven_multilingual_v2 (best quality)
 * - Stability: 0.5 (balanced output)
 * - Similarity: 0.85 (high voice matching for clones)
 * - Style: 0.0 (keeps natural voice character)
 * - Speaker Boost: true (improves similarity to original)
 */

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Cache environment variable at module level
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

interface ElevenLabsTTSRequest {
  text: string;
  voiceId: string;  // Voice profile ID (UUID) or ElevenLabs voice ID directly
  elevenLabsVoiceId?: string;  // Direct ElevenLabs voice ID (for preset voices)
  options?: {
    stability?: number;      // 0-1, default 0.5
    similarityBoost?: number; // 0-1, default 0.75
    style?: number;          // 0-1, default 0.0 (keep at 0 per ElevenLabs docs)
    useSpeakerBoost?: boolean;
    modelId?: 'eleven_multilingual_v2' | 'eleven_turbo_v2_5'; // Model selection
  };
}

interface ElevenLabsTTSResponse {
  success: boolean;
  audioBase64?: string;
  format?: string;
  error?: string;
  requestId?: string;
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
// Voice profile caching - saves 50-150ms per request on cache hits
// ============================================================================

interface CachedVoiceProfile {
  data: {
    elevenlabs_voice_id: string | null;
    voice_sample_url: string | null;
    provider: string | null;
  };
  expiry: number;
}

const voiceProfileCache = new Map<string, CachedVoiceProfile>();
const VOICE_CACHE_TTL = 3600000; // 1 hour (voice profiles rarely change)

// Periodic cache cleanup (every 5 minutes, cleans expired entries)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of voiceProfileCache.entries()) {
    if (now > value.expiry) {
      voiceProfileCache.delete(key);
    }
  }
}, VOICE_CACHE_TTL);

/**
 * Get voice profile with caching
 */
async function getCachedVoiceProfile(
  supabase: ReturnType<typeof createClient>,
  voiceId: string,
  userId: string,
  log: ReturnType<typeof createLogger>
): Promise<CachedVoiceProfile['data'] | null> {
  const cacheKey = `${userId}:${voiceId}`;
  const cached = voiceProfileCache.get(cacheKey);

  if (cached && Date.now() < cached.expiry) {
    log.info('Voice profile cache hit', { voiceId });
    return cached.data;
  }

  // Cache miss - fetch from database
  const { data, error } = await supabase
    .from('voice_profiles')
    .select('elevenlabs_voice_id, voice_sample_url, provider')
    .eq('id', voiceId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    log.warn('Voice profile not found', { voiceId, error: error?.message });
    return null;
  }

  // Cache the result
  voiceProfileCache.set(cacheKey, {
    data,
    expiry: Date.now() + VOICE_CACHE_TTL,
  });

  log.info('Voice profile fetched and cached', {
    voiceId,
    provider: data.provider,
    hasElevenLabsId: !!data.elevenlabs_voice_id,
  });

  return data;
}

/**
 * Prepare meditation text for ElevenLabs
 * Converts audio tags to natural pauses using ellipses
 */
function prepareMeditationText(text: string): string {
  return text
    // Convert meditation tags to natural pauses
    .replace(/\[pause\]/gi, '...')
    .replace(/\[long pause\]/gi, '......')
    .replace(/\[deep breath\]/gi, '... take a deep breath ...')
    .replace(/\[exhale slowly\]/gi, '... and exhale slowly ...')
    .replace(/\[silence\]/gi, '........')
    // Clean up any remaining brackets
    .replace(/\[[^\]]*\]/g, '...')
    // Normalize multiple periods
    .replace(/\.{7,}/g, '......')
    .trim();
}

/**
 * Generate speech using ElevenLabs API
 */
async function runElevenLabsTTS(
  text: string,
  elevenLabsVoiceId: string,
  options: ElevenLabsTTSRequest['options'],
  apiKey: string,
  log: ReturnType<typeof createLogger>
): Promise<{ base64: string; format: string }> {
  log.info('Generating speech with ElevenLabs', {
    voiceId: elevenLabsVoiceId,
    textLength: text.length,
  });

  // Prepare text for meditation
  const preparedText = prepareMeditationText(text);

  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${elevenLabsVoiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: preparedText,
        model_id: options?.modelId ?? 'eleven_multilingual_v2',
        voice_settings: {
          stability: options?.stability ?? 0.5,           // ElevenLabs recommends 0.5 for balanced output
          similarity_boost: options?.similarityBoost ?? 0.85, // Higher for better voice matching on clones
          style: options?.style ?? 0.0,                   // Critical: Keep at 0.0 per ElevenLabs docs
          use_speaker_boost: options?.useSpeakerBoost ?? true, // Enable for cloned voices - boosts similarity
        },
      }),
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

  // ElevenLabs returns audio stream directly
  const audioBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(audioBuffer);

  // Convert to base64
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  log.info('ElevenLabs TTS successful', { audioSize: bytes.length });
  return { base64: btoa(binary), format: 'audio/mpeg' };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const requestId = getRequestId(req);
  const tracingHeaders = getTracingHeaders(requestId);
  const allHeaders = addSecurityHeaders({ ...corsHeaders, ...tracingHeaders });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: allHeaders });
  }

  const log = createLogger({ requestId, operation: 'elevenlabs-tts' });

  try {
    // Check if API key is configured
    if (!ELEVENLABS_API_KEY) {
      log.error('ElevenLabs API key not configured');
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured', requestId }),
        { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auth validation
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

    log.info('Request authenticated', { userId: user.id });

    // Rate limiting
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.tts);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, allHeaders);
    }

    const { text, voiceId, elevenLabsVoiceId, options }: ElevenLabsTTSRequest = await req.json();

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
      const voiceProfile = await getCachedVoiceProfile(supabase, voiceId, user.id, log);

      if (!voiceProfile) {
        return new Response(
          JSON.stringify({ error: 'Voice profile not found', requestId }),
          { status: 404, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!voiceProfile.elevenlabs_voice_id) {
        return new Response(
          JSON.stringify({
            error: 'Voice profile has no ElevenLabs voice ID. Please re-clone your voice.',
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
      CIRCUIT_CONFIGS['elevenlabs'] || { failureThreshold: 3, resetTimeoutMs: 45000, halfOpenRequests: 1 },
      () => runElevenLabsTTS(text, targetVoiceId!, options, ELEVENLABS_API_KEY!, log)
    );

    return await createCompressedResponse(
      {
        success: true,
        audioBase64: result.base64,
        format: result.format,
        requestId,
      } as ElevenLabsTTSResponse,
      allHeaders,
      { minSize: 0 }
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
