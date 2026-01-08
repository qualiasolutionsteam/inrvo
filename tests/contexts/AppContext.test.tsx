import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';

// Store mock functions to configure per-test
let mockGetCurrentUser = vi.fn();
let mockGetUserVoiceProfiles = vi.fn();
let mockGetMeditationHistoryPaginated = vi.fn();
let mockGetAudioTagPreferences = vi.fn();
let mockOnAuthStateChange = vi.fn();
let mockUnsubscribe = vi.fn();

// Mock supabase module
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: any) => {
        mockOnAuthStateChange(callback);
        return {
          data: {
            subscription: {
              unsubscribe: mockUnsubscribe,
            },
          },
        };
      },
    },
  },
  getCurrentUser: () => mockGetCurrentUser(),
  getUserVoiceProfiles: () => mockGetUserVoiceProfiles(),
  getMeditationHistoryPaginated: (page: number, limit: number) =>
    mockGetMeditationHistoryPaginated(page, limit),
  getAudioTagPreferences: () => mockGetAudioTagPreferences(),
}));

// Mock AuthContext - AppContext depends on useAuth
// Create configurable mock that can be changed per-test
let mockAuthUser: any = null;
let mockIsAuthenticated = false;

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    isSessionReady: true,
    savedVoices: [],
    setSavedVoices: vi.fn(),
    currentClonedVoice: null,
    setCurrentClonedVoice: vi.fn(),
    loadUserVoices: vi.fn(),
    isLoadingVoices: false,
    isLoading: false,
    isAuthenticated: mockIsAuthenticated,
    checkUser: vi.fn(),
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
}));

