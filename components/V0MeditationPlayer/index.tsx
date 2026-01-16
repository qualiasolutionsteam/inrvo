import React, { useCallback, memo, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, RotateCcw, RotateCw, ChevronUp, Volume2, Music } from 'lucide-react';
import { ICONS } from '../../constants';

/**
 * V0 Meditation Player - Clean, focused playback experience
 *
 * No script text display - pure playback controls and visualization
 * Integrated with Supabase for meditation history
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
  return <ICONS.Leaf className={className} />; // Fallback
};

// Module-level constants to avoid recreating on each render
// Mobile detection for performance optimization
const IS_MOBILE = typeof window !== 'undefined' && (
  window.matchMedia?.('(max-width: 768px)').matches ||
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
);

// Low-power mode detection for additional optimization
const PREFERS_REDUCED_MOTION = typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Optimized particle counts for smooth 60fps - reduced on mobile and when reduced motion preferred
const PARTICLE_COUNT = PREFERS_REDUCED_MOTION ? 4 : (IS_MOBILE ? 6 : 16);
const ORBIT_PARTICLE_COUNT = PREFERS_REDUCED_MOTION ? 4 : (IS_MOBILE ? 6 : 12);

/**
 * PremiumVolumeSlider - Minimalist vertical volume control
 *
 * Features:
 * - Vertical slider with smooth drag interaction
 * - Elegant glow effects and gradient fills
 * - Touch-friendly large hit area
 * - Visual feedback with haptic-feel animations
 */
interface VolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  icon: React.ReactNode;
  color: 'cyan' | 'emerald' | 'blue';
  disabled?: boolean;
}

