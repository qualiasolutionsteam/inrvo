import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { base64ToUint8Array, getWavValidationError } from "../_shared/encoding.ts";
import { sanitizeFileName } from "../_shared/sanitization.ts";
import { addSecurityHeaders } from "../_shared/securityHeaders.ts";

/**
 * Fish Audio Voice Cloning Edge Function
 *
 * Creates a voice model from audio sample using Fish Audio API.
 * Also stores audio in Supabase Storage for Chatterbox fallback.
 *
 * Fish Audio is the primary provider (best quality, real-time API).
 * Chatterbox/Replicate is the fallback (if Fish Audio fails).
 *
 * Performance optimizations:
 * - Native base64 decoding (50% faster)
 * - Parallel storage upload + Fish Audio model creation (saves 200-500ms)
 * - Environment variables cached at module level
 */

const FISH_AUDIO_API_URL = 'https://api.fish.audio';

// Cache environment variable at module level
const FISH_AUDIO_API_KEY = Deno.env.get('FISH_AUDIO_API_KEY');

interface FishAudioCloneRequest {
  audioBase64: string;
  voiceName: string;
  description?: string;
  highQuality?: boolean;  // Use high-quality training (slower but better)
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

// Voice cloning request timeout (60 seconds - longer than TTS due to model creation)
const CLONE_TIMEOUT_MS = 60000;

/**
 * Create a voice model on Fish Audio
 * Returns the model ID to use for TTS
 */
async function createFishAudioModel(
  audioBlob: Blob,
  title: string,
  description: string,
  apiKey: string,
  highQuality: boolean,
  log: ReturnType<typeof createLogger>
): Promise<string> {
  const trainMode = highQuality ? 'fast_high_quality' : 'fast';
  log.info('Creating Fish Audio voice model', {
    title,
    audioSize: audioBlob.size,
    trainMode
  });

  // Create form data for multipart upload
  const formData = new FormData();
  formData.append('type', 'tts');
  formData.append('title', title);
  formData.append('train_mode', trainMode);  // fast_high_quality for better results
  formData.append('visibility', 'private');  // User's private voice
  formData.append('description', description);
  formData.append('voices', audioBlob, 'voice_sample.wav');

  // Add timeout protection to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLONE_TIMEOUT_MS);

  try {
    const response = await fetch(`${FISH_AUDIO_API_URL}/model`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
      signal: controller.signal,
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
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Voice cloning request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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

    const { audioBase64, voiceName, description, metadata, highQuality }: FishAudioCloneRequest = await req.json();

    if (!audioBase64 || !voiceName) {
      return new Response(
        JSON.stringify({ error: 'Missing audioBase64 or voiceName', requestId }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use native base64 decoding (50% faster than manual loop)
    const bytes = base64ToUint8Array(audioBase64);

    // Validate WAV format using shared utility
    const validationError = getWavValidationError(bytes);
    if (validationError) {
      return new Response(
        JSON.stringify({ error: validationError, requestId }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBlob = new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/wav' });

    // Prepare file name for storage (sanitized to prevent path traversal)
    const timestamp = Date.now();
    const safeName = sanitizeFileName(voiceName);
    const fileName = `${user.id}/${timestamp}_${safeName}.wav`;

    // ========================================================================
    // PARALLEL OPERATIONS: Upload storage + Create Fish Audio model
    // This saves 200-500ms by running these independent operations concurrently
    // ========================================================================

    log.info('Starting parallel operations', {
      hasFishAudioKey: !!FISH_AUDIO_API_KEY,
      audioSize: bytes.length
    });

    // Create promises for parallel execution
    const uploadPromise = supabase.storage
      .from('voice-samples')
      .upload(fileName, bytes, { contentType: 'audio/wav', upsert: false });

    const fishAudioPromise = FISH_AUDIO_API_KEY
      ? createFishAudioModel(
          audioBlob,
          voiceName,
          description || 'Voice clone created with INrVO',
          FISH_AUDIO_API_KEY,
          highQuality ?? true,  // Default to high quality for better naturalness
          log
        ).catch((error) => {
          log.warn('Fish Audio model creation failed, using Chatterbox only', { error: error.message });
          return null; // Return null on failure, don't reject
        })
      : Promise.resolve(null);

    // Run both operations in parallel
    const [uploadResult, fishAudioModelId] = await Promise.all([
      uploadPromise,
      fishAudioPromise
    ]);

    // Process upload result
    let voiceSampleUrl: string | null = null;
    if (uploadResult.error) {
      log.error('Storage upload failed', { error: uploadResult.error.message });
      // Continue - Fish Audio might still work
    } else {
      const { data: publicUrlData } = supabase.storage
        .from('voice-samples')
        .getPublicUrl(fileName);
      voiceSampleUrl = publicUrlData.publicUrl;
      log.info('Audio uploaded to storage', { url: voiceSampleUrl });
    }

    // Log Fish Audio result
    if (fishAudioModelId) {
      log.info('Fish Audio model created successfully', { modelId: fishAudioModelId });
    } else if (!FISH_AUDIO_API_KEY) {
      log.info('Fish Audio API key not configured, using Chatterbox only');
    }

    // Create voice profile in database
    // Type assertion needed because edge functions don't have schema types
    const { data: voiceProfile, error: profileError } = await (supabase
      .from('voice_profiles') as any)
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
      .single() as { data: { id: string } | null; error: any };

    if (profileError || !voiceProfile) {
      log.error('Failed to create voice profile', { error: profileError?.message });
      return new Response(
        JSON.stringify({ error: `Failed to create voice profile: ${profileError?.message || 'Unknown error'}`, requestId }),
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
