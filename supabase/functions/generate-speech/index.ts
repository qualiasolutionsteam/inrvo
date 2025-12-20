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
    const { text, voiceId, voiceSettings }: Omit<GenerateSpeechRequest, 'userId'> = await req.json();
    const userId = user.id; // Use verified user ID from JWT

    // Validate input
    if (!text || !voiceId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      return new Response(
        JSON.stringify({ error: 'Voice profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate TTS cost (280 credits per 1K characters)
    const creditsNeeded = Math.ceil((text.length / 1000) * 280);

    // Check user credits
    const { data: userCredits } = await supabase
      .from('user_credits')
      .select('credits_remaining')
      .eq('user_id', userId)
      .single();

    if (!userCredits || userCredits.credits_remaining < creditsNeeded) {
      return new Response(
        JSON.stringify({ error: `Insufficient credits. Need ${creditsNeeded} credits.` }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only cloned ElevenLabs voices are supported
    if (!voiceProfile.elevenlabs_voice_id) {
      return new Response(
        JSON.stringify({ error: 'Only cloned voices are supported. Please clone a voice first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenlabsApiKey) {
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData = {
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: voiceSettings?.stability ?? 0.5,
        similarity_boost: voiceSettings?.similarity_boost ?? 0.8,
        style: voiceSettings?.style ?? 0.0,
        use_speaker_boost: voiceSettings?.use_speaker_boost ?? true,
      },
    };

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
      }
    );

    if (!ttsResponse.ok) {
      const error = await ttsResponse.json();
      throw new Error(`TTS generation failed: ${error.detail || error.message}`);
    }

    const audioBlob = await ttsResponse.blob();
    const audioBase64 = await blobToBase64(audioBlob);

    if (!audioBase64) {
      throw new Error('No audio data received');
    }

    // Deduct credits
    await supabase.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: creditsNeeded,
    });

    // Track usage
    await supabase
      .from('voice_cloning_usage')
      .insert({
        user_id: userId,
        voice_profile_id: voiceId,
        credits_consumed: creditsNeeded,
        operation_type: 'TTS_GENERATE',
        metadata: {
          text_length: text.length,
          processed_in_edge: true,
        },
      });

    const result: GenerateSpeechResponse = {
      success: true,
      audioBase64,
      creditsUsed: creditsNeeded,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating speech:', error);

    const errorResult: GenerateSpeechResponse = {
      success: false,
      error: error.message || 'Unknown error occurred',
    };

    return new Response(
      JSON.stringify(errorResult),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to convert blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}