import React, { useMemo, useRef, useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import type { OnboardingStep } from './steps';

/**
 * Enhanced tooltip with glass morphism and refined animations
 * Improved responsive positioning for all screen sizes
 */

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OnboardingTooltipProps {
  step: OnboardingStep;
  spotlightRect: SpotlightRect | null;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isCenteredModal?: boolean;
}

type ArrowDirection = 'top' | 'bottom' | 'left' | 'right';

// Check for reduced motion preference
const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

const tooltipVariants = prefersReducedMotion
  ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
  : {
      hidden: { opacity: 0, y: 12, scale: 0.96 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { delay: 0.1, duration: 0.35, ease: [0.32, 0.72, 0, 1] as const }
      },
      exit: {
        opacity: 0,
        y: -8,
        scale: 0.96,
        transition: { duration: 0.2, ease: 'easeIn' as const }
      }
    };

const modalVariants = prefersReducedMotion
  ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
  : {
      hidden: { opacity: 0, scale: 0.92, y: 20 },
      visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] as const }
      },
      exit: {
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.2 }
      }
    };

// Progress dots component
const ProgressDots: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div className="flex items-center gap-1.5">
    {Array.from({ length: total }).map((_, i) => (
      <m.div
        key={i}
        className={`rounded-full transition-all duration-300 ${
          i === current
            ? 'w-6 h-1.5 bg-sky-500'
            : i < current
              ? 'w-1.5 h-1.5 bg-sky-500/50'
              : 'w-1.5 h-1.5 bg-white/20'
        }`}
        initial={false}
        animate={{
          scale: i === current ? 1 : 0.9,
        }}
        transition={{ duration: 0.2 }}
      />
    ))}
  </div>
);

// Arrow component with improved styling
const Arrow: React.FC<{ direction: ArrowDirection }> = ({ direction }) => {
  const positions: Record<ArrowDirection, React.CSSProperties> = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)' },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%) rotate(180deg)' },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%) rotate(-90deg)' },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%) rotate(90deg)' },
  };

  return (
    <div
      className="absolute w-4 h-2 pointer-events-none"
      style={positions[direction]}
    >
      <svg width="16" height="8" viewBox="0 0 16 8" fill="none" className="drop-shadow-lg">
        <path
          d="M8 0L16 8H0L8 0Z"
          fill="rgba(15, 23, 42, 0.95)"
          stroke="rgba(6, 182, 212, 0.3)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
};

