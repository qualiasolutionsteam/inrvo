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
 * Compact Volume Slider - Mobile-optimized vertical control
 */
interface VolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
  typeIcon: React.ReactNode;
  color: 'cyan' | 'emerald' | 'blue';
  disabled?: boolean;
}

const CompactVolumeSlider = memo(({ value, onChange, typeIcon, color, disabled = false }: VolumeSliderProps) => {
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
    const newValue = Math.max(0, Math.min(1, 1 - y / height));
    onChange(Math.round(newValue * 20) / 20);
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
    <div className={`flex flex-col items-center gap-1 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* Type indicator at top */}
      <div className={`p-1.5 sm:p-2 rounded-full ${scheme.iconBg}`}>
        {typeIcon}
      </div>

      {/* Slider track - taller for easier control */}
      <div
        ref={sliderRef}
        className={`relative w-8 h-24 xs:h-28 sm:w-9 sm:h-32 md:w-10 md:h-36 rounded-full ${scheme.track} cursor-pointer touch-none overflow-hidden`}
        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Fill bar */}
        <motion.div
          className={`absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t ${scheme.gradient}`}
          initial={false}
          animate={{
            height: `${value * 100}%`,
            boxShadow: `0 0 15px ${scheme.glow}`,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />

        {/* Thumb */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-6 h-2 sm:w-7 sm:h-2.5 rounded-full bg-white"
          style={{ boxShadow: `0 0 10px ${scheme.glow}` }}
          initial={false}
          animate={{ bottom: `calc(${value * 100}% - 4px)` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>
    </div>
  );
});

CompactVolumeSlider.displayName = 'CompactVolumeSlider';

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

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    onSeek(percent * duration);
  }, [onSeek, duration]);

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

          {/* Center section - orb + time (pushed toward top) */}
          <div className="flex-1 flex flex-col items-center justify-start pt-2 sm:pt-4 min-h-0">
            {/* Breathing orb - responsive sizing */}
            <div className="flex-shrink-0">
              <BreathingOrb isPlaying={isBuffering ? true : isPlaying} />
            </div>

            {/* Title and time */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center mt-4 sm:mt-6"
            >
              <h1 className="font-sans text-lg sm:text-xl md:text-2xl font-light tracking-wide text-white/90">
                {isBuffering ? 'Generating...' : 'Meditation'}
              </h1>
              <p className="mt-1 sm:mt-2 font-mono text-xs sm:text-sm text-white/50">
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
            {/* Progress bar */}
            <div className="relative px-1">
              <div
                className="absolute -inset-1 rounded-full bg-sky-500/20 blur-md transition-all"
                style={{ width: isBuffering ? '0%' : `${Math.max(progress, 1)}%` }}
              />
              <div
                className={`relative h-1 sm:h-1.5 md:h-2 bg-white/10 rounded-full overflow-hidden group ${
                  isBuffering ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
                onClick={isBuffering ? undefined : handleProgressClick}
              >
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-sky-500/80 to-sky-500/80 rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full shadow-[0_0_10px_rgba(94,234,212,0.5)] opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `calc(${progress}% - 5px)` }}
                />
              </div>
            </div>

            {/* Playback controls */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8">
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
                  <div className="py-3 px-3 sm:py-4 sm:px-6 rounded-2xl sm:rounded-3xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.06]">
                    {/* Horizontal Layout: Labels Column + Sliders Row */}
                    <div className="flex items-center justify-center gap-4 sm:gap-6">
                      {/* Left: Sound Labels in Column */}
                      <div className="flex flex-col gap-3 sm:gap-4">
                        {/* Voice Label */}
                        {onVoiceVolumeChange && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 min-w-[90px] sm:min-w-[100px]">
                            <Mic className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-cyan-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm font-medium text-cyan-400 truncate">Voice</span>
                          </div>
                        )}

                        {/* Nature Label - Only when active */}
                        {natureSoundEnabled && onNatureSoundVolumeChange && onOpenNatureSoundModal && (
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={onOpenNatureSoundModal}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 min-w-[90px] sm:min-w-[100px] transition-colors hover:bg-emerald-500/15"
                          >
                            {renderNatureIcon(natureSoundIcon, "w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-400 flex-shrink-0")}
                            <span className="text-xs sm:text-sm font-medium text-emerald-400 truncate">
                              {natureSoundName || 'Nature'}
                            </span>
                          </motion.button>
                        )}

                        {/* Music Label */}
                        {onBackgroundMusicToggle && (
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={onBackgroundMusicToggle}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg min-w-[90px] sm:min-w-[100px] transition-colors ${
                              backgroundMusicEnabled
                                ? 'bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15'
                                : 'bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06]'
                            }`}
                          >
                            <Music className={`w-4 h-4 sm:w-4.5 sm:h-4.5 flex-shrink-0 ${backgroundMusicEnabled ? 'text-blue-400' : 'text-white/40'}`} />
                            <span className={`text-xs sm:text-sm font-medium truncate ${backgroundMusicEnabled ? 'text-blue-400' : 'text-white/40'}`}>
                              {backgroundMusicEnabled ? backgroundTrackName || 'Music' : 'Music'}
                            </span>
                          </motion.button>
                        )}
                      </div>

                      {/* Right: Volume Sliders in Row */}
                      <div className="flex items-end gap-6 sm:gap-8">
                        {/* Voice Volume Slider */}
                        {onVoiceVolumeChange && (
                          <CompactVolumeSlider
                            value={voiceVolume}
                            onChange={onVoiceVolumeChange}
                            typeIcon={<Mic className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />}
                            color="cyan"
                          />
                        )}

                        {/* Nature Sound Slider - ONLY shown when active */}
                        {natureSoundEnabled && onNatureSoundVolumeChange && (
                          <CompactVolumeSlider
                            value={natureSoundVolume}
                            onChange={onNatureSoundVolumeChange}
                            typeIcon={<span className="text-emerald-400">{renderNatureIcon(natureSoundIcon, "w-5 h-5 sm:w-6 sm:h-6")}</span>}
                            color="emerald"
                          />
                        )}

                        {/* Music Volume Slider */}
                        <CompactVolumeSlider
                          value={backgroundVolume}
                          onChange={onBackgroundVolumeChange}
                          typeIcon={<Music className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />}
                          color="blue"
                          disabled={!backgroundMusicEnabled}
                        />
                      </div>
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
 * BreathingOrb - Responsive breathing visualization
 * Scales down significantly on mobile for better layout
 */
const BreathingOrb = memo(({ isPlaying }: { isPlaying: boolean }) => {
  const orbitParticles = useMemo(() =>
    [...Array(ORBIT_PARTICLE_COUNT)].map((_, i) => ({
      id: i,
      angle: (i / ORBIT_PARTICLE_COUNT) * 360,
      orbitRadius: 70 + (i % 2) * 12,
      size: 2 + Math.random() * 2,
      duration: 25 + Math.random() * 15,
    })),
    []
  );

  const coreRays = useMemo(() => [...Array(8)].map((_, i) => i * 45), []);

  return (
    <div className="relative flex items-center justify-center">
      {/* Layer 4: Ambient Glow - smaller on mobile */}
      <motion.div
        className="absolute w-[180px] h-[180px] xs:w-[200px] xs:h-[200px] sm:w-[260px] sm:h-[260px] md:w-[320px] md:h-[320px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(34, 211, 238, 0.2) 0%, rgba(59, 130, 246, 0.12) 40%, transparent 70%)',
          filter: 'blur(30px)',
        }}
        animate={isPlaying ? {
          scale: [1, 1.15, 1.15, 1],
          opacity: [0.35, 0.6, 0.6, 0.35],
        } : { scale: 1, opacity: 0.2 }}
        transition={{
          duration: 19,
          times: [0, 0.21, 0.58, 1],
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Layer 3: Particle Orbit - scaled for mobile */}
      <div className="absolute w-[140px] h-[140px] xs:w-[160px] xs:h-[160px] sm:w-[180px] sm:h-[180px] md:w-[200px] md:h-[200px]">
        {orbitParticles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute left-1/2 top-1/2"
            style={{
              width: particle.size,
              height: particle.size,
              marginLeft: -particle.size / 2,
              marginTop: -particle.size / 2,
              background: 'radial-gradient(circle, rgba(34, 211, 238, 0.9) 0%, rgba(59, 130, 246, 0.7) 100%)',
              borderRadius: '50%',
              boxShadow: `0 0 ${particle.size * 2}px rgba(34, 211, 238, 0.5)`,
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
              opacity: [0.5, 0.8, 0.5],
            } : {
              x: Math.cos(particle.angle * Math.PI / 180) * particle.orbitRadius,
              y: Math.sin(particle.angle * Math.PI / 180) * particle.orbitRadius,
              opacity: 0.25,
            }}
            transition={{ duration: particle.duration, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </div>

      {/* Layer 2: Main Orb - responsive sizes */}
      <motion.div
        className="relative w-[120px] h-[120px] xs:w-[140px] xs:h-[140px] sm:w-[160px] sm:h-[160px] md:w-[180px] md:h-[180px] lg:w-[200px] lg:h-[200px] rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.25) 0%, rgba(59, 130, 246, 0.2) 50%, rgba(14, 165, 233, 0.25) 100%)',
          boxShadow: 'inset 0 0 40px rgba(59, 130, 246, 0.15)',
        }}
        animate={isPlaying ? {
          scale: [1, 1.15, 1.15, 1],
          filter: [
            'drop-shadow(0 0 30px rgba(34, 211, 238, 0.4))',
            'drop-shadow(0 0 50px rgba(34, 211, 238, 0.6))',
            'drop-shadow(0 0 50px rgba(34, 211, 238, 0.6))',
            'drop-shadow(0 0 30px rgba(34, 211, 238, 0.4))',
          ],
        } : {
          scale: 1,
          filter: 'drop-shadow(0 0 20px rgba(34, 211, 238, 0.3))',
        }}
        transition={{
          duration: 19,
          times: [0, 0.21, 0.58, 1],
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Inner gradient */}
        <motion.div
          className="absolute inset-3 xs:inset-4 sm:inset-5 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.3) 0%, rgba(59, 130, 246, 0.15) 60%, transparent 100%)',
            filter: 'blur(6px)',
          }}
          animate={isPlaying ? { opacity: [0.4, 0.8, 0.8, 0.4] } : { opacity: 0.3 }}
          transition={{ duration: 19, times: [0, 0.21, 0.58, 1], repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Inner ring */}
        <div
          className="absolute inset-6 xs:inset-7 sm:inset-8 md:inset-10 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        />
      </motion.div>

      {/* Layer 1: Inner Core */}
      <motion.div
        className="absolute w-10 h-10 xs:w-11 xs:h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full z-10"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(34, 211, 238, 0.8) 40%, rgba(59, 130, 246, 0.4) 70%, transparent 100%)',
          boxShadow: '0 0 25px rgba(255, 255, 255, 0.5), 0 0 50px rgba(34, 211, 238, 0.4)',
        }}
        animate={isPlaying ? {
          scale: [1, 1.1, 1],
          opacity: [0.8, 1, 0.8],
        } : { scale: 1, opacity: 0.6 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Rays */}
        {coreRays.map((angle) => (
          <motion.div
            key={`ray-${angle}`}
            className="absolute left-1/2 top-1/2 origin-bottom"
            style={{
              width: 1.5,
              height: 20,
              marginLeft: -0.75,
              marginTop: -20,
              background: 'linear-gradient(to top, rgba(255, 255, 255, 0.6), rgba(34, 211, 238, 0.2), transparent)',
              transform: `rotate(${angle}deg)`,
              borderRadius: '1px',
            }}
            animate={isPlaying ? {
              scaleY: [1, 1.3, 1],
              opacity: [0.3, 0.7, 0.3],
            } : { scaleY: 1, opacity: 0.2 }}
            transition={{ duration: 2.5, delay: (angle / 360) * 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </motion.div>

      {/* Center dot */}
      <motion.div
        className="absolute w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full z-20"
        style={{
          background: 'radial-gradient(circle, white 0%, rgba(34, 211, 238, 0.9) 100%)',
          boxShadow: '0 0 12px rgba(255, 255, 255, 0.8), 0 0 25px rgba(34, 211, 238, 0.6)',
        }}
        animate={isPlaying ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
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
