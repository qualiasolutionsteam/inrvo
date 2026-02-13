import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';
import { getMeditationHistoryPaginated, MeditationHistory } from '../../lib/supabase';
import { useAuth } from './AuthContext';
import {
  getCachedHistory,
  setCachedHistory,
  clearHistoryCache,
  prependToHistoryCache,
  updateInHistoryCache,
  removeFromHistoryCache,
} from '../lib/historyCache';

// Only log in development mode
const DEBUG = import.meta.env.DEV;

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
  // Get user from AuthContext - single source of truth for auth state
  const { user, isLoading: isAuthLoading, isSessionReady } = useAuth();

  const [meditationHistory, setMeditationHistory] = useState<MeditationHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Refresh history from beginning (with cache support)
  const refreshHistory = useCallback(async (forceRefresh = false) => {
    // Use user from AuthContext - don't call getCurrentUser() independently
    const userId = user?.id;

    // Can't load without a user
    if (!userId) {
      DEBUG && console.log('[LibraryContext] No user, clearing history');
      setMeditationHistory([]);
      setHasMoreHistory(false);
      return;
    }

    // Try cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedHistory(userId, undefined, 20);
      DEBUG && console.log('[LibraryContext] Cache check:', cached ? `HIT (${cached.data.length} items)` : 'MISS');
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
      DEBUG && console.log('[LibraryContext] Loading history for user:', userId);
      const result = await getMeditationHistoryPaginated(0, 20, userId);
      DEBUG && console.log('[LibraryContext] Loaded:', result.data.length, 'items, hasMore:', result.hasMore);
      setMeditationHistory(result.data);
      setHasMoreHistory(result.hasMore);

      // Update cache
      setCachedHistory(userId, result.data, result.hasMore, undefined, 20);
    } catch (err) {
      console.error('[LibraryContext] Failed to load history:', err);
      // Don't clear data on error - keep showing what we had
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user?.id]);

  // Load more history (pagination) - doesn't use cache for simplicity
  const loadMoreHistory = useCallback(async () => {
    if (isLoadingMore || !hasMoreHistory) return;

    setIsLoadingMore(true);
    try {
      const nextPage = historyPage + 1;
      const result = await getMeditationHistoryPaginated(nextPage, 20, user?.id);
      setMeditationHistory(prev => [...prev, ...result.data]);
      setHistoryPage(nextPage);
      setHasMoreHistory(result.hasMore);
    } catch (err) {
      console.error('Failed to load more history:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [historyPage, hasMoreHistory, isLoadingMore, user?.id]);

  // Cache management functions - use user from context
  const invalidateCache = useCallback(() => {
    if (user?.id) {
      clearHistoryCache(user.id);
    }
  }, [user?.id]);

  const addToCache = useCallback((meditation: MeditationHistory) => {
    if (user?.id) {
      prependToHistoryCache(user.id, meditation);
      // Also update local state immediately
      setMeditationHistory(prev => [meditation, ...prev]);
    }
  }, [user?.id]);

  const updateInCache = useCallback((id: string, updates: Partial<MeditationHistory>) => {
    if (user?.id) {
      updateInHistoryCache(user.id, id, updates);
      // Also update local state immediately
      setMeditationHistory(prev =>
        prev.map(m => m.id === id ? { ...m, ...updates } : m)
      );
    }
  }, [user?.id]);

  const removeFromCache = useCallback((id: string) => {
    if (user?.id) {
      removeFromHistoryCache(user.id, id);
      // Also update local state immediately
      setMeditationHistory(prev => prev.filter(m => m.id !== id));
    }
  }, [user?.id]);

  // Clear history when user logs out, refresh when session is ready
  // Wait for isSessionReady to ensure access token is available for DB requests
  const userId = user?.id;
  useEffect(() => {
    if (userId && isSessionReady) {
      // Session is ready with valid token - refresh history (will use cache if available)
      DEBUG && console.log('[LibraryContext] Session ready, refreshing history for:', userId);
      refreshHistory();
    } else if (!isAuthLoading && !userId) {
      // User logged out and auth is not loading - clear history
      DEBUG && console.log('[LibraryContext] No user, clearing history');
      setMeditationHistory([]);
      setHasMoreHistory(false);
      setHistoryPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isSessionReady, isAuthLoading]); // Wait for session to be ready before loading

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
