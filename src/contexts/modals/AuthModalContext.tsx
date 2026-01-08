import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

export type AuthModalMode = 'signin' | 'signup' | 'forgot';

interface AuthModalContextValue {
  showAuthModal: boolean;
  authModalMode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  setShowAuthModal: (show: boolean) => void;
  setAuthModalMode: (mode: AuthModalMode) => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

interface AuthModalProviderProps {
  children: ReactNode;
}

export function AuthModalProvider({ children }: AuthModalProviderProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('signin');

  const openAuthModal = useCallback((mode: AuthModalMode = 'signin') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  }, []);
  const closeAuthModal = useCallback(() => setShowAuthModal(false), []);

  const value = useMemo<AuthModalContextValue>(() => ({
    showAuthModal,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    setShowAuthModal,
    setAuthModalMode,
  }), [showAuthModal, authModalMode, openAuthModal, closeAuthModal]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within AuthModalProvider');
  }
  return context;
}
