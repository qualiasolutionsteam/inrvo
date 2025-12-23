import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, createCompressedResponse } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { withCircuitBreaker, CIRCUIT_CONFIGS, CircuitBreakerError } from "../_shared/circuitBreaker.ts";

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

// Optimized prompt templates - pre-compiled to reduce per-request overhead
const EXTEND_PROMPT_TEMPLATE = `Expand this meditation into a longer version (250-350 words) preserving its essence and tone.

SCRIPT:
"{{SCRIPT}}"

GUIDELINES:
- Keep original opening, add deeper visualizations
- Add breathing exercises and body awareness
- Expand with richer guided imagery
- Preserve existing audio tags [pause], [deep breath] and add more
- Maintain peaceful, professional tone

OUTPUT: Complete expanded script only, no explanations.`;

const GENERATE_PROMPT_TEMPLATE = `Create a PERSONALIZED meditation for this person's exact situation.

REQUEST: "{{THOUGHT}}"
{{AUDIO_TAGS}}

ANALYZE (internal):
- Situation: What specific challenge? (interview, can't sleep, etc.)
- Emotion: Anxious, stressed, sad, overwhelmed?
- Setting: Requested place? (beach, forest, space)
- Goal: Calm, sleep, confidence, clarity?

STRUCTURE (400-550 words):
1. OPENING (50 words): Acknowledge their emotional state. Make them feel seen.
2. GROUNDING (60 words): Breath awareness, settling
3. CORE (240 words): Main visualization matching their needs
4. INTEGRATION (60 words): Connect to their situation
5. CLOSING (50 words): Gentle return with calm/confidence

REQUIREMENTS:
- Reference their specific situation in first 50 words
- Use "you" throughout, present tense
- Rich sensory details (5 senses)
- Include: [pause], [long pause], [deep breath], [exhale slowly]
- Natural ellipses for pacing...
- Fresh language (avoid "journey", "sacred")
- Match tone to need (drowsy for sleep, energizing for confidence)

OUTPUT: Only the meditation script. No titles, headers, or explanations. Start immediately.`;

// Lazy-load Supabase client to reduce cold start
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseClient;
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
  const log = createLogger({ requestId, operation: 'gemini-script' });

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

    // Check rate limit
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.script);
    if (!rateLimitResult.allowed) {
      log.warn('Rate limit exceeded', { userId: user.id, remaining: rateLimitResult.remaining });
      return createRateLimitResponse(rateLimitResult, allHeaders);
    }

    // Parse request body
    const { thought, audioTags, operation = 'generate', existingScript }: GeminiScriptRequest = await req.json();

    // Validate input based on operation
    if (operation === 'extend') {
      if (!existingScript?.trim()) {
        log.warn('Missing existingScript for extend operation');
        return new Response(
          JSON.stringify({ error: 'Existing script is required for extend operation', requestId }),
          { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (!thought?.trim()) {
      log.warn('Missing thought/prompt');
      return new Response(
        JSON.stringify({ error: 'Thought/prompt is required', requestId }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Gemini API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      log.error('Gemini API key not configured');
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured', requestId }),
        { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('Starting script generation', { operation, thoughtLength: thought?.length || 0 });

    // Build prompt using pre-compiled templates
    let prompt: string;
    if (operation === 'extend') {
      prompt = EXTEND_PROMPT_TEMPLATE.replace('{{SCRIPT}}', existingScript!);
    } else {
      const audioTagsLine = audioTags?.length
        ? `AUDIO CUES: ${audioTags.join(', ')} (weave naturally into script)`
        : '';
      prompt = GENERATE_PROMPT_TEMPLATE
        .replace('{{THOUGHT}}', thought)
        .replace('{{AUDIO_TAGS}}', audioTagsLine);
    }

    // Call Gemini API with circuit breaker and timeout
    const script = await withCircuitBreaker(
      'gemini',
      CIRCUIT_CONFIGS.gemini,
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: operation === 'extend' ? 1500 : 1200,
                }
              }),
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);

          if (!response.ok) {
            const error = await response.json();
            console.error('Gemini API error:', error);
            throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
          }

          const data = await response.json();
          const scriptText = data.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!scriptText?.trim()) {
            throw new Error('Empty response from Gemini API');
          }

          return scriptText.trim();
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      }
    );

    log.info('Script generation successful', { scriptLength: script.length });

    // Use compression for script responses (typically 2-4KB text)
    return await createCompressedResponse(
      { script, requestId } as GeminiScriptResponse,
      allHeaders
    );

  } catch (error) {
    log.error('Error generating script', error);

    // Handle circuit breaker errors with appropriate status
    if (error instanceof CircuitBreakerError) {
      return new Response(
        JSON.stringify({
          script: '',
          error: error.message,
          requestId,
          retryAfterMs: error.retryAfterMs,
        }),
        {
          status: 503,
          headers: {
            ...allHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(error.retryAfterMs / 1000)),
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        script: '',
        error: error.message || 'Unknown error occurred',
        requestId,
      } as GeminiScriptResponse),
      { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
