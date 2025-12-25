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
// TTS Edge Function Wrappers (Chatterbox via Replicate)
// ============================================================================

/**
 * Generate speech using Chatterbox via Replicate Edge Function
 * API key is stored server-side
 */
export async function generateSpeech(
  voiceId: string,
  text: string,
  voiceSettings?: {
    exaggeration?: number;  // 0-1, emotion exaggeration
    cfgWeight?: number;     // 0-1, quality weight
  }
): Promise<string> {
  // Settings optimized for natural, high-quality voice cloning
  const response = await callEdgeFunction<{ success: boolean; audioBase64: string }>('generate-speech', {
    voiceId,
    text,
    voiceSettings: voiceSettings || {
      exaggeration: 0.5,  // Neutral for natural voice (0.3 was too flat)
      cfgWeight: 0.7,     // Higher for better quality (0.5 was lower quality)
    },
  });

  return response.audioBase64;
}

/**
 * Helper to convert Blob to base64 with WAV validation
 */
async function blobToBase64(blob: Blob): Promise<string> {
  // First validate the blob contains valid WAV data
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  if (bytes.length < 44) {
    console.error('[blobToBase64] Blob too small for WAV:', bytes.length);
    throw new Error('Audio data too small to be valid WAV');
  }

  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const wave = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);

  if (riff !== 'RIFF' || wave !== 'WAVE') {
    console.error('[blobToBase64] Invalid WAV format detected:', { riff, wave, blobType: blob.type, size: bytes.length });
    throw new Error(`Audio is not WAV format (detected: ${riff === 'RIFF' ? 'RIFF' : riff})`);
  }

  console.log('[blobToBase64] WAV validated, size:', bytes.length, 'type:', blob.type);

  // Convert to base64 using chunked approach to avoid call stack issues
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

// ============================================================================
// Gemini Script Generation (TTS removed - not implemented)
// ============================================================================

export interface GeminiScriptResponse {
  script: string;
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
// Chatterbox Edge Function Wrappers (via Replicate)
// ============================================================================

export interface ChatterboxTTSResponse {
  audioBase64: string;
  format: string;
}

export interface ChatterboxCloneResponse {
  voiceProfileId: string;
  voiceSampleUrl: string;
}

/**
 * Generate speech using Chatterbox via Replicate Edge Function
 * Much cheaper than ElevenLabs (~$0.03/run vs ~$0.30/1000 chars)
 */
export async function chatterboxTTS(
  voiceId: string,
  text: string,
  options?: {
    exaggeration?: number;  // 0-1, emotion exaggeration
    cfgWeight?: number;     // 0-1, quality weight
  }
): Promise<string> {
  const response = await callEdgeFunction<{ success: boolean; audioBase64: string; format: string }>('chatterbox-tts', {
    voiceId,
    text,
    exaggeration: options?.exaggeration ?? 0.5,
    cfgWeight: options?.cfgWeight ?? 0.5,
  });

  return response.audioBase64;
}

/**
 * Clone a voice using Chatterbox via Replicate Edge Function
 * Zero-shot cloning - just uploads audio sample, used at TTS time
 */
export async function chatterboxCloneVoice(
  audioBlob: Blob,
  name: string,
  description?: string,
  metadata?: VoiceMetadata
): Promise<ChatterboxCloneResponse> {
  const token = await getAuthToken();
  const base64Audio = await blobToBase64(audioBlob);

  const url = `${SUPABASE_URL}/functions/v1/chatterbox-clone`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audioBase64: base64Audio,
      voiceName: name,
      description: description || 'Voice clone created with Chatterbox',
      metadata: metadata || undefined,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Voice cloning failed: ${response.status}`);
  }

  if (!data.voiceProfileId) {
    throw new Error('No voice profile ID returned from cloning service');
  }

  return {
    voiceProfileId: data.voiceProfileId,
    voiceSampleUrl: data.voiceSampleUrl,
  };
}

// ============================================================================
// Fish Audio Edge Function Wrappers (Primary Provider)
// ============================================================================

export interface FishAudioTTSResponse {
  audioBase64: string;
  format: string;
  usedFallback?: boolean;
}

export interface FishAudioCloneResponse {
  voiceProfileId: string;
  fishAudioModelId: string | null;
  voiceSampleUrl: string | null;
}

/**
 * Generate speech using Fish Audio (with automatic Chatterbox fallback)
 * Fish Audio is the primary provider - best quality, real-time API
 */
export async function fishAudioTTS(
  voiceId: string,
  text: string,
  options?: {
    speed?: number;
    temperature?: number;
    format?: 'mp3' | 'wav' | 'opus';
  }
): Promise<FishAudioTTSResponse> {
  const response = await callEdgeFunction<{
    success: boolean;
    audioBase64: string;
    format: string;
    usedFallback?: boolean;
  }>('fish-audio-tts', {
    voiceId,
    text,
    options,
  }, { timeout: 60000 });

  return {
    audioBase64: response.audioBase64,
    format: response.format,
    usedFallback: response.usedFallback || false,
  };
}

/**
 * Clone a voice using Fish Audio (with Chatterbox storage for fallback)
 * Creates both a Fish Audio model and stores sample for Chatterbox backup
 */
export async function fishAudioCloneVoice(
  audioBlob: Blob,
  name: string,
  description?: string,
  metadata?: VoiceMetadata
): Promise<FishAudioCloneResponse> {
  const token = await getAuthToken();
  const base64Audio = await blobToBase64(audioBlob);

  const url = `${SUPABASE_URL}/functions/v1/fish-audio-clone`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audioBase64: base64Audio,
      voiceName: name,
      description: description || 'Voice clone created with INrVO',
      metadata: metadata || undefined,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Voice cloning failed: ${response.status}`);
  }

  if (!data.voiceProfileId) {
    throw new Error('No voice profile ID returned from cloning service');
  }

  return {
    voiceProfileId: data.voiceProfileId,
    fishAudioModelId: data.fishAudioModelId || null,
    voiceSampleUrl: data.voiceSampleUrl || null,
  };
}

/**
 * Smart TTS that uses the unified generate-speech endpoint
 * Automatically routes to Fish Audio (primary) or Chatterbox (fallback)
 */
export async function generateSpeechWithFallback(
  voiceId: string,
  text: string,
  voiceSettings?: {
    exaggeration?: number;
    cfgWeight?: number;
  }
): Promise<{ audioBase64: string; format: string }> {
  // Use the unified generate-speech endpoint which handles provider selection
  const audioBase64 = await generateSpeech(voiceId, text, voiceSettings);
  return {
    audioBase64,
    format: 'audio/mpeg', // Default format
  };
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
