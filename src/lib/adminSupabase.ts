/**
 * Admin-specific database operations
 * All functions are protected by RLS policies that verify user has ADMIN role
 */

import { supabase, withRetry, User, VoiceProfile, MeditationHistory } from '../../lib/supabase';
import { getCachedAudioTags, setCachedAudioTags, clearAudioTagCache } from './audioTagCache';
import {
  getCached,
  setCache,
  CACHE_KEYS,
  invalidateUserCaches,
  invalidateMeditationCaches,
  invalidateVoiceProfileCaches,
  invalidateTemplateCaches,
} from './adminDataCache';

const DEBUG = import.meta.env?.DEV ?? false;

// ============================================================================
// Direct Fetch Helper (bypasses Supabase client issues)
// ============================================================================

const getSupabaseConfig = () => ({
  url: import.meta.env.VITE_SUPABASE_URL as string,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
});

// Get the user's access token from the Supabase session
// Has a 5s timeout to prevent hanging
async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;

  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 5000);
    });

    const sessionPromise = supabase.auth.getSession().then(({ data: { session } }) => {
      return session?.access_token || null;
    });

    return await Promise.race([sessionPromise, timeoutPromise]);
  } catch (error) {
    console.error('[getAccessToken] Error:', error);
    return null;
  }
}

async function supabaseFetch<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    params?: Record<string, string>;
  } = {}
): Promise<T> {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) throw new Error('Supabase not configured');

  // Get user's access token for authenticated requests
  const accessToken = await getAccessToken();
  const authToken = accessToken || key;

  const { method = 'GET', body, params } = options;

  let fullUrl = `${url}/rest/v1/${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    fullUrl += `?${searchParams.toString()}`;
  }

  const response = await fetch(fullUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${authToken}`,
      'Prefer': method === 'GET' ? 'return=representation' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${errorText}`);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return [] as T;

  return JSON.parse(text) as T;
}

async function supabaseRpc<T>(functionName: string, params?: Record<string, unknown>): Promise<T> {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) throw new Error('Supabase not configured');

  // Get user's access token for authenticated requests
  const accessToken = await getAccessToken();
  const authToken = accessToken || key;

  const response = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify(params || {}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase RPC error: ${response.status} - ${errorText}`);
  }

  const text = await response.text();
  if (!text) return null as T;

  return JSON.parse(text) as T;
}

// ============================================================================
// Audit Logging Helper
// ============================================================================

/**
 * Log an admin action to the audit_log table
 */
async function logAdminAction(
  tableName: string,
  recordId: string | null,
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'ADMIN_DELETE' | 'ADMIN_VIEW' | 'DATA_EXPORT',
  targetUserId?: string,
  oldData?: Record<string, unknown>,
  newData?: Record<string, unknown>
): Promise<void> {
  if (!supabase) return;

  try {
    const { error } = await supabase.rpc('log_admin_action', {
      p_table_name: tableName,
      p_record_id: recordId,
      p_operation: operation,
      p_target_user_id: targetUserId || null,
      p_old_data: oldData ? JSON.stringify(oldData) : null,
      p_new_data: newData ? JSON.stringify(newData) : null,
      p_request_id: null,
    });

    if (error) {
      // Don't throw - audit logging failure shouldn't block admin action
      if (DEBUG) console.warn('[adminSupabase] Failed to log admin action:', error);
    } else if (DEBUG) {
      console.log('[adminSupabase] Logged admin action:', operation, tableName, recordId);
    }
  } catch (e) {
    if (DEBUG) console.warn('[adminSupabase] Audit log error:', e);
  }
}

// ============================================================================
// Types
// ============================================================================

export interface AdminAnalytics {
  totalUsers: number;
  totalMeditations: number;
  totalVoiceProfiles: number;
  totalAudioTags: number;
  newUsers7d: number;
  newMeditations7d: number;
}

export interface AudioTagPreset {
  id: string;
  tag_key: string;
  tag_label: string;
  tag_description: string | null;
  category: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string | null;
  operation: string;
  admin_id: string;
  admin_email: string | null;
  target_user_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  request_id: string | null;
  created_at: string;
}