const PremiumVolumeSlider = memo(({ value, onChange, label, icon, color, disabled = false }: VolumeSliderProps) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const colorSchemes = {
    cyan: {
      gradient: 'from-cyan-400 to-sky-500',
      glow: 'rgba(34, 211, 238, 0.5)',
      track: 'bg-cyan-500/20',
      text: 'text-cyan-400',
      iconBg: 'bg-cyan-500/10',
    },
    emerald: {
      gradient: 'from-emerald-400 to-teal-500',
      glow: 'rgba(52, 211, 153, 0.5)',
      track: 'bg-emerald-500/20',
      text: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
    },
    blue: {
      gradient: 'from-blue-400 to-indigo-500',
      glow: 'rgba(96, 165, 250, 0.5)',
      track: 'bg-blue-500/20',
      text: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
    },
  };

  const scheme = colorSchemes[color];

  const updateValueFromPointer = useCallback((e: React.PointerEvent | PointerEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    // Invert because 0 is at bottom, 1 is at top
    const newValue = Math.max(0, Math.min(1, 1 - y / height));
    onChange(Math.round(newValue * 20) / 20); // Snap to 5% increments
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
    <div className={`flex flex-col items-center gap-2 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* Percentage label */}
      <span className={`text-xs font-mono ${scheme.text} opacity-80`}>
        {Math.round(value * 100)}%
      </span>

      {/* Slider track */}
      <div
        ref={sliderRef}
        className={`relative w-8 h-28 rounded-full ${scheme.track} cursor-pointer touch-none overflow-hidden`}
        style={{
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Fill bar */}
        <motion.div
          className={`absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t ${scheme.gradient}`}
          style={{ height: `${value * 100}%` }}
          initial={false}
          animate={{
            height: `${value * 100}%`,
            boxShadow: `0 0 20px ${scheme.glow}, inset 0 1px 2px rgba(255,255,255,0.3)`,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />

        {/* Thumb indicator */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-6 h-2 rounded-full bg-white"
          style={{
            bottom: `calc(${value * 100}% - 4px)`,
            boxShadow: `0 0 12px ${scheme.glow}, 0 2px 4px rgba(0,0,0,0.3)`,
          }}
          initial={false}
          animate={{
            bottom: `calc(${value * 100}% - 4px)`,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>

      {/* Icon and label */}
      <div className={`p-2 rounded-full ${scheme.iconBg}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-medium ${scheme.text} opacity-70 tracking-wide uppercase max-w-[60px] truncate`}>
        {label}
      </span>
    </div>
  );
});

PremiumVolumeSlider.displayName = 'PremiumVolumeSlider';

interface MeditationPlayerProps {
  // Playback control
  isPlaying: boolean;
  isBuffering?: boolean;  // Show loading state during audio generation
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
  onClose: () => void;

  // Background music
  backgroundMusicEnabled?: boolean;
  backgroundVolume: number;
  onBackgroundVolumeChange: (volume: number) => void;
  onBackgroundMusicToggle?: () => void;
  backgroundTrackName?: string;

  // Nature/Ambient sounds
  natureSoundEnabled?: boolean;
  natureSoundVolume?: number;
  onNatureSoundVolumeChange?: (volume: number) => void;
  natureSoundName?: string;
  natureSoundIcon?: string;
  onOpenNatureSoundModal?: () => void;

  // Voice volume and playback rate
  voiceVolume?: number;
  onVoiceVolumeChange?: (volume: number) => void;
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;

  // Save functionality
  userId?: string;
  voiceId?: string;
  voiceName?: string;
  meditationType?: string;

  // Sleep timer (optional)
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
  playbackRate = 1.0,
  onPlaybackRateChange,
  userId,
  voiceId,
  voiceName,
  meditationType,
  onSleepTimer,
}) => {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const [showControls, setShowControls] = useState(false);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    onSeek(percent * duration);
  }, [onSeek, duration]);

  return (
    <div className="fixed inset-0 z-[100] w-full overflow-hidden bg-[#020617]">
      {/* Animated gradient background - deep blue/cyan theme */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'linear-gradient(135deg, #020617 0%, #0c1929 50%, #020617 100%)',
            'linear-gradient(135deg, #020617 0%, #0c1929 60%, #020617 100%)',
            'linear-gradient(135deg, #020617 0%, #0c1929 40%, #020617 100%)',
            'linear-gradient(135deg, #020617 0%, #0c1929 50%, #020617 100%)',
          ],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating particles */}
      <FloatingParticles />

      {/* Content */}
      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-between px-4 sm:px-6 pb-12 sm:pb-16 md:pb-20 pt-16 sm:pt-14 safe-top safe-bottom">
        {/* Header with close button */}
        <div className="w-full mt-2">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/5 text-white/60 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white/80"
            aria-label="Close player"
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>

        {/* Center content */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 sm:gap-8">
          {/* Breathing orb visualizer - show loading animation when buffering */}
          <BreathingOrb isPlaying={isBuffering ? true : isPlaying} />

          {/* Title and time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <h1 className="font-sans text-xl sm:text-2xl font-light tracking-wide text-white/90">
              {isBuffering ? 'Generating...' : 'Meditation'}
            </h1>
            <p className="mt-2 font-mono text-sm text-white/50">
              {isBuffering ? (
                <span className="inline-flex items-center gap-2">
                  <span className="animate-pulse">Preparing your meditation</span>
                </span>
              ) : (
                `${formatTime(currentTime)} / ${formatTime(duration)}`
              )}
            </p>
          </motion.div>
        </div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-xl space-y-5 sm:space-y-6 mb-4 sm:mb-6 md:mb-8"
        >
          {/* Progress bar */}
          <div className="relative px-1">
            <div
              className="absolute -inset-1 rounded-full bg-sky-500/20 blur-md transition-all"
              style={{ width: isBuffering ? '0%' : `${Math.max(progress, 1)}%` }}
            />
            <div
              className={`relative h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden group ${
                isBuffering ? 'cursor-not-allowed' : 'cursor-pointer'
              }`}
              onClick={isBuffering ? undefined : handleProgressClick}
            >
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-sky-500/80 to-sky-500/80 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
              {/* Thumb indicator */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-white rounded-full shadow-[0_0_10px_rgba(94,234,212,0.5)] opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progress}% - 6px)` }}
              />
            </div>
          </div>

          {/* Main playback controls */}
          <div className="flex items-center justify-center gap-6 sm:gap-8">
            <motion.button
              whileHover={!isBuffering ? { scale: 1.1 } : undefined}
              whileTap={!isBuffering ? { scale: 0.9 } : undefined}
              onClick={isBuffering ? undefined : () => onSkip(-15)}
              disabled={isBuffering}
              className={`relative flex h-12 w-12 sm:h-12 sm:w-12 items-center justify-center transition-all duration-200 rounded-full ${
                isBuffering
                  ? 'text-white/20 cursor-not-allowed'
                  : 'text-white/60 hover:text-white/90 hover:bg-white/5 active:bg-white/10'
              }`}
              aria-label="Skip back 15 seconds"
            >
              <RotateCcw className="h-6 w-6" />
              <span className="absolute -bottom-1 text-[10px] font-medium">15</span>
            </motion.button>

            <motion.button
              whileHover={!isBuffering ? { scale: 1.05 } : undefined}
              whileTap={!isBuffering ? { scale: 0.92 } : undefined}
              onClick={isBuffering ? undefined : onPlayPause}
              disabled={isBuffering}
              className={`flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-full text-white backdrop-blur-sm transition-all duration-200 ${
                isBuffering
                  ? 'bg-white/10 cursor-wait'
                  : isPlaying
                    ? 'bg-white/15 shadow-[0_0_30px_rgba(34,211,238,0.2)]'
                    : 'bg-white/10 hover:bg-white/20 hover:shadow-[0_0_25px_rgba(34,211,238,0.15)]'
              }`}
              aria-label={isBuffering ? 'Generating audio...' : isPlaying ? 'Pause' : 'Play'}
            >
              <AnimatePresence mode="wait">
                {isBuffering ? (
                  <motion.div key="loading" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <div className="h-7 w-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </motion.div>
                ) : isPlaying ? (
                  <motion.div key="pause" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Pause className="h-7 w-7 fill-white" />
                  </motion.div>
                ) : (
                  <motion.div key="play" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Play className="ml-1 h-7 w-7 fill-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            <motion.button
              whileHover={!isBuffering ? { scale: 1.1 } : undefined}
              whileTap={!isBuffering ? { scale: 0.9 } : undefined}
              onClick={isBuffering ? undefined : () => onSkip(15)}
              disabled={isBuffering}
              className={`relative flex h-12 w-12 sm:h-12 sm:w-12 items-center justify-center transition-all duration-200 rounded-full ${
                isBuffering
                  ? 'text-white/20 cursor-not-allowed'
                  : 'text-white/60 hover:text-white/90 hover:bg-white/5 active:bg-white/10'
              }`}
              aria-label="Skip forward 15 seconds"
            >
              <RotateCw className="h-6 w-6" />
              <span className="absolute -bottom-1 text-[10px] font-medium">15</span>
            </motion.button>
          </div>

          {/* Expand controls arrow */}
          <div className="flex items-center justify-center mt-4">
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowControls(!showControls)}
              className="flex items-center justify-center p-2 transition-opacity hover:opacity-100 opacity-60"
              aria-label={showControls ? 'Hide sound controls' : 'Show sound controls'}
              style={{
                background: 'linear-gradient(135deg, #22d3ee 0%, #3b82f6 50%, #22d3ee 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
              }}
            >
              <motion.div
                animate={{ rotate: showControls ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronUp className="h-6 w-6" style={{ stroke: 'url(#player-arrow-gradient)' }} />
              </motion.div>
              <svg width="0" height="0" className="absolute">
                <defs>
                  <linearGradient id="player-arrow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.button>
          </div>

          {/* Premium Volume Controls Panel */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="overflow-hidden"
              >
                <div className="py-6 px-6 sm:px-8 rounded-3xl bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
                  {/* Sound Selection Buttons */}
                  <div className="flex items-center justify-center gap-4 mb-6">
                    {onBackgroundMusicToggle && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onBackgroundMusicToggle}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                          backgroundMusicEnabled
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                            : 'bg-white/[0.03] text-white/50 border border-white/[0.05] hover:bg-white/[0.05] hover:text-white/70'
                        }`}
                      >
                        <Music className="w-4 h-4" />
                        <span className="max-w-[70px] truncate">
                          {backgroundMusicEnabled ? backgroundTrackName || 'Music' : 'Music'}
                        </span>
                      </motion.button>
                    )}

                    {onOpenNatureSoundModal && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onOpenNatureSoundModal}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                          natureSoundEnabled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(52,211,153,0.2)]'
                            : 'bg-white/[0.03] text-white/50 border border-white/[0.05] hover:bg-white/[0.05] hover:text-white/70'
                        }`}
                      >
                        {renderNatureIcon(natureSoundIcon, "w-4 h-4")}
                        <span className="max-w-[70px] truncate">
                          {natureSoundEnabled ? natureSoundName || 'Nature' : 'Nature'}
                        </span>
                      </motion.button>
                    )}
                  </div>

                  {/* Vertical Volume Sliders */}
                  <div className="flex items-end justify-center gap-8 sm:gap-12">
                    {/* Voice Volume - Always shown */}
                    {onVoiceVolumeChange && (
                      <PremiumVolumeSlider
                        value={voiceVolume}
                        onChange={onVoiceVolumeChange}
                        label="Voice"
                        icon={<Volume2 className="w-4 h-4 text-cyan-400" />}
                        color="cyan"
                      />
                    )}

                    {/* Nature Sound Volume - Only when enabled */}
                    {onNatureSoundVolumeChange && (
                      <PremiumVolumeSlider
                        value={natureSoundVolume}
                        onChange={onNatureSoundVolumeChange}
                        label={natureSoundEnabled ? (natureSoundName || 'Nature') : 'Nature'}
                        icon={<span className="text-emerald-400">{renderNatureIcon(natureSoundIcon, "w-4 h-4")}</span>}
                        color="emerald"
                        disabled={!natureSoundEnabled}
                      />
                    )}

                    {/* Background Music Volume - Only when enabled */}
                    <PremiumVolumeSlider
                      value={backgroundVolume}
                      onChange={onBackgroundVolumeChange}
                      label={backgroundMusicEnabled ? (backgroundTrackName || 'Music') : 'Music'}
                      icon={<Music className="w-4 h-4 text-blue-400" />}
                      color="blue"
                      disabled={!backgroundMusicEnabled}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  );
});

