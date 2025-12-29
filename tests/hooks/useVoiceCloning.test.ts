import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Store mock functions for per-test configuration
let mockCanClone = vi.fn();
let mockGetCredits = vi.fn();
let mockGetClonesRemaining = vi.fn();
let mockGetUserVoiceProfiles = vi.fn();
let mockCreateVoiceClone = vi.fn();
let mockFishAudioCloneVoice = vi.fn();
let mockChatterboxCloneVoice = vi.fn();
let mockValidateAudioForCloning = vi.fn();
let mockConvertToWAV = vi.fn();

// Mock credit service
vi.mock('../../src/lib/credits', () => ({
  creditService: {
    canClone: (userId: string) => mockCanClone(userId),
    getCredits: (userId: string) => mockGetCredits(userId),
    getClonesRemaining: (userId: string) => mockGetClonesRemaining(userId),
    getCostConfig: () => ({ VOICE_CLONE: 5000, TTS_PER_1K_CHARS: 280 }),
  },
}));

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  getUserVoiceProfiles: () => mockGetUserVoiceProfiles(),
  createVoiceClone: (name: string, audio: string, desc: string, metadata: any) =>
    mockCreateVoiceClone(name, audio, desc, metadata),
}));

// Mock edge functions - dynamically imported
vi.mock('../../src/lib/edgeFunctions', () => ({
  fishAudioCloneVoice: (...args: any[]) => mockFishAudioCloneVoice(...args),
  chatterboxCloneVoice: (...args: any[]) => mockChatterboxCloneVoice(...args),
}));

// Mock audio converter
vi.mock('../../src/lib/audioConverter', () => ({
  validateAudioForCloning: (blob: Blob) => mockValidateAudioForCloning(blob),
  convertToWAV: (blob: Blob) => mockConvertToWAV(blob),
}));

// Mock geminiService
vi.mock('../../geminiService', () => ({
  blobToBase64: vi.fn().mockResolvedValue('base64audiodata'),
}));

// Import after mocking
import { useVoiceCloning } from '../../src/hooks/useVoiceCloning';