export interface UserActivityStats {
  user_id: string;
  email: string;
  meditation_count: number;
  voice_count: number;
  last_activity: string | null;
  is_active_7d: boolean;
  is_active_30d: boolean;
}

export interface UserActivitySummary {
  total_active_7d: number;
  total_active_30d: number;
  total_meditations_7d: number;
  avg_meditations_per_user: number;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateSubgroup {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  category_id: string;
  subgroup_id: string;
  legacy_id: string | null;
  title: string;
  description: string | null;
  prompt: string;
  display_order: number;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateWithDetails extends Template {
  category_name?: string;
  subgroup_name?: string;
}

// ============================================================================
// User Management
// ============================================================================

/**
 * Get users with pagination (admin only - protected by RLS)
 * Uses client-side caching with 5-minute TTL
 */
export async function getAllUsers(
  limit: number = 100,
  offset: number = 0,
  useCache: boolean = true
): Promise<{ users: User[]; total: number; hasMore: boolean }> {
  // Only cache first page requests
  const cacheKey = offset === 0 ? CACHE_KEYS.USERS : null;

  if (useCache && cacheKey) {
    const cached = getCached<{ users: User[]; total: number; hasMore: boolean }>(cacheKey);
    if (cached) return cached;
  }

  try {
    // Fetch users with pagination - only select needed columns
    const data = await supabaseFetch<User[]>('users', {
      params: {
        select: 'id,email,first_name,last_name,role,tier,created_at',
        order: 'created_at.desc',
        limit: limit.toString(),
        offset: offset.toString(),
      },
    });

    // Get total count for pagination UI (only on first page load)
    let total = data?.length || 0;
    if (offset === 0) {
      try {
        const countData = await supabaseFetch<Array<{ count: number }>>('users', {
          params: {
            select: 'count',
          },
        });
        total = countData?.[0]?.count || data?.length || 0;
      } catch {
        // Fallback to fetched length if count fails
        total = data?.length || 0;
      }
    }

    const result = {
      users: data || [],
      total,
      hasMore: (data?.length || 0) === limit,
    };

    // Cache first page results
    if (cacheKey) {
      setCache(cacheKey, result);
    }

    if (DEBUG) console.log('[adminSupabase] Fetched users:', data?.length, 'total:', total);
    return result;
  } catch (error) {
    console.error('[adminSupabase] Error fetching users:', error);
    return { users: [], total: 0, hasMore: false };
  }
}

/**
 * Delete a user and all their data (admin only - cascade delete handled by FK constraints)
 */
export async function deleteUserAdmin(userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  if (!userId) throw new Error('User ID required');

  return withRetry(async () => {
    // Get user data for audit log before deletion
    const { data: userData } = await supabase!
      .from('users')
      .select('id, email, role, created_at')
      .eq('id', userId)
      .single();

    // Delete from users table - FK constraints will cascade to meditation_history, voice_profiles
    const { error } = await supabase!
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    // Log the admin action
    await logAdminAction('users', userId, 'ADMIN_DELETE', userId, userData || undefined);

    // Invalidate user-related caches
    invalidateUserCaches();

    if (DEBUG) console.log('[adminSupabase] Deleted user:', userId);
  });
}

// ============================================================================
// Content Moderation
// ============================================================================

/**
 * Get all meditations across all users (admin only - protected by RLS)
 * Uses client-side caching with 5-minute TTL
 */
export async function getAllMeditations(
  limit: number = 100,
  useCache: boolean = true
): Promise<MeditationHistory[]> {
  if (!supabase) throw new Error('Supabase not configured');

  // Check cache first
  if (useCache) {
    const cached = getCached<MeditationHistory[]>(CACHE_KEYS.MEDITATIONS);
    if (cached) return cached;
  }

  return withRetry(async () => {
    const { data, error } = await supabase!
      .from('meditation_history')
      .select('*, users:user_id(email)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Cache the results
    if (data) {
      setCache(CACHE_KEYS.MEDITATIONS, data);
    }

    if (DEBUG) console.log('[adminSupabase] Fetched meditations:', data?.length);
    return data || [];
  });
}

/**
 * Delete a meditation (admin only - protected by RLS)
 */
export async function deleteMeditationAdmin(meditationId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  if (!meditationId) throw new Error('Meditation ID required');

  return withRetry(async () => {
    // Get meditation data for audit log before deletion
    const { data: meditationData } = await supabase!
      .from('meditation_history')
      .select('id, user_id, prompt, voice_name, created_at')
      .eq('id', meditationId)
      .single();

    const { error } = await supabase!
      .from('meditation_history')
      .delete()
      .eq('id', meditationId);

    if (error) throw error;

    // Log the admin action
    await logAdminAction(
      'meditation_history',
      meditationId,
      'ADMIN_DELETE',
      meditationData?.user_id,
      meditationData || undefined
    );

    // Invalidate meditation-related caches
    invalidateMeditationCaches();

    if (DEBUG) console.log('[adminSupabase] Deleted meditation:', meditationId);
  });
}

/**
 * Get all voice profiles across all users (admin only - protected by RLS)
 * Uses client-side caching with 5-minute TTL
 */
export async function getAllVoiceProfiles(
  limit: number = 100,
  useCache: boolean = true
): Promise<VoiceProfile[]> {
  if (!supabase) throw new Error('Supabase not configured');

  // Check cache first
  if (useCache) {
    const cached = getCached<VoiceProfile[]>(CACHE_KEYS.VOICE_PROFILES);
    if (cached) return cached;
  }

  return withRetry(async () => {
    const { data, error } = await supabase!
      .from('voice_profiles')
      .select('*, users:user_id(email)')
      .neq('status', 'ARCHIVED')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Cache the results
    if (data) {
      setCache(CACHE_KEYS.VOICE_PROFILES, data);
    }

    if (DEBUG) console.log('[adminSupabase] Fetched voice profiles:', data?.length);
    return data || [];
  });
}

/**
 * Archive a voice profile (soft delete - admin only)
 */
export async function deleteVoiceProfileAdmin(profileId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  if (!profileId) throw new Error('Voice profile ID required');

  return withRetry(async () => {
    // Get profile data for audit log before archiving
    const { data: profileData } = await supabase!
      .from('voice_profiles')
      .select('id, user_id, name, status, created_at')
      .eq('id', profileId)
      .single();

    // Soft delete by setting status to ARCHIVED (existing pattern)
    const { error } = await supabase!
      .from('voice_profiles')
      .update({
        status: 'ARCHIVED',
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId);

    if (error) throw error;

    // Log the admin action
    await logAdminAction(
      'voice_profiles',
      profileId,
      'ADMIN_DELETE',
      profileData?.user_id,
      profileData || undefined,
      { status: 'ARCHIVED' }
    );

    // Invalidate voice profile caches
    invalidateVoiceProfileCaches();

    if (DEBUG) console.log('[adminSupabase] Archived voice profile:', profileId);
  });
}

// ============================================================================
// Analytics
// ============================================================================

// Type for the RPC function return
interface AdminAnalyticsRow {
  total_users: number;
  total_meditations: number;
  total_voice_profiles: number;
  total_audio_tags: number;
  new_users_7d: number;
  new_meditations_7d: number;
}

/**
 * Get admin analytics (aggregated counts)
 * Uses the get_admin_analytics() function which verifies admin role internally
 * Uses client-side caching with 5-minute TTL
 * @param userId - User ID to verify admin status (required for consistent auth)
 */
export async function getAdminAnalytics(userId?: string, useCache: boolean = true): Promise<AdminAnalytics> {
  // Check cache first
  if (useCache) {
    const cached = getCached<AdminAnalytics>(CACHE_KEYS.ANALYTICS);
    if (cached) return cached;
  }

  try {
    // Pass user_id to the function for consistent auth (like check_is_admin)
    const data = await supabaseRpc<AdminAnalyticsRow>('get_admin_analytics',
      userId ? { p_user_id: userId } : {}
    );
    if (DEBUG) console.log('[adminSupabase] Fetched analytics:', data);

    const result = {
      totalUsers: data?.total_users || 0,
      totalMeditations: data?.total_meditations || 0,
      totalVoiceProfiles: data?.total_voice_profiles || 0,
      totalAudioTags: data?.total_audio_tags || 0,
      newUsers7d: data?.new_users_7d || 0,
      newMeditations7d: data?.new_meditations_7d || 0,
    };

    // Cache the results
    setCache(CACHE_KEYS.ANALYTICS, result);

    return result;
  } catch (error) {
    console.error('[adminSupabase] Error fetching analytics:', error);
    return {
      totalUsers: 0,
      totalMeditations: 0,
      totalVoiceProfiles: 0,
      totalAudioTags: 0,
      newUsers7d: 0,
      newMeditations7d: 0,
    };
  }
}

// ============================================================================
// Audio Tags CRUD
// ============================================================================

/**
 * Get all audio tag presets (admin sees all, including inactive)
 * Uses client-side cache (1 hour TTL) to reduce database queries by 95%
 */
export async function getAllAudioTags(): Promise<AudioTagPreset[]> {
  // Check cache first
  const cached = getCachedAudioTags();
  if (cached) {
    if (DEBUG) console.log('[adminSupabase] Audio tags cache hit');
    return cached;
  }

  // Cache miss - fetch from database
  if (DEBUG) console.log('[adminSupabase] Audio tags cache miss - fetching from database');

  try {
    const data = await supabaseFetch<AudioTagPreset[]>('audio_tag_presets', {
      params: {
        select: '*',
        order: 'category,sort_order',
      },
    });

    // Cache the results
    if (data) {
      setCachedAudioTags(data);
      if (DEBUG) console.log('[adminSupabase] Cached audio tags:', data.length);
    }

    return data || [];
  } catch (error) {
    console.error('[adminSupabase] Error fetching audio tags:', error);
    return [];
  }
}

/**
 * Create a new audio tag preset
 * Invalidates client-side cache to ensure fresh data on next load
 */
export async function createAudioTag(
  tag: Omit<AudioTagPreset, 'id' | 'created_at' | 'updated_at'>
): Promise<AudioTagPreset> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { data, error } = await supabase!
      .from('audio_tag_presets')
      .insert({
        ...tag,
        is_active: tag.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    // Invalidate cache
    clearAudioTagCache();
    if (DEBUG) console.log('[adminSupabase] Created audio tag, cache invalidated:', data);

    return data;
  });
}

/**
 * Update an audio tag preset
 * Invalidates client-side cache to ensure fresh data on next load
 */
export async function updateAudioTag(
  id: string,
  updates: Partial<Pick<AudioTagPreset, 'tag_label' | 'tag_description' | 'category' | 'sort_order' | 'is_active'>>
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  if (!id) throw new Error('Tag ID required');
  if (Object.keys(updates).length === 0) throw new Error('No fields to update');

  return withRetry(async () => {
    const { error } = await supabase!
      .from('audio_tag_presets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    // Invalidate cache
    clearAudioTagCache();
    if (DEBUG) console.log('[adminSupabase] Updated audio tag, cache invalidated:', id);
  });
}

/**
 * Soft delete an audio tag preset (sets is_active to false)
 * Invalidates client-side cache to ensure fresh data on next load
 */
export async function deleteAudioTag(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  if (!id) throw new Error('Tag ID required');

  return withRetry(async () => {
    const { error } = await supabase!
      .from('audio_tag_presets')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    // Invalidate cache
    clearAudioTagCache();
    if (DEBUG) console.log('[adminSupabase] Deactivated audio tag, cache invalidated:', id);
  });
}

/**
 * Check if current user is an admin
 * @param userId - User ID to check (required)
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  console.log('[checkIsAdmin] Starting check, userId:', userId);
  if (!userId) return false;

  try {
    // Use direct fetch with user's access token for proper auth.uid()
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[checkIsAdmin] Missing Supabase credentials');
      return false;
    }

    // Get user's access token for proper RLS
    const accessToken = await getAccessToken();
    const authToken = accessToken || supabaseKey;

    console.log('[checkIsAdmin] Making direct fetch to RPC, hasAccessToken:', !!accessToken);
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/check_is_admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ user_id: userId }),
    });

    console.log('[checkIsAdmin] Fetch response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[checkIsAdmin] Fetch error:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('[checkIsAdmin] Result:', data);
    return data === true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[checkIsAdmin] Exception:', message);
    return false;
  }
}

// ============================================================================
// Audit Logs
// ============================================================================

/**
 * Get recent admin activity logs
 */
export async function getAuditLogs(
  limit: number = 50,
  offset: number = 0
): Promise<AuditLogEntry[]> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { data, error } = await supabase!
      .rpc('get_recent_admin_activity', { p_limit: limit, p_offset: offset });

    if (error) throw error;
    if (DEBUG) console.log('[adminSupabase] Fetched audit logs:', data?.length);
    return (data || []) as AuditLogEntry[];
  });
}

// ============================================================================
// User Activity
// ============================================================================

/**
 * Get user activity statistics with sorting
 */
export async function getUserActivityStats(
  limit: number = 50,
  offset: number = 0,
  sortBy: 'meditation_count' | 'voice_count' | 'last_activity' | 'email' = 'last_activity',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<UserActivityStats[]> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { data, error } = await supabase!
      .rpc('get_user_activity_stats', {
        p_limit: limit,
        p_offset: offset,
        p_sort_by: sortBy,
        p_sort_order: sortOrder
      });

    if (error) throw error;
    if (DEBUG) console.log('[adminSupabase] Fetched user activity stats:', data?.length);
    return (data || []) as UserActivityStats[];
  });
}