V0MeditationPlayer.displayName = 'V0MeditationPlayer';

// Orb size configuration for responsive design
const ORB_CONFIG = {
  // Responsive orb sizes
  orbSize: 'w-[160px] h-[160px] sm:w-[180px] sm:h-[180px] md:w-[200px] md:h-[200px] lg:w-[220px] lg:h-[220px]',
};

/**
 * BreathingOrb - 4-layer breathing visualization
 *
 * Layers (outer to inner):
 * 4. Ambient Glow Field - soft surrounding blur
 * 3. Particle Orbit - circling energy particles
 * 2. Main Orb - primary breathing element
 * 1. Inner Core - bright center with radiating rays
 */
const BreathingOrb = memo(({ isPlaying }: { isPlaying: boolean }) => {
  // Generate orbit particles (reduced on mobile for performance)
  const orbitParticles = useMemo(() =>
    [...Array(ORBIT_PARTICLE_COUNT)].map((_, i) => ({
      id: i,
      angle: (i / ORBIT_PARTICLE_COUNT) * 360,
      orbitRadius: 85 + (i % 2) * 15, // Alternating orbit distances
      size: 2 + Math.random() * 2,
      duration: 25 + Math.random() * 15,
      delay: (i / ORBIT_PARTICLE_COUNT) * -40,
      colorOffset: i * 25, // For gradient color variation
    })),
    []
  );

  // Generate ray angles for inner core
  const coreRays = useMemo(() => [...Array(12)].map((_, i) => i * 30), []);

  return (
    <div className="relative flex items-center justify-center">
      {/* Layer 4: Ambient Glow Field */}
      <motion.div
        className="absolute w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] md:w-[320px] md:h-[320px] lg:w-[350px] lg:h-[350px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(34, 211, 238, 0.22) 0%, rgba(59, 130, 246, 0.14) 35%, rgba(14, 165, 233, 0.08) 60%, transparent 80%)',
          filter: 'blur(40px)',
        }}
        animate={isPlaying ? {
          scale: [1, 1.18, 1.18, 1],
          opacity: [0.4, 0.7, 0.7, 0.4],
        } : { scale: 1, opacity: 0.25 }}
        transition={{
          duration: 19,
          times: [0, 0.21, 0.58, 1],
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Layer 3: Particle Orbit System */}
      <div className="absolute w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] md:w-[220px] md:h-[220px]">
        {orbitParticles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute left-1/2 top-1/2"
            style={{
              width: particle.size,
              height: particle.size,
              marginLeft: -particle.size / 2,
              marginTop: -particle.size / 2,
              background: `radial-gradient(circle, rgba(34, 211, 238, 0.9) 0%, rgba(59, 130, 246, 0.7) 100%)`,
              borderRadius: '50%',
              boxShadow: `0 0 ${particle.size * 3}px rgba(34, 211, 238, 0.6)`,
            }}
            animate={isPlaying ? {
              x: [
                Math.cos(particle.angle * Math.PI / 180) * particle.orbitRadius,
                Math.cos((particle.angle + 90) * Math.PI / 180) * particle.orbitRadius,
                Math.cos((particle.angle + 180) * Math.PI / 180) * particle.orbitRadius,
                Math.cos((particle.angle + 270) * Math.PI / 180) * particle.orbitRadius,
                Math.cos(particle.angle * Math.PI / 180) * particle.orbitRadius,
              ],
              y: [
                Math.sin(particle.angle * Math.PI / 180) * particle.orbitRadius,
                Math.sin((particle.angle + 90) * Math.PI / 180) * particle.orbitRadius,
                Math.sin((particle.angle + 180) * Math.PI / 180) * particle.orbitRadius,
                Math.sin((particle.angle + 270) * Math.PI / 180) * particle.orbitRadius,
                Math.sin(particle.angle * Math.PI / 180) * particle.orbitRadius,
              ],
              opacity: [0.6, 0.9, 0.6, 0.9, 0.6],
            } : {
              x: Math.cos(particle.angle * Math.PI / 180) * particle.orbitRadius,
              y: Math.sin(particle.angle * Math.PI / 180) * particle.orbitRadius,
              opacity: 0.3,
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* Layer 2: Main Pulsing Orb */}
      <motion.div
        className={`relative ${ORB_CONFIG.orbSize} rounded-full flex items-center justify-center`}
        style={{
          background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.28) 0%, rgba(59, 130, 246, 0.22) 50%, rgba(14, 165, 233, 0.28) 100%)',
          boxShadow: 'inset 0 0 50px rgba(59, 130, 246, 0.15), inset 0 0 100px rgba(34, 211, 238, 0.1)',
        }}
        animate={isPlaying ? {
          scale: [1, 1.18, 1.18, 1],
          filter: [
            'drop-shadow(0 0 35px rgba(34, 211, 238, 0.45)) drop-shadow(0 0 70px rgba(59, 130, 246, 0.25))',
            'drop-shadow(0 0 70px rgba(34, 211, 238, 0.7)) drop-shadow(0 0 120px rgba(59, 130, 246, 0.4))',
            'drop-shadow(0 0 70px rgba(34, 211, 238, 0.7)) drop-shadow(0 0 120px rgba(59, 130, 246, 0.4))',
            'drop-shadow(0 0 35px rgba(34, 211, 238, 0.45)) drop-shadow(0 0 70px rgba(59, 130, 246, 0.25))',
          ],
        } : {
          scale: 1,
          filter: 'drop-shadow(0 0 25px rgba(34, 211, 238, 0.3)) drop-shadow(0 0 50px rgba(59, 130, 246, 0.15))',
        }}
        transition={{
          duration: 19, // 4-7-8 breathing: 4s inhale, 7s hold, 8s exhale
          times: [0, 0.21, 0.58, 1],
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Inner gradient layer */}
        <motion.div
          className="absolute inset-4 sm:inset-5 md:inset-6 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.35) 0%, rgba(59, 130, 246, 0.2) 50%, transparent 100%)',
            filter: 'blur(8px)',
          }}
          animate={isPlaying ? {
            opacity: [0.5, 0.9, 0.9, 0.5],
          } : { opacity: 0.35 }}
          transition={{
            duration: 19,
            times: [0, 0.21, 0.58, 1],
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Secondary inner ring */}
        <div
          className="absolute inset-8 sm:inset-10 md:inset-12 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.25) 0%, rgba(59, 130, 246, 0.2) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        />
      </motion.div>

      {/* Layer 1: Inner Energy Core with Radiating Rays */}
      <motion.div
        className="absolute w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full z-10"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(34, 211, 238, 0.85) 35%, rgba(59, 130, 246, 0.5) 65%, transparent 100%)',
          boxShadow: '0 0 30px rgba(255, 255, 255, 0.6), 0 0 60px rgba(34, 211, 238, 0.5), 0 0 90px rgba(59, 130, 246, 0.3)',
        }}
        animate={isPlaying ? {
          scale: [1, 1.12, 1],
          opacity: [0.85, 1, 0.85],
        } : { scale: 1, opacity: 0.65 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Radiating rays */}
        {coreRays.map((angle) => (
          <motion.div
            key={`ray-${angle}`}
            className="absolute left-1/2 top-1/2 origin-bottom"
            style={{
              width: 2,
              height: 28,
              marginLeft: -1,
              marginTop: -28,
              background: 'linear-gradient(to top, rgba(255, 255, 255, 0.7), rgba(34, 211, 238, 0.3), transparent)',
              transform: `rotate(${angle}deg)`,
              borderRadius: '1px',
            }}
            animate={isPlaying ? {
              scaleY: [1, 1.4, 1],
              opacity: [0.4, 0.85, 0.4],
            } : { scaleY: 1, opacity: 0.25 }}
            transition={{
              duration: 2.5,
              delay: (angle / 360) * 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>

      {/* Center bright dot */}
      <motion.div
        className="absolute w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full z-20"
        style={{
          background: 'radial-gradient(circle, white 0%, rgba(34, 211, 238, 0.9) 100%)',
          boxShadow: '0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px rgba(34, 211, 238, 0.7)',
        }}
        animate={isPlaying ? {
          scale: [1, 1.2, 1],
          boxShadow: [
            '0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px rgba(34, 211, 238, 0.7)',
            '0 0 25px rgba(255, 255, 255, 1), 0 0 50px rgba(34, 211, 238, 0.9)',
            '0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px rgba(34, 211, 238, 0.7)',
          ],
        } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
});

BreathingOrb.displayName = 'BreathingOrb';

/**
 * Floating Particles - Enhanced ambient particle effect with Innrvo colors
 * Uses PARTICLE_COUNT (20) for immersive atmosphere
 */
const FloatingParticles = memo(() => {
  const particles = useMemo(() => [...Array(PARTICLE_COUNT)].map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 1,
    duration: Math.random() * 25 + 18,
    delay: Math.random() * 12,
    // Color variation: cyan, blue, or white
    color: i % 3 === 0
      ? 'rgba(34, 211, 238, 0.4)' // cyan
      : i % 3 === 1
        ? 'rgba(59, 130, 246, 0.35)' // blue
        : 'rgba(255, 255, 255, 0.25)', // white
    glow: i % 3 === 0
      ? '0 0 6px rgba(34, 211, 238, 0.5)'
      : i % 3 === 1
        ? '0 0 6px rgba(59, 130, 246, 0.4)'
        : '0 0 4px rgba(255, 255, 255, 0.3)',
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
            boxShadow: particle.glow,
          }}
          animate={{
            y: [0, -35, 0],
            x: [0, (particle.id % 2 === 0 ? 8 : -8), 0],
            opacity: [0.15, 0.5, 0.15],
            scale: [1, 1.2, 1],
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
