import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface AudioPreviewProps {
  /** Audio source URL (can be signed URL or direct URL) */
  audioUrl: string;
  /** Optional title to display */
  title?: string;
  /** Optional duration in seconds (if known beforehand) */
  knownDuration?: number;
  /** Callback when playback starts */
  onPlay?: () => void;
  /** Callback when playback ends */
  onEnded?: () => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Compact mode for inline use (smaller controls) */
  compact?: boolean;
  /** Custom accent color class (default: emerald) */
  accentColor?: 'emerald' | 'cyan' | 'purple' | 'amber';
  /** Disable interaction */
  disabled?: boolean;
  /** External control: stop playback when this changes */
  stopPlayback?: boolean;
  /** Custom class name */
  className?: string;
}

const ACCENT_COLORS = {
  emerald: {
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-500/20',
    bgHover: 'hover:bg-emerald-500/30',
    text: 'text-emerald-400',
    progress: 'from-emerald-400 to-sky-500',
    glow: 'shadow-[0_0_15px_rgba(52,211,153,0.4)]',
  },
  cyan: {
    bg: 'bg-sky-500',
    bgLight: 'bg-sky-500/20',
    bgHover: 'hover:bg-sky-500/30',
    text: 'text-sky-500',
    progress: 'from-sky-500 to-sky-500',
    glow: 'shadow-[0_0_15px_rgba(34,211,238,0.4)]',
  },
  purple: {
    bg: 'bg-purple-500',
    bgLight: 'bg-purple-500/20',
    bgHover: 'hover:bg-purple-500/30',
    text: 'text-purple-400',
    progress: 'from-purple-400 to-pink-400',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.4)]',
  },
  amber: {
    bg: 'bg-amber-500',
    bgLight: 'bg-amber-500/20',
    bgHover: 'hover:bg-amber-500/30',
    text: 'text-amber-400',
    progress: 'from-amber-400 to-orange-400',
    glow: 'shadow-[0_0_15px_rgba(251,191,36,0.4)]',
  },
};

/**
 * AudioPreview - Smart, responsive audio preview component
 *
 * Features:
 * - Play/pause with animated state transitions
 * - Interactive progress bar with seek support
 * - Time display (current/duration)
 * - Volume toggle (mute/unmute)
 * - Responsive design (compact mode for small spaces)
 * - Waveform-style progress visualization
 * - Smooth animations via Framer Motion
 */
