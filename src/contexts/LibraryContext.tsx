import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { getMeditationHistoryPaginated, MeditationHistory } from '../../lib/supabase';

/**
 * Library context - manages meditation history and library state
 * Separated from AppContext to reduce re-renders for components
 * that don't need library-related state.
 */
interface LibraryContextValue {
  meditationHistory: MeditationHistory[];
  setMeditationHistory: (history: MeditationHistory[]) => void;
  isLoadingHistory: boolean;
  hasMoreHistory: boolean;
  loadMoreHistory: () => Promise<void>;
  refreshHistory: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [meditationHistory, setMeditationHistory] = useState<MeditationHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Refresh history from beginning
  const refreshHistory = useCallback(async () => {
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
  }, []);

  // Load more history (pagination)
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

  // Memoize to prevent unnecessary re-renders
  const value = useMemo<LibraryContextValue>(() => ({
    meditationHistory,
    setMeditationHistory,
    isLoadingHistory,
    hasMoreHistory,
    loadMoreHistory,
    refreshHistory,
  }), [
    meditationHistory,
    isLoadingHistory,
    hasMoreHistory,
    loadMoreHistory,
    refreshHistory,
  ]);

  return (
    <LibraryContext.Provider value={value}>
      {children}
    </LibraryContext.Provider>
  );
};

/**
 * Hook to access library context
 */
export const useLibrary = (): LibraryContextValue => {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};

export default LibraryContext;
