/**
 * Simple in-memory rate limiting for Edge Functions
 * Uses a sliding window algorithm
 *
 * Note: For production at scale, use a distributed store (Redis, KV, etc.)
 * This implementation works for single-instance Edge Functions
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// In-memory store (reset on cold start)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanup(windowMs: number): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  const expiredBefore = now - windowMs;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.windowStart < expiredBefore) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Key prefix for namespacing (e.g., 'auth', 'tts') */
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}

/**
 * Check if a request is allowed under the rate limit
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { maxRequests, windowMs, keyPrefix = '' } = config;
  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();

  // Cleanup old entries
  cleanup(windowMs);

  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    // New window
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  if (entry.count >= maxRequests) {
    // Rate limited
    const resetAt = entry.windowStart + windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterMs: resetAt - now,
    };
  }

  // Increment counter
  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.windowStart + windowMs,
  };
}

/**
 * Create a rate-limited response with proper headers
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };

  if (!result.allowed) {
    headers['Retry-After'] = String(Math.ceil((result.retryAfterMs || 0) / 1000));
  }

  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfterMs: result.retryAfterMs,
    }),
    {
      status: 429,
      headers,
    }
  );
}

// Default rate limit configurations
export const RATE_LIMITS = {
  /** Voice cloning - expensive operation */
  voiceClone: { maxRequests: 3, windowMs: 60000, keyPrefix: 'clone' },
  /** TTS generation */
  tts: { maxRequests: 20, windowMs: 60000, keyPrefix: 'tts' },
  /** Script generation */
  script: { maxRequests: 30, windowMs: 60000, keyPrefix: 'script' },
  /** Auth operations */
  auth: { maxRequests: 10, windowMs: 60000, keyPrefix: 'auth' },
  /** General API */
  general: { maxRequests: 100, windowMs: 60000, keyPrefix: 'api' },
};
