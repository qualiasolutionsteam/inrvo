import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { VoiceProfile, CloningStatus } from '@/types';
import { VoiceProfile as DBVoiceProfile } from '@/lib/supabase';
import { VOICE_PROFILES } from '@/constants';

/**
 * Voice/cloning state - manages voice profiles and cloning process
 */
interface VoiceContextValue {
  // Voice selection
  availableVoices: VoiceProfile[];
  selectedVoice: VoiceProfile | null;
  setAvailableVoices: (voices: VoiceProfile[]) => void;
  setSelectedVoice: (voice: VoiceProfile | null) => void;

  // Cloning status
  cloningStatus: CloningStatus;
  setCloningStatus: (status: CloningStatus) => void;

  // Saved voices from database
  savedVoices: DBVoiceProfile[];
  setSavedVoices: (voices: DBVoiceProfile[]) => void;
  currentClonedVoice: DBVoiceProfile | null;
  setCurrentClonedVoice: (voice: DBVoiceProfile | null) => void;

  // Actions
  resetCloningStatus: () => void;
  addVoiceToAvailable: (voice: VoiceProfile) => void;
  removeVoiceFromAvailable: (voiceId: string) => void;
}

// Create context
const VoiceContext = createContext<VoiceContextValue | undefined>(undefined);

/**
 * Voice Provider component
 */
export const VoiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Voice selection state
  const [availableVoices, setAvailableVoices] = useState<VoiceProfile[]>(VOICE_PROFILES);
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile | null>(null);

  // Cloning status
  const [cloningStatus, setCloningStatus] = useState<CloningStatus>({ state: 'idle' });

  // Saved voices from database
  const [savedVoices, setSavedVoices] = useState<DBVoiceProfile[]>([]);
  const [currentClonedVoice, setCurrentClonedVoice] = useState<DBVoiceProfile | null>(null);

  // Reset cloning status to idle
  const resetCloningStatus = useCallback(() => {
    setCloningStatus({ state: 'idle' });
  }, []);

  // Add a voice to available voices
  const addVoiceToAvailable = useCallback((voice: VoiceProfile) => {
    setAvailableVoices(prev => {
      // Check if voice already exists
      if (prev.some(v => v.id === voice.id)) {
        return prev;
      }
      return [...prev, voice];
    });
  }, []);

  // Remove a voice from available voices
  const removeVoiceFromAvailable = useCallback((voiceId: string) => {
    setAvailableVoices(prev => prev.filter(v => v.id !== voiceId));
  }, []);

  // Memoize context value
  const value = useMemo<VoiceContextValue>(() => ({
    availableVoices,
    selectedVoice,
    setAvailableVoices,
    setSelectedVoice,
    cloningStatus,
    setCloningStatus,
    savedVoices,
    setSavedVoices,
    currentClonedVoice,
    setCurrentClonedVoice,
    resetCloningStatus,
    addVoiceToAvailable,
    removeVoiceFromAvailable,
  }), [
    availableVoices,
    selectedVoice,
    cloningStatus,
    savedVoices,
    currentClonedVoice,
    resetCloningStatus,
    addVoiceToAvailable,
    removeVoiceFromAvailable,
  ]);

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
};

/**
 * Custom hook to access voice context
 */
export const useVoice = (): VoiceContextValue => {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};

export default VoiceContext;
