import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { VoiceProfile, ScriptTimingMap, CloningStatus, CreditInfo } from '../../types';
import { VOICE_PROFILES, BACKGROUND_TRACKS, BackgroundTrack } from '../../constants';
import { getCurrentUser, getUserVoiceProfiles, VoiceProfile as DBVoiceProfile, getMeditationHistoryPaginated, MeditationHistory, getAudioTagPreferences } from '../../lib/supabase';
import {
  getCachedVoiceProfiles,
  setCachedVoiceProfiles,
  clearVoiceProfileCache,
  addToCachedVoiceProfiles,
  updateCachedVoiceProfile,
  removeFromCachedVoiceProfiles,
} from '../lib/voiceProfileCache';
import { useAuth } from './AuthContext';

interface AppContextType {
  // Auth (from AuthContext - kept for backward compatibility)
  user: ReturnType<typeof useAuth>['user'];

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
  loadUserVoices: (forceRefresh?: boolean) => Promise<void>;
  // Voice cache management
  invalidateVoiceCache: () => void;
  addVoiceToCache: (voice: DBVoiceProfile) => void;
  updateVoiceInCache: (id: string, updates: Partial<DBVoiceProfile>) => void;
  removeVoiceFromCache: (id: string) => void;
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
  // Get user from AuthContext (single source of truth)
  const { user } = useAuth();

  // Voice state
  const [availableVoices, setAvailableVoices] = useState<VoiceProfile[]>(VOICE_PROFILES);
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile | null>(null);
  const [savedVoices, setSavedVoices] = useState<DBVoiceProfile[]>([]);

  // Cloning state
  const [cloningStatus, setCloningStatus] = useState<CloningStatus>({ state: 'idle' });
  // Credits are disabled - default to unlimited access for all users
  const [creditInfo, setCreditInfo] = useState<CreditInfo>({
    canClone: true,
    creditsRemaining: 999999999,
    clonesRemaining: 999999,
    cloneCost: 0,
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

  // Helper to transform DB voice profiles to UI voice profiles
  const transformVoicesToUI = useCallback((voices: DBVoiceProfile[]) => {
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
    return [...VOICE_PROFILES, ...clonedVoiceProfiles];
  }, []);

  // Load user voices (with cache support)
  const loadUserVoices = useCallback(async (forceRefresh = false) => {
    try {
      const currentUser = await getCurrentUser();
      const userId = currentUser?.id;

      // Try cache first (unless force refresh)
      if (!forceRefresh && userId) {
        const cached = getCachedVoiceProfiles(userId);
        if (cached) {
          setSavedVoices(cached as DBVoiceProfile[]);
          setAvailableVoices(transformVoicesToUI(cached as DBVoiceProfile[]));
          return; // Cache hit - skip DB query
        }
      }

      // Cache miss or force refresh - fetch from DB
      const voices = await getUserVoiceProfiles();
      setSavedVoices(voices);
      setAvailableVoices(transformVoicesToUI(voices));

      // Update cache
      if (userId) {
        setCachedVoiceProfiles(userId, voices);
      }
    } catch (err) {
      console.error('Failed to load user voices:', err);
    }
  }, [transformVoicesToUI]);

  // Voice cache management functions
  const invalidateVoiceCache = useCallback(() => {
    clearVoiceProfileCache();
  }, []);

  const addVoiceToCache = useCallback(async (voice: DBVoiceProfile) => {
    const currentUser = await getCurrentUser();
    if (currentUser?.id) {
      addToCachedVoiceProfiles(currentUser.id, voice);
      // Also update local state immediately
      setSavedVoices(prev => {
        const newVoices = [voice, ...prev];
        // Update availableVoices with the new list
        setAvailableVoices(transformVoicesToUI(newVoices));
        return newVoices;
      });
    }
  }, [transformVoicesToUI]);

  const updateVoiceInCache = useCallback(async (id: string, updates: Partial<DBVoiceProfile>) => {
    const currentUser = await getCurrentUser();
    if (currentUser?.id) {
      updateCachedVoiceProfile(currentUser.id, id, updates);
      // Also update local state immediately
      setSavedVoices(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    }
  }, []);

  const removeVoiceFromCache = useCallback(async (id: string) => {
    const currentUser = await getCurrentUser();
    if (currentUser?.id) {
      removeFromCachedVoiceProfiles(currentUser.id, id);
      // Also update local state immediately
      setSavedVoices(prev => {
        const newVoices = prev.filter(v => v.id !== id);
        // Update availableVoices with the new list
        setAvailableVoices(transformVoicesToUI(newVoices));
        return newVoices;
      });
    }
  }, [transformVoicesToUI]);

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

  // Load voices and preferences when user changes (user comes from AuthContext)
  useEffect(() => {
    if (user) {
      Promise.all([loadUserVoices(), loadAudioTagPrefs()]).catch(console.error);
    }
  }, [user, loadUserVoices]);

  // Memoize context value to prevent unnecessary re-renders
  // Only re-creates object when dependencies actually change
  const value = useMemo<AppContextType>(() => ({
    user,
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
    invalidateVoiceCache,
    addVoiceToCache,
    updateVoiceInCache,
    removeVoiceFromCache,
  }), [
    user, availableVoices, selectedVoice, savedVoices,
    cloningStatus, creditInfo, selectedBackgroundTrack, backgroundVolume,
    voiceVolume, playbackRate, script, enhancedScript, editableScript,
    selectedAudioTags, audioTagsEnabled, favoriteAudioTags, meditationHistory,
    isLoadingHistory, hasMoreHistory, loadMoreHistory, refreshHistory,
    isPlaying, currentTime, duration, currentWordIndex, timingMap,
    isGenerating, generationStage, chatStarted, restoredScript, micError, loadUserVoices,
    invalidateVoiceCache, addVoiceToCache, updateVoiceInCache, removeVoiceFromCache,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppProvider;
