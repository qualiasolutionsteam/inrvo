/**
 * Edge Function client for secure API calls
 * All API keys are stored server-side in Edge Functions
 * Frontend only sends JWT token for authentication
 */

import { supabase } from '../../lib/supabase';
import { VoiceMetadata } from '../../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Debug logging - only enabled in development
const DEBUG = import.meta.env?.DEV ?? false;

// Custom error type with additional properties for request tracing
interface EdgeFunctionError extends Error {
  requestId?: string;
  status?: number;
  isNetworkError?: boolean;
  needsReclone?: boolean;
}

// ============================================================================
// Auth Token Cache - Avoid fetching session on every API call
// ============================================================================

let cachedAuthToken: string | null = null;
let tokenExpiresAt: number = 0;

// Safety buffer: refresh token 30 seconds before actual expiry
const TOKEN_EXPIRY_BUFFER_MS = 30 * 1000;

/**
 * Extract expiry time from JWT token
 * Returns timestamp in milliseconds, or 0 if parsing fails
 */
function getJwtExpiry(token: string): number {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return 0;

    // Decode base64url payload (handle URL-safe characters)
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));

    if (typeof payload.exp === 'number') {
      // JWT exp is in seconds, convert to milliseconds
      return payload.exp * 1000;
    }
    return 0;
  } catch {
    if (DEBUG) console.warn('[edgeFunctions] Failed to parse JWT expiry');
    return 0;
  }
}

/**
 * Update cached token with proper expiry from JWT claims
 */
function updateCachedToken(token: string): void {
  cachedAuthToken = token;

  // Extract actual expiry from JWT, or fallback to 55 minutes from now
  const jwtExpiry = getJwtExpiry(token);
  if (jwtExpiry > 0) {
    tokenExpiresAt = jwtExpiry - TOKEN_EXPIRY_BUFFER_MS;
    if (DEBUG) console.log('[edgeFunctions] Token expires at:', new Date(jwtExpiry).toISOString());
  } else {
    // Fallback: assume 1 hour expiry, refresh 5 minutes early
    tokenExpiresAt = Date.now() + (55 * 60 * 1000);
  }
}

// Initialize auth listener to keep token cached
if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.access_token) {
      updateCachedToken(session.access_token);
    } else {
      cachedAuthToken = null;
      tokenExpiresAt = 0;
    }
  });

  // Also get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.access_token) {
      updateCachedToken(session.access_token);
    }
  });
}

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
function isRetryableError(error: unknown, status?: number): boolean {
  // Type guard for EdgeFunctionError
  const edgeError = error as EdgeFunctionError;

  // Network errors are retryable
  if (edgeError?.isNetworkError) return true;
  if (error instanceof Error && error.name === 'TypeError' && error.message === 'Failed to fetch') return true;

  // Server errors (5xx) are retryable, except 501
  if (status && status >= 500 && status !== 501) return true;

  // Rate limit errors (429) are retryable
  if (status === 429) return true;

  // Auth errors (401) are handled specially in the main flow (token refresh)
  // Other auth errors (403) and client errors (4xx) are NOT retryable
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
 * Uses cached token to avoid database round-trip on every API call
 * Returns null for anonymous users (edge functions can handle anonymous requests)
 *
 * Mobile Safari fix: Uses multiple fallback methods to ensure token is retrieved
 * even when ITP (Intelligent Tracking Prevention) affects localStorage
 */
async function getAuthToken(): Promise<string | null> {
  if (!supabase) {
    if (DEBUG) console.log('[edgeFunctions] No supabase client, returning null token');
    return null; // Allow anonymous access
  }

  // Use cached token if valid and not expired
  if (cachedAuthToken && Date.now() < tokenExpiresAt) {
    if (DEBUG) console.log('[edgeFunctions] Using cached token');
    return cachedAuthToken;
  }

  if (DEBUG) console.log('[edgeFunctions] Cache miss, fetching session...');

  // Try to get session (returns null if not authenticated)
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    if (DEBUG) console.log('[edgeFunctions] getSession error:', error.message);
  }

  if (session?.access_token) {
    // Update cache
    cachedAuthToken = session.access_token;
    tokenExpiresAt = Date.now() + (55 * 60 * 1000);
    if (DEBUG) console.log('[edgeFunctions] Got token from getSession');
    return session.access_token;
  }

  // Mobile Safari fallback: Try getUser() which forces a server-side session check
  // This helps when localStorage is cleared by ITP but the session cookie still exists
  if (DEBUG) console.log('[edgeFunctions] No session, trying getUser fallback...');

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      if (DEBUG) console.log('[edgeFunctions] getUser error:', userError.message);
    }

    if (user) {
      // User exists - try refreshing the session
      if (DEBUG) console.log('[edgeFunctions] User found, refreshing session...');
      const { data: refreshData } = await supabase.auth.refreshSession();

      if (refreshData?.session?.access_token) {
        updateCachedToken(refreshData.session.access_token);
        if (DEBUG) console.log('[edgeFunctions] Got token from refreshSession');
        return refreshData.session.access_token;
      }
    }
  } catch (e) {
    if (DEBUG) console.log('[edgeFunctions] Fallback failed:', e);
  }

  if (DEBUG) console.log('[edgeFunctions] No token available, returning null (anonymous)');
  return null; // Anonymous user
}

