import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, Dispatch, SetStateAction } from 'react';
import { getMeditationHistoryPaginated, MeditationHistory, getCurrentUser } from '../../lib/supabase';
import {
  getCachedHistory,
  setCachedHistory,
  clearHistoryCache,
  prependToHistoryCache,
  updateInHistoryCache,
  removeFromHistoryCache,
} from '../lib/historyCache';

/**
 * Library context - manages meditation history and library state
 * Separated from AppContext to reduce re-renders for components
 * that don't need library-related state.
 */
interface LibraryContextValue {
  meditationHistory: MeditationHistory[];
  setMeditationHistory: Dispatch<SetStateAction<MeditationHistory[]>>;
  isLoadingHistory: boolean;
  isLoadingMore: boolean;
  hasMoreHistory: boolean;
  loadMoreHistory: () => Promise<void>;
  refreshHistory: (forceRefresh?: boolean) => Promise<void>;
  // Cache management - call these after mutations
  invalidateCache: () => void;
  addToCache: (meditation: MeditationHistory) => void;
  updateInCache: (id: string, updates: Partial<MeditationHistory>) => void;
  removeFromCache: (id: string) => void;
}

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [meditationHistory, setMeditationHistory] = useState<MeditationHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Refresh history from beginning (with cache support)
  const refreshHistory = useCallback(async (forceRefresh = false) => {
    // Get current user for cache key
    const user = await getCurrentUser();
    const userId = user?.id;

    // Try cache first (unless force refresh)
    if (!forceRefresh && userId) {
      const cached = getCachedHistory(userId, undefined, 20);
      if (cached) {
        setMeditationHistory(cached.data as MeditationHistory[]);
        setHasMoreHistory(cached.hasMore);
        setHistoryPage(0);
        return; // Cache hit - skip DB query
      }
    }

    // Cache miss or force refresh - fetch from DB
    setIsLoadingHistory(true);
    setHistoryPage(0);
    try {
      const result = await getMeditationHistoryPaginated(0, 20);
      setMeditationHistory(result.data);
      setHasMoreHistory(result.hasMore);

      // Update cache
      if (userId) {
        setCachedHistory(userId, result.data, result.hasMore, undefined, 20);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Load more history (pagination) - doesn't use cache for simplicity
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

  // Cache management functions
  const invalidateCache = useCallback(async () => {
    const user = await getCurrentUser();
    if (user?.id) {
      clearHistoryCache(user.id);
    }
  }, []);

  const addToCache = useCallback(async (meditation: MeditationHistory) => {
    const user = await getCurrentUser();
    if (user?.id) {
      prependToHistoryCache(user.id, meditation);
      // Also update local state immediately
      setMeditationHistory(prev => [meditation, ...prev]);
    }
  }, []);

  const updateInCache = useCallback(async (id: string, updates: Partial<MeditationHistory>) => {
    const user = await getCurrentUser();
    if (user?.id) {
      updateInHistoryCache(user.id, id, updates);
      // Also update local state immediately
      setMeditationHistory(prev =>
        prev.map(m => m.id === id ? { ...m, ...updates } : m)
      );
    }
  }, []);

  const removeFromCache = useCallback(async (id: string) => {
    const user = await getCurrentUser();
    if (user?.id) {
      removeFromHistoryCache(user.id, id);
      // Also update local state immediately
      setMeditationHistory(prev => prev.filter(m => m.id !== id));
    }
  }, []);

  // Memoize to prevent unnecessary re-renders
  const value = useMemo<LibraryContextValue>(() => ({
    meditationHistory,
    setMeditationHistory,
    isLoadingHistory,
    isLoadingMore,
    hasMoreHistory,
    loadMoreHistory,
    refreshHistory,
    invalidateCache,
    addToCache,
    updateInCache,
    removeFromCache,
  }), [
    meditationHistory,
    isLoadingHistory,
    isLoadingMore,
    hasMoreHistory,
    loadMoreHistory,
    refreshHistory,
    invalidateCache,
    addToCache,
    updateInCache,
    removeFromCache,
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
