/**
 * Hook for fetching meditation templates from database
 * Uses in-memory session cache with 1-hour TTL
 * Falls back to hardcoded constants.tsx if database is empty
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  getCachedTemplates,
  setCachedTemplates,
  clearTemplateCache,
} from '../lib/templateCache';
import { TEMPLATE_CATEGORIES } from '../../constants';
import type { TemplateCategory, TemplateSubgroup, Template } from '../lib/adminSupabase';

const DEBUG = import.meta.env?.DEV ?? false;

export interface UseTemplatesResult {
  categories: TemplateCategory[];
  subgroups: TemplateSubgroup[];
  templates: Template[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
}

/**
 * Fetch templates from database with caching
 * Falls back to constants.tsx if database is empty
 */
export function useTemplates(): UseTemplatesResult {
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [subgroups, setSubgroups] = useState<TemplateSubgroup[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Check cache first
    const cached = getCachedTemplates();
    if (cached) {
      if (DEBUG) console.log('[useTemplates] Cache hit');
      setCategories(cached.categories);
      setSubgroups(cached.subgroups);
      setTemplates(cached.templates);
      setIsLoading(false);
      return;
    }

    if (!supabase) {
      if (DEBUG) console.log('[useTemplates] No supabase, using fallback');
      useFallback();
      setIsLoading(false);
      return;
    }

    try {
      if (DEBUG) console.log('[useTemplates] Cache miss, fetching from database');

      // Fetch all template data in parallel
      const [categoriesRes, subgroupsRes, templatesRes] = await Promise.all([
        supabase.from('template_categories').select('*').eq('is_active', true).order('display_order'),
        supabase.from('template_subgroups').select('*').eq('is_active', true).order('display_order'),
        supabase.from('templates').select('*').eq('is_active', true).order('display_order'),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (subgroupsRes.error) throw subgroupsRes.error;
      if (templatesRes.error) throw templatesRes.error;

      const dbCategories = categoriesRes.data || [];
      const dbSubgroups = subgroupsRes.data || [];
      const dbTemplates = templatesRes.data || [];

      // If database is empty, use fallback
      if (dbCategories.length === 0 || dbTemplates.length === 0) {
        if (DEBUG) console.log('[useTemplates] Database empty, using fallback');
        useFallback();
        setIsLoading(false);
        return;
      }

      // Cache the results
      setCachedTemplates(dbCategories, dbSubgroups, dbTemplates);

      setCategories(dbCategories);
      setSubgroups(dbSubgroups);
      setTemplates(dbTemplates);

      if (DEBUG) console.log('[useTemplates] Fetched from database:', dbTemplates.length, 'templates');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch templates';
      console.error('[useTemplates] Error:', message);
      setError(message);

      // Use fallback on error
      useFallback();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Convert constants.tsx format to database format
  const useFallback = () => {
    // Transform TEMPLATE_CATEGORIES from constants.tsx to flat structures
    const fallbackCategories: TemplateCategory[] = TEMPLATE_CATEGORIES.map((cat, idx) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      color: cat.color,
      display_order: idx + 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const fallbackSubgroups: TemplateSubgroup[] = [];
    const fallbackTemplates: Template[] = [];

    TEMPLATE_CATEGORIES.forEach(cat => {
      cat.subgroups.forEach((subgroup, sgIdx) => {
        const subgroupId = `${cat.id}-${subgroup.id}`;
        fallbackSubgroups.push({
          id: subgroupId,
          category_id: cat.id,
          name: subgroup.name,
          description: subgroup.description,
          display_order: sgIdx + 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        subgroup.templates.forEach((template, tIdx) => {
          fallbackTemplates.push({
            id: template.id,
            category_id: cat.id,
            subgroup_id: subgroupId,
            legacy_id: template.id,
            title: template.title,
            description: template.description,
            prompt: template.prompt,
            display_order: tIdx + 1,
            is_active: true,
            usage_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        });
      });
    });

    setCategories(fallbackCategories);
    setSubgroups(fallbackSubgroups);
    setTemplates(fallbackTemplates);
  };

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    categories,
    subgroups,
    templates,
    isLoading,
    error,
    refetch: fetchTemplates,
    clearCache: clearTemplateCache,
  };
}

/**
 * Get templates grouped by category for UI display
 */
export function useTemplatesByCategory() {
  const { categories, subgroups, templates, isLoading, error } = useTemplates();

  // Group templates by category -> subgroup
  const groupedTemplates = categories.map(category => ({
    ...category,
    subgroups: subgroups
      .filter(sg => sg.category_id === category.id)
      .map(sg => ({
        ...sg,
        templates: templates.filter(t => t.subgroup_id === sg.id),
      })),
  }));

  return {
    categories: groupedTemplates,
    isLoading,
    error,
  };
}
