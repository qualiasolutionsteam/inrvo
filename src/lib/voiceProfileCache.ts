/**
 * In-memory cache for voice profiles
 * Replaces localStorage for strictly database-only persistence
 */

import type { VoiceProfile } from '../../lib/supabase';

interface CacheEntry {
  data: VoiceProfile[];
  timestamp: number;
}

const sessionCache = new Map<string, CacheEntry>();
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

export function getCachedVoiceProfiles(userId: string): VoiceProfile[] | null {
  const cached = sessionCache.get(userId);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL) {
    sessionCache.delete(userId);
    return null;
  }

  return cached.data;
}

export function setCachedVoiceProfiles(userId: string, data: VoiceProfile[]): void {
  sessionCache.set(userId, { data, timestamp: Date.now() });
}

export function clearVoiceProfileCache(): void {
  sessionCache.clear();
}

export function getCachedVoiceProfileById(userId: string, profileId: string): VoiceProfile | null {
  const profiles = getCachedVoiceProfiles(userId);
  if (!profiles) return null;
  return profiles.find(p => p.id === profileId) || null;
}

export function updateCachedVoiceProfile(userId: string, profileId: string, updates: Partial<VoiceProfile>): void {
  const cached = sessionCache.get(userId);
  if (!cached) return;

  const index = cached.data.findIndex(p => p.id === profileId);
  if (index !== -1) {
    cached.data[index] = { ...cached.data[index], ...updates };
  }
}

export function addToCachedVoiceProfiles(userId: string, profile: VoiceProfile): void {
  const cached = sessionCache.get(userId);
  if (!cached) {
    sessionCache.set(userId, { data: [profile], timestamp: Date.now() });
    return;
  }

  cached.data = [profile, ...cached.data];
  cached.timestamp = Date.now();
}

export function removeFromCachedVoiceProfiles(userId: string, profileId: string): void {
  const cached = sessionCache.get(userId);
  if (!cached) return;

  cached.data = cached.data.filter(p => p.id !== profileId);
}

export function isVoiceProfileCacheValid(userId: string): boolean {
  const cached = sessionCache.get(userId);
  if (!cached) return false;
  return (Date.now() - cached.timestamp) < CACHE_TTL;
}
