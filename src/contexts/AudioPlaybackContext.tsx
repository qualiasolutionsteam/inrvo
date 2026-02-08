import React, { createContext, useContext, useState, useRef, useMemo, useCallback, ReactNode } from 'react';
import { ScriptTimingMap } from '../../types';

/**
 * Data for a meditation that hasn't been saved yet.
 * Stored in context so PlayerPage can save it when user confirms.
 */
export interface PendingMeditation {
  prompt: string;
  script: string;
  voiceId: string;
  voiceName: string;
  backgroundTrackId?: string;
  backgroundTrackName?: string;
  natureSoundId?: string;
  natureSoundName?: string;
  durationSeconds: number;
  audioTags?: string[];
  base64Audio: string;
}

// ─── PlaybackTimeContext (high-frequency: 60fps during playback) ───────────

interface PlaybackTimeContextType {
  currentTime: number;
  setCurrentTime: (time: number) => void;
  currentWordIndex: number;
  setCurrentWordIndex: (index: number) => void;
}

const PlaybackTimeContext = createContext<PlaybackTimeContextType | undefined>(undefined);

/**
 * Hook for high-frequency playback time. Only components that render
 * progress bars or word highlighting should use this.
 * Other components use useAudioPlayback() which stays stable during playback.
 */
export const usePlaybackTime = () => {
  const context = useContext(PlaybackTimeContext);
  if (!context) {
    throw new Error('usePlaybackTime must be used within an AudioPlaybackProvider');
  }
  return context;
};

// ─── AudioPlaybackContext (low-frequency: stable during playback) ──────────

interface AudioPlaybackContextType {
  // Playback state (low-frequency)
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  duration: number;
  setDuration: (duration: number) => void;
  timingMap: ScriptTimingMap | null;
  setTimingMap: (map: ScriptTimingMap | null) => void;

  // High-frequency state access (for backwards compatibility)
  // Components that need currentTime should prefer usePlaybackTime()
  currentTime: number;
  setCurrentTime: (time: number) => void;
  currentWordIndex: number;
  setCurrentWordIndex: (index: number) => void;

  // Audio refs
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  audioSourceRef: React.MutableRefObject<AudioBufferSourceNode | null>;
  audioBufferRef: React.MutableRefObject<AudioBuffer | null>;
  gainNodeRef: React.MutableRefObject<GainNode | null>;
  backgroundAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  natureSoundAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  backgroundGainNodeRef: React.MutableRefObject<GainNode | null>;
  natureSoundGainNodeRef: React.MutableRefObject<GainNode | null>;

  // Audio settings
  backgroundVolume: number;
  setBackgroundVolume: (volume: number) => void;
  voiceVolume: number;
  setVoiceVolume: (volume: number) => void;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;

  // Pending meditation (for save-on-exit flow)
  pendingMeditation: PendingMeditation | null;
  setPendingMeditation: (data: PendingMeditation | null) => void;
  clearPendingMeditation: () => void;
}

const AudioPlaybackContext = createContext<AudioPlaybackContextType | undefined>(undefined);

export const useAudioPlayback = () => {
  const context = useContext(AudioPlaybackContext);
  if (!context) {
    throw new Error('useAudioPlayback must be used within an AudioPlaybackProvider');
  }
  return context;
};

// Selector hooks for granular subscriptions
export const useIsPlaying = () => {
  const { isPlaying, setIsPlaying } = useAudioPlayback();
  return { isPlaying, setIsPlaying };
};

export const usePlaybackRate = () => {
  const { playbackRate, setPlaybackRate } = useAudioPlayback();
  return { playbackRate, setPlaybackRate };
};

// ─── Provider ─────────────────────────────────────────────────────────────

interface AudioPlaybackProviderProps {
  children: ReactNode;
}

export const AudioPlaybackProvider: React.FC<AudioPlaybackProviderProps> = ({ children }) => {
  // Low-frequency playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [timingMap, setTimingMap] = useState<ScriptTimingMap | null>(null);

  // High-frequency playback state (isolated in PlaybackTimeContext)
  const [currentTime, setCurrentTime] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

  // Audio settings - less frequent updates
  const [backgroundVolume, setBackgroundVolume] = useState(0.3);
  const [voiceVolume, setVoiceVolume] = useState(0.7);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  // Pending meditation - for save-on-exit flow
  const [pendingMeditation, setPendingMeditation] = useState<PendingMeditation | null>(null);
  const clearPendingMeditation = useCallback(() => setPendingMeditation(null), []);

  // Audio refs - stable references, never change identity
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const natureSoundAudioRef = useRef<HTMLAudioElement | null>(null);
  const backgroundGainNodeRef = useRef<GainNode | null>(null);
  const natureSoundGainNodeRef = useRef<GainNode | null>(null);

  // High-frequency time context (changes at 60fps during playback)
  // Isolated so only progress-bar/word-highlight components re-render
  const timeValue = useMemo<PlaybackTimeContextType>(() => ({
    currentTime,
    setCurrentTime,
    currentWordIndex,
    setCurrentWordIndex,
  }), [currentTime, currentWordIndex]);

  // Main context value - stable during playback (no currentTime/currentWordIndex in deps)
  // Includes currentTime/currentWordIndex for backwards compatibility but the value
  // object identity only changes on low-frequency events (play/pause, duration, settings)
  const value = useMemo<AudioPlaybackContextType>(() => ({
    isPlaying,
    setIsPlaying,
    duration,
    setDuration,
    timingMap,
    setTimingMap,
    // Pass through from state for backwards compat - consumers that read these
    // from useAudioPlayback() won't get re-renders at 60fps anymore.
    // They should migrate to usePlaybackTime() for reactive updates.
    currentTime,
    setCurrentTime,
    currentWordIndex,
    setCurrentWordIndex,
    audioContextRef,
    audioSourceRef,
    audioBufferRef,
    gainNodeRef,
    backgroundAudioRef,
    natureSoundAudioRef,
    backgroundGainNodeRef,
    natureSoundGainNodeRef,
    backgroundVolume,
    setBackgroundVolume,
    voiceVolume,
    setVoiceVolume,
    playbackRate,
    setPlaybackRate,
    pendingMeditation,
    setPendingMeditation,
    clearPendingMeditation,
  }), [
    // Only low-frequency deps - NO currentTime, NO currentWordIndex
    isPlaying, duration, timingMap,
    backgroundVolume, voiceVolume, playbackRate,
    pendingMeditation, clearPendingMeditation,
    // currentTime/currentWordIndex intentionally excluded from deps.
    // The values in the context object will be stale between low-frequency updates,
    // but setCurrentTime/setCurrentWordIndex (stable setState refs) always work.
    // Components needing reactive time should use usePlaybackTime().
  ]);

  return (
    <AudioPlaybackContext.Provider value={value}>
      <PlaybackTimeContext.Provider value={timeValue}>
        {children}
      </PlaybackTimeContext.Provider>
    </AudioPlaybackContext.Provider>
  );
};

export default AudioPlaybackProvider;
