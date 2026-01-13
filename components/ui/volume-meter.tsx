/**
 * Volume Meter Component
 *
 * Displays real-time audio level with color-coded zones based on ElevenLabs IVC specs:
 * - Red (clipping): Peak > -3dB - too loud, may cause distortion
 * - Green (optimal): RMS -23 to -18 dB - ideal for voice cloning
 * - Cyan (good): RMS < -23dB - acceptable but could be louder
 * - Amber (quiet): RMS < -30dB - too quiet, may reduce clone quality
 * - Gray (silent): No audio detected
 */

import { cn } from "@/lib/utils";
import { type AudioLevelData, getLevelZone, getLevelZoneInfo } from "@/src/lib/audioAnalyzer";

interface VolumeMeterProps {
  /** Audio level data from AudioAnalyzer */
  levelData: AudioLevelData | null;
  /** Additional CSS classes */
  className?: string;
  /** Meter orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Show zone label */
  showLabel?: boolean;
  /** Show dB value */
  showDb?: boolean;
  /** Compact mode (smaller height/width) */
  compact?: boolean;
}

export function VolumeMeter({
  levelData,
  className,
  orientation = 'vertical',
  showLabel = true,
  showDb = false,
  compact = false,
}: VolumeMeterProps) {
  const zone = getLevelZone(levelData);
  const zoneInfo = getLevelZoneInfo(zone);

  // Calculate fill percentage based on RMS level (in dB)
  // Map -60dB to 0 -> 0%, 0dB -> 100%
  const getFillPercent = (): number => {
    if (!levelData) return 0;
    // Clamp between -60dB and 0dB, then map to 0-100%
    const clampedDb = Math.max(-60, Math.min(0, levelData.rmsDb));
    return ((clampedDb + 60) / 60) * 100;
  };

  // Get color based on zone
  const getZoneColor = (): string => {
    switch (zone) {
      case 'clipping':
        return 'bg-rose-500';
      case 'optimal':
        return 'bg-emerald-500';
      case 'good':
        return 'bg-sky-500';
      case 'quiet':
        return 'bg-amber-500';
      case 'silent':
      default:
        return 'bg-slate-500';
    }
  };

  // Get glow color for active states
  const getGlowColor = (): string => {
    switch (zone) {
      case 'clipping':
        return 'shadow-rose-500/50';
      case 'optimal':
        return 'shadow-emerald-500/50';
      case 'good':
        return 'shadow-sky-500/50';
      case 'quiet':
        return 'shadow-amber-500/50';
      default:
        return '';
    }
  };

  const fillPercent = getFillPercent();
  const isActive = fillPercent > 5;

  if (orientation === 'horizontal') {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        {/* Horizontal meter bar */}
        <div
          className={cn(
            "relative rounded-full overflow-hidden bg-white/10",
            compact ? "h-2 w-32" : "h-3 w-48"
          )}
        >
          {/* Fill bar */}
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-75",
              getZoneColor(),
              isActive && "shadow-lg",
              isActive && getGlowColor()
            )}
            style={{ width: `${fillPercent}%` }}
          />

          {/* Zone markers */}
          <div className="absolute inset-0 flex">
            {/* -30dB mark (quiet threshold) */}
            <div
              className="absolute h-full w-px bg-white/20"
              style={{ left: '50%' }} // -30dB is 50% of range
            />
            {/* -18dB mark (optimal threshold) */}
            <div
              className="absolute h-full w-px bg-emerald-400/40"
              style={{ left: '70%' }} // -18dB is 70% of range
            />
            {/* -3dB mark (clipping threshold) */}
            <div
              className="absolute h-full w-px bg-rose-400/40"
              style={{ left: '95%' }} // -3dB is 95% of range
            />
          </div>
        </div>

        {/* Labels */}
        {(showLabel || showDb) && (
          <div className="flex items-center justify-between text-xs">
            {showLabel && (
              <span className={cn("font-medium", zoneInfo.color)}>
                {zoneInfo.label}
              </span>
            )}
            {showDb && levelData && (
              <span className="text-slate-500 tabular-nums">
                {levelData.rmsDb.toFixed(0)}dB
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Vertical orientation (default)
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      {/* Vertical meter bar */}
      <div
        className={cn(
          "relative rounded-full overflow-hidden bg-white/10",
          compact ? "w-2 h-16" : "w-3 h-24"
        )}
      >
        {/* Fill bar (grows from bottom) */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 rounded-full transition-all duration-75",
            getZoneColor(),
            isActive && "shadow-lg",
            isActive && getGlowColor()
          )}
          style={{ height: `${fillPercent}%` }}
        />

        {/* Zone markers */}
        <div className="absolute inset-0 flex flex-col">
          {/* -3dB mark (clipping threshold) - near top */}
          <div
            className="absolute w-full h-px bg-rose-400/40"
            style={{ top: '5%' }}
          />
          {/* -18dB mark (optimal threshold) */}
          <div
            className="absolute w-full h-px bg-emerald-400/40"
            style={{ top: '30%' }}
          />
          {/* -30dB mark (quiet threshold) */}
          <div
            className="absolute w-full h-px bg-white/20"
            style={{ top: '50%' }}
          />
        </div>
      </div>

      {/* Labels */}
      {showLabel && (
        <span className={cn("text-xs font-medium", zoneInfo.color)}>
          {compact ? '' : zoneInfo.label}
        </span>
      )}
      {showDb && levelData && (
        <span className="text-xs text-slate-500 tabular-nums">
          {levelData.rmsDb.toFixed(0)}dB
        </span>
      )}
    </div>
  );
}

/**
 * Inline volume indicator - a simple dot/badge that changes color
 * Useful for showing recording status in compact spaces
 */
interface VolumeIndicatorProps {
  levelData: AudioLevelData | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export function VolumeIndicator({
  levelData,
  className,
  size = 'md',
  showPulse = true,
}: VolumeIndicatorProps) {
  const zone = getLevelZone(levelData);
  const zoneInfo = getLevelZoneInfo(zone);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const isActive = levelData && levelData.rmsDb > -60;

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "rounded-full transition-colors duration-75",
          sizeClasses[size],
          zoneInfo.bgColor
        )}
      />
      {showPulse && isActive && zone !== 'silent' && (
        <div
          className={cn(
            "absolute inset-0 rounded-full animate-ping",
            zoneInfo.bgColor,
            "opacity-75"
          )}
        />
      )}
    </div>
  );
}

