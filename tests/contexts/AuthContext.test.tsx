import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';

// Use vi.hoisted to ensure mocks are available when vi.mock factory runs
const {
  mockOnAuthStateChange,
  mockGetSession,
  mockGetUser,
} = vi.hoisted(() => ({
  mockOnAuthStateChange: vi.fn(),
  mockGetSession: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
      getSession: mockGetSession,
      getUser: mockGetUser,
    },
  },
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));

// Import after mocking
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';

// Helper wrapper for renderHook
function createWrapper() {
  return ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
}

// Mock user object
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
};

// Mock session object
const mockSession = {
  user: mockUser,
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_at: Date.now() / 1000 + 3600,
};

describe('AuthContext', () => {
  let authCallback: ((event: string, session: typeof mockSession | null) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    authCallback = null;

    // Default mock implementation - captures the callback
    mockOnAuthStateChange.mockImplementation((callback) => {
      authCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });

    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('hooks outside provider', () => {
    it('useAuth should throw error when used outside AuthProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
      consoleSpy.mockRestore();
    });
  });

  describe('initial state', () => {
    it('should have null user initially', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });
      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should start loading', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });
      expect(result.current.isLoading).toBe(true);
    });

    it('should not be session ready initially', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });
      expect(result.current.isSessionReady).toBe(false);
    });
  });

  describe('auth state change - INITIAL_SESSION', () => {
    it('should set user on INITIAL_SESSION with session', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });

      act(() => {
        authCallback!('INITIAL_SESSION', mockSession);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set user to null on INITIAL_SESSION without session', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });

      act(() => {
        authCallback!('INITIAL_SESSION', null);
      });

      await waitFor(() => {
        expect(result.current.user).toBe(null);
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('auth state change - SIGNED_IN', () => {
    it('should set user on SIGNED_IN', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });

      act(() => {
        authCallback!('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should mark session ready when access token available', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });

      act(() => {
        authCallback!('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(result.current.isSessionReady).toBe(true);
      });
    });
  });

  describe('auth state change - SIGNED_OUT', () => {
    it('should clear user on SIGNED_OUT', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });

      // First sign in
      act(() => {
        authCallback!('SIGNED_IN', mockSession);
      });
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Then sign out
      act(() => {
        authCallback!('SIGNED_OUT', null);
      });
      await waitFor(() => {
        expect(result.current.user).toBe(null);
        expect(result.current.isAuthenticated).toBe(false);
      });
    });
  });

  describe('auth state change - TOKEN_REFRESHED', () => {
    it('should mark session ready on TOKEN_REFRESHED', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });

      act(() => {
        authCallback!('TOKEN_REFRESHED', mockSession);
      });

      await waitFor(() => {
        expect(result.current.isSessionReady).toBe(true);
      });
    });
  });

  describe('checkUser', () => {
    it('should be available as a function', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });
      expect(typeof result.current.checkUser).toBe('function');
    });
  });

  describe('context value memoization', () => {
    it('should provide stable references for callbacks', async () => {
      const { result, rerender } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });

      const firstCheckUser = result.current.checkUser;
      rerender();
      expect(result.current.checkUser).toBe(firstCheckUser);
    });
  });
});
