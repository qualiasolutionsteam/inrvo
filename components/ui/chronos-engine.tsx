import React, { useMemo } from 'react';

interface ChronosEngineProps {
  /** Size variant - 'avatar' for profile icon, 'loading' for full loading state, 'mini' for inline */
  variant?: 'avatar' | 'loading' | 'mini';
  /** Custom size in pixels (overrides variant size) */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show spark particles */
  showSparks?: boolean;
}

// Generate a random number within a range
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// Memoized spark generator to prevent recalculation on every render
const generateSparks = (count: number, radius: number) => {
  return [...Array(count)].map((_, i) => {
    const angle = random(0, Math.PI * 2);
    const spawnX = Math.cos(angle) * radius;
    const spawnY = Math.sin(angle) * radius;
    // Tangential travel direction
    const travelX = spawnX + (-spawnY * random(0.5, 1.5));
    const travelY = spawnY + (spawnX * random(0.5, 1.5));
    const duration = random(2, 5);
    const delay = random(0, 5);

    return { spawnX, spawnY, travelX, travelY, duration, delay, key: i };
  });
};

/**
 * ChronosEngine - Animated clockwork gear component
 * A procedurally animated clockwork simulation featuring rotating gears
 * and dynamic spark trails with a glowing mechanical core.
 */