/**
 * Volume level badge - shows zone label with color
 * Uses zone stabilization to prevent rapid twitching
 */
interface VolumeBadgeProps {
  levelData: AudioLevelData | null;
  className?: string;
  /** Minimum time (ms) a zone must be held before switching (default: 400ms) */
  stabilizationMs?: number;
}

import { useState, useEffect, useRef } from 'react';

export function VolumeBadge({ levelData, className, stabilizationMs = 400 }: VolumeBadgeProps) {
  const rawZone = getLevelZone(levelData);
  const [stableZone, setStableZone] = useState<ReturnType<typeof getLevelZone>>(rawZone);
  const pendingZoneRef = useRef<ReturnType<typeof getLevelZone>>(rawZone);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // If raw zone matches stable zone, no change needed
    if (rawZone === stableZone) {
      pendingZoneRef.current = rawZone;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // If raw zone is different from pending, reset the timer
    if (rawZone !== pendingZoneRef.current) {
      pendingZoneRef.current = rawZone;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      // Start timer to stabilize to this new zone
      timerRef.current = setTimeout(() => {
        setStableZone(pendingZoneRef.current);
        timerRef.current = null;
      }, stabilizationMs);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [rawZone, stableZone, stabilizationMs]);

  const zoneInfo = getLevelZoneInfo(stableZone);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
        "bg-white/5 border border-white/10 backdrop-blur-sm",
        "transition-all duration-300",
        className
      )}
    >
      <div className={cn(
        "w-2 h-2 rounded-full transition-colors duration-300",
        zoneInfo.bgColor
      )} />
      <span className={cn("transition-colors duration-300", zoneInfo.color)}>
        {zoneInfo.label}
      </span>
    </div>
  );
}
