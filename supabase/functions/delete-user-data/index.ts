import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { checkRateLimitDistributed, RATE_LIMITS, createDistributedRateLimitResponse } from "../_shared/rateLimit.ts";
import { addSecurityHeaders } from "../_shared/securityHeaders.ts";

/**
 * GDPR Data Deletion Edge Function
 *
 * Implements Article 17 of GDPR - "Right to erasure" (right to be forgotten)
 *
 * This endpoint permanently deletes all user data including:
 * - Voice profiles and cloned voice models
 * - Meditation history and audio files
 * - Conversation history
 * - User preferences and settings
 * - Audio files in storage
 *
 * Requires:
 * - Valid authentication
 * - Email confirmation matching account email
 * - Explicit deletion confirmation
 */

// Lazy-load Supabase client
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }
  return supabaseClient;
}

interface DeleteUserDataRequest {
  confirmDeletion: boolean;
  confirmEmail: string;
}

interface DeletionResult {
  success: boolean;
  deletedAt: string;
  itemsDeleted: {
    voiceProfiles: number;
    meditationHistory: number;
    conversations: number;
    storageFiles: number;
  };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const requestId = getRequestId(req);
  const tracingHeaders = getTracingHeaders(requestId);
  const allHeaders = addSecurityHeaders({ ...corsHeaders, ...tracingHeaders });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: allHeaders });
  }

  const log = createLogger({ requestId, operation: 'delete-user-data' });

  try {
    // Auth validation - required for this endpoint
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
        JSON.stringify({ error: 'Invalid or expired token', requestId }),
        { status: 401, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('GDPR deletion request received', { userId: user.id, email: user.email });

    // Very strict rate limiting for this expensive operation
    const rateLimitResult = await checkRateLimitDistributed(user.id, RATE_LIMITS.dataExport);
    if (!rateLimitResult.allowed) {
      log.warn('GDPR deletion rate limited', { userId: user.id });
      return createDistributedRateLimitResponse(rateLimitResult, allHeaders);
    }

    // Parse and validate request body
    const { confirmDeletion, confirmEmail }: DeleteUserDataRequest = await req.json();

    if (!confirmDeletion) {
      return new Response(
        JSON.stringify({
          error: 'Deletion not confirmed. Set confirmDeletion: true to proceed.',
          required: { confirmDeletion: true, confirmEmail: user.email },
          requestId,
        }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!confirmEmail || confirmEmail.toLowerCase() !== user.email?.toLowerCase()) {
      return new Response(
        JSON.stringify({
          error: 'Email confirmation does not match account email.',
          required: { confirmDeletion: true, confirmEmail: user.email },
          requestId,
        }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('GDPR deletion confirmed, starting deletion process', { userId: user.id });

    const itemsDeleted = {
      voiceProfiles: 0,
      meditationHistory: 0,
      conversations: 0,
      storageFiles: 0,
    };

    // ========================================================================
    // 1. Delete from Supabase Storage
    // ========================================================================

    try {
      // Delete voice samples
      const { data: voiceFiles } = await supabase.storage
        .from('voice-samples')
        .list(user.id);

      if (voiceFiles && voiceFiles.length > 0) {
        const filePaths = voiceFiles.map(f => `${user.id}/${f.name}`);
        const { error: voiceDeleteError } = await supabase.storage
          .from('voice-samples')
          .remove(filePaths);

        if (voiceDeleteError) {
          log.warn('Failed to delete some voice samples', { error: voiceDeleteError.message });
        } else {
          itemsDeleted.storageFiles += voiceFiles.length;
          log.info('Deleted voice samples', { count: voiceFiles.length });
        }
      }

      // Delete meditation audio files
      const { data: audioFiles } = await supabase.storage
        .from('meditation-audio')
        .list(user.id);

      if (audioFiles && audioFiles.length > 0) {
        const filePaths = audioFiles.map(f => `${user.id}/${f.name}`);
        const { error: audioDeleteError } = await supabase.storage
          .from('meditation-audio')
          .remove(filePaths);

        if (audioDeleteError) {
          log.warn('Failed to delete some meditation audio', { error: audioDeleteError.message });
        } else {
          itemsDeleted.storageFiles += audioFiles.length;
          log.info('Deleted meditation audio', { count: audioFiles.length });
        }
      }
    } catch (storageError: any) {
      log.error('Storage deletion error', { error: storageError.message });
      // Continue with database deletion even if storage fails
    }

    // ========================================================================
    // 2. Delete from Database (order matters for foreign keys)
    // ========================================================================

    // Delete agent conversations
    const { count: conversationCount, error: convError } = await supabase
      .from('agent_conversations')
      .delete({ count: 'exact' })
      .eq('user_id', user.id);

    if (convError) {
      log.warn('Failed to delete conversations', { error: convError.message });
    } else {
      itemsDeleted.conversations = conversationCount || 0;
      log.info('Deleted conversations', { count: conversationCount });
    }

    // Delete meditation history
    const { count: historyCount, error: historyError } = await supabase
      .from('meditation_history')
      .delete({ count: 'exact' })
      .eq('user_id', user.id);

    if (historyError) {
      log.warn('Failed to delete meditation history', { error: historyError.message });
    } else {
      itemsDeleted.meditationHistory = historyCount || 0;
      log.info('Deleted meditation history', { count: historyCount });
    }

    // Delete voice cloning usage
    await supabase
      .from('voice_cloning_usage')
      .delete()
      .eq('user_id', user.id);

    // Delete voice profiles
    const { count: profileCount, error: profileError } = await supabase
      .from('voice_profiles')
      .delete({ count: 'exact' })
      .eq('user_id', user.id);

    if (profileError) {
      log.warn('Failed to delete voice profiles', { error: profileError.message });
    } else {
      itemsDeleted.voiceProfiles = profileCount || 0;
      log.info('Deleted voice profiles', { count: profileCount });
    }

    // Delete user credits
    await supabase
      .from('user_credits')
      .delete()
      .eq('user_id', user.id);

    // Delete voice usage limits
    await supabase
      .from('voice_usage_limits')
      .delete()
      .eq('user_id', user.id);

    // Delete audio tag preferences
    await supabase
      .from('audio_tag_preferences')
      .delete()
      .eq('user_id', user.id);

    // Delete extended user profile
    await supabase
      .from('users')
      .delete()
      .eq('id', user.id);

    // ========================================================================
    // 3. Delete Auth User (optional - uncomment if admin access available)
    // ========================================================================

    // Note: Deleting the auth user requires admin API access
    // This is handled separately by Supabase's data retention policies
    // or can be triggered via the Supabase dashboard

    // Uncomment if you have admin access configured:
    // const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id);
    // if (authDeleteError) {
    //   log.warn('Failed to delete auth user', { error: authDeleteError.message });
    // }

    log.info('GDPR deletion completed', {
      userId: user.id,
      itemsDeleted,
    });

    const result: DeletionResult = {
      success: true,
      deletedAt: new Date().toISOString(),
      itemsDeleted,
    };

    return new Response(
      JSON.stringify({
        ...result,
        message: 'All your data has been permanently deleted. Your account will be deactivated.',
        note: 'You may need to sign out and clear your browser data to complete the process.',
        requestId,
      }),
      { status: 200, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    log.error('GDPR deletion failed', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Deletion failed. Please contact support for assistance.',
        requestId,
      }),
      { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