/**
 * Get user activity summary metrics
 */
export async function getUserActivitySummary(): Promise<UserActivitySummary> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { data, error } = await supabase!
      .rpc('get_user_activity_summary')
      .single();

    if (error) throw error;
    if (DEBUG) console.log('[adminSupabase] Fetched user activity summary:', data);
    return data as UserActivitySummary;
  });
}

// ============================================================================
// Templates Management
// ============================================================================

/**
 * Get all template categories
 */
export async function getTemplateCategories(): Promise<TemplateCategory[]> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { data, error } = await supabase!
      .from('template_categories')
      .select('*')
      .order('display_order');

    if (error) throw error;
    if (DEBUG) console.log('[adminSupabase] Fetched template categories:', data?.length);
    return data || [];
  });
}

/**
 * Get all template subgroups, optionally filtered by category
 */
export async function getTemplateSubgroups(categoryId?: string): Promise<TemplateSubgroup[]> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    let query = supabase!
      .from('template_subgroups')
      .select('*')
      .order('display_order');

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (DEBUG) console.log('[adminSupabase] Fetched template subgroups:', data?.length);
    return data || [];
  });
}

/**
 * Get all templates with category and subgroup names (admin view)
 * Uses client-side caching with 5-minute TTL
 */
export async function getAllTemplatesAdmin(useCache: boolean = true): Promise<TemplateWithDetails[]> {
  if (!supabase) throw new Error('Supabase not configured');

  // Check cache first
  if (useCache) {
    const cached = getCached<TemplateWithDetails[]>(CACHE_KEYS.TEMPLATES);
    if (cached) return cached;
  }

  return withRetry(async () => {
    const { data, error } = await supabase!
      .from('templates')
      .select(`
        *,
        template_categories!inner(name),
        template_subgroups!inner(name)
      `)
      .order('category_id')
      .order('subgroup_id')
      .order('display_order')
      .limit(500); // Add reasonable limit

    if (error) throw error;

    // Transform to flat structure with proper typing
    interface RawTemplate extends Template {
      template_categories: { name: string } | null;
      template_subgroups: { name: string } | null;
    }

    const templates: TemplateWithDetails[] = (data || []).map((t: RawTemplate) => {
      const { template_categories, template_subgroups, ...rest } = t;
      return {
        ...rest,
        category_name: template_categories?.name,
        subgroup_name: template_subgroups?.name,
      };
    });

    // Cache the results
    setCache(CACHE_KEYS.TEMPLATES, templates);

    if (DEBUG) console.log('[adminSupabase] Fetched all templates:', templates.length);
    return templates;
  });
}

