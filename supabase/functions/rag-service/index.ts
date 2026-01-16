import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { addSecurityHeaders } from "../_shared/securityHeaders.ts";

/**
 * RAG Service Edge Function
 *
 * Handles embedding generation and semantic search for personalization.
 * Uses Google text-embedding-004 via OpenRouter for embeddings.
 */

interface RAGRequest {
  operation: 'embed' | 'search_wisdom' | 'search_memory' | 'store_memory' | 'get_context';
  // For embed operation
  text?: string;
  texts?: string[];
  // For search operations
  query?: string;
  limit?: number;
  filterType?: string;
  filterTags?: string[];
  // For store_memory operation
  memoryType?: 'preference' | 'fact' | 'goal' | 'emotion' | 'feedback';
  content?: string;
  context?: string;
  importance?: number;
  expiresDays?: number;
}

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

/**
 * Generate embeddings using Google text-embedding-004 via OpenRouter
 */
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': Deno.env.get('SUPABASE_URL') || 'https://innrvo.com',
      'X-Title': 'Innrvo Meditation App',
    },
    body: JSON.stringify({
      model: 'google/text-embedding-004',
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Embedding API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Generate multiple embeddings in batch
 */
async function generateEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': Deno.env.get('SUPABASE_URL') || 'https://innrvo.com',
      'X-Title': 'Innrvo Meditation App',
    },
    body: JSON.stringify({
      model: 'google/text-embedding-004',
      input: texts,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Embedding API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
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

  const log = createLogger({ requestId, operation: 'rag-service' });

  try {
    // Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required', requestId }),
        { status: 401, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token', requestId }),
        { status: 401, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    log.info('Request authenticated', { userId });

    // Get OpenRouter API key
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterKey) {
      throw new Error('OpenRouter API key not configured');
    }

    // Parse request
    const request: RAGRequest = await req.json();
    log.info('RAG operation', { operation: request.operation });

    switch (request.operation) {
      // ================================================================
      // EMBED: Generate embeddings for text(s)
      // ================================================================
      case 'embed': {
        if (request.texts && request.texts.length > 0) {
          const embeddings = await generateEmbeddings(request.texts, openRouterKey);
          return new Response(
            JSON.stringify({ embeddings, requestId }),
            { status: 200, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
          );
        } else if (request.text) {
          const embedding = await generateEmbedding(request.text, openRouterKey);
          return new Response(
            JSON.stringify({ embedding, requestId }),
            { status: 200, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          throw new Error('text or texts required for embed operation');
        }
      }

      // ================================================================
      // SEARCH_WISDOM: Semantic search over knowledge base
      // ================================================================
      case 'search_wisdom': {
        if (!request.query) throw new Error('query required');

        const embedding = await generateEmbedding(request.query, openRouterKey);

        const { data, error } = await supabase.rpc('match_wisdom', {
          query_embedding: embedding,
          match_count: request.limit || 5,
          filter_type: request.filterType || null,
          filter_tags: request.filterTags || null,
        });

        if (error) throw error;

        return new Response(
          JSON.stringify({ results: data, requestId }),
          { status: 200, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ================================================================
      // SEARCH_MEMORY: Search user's conversation memory
      // ================================================================
      case 'search_memory': {
        if (!request.query) throw new Error('query required');

        const embedding = await generateEmbedding(request.query, openRouterKey);

        const { data, error } = await supabase.rpc('match_conversation_memory', {
          p_user_id: userId,
          query_embedding: embedding,
          match_count: request.limit || 5,
          filter_type: request.filterType || null,
        });

        if (error) throw error;

        return new Response(
          JSON.stringify({ results: data, requestId }),
          { status: 200, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ================================================================
      // STORE_MEMORY: Store a new memory with embedding
      // ================================================================
      case 'store_memory': {
        if (!request.content || !request.memoryType) {
          throw new Error('content and memoryType required');
        }

        const embedding = await generateEmbedding(request.content, openRouterKey);

        const { data, error } = await supabase.rpc('store_conversation_memory', {
          p_user_id: userId,
          p_memory_type: request.memoryType,
          p_content: request.content,
          p_context: request.context || null,
          p_importance: request.importance || 5,
          p_embedding: embedding,
          p_expires_days: request.expiresDays || null,
        });

        if (error) throw error;

        return new Response(
          JSON.stringify({ memoryId: data, requestId }),
          { status: 200, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ================================================================
      // GET_CONTEXT: Get full user context for personalization
      // ================================================================
      case 'get_context': {
        const { data, error } = await supabase.rpc('get_user_context', {
          p_user_id: userId,
        });

        if (error) throw error;

        // Get recent meditation history for additional context
        const { data: recentMeditations } = await supabase
          .from('meditation_history')
          .select('prompt, content_category, content_sub_type, meditation_type, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);

        const context = data?.[0] || {};

        return new Response(
          JSON.stringify({
            context: {
              ...context,
              recentMeditations: recentMeditations || [],
            },
            requestId,
          }),
          { status: 200, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown operation: ${request.operation}`);
    }

  } catch (error) {
    log.error('RAG service error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, requestId }),
      { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
