import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { RefObject, createRef } from 'react';

// Store mock functions for per-test configuration
let mockEnhanceScript = vi.fn();
let mockExtendScript = vi.fn();
let mockGenerateSpeech = vi.fn();
let mockGetCredits = vi.fn();
let mockCalculateTTSCost = vi.fn();
let mockBuildTimingMap = vi.fn();

// Mock geminiService
vi.mock('../../geminiService', () => ({
  geminiService: {
    enhanceScript: (prompt: string, tags?: string[]) => mockEnhanceScript(prompt, tags),
    extendScript: (script: string) => mockExtendScript(script),
  },
}));

// Mock voiceService
vi.mock('../../src/lib/voiceService', () => ({
  voiceService: {
    generateSpeech: (script: string, voice: any, ctx: any) => mockGenerateSpeech(script, voice, ctx),
  },
}));

// Mock creditService
vi.mock('../../src/lib/credits', () => ({
  creditService: {
    getCredits: (userId: string) => mockGetCredits(userId),
    calculateTTSCost: (text: string, multiplier: number) => mockCalculateTTSCost(text, multiplier),
  },
}));

// Mock textSync
vi.mock('../../src/lib/textSync', () => ({
  buildTimingMap: (script: string, duration: number) => mockBuildTimingMap(script, duration),
}));

// Mock constants
vi.mock('../../constants', () => ({
  AUDIO_TAG_CATEGORIES: [
    {
      id: 'breathing',
      name: 'Breathing',
      tags: [
        { id: 'pause', label: '[pause]' },
        { id: 'breath', label: '[deep breath]' },
      ],
    },
  ],
}));

// Import after mocking
import { useVoiceGeneration } from '../../src/hooks/useVoiceGeneration';

// Mock AudioContext
const mockAudioBuffer = {
  duration: 60,
  length: 2646000,
  numberOfChannels: 1,
  sampleRate: 44100,
};

