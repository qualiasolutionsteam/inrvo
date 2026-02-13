/**
 * User Preferences Service
 *
 * Loads and manages user meditation preferences for personalization.
 * Preferences are learned from user feedback and usage patterns.
 */

import { supabase } from '../../lib/supabase';

export interface EmotionalPattern {
  count: number;
  preferred_approach: string;
  last_used?: string;
}

export interface MeditationPreferences {
  preferred_types?: string[];
  preferred_settings?: string[];
  preferred_duration?: string;
  preferred_teachers?: string[];
  avoid_topics?: string[];
  emotional_patterns?: Record<string, EmotionalPattern>;
}

export interface MeditationFeedback {
  meditationId?: string;
  rating: number;
  feedback?: string;
  meditationType?: string;
  emotionalState?: string;
}

/**
 * Load user's meditation preferences
 */
export async function loadMeditationPreferences(userId: string): Promise<MeditationPreferences | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.log('[PreferencesService] No preferences found for user');
      return null;
    }

    return (data.preferences as Record<string, unknown>)?.meditation as MeditationPreferences ?? null;
  } catch (error) {
    console.error('[PreferencesService] Error loading preferences:', error);
    return null;
  }
}

/**
 * Save meditation feedback and update history
 */
export async function saveMeditationFeedback(
  userId: string,
  historyId: string,
  feedback: MeditationFeedback
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('meditation_history')
      .update({
        rating: feedback.rating,
        feedback: feedback.feedback,
        meditation_type: feedback.meditationType,
        emotional_state: feedback.emotionalState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', historyId)
      .eq('user_id', userId);

    if (error) {
      console.error('[PreferencesService] Error saving feedback:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[PreferencesService] Error saving feedback:', error);
    return false;
  }
}

/**
 * Get the user's preferred approach for a specific emotional state
 */
export function getPreferredApproach(
  preferences: MeditationPreferences | null,
  emotionalState: string
): string | null {
  if (!preferences?.emotional_patterns) return null;

  const pattern = preferences.emotional_patterns[emotionalState];
  if (pattern && pattern.count >= 2) {
    // Only use learned preference if they've used it at least twice with good ratings
    return pattern.preferred_approach;
  }

  return null;
}

/**
 * Build a personalization prompt based on user preferences
 */
export function buildPersonalizationPrompt(
  preferences: MeditationPreferences | null,
  emotionalState?: string
): string {
  if (!preferences) return '';

  const parts: string[] = [];

  // Add preferred approach for emotional state
  if (emotionalState) {
    const preferredApproach = getPreferredApproach(preferences, emotionalState);
    if (preferredApproach) {
      parts.push(`USER PREFERS: ${preferredApproach} for ${emotionalState} based on past positive experiences.`);
    }
  }

  // Add preferred settings
  if (preferences.preferred_settings?.length) {
    parts.push(`FAVORITE SETTINGS: ${preferences.preferred_settings.join(', ')}`);
  }

  // Add preferred duration
  if (preferences.preferred_duration) {
    parts.push(`PREFERRED DURATION: ${preferences.preferred_duration}`);
  }

  // Add preferred teachers
  if (preferences.preferred_teachers?.length) {
    parts.push(`RESONATES WITH: ${preferences.preferred_teachers.join(', ')} teachings`);
  }

  // Add topics to avoid
  if (preferences.avoid_topics?.length) {
    parts.push(`AVOID: ${preferences.avoid_topics.join(', ')}`);
  }

  if (parts.length === 0) return '';

  return `\n--- USER PREFERENCES (from past sessions) ---\n${parts.join('\n')}\n--- END PREFERENCES ---\n`;
}

/**
 * Get meditation history for the user (for context)
 */
export async function getRecentMeditationHistory(
  userId: string,
  limit: number = 5
): Promise<Array<{ prompt: string; meditation_type?: string; rating?: number }>> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('meditation_history')
      .select('prompt, meditation_type, rating')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data;
  } catch (error) {
    console.error('[PreferencesService] Error loading history:', error);
    return [];
  }
}
