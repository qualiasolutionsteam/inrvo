/**
 * In-memory cache for meditation templates
 * Replaces localStorage for strictly database-only persistence
 */

import type { TemplateCategory, TemplateSubgroup, Template } from './adminSupabase';

const sessionCache = {
  data: null as CachedTemplates | null,
};

const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export interface CachedTemplates {
  categories: TemplateCategory[];
  subgroups: TemplateSubgroup[];
  templates: Template[];
  timestamp: number;
}

export function getCachedTemplates(): CachedTemplates | null {
  if (!sessionCache.data) return null;

  const age = Date.now() - sessionCache.data.timestamp;
  if (age > CACHE_TTL) {
    sessionCache.data = null;
    return null;
  }

  return sessionCache.data;
}

export function setCachedTemplates(
  categories: TemplateCategory[],
  subgroups: TemplateSubgroup[],
  templates: Template[]
): void {
  sessionCache.data = {
    categories,
    subgroups,
    templates,
    timestamp: Date.now(),
  };
}

export function clearTemplateCache(): void {
  sessionCache.data = null;
}

export function getTemplateCacheAge(): number | null {
  if (!sessionCache.data) return null;
  return Date.now() - sessionCache.data.timestamp;
}

export function isTemplateCacheValid(): boolean {
  const age = getTemplateCacheAge();
  return age !== null && age < CACHE_TTL;
}
