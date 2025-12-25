import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, createCompressedResponse } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { withCircuitBreaker, CIRCUIT_CONFIGS, CircuitBreakerError } from "../_shared/circuitBreaker.ts";

/**
 * Fish Audio TTS Edge Function
 *
 * Uses Fish Audio API for high-quality TTS with voice cloning.
 * Automatically falls back to Chatterbox (via Replicate) if Fish Audio is unavailable.
 *
 * Fish Audio advantages:
 * - Better quality (ELO 1339, beats ElevenLabs in blind tests)
 * - Real-time API (no async polling like Replicate)
 * - 15-30 second voice cloning
 */

const FISH_AUDIO_API_URL = 'https://api.fish.audio';

interface FishAudioTTSRequest {
  text: string;
  voiceId: string;  // Voice profile ID (UUID)
  options?: {
    speed?: number;      // 0.5-2.0, default 1
    temperature?: number; // 0-1, default 0.7
    format?: 'mp3' | 'wav' | 'opus';
  };
}

interface FishAudioTTSResponse {
  success: boolean;
  audioBase64?: string;
  format?: string;
  usedFallback?: boolean;
  error?: string;
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

/**
 * Generate speech using Fish Audio API
 */
async function runFishAudioTTS(
  text: string,
  modelId: string,
  options: FishAudioTTSRequest['options'],
  apiKey: string,
  log: ReturnType<typeof createLogger>
): Promise<{ base64: string; format: string }> {
  log.info('Generating speech with Fish Audio', { modelId, textLength: text.length });

  const response = await fetch(`${FISH_AUDIO_API_URL}/v1/tts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reference_id: modelId,
      text,
      chunk_length: 200,
      format: options?.format ?? 'mp3',
      mp3_bitrate: 128,
      latency: 'normal',
      streaming: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error('Fish Audio API error', { status: response.status, error: errorText });

    if (response.status === 402) {
      throw new Error('Fish Audio quota exceeded. Please upgrade your plan or wait for reset.');
    }
    if (response.status === 401) {
      throw new Error('Fish Audio authentication failed.');
    }
    throw new Error(`Fish Audio API error: ${response.status} - ${errorText}`);
  }

  // Fish Audio returns audio stream directly
  const audioBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(audioBuffer);

  // Convert to base64
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  const format = options?.format ?? 'mp3';
  log.info('Fish Audio TTS successful', { audioSize: bytes.length, format });
  return { base64: btoa(binary), format: `audio/${format}` };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const requestId = getRequestId(req);
  const tracingHeaders = getTracingHeaders(requestId);
  const allHeaders = { ...corsHeaders, ...tracingHeaders };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: allHeaders });
  }

  const log = createLogger({ requestId, operation: 'fish-audio-tts' });

  try {
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

    const { text, voiceId, options }: FishAudioTTSRequest = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Missing text parameter', requestId }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API keys
    const fishAudioApiKey = Deno.env.get('FISH_AUDIO_API_KEY');
    const replicateApiKey = Deno.env.get('REPLICATE_API_TOKEN');

    // Get voice profile
    let voiceProfile: {
      fish_audio_model_id: string | null;
      voice_sample_url: string | null;
      provider: string | null;
    } | null = null;

    if (voiceId) {
      const { data, error } = await supabase
        .from('voice_profiles')
        .select('fish_audio_model_id, voice_sample_url, provider')
        .eq('id', voiceId)
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        voiceProfile = data;
        log.info('Found voice profile', {
          voiceId,
          provider: data.provider,
          hasFishAudioId: !!data.fish_audio_model_id,
          hasVoiceSampleUrl: !!data.voice_sample_url,
        });
      } else {
        log.warn('Voice profile not found', { voiceId, error: error?.message });
      }
    }

    let audioBase64: string | undefined;
    let audioFormat: string | undefined;
    let usedFallback = false;

    // Try Fish Audio first (if available)
    if (fishAudioApiKey && voiceProfile?.fish_audio_model_id) {
      try {
        const result = await withCircuitBreaker(
          'fish-audio',
          CIRCUIT_CONFIGS['fish-audio'],
          () => runFishAudioTTS(
            text,
            voiceProfile!.fish_audio_model_id!,
            options,
            fishAudioApiKey,
            log
          )
        );
        audioBase64 = result.base64;
        audioFormat = result.format;
      } catch (error: any) {
        log.warn('Fish Audio failed, will try Chatterbox fallback', { error: error.message });
        usedFallback = true;
      }
    }

    // Fallback to Chatterbox (via internal edge function call)
    if (!audioBase64 && replicateApiKey && voiceProfile?.voice_sample_url) {
      log.info('Using Chatterbox TTS (fallback)', { voiceId });
      usedFallback = true;

      // Call chatterbox-tts edge function internally
      const chatterboxResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/chatterbox-tts`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text, voiceId }),
        }
      );

      if (chatterboxResponse.ok) {
        const chatterboxData = await chatterboxResponse.json();
        audioBase64 = chatterboxData.audioBase64;
        audioFormat = 'audio/wav';
      } else {
        const errorData = await chatterboxResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Chatterbox fallback failed');
      }
    }

    if (!audioBase64) {
      // No audio generated - check why
      if (!fishAudioApiKey && !replicateApiKey) {
        throw new Error('No TTS service configured. Please add FISH_AUDIO_API_KEY or REPLICATE_API_TOKEN.');
      }
      if (!voiceProfile) {
        throw new Error('Voice profile not found. Please clone a voice first.');
      }
      if (!voiceProfile.fish_audio_model_id && !voiceProfile.voice_sample_url) {
        throw new Error('Voice profile has no audio sample. Please re-clone your voice.');
      }
      throw new Error('TTS generation failed. Please try again.');
    }

    return await createCompressedResponse(
      {
        success: true,
        audioBase64,
        format: audioFormat,
        usedFallback,
        requestId,
      } as FishAudioTTSResponse,
      allHeaders,
      { minSize: 0 }
    );

  } catch (error: any) {
    log.error('Error generating speech', error);

    const isCircuitOpen = error instanceof CircuitBreakerError;

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        isCircuitOpen,
        retryAfterMs: isCircuitOpen ? error.retryAfterMs : undefined,
        requestId,
      }),
      { status: isCircuitOpen ? 503 : 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
