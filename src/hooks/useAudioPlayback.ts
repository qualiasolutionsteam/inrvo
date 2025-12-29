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
  defaultPlaybackRate?: number;
  defaultVoiceVolume?: number;
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

  // Voice/playback state
  playbackRate: number;
  voiceVolume: number;

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

  // Voice/playback actions
  updatePlaybackRate: (rate: number) => void;
  updateVoiceVolume: (volume: number) => void;

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
    defaultBackgroundTrack = BACKGROUND_TRACKS[0],
    defaultPlaybackRate = 0.9,  // Slightly slower for meditation
    defaultVoiceVolume = 0.7    // Lower than music by default for better balance
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

  // Voice/playback state
  const [playbackRate, setPlaybackRate] = useState(defaultPlaybackRate);
  const [voiceVolume, setVoiceVolume] = useState(defaultVoiceVolume);

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const playbackStartTimeRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackRateRef = useRef(defaultPlaybackRate);

  // Format time helper
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Progress tracking loop
  const updateProgress = useCallback(() => {
    if (!audioContextRef.current || !isPlaying) return;

    // Elapsed time is affected by playback rate
    const elapsed = (audioContextRef.current.currentTime - playbackStartTimeRef.current) * playbackRateRef.current;
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

      // Create gain node for voice volume control
      if (!gainNodeRef.current || !audioContextRef.current) {
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }
      gainNodeRef.current.gain.value = voiceVolume;

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

      // Create and start new source with playback rate
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackRate;
      playbackRateRef.current = playbackRate;
      source.connect(gainNodeRef.current);
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
  }, [onEnded, onError, playbackRate, voiceVolume]);

  // Resume playback from pause
  const play = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current || isPlaying) return;

    try {
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      // Ensure gain node exists
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }
      gainNodeRef.current.gain.value = voiceVolume;

      // Create new source with playback rate
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.playbackRate.value = playbackRate;
      playbackRateRef.current = playbackRate;
      source.connect(gainNodeRef.current);

      // Start from offset (adjusted for playback rate)
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
  }, [isPlaying, onEnded, onError, playbackRate, voiceVolume]);

  // Pause playback
  const pause = useCallback(() => {
    if (!audioContextRef.current || !audioSourceRef.current || !isPlaying) return;

    // Calculate current position (adjusted for playback rate)
    const elapsed = (audioContextRef.current.currentTime - playbackStartTimeRef.current) * playbackRateRef.current;
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
      // Ensure gain node exists
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }
      gainNodeRef.current.gain.value = voiceVolume;

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.playbackRate.value = playbackRate;
      playbackRateRef.current = playbackRate;
      source.connect(gainNodeRef.current);
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
  }, [isPlaying, duration, timingMap, onEnded, playbackRate, voiceVolume]);

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
      // iOS: Resume AudioContext if suspended
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const audio = new Audio();
      audio.loop = true;
      audio.volume = backgroundVolume;

      // Preload audio (iOS requires this)
      audio.preload = 'auto';

      // Set source
      audio.src = trackToPlay.audioUrl;
      backgroundAudioRef.current = audio;

      // Wait for audio to be loaded enough to play (iOS requirement)
      await new Promise<void>((resolve, reject) => {
        audio.addEventListener('canplaythrough', () => resolve(), { once: true });
        audio.addEventListener('error', (e) => reject(e), { once: true });
        audio.load(); // Explicitly load on iOS
      });

      // Attempt playback
      await audio.play();

    } catch (error) {
      console.error('Failed to start background music:', error);

      // iOS-specific error handling
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.warn('iOS blocked autoplay - user interaction required');
      }

      onError?.(error as Error);
      throw error; // Re-throw so caller can handle
    }
  }, [selectedBackgroundTrack, backgroundVolume, stopBackgroundMusic, onError, audioContextRef]);

  // Update background volume
  const updateBackgroundVolume = useCallback((volume: number) => {
    setBackgroundVolume(volume);
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.volume = volume;
    }
  }, []);

  // Update playback rate (requires restart to take effect)
  const updatePlaybackRate = useCallback((rate: number) => {
    const clampedRate = Math.max(0.5, Math.min(2.0, rate));
    setPlaybackRate(clampedRate);
    playbackRateRef.current = clampedRate;

    // If currently playing, update the source's playback rate directly
    if (audioSourceRef.current && isPlaying) {
      audioSourceRef.current.playbackRate.value = clampedRate;
    }
  }, [isPlaying]);

  // Update voice volume
  const updateVoiceVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setVoiceVolume(clampedVolume);

    // Update gain node in real-time
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = clampedVolume;
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

    // Voice/playback state
    playbackRate,
    voiceVolume,

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

    // Voice/playback actions
    updatePlaybackRate,
    updateVoiceVolume,

    // Utilities
    formatTime,
  };
}