/**
 * Create a new template category
 * Uses direct fetch for proper JWT authentication
 */
export async function createTemplateCategory(
  category: Omit<TemplateCategory, 'id' | 'created_at' | 'updated_at'>
): Promise<TemplateCategory> {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) throw new Error('Supabase not configured');

  const accessToken = await getAccessToken();
  const authToken = accessToken || key;

  const response = await fetch(`${url}/rest/v1/template_categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${authToken}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(category),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create category: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  invalidateTemplateCaches();
  if (DEBUG) console.log('[adminSupabase] Created template category:', data);
  return Array.isArray(data) ? data[0] : data;
}

/**
 * Update a template category
 * Uses direct fetch for proper JWT authentication
 */
export async function updateTemplateCategory(
  id: string,
  updates: Partial<Pick<TemplateCategory, 'name' | 'description' | 'icon' | 'color' | 'display_order' | 'is_active'>>
): Promise<void> {
  if (!id) throw new Error('Category ID required');

  const { url, key } = getSupabaseConfig();
  if (!url || !key) throw new Error('Supabase not configured');

  const accessToken = await getAccessToken();
  const authToken = accessToken || key;

  const response = await fetch(`${url}/rest/v1/template_categories?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${authToken}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update category: ${response.status} - ${errorText}`);
  }

  invalidateTemplateCaches();
  if (DEBUG) console.log('[adminSupabase] Updated template category:', id);
}

/**
 * Soft delete a template category (sets is_active to false)
 * Uses direct fetch for proper JWT authentication
 */
export async function deleteTemplateCategory(id: string): Promise<void> {
  if (!id) throw new Error('Category ID required');

  const { url, key } = getSupabaseConfig();
  if (!url || !key) throw new Error('Supabase not configured');

  const accessToken = await getAccessToken();
  const authToken = accessToken || key;

  const response = await fetch(`${url}/rest/v1/template_categories?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${authToken}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ is_active: false, updated_at: new Date().toISOString() }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete category: ${response.status} - ${errorText}`);
  }

  invalidateTemplateCaches();
  if (DEBUG) console.log('[adminSupabase] Deactivated template category:', id);
}

/**
 * Create a new template subgroup
 * Uses direct fetch for proper JWT authentication
 */
export async function createTemplateSubgroup(
  subgroup: Omit<TemplateSubgroup, 'id' | 'created_at' | 'updated_at'>
): Promise<TemplateSubgroup> {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) throw new Error('Supabase not configured');

  const accessToken = await getAccessToken();
  const authToken = accessToken || key;

  const response = await fetch(`${url}/rest/v1/template_subgroups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${authToken}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(subgroup),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create subgroup: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  invalidateTemplateCaches();
  if (DEBUG) console.log('[adminSupabase] Created template subgroup:', data);
  return Array.isArray(data) ? data[0] : data;
}