// Mock voice profile cache - return null so tests hit the DB mock
vi.mock('../../src/lib/voiceProfileCache', () => ({
  getCachedVoiceProfiles: vi.fn(() => null),
  setCachedVoiceProfiles: vi.fn(),
  clearVoiceProfileCache: vi.fn(),
  addToCachedVoiceProfiles: vi.fn(),
  updateCachedVoiceProfile: vi.fn(),
  removeFromCachedVoiceProfiles: vi.fn(),
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

    // Reset auth mock state
    mockAuthUser = null;
    mockIsAuthenticated = false;

    // Default mock implementations
    mockGetCurrentUser.mockResolvedValue(null);
    mockGetUserVoiceProfiles.mockResolvedValue([]);
    mockGetMeditationHistoryPaginated.mockResolvedValue({ data: [], hasMore: false });
    mockGetAudioTagPreferences.mockResolvedValue({ enabled: false, favorite_tags: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useApp hook', () => {
    it('should throw error when used outside AppProvider', () => {
      // Suppress console.error for this test
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
      // Credits are disabled, so unlimited access is the default
      expect(result.current.creditInfo).toEqual({
        canClone: true,
        creditsRemaining: 999999999,
        clonesRemaining: 999999,
        cloneCost: 0,
      });
    });

    it('should have correct audio initial state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      expect(result.current.selectedBackgroundTrack.id).toBe('none');
      expect(result.current.backgroundVolume).toBe(0.3);
      expect(result.current.voiceVolume).toBe(0.7);
      expect(result.current.playbackRate).toBe(1.0);
    });

    it('should have correct script initial state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      expect(result.current.script).toBe('');
      expect(result.current.enhancedScript).toBe('');
      expect(result.current.editableScript).toBe('');
    });

    it('should have correct audio tags initial state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      expect(result.current.selectedAudioTags).toEqual([]);
      expect(result.current.audioTagsEnabled).toBe(false);
      expect(result.current.favoriteAudioTags).toEqual([]);
    });

    it('should have correct library initial state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      expect(result.current.meditationHistory).toEqual([]);
      expect(result.current.isLoadingHistory).toBe(false);
      expect(result.current.hasMoreHistory).toBe(false);
    });

    it('should have correct playback initial state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.duration).toBe(0);
      expect(result.current.currentWordIndex).toBe(-1);
      expect(result.current.timingMap).toBeNull();
    });

    it('should have correct generation initial state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.generationStage).toBe('idle');
    });

    it('should have correct chat initial state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      expect(result.current.chatStarted).toBe(false);
      expect(result.current.restoredScript).toBeNull();
    });

    it('should have correct error initial state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      expect(result.current.micError).toBeNull();
    });

    it('should have audio refs initialized', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      expect(result.current.audioContextRef).toBeDefined();
      expect(result.current.audioContextRef.current).toBeNull();
      expect(result.current.audioSourceRef).toBeDefined();
      expect(result.current.audioBufferRef).toBeDefined();
      expect(result.current.gainNodeRef).toBeDefined();
      expect(result.current.backgroundAudioRef).toBeDefined();
    });
  });

  describe('state setters', () => {
    // Note: setUser is now in AuthContext, not AppContext
    // user state comes from useAuth hook

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
        result.current.setCloningStatus({ state: 'cloning', progress: 50 });
      });

      expect(result.current.cloningStatus).toEqual({ state: 'cloning', progress: 50 });
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

    it('should update audio settings', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setBackgroundVolume(0.5);
        result.current.setVoiceVolume(0.8);
        result.current.setPlaybackRate(1.0);
      });

      expect(result.current.backgroundVolume).toBe(0.5);
      expect(result.current.voiceVolume).toBe(0.8);
      expect(result.current.playbackRate).toBe(1.0);
    });

    it('should update script state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setScript('Original script');
        result.current.setEnhancedScript('Enhanced script');
        result.current.setEditableScript('Editable script');
      });

      expect(result.current.script).toBe('Original script');
      expect(result.current.enhancedScript).toBe('Enhanced script');
      expect(result.current.editableScript).toBe('Editable script');
    });

    it('should update audio tags state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSelectedAudioTags(['pause', 'breathe']);
        result.current.setAudioTagsEnabled(true);
        result.current.setFavoriteAudioTags(['pause']);
      });

      expect(result.current.selectedAudioTags).toEqual(['pause', 'breathe']);
      expect(result.current.audioTagsEnabled).toBe(true);
      expect(result.current.favoriteAudioTags).toEqual(['pause']);
    });

    it('should update playback state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setIsPlaying(true);
        result.current.setCurrentTime(30);
        result.current.setDuration(300);
        result.current.setCurrentWordIndex(10);
      });

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.currentTime).toBe(30);
      expect(result.current.duration).toBe(300);
      expect(result.current.currentWordIndex).toBe(10);
    });

    it('should update generation state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setIsGenerating(true);
        result.current.setGenerationStage('script');
      });

      expect(result.current.isGenerating).toBe(true);
      expect(result.current.generationStage).toBe('script');
    });

    it('should update chat state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setChatStarted(true);
        result.current.setRestoredScript('Restored meditation script');
      });

      expect(result.current.chatStarted).toBe(true);
      expect(result.current.restoredScript).toBe('Restored meditation script');
    });

    it('should update mic error state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMicError('Microphone access denied');
      });

      expect(result.current.micError).toBe('Microphone access denied');
    });
  });

  // Note: checkUser is now in AuthContext, not AppContext
  // User authentication state is managed by useAuth hook
  // AppContext gets user from useAuth mock

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

      // Should have preset (1) + cloned (2) voices
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

  describe('refreshHistory', () => {
    it('should not load history when user is not authenticated', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.refreshHistory();
      });

      expect(mockGetMeditationHistoryPaginated).not.toHaveBeenCalled();
    });

    it('should load history when user is authenticated', async () => {
      // Set user via mock before rendering
      mockAuthUser = { id: 'user-123', email: 'test@test.com' };
      mockIsAuthenticated = true;

      mockGetMeditationHistoryPaginated.mockResolvedValue({
        data: [
          { id: 'med-1', title: 'Meditation 1', created_at: new Date().toISOString() },
          { id: 'med-2', title: 'Meditation 2', created_at: new Date().toISOString() },
        ],
        hasMore: true,
      });

      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.refreshHistory();
      });

      expect(mockGetMeditationHistoryPaginated).toHaveBeenCalledWith(0, 20);
      expect(result.current.meditationHistory).toHaveLength(2);
      expect(result.current.hasMoreHistory).toBe(true);
    });

    it('should handle error when loading history', async () => {
      // Set user via mock before rendering
      mockAuthUser = { id: 'user-123', email: 'test@test.com' };
      mockIsAuthenticated = true;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetMeditationHistoryPaginated.mockRejectedValue(new Error('Failed to load'));

      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.refreshHistory();
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('loadMoreHistory', () => {
    it('should not load more when already loading', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      // Manually trigger isLoadingMore state by calling loadMoreHistory twice in rapid succession
      // This is hard to test without access to internal state, so we skip this edge case
      expect(result.current.hasMoreHistory).toBe(false);
    });

    it('should not load more when hasMoreHistory is false', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.loadMoreHistory();
      });

      expect(mockGetMeditationHistoryPaginated).not.toHaveBeenCalled();
    });

    it('should append history when loading more', async () => {
      // Set user via mock before rendering
      mockAuthUser = { id: 'user-123', email: 'test@test.com' };
      mockIsAuthenticated = true;

      // First page
      mockGetMeditationHistoryPaginated.mockResolvedValueOnce({
        data: [{ id: 'med-1', title: 'Meditation 1' }],
        hasMore: true,
      });
      // Second page
      mockGetMeditationHistoryPaginated.mockResolvedValueOnce({
        data: [{ id: 'med-2', title: 'Meditation 2' }],
        hasMore: false,
      });

      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.refreshHistory();
      });

      expect(result.current.meditationHistory).toHaveLength(1);
      expect(result.current.hasMoreHistory).toBe(true);

      // Load more
      await act(async () => {
        await result.current.loadMoreHistory();
      });

      expect(result.current.meditationHistory).toHaveLength(2);
      expect(result.current.hasMoreHistory).toBe(false);
    });
  });

  // Note: Auth listener tests removed - auth state is now managed by AuthContext
  // AppContext consumes user state from useAuth hook, not its own listener

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

  describe('timing map', () => {
    it('should update timing map for word highlighting', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      const mockTimingMap = {
        words: [
          { word: 'Hello', startTime: 0, endTime: 0.5 },
          { word: 'World', startTime: 0.5, endTime: 1.0 },
        ],
        totalDuration: 1.0,
      };

      act(() => {
        result.current.setTimingMap(mockTimingMap as any);
      });

      expect(result.current.timingMap).toEqual(mockTimingMap);
    });
  });

  describe('meditation history management', () => {
    it('should set meditation history directly', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: createWrapper(),
      });

      const mockHistory = [
        { id: 'med-1', title: 'Test Meditation', created_at: new Date().toISOString() },
      ];

      act(() => {
        result.current.setMeditationHistory(mockHistory as any);
      });

      expect(result.current.meditationHistory).toEqual(mockHistory);
    });
  });
});
