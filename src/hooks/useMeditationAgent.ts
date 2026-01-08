/**
 * useMeditationAgent Hook
 *
 * React hook that provides a complete conversational AI meditation assistant.
 * Integrates the MeditationAgent with Gemini, tools, and conversation storage.
 */

// Debug logging - only enabled in development
const DEBUG = import.meta.env?.DEV ?? false;

import { useState, useCallback, useEffect, useRef } from 'react';
import { MeditationAgent, getRandomGreeting, SYSTEM_PROMPT, type AgentResponse, type ConversationMessage, type AgentAction } from '../lib/agent/MeditationAgent';
import { conversationStore } from '../lib/agent/conversationStore';
import * as agentTools from '../lib/agent/agentTools';
import { geminiService } from '../../geminiService';
import { voiceService } from '../lib/voiceService';
import { trackMeditation } from '../lib/tracking';
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

// Re-export AgentAction type from MeditationAgent for external use
export type { AgentAction };

export interface MeditationResult {
  script: string;
  meditationType: MeditationType;
  audioBuffer?: AudioBuffer;
  audioBase64?: string;
  duration?: number;
  // New: indicates script is ready for review (not audio generated yet)
  readyForReview?: boolean;
}

export interface UseMeditationAgentOptions {
  /** ID of a conversation to resume. If provided, loads that conversation on mount. */
  resumeConversationId?: string | null;
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
  loadConversation: (conversationId: string) => Promise<void>;

  // Helpers
  greeting: string;
  quickPrompts: typeof QUICK_PROMPTS;
}

// Quick prompts for UI - using icon identifiers for SVG rendering
const QUICK_PROMPTS = [
  { label: "I'm feeling anxious", icon: "waves" },
  { label: "I can't sleep", icon: "moon" },
  { label: "I'm stressed", icon: "cloud" },
  { label: "Just want to talk", icon: "heart" },
  { label: "Need some calm", icon: "lotus" },
  { label: "Create a meditation", icon: "sparkle" },
] as const;

// Dynamic creation messages based on meditation type and context
const CREATION_MESSAGES: Record<string, string[]> = {
  guided_visualization: [
    "Crafting a visualization journey for you...",
    "Building your inner landscape...",
    "Creating something peaceful for your mind's eye...",
    "Designing a calming scene just for you...",
  ],
  body_scan: [
    "Preparing a body awareness practice...",
    "Setting up a gentle body scan...",
    "Creating a journey through sensation...",
  ],
  breath_awareness: [
    "Crafting a breathing practice...",
    "Building a breath-centered experience...",
    "Creating something to anchor you in the present...",
  ],
  loving_kindness: [
    "Preparing a compassion practice...",
    "Creating space for kindness...",
    "Building a heart-centered meditation...",
  ],
  sleep: [
    "Preparing something to ease you into rest...",
    "Creating a gentle path to sleep...",
    "Building a calming journey for tonight...",
  ],
  anxiety: [
    "Creating something to help settle your mind...",
    "Building a practice to ease the tension...",
    "Preparing something calming for you...",
  ],
  stress: [
    "Crafting a release for you...",
    "Creating space for relief...",
    "Building something to help you decompress...",
  ],
  default: [
    "Working on something for you...",
    "Creating your meditation...",
    "Preparing something special...",
    "Building your practice...",
    "Putting this together for you...",
  ],
};

