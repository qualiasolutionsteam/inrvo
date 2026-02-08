import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { VoiceProfile, CloningStatus, CreditInfo } from '../../types';
import { VOICE_PROFILES, BACKGROUND_TRACKS, BackgroundTrack, NATURE_SOUNDS, NatureSound } from '../../constants';
import { getCurrentUser, getUserVoiceProfiles, VoiceProfile as DBVoiceProfile } from '../../lib/supabase';
import {
  getCachedVoiceProfiles,
  setCachedVoiceProfiles,
} from '../lib/voiceProfileCache';
import { useAuth } from './AuthContext';
import { AudioPlaybackProvider } from './AudioPlaybackContext';

// Only log in development mode
const DEBUG = import.meta.env.DEV;

/**
 * AppContext - Voice selection, cloning, and audio track state.
 *
 * Script state → ScriptContext
 * Library/history → LibraryContext
 * Audio tags → AudioTagsContext
 * Audio playback → AudioPlaybackContext (nested inside AppProvider)
 */
interface AppContextType {
  // Auth (proxied from AuthContext for convenience)
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

  // Audio track selection (not playback - that's in AudioPlaybackContext)
  selectedBackgroundTrack: BackgroundTrack;
  setSelectedBackgroundTrack: (track: BackgroundTrack) => void;
  selectedNatureSound: NatureSound;
  setSelectedNatureSound: (sound: NatureSound) => void;

  // Helper functions
  loadUserVoices: (forceRefresh?: boolean) => Promise<void>;
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
  // Get user and session state from AuthContext (single source of truth)
  const { user, isSessionReady } = useAuth();

  // Voice state
  const [availableVoices, setAvailableVoices] = useState<VoiceProfile[]>(VOICE_PROFILES);
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile | null>(null);
  const [savedVoices, setSavedVoices] = useState<DBVoiceProfile[]>([]);

  // Cloning state
  const [cloningStatus, setCloningStatus] = useState<CloningStatus>({ state: 'idle' });
  const [creditInfo, setCreditInfo] = useState<CreditInfo>({
    canClone: true,
    creditsRemaining: 999999999,
    clonesRemaining: 999999,
    cloneCost: 0,
  });

  // Audio track selection (playback state moved to AudioPlaybackContext)
  const [selectedBackgroundTrack, setSelectedBackgroundTrack] = useState<BackgroundTrack>(BACKGROUND_TRACKS[0]);
  const [selectedNatureSound, setSelectedNatureSound] = useState<NatureSound>(NATURE_SOUNDS[0]);

  // Helper to transform DB voice profiles to UI voice profiles
  const transformVoicesToUI = useCallback((voices: DBVoiceProfile[]) => {
    const clonedVoiceProfiles = voices
      .filter(v => v.fish_audio_model_id || v.voice_sample_url || v.provider_voice_id || v.elevenlabs_voice_id)
      .map(v => {
        const provider = v.elevenlabs_voice_id ? 'elevenlabs' as const
          : v.fish_audio_model_id ? 'fish-audio' as const
          : 'chatterbox' as const;
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
          elevenLabsVoiceId: v.elevenlabs_voice_id,
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
          return;
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

  // Load voices when session is ready
  useEffect(() => {
    if (user && isSessionReady) {
      DEBUG && console.log('[AppContext] Session ready, loading voices for:', user.id);
      loadUserVoices();
    }
  }, [user, isSessionReady, loadUserVoices]);

  // Memoize context value
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
    selectedNatureSound,
    setSelectedNatureSound,
    loadUserVoices,
  }), [
    user, availableVoices, selectedVoice, savedVoices,
    cloningStatus, creditInfo, selectedBackgroundTrack, selectedNatureSound,
    loadUserVoices,
  ]);

  // Wrap with AudioPlaybackProvider to provide audio state
  return (
    <AppContext.Provider value={value}>
      <AudioPlaybackProvider>
        {children}
      </AudioPlaybackProvider>
    </AppContext.Provider>
  );
};

export default AppProvider;