/**
 * Update a template subgroup
 * Uses direct fetch for proper JWT authentication
 */
export async function updateTemplateSubgroup(
  id: string,
  updates: Partial<Pick<TemplateSubgroup, 'name' | 'description' | 'display_order' | 'is_active'>>
): Promise<void> {
  if (!id) throw new Error('Subgroup ID required');

  const { url, key } = getSupabaseConfig();
  if (!url || !key) throw new Error('Supabase not configured');

  const accessToken = await getAccessToken();
  const authToken = accessToken || key;

  const response = await fetch(`${url}/rest/v1/template_subgroups?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${authToken}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update subgroup: ${response.status} - ${errorText}`);
  }

  invalidateTemplateCaches();
  if (DEBUG) console.log('[adminSupabase] Updated template subgroup:', id);
}

/**
 * Soft delete a template subgroup (sets is_active to false)
 * Uses direct fetch for proper JWT authentication
 */
export async function deleteTemplateSubgroup(id: string): Promise<void> {
  if (!id) throw new Error('Subgroup ID required');

  const { url, key } = getSupabaseConfig();
  if (!url || !key) throw new Error('Supabase not configured');

  const accessToken = await getAccessToken();
  const authToken = accessToken || key;

  const response = await fetch(`${url}/rest/v1/template_subgroups?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${authToken}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ is_active: false, updated_at: new Date().toISOString() }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete subgroup: ${response.status} - ${errorText}`);
  }

  invalidateTemplateCaches();
  if (DEBUG) console.log('[adminSupabase] Deactivated template subgroup:', id);
}

