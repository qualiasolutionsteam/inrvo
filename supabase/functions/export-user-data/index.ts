import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

/**
 * GDPR Data Export Endpoint
 * Returns all user data in a downloadable JSON format
 */

interface UserDataExport {
  exportedAt: string;
  requestId: string;
  user: {
    id: string;
    email: string;
    createdAt: string;
  };
  voiceProfiles: Array<{
    id: string;
    name: string;
    description?: string;
    language: string;
    provider: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  meditationHistory: Array<{
    id: string;
    prompt: string;
    voiceName?: string;
    backgroundTrackName?: string;
    durationSeconds?: number;
    createdAt: string;
  }>;
  conversations: Array<{
    id: string;
    messages: unknown;
    createdAt: string;
  }>;
  preferences: {
    audioTags?: {
      enabled: boolean;
      favoriteTags: string[];
    };
  };
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
  const log = createLogger({ requestId, operation: 'export-user-data' });

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      log.warn('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header', requestId }),
        { status: 401, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      log.warn('Invalid or expired token', { authError: authError?.message });
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', requestId }),
        { status: 401, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('Data export requested', { userId: user.id });

    // Rate limit - data export is expensive, limit to 1 per hour
    const rateLimitResult = checkRateLimit(user.id, {
      maxRequests: 1,
      windowMs: 3600000, // 1 hour
      keyPrefix: 'export',
    });
    if (!rateLimitResult.allowed) {
      log.warn('Rate limit exceeded for data export', { userId: user.id });
      return createRateLimitResponse(rateLimitResult, allHeaders);
    }

    // Fetch all user data in parallel
    const [
      voiceProfilesResult,
      meditationHistoryResult,
      conversationsResult,
      userResult,
    ] = await Promise.all([
      supabase
        .from('voice_profiles')
        .select('id, name, description, language, provider, status, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),

      supabase
        .from('meditation_history')
        .select('id, prompt, voice_name, background_track_name, duration_seconds, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),

      supabase
        .from('agent_conversations')
        .select('id, messages, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),

      supabase
        .from('users')
        .select('audio_tag_preferences, created_at')
        .eq('id', user.id)
        .single(),
    ]);

    // Build export data
    const exportData: UserDataExport = {
      exportedAt: new Date().toISOString(),
      requestId,
      user: {
        id: user.id,
        email: user.email || '',
        createdAt: userResult.data?.created_at || user.created_at || '',
      },
      voiceProfiles: (voiceProfilesResult.data || []).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        language: p.language,
        provider: p.provider,
        status: p.status,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
      meditationHistory: (meditationHistoryResult.data || []).map(h => ({
        id: h.id,
        prompt: h.prompt,
        voiceName: h.voice_name,
        backgroundTrackName: h.background_track_name,
        durationSeconds: h.duration_seconds,
        createdAt: h.created_at,
      })),
      conversations: (conversationsResult.data || []).map(c => ({
        id: c.id,
        messages: c.messages,
        createdAt: c.created_at,
      })),
      preferences: {
        audioTags: userResult.data?.audio_tag_preferences || undefined,
      },
    };

    log.info('Data export successful', {
      userId: user.id,
      voiceProfiles: exportData.voiceProfiles.length,
      meditationHistory: exportData.meditationHistory.length,
      conversations: exportData.conversations.length,
    });

    // Return as downloadable JSON
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...allHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="inrvo-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });

  } catch (error) {
    log.error('Error exporting user data', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to export data',
        requestId,
      }),
      { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
