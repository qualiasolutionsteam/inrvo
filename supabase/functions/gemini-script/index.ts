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
  operation?: 'generate' | 'extend';
  existingScript?: string;
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
    const { thought, audioTags, operation = 'generate', existingScript }: GeminiScriptRequest = await req.json();

    // Validate input based on operation
    if (operation === 'extend') {
      if (!existingScript || existingScript.trim() === '') {
        return new Response(
          JSON.stringify({ error: 'Existing script is required for extend operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      if (!thought || thought.trim() === '') {
        return new Response(
          JSON.stringify({ error: 'Thought/prompt is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get Gemini API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the prompt based on operation
    let prompt: string;

    if (operation === 'extend') {
      // Extend operation: intelligently expand existing script
      prompt = `You are expanding a guided meditation script into a longer, more immersive version.

EXISTING SCRIPT:
"${existingScript}"

TASK: Expand this meditation into a longer version (250-350 words) while preserving its essence, tone, and flow.

EXPANSION GUIDELINES:
- Keep the original opening and adapt it naturally into the expanded version
- Add deeper visualizations with richer sensory details
- Include additional breathing exercises or body awareness moments
- Expand the core meditation experience with more guided imagery
- Add gentle transitions between sections
- Maintain the same peaceful, professional tone throughout
- Keep the closing sentiment but make it feel like a natural conclusion to the longer journey
- Preserve any existing audio tags like [pause], [deep breath], etc. and add more where appropriate

OUTPUT: The complete expanded meditation script only, no explanations or labels.`;
    } else {
      // Generate operation: create new script from thought with intelligent intent detection
      let audioTagsInstruction = '';
      if (audioTags && audioTags.length > 0) {
        audioTagsInstruction = `
AUDIO CUES TO INCORPORATE: ${audioTags.join(', ')}
Weave these naturally into the script where they enhance the experience.`;
      }

      prompt = `You are an expert wellness content creator. Create personalized content that PRECISELY matches the user's request.

USER'S REQUEST: "${thought}"

STEP 1 - DETECT CONTENT TYPE (do not output this, just use it internally):
- GUIDED MEDITATION: breathing, relaxation, mindfulness, visualization, chakras, grounding
- SLEEP STORY: sleep, bedtime, drifting off, rest, dreams, nighttime
- CALMING NARRATIVE: specific scene, journey, adventure, escape to a place
- AFFIRMATIONS: positive statements, mantras, self-love, confidence
- BREATHING EXERCISE: breath work, box breathing, counting breaths
- BODY SCAN: body awareness, tension release, progressive relaxation

STEP 2 - EXTRACT KEY ELEMENTS from the request:
- Specific setting mentioned (beach, forest, mountain, space, etc.)
- Specific goal (anxiety relief, focus, sleep, energy, healing)
- Specific emotions they want to feel
- Time of day context (morning, evening, night)
- Any specific techniques mentioned

STEP 3 - ADAPT YOUR RESPONSE:
Structure:
- Meditation: Opening breath → Core practice → Gentle close
- Sleep story: Scene setting → Slow journey → Fade to rest
- Affirmations: Grounding → Affirmation series → Empowerment
- Breathing: Setup → Rhythm → Guided cycles → Return

Tone:
- Sleep: Extra slow, dreamy, hypnotic, trailing sentences...
- Morning/Energy: Uplifting, awakening, vibrant yet calm
- Anxiety: Grounding, reassuring, present-moment
- Healing: Compassionate, nurturing, gentle
${audioTagsInstruction}

STEP 4 - WRITE THE SCRIPT (400-550 words for a 5-6 minute meditation):
- Use "you" for intimacy
- Rich sensory details (see, hear, feel, smell)
- Present tense
- Include frequent pauses using [pause], [long pause], [deep breath] tags
- Natural pauses via ellipses...
- Fresh, evocative language (avoid clichés)
- Build the experience gradually - don't rush
- Include opening grounding, main practice, and gentle closing
- Add breathing cues throughout: [deep breath], [exhale slowly]

PACING GUIDELINES:
- Start with grounding (30-50 words)
- Include 3-5 breathing moments with [deep breath] or [exhale slowly]
- Add [pause] after important phrases
- Add [long pause] between major sections
- End with gentle return to awareness (40-60 words)

OUTPUT: Only the script. No titles, headers, or explanations. Start immediately with the experience.

CRITICAL: Match EXACTLY what the user asked for. If they want a beach visualization, give them a beach. If they want sleep help, make it sleep-focused. Accuracy to their request is paramount.`;
    }

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
            maxOutputTokens: operation === 'extend' ? 1500 : 1200,
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
