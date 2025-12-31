import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { base64ToUint8Array, getWavValidationError } from "../_shared/encoding.ts";
import { sanitizeFileName } from "../_shared/sanitization.ts";
import { addSecurityHeaders } from "../_shared/securityHeaders.ts";

/**
 * ElevenLabs Voice Cloning Edge Function
 *
 * Creates a voice clone using ElevenLabs Instant Voice Cloning (IVC).
 * Also stores audio in Supabase Storage for backup/reference.
 *
 * ElevenLabs IVC (Instant Voice Cloning):
 * - Fast cloning from a single audio sample
 * - Good quality for meditation use cases
 * - Supports noise removal for cleaner clones
 *
 * Performance optimizations:
 * - Native base64 decoding (50% faster)
 * - Parallel storage upload + ElevenLabs model creation
 * - Environment variables cached at module level
 */

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Cache environment variable at module level
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

interface ElevenLabsCloneRequest {
  audioBase64: string;
  voiceName: string;
  description?: string;
  removeBackgroundNoise?: boolean;
  metadata?: {
    language?: string;
    accent?: string;
    gender?: string;
    ageRange?: string;
    descriptive?: string;
    useCase?: string;
    hasBackgroundNoise?: boolean;
  };
}

interface ElevenLabsCloneResponse {
  success: boolean;
  voiceProfileId?: string;
  elevenLabsVoiceId?: string;
  voiceSampleUrl?: string;
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

// Voice cloning request timeout (90 seconds - longer due to processing)
const CLONE_TIMEOUT_MS = 90000;

/**
 * Create a voice clone on ElevenLabs using Instant Voice Cloning (IVC)
 * Returns the voice_id to use for TTS
 */
async function createElevenLabsVoiceClone(
  audioBlob: Blob,
  voiceName: string,
  description: string,
  removeBackgroundNoise: boolean,
  apiKey: string,
  log: ReturnType<typeof createLogger>
): Promise<string> {
  log.info('Creating ElevenLabs voice clone', {
    name: voiceName,
    audioSize: audioBlob.size,
    removeBackgroundNoise,
  });

  // Create form data for multipart upload
  const formData = new FormData();
  formData.append('name', voiceName);
  formData.append('files', audioBlob, 'voice_sample.wav');
  formData.append('remove_background_noise', String(removeBackgroundNoise));

  if (description) {
    formData.append('description', description);
  }

  // Add timeout protection to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLONE_TIMEOUT_MS);

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('ElevenLabs voice creation failed', { status: response.status, error: errorText });

      if (response.status === 401) {
        throw new Error('ElevenLabs authentication failed. Please check your API key.');
      }
      if (response.status === 429) {
        throw new Error('ElevenLabs rate limit exceeded. Please try again later.');
      }
      if (response.status === 400) {
        // Parse for specific error message
        try {
          const errorJson = JSON.parse(errorText);
          const detail = errorJson.detail;
          if (typeof detail === 'string') {
            throw new Error(`Voice cloning failed: ${detail}`);
          } else if (detail?.message) {
            throw new Error(`Voice cloning failed: ${detail.message}`);
          }
        } catch (parseError) {
          // If parsing fails, use the raw error text
          if (!(parseError instanceof SyntaxError)) {
            throw parseError;
          }
        }
        throw new Error(`ElevenLabs API error: ${errorText}`);
      }
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    log.info('ElevenLabs voice clone created', {
      voiceId: result.voice_id,
      requiresVerification: result.requires_verification,
    });

    return result.voice_id;
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

  const log = createLogger({ requestId, operation: 'elevenlabs-clone' });

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
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.voiceClone);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, allHeaders);
    }

    const {
      audioBase64,
      voiceName,
      description,
      removeBackgroundNoise,
      metadata,
    }: ElevenLabsCloneRequest = await req.json();

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
    // PARALLEL OPERATIONS: Upload storage + Create ElevenLabs voice clone
    // This saves 200-500ms by running these independent operations concurrently
    // ========================================================================

    log.info('Starting parallel operations', {
      audioSize: bytes.length,
    });

    // Build enhanced description from metadata for better voice cloning
    let enhancedDescription = description || 'Voice clone created with INrVO';
    if (metadata) {
      const parts: string[] = [];

      // Voice quality descriptor (calm, warm, soothing, etc.)
      if (metadata.descriptive) {
        parts.push(metadata.descriptive);
      }

      // Gender
      if (metadata.gender) parts.push(metadata.gender);

      // Age range
      if (metadata.ageRange) {
        const ageLabels: Record<string, string> = {
          'young': 'young adult',
          'middle-aged': 'middle-aged',
          'mature': 'mature adult',
        };
        parts.push(ageLabels[metadata.ageRange] || metadata.ageRange);
      }

      // Accent
      if (metadata.accent && metadata.accent !== 'native') {
        parts.push(`${metadata.accent} accent`);
      }

      if (parts.length > 0) {
        // e.g. "calm female middle-aged american accent voice. Voice clone created with INrVO"
        enhancedDescription = `${parts.join(' ')} voice. ${enhancedDescription}`;
      }

      // Use case context
      if (metadata.useCase) {
        enhancedDescription += ` Optimized for ${metadata.useCase}.`;
      }
    }
    log.info('Using enhanced description', { enhancedDescription, metadata });

    // Create promises for parallel execution
    const uploadPromise = supabase.storage
      .from('voice-samples')
      .upload(fileName, bytes, { contentType: 'audio/wav', upsert: false });

    const elevenLabsPromise = createElevenLabsVoiceClone(
      audioBlob,
      voiceName,
      enhancedDescription,
      removeBackgroundNoise ?? true,  // Default to noise removal for cleaner clones
      ELEVENLABS_API_KEY!,
      log
    );

    // Run both operations in parallel
    const [uploadResult, elevenLabsVoiceId] = await Promise.all([
      uploadPromise,
      elevenLabsPromise,
    ]);

    // Process upload result
    let voiceSampleUrl: string | null = null;
    if (uploadResult.error) {
      log.error('Storage upload failed', { error: uploadResult.error.message });
      // Continue - ElevenLabs voice was created successfully
    } else {
      const { data: publicUrlData } = supabase.storage
        .from('voice-samples')
        .getPublicUrl(fileName);
      voiceSampleUrl = publicUrlData.publicUrl;
      log.info('Audio uploaded to storage', { url: voiceSampleUrl });
    }

    // Create voice profile in database
    const { data: voiceProfile, error: profileError } = await (supabase
      .from('voice_profiles') as ReturnType<typeof supabase.from>)
      .insert({
        user_id: user.id,
        name: voiceName,
        description: description || 'Voice clone created with INrVO',
        provider: 'elevenlabs',
        elevenlabs_voice_id: elevenLabsVoiceId,
        voice_sample_url: voiceSampleUrl,
        provider_voice_id: null,
        fish_audio_model_id: null,  // Clear any legacy Fish Audio ID
        cloning_status: 'READY',
        status: 'READY',
        metadata: metadata || {},
      })
      .select('id')
      .single();

    if (profileError || !voiceProfile) {
      log.error('Failed to create voice profile', { error: profileError?.message });

      // Attempt to delete the ElevenLabs voice to avoid orphaned clones
      try {
        await fetch(`${ELEVENLABS_API_URL}/voices/${elevenLabsVoiceId}`, {
          method: 'DELETE',
          headers: { 'xi-api-key': ELEVENLABS_API_KEY! },
        });
        log.info('Cleaned up orphaned ElevenLabs voice', { voiceId: elevenLabsVoiceId });
      } catch (cleanupError) {
        log.warn('Failed to cleanup orphaned ElevenLabs voice', { voiceId: elevenLabsVoiceId });
      }

      return new Response(
        JSON.stringify({
          error: `Failed to create voice profile: ${profileError?.message || 'Unknown error'}`,
          requestId,
        }),
        { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('Voice profile created', {
      profileId: voiceProfile.id,
      elevenLabsVoiceId,
      hasStorage: !!voiceSampleUrl,
    });

    return new Response(
      JSON.stringify({
        success: true,
        voiceProfileId: voiceProfile.id,
        elevenLabsVoiceId,
        voiceSampleUrl,
        requestId,
      } as ElevenLabsCloneResponse),
      { status: 200, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    log.error('Error processing voice clone', error instanceof Error ? error : new Error(String(error)));

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        requestId,
      }),
      { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
