/**
 * Onboarding state persistence using Supabase
 * Replaces localStorage for cross-device synchronization
 */

import {
  hasCompletedOnboarding,
  markOnboardingCompleted,
  updateOnboardingStep,
  resetOnboardingStatus,
  supabase
} from '../../lib/supabase';

/**
 * Check if onboarding should be shown to the user
 */
export async function shouldShowOnboarding(userId?: string): Promise<boolean> {
  const completed = await hasCompletedOnboarding(userId);
  return !completed;
}

/**
 * Check if user has ever seen onboarding (for new user detection)
 * This is effectively redundant with shouldShowOnboarding in DB mode
 */
export async function hasSeenOnboarding(userId?: string): Promise<boolean> {
  const completed = await hasCompletedOnboarding(userId);
  return completed;
}

/**
 * Mark onboarding as completed
 */
export async function markOnboardingComplete(userId?: string): Promise<void> {
  await markOnboardingCompleted(userId);
}

/**
 * Mark onboarding as skipped
 */
export async function markOnboardingSkipped(userId?: string): Promise<void> {
  // Skipping counts as completion in the current flow
  await markOnboardingCompleted(userId);
}

/**
 * Reset onboarding state
 */
export async function resetOnboarding(userId?: string): Promise<void> {
  await resetOnboardingStatus(userId);
}

/**
 * Save the last step seen
 */
export async function saveLastStep(stepIndex: number, userId?: string): Promise<void> {
  await updateOnboardingStep(stepIndex, userId);
}

/**
 * Get the last step seen from Supabase
 */
export async function getLastStep(userId?: string): Promise<number> {
  if (!supabase) return 0;

  const { data, error } = await supabase
    .from('users')
    .select('current_onboarding_step')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching last onboarding step:', error);
    return 0;
  }

  return data?.current_onboarding_step ?? 0;
}
