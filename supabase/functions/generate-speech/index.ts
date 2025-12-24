import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, createCompressedResponse } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { withCircuitBreaker, CIRCUIT_CONFIGS, CircuitBreakerError } from "../_shared/circuitBreaker.ts";

interface GenerateSpeechRequest {
  text: string;
  voiceId: string;
  userId: string;
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

interface GenerateSpeechResponse {
  success: boolean;
  audioBase64?: string;
  creditsUsed?: number;
  error?: string;
}

// Lazy-load Supabase client to reduce cold start
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseClient;
}

// Optimized base64 conversion using Deno APIs (replaces FileReader)
async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Use built-in btoa with chunked processing for large files
  let binary = '';
  const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const requestId = getRequestId(req);
  const tracingHeaders = getTracingHeaders(requestId);
  const allHeaders = { ...corsHeaders, ...tracingHeaders };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: allHeaders });
  }

  // Create logger with request context
  const log = createLogger({ requestId, operation: 'generate-speech' });

  try {
    // Validate user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      log.warn('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header', requestId }),
        { status: 401, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      log.warn('Invalid or expired token', { authError: authError?.message });
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', requestId }),
        { status: 401, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update logger with user context
    log.info('Request authenticated', { userId: user.id });

    // Check rate limit
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.tts);
    if (!rateLimitResult.allowed) {
      log.warn('Rate limit exceeded', { userId: user.id, remaining: rateLimitResult.remaining });
      return createRateLimitResponse(rateLimitResult, allHeaders);
    }

    // Parse request body - use verified user.id instead of userId from body
    const { text, voiceId, voiceSettings }: Omit<GenerateSpeechRequest, 'userId'> = await req.json();
    const userId = user.id; // Use verified user ID from JWT

    // Validate input
    if (!text || !voiceId) {
      log.warn('Missing required fields', { hasText: !!text, hasVoiceId: !!voiceId });
      return new Response(
        JSON.stringify({ error: 'Missing required fields', requestId }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get voice profile to verify ownership
    const { data: voiceProfile, error: profileError } = await supabase
      .from('voice_profiles')
      .select('elevenlabs_voice_id, user_id, provider')
      .eq('id', voiceId)
      .eq('user_id', userId)
      .single();

    if (profileError || !voiceProfile) {
      log.warn('Voice profile not found', { voiceId, profileError: profileError?.message });
      return new Response(
        JSON.stringify({ error: 'Voice profile not found', requestId }),
        { status: 404, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate TTS cost (280 credits per 1K characters) - CREDIT SYSTEM DISABLED
    const creditsNeeded = Math.ceil((text.length / 1000) * 280);

    // Only cloned ElevenLabs voices are supported
    if (!voiceProfile.elevenlabs_voice_id) {
      log.warn('Voice profile has no ElevenLabs ID', { voiceId });
      return new Response(
        JSON.stringify({ error: 'Only cloned voices are supported. Please clone a voice first.', requestId }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenlabsApiKey) {
      log.error('ElevenLabs API key not configured');
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured', requestId }),
        { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify voice exists in ElevenLabs before attempting TTS
    log.info('Verifying voice exists in ElevenLabs', { elevenlabsVoiceId: voiceProfile.elevenlabs_voice_id });

    const voiceCheckResponse = await fetch(
      `https://api.elevenlabs.io/v1/voices/${voiceProfile.elevenlabs_voice_id}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': elevenlabsApiKey,
        },
      }
    );

    if (!voiceCheckResponse.ok) {
      if (voiceCheckResponse.status === 401) {
        log.error('ElevenLabs API key invalid', { status: voiceCheckResponse.status });
        return new Response(
          JSON.stringify({ error: 'ElevenLabs API key is invalid or expired', requestId }),
          { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (voiceCheckResponse.status === 404) {
        log.error('Voice not found in ElevenLabs', {
          voiceId,
          elevenlabsVoiceId: voiceProfile.elevenlabs_voice_id,
        });
        return new Response(
          JSON.stringify({
            error: 'This voice no longer exists in ElevenLabs. Please clone a new voice or select a different one.',
            requestId,
          }),
          { status: 404, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Log but continue for other errors (might be temporary)
      log.warn('Voice verification failed', {
        status: voiceCheckResponse.status,
        elevenlabsVoiceId: voiceProfile.elevenlabs_voice_id,
      });
    }

    log.info('Starting TTS generation', { textLength: text.length, voiceId, elevenlabsVoiceId: voiceProfile.elevenlabs_voice_id });

    // Voice settings optimized for meditative pace
    const requestData = {
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: voiceSettings?.stability ?? 0.75,
        similarity_boost: voiceSettings?.similarity_boost ?? 0.7,
        style: voiceSettings?.style ?? 0.15,
        use_speaker_boost: voiceSettings?.use_speaker_boost ?? true,
      },
    };

    // Call ElevenLabs API with circuit breaker and timeout
    log.info('Calling ElevenLabs TTS API', {
      elevenlabsVoiceId: voiceProfile.elevenlabs_voice_id,
      textLength: text.length,
      textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      model: requestData.model_id,
      voiceSettings: requestData.voice_settings,
    });

    const audioBase64 = await withCircuitBreaker(
      'elevenlabs',
      CIRCUIT_CONFIGS.elevenlabs,
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for TTS

        try {
          const ttsResponse = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceProfile.elevenlabs_voice_id}`,
            {
              method: 'POST',
              headers: {
                'xi-api-key': elevenlabsApiKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg',
              },
              body: JSON.stringify(requestData),
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);

          log.info('ElevenLabs TTS response received', {
            status: ttsResponse.status,
            statusText: ttsResponse.statusText,
            contentType: ttsResponse.headers.get('content-type'),
            contentLength: ttsResponse.headers.get('content-length'),
          });

          if (!ttsResponse.ok) {
            // Safely parse error response - handle various formats
            const errorText = await ttsResponse.text();
            let errorDetail = 'Unknown error';

            try {
              const errorJson = JSON.parse(errorText);
              errorDetail = errorJson.detail?.message || errorJson.detail || errorJson.message || errorJson.error || JSON.stringify(errorJson);
            } catch {
              errorDetail = errorText || `HTTP ${ttsResponse.status}`;
            }

            log.error('ElevenLabs API error', {
              status: ttsResponse.status,
              statusText: ttsResponse.statusText,
              voiceId: voiceProfile.elevenlabs_voice_id,
              errorDetail,
            });

            // Return specific error messages based on status code
            if (ttsResponse.status === 401) {
              throw new Error('ElevenLabs API key is invalid or expired');
            } else if (ttsResponse.status === 404) {
              throw new Error('Voice not found in ElevenLabs - it may have been deleted');
            } else if (ttsResponse.status === 429) {
              throw new Error('ElevenLabs rate limit exceeded - please try again later');
            } else if (ttsResponse.status === 402) {
              throw new Error('ElevenLabs account has insufficient credits');
            }

            throw new Error(`TTS generation failed (${ttsResponse.status}): ${errorDetail}`);
          }

          const audioBlob = await ttsResponse.blob();
          const base64 = await blobToBase64(audioBlob);

          if (!base64) {
            throw new Error('No audio data received');
          }

          return base64;
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      }
    );

    log.info('TTS generation successful', { audioSize: audioBase64.length, creditsUsed: creditsNeeded });

    // Use compression for audio responses (base64 compresses ~30-40%)
    return await createCompressedResponse(
      {
        success: true,
        audioBase64,
        creditsUsed: creditsNeeded,
        requestId,
      } as GenerateSpeechResponse,
      allHeaders,
      { minSize: 0 } // Always compress audio responses
    );

  } catch (error) {
    log.error('Error generating speech', error);

    // Handle circuit breaker errors with appropriate status
    if (error instanceof CircuitBreakerError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          requestId,
          retryAfterMs: error.retryAfterMs,
        }),
        {
          status: 503,
          headers: {
            ...allHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(error.retryAfterMs / 1000)),
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        requestId,
      } as GenerateSpeechResponse),
      { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
