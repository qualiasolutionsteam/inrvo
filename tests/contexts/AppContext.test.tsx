import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';

// Store mock functions to configure per-test
let mockGetCurrentUser = vi.fn();
let mockGetUserVoiceProfiles = vi.fn();

// Mock supabase module
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: any) => {
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      },
    },
  },
  getCurrentUser: () => mockGetCurrentUser(),
  getUserVoiceProfiles: () => mockGetUserVoiceProfiles(),
}));

// Mock AuthContext - AppContext depends on useAuth
let mockAuthUser: any = null;

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    isSessionReady: true,
    isLoading: false,
    isAuthenticated: !!mockAuthUser,
    checkUser: vi.fn(),
    setUser: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock constants
vi.mock('../../constants', () => ({
  VOICE_PROFILES: [
    {
      id: 'preset-1',
      name: 'Default Voice',
      provider: 'browser',
      isCloned: false,
    },
  ],
  BACKGROUND_TRACKS: [
    {
      id: 'none',
      name: 'None',
      url: null,
      category: 'none',
    },
    {
      id: 'rain',
      name: 'Rain',
      url: '/audio/rain.mp3',
      category: 'nature',
    },
  ],
  NATURE_SOUNDS: [
    {
      id: 'none',
      name: 'No Sound',
      description: 'Nature sounds disabled',
      icon: 'VolumeOff',
      category: 'noise',
      audioUrl: '',
    },
  ],
}));

// Mock voice profile cache
vi.mock('../../src/lib/voiceProfileCache', () => ({
  getCachedVoiceProfiles: vi.fn(() => null),
  setCachedVoiceProfiles: vi.fn(),
}));

// Import after mocking
import { AppProvider, useApp } from '../../src/contexts/AppContext';

// Helper wrapper for renderHook
function createWrapper() {
  return ({ children }: { children: ReactNode }) => (
    <AppProvider>{children}</AppProvider>
  );
}

describe('AppContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = null;
    mockGetCurrentUser.mockResolvedValue(null);
    mockGetUserVoiceProfiles.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useApp hook', () => {
    it('should throw error when used outside AppProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        renderHook(() => useApp());
      }).toThrow('useApp must be used within an AppProvider');
      consoleSpy.mockRestore();
    });

    it('should return context when used within AppProvider', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });
      expect(result.current).toBeDefined();
      expect(result.current.user).toBeNull();
    });
  });

  describe('initial state', () => {
    it('should have correct auth initial state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });
      expect(result.current.user).toBeNull();
    });

    it('should have correct voice initial state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });
      expect(result.current.availableVoices).toHaveLength(1);
      expect(result.current.availableVoices[0].name).toBe('Default Voice');
      expect(result.current.selectedVoice).toBeNull();
      expect(result.current.savedVoices).toEqual([]);
    });

    it('should have correct cloning initial state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });
      expect(result.current.cloningStatus).toEqual({ state: 'idle' });
      expect(result.current.creditInfo).toEqual({
        canClone: true,
        creditsRemaining: 999999999,
        clonesRemaining: 999999,
        cloneCost: 0,
      });
    });

    it('should have correct background track initial state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });
      expect(result.current.selectedBackgroundTrack.id).toBe('none');
    });
  });

  describe('state setters', () => {
    it('should update selectedVoice state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });
      const mockVoice = {
        id: 'voice-1',
        name: 'Test Voice',
        provider: 'fish-audio' as const,
        isCloned: true,
      };
      act(() => {
        result.current.setSelectedVoice(mockVoice as any);
      });
      expect(result.current.selectedVoice).toEqual(mockVoice);
    });

    it('should update cloningStatus state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });
      act(() => {
        result.current.setCloningStatus({ state: 'processing_audio' });
      });
      expect(result.current.cloningStatus).toEqual({ state: 'processing_audio' });
    });

    it('should update creditInfo state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });
      const newCreditInfo = {
        canClone: true,
        creditsRemaining: 10000,
        clonesRemaining: 2,
        cloneCost: 5000,
      };
      act(() => {
        result.current.setCreditInfo(newCreditInfo);
      });
      expect(result.current.creditInfo).toEqual(newCreditInfo);
    });
  });

  describe('loadUserVoices', () => {
    it('should merge cloned voices with preset voices', async () => {
      mockGetUserVoiceProfiles.mockResolvedValue([
        {
          id: 'cloned-voice-1',
          name: 'Cloned Voice 1',
          fish_audio_model_id: 'fish-model-1',
          description: 'My cloned voice',
        },
        {
          id: 'cloned-voice-2',
          name: 'Cloned Voice 2',
          voice_sample_url: 'https://example.com/sample.wav',
        },
      ]);

      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.loadUserVoices();
      });

      expect(result.current.availableVoices.length).toBe(3);
      const fishVoice = result.current.availableVoices.find(v => v.id === 'cloned-voice-1');
      expect(fishVoice?.provider).toBe('fish-audio');
      expect(fishVoice?.isCloned).toBe(true);

      const chatterboxVoice = result.current.availableVoices.find(v => v.id === 'cloned-voice-2');
      expect(chatterboxVoice?.provider).toBe('chatterbox');
    });

    it('should handle voices with provider_voice_id', async () => {
      mockGetUserVoiceProfiles.mockResolvedValue([
        {
          id: 'voice-with-provider-id',
          name: 'Provider Voice',
          provider_voice_id: 'provider-123',
        },
      ]);

      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.loadUserVoices();
      });

      const voice = result.current.availableVoices.find(v => v.id === 'voice-with-provider-id');
      expect(voice).toBeDefined();
      expect(voice?.providerVoiceId).toBe('provider-123');
    });

    it('should handle error when loading voices', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetUserVoiceProfiles.mockRejectedValue(new Error('Failed to load'));

      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.loadUserVoices();
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('background track selection', () => {
    it('should update selected background track', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      const rainTrack = {
        id: 'rain',
        name: 'Rain',
        url: '/audio/rain.mp3',
        category: 'nature',
      };

      act(() => {
        result.current.setSelectedBackgroundTrack(rainTrack as any);
      });

      expect(result.current.selectedBackgroundTrack).toEqual(rainTrack);
    });
  });
});
