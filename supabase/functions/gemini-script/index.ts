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

interface GeminiScriptRequest {
  thought: string;
  audioTags?: string[];
}

interface GeminiScriptResponse {
  script: string;
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
    // Initialize Supabase client for auth validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user from JWT token
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

    // Parse request body
    const { thought, audioTags }: GeminiScriptRequest = await req.json();

    // Validate input
    if (!thought || thought.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Thought/prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Gemini API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the prompt
    let audioTagsInstruction = '';
    if (audioTags && audioTags.length > 0) {
      audioTagsInstruction = `
Include these audio cues naturally: ${audioTags.join(', ')}.
Place them inline where they should occur (e.g., "Take a breath in... [pause] ...and release.").`;
    }

    const prompt = `Create a short, soothing guided meditation (100-150 words) from this idea: "${thought}"

Requirements:
- Brief calming introduction (1-2 sentences)
- Core visualization or breathing exercise (main body)
- Gentle closing (1 sentence)
- Professional, peaceful tone
- Evocative sensory language${audioTagsInstruction ? '\n' + audioTagsInstruction : ''}

Output only the meditation script, no titles or labels.`;

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          }
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini API error:', error);
      throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const script = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!script || script.trim() === '') {
      throw new Error('Empty response from Gemini API');
    }

    const result: GeminiScriptResponse = {
      script: script.trim(),
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating script:', error);

    const errorResult: GeminiScriptResponse = {
      script: '',
      error: error.message || 'Unknown error occurred',
    };

    return new Response(
      JSON.stringify(errorResult),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
