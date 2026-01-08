import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';

// Use vi.hoisted to ensure mocks are available when vi.mock factory runs
const {
  mockOnAuthStateChange,
  mockGetSession,
  mockGetUser,
  mockGetUserVoiceProfiles,
} = vi.hoisted(() => ({
  mockOnAuthStateChange: vi.fn(),
  mockGetSession: vi.fn(),
  mockGetUser: vi.fn(),
  mockGetUserVoiceProfiles: vi.fn(),
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
  getUserVoiceProfiles: mockGetUserVoiceProfiles,
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
      // Return subscription object
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
    mockGetUserVoiceProfiles.mockResolvedValue([]);
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

      // Wait for initial setup
      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });

      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should have empty saved voices initially', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });

      expect(result.current.savedVoices).toEqual([]);
    });

    it('should start loading', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);
    });

    it('should not be session ready initially', async () => {
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

      // Wait for listener to be set up
      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });

      // Simulate INITIAL_SESSION event with session
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

      // Simulate INITIAL_SESSION without session
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

      // Simulate sign in
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

    it('should clear saved voices on SIGNED_OUT', async () => {
      mockGetUserVoiceProfiles.mockResolvedValue([
        { id: 'voice-1', name: 'Test Voice' },
      ]);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });

      // Sign in and load voices
      act(() => {
        authCallback!('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Sign out
      act(() => {
        authCallback!('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(result.current.savedVoices).toEqual([]);
      });
    });

    it('should clear current cloned voice on SIGNED_OUT', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });

      // Sign in
      act(() => {
        authCallback!('SIGNED_IN', mockSession);
      });

      // Set a cloned voice
      act(() => {
        result.current.setCurrentClonedVoice({
          id: 'voice-1',
          user_id: 'user-123',
          name: 'My Voice',
          language: 'en',
          status: 'READY',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        });
      });

      expect(result.current.currentClonedVoice).not.toBeNull();

      // Sign out
      act(() => {
        authCallback!('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(result.current.currentClonedVoice).toBe(null);
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

      // Simulate token refresh
      act(() => {
        authCallback!('TOKEN_REFRESHED', mockSession);
      });

      await waitFor(() => {
        expect(result.current.isSessionReady).toBe(true);
      });
    });
  });

  describe('voice profile management', () => {
    it('should load user voices when user changes', async () => {
      const mockVoices = [
        { id: 'voice-1', name: 'Voice 1', user_id: 'user-123', language: 'en', status: 'READY', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 'voice-2', name: 'Voice 2', user_id: 'user-123', language: 'en', status: 'READY', created_at: '2024-01-01', updated_at: '2024-01-01' },
      ];
      mockGetUserVoiceProfiles.mockResolvedValue(mockVoices);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });

      // Sign in
      act(() => {
        authCallback!('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(mockGetUserVoiceProfiles).toHaveBeenCalled();
        expect(result.current.savedVoices).toEqual(mockVoices);
      });
    });

    it('should update saved voices via setSavedVoices', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });

      const newVoices = [
        { id: 'new-voice', name: 'New Voice', user_id: 'user-123', language: 'en', status: 'READY', created_at: '2024-01-01', updated_at: '2024-01-01' },
      ];

      act(() => {
        result.current.setSavedVoices(newVoices);
      });

      expect(result.current.savedVoices).toEqual(newVoices);
    });

    it('should set current cloned voice', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });

      const voice = {
        id: 'voice-1',
        user_id: 'user-123',
        name: 'My Cloned Voice',
        language: 'en',
        status: 'READY' as const,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      act(() => {
        result.current.setCurrentClonedVoice(voice);
      });

      expect(result.current.currentClonedVoice).toEqual(voice);
    });

    it('should clear current cloned voice when set to null', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });

      // Set a voice first
      act(() => {
        result.current.setCurrentClonedVoice({
          id: 'voice-1',
          user_id: 'user-123',
          name: 'Voice',
          language: 'en',
          status: 'READY',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        });
      });

      expect(result.current.currentClonedVoice).not.toBeNull();

      // Clear it
      act(() => {
        result.current.setCurrentClonedVoice(null);
      });

      expect(result.current.currentClonedVoice).toBe(null);
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

  describe('loadUserVoices', () => {
    it('should be available as a function', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });

      expect(typeof result.current.loadUserVoices).toBe('function');
    });

    it('should clear voices when user is null', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });

      // Set some voices first
      act(() => {
        result.current.setSavedVoices([
          { id: 'voice-1', user_id: 'user-123', name: 'Voice', language: 'en', status: 'READY', created_at: '2024-01-01', updated_at: '2024-01-01' },
        ]);
      });

      // Manually call loadUserVoices with no user
      await act(async () => {
        await result.current.loadUserVoices();
      });

      // Should clear voices since user is null
      expect(result.current.savedVoices).toEqual([]);
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
      const firstLoadUserVoices = result.current.loadUserVoices;

      rerender();

      // Functions should be stable (same reference)
      expect(result.current.checkUser).toBe(firstCheckUser);
      // loadUserVoices depends on user, so it may change
    });
  });

  describe('error handling', () => {
    it('should handle voice profile loading errors gracefully', async () => {
      mockGetUserVoiceProfiles.mockRejectedValue(new Error('Failed to load voices'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });

      // Sign in - should attempt to load voices and fail gracefully
      act(() => {
        authCallback!('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(mockGetUserVoiceProfiles).toHaveBeenCalled();
      });

      // Should not crash, voices should remain empty
      expect(result.current.savedVoices).toEqual([]);
    });
  });

  describe('isLoadingVoices', () => {
    it('should track voice loading state', async () => {
      let resolveVoices: (value: any[]) => void;
      mockGetUserVoiceProfiles.mockImplementation(() => new Promise(resolve => {
        resolveVoices = resolve;
      }));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(authCallback).not.toBeNull();
      });

      // Sign in - should start loading voices
      act(() => {
        authCallback!('SIGNED_IN', mockSession);
      });

      // Should be loading
      await waitFor(() => {
        expect(result.current.isLoadingVoices).toBe(true);
      });

      // Resolve the voices
      await act(async () => {
        resolveVoices!([]);
      });

      // Should stop loading
      await waitFor(() => {
        expect(result.current.isLoadingVoices).toBe(false);
      });
    });
  });
});
