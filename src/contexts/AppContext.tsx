import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo, ReactNode } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { VoiceProfile, ScriptTimingMap, CloningStatus, CreditInfo } from '../../types';
import { VOICE_PROFILES, BACKGROUND_TRACKS, BackgroundTrack } from '../../constants';
import { supabase, getCurrentUser, getUserVoiceProfiles, VoiceProfile as DBVoiceProfile, getMeditationHistoryPaginated, MeditationHistory, getAudioTagPreferences } from '../../lib/supabase';

interface AppContextType {
  // Auth
  user: SupabaseUser | null;
  setUser: (user: SupabaseUser | null) => void;
  checkUser: () => Promise<void>;

  // Voices
  availableVoices: VoiceProfile[];
  setAvailableVoices: (voices: VoiceProfile[]) => void;
  selectedVoice: VoiceProfile | null;
  setSelectedVoice: (voice: VoiceProfile | null) => void;
  savedVoices: DBVoiceProfile[];
  setSavedVoices: (voices: DBVoiceProfile[]) => void;

  // Cloning
  cloningStatus: CloningStatus;
  setCloningStatus: (status: CloningStatus) => void;
  creditInfo: CreditInfo;
  setCreditInfo: (info: CreditInfo) => void;

  // Audio
  selectedBackgroundTrack: BackgroundTrack;
  setSelectedBackgroundTrack: (track: BackgroundTrack) => void;
  backgroundVolume: number;
  setBackgroundVolume: (volume: number) => void;
  voiceVolume: number;
  setVoiceVolume: (volume: number) => void;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;

  // Script
  script: string;
  setScript: (script: string) => void;
  enhancedScript: string;
  setEnhancedScript: (script: string) => void;
  editableScript: string;
  setEditableScript: (script: string) => void;

  // Audio tags
  selectedAudioTags: string[];
  setSelectedAudioTags: (tags: string[]) => void;
  audioTagsEnabled: boolean;
  setAudioTagsEnabled: (enabled: boolean) => void;
  favoriteAudioTags: string[];
  setFavoriteAudioTags: (tags: string[]) => void;

  // Library
  meditationHistory: MeditationHistory[];
  setMeditationHistory: (history: MeditationHistory[]) => void;
  isLoadingHistory: boolean;
  hasMoreHistory: boolean;
  loadMoreHistory: () => Promise<void>;
  refreshHistory: () => Promise<void>;

  // Playback state
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  setDuration: (duration: number) => void;
  currentWordIndex: number;
  setCurrentWordIndex: (index: number) => void;
  timingMap: ScriptTimingMap | null;
  setTimingMap: (map: ScriptTimingMap | null) => void;

  // Audio refs
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  audioSourceRef: React.MutableRefObject<AudioBufferSourceNode | null>;
  audioBufferRef: React.MutableRefObject<AudioBuffer | null>;
  gainNodeRef: React.MutableRefObject<GainNode | null>;
  backgroundAudioRef: React.MutableRefObject<HTMLAudioElement | null>;

  // Generation state
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  generationStage: 'idle' | 'script' | 'voice' | 'ready';
  setGenerationStage: (stage: 'idle' | 'script' | 'voice' | 'ready') => void;

  // Chat state
  chatStarted: boolean;
  setChatStarted: (started: boolean) => void;
  restoredScript: string | null;
  setRestoredScript: (script: string | null) => void;

  // Error state
  micError: string | null;
  setMicError: (error: string | null) => void;

  // Helper functions
  loadUserVoices: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Auth state
  const [user, setUser] = useState<SupabaseUser | null>(null);

  // Voice state
  const [availableVoices, setAvailableVoices] = useState<VoiceProfile[]>(VOICE_PROFILES);
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile | null>(null);
  const [savedVoices, setSavedVoices] = useState<DBVoiceProfile[]>([]);

  // Cloning state
  const [cloningStatus, setCloningStatus] = useState<CloningStatus>({ state: 'idle' });
  const [creditInfo, setCreditInfo] = useState<CreditInfo>({
    canClone: false,
    creditsRemaining: 0,
    clonesRemaining: 0,
    cloneCost: 5000,
  });

  // Audio state
  const [selectedBackgroundTrack, setSelectedBackgroundTrack] = useState<BackgroundTrack>(BACKGROUND_TRACKS[0]);
  const [backgroundVolume, setBackgroundVolume] = useState(0.3);
  const [voiceVolume, setVoiceVolume] = useState(0.7);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  // Script state
  const [script, setScript] = useState('');
  const [enhancedScript, setEnhancedScript] = useState('');
  const [editableScript, setEditableScript] = useState('');

  // Audio tags state
  const [selectedAudioTags, setSelectedAudioTags] = useState<string[]>([]);
  const [audioTagsEnabled, setAudioTagsEnabled] = useState(false);
  const [favoriteAudioTags, setFavoriteAudioTags] = useState<string[]>([]);

  // Library state
  const [meditationHistory, setMeditationHistory] = useState<MeditationHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [timingMap, setTimingMap] = useState<ScriptTimingMap | null>(null);

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<'idle' | 'script' | 'voice' | 'ready'>('idle');

