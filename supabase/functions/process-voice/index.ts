import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const ALLOWED_ORIGINS = [
  'https://www.inrvo.com',
  'https://inrvo.com',
  'https://inrvo.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

const getCorsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

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
  error?: string;
  creditsUsed?: number;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user from JWT token (not from request body)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body - use verified user.id instead of userId from body
    const { audioBase64, voiceName, description, metadata, removeBackgroundNoise }: Omit<ProcessVoiceRequest, 'userId'> = await req.json();
    const userId = user.id; // Use verified user ID from JWT

    // Validate input
    if (!audioBase64 || !voiceName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    //     { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    //     { status: status?.credits_remaining < 5000 ? 402 : 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    //   );
    // }

    // Convert base64 to blob
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const audioBlob = new Blob([bytes], { type: 'audio/webm' });

    // Check audio duration (must be at least 30 seconds)
    const audioBuffer = await audioBlob.arrayBuffer();
    const audioContext = new AudioContext();
    const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
    const duration = decodedAudio.duration;

    if (duration < 30) {
      return new Response(
        JSON.stringify({ error: `Audio must be at least 30 seconds. Current: ${duration.toFixed(1)}s` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process with ElevenLabs
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenlabsApiKey) {
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build labels object for ElevenLabs API
    const labels: Record<string, string> = {
      use_case: 'meditation',
      descriptive: 'calm',
    };

    if (metadata) {
      if (metadata.language) labels.language = metadata.language;
      if (metadata.accent) labels.accent = metadata.accent;
      if (metadata.gender) labels.gender = metadata.gender;
      if (metadata.ageRange) labels.age = metadata.ageRange;
      if (metadata.useCase) labels.use_case = metadata.useCase;
      if (metadata.descriptive) labels.descriptive = metadata.descriptive;
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
        sample_duration: duration,
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
      creditsUsed: 5000,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing voice:', error);

    const response: ProcessVoiceResponse = {
      success: false,
      error: error.message || 'Unknown error occurred',
    };

    return new Response(
      JSON.stringify(response),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});