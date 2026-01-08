import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Use vi.hoisted to ensure mock functions are available when vi.mock factory runs
const {
  mockAgentChat,
  mockAgentResetConversation,
  mockAgentGenerateMeditationPrompt,
  mockConversationStore,
} = vi.hoisted(() => ({
  mockAgentChat: vi.fn(),
  mockAgentResetConversation: vi.fn(),
  mockAgentGenerateMeditationPrompt: vi.fn(),
  mockConversationStore: {
    loadPreferences: vi.fn(),
    loadMessages: vi.fn(),
    startNewConversation: vi.fn(),
    addMessage: vi.fn(),
    savePreferences: vi.fn(),
    loadConversation: vi.fn(),
  },
}));

// Mock all external dependencies before imports
vi.mock('../../geminiService', () => ({
  geminiService: {
    chat: vi.fn().mockResolvedValue('Mock response'),
    enhanceScript: vi.fn(),
  },
}));

vi.mock('../../src/lib/voiceService', () => ({
  voiceService: {
    synthesizeSpeech: vi.fn(),
  },
}));

vi.mock('../../src/lib/agent/conversationStore', () => ({
  conversationStore: mockConversationStore,
}));

vi.mock('../../src/lib/agent/agentTools', () => ({
  generateMeditationScript: vi.fn().mockResolvedValue({
    success: true,
    data: {
      script: 'Default meditation script',
      meditationType: 'guided_visualization',
      duration: 300,
    },
  }),
  synthesizeAudio: vi.fn().mockResolvedValue({
    success: true,
    data: {
      audioBuffer: {},
      base64: 'base64audio',
      duration: 300,
    },
  }),
  analyzeUserRequest: vi.fn().mockReturnValue({
    mentionedDuration: undefined,
    mentionedTradition: undefined,
    mentionedTeacher: undefined,
  }),
  getWisdomQuote: vi.fn().mockReturnValue({
    success: true,
    data: { quote: 'Test quote', teacher: 'Test teacher' },
  }),
}));

vi.mock('../../src/lib/agent/MeditationAgent', () => {
  return {
    MeditationAgent: function() {
      return {
        chat: mockAgentChat,
        resetConversation: mockAgentResetConversation,
        generateMeditationPrompt: mockAgentGenerateMeditationPrompt,
      };
    },
    getRandomGreeting: () => 'Welcome to your meditation practice',
  };
});

// Import after mocking
import { useMeditationAgent } from '../../src/hooks/useMeditationAgent';
import * as agentTools from '../../src/lib/agent/agentTools';

