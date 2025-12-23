import { useState, useEffect, useCallback } from 'react';

interface OnlineStatusState {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineAt: Date | null;
  lastOfflineAt: Date | null;
}

interface UseOnlineStatusReturn extends OnlineStatusState {
  checkConnection: () => Promise<boolean>;
  acknowledgeReconnection: () => void;
}

/**
 * Hook to detect online/offline status with connection verification
 * Provides user-friendly state for showing connectivity messages
 */
export function useOnlineStatus(): UseOnlineStatusReturn {
  const [state, setState] = useState<OnlineStatusState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    lastOnlineAt: null,
    lastOfflineAt: null,
  });

  // Verify actual connectivity by making a lightweight request
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Use a lightweight endpoint that should always be available
      const response = await fetch('/favicon.svg', {
        method: 'HEAD',
        cache: 'no-store',
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  // Clear the "was offline" flag when user acknowledges
  const acknowledgeReconnection = useCallback(() => {
    setState(prev => ({ ...prev, wasOffline: false }));
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({
        ...prev,
        isOnline: true,
        wasOffline: !prev.isOnline ? true : prev.wasOffline, // Only set if transitioning
        lastOnlineAt: new Date(),
      }));
    };

    const handleOffline = () => {
      setState(prev => ({
        ...prev,
        isOnline: false,
        lastOfflineAt: new Date(),
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection on mount
    checkConnection().then(isConnected => {
      if (!isConnected && state.isOnline) {
        // Browser thinks we're online but we can't reach the server
        setState(prev => ({
          ...prev,
          isOnline: false,
          lastOfflineAt: new Date(),
        }));
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection, state.isOnline]);

  return {
    ...state,
    checkConnection,
    acknowledgeReconnection,
  };
}

export default useOnlineStatus;
