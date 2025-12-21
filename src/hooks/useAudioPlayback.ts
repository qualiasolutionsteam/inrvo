import { useState, useRef, useCallback, useEffect, RefObject } from 'react';
import { ScriptTimingMap } from '../../types';
import { buildTimingMap, getCurrentWordIndex } from '../lib/textSync';
import { BackgroundTrack, BACKGROUND_TRACKS } from '../../constants';

interface UseAudioPlaybackOptions {
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  defaultBackgroundVolume?: number;
  defaultBackgroundTrack?: BackgroundTrack;
}

interface UseAudioPlaybackReturn {
  // State
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentWordIndex: number;
  timingMap: ScriptTimingMap | null;

  // Background music state
  backgroundVolume: number;
  selectedBackgroundTrack: BackgroundTrack;

  // Refs
  audioContextRef: RefObject<AudioContext | null>;
  audioSourceRef: RefObject<AudioBufferSourceNode | null>;

  // Actions
  loadAndPlay: (audioBuffer: AudioBuffer, script: string) => void;
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  seek: (time: number) => void;
  stop: () => void;

  // Background music actions
  startBackgroundMusic: (track?: BackgroundTrack) => Promise<void>;
  stopBackgroundMusic: () => void;
  updateBackgroundVolume: (volume: number) => void;
  setSelectedBackgroundTrack: (track: BackgroundTrack) => void;

  // Utilities
  formatTime: (seconds: number) => string;
}