export const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  step,
  spotlightRect,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isCenteredModal = false,
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 320, height: 200 });
  const [isMobile, setIsMobile] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);

  // Detect mobile and track viewport
  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth < 640);
      setViewportHeight(window.innerHeight);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Measure tooltip size after render
  useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      setTooltipSize({ width: rect.width, height: rect.height });
    }
  }, [step.id, isMobile]);

  // Calculate position and arrow direction with improved mobile handling
  const { position, arrowDirection } = useMemo(() => {
    if (isCenteredModal || !spotlightRect) {
      return { position: { x: 0, y: 0 }, arrowDirection: 'bottom' as ArrowDirection };
    }

    const viewport = {
      width: typeof window !== 'undefined' ? window.innerWidth : 1920,
      height: viewportHeight || (typeof window !== 'undefined' ? window.innerHeight : 1080),
    };

    const safePadding = isMobile ? 12 : 16;
    const arrowSize = 10;
    const tooltipWidth = isMobile ? viewport.width - safePadding * 2 : Math.min(360, viewport.width - 32);
    const tooltipHeight = Math.min(tooltipSize.height, viewport.height * 0.4);

    // Calculate space in each direction
    const spaceAbove = spotlightRect.y - safePadding;
    const spaceBelow = viewport.height - spotlightRect.y - spotlightRect.height - safePadding;

    let direction: ArrowDirection = 'top';
    let x = safePadding;
    let y = 0;

    // Determine vertical position
    const needsSpace = tooltipHeight + arrowSize + 12;

    if (spaceBelow >= needsSpace) {
      direction = 'top';
      y = spotlightRect.y + spotlightRect.height + arrowSize + 8;
    } else if (spaceAbove >= needsSpace) {
      direction = 'bottom';
      y = spotlightRect.y - tooltipHeight - arrowSize - 8;
    } else {
      // Not enough space above or below - position in larger space
      if (spaceBelow > spaceAbove) {
        direction = 'top';
        y = spotlightRect.y + spotlightRect.height + arrowSize + 8;
      } else {
        direction = 'bottom';
        y = Math.max(safePadding, spotlightRect.y - tooltipHeight - arrowSize - 8);
      }
    }

    // Horizontal centering with bounds
    if (!isMobile) {
      x = Math.max(
        safePadding,
        Math.min(
          spotlightRect.x + spotlightRect.width / 2 - tooltipWidth / 2,
          viewport.width - tooltipWidth - safePadding
        )
      );
    }

    // Final bounds check
    y = Math.max(safePadding, Math.min(y, viewport.height - tooltipHeight - safePadding));

    return { position: { x, y }, arrowDirection: direction };
  }, [spotlightRect, tooltipSize, isMobile, isCenteredModal, viewportHeight]);

  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === totalSteps - 1;

  // Glass morphism base styles
  const glassStyles = `
    bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95
    backdrop-blur-xl
    border border-white/10
    shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(6,182,212,0.1),inset_0_1px_0_rgba(255,255,255,0.05)]
  `;

  // Centered modal for welcome/complete steps
  if (isCenteredModal) {
    return (
      <AnimatePresence mode="wait">
        <m.div
          key={step.id}
          className="fixed inset-0 z-[88] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <m.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <m.div
            ref={tooltipRef}
            className={`onboarding-tooltip relative rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-[340px] sm:max-w-md w-full ${glassStyles}`}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label={step.title}
            style={{ contain: 'layout paint' }}
          >
            {/* Decorative gradient border */}
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl p-[1px] -z-10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-500/20 via-transparent to-purple-500/20" />
            </div>

            {/* Close button */}
            <button
              onClick={onSkip}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-95"
              aria-label="Skip tour"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="text-center pt-2">
              {/* Icon for welcome/complete */}
              {(step.id === 'welcome' || step.id === 'complete') && (
                <m.div
                  className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-sky-600/10 mb-4"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                >
                  <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-sky-500" />
                </m.div>
              )}

              <m.h2
                className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {step.title}
              </m.h2>
              <m.p
                className="text-white/60 text-sm sm:text-base leading-relaxed mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {step.description}
              </m.p>
            </div>

            {/* Progress and Navigation */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-center">
                <ProgressDots current={currentIndex} total={totalSteps} />
              </div>

              <div className="flex items-center justify-between gap-3">
                {isFirstStep ? (
                  <button
                    onClick={onSkip}
                    className="px-4 py-2.5 text-sm text-white/50 hover:text-white transition-colors"
                  >
                    Skip
                  </button>
                ) : (
                  <button
                    onClick={onPrev}
                    className="flex items-center gap-1 px-3 py-2.5 text-sm text-white/60 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Back</span>
                  </button>
                )}

                <m.button
                  onClick={onNext}
                  className="flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 text-white font-medium text-sm shadow-lg shadow-sky-500/25 min-w-[100px]"
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(6, 182, 212, 0.35)' }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                >
                  {isLastStep ? "Let's Go" : 'Next'}
                  {!isLastStep && <ChevronRight className="w-4 h-4" />}
                </m.button>
              </div>
            </div>
          </m.div>
        </m.div>
      </AnimatePresence>
    );
  }

  // Positioned tooltip
  return (
    <AnimatePresence mode="wait">
      <m.div
        key={step.id}
        ref={tooltipRef}
        className={`onboarding-tooltip fixed z-[88] rounded-xl sm:rounded-2xl p-4 sm:p-5 ${glassStyles}`}
        variants={tooltipVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        style={{
          left: position.x,
          top: position.y,
          width: isMobile ? `calc(100vw - 24px)` : 360,
          maxWidth: isMobile ? `calc(100vw - 24px)` : 380,
          contain: 'layout paint',
        }}
      >
        {/* Arrow */}
        <Arrow direction={arrowDirection} />

        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-95"
          aria-label="Skip tour"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="pr-6 sm:pr-8">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-1.5 sm:mb-2">{step.title}</h3>
          <p className="text-white/60 text-xs sm:text-sm leading-relaxed">{step.description}</p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/5">
          <div className="flex items-center gap-1">
            {!isFirstStep && (
              <button
                onClick={onPrev}
                className="flex items-center gap-0.5 px-2 py-1.5 text-xs sm:text-sm text-white/60 hover:text-white transition-colors active:scale-95"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}
          </div>

          <ProgressDots current={currentIndex} total={totalSteps} />

          <m.button
            onClick={onNext}
            className="flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 text-white font-medium text-xs sm:text-sm shadow-lg shadow-sky-500/20"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            {isLastStep ? 'Done' : 'Next'}
            {!isLastStep && <ChevronRight className="w-3.5 h-3.5" />}
          </m.button>
        </div>
      </m.div>
    </AnimatePresence>
  );
};

export default OnboardingTooltip;
