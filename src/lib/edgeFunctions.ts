/**
 * Edge Function client for secure API calls
 * All API keys are stored server-side in Edge Functions
 * Frontend only sends JWT token for authentication
 */

import { supabase } from '../../lib/supabase';
import { VoiceMetadata } from '../../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ============================================================================
// Request ID generation for distributed tracing
// ============================================================================

/**
 * Generate a unique request ID for tracing requests across frontend and backend
 * Format: timestamp-randomhex (e.g., "1703347200000-a1b2c3d4")
 */
function generateRequestId(): string {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(16).slice(2, 10);
  return `${timestamp}-${randomPart}`;
}

// ============================================================================
// Retry logic with exponential backoff
// ============================================================================

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
};

/**
 * Check if an error is retryable (network issues, server errors)
 */
function isRetryableError(error: any, status?: number): boolean {
  // Network errors are retryable
  if (error?.isNetworkError) return true;
  if (error?.name === 'TypeError' && error?.message === 'Failed to fetch') return true;

  // Server errors (5xx) are retryable, except 501
  if (status && status >= 500 && status !== 501) return true;

  // Rate limit errors (429) are retryable
  if (status === 429) return true;

  // Auth errors (401, 403) and client errors (4xx) are NOT retryable
  return false;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  // Exponential backoff: base * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  // Add jitter (random 0-25% of delay)
  const jitter = Math.random() * 0.25 * exponentialDelay;
  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

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
 * Call an Edge Function with authentication, request tracing, and retry logic
 */
async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, any>,
  options?: { isFormData?: boolean; timeout?: number; retry?: RetryOptions }
): Promise<T> {
  const token = await getAuthToken();
  const requestId = generateRequestId();
  const retryOpts = { ...DEFAULT_RETRY_OPTIONS, ...options?.retry };

  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'X-Request-ID': requestId,
  };

  let requestBody: BodyInit;

  if (options?.isFormData && body instanceof FormData) {
    requestBody = body;
    // Don't set Content-Type for FormData - browser sets it with boundary
  } else {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const timeoutMs = options?.timeout || 60000;
  let lastError: Error | null = null;
  let lastStatus: number | undefined;

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= retryOpts.maxRetries; attempt++) {
    // Add timeout with AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      lastStatus = response.status;

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || `Edge function error: ${response.status}`;
        const error = new Error(errorMessage);
        (error as any).requestId = requestId;
        (error as any).status = response.status;

        // Check if we should retry
        if (attempt < retryOpts.maxRetries && isRetryableError(error, response.status)) {
          lastError = error;
          const delay = calculateBackoffDelay(attempt, retryOpts.baseDelayMs, retryOpts.maxDelayMs);
          await sleep(delay);
          continue;
        }

        throw error;
      }

      return data as T;
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Handle abort/timeout errors
      if (error.name === 'AbortError') {
        const timeoutError = new Error(`Request timeout after ${timeoutMs}ms`);
        (timeoutError as any).requestId = requestId;
        lastError = timeoutError;

        // Retry on timeout
        if (attempt < retryOpts.maxRetries) {
          const delay = calculateBackoffDelay(attempt, retryOpts.baseDelayMs, retryOpts.maxDelayMs);
          await sleep(delay);
          continue;
        }

        throw timeoutError;
      }

      // Handle network/offline errors with user-friendly message
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        const offlineError = new Error(
          navigator.onLine
            ? 'Unable to reach the server. Please check your connection and try again.'
            : 'You appear to be offline. Please check your internet connection.'
        );
        (offlineError as any).requestId = requestId;
        (offlineError as any).isNetworkError = true;
        lastError = offlineError;

        // Retry on network errors
        if (attempt < retryOpts.maxRetries && navigator.onLine) {
          const delay = calculateBackoffDelay(attempt, retryOpts.baseDelayMs, retryOpts.maxDelayMs);
          await sleep(delay);
          continue;
        }

        throw offlineError;
      }

      // Preserve request ID on other errors
      if (!error.requestId) {
        error.requestId = requestId;
      }

      // Check if we should retry this error
      if (attempt < retryOpts.maxRetries && isRetryableError(error, lastStatus)) {
        lastError = error;
        const delay = calculateBackoffDelay(attempt, retryOpts.baseDelayMs, retryOpts.maxDelayMs);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  // Should never reach here, but throw last error if we do
  throw lastError || new Error('Unknown error in retry loop');
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
 */
export async function elevenLabsTTS(
  voiceId: string,
  text: string,
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  }
): Promise<string> {
  // Default settings optimized for meditative, calm delivery
  const response = await callEdgeFunction<ElevenLabsTTSResponse>('elevenlabs-tts', {
    voiceId,
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: voiceSettings || {
      stability: 0.75,           // Higher = calmer, more consistent
      similarity_boost: 0.7,
      style: 0.15,               // Low style = more soothing
      use_speaker_boost: true,
    },
  });

  return response.audio;
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