const AudioPreview: React.FC<AudioPreviewProps> = memo(({
  audioUrl,
  title,
  knownDuration,
  onPlay,
  onEnded,
  onError,
  compact = false,
  accentColor = 'emerald',
  disabled = false,
  stopPlayback = false,
  className = '',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(knownDuration || 0);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);

  const colors = ACCENT_COLORS[accentColor];
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Update time via requestAnimationFrame for smooth progress
  const updateProgress = useCallback(() => {
    if (audioRef.current && isPlaying) {
      setCurrentTime(audioRef.current.currentTime);
      animationRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPlaying]);

  // Handle external stop signal
  useEffect(() => {
    if (stopPlayback && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [stopPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Start animation loop when playing
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateProgress);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, updateProgress]);

  const handlePlayPause = useCallback(async () => {
    if (disabled) return;

    try {
      // Create audio element if needed
      if (!audioRef.current) {
        setIsLoading(true);
        const audio = new Audio(audioUrl);
        audio.preload = 'metadata';

        audio.onloadedmetadata = () => {
          setDuration(audio.duration);
          setIsLoading(false);
        };

        audio.onended = () => {
          setIsPlaying(false);
          setCurrentTime(0);
          onEnded?.();
        };

        audio.onerror = () => {
          setIsPlaying(false);
          setIsLoading(false);
          onError?.(new Error('Failed to load audio'));
        };

        audioRef.current = audio;
      }

      // Toggle playback
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
        onPlay?.();
      }
    } catch (error) {
      setIsPlaying(false);
      setIsLoading(false);
      onError?.(error instanceof Error ? error : new Error('Playback failed'));
    }
  }, [audioUrl, isPlaying, disabled, onPlay, onEnded, onError]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current || disabled) return;

    const rect = progressRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const seekTime = percent * duration;

    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  }, [duration, disabled]);

  const handleProgressHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(percent * 100);
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Compact variant (inline use)
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Play/Pause button */}
        <m.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePlayPause}
          disabled={disabled || isLoading}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
            transition-all duration-200
            ${isPlaying
              ? `${colors.bg} text-white ${colors.glow}`
              : `${colors.bgLight} ${colors.text} ${colors.bgHover}`
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <m.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
              />
            ) : isPlaying ? (
              <m.div key="pause" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Pause className="w-4 h-4" fill="currentColor" />
              </m.div>
            ) : (
              <m.div key="play" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
              </m.div>
            )}
          </AnimatePresence>
        </m.button>

        {/* Mini progress bar */}
        <div className="flex-1 min-w-0">
          <div
            ref={progressRef}
            onClick={handleSeek}
            className="h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group"
          >
            <m.div
              className={`h-full bg-gradient-to-r ${colors.progress} rounded-full`}
              style={{ width: `${progress}%` }}
              layoutId="progress"
            />
          </div>
        </div>

        {/* Time display */}
        <span className="text-xs text-slate-500 font-mono min-w-[60px] text-right">
          {formatTime(currentTime)}/{formatTime(duration)}
        </span>
      </div>
    );
  }

  // Full variant (card-style)
  return (
    <div
      className={`
        p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm
        transition-all duration-300
        ${isPlaying ? 'border-white/20 bg-white/[0.07]' : ''}
        ${className}
      `}
    >
      {/* Title row */}
      {title && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-white truncate">{title}</span>
          {/* Volume toggle */}
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>
      )}

      {/* Main controls row */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Play/Pause button */}
        <m.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePlayPause}
          disabled={disabled || isLoading}
          className={`
            w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center flex-shrink-0
            transition-all duration-200
            ${isPlaying
              ? `${colors.bg} text-white ${colors.glow}`
              : `${colors.bgLight} ${colors.text} ${colors.bgHover}`
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <m.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"
              />
            ) : isPlaying ? (
              <m.div key="pause" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Pause className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" />
              </m.div>
            ) : (
              <m.div key="play" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" fill="currentColor" />
              </m.div>
            )}
          </AnimatePresence>
        </m.button>

        {/* Progress section */}
        <div className="flex-1 min-w-0">
          {/* Progress bar */}
          <div
            ref={progressRef}
            onClick={handleSeek}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onMouseMove={handleProgressHover}
            className="relative h-2 sm:h-2.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group"
          >
            {/* Background glow effect */}
            <m.div
              className={`absolute inset-0 bg-gradient-to-r ${colors.progress} opacity-20 blur-sm`}
              style={{ width: `${progress}%` }}
            />

            {/* Progress fill */}
            <m.div
              className={`relative h-full bg-gradient-to-r ${colors.progress} rounded-full`}
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />

            {/* Hover indicator */}
            <AnimatePresence>
              {isHovering && !disabled && (
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-0 bottom-0 w-0.5 bg-white/50"
                  style={{ left: `${hoverPosition}%` }}
                />
              )}
            </AnimatePresence>

            {/* Thumb indicator (visible on hover or when playing) */}
            <m.div
              className={`
                absolute top-1/2 -translate-y-1/2
                w-3 h-3 sm:w-3.5 sm:h-3.5
                ${colors.bg} rounded-full
                ${colors.glow}
                transition-opacity duration-150
                ${isPlaying || isHovering ? 'opacity-100' : 'opacity-0'}
              `}
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>

          {/* Time display */}
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-slate-500 font-mono">
              {formatTime(currentTime)}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Waveform visualization (simplified bars) */}
      <AnimatePresence>
        {isPlaying && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex items-end justify-center gap-0.5 h-6"
          >
            {[...Array(20)].map((_, i) => (
              <m.div
                key={i}
                className={`w-1 rounded-full bg-gradient-to-t ${colors.progress}`}
                animate={{
                  height: [4, Math.random() * 20 + 8, 4],
                }}
                transition={{
                  duration: 0.5 + Math.random() * 0.3,
                  repeat: Infinity,
                  delay: i * 0.05,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
});

AudioPreview.displayName = 'AudioPreview';

export default AudioPreview;
