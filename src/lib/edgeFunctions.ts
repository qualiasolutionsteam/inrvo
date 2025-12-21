/**
 * Edge Function client for secure API calls
 * All API keys are stored server-side in Edge Functions
 * Frontend only sends JWT token for authentication
 */

import { supabase } from '../../lib/supabase';
import { VoiceMetadata } from '../../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Get the current session token for authenticated requests
 */
async function getAuthToken(): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('Not authenticated. Please sign in.');
  }

  return session.access_token;
}

/**
 * Call an Edge Function with authentication
 */
async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, any>,
  options?: { isFormData?: boolean }
): Promise<T> {
  const token = await getAuthToken();

  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };

  let requestBody: BodyInit;

  if (options?.isFormData && body instanceof FormData) {
    requestBody = body;
    // Don't set Content-Type for FormData - browser sets it with boundary
  } else {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: requestBody,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Edge function error: ${response.status}`);
  }

  return data as T;
}

// ============================================================================
// ElevenLabs Edge Function Wrappers
// ============================================================================

export interface ElevenLabsTTSResponse {
  audio: string; // base64 encoded MP3
  format: string;
}

export interface ElevenLabsCloneResponse {
  voice_id: string;
}

/**
 * Generate speech using ElevenLabs via Edge Function
 * API key is stored server-side
 * @param voiceProfileId - Database voice profile ID (not ElevenLabs voice ID)
 * @param text - Text to synthesize
 * @param voiceSettings - Optional voice settings for TTS
 */
export async function elevenLabsTTS(
  voiceProfileId: string,
  text: string,
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  }
): Promise<string> {
  // Call generate-speech edge function with database profile ID
  // The edge function looks up the ElevenLabs voice ID from the database
  const response = await callEdgeFunction<{ success: boolean; audioBase64: string }>('generate-speech', {
    voiceId: voiceProfileId,  // Database profile ID, NOT ElevenLabs ID
    text,
    voiceSettings: voiceSettings || {
      stability: 0.75,           // Higher = calmer, more consistent
      similarity_boost: 0.7,
      style: 0.15,               // Low style = more soothing
      use_speaker_boost: true,
    },
  });

  return response.audioBase64;
}

/**
 * Clone a voice using ElevenLabs via Edge Function
 * API key is stored server-side
 * Now supports metadata for improved voice accuracy
 */
export interface CloneVoiceResult {
  elevenlabsVoiceId: string;
  voiceProfileId: string;
}

export async function elevenLabsCloneVoice(
  audioBlob: Blob,
  name: string,
  description?: string,
  metadata?: VoiceMetadata
): Promise<CloneVoiceResult> {
  const token = await getAuthToken();

  // Convert blob to base64 for JSON body (process-voice uses JSON, not FormData)
  const base64Audio = await blobToBase64(audioBlob);

  const url = `${SUPABASE_URL}/functions/v1/process-voice`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audioBase64: base64Audio,
      voiceName: name,
      description: description || 'Meditation voice clone created with INrVO',
      metadata: metadata || undefined,
      removeBackgroundNoise: metadata?.hasBackgroundNoise || false,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Voice cloning failed: ${response.status}`);
  }

  if (!data.elevenlabsVoiceId) {
    throw new Error('No voice_id returned from cloning service');
  }

  return {
    elevenlabsVoiceId: data.elevenlabsVoiceId,
    voiceProfileId: data.voiceProfileId,
  };
}

/**
 * Helper to convert Blob to base64
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Delete a voice from ElevenLabs via Edge Function
 * API key is stored server-side
 */
export async function elevenLabsDeleteVoice(voiceId: string): Promise<void> {
  await callEdgeFunction<{ success: boolean }>('elevenlabs-voice-ops', {
    operation: 'delete',
    voiceId,
  });
}

/**
 * Get voice status from ElevenLabs via Edge Function
 * API key is stored server-side
 * @returns 'ready' if voice exists, 'deleted' if not found
 */
export async function elevenLabsGetVoiceStatus(voiceId: string): Promise<string> {
  const response = await callEdgeFunction<{ success: boolean; status: string }>('elevenlabs-voice-ops', {
    operation: 'status',
    voiceId,
  });
  return response.status;
}

// ============================================================================
// Gemini Edge Function Wrappers
// ============================================================================

export interface GeminiTTSResponse {
  audio: string; // base64 encoded PCM
  format: string;
}

export interface GeminiScriptResponse {
  script: string;
}

/**
 * Generate speech using Gemini TTS via Edge Function
 * API key is stored server-side
 */
export async function geminiTTS(
  text: string,
  voiceName: string = 'Zephyr'
): Promise<string> {
  const response = await callEdgeFunction<GeminiTTSResponse>('gemini-tts', {
    text,
    voiceName,
  });

  return response.audio;
}

/**
 * Generate meditation script using Gemini via Edge Function
 * API key is stored server-side
 */
export async function geminiGenerateScript(
  thought: string,
  audioTags?: string[]
): Promise<string> {
  const response = await callEdgeFunction<GeminiScriptResponse>('gemini-script', {
    thought,
    audioTags,
    operation: 'generate',
  });

  return response.script;
}

/**
 * Extend an existing meditation script into a longer version using Gemini via Edge Function
 * API key is stored server-side
 */
export async function geminiExtendScript(
  existingScript: string
): Promise<string> {
  const response = await callEdgeFunction<GeminiScriptResponse>('gemini-script', {
    thought: '', // Not used for extend operation
    existingScript,
    operation: 'extend',
  });

  return response.script;
}

// ============================================================================
// Feature flags for gradual migration
// ============================================================================

/**
 * Check if Edge Functions are available and user is authenticated
 * Used to gracefully fall back to direct API calls if needed
 */
export async function isEdgeFunctionAvailable(): Promise<boolean> {
  try {
    if (!supabase) return false;
    const { data: { session } } = await supabase.auth.getSession();
    return !!session?.access_token;
  } catch {
    return false;
  }
}
