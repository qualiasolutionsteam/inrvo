import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { checkRateLimit, createRateLimitResponse } from "../_shared/rateLimit.ts";
import { addSecurityHeaders } from "../_shared/securityHeaders.ts";

/**
 * Gemini Live Token Edge Function
 *
 * Generates configuration for connecting to Gemini Multimodal Live API.
 * Returns the WebSocket URL and API key for frontend use.
 *
 * Security:
 * - Rate limited: 10 requests per minute per user
 * - API key is returned for frontend WebSocket connection
 * - Authentication required (JWT or anonymous with IP rate limiting)
 */

// Voice name options for meditation (calm, soothing voices)
const MEDITATION_VOICES = [
  'Aoede',    // Calm, clear female voice
  'Charon',   // Deep, calming male voice
  'Fenrir',   // Warm, gentle male voice
  'Kore',     // Soft, nurturing female voice
];

// System prompt for voice meditation assistant
const VOICE_SYSTEM_PROMPT = `You are a wise, compassionate meditation guide for INrVO speaking in real-time voice conversation.

## YOUR VOICE PERSONALITY

Speak in a calm, warm, grounded tone - like a trusted friend with profound wisdom. Your voice should be:
- Unhurried and peaceful
- Warm and present
- Clear but soft
- Natural pauses between thoughts

## CONVERSATION GUIDELINES

1. **Keep responses SHORT for voice**: Aim for 1-3 sentences in natural conversation
2. **Use natural pauses**: Don't rush - let silences be comfortable
3. **Match the user's energy**: If they're anxious, be extra calm and grounding
4. **Listen more than you speak**: Ask gentle questions to understand

## WHAT YOU CAN DO

When the user asks, you can guide them through:
- Short breathing exercises (guide them breath by breath)
- Grounding techniques (5-4-3-2-1 senses, body awareness)
- Calming visualizations (describe peaceful scenes)
- Quick stress relief (progressive relaxation, affirmations)
- Mindful moments (present awareness, gratitude)

## VOICE-SPECIFIC RULES

1. **Never lecture**: Keep wisdom brief and organic
2. **Don't read scripts**: Speak naturally as if having a real conversation
3. **Check in frequently**: "How does that feel?" "Ready to continue?"
4. **Adapt in real-time**: If user interrupts or changes topic, flow with them
5. **Use breathing cues**: "Take a breath with me..." then pause naturally

## RESPONSE EXAMPLES

User: "I'm feeling anxious"
You: "I hear you. Let's take a slow breath together right now... in... and out. What's on your mind?"

User: "Can you help me relax?"
You: "Of course. Close your eyes if you'd like. Feel your feet on the ground. Now let's breathe... in through your nose... and gently out. You're doing great."

User: "Hi"
You: "Hey there. What's on your heart today?"

Remember: You're having a real-time voice conversation. Be present, be brief, be warm.`;

// Lazy-load Supabase client
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseClient;
}

interface GeminiLiveTokenResponse {
  wsUrl: string;
  apiKey: string;
  model: string;
  voiceName: string;
  systemPrompt: string;
  requestId?: string;
  error?: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const requestId = getRequestId(req);
  const tracingHeaders = getTracingHeaders(requestId);
  const allHeaders = addSecurityHeaders({ ...corsHeaders, ...tracingHeaders });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: allHeaders });
  }

  // Create logger with request context
  const log = createLogger({ requestId, operation: 'gemini-live-token' });

  try {
    // Try to validate user from JWT token (optional - allows anonymous access)
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    let isAnonymous = true;

    if (authHeader) {
      const supabase = getSupabaseClient();
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
        isAnonymous = false;
        log.info('Request authenticated', { userId: user.id });
      }
    }

    // For anonymous users, use IP address for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     req.headers.get('x-real-ip') ||
                     'unknown';

    // Rate limit key: use userId if authenticated, otherwise IP address
    const rateLimitKey = userId || `anon:${clientIP}`;

    // Strict rate limiting for token generation (prevents abuse)
    // Anonymous: 5/min, Authenticated: 10/min
    const rateLimit = isAnonymous
      ? { maxRequests: 5, windowMs: 60000, keyPrefix: 'gemini-live' }
      : { maxRequests: 10, windowMs: 60000, keyPrefix: 'gemini-live' };

    const rateLimitResult = checkRateLimit(rateLimitKey, rateLimit);
    if (!rateLimitResult.allowed) {
      log.warn('Rate limit exceeded', { rateLimitKey, remaining: rateLimitResult.remaining, isAnonymous });
      return createRateLimitResponse(rateLimitResult, allHeaders);
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

    // Parse optional request body for voice preference
    let preferredVoice: string | undefined;
    try {
      if (req.body) {
        const body = await req.json();
        preferredVoice = body.voiceName;
      }
    } catch {
      // No body or invalid JSON is fine
    }

    // Select voice (use preference or default to Aoede for calm meditation)
    const voiceName = preferredVoice && MEDITATION_VOICES.includes(preferredVoice)
      ? preferredVoice
      : 'Aoede';

    log.info('Generating Gemini Live token', {
      isAnonymous,
      voiceName,
      userId: userId || rateLimitKey,
    });

    // Return configuration for frontend WebSocket connection
    const response: GeminiLiveTokenResponse = {
      // WebSocket URL for Gemini Multimodal Live API
      wsUrl: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent',
      apiKey: geminiApiKey,
      model: 'models/gemini-2.0-flash-exp', // Gemini 2.0 Flash Exp - supports Multimodal Live API
      voiceName,
      systemPrompt: VOICE_SYSTEM_PROMPT,
      requestId,
    };

    log.info('Token generated successfully', { voiceName });

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log.error('Error generating Gemini Live token', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        requestId,
      } as GeminiLiveTokenResponse),
      { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