describe('useMeditationAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock agent functions with default behavior
    mockAgentChat.mockResolvedValue({
      message: 'Hello! How can I help you today?',
      emotionalState: { primary: 'calm' },
      shouldGenerateMeditation: false,
      suggestedActions: [],
    });
    mockAgentResetConversation.mockReset();
    mockAgentGenerateMeditationPrompt.mockReturnValue('Generate a meditation');

    // Reset conversation store mocks
    mockConversationStore.loadPreferences.mockResolvedValue({});
    mockConversationStore.loadMessages.mockReturnValue([]);
    mockConversationStore.startNewConversation.mockResolvedValue({ id: 'test-conv-id', messages: [] });
    mockConversationStore.addMessage.mockReset();
    mockConversationStore.savePreferences.mockResolvedValue(undefined);
    mockConversationStore.loadConversation.mockResolvedValue(null);

    // Reset agentTools mocks to default success state
    vi.mocked(agentTools.generateMeditationScript).mockResolvedValue({
      success: true,
      data: {
        script: 'Default meditation script',
        meditationType: 'guided_visualization',
        duration: 300,
      },
    });

    // Mock AudioContext
    (global as any).AudioContext = function() {
      return {
        state: 'running',
        close: vi.fn().mockResolvedValue(undefined),
      };
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state with empty messages', () => {
      const { result } = renderHook(() => useMeditationAgent());

      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isGeneratingMeditation).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.currentMeditation).toBeNull();
    });

    it('should return greeting', () => {
      const { result } = renderHook(() => useMeditationAgent());

      expect(result.current.greeting).toBe('Welcome to your meditation practice');
    });

    it('should return quick prompts', () => {
      const { result } = renderHook(() => useMeditationAgent());

      expect(result.current.quickPrompts).toHaveLength(6);
      expect(result.current.quickPrompts[0]).toEqual({
        label: "I'm feeling anxious",
        icon: "waves",
      });
    });

    it('should start new conversation on mount', async () => {
      renderHook(() => useMeditationAgent());

      await waitFor(() => {
        expect(mockConversationStore.startNewConversation).toHaveBeenCalled();
      });
    });
  });

  describe('sendMessage', () => {
    // Helper to wait for agent initialization (startNewConversation is called)
    const waitForInit = async () => {
      await waitFor(() => {
        expect(mockConversationStore.startNewConversation).toHaveBeenCalled();
      });
    };

    it('should add user message and get agent response', async () => {
      const { result } = renderHook(() => useMeditationAgent());

      // Wait for agent initialization
      await waitForInit();

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      // Should have 2 messages: user and assistant
      await waitFor(() => {
        expect(result.current.messages.length).toBe(2);
      });

      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[0].content).toBe('Hello');
      expect(result.current.messages[1].role).toBe('assistant');
      expect(result.current.messages[1].content).toBe('Hello! How can I help you today?');
    });

    it('should not send empty messages', async () => {
      const { result } = renderHook(() => useMeditationAgent());

      // Wait for agent initialization
      await waitForInit();

      await act(async () => {
        await result.current.sendMessage('');
      });

      expect(result.current.messages).toHaveLength(0);
      expect(mockAgentChat).not.toHaveBeenCalled();
    });

    it('should handle errors during message sending', async () => {
      mockAgentChat.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useMeditationAgent());

      // Wait for agent initialization
      await waitForInit();

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      // Should still have the error message in the UI
      const errorMessage = result.current.messages.find(m => m.error);
      expect(errorMessage).toBeDefined();
    });

    it('should store messages in conversation store', async () => {
      const { result } = renderHook(() => useMeditationAgent());

      // Wait for agent initialization
      await waitForInit();
      mockConversationStore.addMessage.mockClear(); // Clear init calls

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(mockConversationStore.addMessage).toHaveBeenCalledTimes(2);
      });

      // Check user message was stored
      expect(mockConversationStore.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: 'Hello',
        })
      );
    });

    it('should trigger meditation generation when agent indicates', async () => {
      mockAgentChat.mockResolvedValue({
        message: 'Creating your meditation...',
        emotionalState: 'calm', // Must be a string, not an object
        shouldGenerateMeditation: true,
        meditationType: 'stress_relief',
        suggestedActions: [],
      });

      const { result } = renderHook(() => useMeditationAgent());

      // Wait for agent initialization
      await waitForInit();

      await act(async () => {
        await result.current.sendMessage('I need stress relief');
      });

      await waitFor(() => {
        expect(result.current.currentMeditation).not.toBeNull();
      });

      expect(result.current.currentMeditation?.meditationType).toBe('guided_visualization');
    });

    it('should handle pasted scripts directly', async () => {
      mockAgentChat.mockResolvedValue({
        message: 'Great script! Ready to record.',
        emotionalState: { primary: 'calm' },
        shouldGenerateMeditation: true,
        meditationType: 'custom',
        pastedScript: 'User provided meditation script here...',
        suggestedActions: [],
      });

      const { result } = renderHook(() => useMeditationAgent());

      // Wait for agent initialization
      await waitForInit();

      await act(async () => {
        await result.current.sendMessage('Here is my script...');
      });

      await waitFor(() => {
        expect(result.current.currentMeditation).not.toBeNull();
      });

      expect(result.current.currentMeditation?.script).toBe('User provided meditation script here...');
      expect(result.current.currentMeditation?.readyForReview).toBe(true);
      // generateMeditationScript should NOT be called for pasted scripts
      expect(agentTools.generateMeditationScript).not.toHaveBeenCalled();
    });
  });

  describe('generateMeditation', () => {
    it('should generate meditation script', async () => {
      vi.mocked(agentTools.generateMeditationScript).mockResolvedValue({
        success: true,
        data: {
          script: 'Close your eyes and relax...',
          meditationType: 'guided_visualization',
          duration: 300,
        },
      });

      const { result } = renderHook(() => useMeditationAgent());

      let meditation: any;
      await act(async () => {
        meditation = await result.current.generateMeditation('Help me relax');
      });

      expect(meditation).not.toBeNull();
      expect(meditation.script).toBe('Close your eyes and relax...');
      expect(meditation.meditationType).toBe('guided_visualization');
      expect(meditation.readyForReview).toBe(true);
    });

    it('should handle generation errors', async () => {
      vi.mocked(agentTools.generateMeditationScript).mockResolvedValue({
        success: false,
        error: 'API rate limit exceeded',
      });

      const { result } = renderHook(() => useMeditationAgent());

      let meditation: any;
      await act(async () => {
        meditation = await result.current.generateMeditation('Test');
      });

      expect(meditation).toBeNull();
      expect(result.current.error).toBe('API rate limit exceeded');
    });

    it('should use specified meditation type', async () => {
      const { result } = renderHook(() => useMeditationAgent());

      await act(async () => {
        await result.current.generateMeditation('Help me sleep', 'sleep');
      });

      expect(agentTools.generateMeditationScript).toHaveBeenCalledWith(
        'Help me sleep',
        'sleep',
        expect.any(Object)
      );
    });
  });

  describe('synthesizeMeditation', () => {
    it('should synthesize audio for meditation script', async () => {
      // Reset generateMeditationScript to success for this test
      vi.mocked(agentTools.generateMeditationScript).mockResolvedValue({
        success: true,
        data: {
          script: 'Test meditation script',
          meditationType: 'guided_visualization',
          duration: 300,
        },
      });

      vi.mocked(agentTools.synthesizeAudio).mockResolvedValue({
        success: true,
        data: {
          audioBuffer: {} as AudioBuffer,
          base64: 'base64audio',
          duration: 300,
        },
      });

      const { result } = renderHook(() => useMeditationAgent());

      // First set a current meditation
      await act(async () => {
        await result.current.generateMeditation('Test');
      });

      const mockVoice = {
        id: 'test-voice',
        name: 'Test Voice',
        provider: 'fish-audio',
        isCloned: false,
        createdAt: new Date().toISOString(),
      };

      await act(async () => {
        await result.current.synthesizeMeditation('Test script', mockVoice as any);
      });

      expect(agentTools.synthesizeAudio).toHaveBeenCalled();

      // Should update current meditation with audio
      expect(result.current.currentMeditation?.audioBuffer).toBeDefined();
      expect(result.current.currentMeditation?.audioBase64).toBe('base64audio');
    });

    it('should handle synthesis errors', async () => {
      vi.mocked(agentTools.synthesizeAudio).mockResolvedValue({
        success: false,
        error: 'Voice synthesis failed',
      });

      const { result } = renderHook(() => useMeditationAgent());

      const mockVoice = {
        id: 'test-voice',
        name: 'Test Voice',
        provider: 'fish-audio',
        isCloned: false,
        createdAt: new Date().toISOString(),
      };

      await act(async () => {
        await result.current.synthesizeMeditation('Test script', mockVoice as any);
      });

      expect(result.current.error).toBe('Voice synthesis failed');
    });
  });

  describe('executeAction', () => {
    it('should execute generate_meditation action', async () => {
      // Reset generateMeditationScript to success for this test
      vi.mocked(agentTools.generateMeditationScript).mockResolvedValue({
        success: true,
        data: {
          script: 'Sleep meditation script',
          meditationType: 'sleep',
          duration: 300,
        },
      });

      const { result } = renderHook(() => useMeditationAgent());

      await act(async () => {
        await result.current.executeAction({
          type: 'generate_meditation',
          label: 'Generate Sleep Meditation',
          data: { meditationType: 'sleep' },
        });
      });

      expect(result.current.currentMeditation).not.toBeNull();
    });

    it('should execute show_quote action', async () => {
      const { result } = renderHook(() => useMeditationAgent());

      // Wait for agent initialization
      await waitFor(() => {
        expect(mockConversationStore.startNewConversation).toHaveBeenCalled();
      });

      await act(async () => {
        await result.current.executeAction({
          type: 'show_quote',
          label: 'Show Quote',
          data: {},
        });
      });

      expect(agentTools.getWisdomQuote).toHaveBeenCalled();

      // Should add quote message
      await waitFor(() => {
        const quoteMessage = result.current.messages.find(m =>
          m.content.includes('Test quote')
        );
        expect(quoteMessage).toBeDefined();
      });
    });
  });

  describe('clearConversation', () => {
    it('should clear all messages and meditation', async () => {
      const { result } = renderHook(() => useMeditationAgent());

      // Wait for agent initialization
      await waitFor(() => {
        expect(mockConversationStore.startNewConversation).toHaveBeenCalled();
      });

      // Add some messages
      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      });

      // Clear conversation
      act(() => {
        result.current.clearConversation();
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.currentMeditation).toBeNull();
      expect(result.current.error).toBeNull();
      expect(mockAgentResetConversation).toHaveBeenCalled();
    });
  });
});
