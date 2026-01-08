import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, ReactNode } from 'react';
import {
  hasCompletedOnboarding,
  markOnboardingCompleted,
  resetOnboardingStatus,
  updateOnboardingStep,
} from '../../lib/supabase';
import { ONBOARDING_STEPS, type OnboardingStep } from '../components/Onboarding/steps';
import { useAuth } from './AuthContext';

/**
 * Onboarding state management context
 * Triggers after user signup, not on first page visit
 */

interface OnboardingContextValue {
  // State
  isActive: boolean;
  currentStepIndex: number;
  currentStep: OnboardingStep | null;
  totalSteps: number;
  targetRoute: string | null;

  // Actions
  startOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  restartOnboarding: () => void;
  clearTargetRoute: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRoute, setTargetRoute] = useState<string | null>(null);

  // Get user from AuthContext - single source of truth for auth state
  const { user, isSessionReady } = useAuth();
  const userId = user?.id;

  // Use ref to track timer for cleanup and previous user state
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUserIdRef = useRef<string | undefined>(undefined);
  const hasCheckedOnboardingRef = useRef(false);

  // React to user changes from AuthContext - triggers onboarding after signup
  useEffect(() => {
    const currentUserId = user?.id;

    // Detect new sign-in (user changed from null/different to current)
    const isNewSignIn = currentUserId && prevUserIdRef.current !== currentUserId;

    // Update previous user ref
    prevUserIdRef.current = currentUserId;

    // Clear onboarding on logout
    if (!currentUserId) {
      setIsActive(false);
      setCurrentStepIndex(0);
      hasCheckedOnboardingRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Only check onboarding once per user session
    if (hasCheckedOnboardingRef.current) return;

    // Trigger onboarding check after new sign-in when session is ready
    if (isNewSignIn && isSessionReady) {
      hasCheckedOnboardingRef.current = true;

      // Check if user has completed onboarding (from database)
      hasCompletedOnboarding(currentUserId).then((completed) => {
        if (!completed) {
          // Clear any existing timer
          if (timerRef.current) {
            clearTimeout(timerRef.current);
          }

          // Delay 1.5s after signup before showing onboarding
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            setIsActive(true);
          }, 1500);
        }
      });
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [user, isSessionReady]);

  const currentStep = useMemo(() => {
    return ONBOARDING_STEPS[currentStepIndex] ?? null;
  }, [currentStepIndex]);

  const startOnboarding = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);

    // Navigate to first step's route if specified
    const firstStep = ONBOARDING_STEPS[0];
    if (firstStep?.route) {
      setTargetRoute(firstStep.route);
    }
  }, []);

  const nextStep = useCallback(async () => {
    const nextIndex = currentStepIndex + 1;

    if (nextIndex >= ONBOARDING_STEPS.length) {
      // Completed all steps - save to database
      await markOnboardingCompleted(userId);
      setIsActive(false);
      setCurrentStepIndex(0);
      return;
    }

    setCurrentStepIndex(nextIndex);

    // Save progress to database
    await updateOnboardingStep(nextIndex, userId);

    // Navigate to next step's route if different from current
    const nextStepData = ONBOARDING_STEPS[nextIndex];
    const currentStepData = ONBOARDING_STEPS[currentStepIndex];

    if (nextStepData?.route && nextStepData.route !== currentStepData?.route) {
      setTargetRoute(nextStepData.route);
    }
  }, [currentStepIndex, userId]);

  const prevStep = useCallback(() => {
    if (currentStepIndex <= 0) return;

    const prevIndex = currentStepIndex - 1;
    setCurrentStepIndex(prevIndex);

    // Navigate to previous step's route if different
    const prevStepData = ONBOARDING_STEPS[prevIndex];
    const currentStepData = ONBOARDING_STEPS[currentStepIndex];

    if (prevStepData?.route && prevStepData.route !== currentStepData?.route) {
      setTargetRoute(prevStepData.route);
    }
  }, [currentStepIndex]);

  const goToStep = useCallback((index: number) => {
    if (index < 0 || index >= ONBOARDING_STEPS.length) return;

    setCurrentStepIndex(index);

    // Navigate to step's route
    const stepData = ONBOARDING_STEPS[index];
    if (stepData?.route) {
      setTargetRoute(stepData.route);
    }
  }, []);

  const skipOnboarding = useCallback(() => {
    // Mark as completed in database (skipping counts as completed)
    markOnboardingCompleted(userId);
    setIsActive(false);
    setCurrentStepIndex(0);
    setTargetRoute('/'); // Return to home
  }, [userId]);

  const completeOnboarding = useCallback(() => {
    // Mark as completed in database
    markOnboardingCompleted(userId);
    setIsActive(false);
    setCurrentStepIndex(0);
  }, [userId]);

  const restartOnboarding = useCallback(() => {
    // Reset in database (for testing/restart)
    resetOnboardingStatus(userId);
    setCurrentStepIndex(0);
    setIsActive(true);

    // Navigate to first step's route
    const firstStep = ONBOARDING_STEPS[0];
    if (firstStep?.route) {
      setTargetRoute(firstStep.route);
    }
  }, [userId]);

  const clearTargetRoute = useCallback(() => {
    setTargetRoute(null);
  }, []);

  const value = useMemo<OnboardingContextValue>(() => ({
    isActive,
    currentStepIndex,
    currentStep,
    totalSteps: ONBOARDING_STEPS.length,
    targetRoute,
    startOnboarding,
    nextStep,
    prevStep,
    goToStep,
    skipOnboarding,
    completeOnboarding,
    restartOnboarding,
    clearTargetRoute,
  }), [
    isActive,
    currentStepIndex,
    currentStep,
    targetRoute,
    startOnboarding,
    nextStep,
    prevStep,
    goToStep,
    skipOnboarding,
    completeOnboarding,
    restartOnboarding,
    clearTargetRoute,
  ]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

/**
 * Hook to access onboarding context
 */
export const useOnboarding = (): OnboardingContextValue => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export default OnboardingContext;
