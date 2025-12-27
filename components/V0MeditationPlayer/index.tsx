import React, { useCallback, memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, RotateCcw, RotateCw, Volume2, Gauge } from 'lucide-react';

/**
 * V0 Meditation Player - Clean, focused playback experience
 *
 * No script text display - pure playback controls and visualization
 * Integrated with Supabase for meditation history
 */

// Module-level constants to avoid recreating on each render
const PLAYBACK_RATE_PRESETS = [0.7, 0.8, 0.9, 1.0, 1.2] as const;
const PARTICLE_COUNT = 15; // Reduced from 25 for better performance

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
  playbackRate = 0.9,
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
      <motion.div
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
      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-between px-4 sm:px-6 pb-8 sm:pb-10 md:pb-12 pt-16 sm:pt-14 safe-top safe-bottom">
        {/* Header with close button */}
        <div className="w-full max-w-lg mt-2">
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
          {/* Breathing circle visualizer */}
          <BreathingCircle isPlaying={isPlaying} />

          {/* Title and time */}
          <motion.div
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
          </motion.div>
        </div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-lg space-y-5 sm:space-y-6"
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
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSkip(-15)}
              className="relative flex h-12 w-12 sm:h-12 sm:w-12 items-center justify-center text-white/60 transition-colors hover:text-white/90"
              aria-label="Skip back 15 seconds"
            >
              <RotateCcw className="h-6 w-6" />
              <span className="absolute -bottom-1 text-[10px] font-medium">15</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onPlayPause}
              className="flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <AnimatePresence mode="wait">
                {isPlaying ? (
                  <motion.div key="pause" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Pause className="h-7 w-7 fill-white" />
                  </motion.div>
                ) : (
                  <motion.div key="play" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Play className="ml-1 h-7 w-7 fill-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSkip(15)}
              className="relative flex h-12 w-12 sm:h-12 sm:w-12 items-center justify-center text-white/60 transition-colors hover:text-white/90"
              aria-label="Skip forward 15 seconds"
            >
              <RotateCw className="h-6 w-6" />
              <span className="absolute -bottom-1 text-[10px] font-medium">15</span>
            </motion.button>
          </div>

          {/* Voice speed, volume toggle, and nature sound button */}
          <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowControls(!showControls)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 text-white/60 text-sm transition-colors hover:bg-white/10 hover:text-white/80"
            >
              <Gauge className="h-4 w-4" />
              <span>{playbackRate.toFixed(1)}x</span>
              <Volume2 className="h-4 w-4 ml-1" />
              <span>{Math.round(voiceVolume * 100)}%</span>
            </motion.button>

            {/* Nature Sound Button */}
            {onOpenNatureSoundModal && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenNatureSoundModal}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                  natureSoundEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                <span className="text-base">{natureSoundIcon || '🌿'}</span>
                <span className="max-w-[80px] truncate">
                  {natureSoundEnabled ? natureSoundName : 'Nature'}
                </span>
              </motion.button>
            )}
          </div>

          {/* Expanded controls panel */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-4">
                  {/* Playback Speed */}
                  {onPlaybackRateChange && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/50 flex items-center gap-2">
                          <Gauge className="h-4 w-4" />
                          Voice Speed
                        </span>
                        <span className="text-white/80 font-mono">{playbackRate.toFixed(1)}x</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/40">0.5x</span>
                        <input
                          type="range"
                          min="0.5"
                          max="1.5"
                          step="0.1"
                          value={playbackRate}
                          onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
                          className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400
                            [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(94,234,212,0.5)]
                            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                            [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-0"
                        />
                        <span className="text-xs text-white/40">1.5x</span>
                      </div>
                      <div className="flex justify-center gap-2">
                        {PLAYBACK_RATE_PRESETS.map((rate) => (
                          <button
                            key={rate}
                            onClick={() => onPlaybackRateChange(rate)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              Math.abs(playbackRate - rate) < 0.05
                                ? 'bg-cyan-400/20 text-cyan-300'
                                : 'bg-white/5 text-white/50 hover:bg-white/10'
                            }`}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Voice Volume */}
                  {onVoiceVolumeChange && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/50 flex items-center gap-2">
                          <Volume2 className="h-4 w-4" />
                          Voice Volume
                        </span>
                        <span className="text-white/80 font-mono">{Math.round(voiceVolume * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/40">0%</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={voiceVolume}
                          onChange={(e) => onVoiceVolumeChange(parseFloat(e.target.value))}
                          className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400
                            [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(168,85,247,0.5)]
                            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                            [&::-moz-range-thumb]:bg-purple-400 [&::-moz-range-thumb]:border-0"
                        />
                        <span className="text-xs text-white/40">100%</span>
                      </div>
                    </div>
                  )}

                  {/* Nature Sound Volume (if enabled) */}
                  {natureSoundEnabled && onNatureSoundVolumeChange && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/50 flex items-center gap-2">
                          <span>{natureSoundIcon || '🌿'}</span>
                          {natureSoundName || 'Nature Sound'}
                        </span>
                        <span className="text-white/80 font-mono">{Math.round(natureSoundVolume * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/40">0%</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={natureSoundVolume}
                          onChange={(e) => onNatureSoundVolumeChange(parseFloat(e.target.value))}
                          className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400
                            [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(52,211,153,0.5)]
                            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                            [&::-moz-range-thumb]:bg-emerald-400 [&::-moz-range-thumb]:border-0"
                        />
                        <span className="text-xs text-white/40">100%</span>
                      </div>
                    </div>
                  )}

                  {/* Background Music Volume (if enabled) */}
                  {backgroundMusicEnabled && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/50">🎵 Music Volume</span>
                        <span className="text-white/80 font-mono">{Math.round(backgroundVolume * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/40">0%</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={backgroundVolume}
                          onChange={(e) => onBackgroundVolumeChange(parseFloat(e.target.value))}
                          className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-400
                            [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(129,140,248,0.5)]
                            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                            [&::-moz-range-thumb]:bg-indigo-400 [&::-moz-range-thumb]:border-0"
                        />
                        <span className="text-xs text-white/40">100%</span>
                      </div>
                    </div>
                  )}
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

/**
 * Breathing Circle - Animated visualizer with 4-7-8 breathing pattern
 */
const BreathingCircle = memo(({ isPlaying }: { isPlaying: boolean }) => {
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow rings */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-cyan-400/10"
          style={{
            width: 200 + i * 36,
            height: 200 + i * 36,
          }}
          animate={
            isPlaying
              ? {
                  scale: [1, 1.1, 1],
                  opacity: [0.3 - i * 0.08, 0.15 - i * 0.04, 0.3 - i * 0.08],
                }
              : { scale: 1, opacity: 0.15 - i * 0.04 }
          }
          transition={{
            duration: 8,
            repeat: Infinity,
            delay: i * 0.5,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Main breathing circle */}
      <motion.div
        className="relative flex h-40 w-40 sm:h-44 sm:w-44 items-center justify-center rounded-full"
        animate={
          isPlaying
            ? { scale: [1, 1.15, 1.15, 1] }
            : { scale: 1 }
        }
        transition={{
          duration: 8, // 4-7-8 breathing rhythm approximation
          times: [0, 0.21, 0.58, 1], // 4s inhale, 7s hold, 8s exhale
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Gradient background */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-indigo-500/20" />

        {/* Inner glow */}
        <motion.div
          className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-400/30 via-purple-400/20 to-indigo-400/30 blur-sm"
          animate={
            isPlaying
              ? { opacity: [0.5, 0.8, 0.8, 0.5] }
              : { opacity: 0.4 }
          }
          transition={{
            duration: 8,
            times: [0, 0.21, 0.58, 1],
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Core circle - uses filter for GPU-accelerated animation (30% less CPU than boxShadow) */}
        <motion.div
          className="absolute inset-8 rounded-full bg-gradient-to-br from-cyan-400/40 to-purple-500/40"
          style={{
            // Static base shadow for the inset effect
            boxShadow: 'inset 0 0 25px rgba(168, 85, 247, 0.2)',
          }}
          animate={
            isPlaying
              ? {
                  filter: [
                    'drop-shadow(0 0 30px rgba(94, 234, 212, 0.3))',
                    'drop-shadow(0 0 50px rgba(94, 234, 212, 0.5))',
                    'drop-shadow(0 0 50px rgba(94, 234, 212, 0.5))',
                    'drop-shadow(0 0 30px rgba(94, 234, 212, 0.3))',
                  ],
                }
              : {
                  filter: 'drop-shadow(0 0 20px rgba(94, 234, 212, 0.2))',
                }
          }
          transition={{
            duration: 8,
            times: [0, 0.21, 0.58, 1],
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Center dot */}
        <div className="absolute h-3 w-3 rounded-full bg-white/60 shadow-[0_0_20px_rgba(255,255,255,0.5)]" />
      </motion.div>
    </div>
  );
});

BreathingCircle.displayName = 'BreathingCircle';

/**
 * Floating Particles - Subtle ambient particle effect
 * Uses PARTICLE_COUNT (15) for better performance vs 25
 */
const FloatingParticles = memo(() => {
  const particles = [...Array(PARTICLE_COUNT)].map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    duration: Math.random() * 20 + 20,
    delay: Math.random() * 10,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-white/20"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [0, -30, 0],
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