describe('useVoiceCloning', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockCanClone.mockResolvedValue({ can: true, reason: undefined });
    mockGetCredits.mockResolvedValue(10000);
    mockGetClonesRemaining.mockResolvedValue(2);
    mockGetUserVoiceProfiles.mockResolvedValue([]);
    mockCreateVoiceClone.mockResolvedValue({ id: 'clone-id' });
    mockValidateAudioForCloning.mockResolvedValue({ valid: true });
    mockConvertToWAV.mockResolvedValue(new Blob(['wav data'], { type: 'audio/wav' }));
    mockFishAudioCloneVoice.mockResolvedValue({
      voiceProfileId: 'fish-voice-id',
      fishAudioModelId: 'fish-model-123',
    });
    mockChatterboxCloneVoice.mockResolvedValue({
      voiceProfileId: 'chatterbox-voice-id',
      voiceSampleUrl: 'https://example.com/sample.wav',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() => useVoiceCloning());

      expect(result.current.cloningStatus).toEqual({ state: 'idle' });
      expect(result.current.creditInfo).toEqual({
        canClone: false,
        creditsRemaining: 0,
        clonesRemaining: 0,
        cloneCost: 5000,
      });
      expect(result.current.savedVoices).toEqual([]);
      expect(result.current.selectedVoice).toBeNull();
      expect(result.current.isSavingVoice).toBe(false);
      expect(result.current.voiceSaved).toBe(false);
      expect(result.current.savedVoiceId).toBeNull();
      expect(result.current.newProfileName).toBe('');
      expect(result.current.nameError).toBeNull();
      expect(result.current.isRecordingClone).toBe(false);
      expect(result.current.recordingProgressClone).toBe(0);
    });
  });

  describe('state setters', () => {
    it('should update selectedVoice', () => {
      const { result } = renderHook(() => useVoiceCloning());

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

    it('should update newProfileName', () => {
      const { result } = renderHook(() => useVoiceCloning());

      act(() => {
        result.current.setNewProfileName('My Custom Voice');
      });

      expect(result.current.newProfileName).toBe('My Custom Voice');
    });

    it('should update cloningStatus', () => {
      const { result } = renderHook(() => useVoiceCloning());

      act(() => {
        result.current.setCloningStatus({ state: 'cloning', progress: 50 });
      });

      expect(result.current.cloningStatus).toEqual({ state: 'cloning', progress: 50 });
    });

    it('should update isRecordingClone', () => {
      const { result } = renderHook(() => useVoiceCloning());

      act(() => {
        result.current.setIsRecordingClone(true);
      });

      expect(result.current.isRecordingClone).toBe(true);
    });

    it('should update recordingProgressClone', () => {
      const { result } = renderHook(() => useVoiceCloning());

      act(() => {
        result.current.setRecordingProgressClone(75);
      });

      expect(result.current.recordingProgressClone).toBe(75);
    });
  });

  describe('fetchCreditInfo', () => {
    it('should set "sign in" message when no userId', async () => {
      const onCreditInfoUpdated = vi.fn();
      const { result } = renderHook(() =>
        useVoiceCloning({ onCreditInfoUpdated })
      );

      await act(async () => {
        await result.current.fetchCreditInfo();
      });

      expect(result.current.creditInfo).toEqual({
        canClone: false,
        creditsRemaining: 0,
        clonesRemaining: 0,
        cloneCost: 5000,
        reason: 'Please sign in to clone your voice',
      });
      expect(onCreditInfoUpdated).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'Please sign in to clone your voice' })
      );
    });

    it('should fetch credit info when userId provided', async () => {
      mockCanClone.mockResolvedValue({ can: true, reason: undefined });
      mockGetCredits.mockResolvedValue(15000);
      mockGetClonesRemaining.mockResolvedValue(3);

      const { result } = renderHook(() =>
        useVoiceCloning({ userId: 'user-123' })
      );

      await act(async () => {
        await result.current.fetchCreditInfo();
      });

      expect(result.current.creditInfo).toEqual({
        canClone: true,
        creditsRemaining: 15000,
        clonesRemaining: 3,
        cloneCost: 5000,
        reason: undefined,
      });
    });

    it('should handle fetch error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCanClone.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useVoiceCloning({ userId: 'user-123' })
      );

      await act(async () => {
        await result.current.fetchCreditInfo();
      });

      expect(result.current.creditInfo.reason).toBe('Failed to check credits');
      consoleSpy.mockRestore();
    });

    it('should indicate when user cannot clone', async () => {
      mockCanClone.mockResolvedValue({ can: false, reason: 'Insufficient credits' });

      const { result } = renderHook(() =>
        useVoiceCloning({ userId: 'user-123' })
      );

      await act(async () => {
        await result.current.fetchCreditInfo();
      });

      expect(result.current.creditInfo.canClone).toBe(false);
      expect(result.current.creditInfo.reason).toBe('Insufficient credits');
    });
  });

  describe('loadUserVoices', () => {
    it('should load and set user voices', async () => {
      mockGetUserVoiceProfiles.mockResolvedValue([
        { id: 'voice-1', name: 'Voice 1', fish_audio_model_id: 'fish-1' },
        { id: 'voice-2', name: 'Voice 2', voice_sample_url: 'sample.wav' },
      ]);

      const { result } = renderHook(() => useVoiceCloning());

      await act(async () => {
        await result.current.loadUserVoices();
      });

      expect(result.current.savedVoices).toHaveLength(2);
      expect(result.current.savedVoices[0].name).toBe('Voice 1');
    });

    it('should handle load error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetUserVoiceProfiles.mockRejectedValue(new Error('Failed to load'));

      const { result } = renderHook(() => useVoiceCloning());

      await act(async () => {
        await result.current.loadUserVoices();
      });

      expect(result.current.savedVoices).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('handleCloneRecordingComplete', () => {
    it('should error when no userId', async () => {
      const { result } = renderHook(() => useVoiceCloning());

      const mockBlob = new Blob(['audio'], { type: 'audio/webm' });

      await act(async () => {
        await result.current.handleCloneRecordingComplete(mockBlob, 'My Voice');
      });

      expect(result.current.cloningStatus).toEqual({
        state: 'error',
        message: 'Please sign in to clone your voice',
        canRetry: false,
      });
    });

    it('should fail validation with invalid audio', async () => {
      mockValidateAudioForCloning.mockResolvedValue({
        valid: false,
        message: 'Audio too short',
      });

      const { result } = renderHook(() =>
        useVoiceCloning({ userId: 'user-123' })
      );

      const mockBlob = new Blob(['audio'], { type: 'audio/webm' });

      await act(async () => {
        await result.current.handleCloneRecordingComplete(mockBlob, 'My Voice');
      });

      expect(result.current.cloningStatus).toEqual({
        state: 'error',
        message: 'Audio too short',
        canRetry: true,
      });
    });

    it('should successfully clone with Fish Audio', async () => {
      const onVoiceCreated = vi.fn();
      const { result } = renderHook(() =>
        useVoiceCloning({ userId: 'user-123', onVoiceCreated })
      );

      const mockBlob = new Blob(['audio'], { type: 'audio/webm' });

      await act(async () => {
        await result.current.handleCloneRecordingComplete(mockBlob, 'My Voice');
      });

      expect(result.current.cloningStatus.state).toBe('success');
      expect(result.current.cloningStatus.voiceName).toBe('My Voice');
      expect(result.current.selectedVoice).not.toBeNull();
      expect(result.current.selectedVoice?.provider).toBe('fish-audio');
      expect(onVoiceCreated).toHaveBeenCalled();
    });

    it('should fallback to Chatterbox when Fish Audio fails', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockFishAudioCloneVoice.mockRejectedValue(new Error('Fish Audio unavailable'));

      const { result } = renderHook(() =>
        useVoiceCloning({ userId: 'user-123' })
      );

      const mockBlob = new Blob(['audio'], { type: 'audio/webm' });

      await act(async () => {
        await result.current.handleCloneRecordingComplete(mockBlob, 'My Voice');
      });

      expect(result.current.cloningStatus.state).toBe('success');
      expect(result.current.selectedVoice?.provider).toBe('chatterbox');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should error when both providers fail', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockFishAudioCloneVoice.mockRejectedValue(new Error('Fish Audio failed'));
      mockChatterboxCloneVoice.mockRejectedValue(new Error('Chatterbox failed'));

      const { result } = renderHook(() =>
        useVoiceCloning({ userId: 'user-123' })
      );

      const mockBlob = new Blob(['audio'], { type: 'audio/webm' });

      await act(async () => {
        await result.current.handleCloneRecordingComplete(mockBlob, 'My Voice');
      });

      expect(result.current.cloningStatus.state).toBe('error');
      expect(result.current.cloningStatus.canRetry).toBe(true);
      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('should add voice to savedVoices list', async () => {
      const { result } = renderHook(() =>
        useVoiceCloning({ userId: 'user-123' })
      );

      const mockBlob = new Blob(['audio'], { type: 'audio/webm' });

      await act(async () => {
        await result.current.handleCloneRecordingComplete(mockBlob, 'My Voice');
      });

      expect(result.current.savedVoices).toHaveLength(1);
      expect(result.current.savedVoices[0].name).toBe('My Voice');
    });
  });

  describe('autoSaveVoiceRecording', () => {
    it('should error when no userId', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useVoiceCloning({ onError }));

      await act(async () => {
        await result.current.autoSaveVoiceRecording('base64audio');
      });

      expect(onError).toHaveBeenCalledWith('Please sign in to save your voice');
    });

    it('should generate default name if none provided', async () => {
      const { result } = renderHook(() =>
        useVoiceCloning({ userId: 'user-123' })
      );

      await act(async () => {
        await result.current.autoSaveVoiceRecording('base64audio');
      });

      await waitFor(() => {
        expect(result.current.voiceSaved).toBe(true);
      });

      // Name should start with "My Voice"
      expect(result.current.newProfileName).toMatch(/^My Voice/);
    });

    it('should handle name collision by adding suffix', async () => {
      // Pre-populate with existing voice
      mockGetUserVoiceProfiles.mockResolvedValue([
        { id: 'existing', name: 'My Custom Voice' },
      ]);

      const { result } = renderHook(() =>
        useVoiceCloning({ userId: 'user-123' })
      );

      // Load existing voices
      await act(async () => {
        await result.current.loadUserVoices();
      });

      // Set the name that conflicts
      act(() => {
        result.current.setNewProfileName('My Custom Voice');
      });

      await act(async () => {
        await result.current.autoSaveVoiceRecording('base64audio');
      });

      await waitFor(() => {
        expect(result.current.voiceSaved).toBe(true);
      });

      // Should add (copy) suffix
      expect(result.current.savedVoices.some(v => v.name.includes('(copy)'))).toBe(true);
    });

    it('should fail with invalid audio', async () => {
      mockValidateAudioForCloning.mockResolvedValue({
        valid: false,
        message: 'Audio quality insufficient',
      });

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useVoiceCloning({ userId: 'user-123', onError })
      );

      await act(async () => {
        await result.current.autoSaveVoiceRecording('base64audio');
      });

      expect(onError).toHaveBeenCalledWith('Audio quality insufficient');
    });

    it('should successfully save voice recording', async () => {
      const onVoiceCreated = vi.fn();
      const { result } = renderHook(() =>
        useVoiceCloning({ userId: 'user-123', onVoiceCreated })
      );

      act(() => {
        result.current.setNewProfileName('Test Voice');
      });

      await act(async () => {
        await result.current.autoSaveVoiceRecording('base64audio');
      });

      await waitFor(() => {
        expect(result.current.voiceSaved).toBe(true);
      });

      expect(result.current.savedVoiceId).not.toBeNull();
      expect(result.current.selectedVoice).not.toBeNull();
      expect(onVoiceCreated).toHaveBeenCalled();
    });

    it('should set isSavingVoice to false after save completes', async () => {
      const { result } = renderHook(() =>
        useVoiceCloning({ userId: 'user-123' })
      );

      await act(async () => {
        await result.current.autoSaveVoiceRecording('base64audio');
      });

      // Should be false after completion
      expect(result.current.isSavingVoice).toBe(false);
      expect(result.current.voiceSaved).toBe(true);
    });

    it('should fallback to Chatterbox when Fish Audio fails', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockFishAudioCloneVoice.mockRejectedValue(new Error('Fish Audio down'));

      const { result } = renderHook(() =>
        useVoiceCloning({ userId: 'user-123' })
      );

      await act(async () => {
        await result.current.autoSaveVoiceRecording('base64audio');
      });

      await waitFor(() => {
        expect(result.current.voiceSaved).toBe(true);
      });

      expect(result.current.selectedVoice?.provider).toBe('chatterbox');
      consoleSpy.mockRestore();
    });

    it('should call onError when both providers fail', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockFishAudioCloneVoice.mockRejectedValue(new Error('Fish Audio failed'));
      mockChatterboxCloneVoice.mockRejectedValue(new Error('Chatterbox failed'));

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useVoiceCloning({ userId: 'user-123', onError })
      );

      await act(async () => {
        await result.current.autoSaveVoiceRecording('base64audio');
      });

      expect(onError).toHaveBeenCalledWith(expect.stringContaining('Voice cloning failed'));
      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });

  describe('resetCloningState', () => {
    it('should reset all cloning state', async () => {
      const { result } = renderHook(() =>
        useVoiceCloning({ userId: 'user-123' })
      );

      // Set various state
      act(() => {
        result.current.setCloningStatus({ state: 'success', voiceId: 'v1' });
        result.current.setNewProfileName('Test');
        result.current.setIsRecordingClone(true);
        result.current.setRecordingProgressClone(50);
      });

      // Reset
      act(() => {
        result.current.resetCloningState();
      });

      expect(result.current.cloningStatus).toEqual({ state: 'idle' });
      expect(result.current.newProfileName).toBe('');
      expect(result.current.voiceSaved).toBe(false);
      expect(result.current.savedVoiceId).toBeNull();
      expect(result.current.nameError).toBeNull();
      expect(result.current.isRecordingClone).toBe(false);
      expect(result.current.recordingProgressClone).toBe(0);
    });
  });

  describe('callbacks', () => {
    it('should call onCreditInfoUpdated when credits fetched', async () => {
      const onCreditInfoUpdated = vi.fn();
      const { result } = renderHook(() =>
        useVoiceCloning({ userId: 'user-123', onCreditInfoUpdated })
      );

      await act(async () => {
        await result.current.fetchCreditInfo();
      });

      expect(onCreditInfoUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          canClone: true,
          creditsRemaining: 10000,
        })
      );
    });

    it('should call onVoiceCreated when voice cloned', async () => {
      const onVoiceCreated = vi.fn();
      const { result } = renderHook(() =>
        useVoiceCloning({ userId: 'user-123', onVoiceCreated })
      );

      const mockBlob = new Blob(['audio'], { type: 'audio/webm' });

      await act(async () => {
        await result.current.handleCloneRecordingComplete(mockBlob, 'New Voice');
      });

      expect(onVoiceCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Voice',
          isCloned: true,
        })
      );
    });
  });
});
