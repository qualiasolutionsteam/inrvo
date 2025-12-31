/**
 * Onboarding state persistence using localStorage
 * User-specific storage - triggers after signup, not on first page visit
 */

const STORAGE_KEY_PREFIX = 'inrvo_onboarding';

interface OnboardingStorage {
  completed: boolean;
  skippedAt?: string;
  completedAt?: string;
  lastStepSeen?: number;
}

const DEFAULT_STATE: OnboardingStorage = {
  completed: false,
};

function getStorageKey(userId?: string): string {
  return userId ? `${STORAGE_KEY_PREFIX}_${userId}` : STORAGE_KEY_PREFIX;
}

function getStorageState(userId?: string): OnboardingStorage {
  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    if (!stored) return DEFAULT_STATE;
    return JSON.parse(stored) as OnboardingStorage;
  } catch {
    return DEFAULT_STATE;
  }
}

function setStorageState(state: Partial<OnboardingStorage>, userId?: string): void {
  try {
    const current = getStorageState(userId);
    const updated = { ...current, ...state };
    localStorage.setItem(getStorageKey(userId), JSON.stringify(updated));
  } catch {
    // localStorage unavailable, silently fail
  }
}

/**
 * Check if onboarding should be shown to the user
 */
export function shouldShowOnboarding(userId?: string): boolean {
  const state = getStorageState(userId);
  return !state.completed;
}

/**
 * Check if user has ever seen onboarding (for new user detection)
 */
export function hasSeenOnboarding(userId?: string): boolean {
  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    return stored !== null;
  } catch {
    return false;
  }
}

/**
 * Mark onboarding as completed
 */
export function markOnboardingComplete(userId?: string): void {
  setStorageState({
    completed: true,
    completedAt: new Date().toISOString(),
  }, userId);
}

/**
 * Mark onboarding as skipped
 */
export function markOnboardingSkipped(userId?: string): void {
  setStorageState({
    completed: true,
    skippedAt: new Date().toISOString(),
  }, userId);
}

/**
 * Reset onboarding state (for restart tour)
 */
export function resetOnboarding(userId?: string): void {
  try {
    localStorage.removeItem(getStorageKey(userId));
  } catch {
    // localStorage unavailable
  }
}

/**
 * Save the last step seen (for potential resume)
 */
export function saveLastStep(stepIndex: number, userId?: string): void {
  setStorageState({ lastStepSeen: stepIndex }, userId);
}

/**
 * Get the last step seen
 */
export function getLastStep(userId?: string): number {
  return getStorageState(userId).lastStepSeen ?? 0;
}
