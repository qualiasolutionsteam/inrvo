import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { addSecurityHeaders } from "../_shared/securityHeaders.ts";
// Removed arrayBufferToBase64 import - not needed, we use blob storage directly

/**
 * Import audio from ElevenLabs history into Innrvo
 *
 * Use case: When TTS generation times out but ElevenLabs still generated the audio,
 * this function can recover that audio and save it to the user's meditation history.
 */

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

interface ImportRequest {
  historyItemId: string;
  prompt?: string;
  title?: string;
  adminUserId?: string; // For service role calls to specify target user
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

  const log = createLogger({ requestId, operation: 'import-elevenlabs-history' });

  try {
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured', requestId }),
        { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { historyItemId, prompt, title, adminUserId }: ImportRequest = await req.json();

    // Determine user ID - either from auth token or admin override
    let userId: string;

    const authHeader = req.headers.get('Authorization');

    // Admin mode - directly specify user ID (for recovery operations)
    if (adminUserId) {
      // Verify user exists in auth.users
      const { data: adminUser, error: adminError } = await supabase.auth.admin.getUserById(adminUserId);

      if (adminError || !adminUser) {
        return new Response(
          JSON.stringify({ error: 'User not found', requestId }),
          { status: 404, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = adminUserId;
      log.info('Admin mode: importing for user', { userId });
    } else if (authHeader) {
      // Normal user auth
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token', requestId }),
          { status: 401, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = user.id;
    } else {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header', requestId }),
        { status: 401, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!historyItemId) {
      return new Response(
        JSON.stringify({ error: 'Missing historyItemId', requestId }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('Fetching history item from ElevenLabs', { historyItemId, userId: userId });

    // 1. Get history item metadata
    const metadataResponse = await fetch(
      `https://api.elevenlabs.io/v1/history/${historyItemId}`,
      {
        headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      }
    );

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text();
      log.error('Failed to fetch history metadata', { status: metadataResponse.status, error: errorText });
      return new Response(
        JSON.stringify({ error: `History item not found: ${errorText}`, requestId }),
        { status: 404, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metadata = await metadataResponse.json();
    log.info('Got history metadata', {
      text: metadata.text?.slice(0, 100),
      voiceId: metadata.voice_id,
      voiceName: metadata.voice_name,
    });

    // 2. Download the audio
    const audioResponse = await fetch(
      `https://api.elevenlabs.io/v1/history/${historyItemId}/audio`,
      {
        headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      }
    );

    if (!audioResponse.ok) {
      const errorText = await audioResponse.text();
      log.error('Failed to fetch audio', { status: audioResponse.status, error: errorText });
      return new Response(
        JSON.stringify({ error: `Failed to download audio: ${errorText}`, requestId }),
        { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stream audio directly to storage to avoid memory issues with large files
    const audioBlob = await audioResponse.blob();
    const audioSize = audioBlob.size;

    log.info('Downloaded audio', { size: audioSize });

    // 3. Upload to Supabase storage (streaming)
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}_imported.mp3`;

    const { error: uploadError } = await supabase.storage
      .from('meditation-audio')
      .upload(fileName, audioBlob, {
        contentType: 'audio/mpeg',
        upsert: false
      });

    let audioUrl: string | null = null;
    if (uploadError) {
      log.warn('Storage upload failed, continuing without URL', { error: uploadError.message });
    } else {
      const { data: publicUrlData } = supabase.storage
        .from('meditation-audio')
        .getPublicUrl(fileName);
      audioUrl = publicUrlData.publicUrl;
    }

    // 4. Create meditation history entry (no base64 to save memory)
    const meditationTitle = title || prompt?.slice(0, 50) || `Imported meditation (${metadata.voice_name})`;
    const meditationPrompt = prompt || metadata.text?.slice(0, 200) || 'Imported from ElevenLabs';

    // Estimate duration: MP3 at 128kbps = 16000 bytes per second
    const durationSeconds = Math.round(audioSize / 16000);

    const { data: historyEntry, error: historyError } = await supabase
      .from('meditation_history')
      .insert({
        user_id: userId,
        prompt: meditationPrompt,
        title: meditationTitle,
        enhanced_script: metadata.text,
        audio_url: audioUrl,
        // Skip audio_base64 to reduce memory usage for long meditations
        duration_seconds: durationSeconds,
        is_favorite: false,
        category: 'meditation',
      })
      .select('id, title')
      .single();

    if (historyError) {
      log.error('Failed to create history entry', { error: historyError.message });
      return new Response(
        JSON.stringify({ error: `Failed to save: ${historyError.message}`, requestId }),
        { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('Import successful', { historyId: historyEntry.id });

    return new Response(
      JSON.stringify({
        success: true,
        historyId: historyEntry.id,
        title: historyEntry.title,
        audioUrl,
        requestId,
      }),
      { status: 200, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Import failed', error instanceof Error ? error : new Error(String(error)));

    return new Response(
      JSON.stringify({ error: errorMessage, requestId }),
      { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
