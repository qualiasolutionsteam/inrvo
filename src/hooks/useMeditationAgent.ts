/**
 * useMeditationAgent Hook
 *
 * React hook that provides a complete conversational AI meditation assistant.
 * Integrates the MeditationAgent with Gemini, tools, and conversation storage.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { MeditationAgent, getRandomGreeting, type AgentResponse, type ConversationMessage } from '../lib/agent/MeditationAgent';
import { conversationStore } from '../lib/agent/conversationStore';
import * as agentTools from '../lib/agent/agentTools';
import { geminiService } from '../../geminiService';
import { voiceService } from '../lib/voiceService';
import type { VoiceProfile } from '../../types';
import type { MeditationType } from '../lib/agent/knowledgeBase';

// ============================================================================
// TYPES
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  error?: string;
  actions?: AgentAction[];
  quote?: { quote: string; teacher: string };
}

export interface AgentAction {
  type: 'generate_meditation' | 'show_options' | 'play_audio' | 'show_quote';
  label: string;
  data?: any;
}

export interface MeditationResult {
  script: string;
  meditationType: MeditationType;
  audioBuffer?: AudioBuffer;
  audioBase64?: string;
  duration?: number;
  // New: indicates script is ready for review (not audio generated yet)
  readyForReview?: boolean;
}

export interface UseMeditationAgentReturn {
  // State
  messages: ChatMessage[];
  isLoading: boolean;
  isGeneratingMeditation: boolean;
  error: string | null;
  currentMeditation: MeditationResult | null;

  // Actions
  sendMessage: (message: string) => Promise<void>;
  generateMeditation: (prompt: string, type?: MeditationType) => Promise<MeditationResult | null>;
  synthesizeMeditation: (script: string, voice: VoiceProfile) => Promise<void>;
  clearConversation: () => void;
  executeAction: (action: AgentAction) => Promise<void>;

  // Helpers
  greeting: string;
  quickPrompts: typeof agentTools.QUICK_PROMPTS;
}

// Quick prompts for UI - using icon identifiers for SVG rendering
const QUICK_PROMPTS = [
  { label: "I'm feeling anxious", icon: "waves" },
  { label: "I can't sleep", icon: "moon" },
  { label: "I need to calm down", icon: "lotus" },
  { label: "I want to feel grateful", icon: "heart" },
  { label: "I'm stressed at work", icon: "cloud" },
  { label: "Help me focus", icon: "target" },
  { label: "I need self-love", icon: "sparkle" },
  { label: "I want to manifest", icon: "star" },
];

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useMeditationAgent(): UseMeditationAgentReturn {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingMeditation, setIsGeneratingMeditation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMeditation, setCurrentMeditation] = useState<MeditationResult | null>(null);
  const [greeting] = useState(() => getRandomGreeting());

  // Refs
  const agentRef = useRef<MeditationAgent | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize agent on mount
  useEffect(() => {
    // Create the Gemini content generator function
    const generateContent = async (prompt: string): Promise<string> => {
      try {
        // Use geminiService for generation
        const response = await geminiService.enhanceScript(prompt);
        return response;
      } catch (error: any) {
        console.error('Error generating content:', error);
        throw error;
      }
    };

    // Initialize agent with stored preferences
    const preferences = conversationStore.loadPreferences();
    agentRef.current = new MeditationAgent(generateContent, preferences);

    // Load existing conversation if any
    const existingConversation = conversationStore.getCurrentConversation();
    if (existingConversation) {
      const chatMessages = existingConversation.messages.map((msg, index) => ({
        id: `msg_${index}`,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.timestamp,
      }));
      setMessages(chatMessages);
    }

    // Cleanup
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  /**
   * Generate a unique message ID
   */
  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Send a message to the agent
   */
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || !agentRef.current) return;

    setError(null);
    setIsLoading(true);

    // Add user message to UI
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Add loading message
    const loadingId = generateMessageId();
    setMessages(prev => [...prev, {
      id: loadingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    }]);

    try {
      // Get response from agent
      const response = await agentRef.current.chat(message);

      // Store in conversation store
      conversationStore.addMessage({
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      conversationStore.addMessage({
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        metadata: {
          emotionalState: response.emotionalState,
          suggestedMeditation: response.meditationType,
        },
      });

      // Update UI with response
      setMessages(prev => prev.map(msg =>
        msg.id === loadingId
          ? {
              ...msg,
              content: response.message,
              isLoading: false,
              actions: response.suggestedActions,
              quote: response.quote,
            }
          : msg
      ));

      // If agent is ready to generate meditation, do it automatically
      if (response.shouldGenerateMeditation && response.meditationType) {
        const meditationPrompt = agentRef.current.generateMeditationPrompt(response.meditationType);
        await generateMeditation(meditationPrompt, response.meditationType);
      }

    } catch (err: any) {
      console.error('Error in sendMessage:', err);
      setError(err.message || 'Failed to get response');

      // Update loading message with error
      setMessages(prev => prev.map(msg =>
        msg.id === loadingId
          ? {
              ...msg,
              content: "I apologize, but I'm having trouble responding right now. Please try again.",
              isLoading: false,
              error: err.message,
            }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, [generateMessageId]);

  /**
   * Generate a meditation script and optionally synthesize audio
   */
  const generateMeditation = useCallback(async (
    prompt: string,
    type: MeditationType = 'guided_visualization'
  ): Promise<MeditationResult | null> => {
    setIsGeneratingMeditation(true);
    setError(null);

    try {
      // Analyze the request for additional context
      const analysis = agentTools.analyzeUserRequest(prompt);

      // Determine duration
      let duration: 'short' | 'medium' | 'long' = 'medium';
      if (analysis.mentionedDuration) {
        if (analysis.mentionedDuration <= 5) duration = 'short';
        else if (analysis.mentionedDuration >= 15) duration = 'long';
      }

      // Generate the meditation script
      const result = await agentTools.generateMeditationScript(prompt, type, {
        duration,
        tradition: analysis.mentionedTradition,
        teacherInfluence: analysis.mentionedTeacher,
        audioTags: ['[deep breath]', '[pause]'], // Default tags
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to generate meditation');
      }

      const meditation: MeditationResult = {
        script: result.data.script,
        meditationType: result.data.meditationType,
        duration: result.data.duration,
        readyForReview: true, // Flag that script is ready for review
      };

      setCurrentMeditation(meditation);

      // Add a brief message - the ScriptEditor modal will handle the full preview
      const meditationMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: `I've crafted your ${type.replace('_', ' ')} meditation. You can now review and customize it before we generate the audio.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, meditationMessage]);

      return meditation;

    } catch (err: any) {
      console.error('Error generating meditation:', err);
      setError(err.message || 'Failed to generate meditation');
      return null;
    } finally {
      setIsGeneratingMeditation(false);
    }
  }, [generateMessageId]);

  /**
   * Synthesize audio for a meditation script
   */
  const synthesizeMeditation = useCallback(async (script: string, voice: VoiceProfile) => {
    setIsGeneratingMeditation(true);
    setError(null);

    try {
      // Get or create audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const result = await agentTools.synthesizeAudio(script, voice, audioContextRef.current);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to synthesize audio');
      }

      // Update current meditation with audio
      setCurrentMeditation(prev => prev ? {
        ...prev,
        audioBuffer: result.data?.audioBuffer,
        audioBase64: result.data?.base64,
        duration: result.data?.duration,
      } : null);

      // Add success message
      const audioMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: `Your meditation audio is ready! It's ${Math.round(result.data.duration / 60)} minutes long. Click play to begin your practice.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, audioMessage]);

    } catch (err: any) {
      console.error('Error synthesizing meditation:', err);
      setError(err.message || 'Failed to synthesize audio');
    } finally {
      setIsGeneratingMeditation(false);
    }
  }, [generateMessageId]);

  /**
   * Execute a suggested action
   */
  const executeAction = useCallback(async (action: AgentAction) => {
    switch (action.type) {
      case 'generate_meditation':
        if (action.data?.meditationType) {
          await generateMeditation('', action.data.meditationType);
        }
        break;

      case 'show_options':
        // Trigger a message about meditation options
        await sendMessage('What meditation options do you have?');
        break;

      case 'play_audio':
        // This would be handled by the UI component that has access to voice selection
        console.log('Play audio action triggered');
        break;

      case 'show_quote':
        const quote = agentTools.getWisdomQuote();
        if (quote.success && quote.data) {
          const quoteMessage: ChatMessage = {
            id: generateMessageId(),
            role: 'assistant',
            content: `"${quote.data.quote}"\n\n— ${quote.data.teacher}`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, quoteMessage]);
        }
        break;
    }
  }, [generateMeditation, sendMessage, generateMessageId]);

  /**
   * Clear the conversation
   */
  const clearConversation = useCallback(() => {
    setMessages([]);
    setCurrentMeditation(null);
    setError(null);

    conversationStore.startNewConversation();

    if (agentRef.current) {
      agentRef.current.resetConversation();
    }
  }, []);

  return {
    // State
    messages,
    isLoading,
    isGeneratingMeditation,
    error,
    currentMeditation,

    // Actions
    sendMessage,
    generateMeditation,
    synthesizeMeditation,
    clearConversation,
    executeAction,

    // Helpers
    greeting,
    quickPrompts: QUICK_PROMPTS,
  };
}

export default useMeditationAgent;
