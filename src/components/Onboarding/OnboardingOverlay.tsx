import React, { useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';

/**
 * Dark overlay with animated spotlight cutout
 * Enhanced glass morphism with subtle glow effects
 */

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OnboardingOverlayProps {
  isVisible: boolean;
  spotlightRect: SpotlightRect | null;
  padding?: number;
  onClick?: () => void;
}

// Check for reduced motion preference
const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

const overlayVariants = prefersReducedMotion
  ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
  : {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] as const }
      },
      exit: {
        opacity: 0,
        transition: { duration: 0.25, ease: 'easeIn' as const }
      }
    };

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  isVisible,
  spotlightRect,
  padding = 8,
  onClick,
}) => {
  // Calculate padded spotlight dimensions
  const paddedRect = useMemo(() => {
    if (!spotlightRect) return null;
    return {
      x: spotlightRect.x - padding,
      y: spotlightRect.y - padding,
      width: spotlightRect.width + padding * 2,
      height: spotlightRect.height + padding * 2,
    };
  }, [spotlightRect, padding]);

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          className="onboarding-overlay fixed inset-0 z-[85] pointer-events-auto"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClick}
          style={{ contain: 'strict' }}
        >
          {/* Background gradient for depth */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.85) 100%)',
            }}
          />

          <svg
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: 'none' }}
          >
            <defs>
              <mask id="onboarding-spotlight-mask">
                {/* White = visible overlay, Black = cutout */}
                <rect fill="white" width="100%" height="100%" />
                {paddedRect && (
                  <m.rect
                    fill="black"
                    rx="16"
                    initial={prefersReducedMotion ? paddedRect : {
                      x: paddedRect.x + paddedRect.width / 2,
                      y: paddedRect.y + paddedRect.height / 2,
                      width: 0,
                      height: 0,
                      opacity: 0,
                    }}
                    animate={{
                      x: paddedRect.x,
                      y: paddedRect.y,
                      width: paddedRect.width,
                      height: paddedRect.height,
                      opacity: 1,
                    }}
                    transition={prefersReducedMotion ? { duration: 0 } : {
                      duration: 0.5,
                      ease: [0.32, 0.72, 0, 1],
                    }}
                  />
                )}
              </mask>

              {/* Glow filter for spotlight ring */}
              <filter id="spotlight-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Dark overlay with mask applied */}
            <rect
              fill="black"
              fillOpacity="0.7"
              width="100%"
              height="100%"
              mask="url(#onboarding-spotlight-mask)"
              style={{ pointerEvents: 'auto' }}
            />
          </svg>

          {/* Animated spotlight ring with glow */}
          {paddedRect && (
            <>
              {/* Outer glow */}
              <m.div
                className="absolute pointer-events-none rounded-2xl"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
                style={{
                  left: paddedRect.x - 8,
                  top: paddedRect.y - 8,
                  width: paddedRect.width + 16,
                  height: paddedRect.height + 16,
                  boxShadow: `
                    0 0 0 1px rgba(6, 182, 212, 0.2),
                    0 0 30px rgba(6, 182, 212, 0.15),
                    0 0 60px rgba(6, 182, 212, 0.1),
                    inset 0 0 20px rgba(6, 182, 212, 0.05)
                  `,
                }}
              />

              {/* Inner ring with animated pulse */}
              <m.div
                className="absolute pointer-events-none rounded-2xl"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{
                  delay: 0.3,
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                style={{
                  left: paddedRect.x - 2,
                  top: paddedRect.y - 2,
                  width: paddedRect.width + 4,
                  height: paddedRect.height + 4,
                  border: '2px solid rgba(6, 182, 212, 0.5)',
                  boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
                }}
              />
            </>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingOverlay;
