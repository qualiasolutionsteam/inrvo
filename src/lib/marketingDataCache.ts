/**
 * In-memory Marketing Portal Data Cache
 * Replaces localStorage for strictly database-only persistence
 */

const CACHE_VERSION = 2;
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  version: number;
}

const sessionCache = new Map<string, CacheEntry>();

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

export function getCached<T>(key: string): T | null {
  const entry = sessionCache.get(key);
  if (!entry) return null;

  if (entry.version !== CACHE_VERSION) {
    sessionCache.delete(key);
    return null;
  }

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    sessionCache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  if (data === null || data === undefined) return;

  sessionCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
    version: CACHE_VERSION,
  });
}

export function invalidateCache(key: string): void {
  sessionCache.delete(key);
}

export function invalidateDeliverableCaches(): void {
  invalidateCache(MARKETING_CACHE_KEYS.DELIVERABLES);
  invalidateCache(MARKETING_CACHE_KEYS.DELIVERABLES_BY_CATEGORY);
  invalidateCache(MARKETING_CACHE_KEYS.DASHBOARD_STATS);
}

export function invalidateCalendarCaches(): void {
  invalidateCache(MARKETING_CACHE_KEYS.CONTENT_CALENDAR);
  invalidateCache(MARKETING_CACHE_KEYS.DASHBOARD_STATS);
}

export function invalidateInfluencerCaches(): void {
  invalidateCache(MARKETING_CACHE_KEYS.INFLUENCERS);
  invalidateCache(MARKETING_CACHE_KEYS.DASHBOARD_STATS);
}

export function invalidatePartnershipCaches(): void {
  invalidateCache(MARKETING_CACHE_KEYS.PARTNERSHIPS);
  invalidateCache(MARKETING_CACHE_KEYS.DASHBOARD_STATS);
}

export function invalidateCommunicationCaches(): void {
  invalidateCache(MARKETING_CACHE_KEYS.COMMUNICATIONS);
  invalidateCache(MARKETING_CACHE_KEYS.DASHBOARD_STATS);
}

export function clearAllMarketingCache(): void {
  sessionCache.clear();
}
