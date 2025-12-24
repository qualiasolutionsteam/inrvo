import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

/**
 * Chatterbox Voice Cloning via Replicate
 *
 * Unlike ElevenLabs, Chatterbox uses "zero-shot" cloning - you provide an audio
 * sample at TTS time rather than pre-creating a voice clone.
 *
 * This function:
 * 1. Uploads the audio sample to Supabase Storage
 * 2. Creates a voice_profile record pointing to the audio sample URL
 * 3. The TTS function will use this URL as the audio_prompt
 */

interface ChatterboxCloneRequest {
  audioBase64: string;
  voiceName: string;
  description?: string;
  metadata?: {
    language?: string;
    accent?: string;
    gender?: string;
    ageRange?: string;
    hasBackgroundNoise?: boolean;
    useCase?: string;
    descriptive?: string;
  };
}

interface ChatterboxCloneResponse {
  success: boolean;
  voiceProfileId?: string;
  voiceSampleUrl?: string;
  error?: string;
}

// Lazy-load Supabase client
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseClient;
}

// Estimate audio duration from base64 WAV
function estimateAudioDuration(base64: string): number {
  // Rough estimate: base64 is ~1.33x the original size
  // WAV at 44.1kHz 16-bit mono is ~88KB per second
  const originalSize = (base64.length * 3) / 4;
  const estimatedDuration = originalSize / 88000;
  return estimatedDuration;
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

  const log = createLogger({ requestId, operation: 'chatterbox-clone' });

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

    // Check rate limit (use voice clone limits)
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.voiceClone);
    if (!rateLimitResult.allowed) {
      log.warn('Rate limit exceeded', { userId: user.id });
      return createRateLimitResponse(rateLimitResult, allHeaders);
    }

    // Parse request
    const { audioBase64, voiceName, description, metadata }: ChatterboxCloneRequest = await req.json();

    if (!audioBase64 || !voiceName) {
      return new Response(
        JSON.stringify({ error: 'Missing audioBase64 or voiceName', requestId }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Estimate duration for validation
    const estimatedDuration = estimateAudioDuration(audioBase64);
    log.info('Audio sample received', {
      base64Length: audioBase64.length,
      estimatedDuration: estimatedDuration.toFixed(1),
    });

    // Minimum 6 seconds for Chatterbox zero-shot cloning
    if (estimatedDuration < 5) {
      return new Response(
        JSON.stringify({
          error: 'Audio sample too short. Please record at least 6 seconds.',
          requestId,
        }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${user.id}/${timestamp}_${voiceName.replace(/\s+/g, '_')}.wav`;

    // Decode base64 to binary
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    log.info('Uploading audio to storage', { fileName, size: bytes.length });

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('voice-samples')
      .upload(fileName, bytes, {
        contentType: 'audio/wav',
        upsert: false,
      });

    if (uploadError) {
      log.error('Failed to upload audio', { error: uploadError.message });
      return new Response(
        JSON.stringify({ error: `Failed to upload audio: ${uploadError.message}`, requestId }),
        { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('voice-samples')
      .getPublicUrl(fileName);

    const voiceSampleUrl = publicUrlData.publicUrl;
    log.info('Audio uploaded successfully', { url: voiceSampleUrl });

    // Create voice profile in database
    const { data: voiceProfile, error: profileError } = await supabase
      .from('voice_profiles')
      .insert({
        user_id: user.id,
        name: voiceName,
        description: description || `Voice clone created with Chatterbox`,
        provider: 'chatterbox',
        provider_voice_id: null,  // Chatterbox doesn't need a pre-created voice ID
        voice_sample_url: voiceSampleUrl,
        cloning_status: 'READY',  // Chatterbox is zero-shot, no processing needed
        status: 'READY',
        sample_duration: estimatedDuration,
        metadata: metadata || {},
        credits_used: 0,  // Chatterbox doesn't use our credit system
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

    log.info('Voice profile created', { profileId: voiceProfile.id });

    return new Response(
      JSON.stringify({
        success: true,
        voiceProfileId: voiceProfile.id,
        voiceSampleUrl,
        requestId,
      } as ChatterboxCloneResponse),
      { status: 200, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log.error('Error processing voice clone', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        requestId,
      } as ChatterboxCloneResponse),
      { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
