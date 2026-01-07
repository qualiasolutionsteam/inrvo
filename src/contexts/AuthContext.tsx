import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, ReactNode } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, getCurrentUser, getUserVoiceProfiles, VoiceProfile } from '../../lib/supabase';

/**
 * Authentication context - manages user authentication state and voice profiles
 * Separated from AppContext to reduce re-renders for components
 * that only need auth state.
 */
interface AuthContextValue {
  // Auth state
  user: SupabaseUser | null;
  setUser: (user: SupabaseUser | null) => void;
  checkUser: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSessionReady: boolean; // True when session has valid access token (safe to make DB requests)

  // Voice profiles
  savedVoices: VoiceProfile[];
  setSavedVoices: (voices: VoiceProfile[]) => void;
  currentClonedVoice: VoiceProfile | null;
  setCurrentClonedVoice: (voice: VoiceProfile | null) => void;
  loadUserVoices: () => Promise<void>;
  isLoadingVoices: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionReady, setIsSessionReady] = useState(false); // Only true when access token is available

  // Voice profile state
  const [savedVoices, setSavedVoices] = useState<VoiceProfile[]>([]);
  const [currentClonedVoice, setCurrentClonedVoice] = useState<VoiceProfile | null>(null);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);

  // Check user auth status
  const checkUser = useCallback(async () => {
    console.log('[AuthContext] checkUser starting');
    setIsLoading(true);
    try {
      const currentUser = await getCurrentUser();
      console.log('[AuthContext] checkUser got user:', currentUser?.id);
      setUser(currentUser);
    } catch (error) {
      console.error('[AuthContext] Failed to check user:', error);
      setUser(null);
    } finally {
      console.log('[AuthContext] checkUser done, setting isLoading=false');
      setIsLoading(false);
    }
  }, []);

  // Load user's voice profiles
  const loadUserVoices = useCallback(async () => {
    if (!user) {
      setSavedVoices([]);
      return;
    }

    setIsLoadingVoices(true);
    try {
      const voices = await getUserVoiceProfiles();
      setSavedVoices(voices);
    } catch (error) {
      console.error('Failed to load voice profiles:', error);
    } finally {
      setIsLoadingVoices(false);
    }
  }, [user]);

  // Track if auth has been initialized (to skip fallback)
  const authInitializedRef = useRef(false);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Set up auth listener - onAuthStateChange is the single source of truth
  // This fires immediately on mount with INITIAL_SESSION event
  useEffect(() => {
    console.log('[AuthContext] Setting up auth, supabase exists:', !!supabase);

    if (!supabase) {
      console.log('[AuthContext] No supabase client, skipping listener');
      setIsLoading(false);
      return;
    }

    // onAuthStateChange fires INITIAL_SESSION immediately on setup
    // This is the recommended way to get the initial session (Supabase v2+)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state changed:', event, 'user:', session?.user?.id, 'hasToken:', !!session?.access_token);

      // Mark as initialized and clear fallback timeout
      authInitializedRef.current = true;
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }

      // Only update user state, let the listener be the source of truth
      setUser(session?.user ?? null);

      // Mark loading complete after INITIAL_SESSION or any auth event
      setIsLoading(false);

      // Session is ready when we have a valid access token
      // On page refresh, SIGNED_IN may fire before token is ready - verify with getSession
      if (session?.access_token) {
        console.log('[AuthContext] Session ready with access token');
        setIsSessionReady(true);
      } else if (session?.user) {
        // User exists but no token yet - wait for getSession to confirm
        console.log('[AuthContext] User exists but no token, verifying session...');
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          console.log('[AuthContext] Session verified with token');
          setIsSessionReady(true);
        } else {
          console.log('[AuthContext] No valid session found');
          setIsSessionReady(false);
        }
      } else {
        // No user - session not ready
        setIsSessionReady(false);
      }

      // Clear voice profiles on logout
      if (!session?.user) {
        setSavedVoices([]);
        setCurrentClonedVoice(null);
      }
    });

    // Fallback timeout in case onAuthStateChange doesn't fire
    // (shouldn't happen, but prevents infinite loading)
    fallbackTimeoutRef.current = setTimeout(() => {
      if (!authInitializedRef.current) {
        console.log('[AuthContext] Fallback timeout - checking user manually');
        checkUser();
      }
    }, 3000);

    return () => {
      authListener?.subscription.unsubscribe();
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, [checkUser]);

  // Load voice profiles when user changes
  useEffect(() => {
    if (user) {
      loadUserVoices();
    }
  }, [user, loadUserVoices]);

  // Memoize to prevent unnecessary re-renders
  const value = useMemo<AuthContextValue>(() => ({
    user,
    setUser,
    checkUser,
    isLoading,
    isAuthenticated: !!user,
    isSessionReady,
    savedVoices,
    setSavedVoices,
    currentClonedVoice,
    setCurrentClonedVoice,
    loadUserVoices,
    isLoadingVoices,
  }), [user, checkUser, isLoading, isSessionReady, savedVoices, currentClonedVoice, loadUserVoices, isLoadingVoices]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to access authentication context
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