function getCreationMessage(meditationType?: string, emotionalState?: string): string {
  // Try meditation type first
  const typeKey = meditationType?.toLowerCase().replace(' ', '_') || '';
  let messages = CREATION_MESSAGES[typeKey];

  // Fall back to emotional state mapping
  if (!messages && emotionalState) {
    const stateKey = emotionalState.toLowerCase();
    if (stateKey.includes('anxious') || stateKey.includes('anxiety')) {
      messages = CREATION_MESSAGES.anxiety;
    } else if (stateKey.includes('stress')) {
      messages = CREATION_MESSAGES.stress;
    } else if (stateKey.includes('sleep') || stateKey.includes('tired')) {
      messages = CREATION_MESSAGES.sleep;
    }
  }

  // Default fallback
  if (!messages) {
    messages = CREATION_MESSAGES.default;
  }

  return messages[Math.floor(Math.random() * messages.length)];
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useMeditationAgent(options: UseMeditationAgentOptions = {}): UseMeditationAgentReturn {
  const { resumeConversationId } = options;

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
  const lastResumedIdRef = useRef<string | null>(null);

  // Helper to convert stored messages to ChatMessage format
  const convertStoredMessages = useCallback((storedMessages: ConversationMessage[]): ChatMessage[] => {
    return storedMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map((m, index) => ({
        id: `msg_${index}_${Date.now()}`,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.timestamp),
      }));
  }, []);

  // Initialize agent on mount
  useEffect(() => {
    let mounted = true;

    const initAgent = async () => {
      // Create the Gemini content generator function for conversational chat
      const generateContent = async (prompt: string): Promise<string> => {
        try {
          // Pass SYSTEM_PROMPT separately so Gemini treats it as instructions
          const response = await geminiService.chat(prompt, { systemPrompt: SYSTEM_PROMPT });
          return response;
        } catch (error) {
          console.error('Error generating content:', error);
          throw error;
        }
      };

      try {
        // Initialize agent with stored preferences (now async)
        const preferences = await conversationStore.loadPreferences();

        if (mounted) {
          agentRef.current = new MeditationAgent(generateContent, preferences);

          // Start fresh conversation on initial mount (now async)
          // Ensure DB row is created before we accept messages
          await conversationStore.startNewConversation();
          setMessages([]);
        }
      } catch (error) {
        console.error('Error initializing agent:', error);
      }
    };

    initAgent();

    // Cleanup
    return () => {
      mounted = false;
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Handle conversation resumption when resumeConversationId changes
  useEffect(() => {
    if (resumeConversationId && resumeConversationId !== lastResumedIdRef.current) {
      lastResumedIdRef.current = resumeConversationId;

      // Load the conversation from the store
      conversationStore.loadConversation(resumeConversationId).then((conversation) => {
        if (conversation && conversation.messages.length > 0) {
          const chatMessages = convertStoredMessages(conversation.messages);
          setMessages(chatMessages);
          if (DEBUG) console.log('[useMeditationAgent] Resumed conversation:', resumeConversationId, 'with', chatMessages.length, 'messages');
        }
      });
    }
  }, [resumeConversationId, convertStoredMessages]);

  /**
   * Generate a unique message ID
   */
  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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

      // If agent is ready to generate meditation, skip showing the chat response
      // and go directly to the ScriptEditor experience
      if (response.shouldGenerateMeditation && response.meditationType) {
        // Check if this is a pasted script (no AI generation needed)
        if (response.pastedScript) {
          // User pasted a ready-made meditation - go directly to editor
          setMessages(prev => prev.map(msg =>
            msg.id === loadingId
              ? {
                ...msg,
                content: response.message,
                isLoading: false,
              }
              : msg
          ));

          // Set the meditation directly without AI generation
          const meditation: MeditationResult = {
            script: response.pastedScript,
            meditationType: response.meditationType,
            readyForReview: true,
          };
          setCurrentMeditation(meditation);
          if (DEBUG) console.log("[useMeditationAgent] Pasted script ready for review:", {
            length: meditation.script.length,
            type: meditation.meditationType,
          });
        } else {
          // Normal flow - generate script via AI
          // Show brief transition message instead of agent's full response
          // (which might contain meditation text from AI not following instructions)
          const creationMessage = getCreationMessage(response.meditationType, response.emotionalState);
          setMessages(prev => prev.map(msg =>
            msg.id === loadingId
              ? {
                ...msg,
                content: creationMessage,
                isLoading: false,
              }
              : msg
          ));

          // Generate the meditation - this will open ScriptEditor automatically
          // Pass content category and age group so stories use third person (not first person "I")
          const meditationPrompt = agentRef.current.generateMeditationPrompt(response.meditationType);
          await generateMeditation(meditationPrompt, response.meditationType, {
            contentCategory: response.contentCategory,
            targetAgeGroup: response.contentGenerationParams?.targetAgeGroup,
          });
        }
      } else {
        // Normal conversational response - show the agent's message
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
      }

    } catch (err) {
      console.error('Error in sendMessage:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMessage);

      // Update loading message with error
      setMessages(prev => prev.map(msg =>
        msg.id === loadingId
          ? {
            ...msg,
            content: "I apologize, but I'm having trouble responding right now. Please try again.",
            isLoading: false,
            error: errorMessage,
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
    type: MeditationType = 'guided_visualization',
    contentOptions?: {
      contentCategory?: string;
      targetAgeGroup?: string;
    }
  ): Promise<MeditationResult | null> => {
    setIsGeneratingMeditation(true);
    setError(null);

    try {
      // Analyze the request for additional context
      const analysis = agentTools.analyzeUserRequest(prompt);

      // Use exact duration if mentioned, otherwise default to 5 minutes
      const durationMinutes = analysis.mentionedDuration || 5;

      // Generate the meditation script with exact duration
      // Pass content category and age group for proper template selection (e.g., stories use third person)
      const result = await agentTools.generateMeditationScript(prompt, type, {
        durationMinutes,  // Pass exact duration in minutes
        tradition: analysis.mentionedTradition,
        teacherInfluence: analysis.mentionedTeacher,
        audioTags: ['[deep breath]', '[pause]'], // Default tags
        contentCategory: contentOptions?.contentCategory,
        targetAgeGroup: contentOptions?.targetAgeGroup,
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
      trackMeditation.scriptGenerated(prompt.length);
      if (DEBUG) console.log("[useMeditationAgent] Setting meditation:", { script: meditation.script.substring(0, 50) + "...", readyForReview: meditation.readyForReview });

      // Don't add another message - the ScriptEditor modal opens automatically
      // The brief "Creating your meditation..." message was already shown

      return meditation;

    } catch (err) {
      console.error('Error generating meditation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate meditation';
      setError(errorMessage);
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
      // Get or create audio context (check state to handle closed contexts)
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
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

    } catch (err) {
      console.error('Error synthesizing meditation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to synthesize audio';
      setError(errorMessage);
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
        // With discriminated union, TypeScript knows action.data has meditationType
        await generateMeditation('', action.data.meditationType);
        break;

      case 'show_options':
        // Trigger a message about meditation options
        await sendMessage('What meditation options do you have?');
        break;

      case 'play_audio':
        // This would be handled by the UI component that has access to voice selection
        if (DEBUG) console.log('Play audio action triggered');
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

  /**
   * Load a specific conversation by ID
   */
  const loadConversation = useCallback(async (conversationId: string) => {
    const conversation = await conversationStore.loadConversation(conversationId);
    if (conversation && conversation.messages.length > 0) {
      const chatMessages = convertStoredMessages(conversation.messages);
      setMessages(chatMessages);
      lastResumedIdRef.current = conversationId;
      if (DEBUG) console.log('[useMeditationAgent] Loaded conversation:', conversationId, 'with', chatMessages.length, 'messages');
    }
  }, [convertStoredMessages]);

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
    loadConversation,

    // Helpers
    greeting,
    quickPrompts: QUICK_PROMPTS,
  };
}

export default useMeditationAgent;
