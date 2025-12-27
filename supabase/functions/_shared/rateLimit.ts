/**
 * Rate Limiting for Edge Functions
 *
 * Two modes available:
 * 1. In-memory rate limiting (fast, but resets on cold start)
 * 2. Distributed rate limiting (persistent, uses Supabase database)
 *
 * Use in-memory for best performance, distributed for critical limits
 * that must persist across cold starts.
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// In-memory store (reset on cold start)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Lazy-load Supabase client for distributed rate limiting
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseClient) {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (url && key) {
      supabaseClient = createClient(url, key);
    }
  }
  return supabaseClient;
}

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let lastCleanup = Date.now();

// Find max window across all rate limits for cleanup
const MAX_WINDOW_MS = 60000; // 1 minute (matches our rate limits)

/**
 * Cleanup expired entries from rate limit store
 * Called on each request and via periodic interval
 */
function cleanup(windowMs: number = MAX_WINDOW_MS): void {
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

// Periodic cleanup interval to prevent unbounded memory growth
// This runs even when no requests are coming in
setInterval(() => {
  cleanup(MAX_WINDOW_MS);
}, CLEANUP_INTERVAL);

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
  const headers: Record<string, string> = {
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
  /** Data export - very restrictive */
  dataExport: { maxRequests: 1, windowMs: 3600000, keyPrefix: 'export' }, // 1 per hour
};

// ============================================================================
// DISTRIBUTED RATE LIMITING (Database-backed)
// ============================================================================

export interface DistributedRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  currentCount: number;
}

/**
 * Check rate limit using Supabase database (distributed, persistent)
 * This survives cold starts and works across all Edge Function instances.
 *
 * Falls back to in-memory rate limiting if database is unavailable.
 *
 * @param identifier - Unique identifier (e.g., user ID, 'anon:ip_address')
 * @param config - Rate limit configuration
 * @returns Rate limit result with allowed status and remaining count
 */
export async function checkRateLimitDistributed(
  identifier: string,
  config: RateLimitConfig
): Promise<DistributedRateLimitResult> {
  const { maxRequests, windowMs, keyPrefix = 'api' } = config;
  const windowSeconds = Math.floor(windowMs / 1000);

  const supabase = getSupabaseClient();
  if (!supabase) {
    // Fall back to in-memory if database not configured
    const memResult = checkRateLimit(identifier, config);
    return {
      allowed: memResult.allowed,
      remaining: memResult.remaining,
      resetAt: new Date(memResult.resetAt),
      currentCount: maxRequests - memResult.remaining,
    };
  }

  try {
    // Call the database function for atomic rate limit check
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: `${keyPrefix}:${identifier}`,
      p_endpoint: keyPrefix,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.error('Distributed rate limit check failed, falling back to in-memory:', error);
      // Fall back to in-memory on error
      const memResult = checkRateLimit(identifier, config);
      return {
        allowed: memResult.allowed,
        remaining: memResult.remaining,
        resetAt: new Date(memResult.resetAt),
        currentCount: maxRequests - memResult.remaining,
      };
    }

    // Data is returned as an array with one row
    const result = Array.isArray(data) ? data[0] : data;

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAt: new Date(result.reset_at),
      currentCount: result.current_count,
    };
  } catch (err) {
    console.error('Distributed rate limit error:', err);
    // Fall back to in-memory on any error
    const memResult = checkRateLimit(identifier, config);
    return {
      allowed: memResult.allowed,
      remaining: memResult.remaining,
      resetAt: new Date(memResult.resetAt),
      currentCount: maxRequests - memResult.remaining,
    };
  }
}

/**
 * Create a rate-limited response for distributed rate limiting
 */
export function createDistributedRateLimitResponse(
  result: DistributedRateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  const retryAfterMs = Math.max(0, result.resetAt.getTime() - Date.now());

  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt.getTime() / 1000)),
    'Retry-After': String(Math.ceil(retryAfterMs / 1000)),
  };

  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfterMs,
      resetAt: result.resetAt.toISOString(),
    }),
    {
      status: 429,
      headers,
    }
  );
}
