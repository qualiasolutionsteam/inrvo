/**
 * Hook for meditation feedback and rating
 *
 * Allows users to rate meditations and provide feedback,
 * which improves personalization over time.
 */

import { useState, useCallback } from 'react';
import { saveMeditationFeedback, type MeditationFeedback } from '../lib/preferencesService';

interface UseMeditationFeedbackOptions {
  userId?: string;
  onFeedbackSaved?: () => void;
  onError?: (error: string) => void;
}

interface UseMeditationFeedbackReturn {
  // State
  isSubmitting: boolean;
  hasSubmitted: boolean;

  // Actions
  submitFeedback: (
    historyId: string,
    rating: number,
    feedback?: string,
    meditationType?: string,
    emotionalState?: string
  ) => Promise<boolean>;

  // Reset
  resetFeedback: () => void;
}

export function useMeditationFeedback(
  options: UseMeditationFeedbackOptions = {}
): UseMeditationFeedbackReturn {
  const { userId, onFeedbackSaved, onError } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const submitFeedback = useCallback(async (
    historyId: string,
    rating: number,
    feedback?: string,
    meditationType?: string,
    emotionalState?: string
  ): Promise<boolean> => {
    if (!userId) {
      onError?.('Please sign in to submit feedback');
      return false;
    }

    if (rating < 1 || rating > 5) {
      onError?.('Rating must be between 1 and 5');
      return false;
    }

    setIsSubmitting(true);

    try {
      const feedbackData: MeditationFeedback = {
        meditationId: historyId,
        rating,
        feedback,
        meditationType,
        emotionalState,
      };

      const success = await saveMeditationFeedback(userId, historyId, feedbackData);

      if (success) {
        setHasSubmitted(true);
        onFeedbackSaved?.();
      } else {
        onError?.('Failed to save feedback. Please try again.');
      }

      return success;
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      onError?.(error?.message || 'Failed to submit feedback');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, onFeedbackSaved, onError]);

  const resetFeedback = useCallback(() => {
    setHasSubmitted(false);
    setIsSubmitting(false);
  }, []);

  return {
    isSubmitting,
    hasSubmitted,
    submitFeedback,
    resetFeedback,
  };
}
