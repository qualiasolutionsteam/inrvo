/**
 * Marketing Portal Data Cache
 * Client-side caching for marketing data
 *
 * Features:
 * - Version tracking to invalidate stale cache on schema changes
 * - TTL-based expiration
 * - Graceful degradation on localStorage errors
 */

const CACHE_PREFIX = 'inrvo_marketing_';
const CACHE_VERSION = 2; // Increment when schema changes
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: number; // Track cache schema version
}

export const MARKETING_CACHE_KEYS = {
  DASHBOARD_STATS: 'dashboard_stats',
  DELIVERABLES: 'deliverables',
  DELIVERABLES_BY_CATEGORY: 'deliverables_by_category',
  CLIENT_INPUTS: 'client_inputs',
  CONTENT_CALENDAR: 'content_calendar',
  INFLUENCERS: 'influencers',
  PARTNERSHIPS: 'partnerships',
  REPORTS: 'reports',
  COMMUNICATIONS: 'communications',
  DOCUMENTS: 'documents',
} as const;

/**
 * Get cached data if still valid
 * Returns null on cache miss, expiration, or version mismatch
 */
export function getCached<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(CACHE_PREFIX + key);
    if (!stored) return null;

    const entry: CacheEntry<T> = JSON.parse(stored);
    const now = Date.now();

    // Check version - invalidate if schema has changed
    if (entry.version !== CACHE_VERSION) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    // Check TTL expiration
    if (now - entry.timestamp > entry.ttl) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    // Validate that data exists and is truthy
    if (!entry.data) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return entry.data;
  } catch {
    // On any error, clear corrupted cache entry
    try {
      localStorage.removeItem(CACHE_PREFIX + key);
    } catch {
      // Ignore cleanup errors
    }
    return null;
  }
}

/**
 * Set cache with TTL and version tracking
 */
export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  try {
    // Don't cache null/undefined data
    if (data === null || data === undefined) {
      return;
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      version: CACHE_VERSION,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (error) {
    // localStorage quota exceeded or disabled - log once and fail silently
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('[marketingDataCache] localStorage quota exceeded, clearing old caches');
      clearAllMarketingCache();
    }
  }
}

/**
 * Invalidate specific cache key
 */
export function invalidateCache(key: string): void {
  localStorage.removeItem(CACHE_PREFIX + key);
}

/**
 * Invalidate all deliverable-related caches
 */
export function invalidateDeliverableCaches(): void {
  invalidateCache(MARKETING_CACHE_KEYS.DELIVERABLES);
  invalidateCache(MARKETING_CACHE_KEYS.DELIVERABLES_BY_CATEGORY);
  invalidateCache(MARKETING_CACHE_KEYS.DASHBOARD_STATS);
}

/**
 * Invalidate all calendar-related caches
 */
export function invalidateCalendarCaches(): void {
  invalidateCache(MARKETING_CACHE_KEYS.CONTENT_CALENDAR);
  invalidateCache(MARKETING_CACHE_KEYS.DASHBOARD_STATS);
}

/**
 * Invalidate all influencer-related caches
 */
export function invalidateInfluencerCaches(): void {
  invalidateCache(MARKETING_CACHE_KEYS.INFLUENCERS);
  invalidateCache(MARKETING_CACHE_KEYS.DASHBOARD_STATS);
}

/**
 * Invalidate all partnership-related caches
 */
export function invalidatePartnershipCaches(): void {
  invalidateCache(MARKETING_CACHE_KEYS.PARTNERSHIPS);
  invalidateCache(MARKETING_CACHE_KEYS.DASHBOARD_STATS);
}

/**
 * Invalidate all communication-related caches
 */
export function invalidateCommunicationCaches(): void {
  invalidateCache(MARKETING_CACHE_KEYS.COMMUNICATIONS);
  invalidateCache(MARKETING_CACHE_KEYS.DASHBOARD_STATS);
}

/**
 * Clear all marketing caches
 */
export function clearAllMarketingCache(): void {
  Object.values(MARKETING_CACHE_KEYS).forEach(key => {
    invalidateCache(key);
  });
}
