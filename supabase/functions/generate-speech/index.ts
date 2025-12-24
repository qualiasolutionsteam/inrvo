import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, createCompressedResponse } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

/**
 * Generate Speech using Chatterbox via Replicate
 * Replaced ElevenLabs with Chatterbox for 10x cost savings (~$0.03/run vs ~$0.30)
 */

interface GenerateSpeechRequest {
  text: string;
  voiceId: string;
  voiceSettings?: {
    exaggeration?: number;  // Emotion exaggeration (0-1)
    cfgWeight?: number;     // CFG weight for quality (0-1)
  };
}

interface GenerateSpeechResponse {
  success: boolean;
  audioBase64?: string;
  format?: string;
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

// Replicate API for Chatterbox (supports audio_prompt for voice cloning)
const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';
const CHATTERBOX_MODEL = 'resemble-ai/chatterbox:1b8422bc49635c20d0a84e387ed20879c0dd09254ecdb4e75dc4bec10ff94e97';

async function runChatterboxTTS(
  text: string,
  audioPromptUrl: string | null,
  options: { exaggeration?: number; cfgWeight?: number },
  apiKey: string,
  log: ReturnType<typeof createLogger>
): Promise<string> {
  // Create prediction input - Chatterbox uses 'prompt' not 'text'
  const input: Record<string, unknown> = {
    prompt: text,
    exaggeration: options.exaggeration ?? 0.3,  // Low for calm meditation
    cfg_weight: options.cfgWeight ?? 0.5,
  };

  // Add audio prompt if we have a cloned voice reference for zero-shot cloning
  if (audioPromptUrl) {
    input.audio_prompt = audioPromptUrl;
  }

  log.info('Creating Replicate prediction', { model: CHATTERBOX_MODEL, textLength: text.length, hasVoiceSample: !!audioPromptUrl });

  const createResponse = await fetch(REPLICATE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: CHATTERBOX_MODEL.split(':')[1],
      input,
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    log.error('Failed to create Replicate prediction', { status: createResponse.status, error: errorText });
    throw new Error(`Failed to create prediction: ${createResponse.status} - ${errorText}`);
  }

  const prediction = await createResponse.json();
  log.info('Prediction created', { id: prediction.id, status: prediction.status });

  // Poll for completion (Replicate predictions are async)
  let result = prediction;
  const maxWaitTime = 120000; // 2 minutes max
  const pollInterval = 1000; // 1 second
  const startTime = Date.now();

  while (result.status !== 'succeeded' && result.status !== 'failed') {
    if (Date.now() - startTime > maxWaitTime) {
      throw new Error('Prediction timed out after 2 minutes');
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));

    const pollResponse = await fetch(result.urls.get, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!pollResponse.ok) {
      throw new Error(`Failed to poll prediction: ${pollResponse.status}`);
    }

    result = await pollResponse.json();
    log.info('Prediction status', { id: result.id, status: result.status });
  }

  if (result.status === 'failed') {
    log.error('Prediction failed', { error: result.error });
    throw new Error(result.error || 'TTS prediction failed');
  }

  // Get the audio URL from the output
  const audioUrl = result.output;
  if (!audioUrl) {
    throw new Error('No audio URL in prediction output');
  }

  log.info('Downloading audio from Replicate', { url: audioUrl });

  // Download the audio and convert to base64
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.status}`);
  }

  const audioBlob = await audioResponse.blob();
  const buffer = await audioBlob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Convert to base64 with chunked processing
  let binary = '';
  const chunkSize = 0x8000;
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

    log.info('Request authenticated', { userId: user.id });

    // Check rate limit
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.tts);
    if (!rateLimitResult.allowed) {
      log.warn('Rate limit exceeded', { userId: user.id, remaining: rateLimitResult.remaining });
      return createRateLimitResponse(rateLimitResult, allHeaders);
    }

    // Parse request body
    const { text, voiceId, voiceSettings }: GenerateSpeechRequest = await req.json();

    // Validate input
    if (!text) {
      log.warn('Missing text');
      return new Response(
        JSON.stringify({ error: 'Missing text parameter', requestId }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Replicate API key
    const replicateApiKey = Deno.env.get('REPLICATE_API_TOKEN');
    if (!replicateApiKey) {
      log.error('Replicate API key not configured');
      return new Response(
        JSON.stringify({ error: 'TTS service not configured', requestId }),
        { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get voice profile if voiceId provided (for cloned voice audio sample)
    let audioPromptUrl: string | null = null;

    if (voiceId) {
      const { data: voiceProfile, error: profileError } = await supabase
        .from('voice_profiles')
        .select('voice_sample_url, provider_voice_id, user_id, provider')
        .eq('id', voiceId)
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        log.warn('Voice profile not found', { voiceId, error: profileError.message });
        // Continue without voice cloning - will use default Chatterbox voice
      } else if (voiceProfile) {
        // Use stored voice sample URL for cloning
        audioPromptUrl = voiceProfile.voice_sample_url || voiceProfile.provider_voice_id;
        log.info('Using cloned voice', { voiceId, hasAudioPrompt: !!audioPromptUrl, provider: voiceProfile.provider });
      }
    }

    log.info('Starting TTS generation with Chatterbox', { textLength: text.length, voiceId, hasVoiceSample: !!audioPromptUrl });

    // Generate speech using Chatterbox via Replicate
    const audioBase64 = await runChatterboxTTS(
      text,
      audioPromptUrl,
      {
        exaggeration: voiceSettings?.exaggeration ?? 0.3,  // Calm for meditation
        cfgWeight: voiceSettings?.cfgWeight ?? 0.5,
      },
      replicateApiKey,
      log
    );

    log.info('TTS generation successful', { audioSize: audioBase64.length });

    // Return compressed response
    return await createCompressedResponse(
      {
        success: true,
        audioBase64,
        format: 'audio/wav',
        requestId,
      } as GenerateSpeechResponse,
      allHeaders,
      { minSize: 0 } // Always compress audio responses
    );

  } catch (error) {
    log.error('Error generating speech', error);

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
