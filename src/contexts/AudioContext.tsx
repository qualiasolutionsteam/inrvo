import React, { createContext, useContext, useState, useCallback, useMemo, useRef, ReactNode } from 'react';
import { ScriptTimingMap } from '@/types';

/**
 * Audio playback state - manages meditation audio and background music
 */
interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentWordIndex: number;
  timingMap: ScriptTimingMap | null;
  backgroundVolume: number;
  isInlineMode: boolean;
}

/**
 * Audio context value interface
 */
interface AudioContextValue {
  // State
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentWordIndex: number;
  timingMap: ScriptTimingMap | null;
  backgroundVolume: number;
  isInlineMode: boolean;

  // Setters
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setCurrentWordIndex: (index: number) => void;
  setTimingMap: (map: ScriptTimingMap | null) => void;
  setBackgroundVolume: (volume: number) => void;
  setIsInlineMode: (inline: boolean) => void;

  // Refs for performance (avoid re-renders during animation)
  playbackStartTimeRef: React.MutableRefObject<number>;
  pauseOffsetRef: React.MutableRefObject<number>;
  animationFrameRef: React.MutableRefObject<number | null>;
  lastWordIndexRef: React.MutableRefObject<number>;
  backgroundAudioRef: React.MutableRefObject<HTMLAudioElement | null>;

  // Actions
  resetPlayback: () => void;
}

// Initial state
const initialState: AudioState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  currentWordIndex: -1,
  timingMap: null,
  backgroundVolume: 0.3,
  isInlineMode: false,
};

// Create context
const AudioContext = createContext<AudioContextValue | undefined>(undefined);

/**
 * Audio Provider component
 */
export const AudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(initialState.isPlaying);
  const [currentTime, setCurrentTime] = useState(initialState.currentTime);
  const [duration, setDuration] = useState(initialState.duration);
  const [currentWordIndex, setCurrentWordIndex] = useState(initialState.currentWordIndex);
  const [timingMap, setTimingMap] = useState<ScriptTimingMap | null>(initialState.timingMap);
  const [backgroundVolume, setBackgroundVolume] = useState(initialState.backgroundVolume);
  const [isInlineMode, setIsInlineMode] = useState(initialState.isInlineMode);

  // Refs for animation performance
  const playbackStartTimeRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastWordIndexRef = useRef(-1);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);

  // Reset all playback state
  const resetPlayback = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setCurrentWordIndex(-1);
    setTimingMap(null);
    playbackStartTimeRef.current = 0;
    pauseOffsetRef.current = 0;
    lastWordIndexRef.current = -1;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Memoize context value
  const value = useMemo<AudioContextValue>(() => ({
    isPlaying,
    currentTime,
    duration,
    currentWordIndex,
    timingMap,
    backgroundVolume,
    isInlineMode,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setCurrentWordIndex,
    setTimingMap,
    setBackgroundVolume,
    setIsInlineMode,
    playbackStartTimeRef,
    pauseOffsetRef,
    animationFrameRef,
    lastWordIndexRef,
    backgroundAudioRef,
    resetPlayback,
  }), [
    isPlaying,
    currentTime,
    duration,
    currentWordIndex,
    timingMap,
    backgroundVolume,
    isInlineMode,
    resetPlayback,
  ]);

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

/**
 * Custom hook to access audio context
 */
export const useAudio = (): AudioContextValue => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export default AudioContext;
