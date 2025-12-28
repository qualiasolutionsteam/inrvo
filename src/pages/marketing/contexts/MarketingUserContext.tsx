import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

interface MarketingUserContextValue {
  email: string;
  displayName: string;
}

const MarketingUserContext = createContext<MarketingUserContextValue | null>(null);

interface MarketingUserProviderProps {
  children: ReactNode;
}

export function MarketingUserProvider({ children }: MarketingUserProviderProps) {
  const { user } = useAuth();

  const value = useMemo<MarketingUserContextValue>(
    () => ({
      email: user?.email || 'unknown',
      displayName: user?.email?.split('@')[0] || 'Unknown',
    }),
    [user?.email]
  );

  return (
    <MarketingUserContext.Provider value={value}>
      {children}
    </MarketingUserContext.Provider>
  );
}

export function useMarketingUser(): MarketingUserContextValue {
  const context = useContext(MarketingUserContext);
  if (!context) {
    throw new Error('useMarketingUser must be used within MarketingUserProvider');
  }
  return context;
}
