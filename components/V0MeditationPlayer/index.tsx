import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Music, Moon, Heart } from 'lucide-react';

/**
 * V0 Meditation Player - Clean, focused playback experience
 *
 * No script text display - pure playback controls and visualization
 * Integrated with Supabase for meditation history
 */

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

  // Voice volume (optional)
  voiceVolume?: number;
  onVoiceVolumeChange?: (volume: number) => void;

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
  voiceVolume = 1,
  onVoiceVolumeChange,
  userId,
  voiceId,
  voiceName,
  meditationType,
  onSleepTimer,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

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

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (onVoiceVolumeChange) {
      onVoiceVolumeChange(value / 100);
    }
    setIsMuted(value === 0);
  }, [onVoiceVolumeChange]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    if (onVoiceVolumeChange) {
      onVoiceVolumeChange(isMuted ? 0.8 : 0);
    }
  }, [isMuted, onVoiceVolumeChange]);

  // Meditation is already saved when generated (in App.tsx).
  // This button now just shows a visual confirmation that it's saved.
  const handleSave = useCallback(() => {
    if (!userId || isSaved) return;
    // Just mark as saved in UI - no duplicate database entry needed
    setIsSaved(true);
  }, [userId, isSaved]);

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
      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-between px-4 sm:px-6 pb-6 sm:pb-8 pt-10 sm:pt-12 safe-top safe-bottom">
        {/* Header with close button */}
        <div className="w-full max-w-lg">
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

          {/* Volume control */}
          <div className="flex items-center justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleMute}
              onMouseEnter={() => setShowVolumeSlider(true)}
              className="text-white/50 transition-colors hover:text-white/80"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </motion.button>
            <AnimatePresence>
              {showVolumeSlider && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 100 }}
                  exit={{ opacity: 0, width: 0 }}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                  className="overflow-hidden"
                >
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : voiceVolume * 100}
                    onChange={handleVolumeChange}
                    className="w-24 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-3
                      [&::-webkit-slider-thumb]:h-3
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-white/80"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom options */}
          <div className="flex items-center justify-center gap-8 sm:gap-10 pt-2 sm:pt-4">
            {onBackgroundMusicToggle && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBackgroundMusicToggle}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  backgroundMusicEnabled ? 'text-cyan-400/80' : 'text-white/40'
                }`}
                aria-label="Toggle background music"
              >
                <Music className="h-5 w-5" />
                <span className="text-[10px]">Music</span>
              </motion.button>
            )}

            {onSleepTimer && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onSleepTimer}
                className="flex flex-col items-center gap-1 text-white/40 transition-colors hover:text-white/70"
                aria-label="Sleep timer"
              >
                <Moon className="h-5 w-5" />
                <span className="text-[10px]">Sleep</span>
              </motion.button>
            )}

            {userId && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                disabled={isSaved}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  isSaved ? 'text-purple-400/80' : 'text-white/40 hover:text-white/70'
                }`}
                aria-label={isSaved ? 'Saved' : 'Save to library'}
              >
                <Heart className={`h-5 w-5 ${isSaved ? 'fill-purple-400/80' : ''}`} />
                <span className="text-[10px]">{isSaved ? 'Saved' : 'Save'}</span>
              </motion.button>
            )}
          </div>

          {/* Background music info */}
          {backgroundMusicEnabled && backgroundTrackName && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-3 pt-2"
            >
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                <span>{backgroundTrackName}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={backgroundVolume * 100}
                onChange={(e) => onBackgroundVolumeChange(parseFloat(e.target.value) / 100)}
                className="w-16 h-1 bg-white/10 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-2.5
                  [&::-webkit-slider-thumb]:h-2.5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-white/60"
              />
              <span className="text-[10px] text-white/40 w-6">{Math.round(backgroundVolume * 100)}%</span>
            </motion.div>
          )}
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

        {/* Core circle */}
        <motion.div
          className="absolute inset-8 rounded-full bg-gradient-to-br from-cyan-400/40 to-purple-500/40"
          animate={
            isPlaying
              ? {
                  boxShadow: [
                    '0 0 30px rgba(94, 234, 212, 0.3), inset 0 0 30px rgba(168, 85, 247, 0.2)',
                    '0 0 50px rgba(94, 234, 212, 0.5), inset 0 0 40px rgba(168, 85, 247, 0.3)',
                    '0 0 50px rgba(94, 234, 212, 0.5), inset 0 0 40px rgba(168, 85, 247, 0.3)',
                    '0 0 30px rgba(94, 234, 212, 0.3), inset 0 0 30px rgba(168, 85, 247, 0.2)',
                  ],
                }
              : {
                  boxShadow: '0 0 20px rgba(94, 234, 212, 0.2), inset 0 0 20px rgba(168, 85, 247, 0.1)',
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
 */
const FloatingParticles = memo(() => {
  const particles = [...Array(25)].map((_, i) => ({
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
