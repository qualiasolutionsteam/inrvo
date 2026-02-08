import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, ReactNode } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, getCurrentUser } from '../../lib/supabase';

// Only log in development mode
const DEBUG = import.meta.env.DEV;

/**
 * Authentication context - manages user authentication state.
 * Voice profiles are managed by AppContext (with caching).
 */
interface AuthContextValue {
  user: SupabaseUser | null;
  setUser: (user: SupabaseUser | null) => void;
  checkUser: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSessionReady: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionReady, setIsSessionReady] = useState(false);

  // Check user auth status
  const checkUser = useCallback(async () => {
    if (DEBUG) console.log('[AuthContext] checkUser starting');
    setIsLoading(true);
    try {
      const currentUser = await getCurrentUser();
      if (DEBUG) console.log('[AuthContext] checkUser got user:', currentUser?.id);
      setUser(currentUser);
    } catch (error) {
      console.error('[AuthContext] Failed to check user:', error);
      setUser(null);
    } finally {
      if (DEBUG) console.log('[AuthContext] checkUser done, setting isLoading=false');
      setIsLoading(false);
    }
  }, []);

  // Track if auth has been initialized (to skip fallback)
  const authInitializedRef = useRef(false);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track if a session check is already in progress
  const checkingRef = useRef(false);

  // Set up auth listener - onAuthStateChange is the single source of truth
  // This fires immediately on mount with INITIAL_SESSION event
  useEffect(() => {
    if (DEBUG) console.log('[AuthContext] Setting up auth, supabase exists:', !!supabase);

    if (!supabase) {
      if (DEBUG) console.log('[AuthContext] No supabase client, skipping listener');
      setIsLoading(false);
      return;
    }

    // onAuthStateChange fires INITIAL_SESSION immediately on setup
    // This is the recommended way to get the initial session (Supabase v2+)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (DEBUG) console.log('[AuthContext] Auth state changed:', event, 'user:', session?.user?.id, 'hasToken:', !!session?.access_token);

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
      // Trust the token from the auth event directly - avoid calling getSession() in a loop
      // which causes a refresh token storm (30+ concurrent refresh calls → rate limiting)
      if (session?.access_token) {
        if (DEBUG) console.log('[AuthContext] Session ready with access token from event:', event);
        setIsSessionReady(true);
        return;
      }

      if (session?.user) {
        // Rare edge case: user exists in event but no token yet (page refresh race condition)
        // Do a single delayed check instead of a 5-retry loop to avoid token refresh storms
        if (!checkingRef.current) {
          checkingRef.current = true;
          setTimeout(async () => {
            try {
              if (!supabase) return;
              const { data } = await supabase.auth.getSession();
              if (data.session?.access_token) {
                if (DEBUG) console.log('[AuthContext] Session verified with token after delay');
                setUser(data.session.user);
                setIsSessionReady(true);
              } else {
                if (DEBUG) console.warn('[AuthContext] No token after delay, setting session ready anyway');
                setIsSessionReady(true); // Let requests proceed - they'll get 401 and trigger re-auth
              }
            } finally {
              checkingRef.current = false;
            }
          }, 500);
        }
      } else {
        // No user - session not ready
        setIsSessionReady(false);
      }
    });

    // Fallback timeout in case onAuthStateChange doesn't fire
    // (shouldn't happen, but prevents infinite loading)
    fallbackTimeoutRef.current = setTimeout(async () => {
      if (!authInitializedRef.current) {
        if (DEBUG) console.log('[AuthContext] Fallback timeout - checking user manually');
        await checkUser();
        // Also check session ready state manually
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.access_token) {
            setIsSessionReady(true);
          }
        }
      }
    }, 3000);

    return () => {
      authListener?.subscription.unsubscribe();
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, [checkUser]);

  // Memoize to prevent unnecessary re-renders
  const value = useMemo<AuthContextValue>(() => ({
    user,
    setUser,
    checkUser,
    isLoading,
    isAuthenticated: !!user,
    isSessionReady,
  }), [user, checkUser, isLoading, isSessionReady]);

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