  // Chat state
  const [chatStarted, setChatStarted] = useState(false);
  const [restoredScript, setRestoredScript] = useState<string | null>(null);

  // Error state
  const [micError, setMicError] = useState<string | null>(null);

  // Load audio tag preferences
  const loadAudioTagPrefs = async () => {
    try {
      const prefs = await getAudioTagPreferences();
      setAudioTagsEnabled(prefs.enabled);
      setFavoriteAudioTags(prefs.favorite_tags || []);
    } catch (err) {
      console.warn('Failed to load audio tag preferences:', err);
    }
  };

  // Load user voices
  const loadUserVoices = useCallback(async () => {
    try {
      const voices = await getUserVoiceProfiles();
      setSavedVoices(voices);

      const clonedVoiceProfiles = voices
        .filter(v => v.fish_audio_model_id || v.voice_sample_url || v.provider_voice_id)
        .map(v => {
          const provider = v.fish_audio_model_id ? 'fish-audio' as const : 'chatterbox' as const;
          return {
            id: v.id,
            name: v.name,
            provider,
            voiceName: v.name,
            description: v.description || 'Your personalized voice clone',
            isCloned: true,
            providerVoiceId: v.provider_voice_id,
            fishAudioModelId: v.fish_audio_model_id,
            voiceSampleUrl: v.voice_sample_url,
          };
        });

      setAvailableVoices([...VOICE_PROFILES, ...clonedVoiceProfiles]);
    } catch (err) {
      console.error('Failed to load user voices:', err);
    }
  }, []);

  // Check user auth
  const checkUser = useCallback(async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      await loadUserVoices();
    }
  }, [loadUserVoices]);

  // Load meditation history
  const refreshHistory = useCallback(async () => {
    if (!user) return;

    setIsLoadingHistory(true);
    setHistoryPage(0);
    try {
      const result = await getMeditationHistoryPaginated(0, 20);
      setMeditationHistory(result.data);
      setHasMoreHistory(result.hasMore);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user]);

  // Load more history
  const loadMoreHistory = useCallback(async () => {
    if (isLoadingMore || !hasMoreHistory) return;

    setIsLoadingMore(true);
    try {
      const nextPage = historyPage + 1;
      const result = await getMeditationHistoryPaginated(nextPage, 20);
      setMeditationHistory(prev => [...prev, ...result.data]);
      setHistoryPage(nextPage);
      setHasMoreHistory(result.hasMore);
    } catch (err) {
      console.error('Failed to load more history:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [historyPage, hasMoreHistory, isLoadingMore]);

  // Auth listener
  useEffect(() => {
    checkUser();

    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        Promise.all([loadUserVoices(), loadAudioTagPrefs()]).catch(console.error);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [checkUser, loadUserVoices]);

  // Memoize context value to prevent unnecessary re-renders
  // Only re-creates object when dependencies actually change
  const value = useMemo<AppContextType>(() => ({
    user,
    setUser,
    checkUser,
    availableVoices,
    setAvailableVoices,
    selectedVoice,
    setSelectedVoice,
    savedVoices,
    setSavedVoices,
    cloningStatus,
    setCloningStatus,
    creditInfo,
    setCreditInfo,
    selectedBackgroundTrack,
    setSelectedBackgroundTrack,
    backgroundVolume,
    setBackgroundVolume,
    voiceVolume,
    setVoiceVolume,
    playbackRate,
    setPlaybackRate,
    script,
    setScript,
    enhancedScript,
    setEnhancedScript,
    editableScript,
    setEditableScript,
    selectedAudioTags,
    setSelectedAudioTags,
    audioTagsEnabled,
    setAudioTagsEnabled,
    favoriteAudioTags,
    setFavoriteAudioTags,
    meditationHistory,
    setMeditationHistory,
    isLoadingHistory,
    hasMoreHistory,
    loadMoreHistory,
    refreshHistory,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    currentWordIndex,
    setCurrentWordIndex,
    timingMap,
    setTimingMap,
    audioContextRef,
    audioSourceRef,
    audioBufferRef,
    gainNodeRef,
    backgroundAudioRef,
    isGenerating,
    setIsGenerating,
    generationStage,
    setGenerationStage,
    chatStarted,
    setChatStarted,
    restoredScript,
    setRestoredScript,
    micError,
    setMicError,
    loadUserVoices,
  }), [
    user, checkUser, availableVoices, selectedVoice, savedVoices,
    cloningStatus, creditInfo, selectedBackgroundTrack, backgroundVolume,
    voiceVolume, playbackRate, script, enhancedScript, editableScript,
    selectedAudioTags, audioTagsEnabled, favoriteAudioTags, meditationHistory,
    isLoadingHistory, hasMoreHistory, loadMoreHistory, refreshHistory,
    isPlaying, currentTime, duration, currentWordIndex, timingMap,
    isGenerating, generationStage, chatStarted, restoredScript, micError, loadUserVoices,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppProvider;
