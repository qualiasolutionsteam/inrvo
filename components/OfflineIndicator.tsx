import { useEffect, useState } from 'react';
import { useOnlineStatus } from '../src/hooks/useOnlineStatus';

/**
 * Displays a banner when the user is offline
 * Automatically shows reconnection message when back online
 */
export function OfflineIndicator() {
  const { isOnline, wasOffline, acknowledgeReconnection } = useOnlineStatus();
  const [visible, setVisible] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
      setShowReconnected(false);
    } else if (wasOffline) {
      // Just reconnected
      setShowReconnected(true);
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setVisible(false);
        acknowledgeReconnection();
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [isOnline, wasOffline, acknowledgeReconnection]);

  if (!visible && !showReconnected) {
    return null;
  }

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium
        transition-all duration-300 ease-in-out
        ${showReconnected
          ? 'bg-sky-600/90 text-white'
          : 'bg-amber-500/90 text-black'
        }
      `}
      role="alert"
      aria-live="polite"
    >
      {showReconnected ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          You're back online
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
            />
          </svg>
          You're offline. Some features may be unavailable.
        </span>
      )}
    </div>
  );
}

export default OfflineIndicator;
