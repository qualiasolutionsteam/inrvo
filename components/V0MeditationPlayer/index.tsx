import React, { useCallback, memo, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, RotateCcw, RotateCw, ChevronUp, Music, Mic } from 'lucide-react';
import { ICONS } from '../../constants';

/**
 * V0 Meditation Player - Clean, focused playback experience
 *
 * Fully responsive design optimized for:
 * - Mobile (320px+): Compact layout, smaller orb, minimal padding
 * - Tablet (768px+): Medium layout with more breathing room
 * - Desktop (1024px+): Full experience with larger visualizations
 */

// Helper to render icon from icon name
const renderNatureIcon = (iconName: string | undefined, className: string = "w-4 h-4") => {
  if (!iconName) {
    return <ICONS.Leaf className={className} />;
  }
  const IconComponent = ICONS[iconName as keyof typeof ICONS];
  if (IconComponent) {
    return <IconComponent className={className} />;
  }
  return <ICONS.Leaf className={className} />;
};

// Mobile detection for performance optimization
const IS_MOBILE = typeof window !== 'undefined' && (
  window.matchMedia?.('(max-width: 768px)').matches ||
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
);

// Low-power mode detection
const PREFERS_REDUCED_MOTION = typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Optimized particle counts - heavily reduced on mobile
const PARTICLE_COUNT = PREFERS_REDUCED_MOTION ? 3 : (IS_MOBILE ? 4 : 12);
const ORBIT_PARTICLE_COUNT = PREFERS_REDUCED_MOTION ? 3 : (IS_MOBILE ? 4 : 10);

/**
 * Premium Volume Slider - Minimalistic vertical control
 * - Thin 3px track for elegant appearance
 * - CSS transform animations for GPU acceleration
 * - 44px touch container for proper touch targets
 * - Circular thumb with subtle glow
 */
interface VolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
  color: 'cyan' | 'emerald' | 'blue';
  disabled?: boolean;
  icon?: React.ReactNode;
}

