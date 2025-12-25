import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

/**
 * Fish Audio Voice Cloning Edge Function
 *
 * Creates a voice model from audio sample using Fish Audio API.
 * Also stores audio in Supabase Storage for Chatterbox fallback.
 *
 * Fish Audio is the primary provider (best quality, real-time API).
 * Chatterbox/Replicate is the fallback (if Fish Audio fails).
 */

const FISH_AUDIO_API_URL = 'https://api.fish.audio';

interface FishAudioCloneRequest {
  audioBase64: string;
  voiceName: string;
  description?: string;
  metadata?: {
    language?: string;
    accent?: string;
    gender?: string;
    ageRange?: string;
  };
}

interface FishAudioCloneResponse {
  success: boolean;
  voiceProfileId?: string;
  fishAudioModelId?: string;
  voiceSampleUrl?: string;
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
 * Create a voice model on Fish Audio
 * Returns the model ID to use for TTS
 */
async function createFishAudioModel(
  audioBlob: Blob,
  title: string,
  description: string,
  apiKey: string,
  log: ReturnType<typeof createLogger>
): Promise<string> {
  log.info('Creating Fish Audio voice model', { title, audioSize: audioBlob.size });

  // Create form data for multipart upload
  const formData = new FormData();
  formData.append('type', 'tts');
  formData.append('title', title);
  formData.append('train_mode', 'fast');  // Immediate availability
  formData.append('visibility', 'private');  // User's private voice
  formData.append('description', description);
  formData.append('voices', audioBlob, 'voice_sample.wav');

  const response = await fetch(`${FISH_AUDIO_API_URL}/model`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error('Fish Audio model creation failed', { status: response.status, error: errorText });

    if (response.status === 402) {
      throw new Error('Fish Audio quota exceeded for voice cloning. Please try again later or upgrade your plan.');
    }
    if (response.status === 401) {
      throw new Error('Fish Audio authentication failed. Please contact support.');
    }
    throw new Error(`Fish Audio API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  log.info('Fish Audio model created', { modelId: result._id, state: result.state });

  return result._id;  // This is the model ID to use for TTS
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

  const log = createLogger({ requestId, operation: 'fish-audio-clone' });

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
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.voiceClone);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, allHeaders);
    }

    const { audioBase64, voiceName, description, metadata }: FishAudioCloneRequest = await req.json();

    if (!audioBase64 || !voiceName) {
      return new Response(
        JSON.stringify({ error: 'Missing audioBase64 or voiceName', requestId }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode base64 to bytes
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Validate WAV format
    if (bytes.length < 44) {
      return new Response(
        JSON.stringify({ error: 'Audio file too small (minimum 44 bytes for WAV header)', requestId }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const wave = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);

    if (riff !== 'RIFF' || wave !== 'WAVE') {
      return new Response(
        JSON.stringify({ error: 'Audio must be WAV format', requestId }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBlob = new Blob([bytes], { type: 'audio/wav' });
    const fishAudioApiKey = Deno.env.get('FISH_AUDIO_API_KEY');

    let fishAudioModelId: string | null = null;
    let voiceSampleUrl: string | null = null;

    // Step 1: Upload to Supabase Storage (for Chatterbox fallback)
    const timestamp = Date.now();
    const fileName = `${user.id}/${timestamp}_${voiceName.replace(/\s+/g, '_')}.wav`;

    const { error: uploadError } = await supabase.storage
      .from('voice-samples')
      .upload(fileName, bytes, { contentType: 'audio/wav', upsert: false });

    if (uploadError) {
      log.error('Storage upload failed', { error: uploadError.message });
      // Continue - Fish Audio might still work
    } else {
      const { data: publicUrlData } = supabase.storage
        .from('voice-samples')
        .getPublicUrl(fileName);
      voiceSampleUrl = publicUrlData.publicUrl;
      log.info('Audio uploaded to storage', { url: voiceSampleUrl });
    }

    // Step 2: Create Fish Audio model (if API key available)
    if (fishAudioApiKey) {
      try {
        fishAudioModelId = await createFishAudioModel(
          audioBlob,
          voiceName,
          description || 'Voice clone created with INrVO',
          fishAudioApiKey,
          log
        );
      } catch (error: any) {
        log.warn('Fish Audio model creation failed, using Chatterbox only', { error: error.message });
        // Continue with Chatterbox-only profile
      }
    } else {
      log.info('Fish Audio API key not configured, using Chatterbox only');
    }

    // Step 3: Create voice profile in database
    const { data: voiceProfile, error: profileError } = await supabase
      .from('voice_profiles')
      .insert({
        user_id: user.id,
        name: voiceName,
        description: description || 'Voice clone created with INrVO',
        provider: fishAudioModelId ? 'fish-audio' : 'chatterbox',
        fish_audio_model_id: fishAudioModelId,
        voice_sample_url: voiceSampleUrl,
        provider_voice_id: null,
        cloning_status: 'READY',
        status: 'READY',
        metadata: metadata || {},
      })
      .select('id')
      .single();

    if (profileError) {
      log.error('Failed to create voice profile', { error: profileError.message });
      return new Response(
        JSON.stringify({ error: `Failed to create voice profile: ${profileError.message}`, requestId }),
        { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('Voice profile created', {
      profileId: voiceProfile.id,
      hasFishAudio: !!fishAudioModelId,
      hasChatterbox: !!voiceSampleUrl,
    });

    return new Response(
      JSON.stringify({
        success: true,
        voiceProfileId: voiceProfile.id,
        fishAudioModelId,
        voiceSampleUrl,
        requestId,
      } as FishAudioCloneResponse),
      { status: 200, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    log.error('Error processing voice clone', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        requestId,
      }),
      { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
