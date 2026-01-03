import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { OnboardingOverlay } from './OnboardingOverlay';
import { OnboardingTooltip } from './OnboardingTooltip';

/**
 * Main onboarding orchestrator
 * Manages element detection, navigation, and component coordination
 */

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    targetRoute,
    nextStep,
    prevStep,
    skipOnboarding,
    clearTargetRoute,
  } = useOnboarding();

  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [isWaitingForElement, setIsWaitingForElement] = useState(false);
  const waitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positionUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle route navigation
  useEffect(() => {
    if (targetRoute && targetRoute !== location.pathname) {
      navigate(targetRoute);
      clearTargetRoute();
    }
  }, [targetRoute, location.pathname, navigate, clearTargetRoute]);

  // Find and track target element
  const findTargetElement = useCallback((): HTMLElement | null => {
    if (!currentStep?.targetSelector) return null;

    let element = document.querySelector<HTMLElement>(currentStep.targetSelector);

    // Try fallback selector
    if (!element && currentStep.fallbackSelector) {
      element = document.querySelector<HTMLElement>(currentStep.fallbackSelector);
    }

    return element;
  }, [currentStep]);

  // Update spotlight position
  const updateSpotlightPosition = useCallback(() => {
    const element = findTargetElement();

    if (element) {
      const rect = element.getBoundingClientRect();
      setSpotlightRect({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
      setIsWaitingForElement(false);
    } else if (currentStep?.targetSelector) {
      // Element not found yet
      setSpotlightRect(null);

      if (currentStep.waitForElement) {
        setIsWaitingForElement(true);
      }
    }
  }, [findTargetElement, currentStep]);

  // Wait for element to appear in DOM
  useEffect(() => {
    if (!isActive || !currentStep) return;

    // Clear any existing timeout
    if (waitTimeoutRef.current) {
      clearTimeout(waitTimeoutRef.current);
    }

    // Centered modal steps (no target)
    if (!currentStep.targetSelector) {
      setSpotlightRect(null);
      setIsWaitingForElement(false);
      return;
    }

    // Try to find element immediately
    updateSpotlightPosition();

    // If waiting for element, poll for it
    if (currentStep.waitForElement) {
      const pollInterval = setInterval(() => {
        const element = findTargetElement();
        if (element) {
          updateSpotlightPosition();
          clearInterval(pollInterval);
        }
      }, 100);

      // Timeout after 5 seconds
      waitTimeoutRef.current = setTimeout(() => {
        clearInterval(pollInterval);
        setIsWaitingForElement(false);
        // Skip to next step if element never appeared
        if (!findTargetElement()) {
          console.warn(`[Onboarding] Element not found: ${currentStep.targetSelector}`);
          nextStep();
        }
      }, 5000);

      return () => {
        clearInterval(pollInterval);
        if (waitTimeoutRef.current) {
          clearTimeout(waitTimeoutRef.current);
        }
      };
    }
  }, [isActive, currentStep, updateSpotlightPosition, findTargetElement, nextStep]);

  // Scroll target element into view
  useEffect(() => {
    if (!isActive || !currentStep?.targetSelector) return;

    const element = findTargetElement();
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;

    if (!isInViewport) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Update position after scroll
      setTimeout(updateSpotlightPosition, 500);
    }
  }, [isActive, currentStep, findTargetElement, updateSpotlightPosition]);

  // Handle resize and scroll
  useEffect(() => {
    if (!isActive) return;

    const handleUpdate = () => {
      // Debounce position updates
      if (positionUpdateRef.current) {
        clearTimeout(positionUpdateRef.current);
      }
      positionUpdateRef.current = setTimeout(updateSpotlightPosition, 100);
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, { passive: true });

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
      if (positionUpdateRef.current) {
        clearTimeout(positionUpdateRef.current);
      }
    };
  }, [isActive, updateSpotlightPosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          nextStep();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevStep();
          break;
        case 'Escape':
          e.preventDefault();
          skipOnboarding();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextStep, prevStep, skipOnboarding]);

  // Don't render if not active
  if (!isActive || !currentStep) return null;

  // Show loading state while waiting for element
  if (isWaitingForElement) {
    return (
      <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70">
        <div className="text-white/70 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  const isCenteredModal = !currentStep.targetSelector;

  return (
    <>
      {/* Dark overlay with spotlight */}
      <OnboardingOverlay
        isVisible={!isCenteredModal}
        spotlightRect={spotlightRect}
        padding={currentStep.highlightPadding ?? 8}
      />

      {/* Tooltip */}
      <OnboardingTooltip
        step={currentStep}
        spotlightRect={spotlightRect}
        currentIndex={currentStepIndex}
        totalSteps={totalSteps}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipOnboarding}
        isCenteredModal={isCenteredModal}
      />
    </>
  );
};

export default Onboarding;
