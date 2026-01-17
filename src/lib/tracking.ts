/**
 * User tracking and analytics utilities
 * Integrates with Sentry for production monitoring
 *
 * Sentry is lazy-loaded to improve initial bundle size.
 * Functions check if Sentry is available and gracefully no-op if not.
 */

// ============================================================================
// Lazy Sentry helpers - avoid synchronous import
// ============================================================================

/**
 * Get Sentry module if it's already loaded (lazy)
 * Returns null if Sentry hasn't been initialized yet
 */
async function getSentry() {
  if (!import.meta.env.PROD) return null;
  try {
    return await import('@sentry/react');
  } catch {
    return null;
  }
}

// ============================================================================
// User Context
// ============================================================================

/**
 * Set user context in Sentry for better error attribution
 * Call this after successful authentication
 */
export function setUserContext(user: { id: string; email?: string }) {
  if (import.meta.env.PROD) {
    getSentry().then((Sentry) => {
      if (Sentry) {
        Sentry.setUser({
          id: user.id,
          email: user.email,
        });
      }
    });
  }
}

/**
 * Clear user context on logout
 */
export function clearUserContext() {
  if (import.meta.env.PROD) {
    getSentry().then((Sentry) => {
      if (Sentry) {
        Sentry.setUser(null);
      }
    });
  }
}

// ============================================================================
// User Action Tracking
// ============================================================================

type ActionCategory = 'voice' | 'meditation' | 'auth' | 'audio' | 'navigation';
type ActionLevel = 'info' | 'warning';

interface TrackActionOptions {
  category: ActionCategory;
  action: string;
  label?: string;
  data?: Record<string, any>;
  level?: ActionLevel;
}

/**
 * Track a user action as a Sentry breadcrumb
 * These are included with error reports for debugging context
 */
export function trackAction(options: TrackActionOptions) {
  const { category, action, label, data, level = 'info' } = options;

  // Log in development
  if (import.meta.env.DEV) {
    console.log(`[Track] ${category}:${action}${label ? ` - ${label}` : ''}`, data || '');
  }

  // Add breadcrumb in production
  if (import.meta.env.PROD) {
    getSentry().then((Sentry) => {
      if (Sentry) {
        Sentry.addBreadcrumb({
          category: `user.${category}`,
          message: label ? `${action}: ${label}` : action,
          level,
          data,
        });
      }
    });
  }
}

// ============================================================================
// Pre-defined Action Trackers
// ============================================================================

/**
 * Track voice-related actions
 */
export const trackVoice = {
  cloneStarted: (voiceName: string) =>
    trackAction({ category: 'voice', action: 'clone_started', label: voiceName }),

  cloneCompleted: (voiceName: string, voiceId: string) =>
    trackAction({
      category: 'voice',
      action: 'clone_completed',
      label: voiceName,
      data: { voiceId },
    }),

  cloneFailed: (voiceName: string, error: string) =>
    trackAction({
      category: 'voice',
      action: 'clone_failed',
      label: voiceName,
      data: { error },
      level: 'warning',
    }),

  deleted: (voiceId: string) =>
    trackAction({ category: 'voice', action: 'deleted', data: { voiceId } }),

  selected: (voiceId: string, voiceName: string) =>
    trackAction({
      category: 'voice',
      action: 'selected',
      label: voiceName,
      data: { voiceId },
    }),
};

/**
 * Track meditation-related actions
 */
export const trackMeditation = {
  scriptGenerated: (promptLength: number) =>
    trackAction({
      category: 'meditation',
      action: 'script_generated',
      data: { promptLength },
    }),

  scriptExtended: () =>
    trackAction({ category: 'meditation', action: 'script_extended' }),

  audioGenerated: (duration?: number) =>
    trackAction({
      category: 'meditation',
      action: 'audio_generated',
      data: duration ? { duration } : undefined,
    }),

  saved: (meditationId: string) =>
    trackAction({
      category: 'meditation',
      action: 'saved',
      data: { meditationId },
    }),
};

/**
 * Track audio playback actions
 */
export const trackAudio = {
  playbackStarted: () =>
    trackAction({ category: 'audio', action: 'playback_started' }),

  playbackCompleted: (durationMs: number) =>
    trackAction({
      category: 'audio',
      action: 'playback_completed',
      data: { durationMs },
    }),

  playbackStopped: (positionMs: number, totalMs: number) =>
    trackAction({
      category: 'audio',
      action: 'playback_stopped',
      data: { positionMs, totalMs, percentComplete: Math.round((positionMs / totalMs) * 100) },
    }),
};

/**
 * Track authentication actions
 */
export const trackAuth = {
  signInStarted: () =>
    trackAction({ category: 'auth', action: 'sign_in_started' }),

  signInCompleted: (userId: string) => {
    trackAction({ category: 'auth', action: 'sign_in_completed', data: { userId } });
    setUserContext({ id: userId });
  },

  signInFailed: (error: string) =>
    trackAction({
      category: 'auth',
      action: 'sign_in_failed',
      data: { error },
      level: 'warning',
    }),

  signUpCompleted: (userId: string) => {
    trackAction({ category: 'auth', action: 'sign_up_completed', data: { userId } });
    setUserContext({ id: userId });
  },

  signOut: () => {
    trackAction({ category: 'auth', action: 'sign_out' });
    clearUserContext();
  },
};
