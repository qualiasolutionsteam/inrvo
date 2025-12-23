import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

interface VoiceMetadata {
  language?: string;        // ISO code: 'en', 'es', 'fr', etc.
  accent?: string;          // 'american', 'british', 'australian', etc.
  gender?: string;          // 'male', 'female', 'other'
  ageRange?: string;        // 'young', 'middle-aged', 'mature'
  hasBackgroundNoise?: boolean;
  useCase?: string;         // 'meditation', 'narration', 'conversational'
  descriptive?: string;     // 'calm', 'warm', 'soothing'
}

interface ProcessVoiceRequest {
  audioBase64: string;
  voiceName: string;
  description?: string;
  userId: string;
  metadata?: VoiceMetadata;
  removeBackgroundNoise?: boolean;
}

interface ProcessVoiceResponse {
  success: boolean;
  elevenlabsVoiceId?: string;
  voiceProfileId?: string;
  error?: string;
  creditsUsed?: number;
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
  const log = createLogger({ requestId, operation: 'process-voice' });

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user from JWT token (not from request body)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      log.warn('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header', requestId }),
        { status: 401, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }
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

    // Check rate limit - voice cloning is expensive, strict limit
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.voiceClone);
    if (!rateLimitResult.allowed) {
      log.warn('Rate limit exceeded for voice cloning', { userId: user.id, remaining: rateLimitResult.remaining });
      return createRateLimitResponse(rateLimitResult, allHeaders);
    }

    // Parse request body - use verified user.id instead of userId from body
    const { audioBase64, voiceName, description, metadata, removeBackgroundNoise }: Omit<ProcessVoiceRequest, 'userId'> = await req.json();
    const userId = user.id; // Use verified user ID from JWT

    log.info('Starting voice cloning', { voiceName, audioSize: audioBase64?.length || 0 });

    // Validate input
    if (!audioBase64 || !voiceName) {
      log.warn('Missing required fields', { hasAudio: !!audioBase64, hasVoiceName: !!voiceName });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CREDIT SYSTEM DISABLED - Skip credit and clone limit checks
    // const { data: creditStatus, error: creditError } = await supabase
    //   .rpc('check_user_credits_status', { p_user_id: userId });
    //
    // if (creditError) {
    //   console.error('Credit check error:', creditError);
    //   return new Response(
    //     JSON.stringify({ error: 'Failed to check credits' }),
    //     { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    //   );
    // }
    //
    // const status = creditStatus?.[0];
    // if (!status || !status.can_clone) {
    //   const errorMessage = status?.credits_remaining < 5000
    //     ? 'Insufficient credits'
    //     : 'Monthly clone limit reached';
    //   return new Response(
    //     JSON.stringify({ error: errorMessage }),
    //     { status: status?.credits_remaining < 5000 ? 402 : 429, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    //   );
    // }

    // Convert base64 to blob
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const audioBlob = new Blob([bytes], { type: 'audio/webm' });

    // Estimate duration from file size (AudioContext not available in Deno)
    // Frontend already validates duration, this is a backup check
    // WebM audio is typically ~128kbps, so bytes / 16000 gives rough seconds
    const estimatedDuration = bytes.length / 16000;

    if (estimatedDuration < 10) {
      return new Response(
        JSON.stringify({ error: `Audio appears too short. Please record at least 30 seconds for best quality.` }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process with ElevenLabs
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenlabsApiKey) {
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build labels object for ElevenLabs API (max 5 labels allowed)
    const labels: Record<string, string> = {};

    // Priority order: use_case, gender, accent, language, descriptive (max 5)
    labels.use_case = metadata?.useCase || 'meditation';
    if (metadata?.gender) labels.gender = metadata.gender;
    if (metadata?.accent) labels.accent = metadata.accent;
    if (metadata?.language) labels.language = metadata.language;
    if (Object.keys(labels).length < 5) {
      labels.descriptive = metadata?.descriptive || 'calm';
    }

    // Create voice with ElevenLabs IVC (Instant Voice Cloning) API
    const formData = new FormData();
    formData.append('name', voiceName);
    formData.append('description', description || `Meditation voice clone created on ${new Date().toISOString()}`);
    formData.append('files', audioBlob, 'voice_sample.webm');
    formData.append('labels', JSON.stringify(labels));

    // Apply background noise removal if requested
    if (removeBackgroundNoise || metadata?.hasBackgroundNoise) {
      formData.append('remove_background_noise', 'true');
    }

    // Use the IVC (Instant Voice Cloning) endpoint
    const voiceResponse = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenlabsApiKey,
      },
      body: formData,
    });

    if (!voiceResponse.ok) {
      const error = await voiceResponse.json();
      throw new Error(`ElevenLabs API error: ${error.detail?.message || error.detail || error.message || 'Voice cloning failed'}`);
    }

    const voiceData = await voiceResponse.json();
    const elevenlabsVoiceId = voiceData.voice_id;

    // Create voice profile in database with metadata
    const { data: voiceProfile, error: profileError } = await supabase
      .from('voice_profiles')
      .insert({
        user_id: userId,
        name: voiceName,
        description: description,
        provider: 'ElevenLabs',
        elevenlabs_voice_id: elevenlabsVoiceId,
        cloning_status: 'READY',
        sample_duration: estimatedDuration,
        status: 'READY',
        credits_used: 5000,
        metadata: metadata ? {
          language: metadata.language || 'en',
          accent: metadata.accent || 'american',
          gender: metadata.gender || 'female',
          ageRange: metadata.ageRange || 'middle-aged',
          hasBackgroundNoise: metadata.hasBackgroundNoise || false,
          useCase: metadata.useCase || 'meditation',
          descriptive: metadata.descriptive || 'calm',
        } : {
          language: 'en',
          accent: 'american',
          gender: 'female',
          ageRange: 'middle-aged',
          hasBackgroundNoise: false,
          useCase: 'meditation',
          descriptive: 'calm',
        },
      })
      .select()
      .single();

    if (profileError) throw profileError;

    // CREDIT SYSTEM DISABLED - Skip credit deduction and tracking
    // const { data: operationResult, error: operationError } = await supabase
    //   .rpc('perform_credit_operation', {
    //     p_user_id: userId,
    //     p_amount: 5000,
    //     p_operation_type: 'CLONE_CREATE',
    //     p_voice_profile_id: voiceProfile.id,
    //     p_character_count: null,
    //   });
    //
    // if (operationError) {
    //   console.error('Credit operation error:', operationError);
    // }

    const response: ProcessVoiceResponse = {
      success: true,
      elevenlabsVoiceId,
      voiceProfileId: voiceProfile.id,
      creditsUsed: 5000,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing voice:', error);

    const response: ProcessVoiceResponse = {
      success: false,
      error: error.message || 'Unknown error occurred',
    };

    return new Response(
      JSON.stringify(response),
      { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );
  }
});