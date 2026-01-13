import React from 'react';
import { m } from 'framer-motion';

/**
 * Horizontal dot progress indicator
 * Shows current step in the onboarding flow
 */

interface OnboardingProgressProps {
  currentIndex: number;
  totalSteps: number;
  onGoToStep?: (index: number) => void;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentIndex,
  totalSteps,
  onGoToStep,
}) => {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isActive = index === currentIndex;
        const isPast = index < currentIndex;

        return (
          <button
            key={index}
            onClick={() => onGoToStep?.(index)}
            disabled={!onGoToStep}
            className={`
              relative w-2 h-2 rounded-full transition-all duration-300
              ${onGoToStep ? 'cursor-pointer' : 'cursor-default'}
              ${isActive ? 'bg-sky-500' : isPast ? 'bg-sky-500/50' : 'bg-white/20'}
            `}
            aria-label={`Go to step ${index + 1}`}
            aria-current={isActive ? 'step' : undefined}
          >
            {isActive && (
              <m.div
                className="absolute inset-0 rounded-full bg-sky-500"
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.5, 1] }}
                transition={{
                  duration: 0.5,
                  ease: 'easeOut',
                }}
                style={{
                  boxShadow: '0 0 8px rgba(6, 182, 212, 0.6)',
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default OnboardingProgress;