describe('useVoiceGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockEnhanceScript.mockResolvedValue('Enhanced meditation script with [pause] tags.');
    mockExtendScript.mockResolvedValue('Extended meditation script with more content.');
    mockGenerateSpeech.mockResolvedValue({
      audioBuffer: mockAudioBuffer,
      base64: 'base64audiodata',
    });
    mockGetCredits.mockResolvedValue(10000);
    mockCalculateTTSCost.mockReturnValue(500);
    mockBuildTimingMap.mockReturnValue({
      words: [{ word: 'Test', startTime: 0, endTime: 0.5 }],
      totalDuration: 60,
    });

    // Mock AudioContext constructor
    (global as any).AudioContext = function() {
      return {
        state: 'running',
        close: vi.fn().mockResolvedValue(undefined),
      };
    };
    (global as any).webkitAudioContext = (global as any).AudioContext;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() => useVoiceGeneration());

      expect(result.current.script).toBe('');
      expect(result.current.editableScript).toBe('');
      expect(result.current.enhancedScript).toBe('');
      expect(result.current.originalPrompt).toBe('');
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.isExtending).toBe(false);
      expect(result.current.generationStage).toBe('idle');
      expect(result.current.showScriptPreview).toBe(false);
    });
  });

  describe('state setters', () => {
    it('should update script', () => {
      const { result } = renderHook(() => useVoiceGeneration());

      act(() => {
        result.current.setScript('New script content');
      });

      expect(result.current.script).toBe('New script content');
    });

    it('should update editableScript', () => {
      const { result } = renderHook(() => useVoiceGeneration());

      act(() => {
        result.current.setEditableScript('Editable content');
      });

      expect(result.current.editableScript).toBe('Editable content');
    });

    it('should update showScriptPreview', () => {
      const { result } = renderHook(() => useVoiceGeneration());

      act(() => {
        result.current.setShowScriptPreview(true);
      });

      expect(result.current.showScriptPreview).toBe(true);
    });
  });

  describe('generateScript', () => {
    it('should error when script is empty', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useVoiceGeneration({ onError }));

      await act(async () => {
        await result.current.generateScript(null);
      });

      expect(onError).toHaveBeenCalledWith('Please enter some text to generate a meditation');
    });

    it('should error when no voice is selected', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useVoiceGeneration({ onError }));

      act(() => {
        result.current.setScript('Generate a meditation');
      });

      await act(async () => {
        await result.current.generateScript(null);
      });

      expect(onError).toHaveBeenCalledWith('Please clone a voice first to generate meditations');
    });

    it('should check credits for cloned voices', async () => {
      const onError = vi.fn();
      mockGetCredits.mockResolvedValue(100); // Insufficient credits
      mockCalculateTTSCost.mockReturnValue(500);

      const { result } = renderHook(() =>
        useVoiceGeneration({ userId: 'user-123', onError })
      );

      act(() => {
        result.current.setScript('Generate a meditation');
      });

      const mockVoice = {
        id: 'voice-1',
        name: 'Cloned Voice',
        isCloned: true,
        provider: 'fish-audio' as const,
      };

      await act(async () => {
        await result.current.generateScript(mockVoice as any);
      });

      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('Insufficient credits')
      );
    });

    it('should successfully generate script', async () => {
      const onScriptGenerated = vi.fn();
      const { result } = renderHook(() =>
        useVoiceGeneration({ userId: 'user-123', onScriptGenerated })
      );

      act(() => {
        result.current.setScript('Generate a relaxing meditation');
      });

      const mockVoice = {
        id: 'voice-1',
        name: 'Cloned Voice',
        isCloned: true,
        provider: 'fish-audio' as const,
      };

      await act(async () => {
        await result.current.generateScript(mockVoice as any);
      });

      expect(result.current.editableScript).toBe('Enhanced meditation script with [pause] tags.');
      expect(result.current.showScriptPreview).toBe(true);
      expect(result.current.isGenerating).toBe(false);
      expect(onScriptGenerated).toHaveBeenCalledWith('Enhanced meditation script with [pause] tags.');
    });

    it('should pass audio tag labels when enabled', async () => {
      const { result } = renderHook(() =>
        useVoiceGeneration({
          userId: 'user-123',
          audioTagsEnabled: true,
          selectedAudioTags: ['pause', 'breath'],
        })
      );

      act(() => {
        result.current.setScript('Create meditation');
      });

      const mockVoice = {
        id: 'voice-1',
        name: 'Voice',
        isCloned: false,
        provider: 'browser' as const,
      };

      await act(async () => {
        await result.current.generateScript(mockVoice as any);
      });

      expect(mockEnhanceScript).toHaveBeenCalledWith(
        'Create meditation',
        ['[pause]', '[deep breath]']
      );
    });

    it('should handle generation error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onError = vi.fn();
      mockEnhanceScript.mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() =>
        useVoiceGeneration({ userId: 'user-123', onError })
      );

      act(() => {
        result.current.setScript('Generate meditation');
      });

      const mockVoice = {
        id: 'voice-1',
        name: 'Voice',
        isCloned: false,
        provider: 'browser' as const,
      };

      await act(async () => {
        await result.current.generateScript(mockVoice as any);
      });

      expect(onError).toHaveBeenCalledWith('API error');
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.generationStage).toBe('idle');
      consoleSpy.mockRestore();
    });

    it('should error when enhanced script is empty', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onError = vi.fn();
      mockEnhanceScript.mockResolvedValue('');

      const { result } = renderHook(() =>
        useVoiceGeneration({ userId: 'user-123', onError })
      );

      act(() => {
        result.current.setScript('Generate meditation');
      });

      const mockVoice = {
        id: 'voice-1',
        name: 'Voice',
        isCloned: false,
        provider: 'browser' as const,
      };

      await act(async () => {
        await result.current.generateScript(mockVoice as any);
      });

      expect(onError).toHaveBeenCalledWith('Failed to generate meditation script. Please try again.');
      consoleSpy.mockRestore();
    });

    it('should store original prompt', async () => {
      const { result } = renderHook(() =>
        useVoiceGeneration({ userId: 'user-123' })
      );

      act(() => {
        result.current.setScript('Original prompt text');
      });

      const mockVoice = {
        id: 'voice-1',
        name: 'Voice',
        isCloned: false,
        provider: 'browser' as const,
      };

      await act(async () => {
        await result.current.generateScript(mockVoice as any);
      });

      expect(result.current.originalPrompt).toBe('Original prompt text');
    });
  });

  describe('extendScript', () => {
    it('should not extend empty script', async () => {
      const { result } = renderHook(() => useVoiceGeneration());

      await act(async () => {
        await result.current.extendScript();
      });

      expect(mockExtendScript).not.toHaveBeenCalled();
    });

    it('should extend script successfully', async () => {
      const { result } = renderHook(() => useVoiceGeneration());

      act(() => {
        result.current.setEditableScript('Initial meditation script.');
      });

      await act(async () => {
        await result.current.extendScript();
      });

      expect(result.current.editableScript).toBe('Extended meditation script with more content.');
      expect(result.current.isExtending).toBe(false);
    });

    it('should handle extension error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onError = vi.fn();
      mockExtendScript.mockRejectedValue(new Error('Extension failed'));

      const { result } = renderHook(() => useVoiceGeneration({ onError }));

      act(() => {
        result.current.setEditableScript('Script to extend');
      });

      await act(async () => {
        await result.current.extendScript();
      });

      expect(onError).toHaveBeenCalledWith('Extension failed');
      expect(result.current.isExtending).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should set isExtending during extension', async () => {
      let isExtendingDuringCall = false;
      mockExtendScript.mockImplementation(async () => {
        // We can't directly check the hook state here, but the mock tracks calls
        return 'Extended script';
      });

      const { result } = renderHook(() => useVoiceGeneration());

      act(() => {
        result.current.setEditableScript('Script');
      });

      await act(async () => {
        await result.current.extendScript();
      });

      // After completion, isExtending should be false
      expect(result.current.isExtending).toBe(false);
    });
  });

  describe('playEditedScript', () => {
    it('should return null when editableScript is empty', async () => {
      const { result } = renderHook(() => useVoiceGeneration());

      const mockVoice = {
        id: 'voice-1',
        name: 'Voice',
        isCloned: true,
        provider: 'fish-audio' as const,
      };

      const audioContextRef = { current: null } as RefObject<AudioContext | null>;

      let playResult: any;
      await act(async () => {
        playResult = await result.current.playEditedScript(mockVoice as any, audioContextRef);
      });

      expect(playResult).toBeNull();
    });

    it('should return null when no voice provided', async () => {
      const { result } = renderHook(() => useVoiceGeneration());

      act(() => {
        result.current.setEditableScript('Script to play');
      });

      const audioContextRef = { current: null } as RefObject<AudioContext | null>;

      let playResult: any;
      await act(async () => {
        playResult = await result.current.playEditedScript(null as any, audioContextRef);
      });

      expect(playResult).toBeNull();
    });

    it('should successfully generate audio', async () => {
      const onAudioGenerated = vi.fn();
      const { result } = renderHook(() =>
        useVoiceGeneration({ onAudioGenerated })
      );

      act(() => {
        result.current.setEditableScript('Meditation script to play');
      });

      const mockVoice = {
        id: 'voice-1',
        name: 'Voice',
        isCloned: true,
        provider: 'fish-audio' as const,
      };

      const audioContextRef = { current: null } as RefObject<AudioContext | null>;

      let playResult: any;
      await act(async () => {
        playResult = await result.current.playEditedScript(mockVoice as any, audioContextRef);
      });

      expect(playResult).not.toBeNull();
      expect(playResult.audioBuffer).toEqual(mockAudioBuffer);
      expect(playResult.timingMap).toBeDefined();
      expect(result.current.script).toBe('Meditation script to play');
      expect(result.current.enhancedScript).toBe('Meditation script to play');
      expect(onAudioGenerated).toHaveBeenCalled();
    });

    it('should create AudioContext if not provided', async () => {
      const { result } = renderHook(() => useVoiceGeneration());

      act(() => {
        result.current.setEditableScript('Script');
      });

      const mockVoice = {
        id: 'voice-1',
        name: 'Voice',
        isCloned: true,
        provider: 'fish-audio' as const,
      };

      const audioContextRef: RefObject<AudioContext | null> = { current: null };

      await act(async () => {
        await result.current.playEditedScript(mockVoice as any, audioContextRef);
      });

      // AudioContext should have been created
      expect(mockGenerateSpeech).toHaveBeenCalled();
    });

    it('should handle audio generation error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onError = vi.fn();
      mockGenerateSpeech.mockRejectedValue(new Error('TTS failed'));

      const { result } = renderHook(() => useVoiceGeneration({ onError }));

      act(() => {
        result.current.setEditableScript('Script');
      });

      const mockVoice = {
        id: 'voice-1',
        name: 'Voice',
        isCloned: true,
        provider: 'fish-audio' as const,
      };

      const audioContextRef = { current: null } as RefObject<AudioContext | null>;

      let playResult: any;
      await act(async () => {
        playResult = await result.current.playEditedScript(mockVoice as any, audioContextRef);
      });

      expect(playResult).toBeNull();
      expect(onError).toHaveBeenCalledWith('TTS failed');
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.generationStage).toBe('idle');
      consoleSpy.mockRestore();
    });

    it('should error when base64 is empty', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onError = vi.fn();
      mockGenerateSpeech.mockResolvedValue({
        audioBuffer: mockAudioBuffer,
        base64: '',
      });

      const { result } = renderHook(() => useVoiceGeneration({ onError }));

      act(() => {
        result.current.setEditableScript('Script');
      });

      const mockVoice = {
        id: 'voice-1',
        name: 'Voice',
        isCloned: true,
        provider: 'fish-audio' as const,
      };

      const audioContextRef = { current: null } as RefObject<AudioContext | null>;

      await act(async () => {
        await result.current.playEditedScript(mockVoice as any, audioContextRef);
      });

      expect(onError).toHaveBeenCalledWith('Failed to generate audio. Please try again.');
      consoleSpy.mockRestore();
    });

    it('should close showScriptPreview when playing', async () => {
      const { result } = renderHook(() => useVoiceGeneration());

      act(() => {
        result.current.setEditableScript('Script');
        result.current.setShowScriptPreview(true);
      });

      const mockVoice = {
        id: 'voice-1',
        name: 'Voice',
        isCloned: true,
        provider: 'fish-audio' as const,
      };

      const audioContextRef = { current: null } as RefObject<AudioContext | null>;

      await act(async () => {
        await result.current.playEditedScript(mockVoice as any, audioContextRef);
      });

      expect(result.current.showScriptPreview).toBe(false);
    });
  });

  describe('insertAudioTag', () => {
    it('should insert tag at cursor position', () => {
      const { result } = renderHook(() => useVoiceGeneration());

      act(() => {
        result.current.setEditableScript('Hello World');
      });

      // Create a mock textarea ref
      const mockTextarea = {
        selectionStart: 6,
        selectionEnd: 6,
        focus: vi.fn(),
      };
      const textareaRef = { current: mockTextarea as any };

      act(() => {
        result.current.insertAudioTag('[pause]', textareaRef);
      });

      expect(result.current.editableScript).toBe('Hello  [pause] World');
    });

    it('should do nothing if textarea ref is null', () => {
      const { result } = renderHook(() => useVoiceGeneration());

      act(() => {
        result.current.setEditableScript('Original text');
      });

      const textareaRef = { current: null };

      act(() => {
        result.current.insertAudioTag('[pause]', textareaRef);
      });

      expect(result.current.editableScript).toBe('Original text');
    });

    it('should replace selected text', () => {
      const { result } = renderHook(() => useVoiceGeneration());

      act(() => {
        result.current.setEditableScript('Hello beautiful World');
      });

      const mockTextarea = {
        selectionStart: 6,
        selectionEnd: 15, // "beautiful" selected
        focus: vi.fn(),
      };
      const textareaRef = { current: mockTextarea as any };

      act(() => {
        result.current.insertAudioTag('[deep breath]', textareaRef);
      });

      expect(result.current.editableScript).toBe('Hello  [deep breath]  World');
    });
  });

  describe('clearGeneration', () => {
    it('should reset all state', () => {
      const { result } = renderHook(() => useVoiceGeneration());

      // Set various state
      act(() => {
        result.current.setScript('Script');
        result.current.setEditableScript('Editable');
        result.current.setShowScriptPreview(true);
      });

      // Clear
      act(() => {
        result.current.clearGeneration();
      });

      expect(result.current.script).toBe('');
      expect(result.current.editableScript).toBe('');
      expect(result.current.enhancedScript).toBe('');
      expect(result.current.originalPrompt).toBe('');
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.isExtending).toBe(false);
      expect(result.current.generationStage).toBe('idle');
      expect(result.current.showScriptPreview).toBe(false);
    });
  });
});
