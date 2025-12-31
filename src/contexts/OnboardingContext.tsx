import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import {
  shouldShowOnboarding,
  hasSeenOnboarding,
  markOnboardingComplete,
  markOnboardingSkipped,
  resetOnboarding,
  saveLastStep,
} from '../lib/onboardingStorage';
import { ONBOARDING_STEPS, type OnboardingStep } from '../components/Onboarding/steps';

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
  const [userId, setUserId] = useState<string | undefined>(undefined);

  // Use ref to track timer for cleanup
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for auth state changes to trigger onboarding after signup
  useEffect(() => {
    if (!supabase) return;

    // Get initial user
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
      }
    });

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id;
      setUserId(newUserId);

      // Trigger onboarding after successful signup
      if (event === 'SIGNED_IN' && newUserId) {
        // Check if this is a new user (hasn't seen onboarding before)
        if (!hasSeenOnboarding(newUserId) && shouldShowOnboarding(newUserId)) {
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
      }

      // Clear onboarding on logout
      if (event === 'SIGNED_OUT') {
        setIsActive(false);
        setCurrentStepIndex(0);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

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

  const nextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;

    if (nextIndex >= ONBOARDING_STEPS.length) {
      // Completed all steps
      markOnboardingComplete(userId);
      setIsActive(false);
      setCurrentStepIndex(0);
      return;
    }

    setCurrentStepIndex(nextIndex);
    saveLastStep(nextIndex, userId);

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
    saveLastStep(prevIndex, userId);

    // Navigate to previous step's route if different
    const prevStepData = ONBOARDING_STEPS[prevIndex];
    const currentStepData = ONBOARDING_STEPS[currentStepIndex];

    if (prevStepData?.route && prevStepData.route !== currentStepData?.route) {
      setTargetRoute(prevStepData.route);
    }
  }, [currentStepIndex, userId]);

  const goToStep = useCallback((index: number) => {
    if (index < 0 || index >= ONBOARDING_STEPS.length) return;

    setCurrentStepIndex(index);
    saveLastStep(index, userId);

    // Navigate to step's route
    const stepData = ONBOARDING_STEPS[index];
    if (stepData?.route) {
      setTargetRoute(stepData.route);
    }
  }, [userId]);

  const skipOnboarding = useCallback(() => {
    markOnboardingSkipped(userId);
    setIsActive(false);
    setCurrentStepIndex(0);
    setTargetRoute('/'); // Return to home
  }, [userId]);

  const completeOnboarding = useCallback(() => {
    markOnboardingComplete(userId);
    setIsActive(false);
    setCurrentStepIndex(0);
  }, [userId]);

  const restartOnboarding = useCallback(() => {
    resetOnboarding(userId);
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