/**
 * Create a new template
 * Uses supabaseFetch for proper JWT authentication
 */
export async function createTemplate(
  template: Omit<Template, 'id' | 'usage_count' | 'created_at' | 'updated_at'>
): Promise<Template> {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) throw new Error('Supabase not configured');

  const accessToken = await getAccessToken();
  const authToken = accessToken || key;

  const response = await fetch(`${url}/rest/v1/templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${authToken}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ ...template, usage_count: 0 }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create template: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  invalidateTemplateCaches();
  if (DEBUG) console.log('[adminSupabase] Created template:', data);
  return Array.isArray(data) ? data[0] : data;
}

/**
 * Update a template
 * Uses supabaseFetch for proper JWT authentication
 */
export async function updateTemplate(
  id: string,
  updates: Partial<Pick<Template, 'title' | 'description' | 'prompt' | 'category_id' | 'subgroup_id' | 'display_order' | 'is_active'>>
): Promise<void> {
  if (!id) throw new Error('Template ID required');

  const { url, key } = getSupabaseConfig();
  if (!url || !key) throw new Error('Supabase not configured');

  const accessToken = await getAccessToken();
  const authToken = accessToken || key;

  const response = await fetch(`${url}/rest/v1/templates?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${authToken}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update template: ${response.status} - ${errorText}`);
  }

  invalidateTemplateCaches();
  if (DEBUG) console.log('[adminSupabase] Updated template:', id);
}

/**
 * Soft delete a template (sets is_active to false)
 * Uses supabaseFetch for proper JWT authentication
 */
export async function deleteTemplate(id: string): Promise<void> {
  if (!id) throw new Error('Template ID required');

  const { url, key } = getSupabaseConfig();
  if (!url || !key) throw new Error('Supabase not configured');

  const accessToken = await getAccessToken();
  const authToken = accessToken || key;

  const response = await fetch(`${url}/rest/v1/templates?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${authToken}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ is_active: false, updated_at: new Date().toISOString() }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete template: ${response.status} - ${errorText}`);
  }

  invalidateTemplateCaches();
  if (DEBUG) console.log('[adminSupabase] Deactivated template:', id);
}

/**
 * Increment template usage count
 */
export async function incrementTemplateUsage(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  if (!id) throw new Error('Template ID required');

  try {
    const { error } = await supabase.rpc('increment_template_usage', { p_template_id: id });
    if (error && DEBUG) console.warn('[adminSupabase] Failed to increment template usage:', error);
  } catch (e) {
    if (DEBUG) console.warn('[adminSupabase] Error incrementing template usage:', e);
  }
}

// ============================================================================
// Rich Dashboard Analytics
// ============================================================================

export interface RecentSignup {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  tier: string;
  created_at: string;
}

export interface RecentMeditation {
  id: string;
  prompt: string;
  user_email: string | null;
  created_at: string;
  category: string | null;
}

export interface TemplateStats {
  totalTemplates: number;
  activeTemplates: number;
  totalCategories: number;
  mostUsedCategory: string | null;
  mostUsedCategoryCount: number;
}

/**
 * Get recent signups for admin dashboard
 */
export async function getRecentSignups(limit: number = 5): Promise<RecentSignup[]> {
  try {
    const data = await supabaseFetch<RecentSignup[]>('users', {
      params: {
        select: 'id,email,first_name,last_name,tier,created_at',
        order: 'created_at.desc',
        limit: limit.toString(),
      },
    });
    if (DEBUG) console.log('[adminSupabase] Fetched recent signups:', data?.length);
    return data || [];
  } catch (error) {
    console.error('[adminSupabase] Error fetching recent signups:', error);
    return [];
  }
}

/**
 * Get recent meditations for admin dashboard
 */
export async function getRecentMeditations(limit: number = 5): Promise<RecentMeditation[]> {
  try {
    const data = await supabaseFetch<Array<{
      id: string;
      prompt: string;
      created_at: string;
      content_category: string | null;
      users: { email: string } | null;
    }>>('meditation_history', {
      params: {
        select: 'id,prompt,created_at,content_category,users(email)',
        order: 'created_at.desc',
        limit: limit.toString(),
      },
    });

    if (DEBUG) console.log('[adminSupabase] Fetched recent meditations:', data?.length);

    return (data || []).map(m => ({
      id: m.id,
      prompt: m.prompt,
      user_email: m.users?.email || null,
      created_at: m.created_at,
      category: m.content_category,
    }));
  } catch (error) {
    console.error('[adminSupabase] Error fetching recent meditations:', error);
    return [];
  }
}

// Type for the RPC function return
interface TemplateStatsRow {
  total_templates: number;
  active_templates: number;
  total_categories: number;
  most_used_category: string | null;
  most_used_category_count: number;
}

/**
 * Get template statistics for admin dashboard
 * Uses server-side RPC function for efficient calculation
 * Uses client-side caching with 5-minute TTL
 */
export async function getTemplateStats(useCache: boolean = true): Promise<TemplateStats> {
  // Check cache first
  if (useCache) {
    const cached = getCached<TemplateStats>(CACHE_KEYS.TEMPLATE_STATS);
    if (cached) return cached;
  }

  try {
    // Try the new RPC function first (server-side calculation)
    const data = await supabaseRpc<TemplateStatsRow>('get_template_stats');

    if (data) {
      const result = {
        totalTemplates: data.total_templates || 0,
        activeTemplates: data.active_templates || 0,
        totalCategories: data.total_categories || 0,
        mostUsedCategory: data.most_used_category,
        mostUsedCategoryCount: data.most_used_category_count || 0,
      };

      // Cache the results
      setCache(CACHE_KEYS.TEMPLATE_STATS, result);

      if (DEBUG) console.log('[adminSupabase] Template stats (RPC):', result);
      return result;
    }

    // Fallback to client-side calculation if RPC doesn't exist yet
    return await getTemplateStatsLegacy();
  } catch (error) {
    // Fallback to legacy implementation if RPC fails
    if (DEBUG) console.log('[adminSupabase] RPC failed, using legacy stats:', error);
    return await getTemplateStatsLegacy();
  }
}

/**
 * Legacy client-side template stats calculation (fallback)
 */
async function getTemplateStatsLegacy(): Promise<TemplateStats> {
  try {
    // Get all templates
    const templates = await supabaseFetch<Array<{
      id: string;
      is_active: boolean;
      category_id: string;
      usage_count: number;
    }>>('templates', {
      params: {
        select: 'id,is_active,category_id,usage_count',
      },
    });

    // Get all categories
    const categories = await supabaseFetch<Array<{
      id: string;
      name: string;
      is_active: boolean;
    }>>('template_categories', {
      params: {
        select: 'id,name,is_active',
      },
    });

    const templateList = templates || [];
    const categoryList = categories || [];

    // Calculate stats
    const totalTemplates = templateList.length;
    const activeTemplates = templateList.filter(t => t.is_active).length;
    const totalCategories = categoryList.filter(c => c.is_active).length;

    // Find most used category by usage_count
    const categoryUsage: Record<string, number> = {};
    for (const t of templateList) {
      if (t.category_id) {
        categoryUsage[t.category_id] = (categoryUsage[t.category_id] || 0) + (t.usage_count || 0);
      }
    }

    let mostUsedCategoryId: string | null = null;
    let mostUsedCategoryCount = 0;
    for (const [catId, count] of Object.entries(categoryUsage)) {
      if (count > mostUsedCategoryCount) {
        mostUsedCategoryId = catId;
        mostUsedCategoryCount = count;
      }
    }

    const mostUsedCategory = mostUsedCategoryId
      ? categoryList.find(c => c.id === mostUsedCategoryId)?.name || null
      : null;

    const result = {
      totalTemplates,
      activeTemplates,
      totalCategories,
      mostUsedCategory,
      mostUsedCategoryCount,
    };

    // Cache the results
    setCache(CACHE_KEYS.TEMPLATE_STATS, result);

    if (DEBUG) console.log('[adminSupabase] Template stats (legacy):', result);
    return result;
  } catch (error) {
    console.error('[adminSupabase] Error fetching template stats:', error);
    return {
      totalTemplates: 0,
      activeTemplates: 0,
      totalCategories: 0,
      mostUsedCategory: null,
      mostUsedCategoryCount: 0,
    };
  }
}