export const ChronosEngine: React.FC<ChronosEngineProps> = ({
  variant = 'avatar',
  size,
  className = '',
  showSparks = true,
}) => {
  // Size configurations based on variant
  const sizeConfig = useMemo(() => {
    switch (variant) {
      case 'avatar':
        return {
          container: size || 32,
          core: 10,
          gear1: 28,
          gear2: 22,
          gear3: 18,
          sparkCount: 0,
          sparkRadius: 0,
        };
      case 'mini':
        return {
          container: size || 24,
          core: 8,
          gear1: 20,
          gear2: 16,
          gear3: 14,
          sparkCount: 0,
          sparkRadius: 0,
        };
      case 'loading':
      default:
        return {
          container: size || 200,
          core: 40,
          gear1: 180,
          gear2: 140,
          gear3: 100,
          sparkCount: 15,
          sparkRadius: 80,
        };
    }
  }, [variant, size]);

  // Scale factor for CSS values (based on loading size being 200px reference)
  const scale = sizeConfig.container / 200;

  // Generate sparks for loading variant
  const sparks = useMemo(() =>
    variant === 'loading' && showSparks
      ? generateSparks(sizeConfig.sparkCount, sizeConfig.sparkRadius)
      : [],
    [variant, showSparks, sizeConfig.sparkCount, sizeConfig.sparkRadius]
  );

  return (
    <div
      className={`chronos-engine relative ${className}`}
      style={{
        width: sizeConfig.container,
        height: sizeConfig.container,
      }}
    >
      {/* Power Core - Central glowing orb */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full z-10"
        style={{
          width: sizeConfig.core,
          height: sizeConfig.core,
          background: 'radial-gradient(circle, #fbbf24 0%, #f59e0b 40%, #d97706 70%, transparent 100%)',
          animation: variant === 'loading' ? 'core-pulse 8s ease-in-out infinite' : 'core-pulse 10s ease-in-out infinite',
          boxShadow: variant === 'loading'
            ? '0 0 20px #fbbf24, 0 0 40px #f59e0b, 0 0 60px #d97706'
            : `0 0 ${6 * scale}px #fbbf24, 0 0 ${12 * scale}px #f59e0b`,
        }}
      />

      {/* Gear 1 - Largest, slow rotation */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: sizeConfig.gear1,
          height: sizeConfig.gear1,
          border: `${Math.max(2, 4 * scale)}px solid rgba(251, 191, 36, 0.3)`,
          animation: 'rotate 180s linear infinite',
          opacity: 0.6,
        }}
      >
        {/* Gear teeth effect */}
        <div
          className="absolute rounded-full"
          style={{
            inset: -Math.max(8, 20 * scale),
            background: `conic-gradient(
              from 0deg,
              transparent 0deg, rgba(251, 191, 36, 0.4) 10deg, transparent 20deg,
              transparent 30deg, rgba(251, 191, 36, 0.4) 40deg, transparent 50deg,
              transparent 60deg, rgba(251, 191, 36, 0.4) 70deg, transparent 80deg,
              transparent 90deg, rgba(251, 191, 36, 0.4) 100deg, transparent 110deg,
              transparent 120deg, rgba(251, 191, 36, 0.4) 130deg, transparent 140deg,
              transparent 150deg, rgba(251, 191, 36, 0.4) 160deg, transparent 170deg,
              transparent 180deg, rgba(251, 191, 36, 0.4) 190deg, transparent 200deg,
              transparent 210deg, rgba(251, 191, 36, 0.4) 220deg, transparent 230deg,
              transparent 240deg, rgba(251, 191, 36, 0.4) 250deg, transparent 260deg,
              transparent 270deg, rgba(251, 191, 36, 0.4) 280deg, transparent 290deg,
              transparent 300deg, rgba(251, 191, 36, 0.4) 310deg, transparent 320deg,
              transparent 330deg, rgba(251, 191, 36, 0.4) 340deg, transparent 350deg,
              transparent 360deg
            )`,
          }}
        />
        {/* Inner ring */}
        <div
          className="absolute rounded-full"
          style={{
            inset: '20%',
            border: `${Math.max(1, 2 * scale)}px solid rgba(251, 191, 36, 0.2)`,
          }}
        />

        {/* Spark emitter for gear 1 */}
        {variant === 'loading' && showSparks && (
          <div className="absolute top-1/2 left-1/2">
            {sparks.map((spark) => (
              <div
                key={`g1-${spark.key}`}
                className="absolute rounded-full"
                style={{
                  width: 4,
                  height: 4,
                  background: '#fbbf24',
                  boxShadow: '0 0 6px #fbbf24, 0 0 12px #f59e0b',
                  animation: 'spark-travel linear infinite',
                  '--spawn-x': spark.spawnX,
                  '--spawn-y': spark.spawnY,
                  '--travel-x': spark.travelX,
                  '--travel-y': spark.travelY,
                  animationDuration: `${spark.duration}s`,
                  animationDelay: `${spark.delay}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}
      </div>

      {/* Gear 2 - Medium, counter-rotation */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: sizeConfig.gear2,
          height: sizeConfig.gear2,
          border: `${Math.max(2, 4 * scale)}px solid rgba(245, 158, 11, 0.3)`,
          animation: 'rotate 120s linear infinite reverse',
          opacity: 0.5,
        }}
      >
        {/* Gear teeth effect */}
        <div
          className="absolute rounded-full"
          style={{
            inset: -Math.max(6, 15 * scale),
            background: `conic-gradient(
              from 0deg,
              transparent 0deg, rgba(245, 158, 11, 0.35) 15deg, transparent 30deg,
              transparent 45deg, rgba(245, 158, 11, 0.35) 60deg, transparent 75deg,
              transparent 90deg, rgba(245, 158, 11, 0.35) 105deg, transparent 120deg,
              transparent 135deg, rgba(245, 158, 11, 0.35) 150deg, transparent 165deg,
              transparent 180deg, rgba(245, 158, 11, 0.35) 195deg, transparent 210deg,
              transparent 225deg, rgba(245, 158, 11, 0.35) 240deg, transparent 255deg,
              transparent 270deg, rgba(245, 158, 11, 0.35) 285deg, transparent 300deg,
              transparent 315deg, rgba(245, 158, 11, 0.35) 330deg, transparent 345deg,
              transparent 360deg
            )`,
          }}
        />
        {/* Inner ring */}
        <div
          className="absolute rounded-full"
          style={{
            inset: '25%',
            border: `${Math.max(1, 2 * scale)}px solid rgba(245, 158, 11, 0.15)`,
          }}
        />
      </div>

      {/* Gear 3 - Small, fast rotation */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: sizeConfig.gear3,
          height: sizeConfig.gear3,
          border: `${Math.max(1, 3 * scale)}px solid rgba(251, 191, 36, 0.35)`,
          animation: 'rotate 90s linear infinite',
          opacity: 0.7,
        }}
      >
        {/* Gear teeth effect */}
        <div
          className="absolute rounded-full"
          style={{
            inset: -Math.max(4, 12 * scale),
            background: `conic-gradient(
              from 0deg,
              transparent 0deg, rgba(251, 191, 36, 0.4) 20deg, transparent 40deg,
              transparent 60deg, rgba(251, 191, 36, 0.4) 80deg, transparent 100deg,
              transparent 120deg, rgba(251, 191, 36, 0.4) 140deg, transparent 160deg,
              transparent 180deg, rgba(251, 191, 36, 0.4) 200deg, transparent 220deg,
              transparent 240deg, rgba(251, 191, 36, 0.4) 260deg, transparent 280deg,
              transparent 300deg, rgba(251, 191, 36, 0.4) 320deg, transparent 340deg,
              transparent 360deg
            )`,
          }}
        />
      </div>
    </div>
  );
};

/**
 * ChronosAvatar - Compact avatar version for agent profile
 * Features the animated clockwork design in a small format
 */
export const ChronosAvatar: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 32,
}) => (
  <div
    className={`relative overflow-hidden rounded-full flex items-center justify-center ${className}`}
    style={{
      width: size,
      height: size,
      background: 'radial-gradient(circle, #1a1a2e 0%, #0f0f1a 100%)',
    }}
  >
    <ChronosEngine variant="avatar" size={size} showSparks={false} />
  </div>
);

/** Generation phase type for progress display */
export type GenerationPhase = 'idle' | 'thinking' | 'script' | 'voice' | 'ready';

/** Phase configuration with display info */
const PHASE_CONFIG: Record<GenerationPhase, { label: string; progress: number; color: string }> = {
  idle: { label: 'Ready', progress: 0, color: 'text-slate-400' },
  thinking: { label: 'Thinking...', progress: 15, color: 'text-amber-400/80' },
  script: { label: 'Creating meditation...', progress: 40, color: 'text-amber-400/80' },
  voice: { label: 'Generating audio...', progress: 75, color: 'text-sky-500/80' },
  ready: { label: 'Complete!', progress: 100, color: 'text-emerald-400' },
};

/**
 * ChronosLoader - Full loading state with message
 * Shows the complete clockwork animation with sparks
 * Supports generation phases for progress display
 */
export const ChronosLoader: React.FC<{
  message?: string;
  className?: string;
  size?: number;
  phase?: GenerationPhase;
  showProgress?: boolean;
}> = ({
  message,
  className = '',
  size = 200,
  phase = 'idle',
  showProgress = false,
}) => {
  const phaseConfig = PHASE_CONFIG[phase] || PHASE_CONFIG.idle;
  const displayMessage = message || (phase !== 'idle' ? phaseConfig.label : 'Processing...');

  return (
    <div className={`flex flex-col items-center gap-6 ${className}`}>
      <div
        className="relative"
        style={{
          background: 'radial-gradient(ellipse at center, #1a1a2e 0%, transparent 70%)',
          padding: 20,
          borderRadius: '50%',
        }}
      >
        <ChronosEngine variant="loading" size={size} />
      </div>

      {/* Progress bar (optional) */}
      {showProgress && phase !== 'idle' && (
        <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${phaseConfig.progress}%`,
              background: phase === 'ready'
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
            }}
          />
        </div>
      )}

      {displayMessage && (
        <span className={`text-sm font-medium animate-pulse ${phaseConfig.color}`}>
          {displayMessage}
        </span>
      )}
    </div>
  );
};

/**
 * ChronosMiniLoader - Inline loading indicator
 * Compact version for inline "thinking" states
 */
export const ChronosMiniLoader: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <ChronosAvatar size={24} />
    <span className="text-amber-400/60 text-sm">Thinking...</span>
  </div>
);

export default ChronosEngine;
