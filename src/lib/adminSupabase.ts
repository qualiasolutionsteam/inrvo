/**
 * Admin-specific database operations
 * All functions are protected by RLS policies that verify user has ADMIN role
 */

import { supabase, withRetry, User, VoiceProfile, MeditationHistory } from '../../lib/supabase';
import { getCachedAudioTags, setCachedAudioTags, clearAudioTagCache } from './audioTagCache';

const DEBUG = import.meta.env?.DEV ?? false;

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

// ============================================================================
// User Management
// ============================================================================

/**
 * Get all users (admin only - protected by RLS)
 */
export async function getAllUsers(): Promise<User[]> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (DEBUG) console.log('[adminSupabase] Fetched users:', data?.length);
    return data || [];
  });
}

/**
 * Delete a user and all their data (admin only - cascade delete handled by FK constraints)
 */
export async function deleteUserAdmin(userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  if (!userId) throw new Error('User ID required');

  return withRetry(async () => {
    // Delete from users table - FK constraints will cascade to meditation_history, voice_profiles
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
    if (DEBUG) console.log('[adminSupabase] Deleted user:', userId);
  });
}

// ============================================================================
// Content Moderation
// ============================================================================

/**
 * Get all meditations across all users (admin only - protected by RLS)
 */
export async function getAllMeditations(limit: number = 100): Promise<MeditationHistory[]> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { data, error } = await supabase
      .from('meditation_history')
      .select('*, users:user_id(email)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
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
    const { error } = await supabase
      .from('meditation_history')
      .delete()
      .eq('id', meditationId);

    if (error) throw error;
    if (DEBUG) console.log('[adminSupabase] Deleted meditation:', meditationId);
  });
}

/**
 * Get all voice profiles across all users (admin only - protected by RLS)
 */
export async function getAllVoiceProfiles(limit: number = 100): Promise<VoiceProfile[]> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { data, error } = await supabase
      .from('voice_profiles')
      .select('*, users:user_id(email)')
      .neq('status', 'ARCHIVED')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
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
    // Soft delete by setting status to ARCHIVED (existing pattern)
    const { error } = await supabase
      .from('voice_profiles')
      .update({
        status: 'ARCHIVED',
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId);

    if (error) throw error;
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
 */
export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { data, error } = await supabase
      .rpc('get_admin_analytics')
      .single<AdminAnalyticsRow>();

    if (error) throw error;
    if (DEBUG) console.log('[adminSupabase] Fetched analytics:', data);

    return {
      totalUsers: data?.total_users || 0,
      totalMeditations: data?.total_meditations || 0,
      totalVoiceProfiles: data?.total_voice_profiles || 0,
      totalAudioTags: data?.total_audio_tags || 0,
      newUsers7d: data?.new_users_7d || 0,
      newMeditations7d: data?.new_meditations_7d || 0,
    };
  });
}

// ============================================================================
// Audio Tags CRUD
// ============================================================================

/**
 * Get all audio tag presets (admin sees all, including inactive)
 * Uses client-side cache (1 hour TTL) to reduce database queries by 95%
 */
export async function getAllAudioTags(): Promise<AudioTagPreset[]> {
  if (!supabase) throw new Error('Supabase not configured');

  // Check cache first
  const cached = getCachedAudioTags();
  if (cached) {
    if (DEBUG) console.log('[adminSupabase] Audio tags cache hit');
    return cached;
  }

  // Cache miss - fetch from database
  if (DEBUG) console.log('[adminSupabase] Audio tags cache miss - fetching from database');

  return withRetry(async () => {
    const { data, error } = await supabase
      .from('audio_tag_presets')
      .select('*')
      .order('category')
      .order('sort_order');

    if (error) throw error;

    // Cache the results
    if (data) {
      setCachedAudioTags(data);
      if (DEBUG) console.log('[adminSupabase] Cached audio tags:', data.length);
    }

    return data || [];
  });
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
    const { data, error } = await supabase
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
    const { error } = await supabase
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
    const { error } = await supabase
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
 */
export async function checkIsAdmin(): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) {
      if (DEBUG) console.log('[adminSupabase] Error checking admin status:', error);
      return false;
    }

    return data?.role === 'ADMIN';
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (DEBUG) console.log('[adminSupabase] Error checking admin status:', message);
    return false;
  }
}
