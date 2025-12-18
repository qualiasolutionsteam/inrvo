import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ProcessVoiceRequest {
  audioBase64: string;
  voiceName: string;
  description?: string;
  userId: string;
}

interface ProcessVoiceResponse {
  success: boolean;
  elevenlabsVoiceId?: string;
  error?: string;
  creditsUsed?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { audioBase64, voiceName, description, userId }: ProcessVoiceRequest = await req.json();

    // Validate input
    if (!audioBase64 || !voiceName || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user credits
    const { data: userCredits } = await supabase
      .from('user_credits')
      .select('credits_remaining')
      .eq('user_id', userId)
      .single();

    if (!userCredits || userCredits.credits_remaining < 5000) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check monthly clone limit
    const { data: monthlyUsage } = await supabase
      .from('voice_usage_limits')
      .select('clones_created, clones_limit')
      .eq('user_id', userId)
      .eq('month_start', new Date().toISOString().slice(0, 7))
      .single();

    if (monthlyUsage && monthlyUsage.clones_created >= monthlyUsage.clones_limit) {
      return new Response(
        JSON.stringify({ error: 'Monthly clone limit reached' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Create voice with ElevenLabs
    const formData = new FormData();
    formData.append('name', voiceName);
    formData.append('description', description || `Voice clone created on ${new Date().toISOString()}`);
    formData.append('files', audioBlob, 'voice_sample.webm');

    // Step 1: Add voice to collection
    const voiceResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenlabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: voiceName,
        description: description,
      }),
    });

    if (!voiceResponse.ok) {
      const error = await voiceResponse.json();
      throw new Error(`ElevenLabs API error: ${error.detail || error.message}`);
    }

    const voiceData = await voiceResponse.json();
    const elevenlabsVoiceId = voiceData.voice_id;

    // Step 2: Upload audio sample
    const uploadFormData = new FormData();
    uploadFormData.append('name', `${elevenlabsVoiceId}_sample`);
    uploadFormData.append('files', audioBlob, 'voice_sample.webm');

    const uploadResponse = await fetch(
      `https://api.elevenlabs.io/v1/voices/${elevenlabsVoiceId}/samples`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenlabsApiKey,
        },
        body: uploadFormData,
      }
    );

    if (!uploadResponse.ok) {
      // Clean up the voice if upload fails
      await fetch(`https://api.elevenlabs.io/v1/voices/${elevenlabsVoiceId}`, {
        method: 'DELETE',
        headers: { 'xi-api-key': elevenlabsApiKey },
      });

      const error = await uploadResponse.json();
      throw new Error(`Upload failed: ${error.detail || error.message}`);
    }

    // Create voice profile in database
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
      })
      .select()
      .single();

    if (profileError) throw profileError;

    // Deduct credits
    await supabase.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: 5000,
    });

    // Update monthly usage
    await supabase.rpc('increment_clone_count', {
      p_user_id: userId,
    });

    // Track usage
    await supabase
      .from('voice_cloning_usage')
      .insert({
        user_id: userId,
        voice_profile_id: voiceProfile.id,
        credits_consumed: 5000,
        operation_type: 'CLONE_CREATE',
        metadata: {
          duration: duration,
          processed_in_edge: true,
        },
      });

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