export function useAudioPlayback(
  options: UseAudioPlaybackOptions = {}
): UseAudioPlaybackReturn {
  const {
    onProgress,
    onEnded,
    onError,
    defaultBackgroundVolume = 0.3,
    defaultBackgroundTrack = BACKGROUND_TRACKS[0]
  } = options;

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [timingMap, setTimingMap] = useState<ScriptTimingMap | null>(null);

  // Background music state
  const [backgroundVolume, setBackgroundVolume] = useState(defaultBackgroundVolume);
  const [selectedBackgroundTrack, setSelectedBackgroundTrack] = useState<BackgroundTrack>(defaultBackgroundTrack);

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const playbackStartTimeRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);

  // Format time helper
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Progress tracking loop
  const updateProgress = useCallback(() => {
    if (!audioContextRef.current || !isPlaying) return;

    const elapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current;
    const newCurrentTime = Math.min(pauseOffsetRef.current + elapsed, duration);

    setCurrentTime(newCurrentTime);

    // Update word index based on timing map
    if (timingMap) {
      const wordIndex = getCurrentWordIndex(timingMap, newCurrentTime);
      setCurrentWordIndex(wordIndex);
    }

    onProgress?.(newCurrentTime, duration);

    if (newCurrentTime < duration && isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPlaying, duration, timingMap, onProgress]);

  // Start progress tracking when playing
  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updateProgress]);

  // Load audio and start playback
  const loadAndPlay = useCallback((audioBuffer: AudioBuffer, script: string) => {
    try {
      // Initialize audio context if needed (check state to handle closed contexts)
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Store buffer
      audioBufferRef.current = audioBuffer;
      const audioDuration = audioBuffer.duration;
      setDuration(audioDuration);

      // Build timing map
      const map = buildTimingMap(script, audioDuration);
      setTimingMap(map);

      // Stop any existing playback
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }

      // Create and start new source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);
      audioSourceRef.current = source;

      // Track timing
      playbackStartTimeRef.current = audioContextRef.current.currentTime;
      pauseOffsetRef.current = 0;
      setCurrentTime(0);
      setCurrentWordIndex(0);
      setIsPlaying(true);

      // Handle natural end
      source.onended = () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setIsPlaying(false);
        onEnded?.();
      };
    } catch (error) {
      console.error('Failed to load and play audio:', error);
      onError?.(error as Error);
    }
  }, [onEnded, onError]);

  // Resume playback from pause
  const play = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current || isPlaying) return;

    try {
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      // Create new source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioContextRef.current.destination);

      // Start from offset
      source.start(0, pauseOffsetRef.current);
      audioSourceRef.current = source;

      // Track timing
      playbackStartTimeRef.current = audioContextRef.current.currentTime;
      setIsPlaying(true);

      // Handle natural end
      source.onended = () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setIsPlaying(false);
        onEnded?.();
      };
    } catch (error) {
      console.error('Failed to resume playback:', error);
      onError?.(error as Error);
    }
  }, [isPlaying, onEnded, onError]);

  // Pause playback
  const pause = useCallback(() => {
    if (!audioContextRef.current || !audioSourceRef.current || !isPlaying) return;

    // Calculate current position
    const elapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current;
    pauseOffsetRef.current = Math.min(pauseOffsetRef.current + elapsed, duration);

    // Stop the source
    try {
      audioSourceRef.current.stop();
    } catch (e) {
      // Already stopped
    }
    audioSourceRef.current = null;

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setIsPlaying(false);
  }, [isPlaying, duration]);

  // Toggle play/pause
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Seek to specific time
  const seek = useCallback((time: number) => {
    const wasPlaying = isPlaying;
    const clampedTime = Math.max(0, Math.min(time, duration));

    // Stop current playback
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      audioSourceRef.current = null;
    }

    // Update offset
    pauseOffsetRef.current = clampedTime;
    setCurrentTime(clampedTime);

    // Update word index
    if (timingMap) {
      const wordIndex = getCurrentWordIndex(timingMap, clampedTime);
      setCurrentWordIndex(wordIndex);
    }

    // Resume if was playing
    if (wasPlaying && audioContextRef.current && audioBufferRef.current) {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioContextRef.current.destination);
      source.start(0, clampedTime);
      audioSourceRef.current = source;

      playbackStartTimeRef.current = audioContextRef.current.currentTime;
      setIsPlaying(true);

      source.onended = () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setIsPlaying(false);
        onEnded?.();
      };
    } else {
      setIsPlaying(false);
    }
  }, [isPlaying, duration, timingMap, onEnded]);

  // Stop and reset
  const stop = useCallback(() => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      audioSourceRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    pauseOffsetRef.current = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentWordIndex(-1);
    setDuration(0);
    setTimingMap(null);
    audioBufferRef.current = null;
  }, []);

  // Stop background music
  const stopBackgroundMusic = useCallback(() => {
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.pause();
      backgroundAudioRef.current.currentTime = 0;
      backgroundAudioRef.current = null;
    }
  }, []);

  // Start background music
  const startBackgroundMusic = useCallback(async (track?: BackgroundTrack) => {
    const trackToPlay = track || selectedBackgroundTrack;

    // Stop any existing background music
    stopBackgroundMusic();

    if (trackToPlay.id === 'none' || !trackToPlay.audioUrl) {
      return;
    }

    try {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      audio.loop = true;
      audio.volume = backgroundVolume;

      audio.src = trackToPlay.audioUrl;
      backgroundAudioRef.current = audio;

      await audio.play();
    } catch (error) {
      // Try without crossOrigin as fallback
      try {
        const trackUrl = trackToPlay.audioUrl;
        if (trackUrl) {
          const audio = new Audio(trackUrl);
          audio.loop = true;
          audio.volume = backgroundVolume;
          backgroundAudioRef.current = audio;
          await audio.play();
        }
      } catch (fallbackError) {
        console.error('Failed to play background music:', fallbackError);
        onError?.(fallbackError as Error);
      }
    }
  }, [selectedBackgroundTrack, backgroundVolume, stopBackgroundMusic, onError]);

  // Update background volume
  const updateBackgroundVolume = useCallback((volume: number) => {
    setBackgroundVolume(volume);
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.volume = volume;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
      // Also cleanup background music
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.pause();
        backgroundAudioRef.current = null;
      }
    };
  }, []);

  return {
    // State
    isPlaying,
    currentTime,
    duration,
    currentWordIndex,
    timingMap,

    // Background music state
    backgroundVolume,
    selectedBackgroundTrack,

    // Refs
    audioContextRef,
    audioSourceRef,

    // Actions
    loadAndPlay,
    play,
    pause,
    togglePlayback,
    seek,
    stop,

    // Background music actions
    startBackgroundMusic,
    stopBackgroundMusic,
    updateBackgroundVolume,
    setSelectedBackgroundTrack,

    // Utilities
    formatTime,
  };
}
