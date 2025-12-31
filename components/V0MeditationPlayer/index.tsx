import React, { useCallback, memo, useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, RotateCcw, RotateCw, ChevronUp, Volume2 } from 'lucide-react';
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

// Reduced particles on mobile for 60fps performance (20 -> 8)
const PARTICLE_COUNT = IS_MOBILE ? 8 : 20;
const ORBIT_PARTICLE_COUNT = IS_MOBILE ? 8 : 14;
const SHOOTING_STAR_COUNT_MOBILE = IS_MOBILE ? 4 : 8;

interface MeditationPlayerProps {
  // Playback control
  isPlaying: boolean;
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
    <div className="fixed inset-0 z-[100] w-full overflow-hidden bg-[#0f172a]">
      {/* Animated gradient background */}
      <m.div
        className="absolute inset-0"
        animate={{
          background: [
            'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
            'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)',
            'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)',
            'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
          ],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating particles */}
      <FloatingParticles />

      {/* Content */}
      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-between px-4 sm:px-6 pb-12 sm:pb-16 md:pb-20 pt-16 sm:pt-14 safe-top safe-bottom">
        {/* Header with close button */}
        <div className="w-full max-w-lg mt-2">
          <m.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/5 text-white/60 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white/80"
            aria-label="Close player"
          >
            <X className="h-5 w-5" />
          </m.button>
        </div>

        {/* Center content */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 sm:gap-8">
          {/* Breathing orb visualizer */}
          <BreathingOrb isPlaying={isPlaying} />

          {/* Title and time */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <h1 className="font-sans text-xl sm:text-2xl font-light tracking-wide text-white/90">
              Meditation
            </h1>
            <p className="mt-2 font-mono text-sm text-white/50">
              {formatTime(currentTime)} / {formatTime(duration)}
            </p>
          </m.div>
        </div>

        {/* Controls */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-lg space-y-5 sm:space-y-6 mb-4 sm:mb-6 md:mb-8"
        >
          {/* Progress bar */}
          <div className="relative px-1">
            <div
              className="absolute -inset-1 rounded-full bg-cyan-400/20 blur-md transition-all"
              style={{ width: `${Math.max(progress, 1)}%` }}
            />
            <div
              className="relative h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer group"
              onClick={handleProgressClick}
            >
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-400/80 to-purple-400/80 rounded-full transition-all duration-100"
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
            <m.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSkip(-15)}
              className="relative flex h-12 w-12 sm:h-12 sm:w-12 items-center justify-center text-white/60 transition-colors hover:text-white/90"
              aria-label="Skip back 15 seconds"
            >
              <RotateCcw className="h-6 w-6" />
              <span className="absolute -bottom-1 text-[10px] font-medium">15</span>
            </m.button>

            <m.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onPlayPause}
              className="flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <AnimatePresence mode="wait">
                {isPlaying ? (
                  <m.div key="pause" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Pause className="h-7 w-7 fill-white" />
                  </m.div>
                ) : (
                  <m.div key="play" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Play className="ml-1 h-7 w-7 fill-white" />
                  </m.div>
                )}
              </AnimatePresence>
            </m.button>

            <m.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSkip(15)}
              className="relative flex h-12 w-12 sm:h-12 sm:w-12 items-center justify-center text-white/60 transition-colors hover:text-white/90"
              aria-label="Skip forward 15 seconds"
            >
              <RotateCw className="h-6 w-6" />
              <span className="absolute -bottom-1 text-[10px] font-medium">15</span>
            </m.button>
          </div>

          {/* Expand controls arrow */}
          <div className="flex items-center justify-center mt-4">
            <m.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowControls(!showControls)}
              className="flex items-center justify-center p-2 transition-opacity hover:opacity-100 opacity-60"
              aria-label={showControls ? 'Hide sound controls' : 'Show sound controls'}
              style={{
                background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 50%, #22d3ee 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
              }}
            >
              <m.div
                animate={{ rotate: showControls ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronUp className="h-6 w-6" style={{ stroke: 'url(#player-arrow-gradient)' }} />
              </m.div>
              <svg width="0" height="0" className="absolute">
                <defs>
                  <linearGradient id="player-arrow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="50%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
            </m.button>
          </div>

          {/* Expanded controls panel - Glassmorphism */}
          <AnimatePresence>
            {showControls && (
              <m.div
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="overflow-hidden"
              >
                <div className="pt-4 pb-4 px-4 sm:px-5 space-y-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  {/* Sound Buttons Row */}
                  <div className="flex items-center justify-center gap-3">
                    {/* Background Music Button */}
                    {onBackgroundMusicToggle && (
                      <button
                        onClick={onBackgroundMusicToggle}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                          backgroundMusicEnabled
                            ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                        }`}
                      >
                        <span>🎵</span>
                        <span className="max-w-[80px] truncate">
                          {backgroundMusicEnabled ? backgroundTrackName : 'Music'}
                        </span>
                      </button>
                    )}

                    {/* Nature Sound Button */}
                    {onOpenNatureSoundModal && (
                      <button
                        onClick={onOpenNatureSoundModal}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                          natureSoundEnabled
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                        }`}
                      >
                        <span className="text-emerald-400">{renderNatureIcon(natureSoundIcon, "w-4 h-4")}</span>
                        <span className="max-w-[80px] truncate">
                          {natureSoundEnabled ? natureSoundName : 'Nature'}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Voice Volume */}
                  {onVoiceVolumeChange && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-cyan-400/80 flex items-center gap-2">
                          <Volume2 className="h-4 w-4" />
                          Voice Volume
                        </span>
                        <span className="text-cyan-300 font-mono">{Math.round(voiceVolume * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-cyan-400/40">0%</span>
                        <div className="relative flex-1 h-4 flex items-center">
                          <div className="absolute inset-x-0 h-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-cyan-400/30 pointer-events-none" />
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={voiceVolume}
                            onChange={(e) => onVoiceVolumeChange(parseFloat(e.target.value))}
                            className="relative z-10 w-full h-1.5 bg-transparent rounded-full appearance-none cursor-pointer
                              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-cyan-400 [&::-webkit-slider-thumb]:to-cyan-500
                              [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(34,211,238,0.6),0_0_4px_rgba(34,211,238,0.8)]
                              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                              [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-[0_0_12px_rgba(34,211,238,0.6)]"
                          />
                        </div>
                        <span className="text-xs text-cyan-400/40">100%</span>
                      </div>
                    </div>
                  )}

                  {/* Nature Sound Volume (if enabled) */}
                  {natureSoundEnabled && onNatureSoundVolumeChange && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-violet-400/80 flex items-center gap-2">
                          <span className="text-violet-400">{renderNatureIcon(natureSoundIcon, "w-4 h-4")}</span>
                          {natureSoundName || 'Nature Sound'}
                        </span>
                        <span className="text-violet-300 font-mono">{Math.round(natureSoundVolume * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-violet-400/40">0%</span>
                        <div className="relative flex-1 h-4 flex items-center">
                          <div className="absolute inset-x-0 h-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 via-violet-500/25 to-purple-500/20 pointer-events-none" />
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={natureSoundVolume}
                            onChange={(e) => onNatureSoundVolumeChange(parseFloat(e.target.value))}
                            className="relative z-10 w-full h-1.5 bg-transparent rounded-full appearance-none cursor-pointer
                              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-cyan-400 [&::-webkit-slider-thumb]:via-violet-400 [&::-webkit-slider-thumb]:to-purple-500
                              [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(139,92,246,0.6),0_0_4px_rgba(139,92,246,0.8)]
                              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                              [&::-moz-range-thumb]:bg-violet-400 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-[0_0_12px_rgba(139,92,246,0.6)]"
                          />
                        </div>
                        <span className="text-xs text-violet-400/40">100%</span>
                      </div>
                    </div>
                  )}

                  {/* Background Music Volume (if enabled) */}
                  {backgroundMusicEnabled && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-purple-400/80 flex items-center gap-2">
                          <span>🎵</span>
                          Music Volume
                        </span>
                        <span className="text-purple-300 font-mono">{Math.round(backgroundVolume * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-purple-400/40">0%</span>
                        <div className="relative flex-1 h-4 flex items-center">
                          <div className="absolute inset-x-0 h-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-purple-400/30 pointer-events-none" />
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={backgroundVolume}
                            onChange={(e) => onBackgroundVolumeChange(parseFloat(e.target.value))}
                            className="relative z-10 w-full h-1.5 bg-transparent rounded-full appearance-none cursor-pointer
                              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-purple-400 [&::-webkit-slider-thumb]:to-purple-600
                              [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(168,85,247,0.6),0_0_4px_rgba(168,85,247,0.8)]
                              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                              [&::-moz-range-thumb]:bg-purple-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-[0_0_12px_rgba(168,85,247,0.6)]"
                          />
                        </div>
                        <span className="text-xs text-purple-400/40">100%</span>
                      </div>
                    </div>
                  )}
                </div>
              </m.div>
            )}
          </AnimatePresence>

        </m.div>
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

// Shooting star count for ambient effect (uses mobile-optimized count)
const SHOOTING_STAR_COUNT = SHOOTING_STAR_COUNT_MOBILE;

/**
 * BreathingOrb - Awe-inspiring 5-layer breathing visualization
 *
 * Layers (outer to inner):
 * 5. Ambient Glow Field - soft surrounding blur
 * 4. Shooting Stars - diagonal streaks across the orb area
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

  // Generate shooting stars
  const shootingStars = useMemo(() =>
    [...Array(SHOOTING_STAR_COUNT)].map((_, i) => ({
      id: i,
      startX: -20 + Math.random() * 40, // Start position offset from center
      startY: -150 - Math.random() * 100, // Start above the orb
      angle: 25 + Math.random() * 20, // Diagonal angle (25-45 degrees)
      length: 60 + Math.random() * 80, // Trail length
      duration: 1.5 + Math.random() * 2, // Animation duration
      delay: i * 0.8 + Math.random() * 3, // Staggered delays
      size: 1.5 + Math.random() * 1.5, // Star head size
      isCyan: i % 2 === 0, // Alternate colors
    })),
    []
  );

  return (
    <div className="relative flex items-center justify-center">
      {/* Layer 5: Ambient Glow Field */}
      <m.div
        className="absolute w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] md:w-[320px] md:h-[320px] lg:w-[350px] lg:h-[350px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(34, 211, 238, 0.18) 0%, rgba(168, 85, 247, 0.12) 35%, rgba(99, 102, 241, 0.06) 60%, transparent 80%)',
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

      {/* Layer 4: Shooting Stars - diagonal streaks */}
      <div className="absolute w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] overflow-hidden pointer-events-none">
        {shootingStars.map((star) => (
          <m.div
            key={`star-${star.id}`}
            className="absolute left-1/2 top-1/2"
            style={{
              width: star.length,
              height: star.size,
              marginLeft: star.startX,
              marginTop: star.startY,
              background: star.isCyan
                ? 'linear-gradient(90deg, transparent 0%, rgba(34, 211, 238, 0.1) 20%, rgba(34, 211, 238, 0.8) 80%, rgba(255, 255, 255, 1) 100%)'
                : 'linear-gradient(90deg, transparent 0%, rgba(168, 85, 247, 0.1) 20%, rgba(168, 85, 247, 0.8) 80%, rgba(255, 255, 255, 1) 100%)',
              borderRadius: '2px',
              transform: `rotate(${star.angle}deg)`,
              boxShadow: star.isCyan
                ? '0 0 8px rgba(34, 211, 238, 0.6), 0 0 16px rgba(34, 211, 238, 0.3)'
                : '0 0 8px rgba(168, 85, 247, 0.6), 0 0 16px rgba(168, 85, 247, 0.3)',
            }}
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={isPlaying ? {
              x: [0, 300],
              y: [0, 180],
              opacity: [0, 1, 1, 0],
            } : { x: 0, y: 0, opacity: 0 }}
            transition={{
              duration: star.duration,
              delay: star.delay,
              repeat: Infinity,
              repeatDelay: 4 + Math.random() * 6,
              ease: 'easeOut',
              times: [0, 0.1, 0.8, 1],
            }}
          />
        ))}
      </div>

      {/* Layer 3: Particle Orbit System */}
      <div className="absolute w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] md:w-[220px] md:h-[220px]">
        {orbitParticles.map((particle) => (
          <m.div
            key={particle.id}
            className="absolute left-1/2 top-1/2"
            style={{
              width: particle.size,
              height: particle.size,
              marginLeft: -particle.size / 2,
              marginTop: -particle.size / 2,
              background: `radial-gradient(circle, rgba(34, 211, 238, 0.9) 0%, rgba(168, 85, 247, 0.7) 100%)`,
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
      <m.div
        className={`relative ${ORB_CONFIG.orbSize} rounded-full flex items-center justify-center`}
        style={{
          background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.28) 0%, rgba(168, 85, 247, 0.22) 50%, rgba(99, 102, 241, 0.28) 100%)',
          boxShadow: 'inset 0 0 50px rgba(168, 85, 247, 0.15), inset 0 0 100px rgba(34, 211, 238, 0.1)',
        }}
        animate={isPlaying ? {
          scale: [1, 1.18, 1.18, 1],
          filter: [
            'drop-shadow(0 0 35px rgba(34, 211, 238, 0.45)) drop-shadow(0 0 70px rgba(168, 85, 247, 0.25))',
            'drop-shadow(0 0 70px rgba(34, 211, 238, 0.7)) drop-shadow(0 0 120px rgba(168, 85, 247, 0.4))',
            'drop-shadow(0 0 70px rgba(34, 211, 238, 0.7)) drop-shadow(0 0 120px rgba(168, 85, 247, 0.4))',
            'drop-shadow(0 0 35px rgba(34, 211, 238, 0.45)) drop-shadow(0 0 70px rgba(168, 85, 247, 0.25))',
          ],
        } : {
          scale: 1,
          filter: 'drop-shadow(0 0 25px rgba(34, 211, 238, 0.3)) drop-shadow(0 0 50px rgba(168, 85, 247, 0.15))',
        }}
        transition={{
          duration: 19, // 4-7-8 breathing: 4s inhale, 7s hold, 8s exhale
          times: [0, 0.21, 0.58, 1],
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Inner gradient layer */}
        <m.div
          className="absolute inset-4 sm:inset-5 md:inset-6 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.35) 0%, rgba(168, 85, 247, 0.2) 50%, transparent 100%)',
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
            background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.25) 0%, rgba(168, 85, 247, 0.2) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        />
      </m.div>

      {/* Layer 1: Inner Energy Core with Radiating Rays */}
      <m.div
        className="absolute w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full z-10"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(34, 211, 238, 0.85) 35%, rgba(168, 85, 247, 0.5) 65%, transparent 100%)',
          boxShadow: '0 0 30px rgba(255, 255, 255, 0.6), 0 0 60px rgba(34, 211, 238, 0.5), 0 0 90px rgba(168, 85, 247, 0.3)',
        }}
        animate={isPlaying ? {
          scale: [1, 1.12, 1],
          opacity: [0.85, 1, 0.85],
        } : { scale: 1, opacity: 0.65 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Radiating rays */}
        {coreRays.map((angle) => (
          <m.div
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
      </m.div>

      {/* Center bright dot */}
      <m.div
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
 * Floating Particles - Enhanced ambient particle effect with INrVO colors
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
    // Color variation: cyan, purple, or white
    color: i % 3 === 0
      ? 'rgba(34, 211, 238, 0.4)' // cyan
      : i % 3 === 1
        ? 'rgba(168, 85, 247, 0.35)' // purple
        : 'rgba(255, 255, 255, 0.25)', // white
    glow: i % 3 === 0
      ? '0 0 6px rgba(34, 211, 238, 0.5)'
      : i % 3 === 1
        ? '0 0 6px rgba(168, 85, 247, 0.4)'
        : '0 0 4px rgba(255, 255, 255, 0.3)',
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <m.div
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
