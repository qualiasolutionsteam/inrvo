import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, createCompressedResponse } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { withCircuitBreaker, CIRCUIT_CONFIGS, CircuitBreakerError } from "../_shared/circuitBreaker.ts";
import { addSecurityHeaders } from "../_shared/securityHeaders.ts";
import {
  sanitizePromptInput,
  INPUT_LIMITS,
} from "../_shared/sanitization.ts";

/**
 * Gemini Chat Edge Function
 *
 * Handles conversational AI for the meditation agent.
 * Unlike gemini-script which forces meditation generation,
 * this endpoint respects the agent's system prompt for natural conversation.
 */

interface GeminiChatRequest {
  prompt: string;  // User message and context (without system instructions)
  systemPrompt?: string;  // System instructions sent separately to Gemini
  maxTokens?: number;
  temperature?: number;
}

interface GeminiChatResponse {
  message: string;
  error?: string;
}

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
  const allHeaders = addSecurityHeaders({ ...corsHeaders, ...tracingHeaders });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: allHeaders });
  }

  // Create logger with request context
  const log = createLogger({ requestId, operation: 'gemini-chat' });

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

    // Apply stricter rate limits for anonymous users
    // Chat is lighter than script generation, allow more requests
    const rateLimit = isAnonymous
      ? { maxRequests: 10, windowMs: 60000 }  // 10 requests per minute for anonymous
      : { maxRequests: 30, windowMs: 60000 }; // 30 requests per minute for authenticated

    const rateLimitResult = checkRateLimit(rateLimitKey, rateLimit);
    if (!rateLimitResult.allowed) {
      log.warn('Rate limit exceeded', { rateLimitKey, remaining: rateLimitResult.remaining, isAnonymous });
      return createRateLimitResponse(rateLimitResult, allHeaders);
    }

    if (isAnonymous) {
      log.info('Anonymous request', { clientIP, rateLimitKey });
    }

    // Parse request body
    const {
      prompt: rawPrompt,
      systemPrompt,
      maxTokens = 500,  // Shorter responses for chat
      temperature = 0.8,  // Slightly more creative for natural conversation
    }: GeminiChatRequest = await req.json();

    // Sanitize the prompt (but don't strip the system instructions)
    const promptSanitization = sanitizePromptInput(rawPrompt || '', INPUT_LIMITS.thought * 3);
    const prompt = promptSanitization.sanitized;

    // Log if injection attempts were detected
    if (promptSanitization.flaggedPatterns.length > 0) {
      log.warn('Potential prompt injection detected', {
        patterns: promptSanitization.flaggedPatterns,
        userId: userId || rateLimitKey,
        isAnonymous,
        originalLength: rawPrompt?.length || 0,
        wasModified: promptSanitization.wasModified,
      });
    }

    // Validate input
    if (!prompt?.trim()) {
      log.warn('Missing prompt');
      return new Response(
        JSON.stringify({ error: 'Prompt is required', requestId }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OpenRouter API key from environment
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterApiKey) {
      log.error('OpenRouter API key not configured');
      return new Response(
        JSON.stringify({ error: 'OpenRouter API key not configured', requestId }),
        { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('Starting chat generation', {
      promptLength: prompt.length,
      maxTokens,
      temperature,
    });

    // Call OpenRouter API with circuit breaker and timeout
    const message = await withCircuitBreaker(
      'openrouter',
      CIRCUIT_CONFIGS.openrouter,
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for chat

        try {
          // Build messages array for OpenAI-compatible format
          const messages: Array<{ role: string; content: string }> = [];

          // Add system prompt if provided
          if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
          }

          // Add user message
          messages.push({ role: 'user', content: prompt });

          const response = await fetch(
            'https://openrouter.ai/api/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openRouterApiKey}`,
                'HTTP-Referer': Deno.env.get('SUPABASE_URL') || 'https://inrvo.app',
                'X-Title': 'INrVO Meditation App',
              },
              body: JSON.stringify({
                model: 'google/gemini-3-flash-preview',
                messages,
                temperature,
                max_tokens: maxTokens,
              }),
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);

          if (!response.ok) {
            const error = await response.json();
            console.error('OpenRouter API error:', error);
            throw new Error(`OpenRouter API error: ${error.error?.message || 'Unknown error'}`);
          }

          const data = await response.json();
          const messageText = data.choices?.[0]?.message?.content;

          if (!messageText?.trim()) {
            throw new Error('Empty response from OpenRouter API');
          }

          return messageText.trim();
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      }
    );

    log.info('Chat generation successful', { messageLength: message.length });

    // Use compression for responses
    return await createCompressedResponse(
      { message, requestId } as GeminiChatResponse,
      allHeaders
    );

  } catch (error) {
    log.error('Error generating chat response', error);

    // Handle circuit breaker errors with appropriate status
    if (error instanceof CircuitBreakerError) {
      return new Response(
        JSON.stringify({
          message: '',
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

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        message: '',
        error: errorMessage,
        requestId,
      } as GeminiChatResponse),
      { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