const PremiumVolumeSlider = memo(({ value, onChange, color, disabled = false, icon }: VolumeSliderProps) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Refined color schemes with reduced visual noise
  const schemes = {
    cyan: {
      fill: 'bg-cyan-400',
      track: 'bg-white/[0.06]',
      thumb: 'bg-cyan-400',
      glow: 'shadow-[0_0_8px_rgba(34,211,238,0.4)]',
    },
    emerald: {
      fill: 'bg-emerald-400',
      track: 'bg-white/[0.06]',
      thumb: 'bg-emerald-400',
      glow: 'shadow-[0_0_8px_rgba(52,211,153,0.4)]',
    },
    blue: {
      fill: 'bg-blue-400',
      track: 'bg-white/[0.06]',
      thumb: 'bg-blue-400',
      glow: 'shadow-[0_0_8px_rgba(96,165,250,0.4)]',
    },
  };

  const scheme = schemes[color];

  const updateValueFromPointer = useCallback((e: React.PointerEvent | PointerEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const newValue = Math.max(0, Math.min(1, 1 - y / height));
    onChange(Math.round(newValue * 20) / 20); // 5% increments
  }, [onChange]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateValueFromPointer(e);
  }, [disabled, updateValueFromPointer]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || disabled) return;
    updateValueFromPointer(e);
  }, [disabled, updateValueFromPointer]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  return (
    <div className={`flex flex-col items-center gap-2 ${disabled ? 'opacity-30' : ''}`}>
      {/* Icon above slider */}
      {icon && (
        <div className={`p-1.5 rounded-lg ${
          color === 'cyan' ? 'text-cyan-400' :
          color === 'emerald' ? 'text-emerald-400' :
          'text-blue-400'
        }`}>
          {icon}
        </div>
      )}
      {/* 44px touch container with 3px visual track */}
      <div
        ref={sliderRef}
        className="relative touch-none cursor-pointer flex items-center justify-center"
        style={{ width: 44, height: IS_MOBILE ? 80 : 100 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Thin elegant track */}
        <div className={`absolute w-[3px] h-full rounded-full ${scheme.track}`} />

        {/* Fill - CSS scaleY for GPU acceleration */}
        <div
          className={`absolute bottom-0 w-[3px] rounded-full ${scheme.fill} origin-bottom`}
          style={{
            height: '100%',
            transform: `scaleY(${value})`,
            transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {/* Circular thumb with subtle glow */}
        <div
          className={`absolute w-3.5 h-3.5 rounded-full ${scheme.thumb} ${scheme.glow}`}
          style={{
            bottom: `calc(${value * 100}% - 7px)`,
            transition: 'bottom 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  );
});

PremiumVolumeSlider.displayName = 'PremiumVolumeSlider';

/**
 * Premium Progress Bar - Minimalistic seek control
 * - 2px default height, expands to 6px on interaction
 * - CSS transform animations for GPU acceleration
 * - Time preview tooltip on hover
 * - Smooth thumb appearance on expand
 */
interface PremiumProgressBarProps {
  progress: number;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  disabled?: boolean;
  formatTime: (seconds: number) => string;
}

const PremiumProgressBar = memo(({
  progress,
  currentTime,
  duration,
  onSeek,
  disabled = false,
  formatTime,
}: PremiumProgressBarProps) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPercent, setHoverPercent] = useState(0);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (disabled || !barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    onSeek(percent * duration);
  }, [disabled, duration, onSeek]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPercent(percent * 100);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!disabled) {
      setIsHovering(true);
      setIsExpanded(true);
    }
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setIsExpanded(false);
  }, []);

  const handleTouchStart = useCallback(() => {
    if (!disabled) setIsExpanded(true);
  }, [disabled]);

  const handleTouchEnd = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const hoverTime = (hoverPercent / 100) * duration;

  return (
    <div className="relative w-full px-1">
      {/* Time preview tooltip */}
      <AnimatePresence>
        {isHovering && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute -top-8 px-2 py-1 rounded-md bg-white/10 backdrop-blur-sm text-xs text-white/80 font-mono pointer-events-none z-10"
            style={{ left: `${hoverPercent}%`, transform: 'translateX(-50%)' }}
          >
            {formatTime(hoverTime)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar container - expands on interaction */}
      <div
        ref={barRef}
        className={`relative w-full rounded-full overflow-hidden ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{
          height: isExpanded ? 6 : 2,
          transition: 'height 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Fill - CSS scaleX for GPU acceleration */}
        <div
          className="absolute inset-y-0 left-0 bg-white/80 rounded-full origin-left"
          style={{
            width: '100%',
            transform: `scaleX(${Math.max(progress, 0.1) / 100})`,
            transition: 'transform 100ms linear',
          }}
        />

        {/* Hover position indicator */}
        {isHovering && !disabled && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/40"
            style={{ left: `${hoverPercent}%` }}
          />
        )}

        {/* Thumb - visible when expanded */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-opacity duration-150 ${
            isExpanded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            left: `calc(${progress}% - 6px)`,
            transition: 'left 100ms linear, opacity 150ms ease',
          }}
        />
      </div>
    </div>
  );
});

PremiumProgressBar.displayName = 'PremiumProgressBar';

interface MeditationPlayerProps {
  isPlaying: boolean;
  isBuffering?: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
  onClose: () => void;
  backgroundMusicEnabled?: boolean;
  backgroundVolume: number;
  onBackgroundVolumeChange: (volume: number) => void;
  onBackgroundMusicToggle?: () => void;
  backgroundTrackName?: string;
  natureSoundEnabled?: boolean;
  natureSoundVolume?: number;
  onNatureSoundVolumeChange?: (volume: number) => void;
  natureSoundName?: string;
  natureSoundIcon?: string;
  onOpenNatureSoundModal?: () => void;
  voiceVolume?: number;
  onVoiceVolumeChange?: (volume: number) => void;
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
  userId?: string;
  voiceId?: string;
  voiceName?: string;
  meditationType?: string;
  onSleepTimer?: () => void;
}

const V0MeditationPlayer: React.FC<MeditationPlayerProps> = memo(({
  isPlaying,
  isBuffering = false,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onSkip,
  onClose,
  backgroundMusicEnabled = false,
  backgroundVolume,
  onBackgroundVolumeChange,
  onBackgroundMusicToggle,
  backgroundTrackName,
  natureSoundEnabled = false,
  natureSoundVolume = 0.4,
  onNatureSoundVolumeChange,
  natureSoundName,
  natureSoundIcon,
  onOpenNatureSoundModal,
  voiceVolume = 0.7,
  onVoiceVolumeChange,
}) => {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const [showControls, setShowControls] = useState(false);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-[#020617] overflow-hidden">
      {/* Background gradient */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'linear-gradient(135deg, #020617 0%, #0c1929 50%, #020617 100%)',
            'linear-gradient(135deg, #020617 0%, #0c1929 60%, #020617 100%)',
            'linear-gradient(135deg, #020617 0%, #0c1929 40%, #020617 100%)',
          ],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating particles */}
      <FloatingParticles />

      {/* Main content - scrollable container */}
      <div className="relative z-10 h-full overflow-y-auto overscroll-contain">
        <div className="min-h-full flex flex-col px-3 xs:px-4 sm:px-6 py-4 safe-top safe-bottom">

          {/* Close button - fixed position feel */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="flex-shrink-0 self-start h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center rounded-full bg-white/5 text-white/60 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white/80 mt-2"
            aria-label="Close player"
          >
            <X className="h-5 w-5" />
          </motion.button>

          {/* Center section - orb + time (centered in available space) */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-0">
            {/* Breathing orb - responsive sizing */}
            <div className="flex-shrink-0">
              <BreathingOrb isPlaying={isBuffering ? true : isPlaying} />
            </div>

            {/* Time display */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center mt-8 sm:mt-10"
            >
              <p className="font-mono text-xs sm:text-sm text-white/50">
                {isBuffering ? (
                  <span className="animate-pulse">Preparing your meditation</span>
                ) : (
                  `${formatTime(currentTime)} / ${formatTime(duration)}`
                )}
              </p>
            </motion.div>
          </div>

          {/* Controls section - pushed up */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex-shrink-0 w-full max-w-md mx-auto space-y-3 sm:space-y-4 pb-2 sm:pb-4"
          >
            {/* Progress bar - Premium minimalist design */}
            <PremiumProgressBar
              progress={progress}
              currentTime={currentTime}
              duration={duration}
              onSeek={onSeek}
              disabled={isBuffering}
              formatTime={formatTime}
            />

            {/* Playback controls with sound toggles */}
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              {/* Nature Sound Circle - Left side */}
              {onOpenNatureSoundModal && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onOpenNatureSoundModal}
                  className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full transition-all ${
                    natureSoundEnabled
                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                      : 'bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.08]'
                  }`}
                  aria-label="Nature sounds"
                >
                  {renderNatureIcon(natureSoundIcon, "h-4 w-4 sm:h-5 sm:w-5")}
                </motion.button>
              )}

              {/* Rewind 15s */}
              <motion.button
                whileTap={!isBuffering ? { scale: 0.9 } : undefined}
                onClick={isBuffering ? undefined : () => onSkip(-15)}
                disabled={isBuffering}
                className={`relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-all ${
                  isBuffering
                    ? 'text-white/20 cursor-not-allowed'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/5 active:bg-white/10'
                }`}
                aria-label="Skip back 15 seconds"
              >
                <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="absolute -bottom-0.5 text-[9px] sm:text-[10px] font-medium">15</span>
              </motion.button>

              {/* Play/Pause */}
              <motion.button
                whileTap={!isBuffering ? { scale: 0.92 } : undefined}
                onClick={isBuffering ? undefined : onPlayPause}
                disabled={isBuffering}
                className={`flex h-14 w-14 sm:h-16 sm:w-16 md:h-18 md:w-18 items-center justify-center rounded-full text-white backdrop-blur-sm transition-all ${
                  isBuffering
                    ? 'bg-white/10 cursor-wait'
                    : isPlaying
                      ? 'bg-white/15 shadow-[0_0_25px_rgba(34,211,238,0.2)]'
                      : 'bg-white/10 hover:bg-white/20'
                }`}
                aria-label={isBuffering ? 'Generating...' : isPlaying ? 'Pause' : 'Play'}
              >
                <AnimatePresence mode="wait">
                  {isBuffering ? (
                    <motion.div key="loading" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <div className="h-6 w-6 sm:h-7 sm:w-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </motion.div>
                  ) : isPlaying ? (
                    <motion.div key="pause" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Pause className="h-6 w-6 sm:h-7 sm:w-7 fill-white" />
                    </motion.div>
                  ) : (
                    <motion.div key="play" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Play className="ml-0.5 sm:ml-1 h-6 w-6 sm:h-7 sm:w-7 fill-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Forward 15s */}
              <motion.button
                whileTap={!isBuffering ? { scale: 0.9 } : undefined}
                onClick={isBuffering ? undefined : () => onSkip(15)}
                disabled={isBuffering}
                className={`relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-all ${
                  isBuffering
                    ? 'text-white/20 cursor-not-allowed'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/5 active:bg-white/10'
                }`}
                aria-label="Skip forward 15 seconds"
              >
                <RotateCw className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="absolute -bottom-0.5 text-[9px] sm:text-[10px] font-medium">15</span>
              </motion.button>

              {/* Music Circle - Right side */}
              {onBackgroundMusicToggle && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onBackgroundMusicToggle}
                  className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full transition-all ${
                    backgroundMusicEnabled
                      ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                      : 'bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.08]'
                  }`}
                  aria-label="Background music"
                >
                  <Music className="h-4 w-4 sm:h-5 sm:w-5" />
                </motion.button>
              )}
            </div>

            {/* Expand controls toggle */}
            <div className="flex items-center justify-center pt-1 sm:pt-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowControls(!showControls)}
                className="flex items-center justify-center p-2 opacity-60 hover:opacity-100 transition-opacity"
                aria-label={showControls ? 'Hide sound controls' : 'Show sound controls'}
              >
                <motion.div animate={{ rotate: showControls ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
                </motion.div>
              </motion.button>
            </div>

            {/* Volume Controls Panel */}
            <AnimatePresence>
              {showControls && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="overflow-hidden"
                >
                  <div className="py-4 px-4 sm:px-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                    {/* Premium Volume Sliders - Icons only, no text labels */}
                    <div className="flex items-start justify-center gap-6 sm:gap-8">
                      {/* Voice Volume Slider */}
                      {onVoiceVolumeChange && (
                        <PremiumVolumeSlider
                          value={voiceVolume}
                          onChange={onVoiceVolumeChange}
                          color="cyan"
                          icon={<Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
                        />
                      )}

                      {/* Nature Sound Slider - only when active */}
                      {natureSoundEnabled && onNatureSoundVolumeChange && (
                        <PremiumVolumeSlider
                          value={natureSoundVolume}
                          onChange={onNatureSoundVolumeChange}
                          color="emerald"
                          icon={renderNatureIcon(natureSoundIcon, "w-4 h-4 sm:w-5 sm:h-5")}
                        />
                      )}

                      {/* Music Volume Slider */}
                      <PremiumVolumeSlider
                        value={backgroundVolume}
                        onChange={onBackgroundVolumeChange}
                        color="blue"
                        disabled={!backgroundMusicEnabled}
                        icon={<Music className="w-4 h-4 sm:w-5 sm:h-5" />}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
});

V0MeditationPlayer.displayName = 'V0MeditationPlayer';

/**
 * BreathingOrb - Mesmerizing breathing visualization
 * Larger, centered, with ethereal glow effects
 */
const BreathingOrb = memo(({ isPlaying }: { isPlaying: boolean }) => {
  const orbitParticles = useMemo(() =>
    [...Array(ORBIT_PARTICLE_COUNT)].map((_, i) => ({
      id: i,
      angle: (i / ORBIT_PARTICLE_COUNT) * 360,
      orbitRadius: 90 + (i % 2) * 15,
      size: 2 + Math.random() * 2.5,
      duration: 25 + Math.random() * 15,
    })),
    []
  );

  return (
    <div className="relative flex items-center justify-center">
      {/* Layer 5: Outer ethereal ring - pulses slowly */}
      <motion.div
        className="absolute w-[260px] h-[260px] xs:w-[300px] xs:h-[300px] sm:w-[380px] sm:h-[380px] md:w-[440px] md:h-[440px] rounded-full"
        style={{
          border: '1px solid rgba(34, 211, 238, 0.1)',
          background: 'transparent',
        }}
        animate={isPlaying ? {
          scale: [1, 1.05, 1],
          opacity: [0.3, 0.6, 0.3],
          borderColor: [
            'rgba(34, 211, 238, 0.1)',
            'rgba(34, 211, 238, 0.25)',
            'rgba(34, 211, 238, 0.1)',
          ],
        } : { scale: 1, opacity: 0.15 }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Layer 4: Ambient Glow - larger and more ethereal */}
      <motion.div
        className="absolute w-[240px] h-[240px] xs:w-[280px] xs:h-[280px] sm:w-[340px] sm:h-[340px] md:w-[400px] md:h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.08) 50%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={isPlaying ? {
          scale: [1, 1.12, 1.12, 1],
          opacity: [0.4, 0.7, 0.7, 0.4],
        } : { scale: 1, opacity: 0.25 }}
        transition={{
          duration: 19,
          times: [0, 0.21, 0.58, 1],
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Layer 3: Particle Orbit - larger orbit */}
      <div className="absolute w-[200px] h-[200px] xs:w-[220px] xs:h-[220px] sm:w-[260px] sm:h-[260px] md:w-[300px] md:h-[300px]">
        {orbitParticles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute left-1/2 top-1/2"
            style={{
              width: particle.size,
              height: particle.size,
              marginLeft: -particle.size / 2,
              marginTop: -particle.size / 2,
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(34, 211, 238, 0.7) 100%)',
              borderRadius: '50%',
              boxShadow: `0 0 ${particle.size * 3}px rgba(34, 211, 238, 0.5)`,
            }}
            animate={isPlaying ? {
              x: [
                Math.cos(particle.angle * Math.PI / 180) * particle.orbitRadius,
                Math.cos((particle.angle + 180) * Math.PI / 180) * particle.orbitRadius,
                Math.cos(particle.angle * Math.PI / 180) * particle.orbitRadius,
              ],
              y: [
                Math.sin(particle.angle * Math.PI / 180) * particle.orbitRadius,
                Math.sin((particle.angle + 180) * Math.PI / 180) * particle.orbitRadius,
                Math.sin(particle.angle * Math.PI / 180) * particle.orbitRadius,
              ],
              opacity: [0.4, 0.9, 0.4],
            } : {
              x: Math.cos(particle.angle * Math.PI / 180) * particle.orbitRadius,
              y: Math.sin(particle.angle * Math.PI / 180) * particle.orbitRadius,
              opacity: 0.2,
            }}
            transition={{ duration: particle.duration, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </div>

      {/* Layer 2: Main Orb - larger with glass morphism effect */}
      <motion.div
        className="relative w-[160px] h-[160px] xs:w-[180px] xs:h-[180px] sm:w-[220px] sm:h-[220px] md:w-[260px] md:h-[260px] rounded-full flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.1) 0%, rgba(34, 211, 238, 0.15) 30%, rgba(59, 130, 246, 0.1) 60%, rgba(14, 165, 233, 0.08) 100%)',
          boxShadow: 'inset 0 0 60px rgba(34, 211, 238, 0.1), inset 0 0 100px rgba(59, 130, 246, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
        animate={isPlaying ? {
          scale: [1, 1.12, 1.12, 1],
          filter: [
            'drop-shadow(0 0 40px rgba(34, 211, 238, 0.3))',
            'drop-shadow(0 0 70px rgba(34, 211, 238, 0.5))',
            'drop-shadow(0 0 70px rgba(34, 211, 238, 0.5))',
            'drop-shadow(0 0 40px rgba(34, 211, 238, 0.3))',
          ],
        } : {
          scale: 1,
          filter: 'drop-shadow(0 0 25px rgba(34, 211, 238, 0.2))',
        }}
        transition={{
          duration: 19,
          times: [0, 0.21, 0.58, 1],
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Inner glow layer */}
        <motion.div
          className="absolute inset-4 xs:inset-5 sm:inset-6 md:inset-8 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.25) 0%, rgba(59, 130, 246, 0.1) 60%, transparent 100%)',
            filter: 'blur(8px)',
          }}
          animate={isPlaying ? { opacity: [0.5, 0.9, 0.9, 0.5] } : { opacity: 0.35 }}
          transition={{ duration: 19, times: [0, 0.21, 0.58, 1], repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Inner ring */}
        <div
          className="absolute inset-8 xs:inset-10 sm:inset-12 md:inset-14 rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.08) 0%, rgba(34, 211, 238, 0.1) 50%, rgba(59, 130, 246, 0.05) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        />
      </motion.div>

      {/* Layer 1: Inner Core - luminous center */}
      <motion.div
        className="absolute w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full z-10"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(34, 211, 238, 0.7) 40%, rgba(59, 130, 246, 0.3) 70%, transparent 100%)',
          boxShadow: '0 0 30px rgba(255, 255, 255, 0.6), 0 0 60px rgba(34, 211, 238, 0.4), 0 0 100px rgba(34, 211, 238, 0.2)',
        }}
        animate={isPlaying ? {
          scale: [1, 1.08, 1],
          opacity: [0.85, 1, 0.85],
        } : { scale: 1, opacity: 0.65 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Center bright dot */}
      <motion.div
        className="absolute w-3 h-3 sm:w-4 sm:h-4 rounded-full z-20"
        style={{
          background: 'radial-gradient(circle, white 0%, rgba(34, 211, 238, 0.95) 100%)',
          boxShadow: '0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px rgba(34, 211, 238, 0.7)',
        }}
        animate={isPlaying ? {
          scale: [1, 1.15, 1],
          boxShadow: [
            '0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px rgba(34, 211, 238, 0.7)',
            '0 0 25px rgba(255, 255, 255, 1), 0 0 50px rgba(34, 211, 238, 0.9)',
            '0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px rgba(34, 211, 238, 0.7)',
          ],
        } : {}}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
});

BreathingOrb.displayName = 'BreathingOrb';

/**
 * FloatingParticles - Ambient background effect
 */
const FloatingParticles = memo(() => {
  const particles = useMemo(() => [...Array(PARTICLE_COUNT)].map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 10,
    color: i % 3 === 0 ? 'rgba(34, 211, 238, 0.35)' : i % 3 === 1 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.2)',
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            background: particle.color,
          }}
          animate={{
            y: [0, -25, 0],
            opacity: [0.1, 0.4, 0.1],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
});

FloatingParticles.displayName = 'FloatingParticles';

export default V0MeditationPlayer;
