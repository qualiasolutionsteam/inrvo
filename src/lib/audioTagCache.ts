/**
 * In-memory cache for audio tag presets
 * Replaces localStorage for strictly database-only persistence
 */

import type { AudioTag } from '../../types';

const sessionCache: {
  data: AudioTag[] | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export interface CachedAudioTags {
  data: AudioTag[];
  timestamp: number;
}

export function getCachedAudioTags(): AudioTag[] | null {
  if (!sessionCache.data) return null;

  const age = Date.now() - sessionCache.timestamp;
  if (age > CACHE_TTL) {
    sessionCache.data = null;
    return null;
  }

  return sessionCache.data;
}

export function setCachedAudioTags(data: AudioTag[]): void {
  sessionCache.data = data;
  sessionCache.timestamp = Date.now();
}

export function clearAudioTagCache(): void {
  sessionCache.data = null;
  sessionCache.timestamp = 0;
}

export function getCacheAge(): number | null {
  if (!sessionCache.data) return null;
  return Date.now() - sessionCache.timestamp;
}

export function isCacheValid(): boolean {
  const age = getCacheAge();
  return age !== null && age < CACHE_TTL;
}
