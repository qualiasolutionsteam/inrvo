import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { getAudioTagPreferences } from '../../lib/supabase';

/**
 * Audio tags context - manages audio tag preferences state
 * Separated from AppContext to reduce re-renders for components
 * that don't need audio tag state.
 */
interface AudioTagsContextValue {
  selectedAudioTags: string[];
  setSelectedAudioTags: (tags: string[]) => void;
  audioTagsEnabled: boolean;
  setAudioTagsEnabled: (enabled: boolean) => void;
  favoriteAudioTags: string[];
  setFavoriteAudioTags: (tags: string[]) => void;
  loadAudioTagPreferences: () => Promise<void>;
}

const AudioTagsContext = createContext<AudioTagsContextValue | undefined>(undefined);

export const AudioTagsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedAudioTags, setSelectedAudioTags] = useState<string[]>([]);
  const [audioTagsEnabled, setAudioTagsEnabled] = useState(false);
  const [favoriteAudioTags, setFavoriteAudioTags] = useState<string[]>([]);

  // Load preferences from database
  const loadAudioTagPreferences = useCallback(async () => {
    try {
      const prefs = await getAudioTagPreferences();
      setAudioTagsEnabled(prefs.enabled);
      setFavoriteAudioTags(prefs.favorite_tags || []);
    } catch (err) {
      console.warn('Failed to load audio tag preferences:', err);
    }
  }, []);

  // Memoize to prevent unnecessary re-renders
  const value = useMemo<AudioTagsContextValue>(() => ({
    selectedAudioTags,
    setSelectedAudioTags,
    audioTagsEnabled,
    setAudioTagsEnabled,
    favoriteAudioTags,
    setFavoriteAudioTags,
    loadAudioTagPreferences,
  }), [
    selectedAudioTags,
    audioTagsEnabled,
    favoriteAudioTags,
    loadAudioTagPreferences,
  ]);

  return (
    <AudioTagsContext.Provider value={value}>
      {children}
    </AudioTagsContext.Provider>
  );
};

/**
 * Hook to access audio tags context
 */
export const useAudioTags = (): AudioTagsContextValue => {
  const context = useContext(AudioTagsContext);
  if (context === undefined) {
    throw new Error('useAudioTags must be used within an AudioTagsProvider');
  }
  return context;
};

export default AudioTagsContext;