/**
 * Call an Edge Function with optional authentication, request tracing, and retry logic
 * Supports both authenticated and anonymous requests
 * @param functionName - The Edge Function to call
 * @param body - Request body
 * @param options - Optional settings
 * @param options.requireAuth - If true, throw immediately when no auth token is available
 */
async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
  options?: { isFormData?: boolean; timeout?: number; retry?: RetryOptions; requireAuth?: boolean }
): Promise<T> {
  const token = await getAuthToken();
  const requestId = generateRequestId();
  const retryOpts = { ...DEFAULT_RETRY_OPTIONS, ...options?.retry };

  // Fail early for functions that require auth when no token is available
  if (options?.requireAuth && !token) {
    const authError = new Error('Your session has expired. Please sign in again to continue.') as EdgeFunctionError;
    authError.requestId = requestId;
    authError.status = 401;
    throw authError;
  }

  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

  const headers: Record<string, string> = {
    'X-Request-ID': requestId,
  };

  // Add authorization header only if user is authenticated
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let requestBody: BodyInit;

  if (options?.isFormData && body instanceof FormData) {
    requestBody = body as unknown as BodyInit;
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
        const error = new Error(errorMessage) as EdgeFunctionError;
        error.requestId = requestId;
        error.status = response.status;
        error.needsReclone = data.needsReclone;

        // Special handling for 401 - Force token refresh before retry
        if (response.status === 401 && attempt < retryOpts.maxRetries) {
          if (DEBUG) console.log(`[edgeFunctions] 401 Unauthorized for ${functionName}, forcing token refresh and retrying...`);

          // Clear cache and force a real token refresh (not just getSession which returns cached token)
          cachedAuthToken = null;
          tokenExpiresAt = 0;

          // Use refreshSession() directly - getSession() returns cached (possibly expired) token
          let refreshedToken: string | null = null;
          if (supabase) {
            try {
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError) {
                if (DEBUG) console.log('[edgeFunctions] refreshSession error:', refreshError.message);
              }
              if (refreshData?.session?.access_token) {
                refreshedToken = refreshData.session.access_token;
                updateCachedToken(refreshedToken);
                if (DEBUG) console.log('[edgeFunctions] Got fresh token from refreshSession');
              }
            } catch (e) {
              if (DEBUG) console.log('[edgeFunctions] refreshSession threw:', e);
            }
          }

          if (refreshedToken) {
            headers['Authorization'] = `Bearer ${refreshedToken}`;
            const delay = calculateBackoffDelay(attempt, retryOpts.baseDelayMs, retryOpts.maxDelayMs);
            await sleep(delay);
            continue;
          } else {
            // No token available after refresh - session has expired
            const authError = new Error('Your session has expired. Please sign in again to continue.') as EdgeFunctionError;
            authError.requestId = requestId;
            authError.status = 401;
            throw authError;
          }
        }

        // Check if we should retry regular errors
        if (attempt < retryOpts.maxRetries && isRetryableError(error, response.status)) {
          lastError = error;
          const delay = calculateBackoffDelay(attempt, retryOpts.baseDelayMs, retryOpts.maxDelayMs);
          await sleep(delay);
          continue;
        }

        throw error;
      }

      return data as T;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      // Handle abort/timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error(`Request timeout after ${timeoutMs}ms`) as EdgeFunctionError;
        timeoutError.requestId = requestId;
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
      if (error instanceof Error && error.name === 'TypeError' && error.message === 'Failed to fetch') {
        const offlineError = new Error(
          navigator.onLine
            ? 'Unable to reach the server. Please check your connection and try again.'
            : 'You appear to be offline. Please check your internet connection.'
        ) as EdgeFunctionError;
        offlineError.requestId = requestId;
        offlineError.isNetworkError = true;
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
      const edgeError = error as EdgeFunctionError;
      if (!edgeError.requestId) {
        edgeError.requestId = requestId;
      }

      // Check if we should retry this error
      if (attempt < retryOpts.maxRetries && isRetryableError(error, lastStatus)) {
        lastError = error instanceof Error ? error : new Error(String(error));
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
// ElevenLabs TTS Edge Function Wrappers
// ============================================================================

/**
 * Generate speech using ElevenLabs TTS Edge Function
 * ElevenLabs is the primary (and only) TTS provider
 *
 * @param voiceId - Voice profile ID (UUID) for user clones
 * @param text - Text to synthesize
 * @param elevenLabsVoiceId - Direct ElevenLabs voice ID (for preset voices)
 */
export async function generateSpeech(
  voiceId: string | undefined,
  text: string,
  elevenLabsVoiceId?: string
): Promise<string> {
  const response = await callEdgeFunction<{
    success: boolean;
    audioBase64: string;
    format: string;
    needsReclone?: boolean;
  }>('generate-speech', {
    voiceId,
    text,
    elevenLabsVoiceId,
  }, {
    timeout: 120000, // 120s - long meditations take time
    requireAuth: true, // TTS requires authentication to prevent API cost abuse
    retry: {
      maxRetries: 1, // Single retry for TTS
      baseDelayMs: 2000,
      maxDelayMs: 5000,
    },
  });

  if (response.needsReclone) {
    const error = new Error('This voice needs to be re-cloned with ElevenLabs.') as EdgeFunctionError;
    error.needsReclone = true;
    throw error;
  }

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

  if (DEBUG) console.log('[blobToBase64] WAV validated, size:', bytes.length, 'type:', blob.type);

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
// ElevenLabs Voice Cloning Edge Function Wrappers
// ============================================================================

export interface ElevenLabsCloneResponse {
  voiceProfileId: string;
  elevenLabsVoiceId: string;
  voiceSampleUrl: string | null;
}

/**
 * Clone a voice using ElevenLabs Instant Voice Cloning (IVC)
 * Primary and only voice cloning provider
 *
 * @param audioBlob - WAV audio blob of voice sample
 * @param name - Name for the voice clone
 * @param description - Optional description
 * @param metadata - Optional voice metadata (language, accent, etc.)
 * @param removeBackgroundNoise - Remove background noise (default: true)
 */
export async function elevenLabsCloneVoice(
  audioBlob: Blob,
  name: string,
  description?: string,
  metadata?: VoiceMetadata,
  removeBackgroundNoise: boolean = true
): Promise<ElevenLabsCloneResponse> {
  const base64Audio = await blobToBase64(audioBlob);

  const data = await callEdgeFunction<{
    success: boolean;
    voiceProfileId: string;
    elevenLabsVoiceId: string;
    voiceSampleUrl: string | null;
    error?: string;
  }>('elevenlabs-clone', {
    audioBase64: base64Audio,
    voiceName: name,
    description: description || 'Voice clone created with Innrvo',
    metadata: metadata || undefined,
    removeBackgroundNoise,
  }, {
    timeout: 90000, // 90 seconds for voice cloning
    requireAuth: true, // Voice cloning requires authentication to prevent API cost abuse
    retry: {
      maxRetries: 2,    // 2 retries for expensive operations
      baseDelayMs: 1000, // 1 second base delay
      maxDelayMs: 8000,  // 8 second max delay
    },
  });

  if (!data.voiceProfileId || !data.elevenLabsVoiceId) {
    throw new Error('Voice cloning failed: No voice IDs returned');
  }

  return {
    voiceProfileId: data.voiceProfileId,
    elevenLabsVoiceId: data.elevenLabsVoiceId,
    voiceSampleUrl: data.voiceSampleUrl || null,
  };
}

// ============================================================================
// Gemini Script Generation
// ============================================================================

export interface GeminiScriptResponse {
  script: string;
}

/**
 * Generate meditation script using Gemini via Edge Function
 * API key is stored server-side
 * @param thought - The meditation prompt/idea
 * @param audioTags - Optional audio cues to incorporate
 * @param durationMinutes - Target duration in minutes (default: 5)
 * @param contentCategory - Content type (meditation, story, affirmation, etc.)
 * @param targetAgeGroup - For stories: 'toddler' (2-4) or 'young_child' (5-8)
 */
export async function geminiGenerateScript(
  thought: string,
  audioTags?: string[],
  durationMinutes?: number,
  contentCategory?: string,
  targetAgeGroup?: string
): Promise<string> {
  const response = await callEdgeFunction<GeminiScriptResponse>('gemini-script', {
    thought,
    audioTags,
    operation: 'generate',
    durationMinutes: durationMinutes || 5,
    contentCategory,
    targetAgeGroup,
  }, {
    requireAuth: true, // AI endpoints require authentication to prevent API cost abuse
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
  }, {
    requireAuth: true, // AI endpoints require authentication to prevent API cost abuse
  });

  return response.script;
}

/**
 * Harmonize a meditation script by intelligently adding audio tags
 * Uses Gemini to analyze the script and insert [pause], [deep breath], etc.
 * @param script - The meditation script to harmonize
 */
export async function geminiHarmonizeScript(
  script: string
): Promise<string> {
  const response = await callEdgeFunction<GeminiScriptResponse>('gemini-script', {
    thought: '', // Not used for harmonize operation
    existingScript: script,
    operation: 'harmonize',
  }, {
    requireAuth: true, // AI endpoints require authentication to prevent API cost abuse
  });

  return response.script;
}

// ============================================================================
// Gemini Chat (Conversational AI)
// ============================================================================

export interface GeminiChatResponse {
  message: string;
}

/**
 * Chat with Gemini for conversational AI responses
 * Unlike geminiGenerateScript, this respects the agent's system prompt
 * and returns natural conversational responses (not meditation scripts)
 *
 * @param prompt - User message and context (without system instructions)
 * @param options - Optional settings for temperature, max tokens, and system prompt
 */
export async function geminiChat(
  prompt: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;  // System instructions sent as proper Gemini parameter
    includeContext?: boolean;  // Whether to include user context for personalization (default: true)
  }
): Promise<string> {
  const response = await callEdgeFunction<GeminiChatResponse>('gemini-chat', {
    prompt,
    systemPrompt: options?.systemPrompt,
    maxTokens: options?.maxTokens ?? 500,
    temperature: options?.temperature ?? 0.8,
    includeContext: options?.includeContext ?? true,
  }, {
    requireAuth: true, // AI endpoints require authentication to prevent API cost abuse
  });

  return response.message;
}

// ============================================================================
// Feature flags for gradual migration
// ============================================================================

/**
 * Check if Edge Functions are available
 * Edge Functions now support both authenticated and anonymous users
 */
export async function isEdgeFunctionAvailable(): Promise<boolean> {
  // Edge functions are available if Supabase is configured
  // They now support anonymous access with IP-based rate limiting
  return !!supabase && !!SUPABASE_URL;
}

// ============================================================================
// RAG Service Functions (Personalization)
// ============================================================================

interface RAGResponse {
  requestId: string;
  error?: string;
}

interface UserContextResponse extends RAGResponse {
  context: {
    display_name: string | null;
    first_name: string | null;
    preferences: Record<string, unknown> | null;
    recent_memories: Array<{
      type: string;
      content: string;
      importance: number;
    }> | null;
    meditation_count: number;
    favorite_content_types: string[] | null;
    recentMeditations: Array<{
      prompt: string;
      content_category: string;
      content_sub_type: string;
      meditation_type: string;
      created_at: string;
    }>;
  };
}

interface StoreMemoryResponse extends RAGResponse {
  memoryId: string;
}

/**
 * Get user context for personalization
 * Retrieves user profile, preferences, and recent memories
 */
export async function getUserContext(): Promise<UserContextResponse['context'] | null> {
  try {
    const response = await callEdgeFunction<UserContextResponse>('rag-service', {
      operation: 'get_context',
    });
    return response.context;
  } catch (error) {
    console.error('Error fetching user context:', error);
    return null;
  }
}

/**
 * Store a memory about the user for future personalization
 * Fire-and-forget: doesn't block the UI
 */
export function storeUserMemory(
  memoryType: 'preference' | 'fact' | 'goal' | 'emotion' | 'feedback',
  content: string,
  options?: {
    context?: string;
    importance?: number;
    expiresDays?: number;
  }
): void {
  // Fire-and-forget - don't await
  callEdgeFunction<StoreMemoryResponse>('rag-service', {
    operation: 'store_memory',
    memoryType,
    content,
    context: options?.context,
    importance: options?.importance ?? 5,
    expiresDays: options?.expiresDays,
  }).catch(error => {
    // Log but don't throw - this is fire-and-forget
    console.warn('Failed to store user memory:', error);
  });
}

