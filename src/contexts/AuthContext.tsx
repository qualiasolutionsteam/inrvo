import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { supabase, getCurrentUser } from '../../lib/supabase';

/**
 * Authentication context - manages user authentication state
 * Separated from AppContext to reduce re-renders for components
 * that only need auth state.
 */
interface AuthContextValue {
  user: any;
  setUser: (user: any) => void;
  checkUser: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check user auth status
  const checkUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to check user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set up auth listener
  useEffect(() => {
    checkUser();

    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [checkUser]);

  // Memoize to prevent unnecessary re-renders
  const value = useMemo<AuthContextValue>(() => ({
    user,
    setUser,
    checkUser,
    isLoading,
    isAuthenticated: !!user,
  }), [user, checkUser, isLoading]);

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
