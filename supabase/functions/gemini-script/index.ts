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

      prompt = `You are an expert meditation guide creating HIGHLY PERSONALIZED content. Your meditation must feel like it was written specifically for THIS person's exact situation.

=== USER'S REQUEST ===
"${thought}"
=== END REQUEST ===

## STEP 1: DEEP ANALYSIS (internal only)

Identify EVERYTHING specific in the user's request:
- SITUATION: What specific event/challenge are they facing? (e.g., job interview tomorrow, can't sleep, just had a fight)
- EMOTION: What are they actually feeling? (anxious, stressed, sad, overwhelmed, scared)
- SETTING: Did they request a specific place? (beach, forest, space, etc.)
- TIME: When is this for? (tonight, morning, quick break, before an event)
- GOAL: What outcome do they want? (calm, sleep, confidence, peace, clarity)
- TECHNIQUE: Any specific methods mentioned? (breathing, body scan, visualization)

## STEP 2: CONTENT TYPE SELECTION

Based on your analysis, choose ONE:
- SITUATION-SPECIFIC MEDITATION: For events like interviews, exams, presentations, dates
- EMOTIONAL HEALING: For sadness, grief, heartbreak, self-doubt
- ANXIETY/STRESS RELIEF: For overwhelm, panic, racing thoughts
- SLEEP INDUCTION: For insomnia, racing mind at night, restlessness
- GROUNDING/PRESENCE: For feeling scattered, disconnected, anxious
- ENERGY/MOTIVATION: For feeling stuck, unmotivated, tired
- SELF-LOVE/CONFIDENCE: For self-criticism, doubt, low esteem

## STEP 3: PERSONALIZATION REQUIREMENTS

YOUR MEDITATION MUST:
1. Reference their SPECIFIC situation within the first 50 words
   - If they have an interview → mention the interview directly
   - If they can't sleep → acknowledge their restless mind
   - If they're anxious about something → name that thing

2. Address their EXACT emotional state
   - Don't just do a "generic calm" meditation
   - Speak to what they're actually feeling

3. Use the setting THEY requested (if any)
   - If they said beach, use beach imagery
   - If they said forest, use forest imagery
   - If no setting mentioned, choose one that fits their mood

4. Match the TIME context
   - Night/sleep: Slower, drowsier, trailing sentences...
   - Morning: Gentle awakening energy
   - Before an event: Building confidence and grounding

## STEP 4: WRITE THE SCRIPT

Structure (400-550 words total):
1. OPENING (40-60 words): Acknowledge exactly where they are emotionally. Make them feel SEEN.
2. GROUNDING (50-70 words): Breath awareness, body settling
3. CORE EXPERIENCE (200-280 words): The main visualization/practice
4. INTEGRATION (50-70 words): Connecting the experience to their situation
5. CLOSING (40-60 words): Gentle return with lasting calm/confidence

Style requirements:
- Use "you" throughout for intimacy
- Rich sensory details (5 senses)
- Present tense
- Include audio tags: [pause], [long pause], [deep breath], [exhale slowly]
- Natural ellipses for pacing...
- Fresh language (avoid "journey", "sacred", overused meditation clichés)

${audioTagsInstruction}

## OUTPUT

Only the meditation script. No titles, headers, labels, or explanations. Start immediately with the experience.

## CRITICAL ACCURACY CHECK

Before writing, verify:
✓ Does my script reference their specific situation?
✓ Does it address their exact emotional state?
✓ Am I using the setting they requested (or an appropriate one)?
✓ Does the tone match their needs (sleep vs. energy vs. confidence)?
✓ Would this feel personally written for THEM, not generic?

If you cannot answer YES to all of these, revise your approach.`;
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
