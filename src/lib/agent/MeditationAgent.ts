/**
 * Innrvo Meditation Agent
 *
 * A conversational AI assistant that guides users through personalized
 * experiences, drawing from diverse wisdom traditions and modern neuroscience.
 *
 * Supports 5 content categories:
 * - Meditations (guided visualizations, breathwork, body scans, etc.)
 * - Affirmations (power, guided, sleep, mirror work styles)
 * - Self-Hypnosis (light, standard, therapeutic depths)
 * - Guided Journeys (past life, spirit guide, shamanic, astral, etc.)
 * - Children's Stories (toddler 2-4, young child 5-8)
 *
 * This class uses the Facade pattern, delegating to specialized modules:
 * - ContextExtractor: Extracts user context (situations, goals, duration)
 * - ContentRouter: Routes requests to appropriate content generation
 * - ResponseHandler: Parses responses and provides fallbacks
 * - PromptBuilder: Builds prompts for Gemini API calls
 */

// ============================================================================
// IMPORTS
// ============================================================================

import {
  MEDITATION_TYPES,
  detectEmotionalState,
  getMeditationRecommendation,
  getRandomQuote,
  type MeditationType,
} from './knowledgeBase';

import {
  loadMeditationPreferences,
  type MeditationPreferences,
} from '../preferencesService';

import {
  contentDetector,
  type ContentDetectionResult,
} from './contentDetection';

import {
  type ContentCategory,
  type ContentGenerationParams,
  getContentCategory,
} from './contentTypes';

// Import types from centralized location
import type {
  ConversationMessage,
  ConversationContext,
  UserPreferences,
  SessionState,
  AgentResponse,
} from './types';

// Re-export types for backwards compatibility
export type {
  ConversationMessage,
  ConversationContext,
  UserPreferences,
  SessionState,
  AgentResponse,
  AgentAction,
} from './types';

// Import modules
import { contextExtractor } from './modules/ContextExtractor';
import { contentRouter } from './modules/ContentRouter';
import { responseHandler } from './modules/ResponseHandler';
import { promptBuilder } from './modules/PromptBuilder';

// Import utilities
import { debugLog } from './utils';

// Re-export utilities for backwards compatibility
export { GREETING_MESSAGES, getRandomGreeting, QUICK_PROMPTS } from './utils';

// Re-export system prompt for Edge Function
export { SYSTEM_PROMPT } from './systemPrompt';

// ============================================================================
// MEDITATION AGENT CLASS
// ============================================================================

export class MeditationAgent {
  private context: ConversationContext;
  private generateContent: (prompt: string) => Promise<string>;
  private userId?: string;
  private meditationPreferences: MeditationPreferences | null = null;
  private preferencesLoaded = false;

  constructor(
    generateContentFn: (prompt: string) => Promise<string>,
    initialPreferences?: UserPreferences,
    userId?: string
  ) {
    this.generateContent = generateContentFn;
    this.userId = userId;
    this.context = {
      messages: [],
      userPreferences: initialPreferences || {},
      sessionState: {
        conversationStarted: new Date(),
        messageCount: 0,
      },
    };

    // Load meditation preferences asynchronously
    if (userId) {
      this.loadPreferences();
    }
  }

  /**
   * Load user's meditation preferences from database
   */
  private async loadPreferences(): Promise<void> {
    if (!this.userId || this.preferencesLoaded) return;

    try {
      this.meditationPreferences = await loadMeditationPreferences(this.userId);
      this.preferencesLoaded = true;
      debugLog('Loaded user preferences', this.meditationPreferences as unknown as Record<string, unknown>);
    } catch (error) {
      console.error('[MeditationAgent] Error loading preferences:', error);
    }
  }

  /**
   * Set user ID and load their preferences
   */
  async setUserId(userId: string): Promise<void> {
    this.userId = userId;
    await this.loadPreferences();
  }

  /**
   * Process a user message and generate a response
   */
  async chat(userMessage: string): Promise<AgentResponse> {
    // FIRST: Handle disambiguation responses
    if (this.context.sessionState.awaitingDisambiguation && this.context.sessionState.lastDetectionResult) {
      return await this.handleDisambiguationResponse(userMessage);
    }

    // SECOND: Check if user pasted a ready-made meditation script
    const pastedScript = this.detectReadyMeditationScript(userMessage);
    if (pastedScript) {
      debugLog('User pasted a ready-made meditation, skipping AI processing');
      this.addUserMessage(userMessage);
      return {
        message: "I see you've brought your own meditation script. Let me take you to the editor where you can review and customize it.",
        shouldGenerateMeditation: true,
        meditationType: 'guided_visualization',
        contentCategory: 'meditation',
        contentSubType: 'guided_visualization',
        pastedScript: pastedScript,
      };
    }

    // Add user message to context
    const emotionalState = detectEmotionalState(userMessage);
    this.addUserMessage(userMessage, emotionalState?.id);

    // Use intelligent content type detection
    const detection = contentDetector.detect(userMessage);
    debugLog('Content detection result', {
      category: detection.category,
      subType: detection.subType,
      confidence: detection.confidence,
      needsDisambiguation: detection.needsDisambiguation,
      isConversational: detection.isConversational,
    });

    // Handle conversational input
    if (detection.isConversational || detection.confidence === 0) {
      debugLog('Conversational input detected, flowing to LLM');
    }
    // Handle disambiguation for explicit requests
    else if (detection.needsDisambiguation && detection.confidence < 70 && detection.confidence > 0
             && contentRouter.isExplicitGenerationRequest(userMessage)) {
      this.context.sessionState.awaitingDisambiguation = true;
      this.context.sessionState.lastDetectionResult = detection;

      return {
        message: detection.disambiguationQuestion || "I'd love to help. What kind of experience are you looking for?",
        awaitingDisambiguation: true,
        disambiguationQuestion: detection.disambiguationQuestion,
        emotionalState: emotionalState?.id,
      };
    }
    // High confidence detection - route to content generation
    else if (detection.confidence >= 70 && contentRouter.isExplicitGenerationRequest(userMessage)) {
      this.updateSessionState(detection);
      return contentRouter.routeToContentGeneration(
        detection,
        emotionalState?.id,
        this.context.sessionState,
        () => this.extractGoalFromContext(),
        MEDITATION_TYPES
      );
    }

    // Continue with conversational flow
    const requestedMeditation = detection.category === 'meditation' && detection.confidence >= 60
      ? detection.meditationType || contentRouter.inferMeditationTypeFromSubType(detection.subType)
      : undefined;

    // Build prompt and generate response
    const prompt = promptBuilder.buildPrompt(
      userMessage,
      this.context.messages,
      this.context.userPreferences,
      emotionalState?.id,
      requestedMeditation
    );

    const responseText = await this.generateContent(prompt);

    // Parse and process response
    const parsedResponse = responseHandler.parseResponse(
      responseText,
      emotionalState?.id,
      requestedMeditation,
      detection,
      this.context.sessionState.messageCount,
      () => this.extractGoalFromContext()
    );

    // Add assistant message to context
    this.addAssistantMessage(parsedResponse.message, emotionalState?.id, parsedResponse.meditationType);

    return parsedResponse;
  }

  /**
   * Handle user response to disambiguation question
   */
  private async handleDisambiguationResponse(userMessage: string): Promise<AgentResponse> {
    const previousResult = this.context.sessionState.lastDetectionResult!;

    // Clear disambiguation state
    this.context.sessionState.awaitingDisambiguation = false;
    this.context.sessionState.lastDetectionResult = undefined;

    // Use content detector to handle response
    const updatedResult = contentDetector.handleDisambiguationResponse(userMessage, previousResult);
    debugLog('Disambiguation resolved', {
      category: updatedResult.category,
      subType: updatedResult.subType,
      confidence: updatedResult.confidence,
    });

    this.addUserMessage(userMessage);

    // If still needs disambiguation, fall back to Gemini
    if (updatedResult.needsDisambiguation) {
      debugLog('Disambiguation unclear, falling back to Gemini conversation');
      const prompt = promptBuilder.buildPrompt(
        userMessage,
        this.context.messages,
        this.context.userPreferences,
        this.context.sessionState.currentMood
      );
      const responseText = await this.generateContent(prompt);
      return {
        message: responseText,
        emotionalState: this.context.sessionState.currentMood,
      };
    }

    // Route to content generation
    this.updateSessionState(updatedResult);
    return contentRouter.routeToContentGeneration(
      updatedResult,
      this.context.sessionState.currentMood,
      this.context.sessionState,
      () => this.extractGoalFromContext(),
      MEDITATION_TYPES
    );
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private addUserMessage(content: string, emotionalState?: string): void {
    const msg: ConversationMessage = {
      role: 'user',
      content,
      timestamp: new Date(),
    };

    if (emotionalState) {
      msg.metadata = { emotionalState };
      this.context.sessionState.currentMood = emotionalState;
    }

    this.context.messages.push(msg);
    this.context.sessionState.messageCount++;
  }

  private addAssistantMessage(content: string, emotionalState?: string, meditationType?: MeditationType): void {
    this.context.messages.push({
      role: 'assistant',
      content,
      timestamp: new Date(),
      metadata: {
        emotionalState,
        suggestedMeditation: meditationType,
      },
    });
  }

  private updateSessionState(detection: ContentDetectionResult): void {
    this.context.sessionState.selectedContentCategory = detection.category;
    this.context.sessionState.selectedContentSubType = detection.subType;
  }

  private extractGoalFromContext(): string {
    return contextExtractor.extractGoalFromMessages(this.context.messages);
  }

  /**
   * Detect if user has pasted a ready-made meditation script
   */
  private detectReadyMeditationScript(message: string): string | null {
    if (message.length < 300) return null;

    const meditationIndicators = [
      /(?:welcome|greetings|hello|dear one|beloved)/i,
      /(?:take a (?:deep |slow )?breath|breathe (?:in|out|deeply)|inhale|exhale)/i,
      /(?:close your eyes|relax your|feel your body|notice your|let go of)/i,
      /(?:allow yourself|let yourself|give yourself permission|imagine|visualize|picture)/i,
      /(?:present moment|inner peace|calm|stillness|awareness|mindful|conscious)/i,
      /(?:gently|slowly|when you're ready|return|come back|open your eyes)/i,
    ];

    let indicatorCount = 0;
    for (const pattern of meditationIndicators) {
      if (pattern.test(message)) indicatorCount++;
    }

    const paragraphCount = message.split(/\n\s*\n/).length;
    const hasAudioTags = /\[(?:pause|breath|deep breath|silence|music)\]/i.test(message);
    const hasMeditationStructure = paragraphCount >= 3 || hasAudioTags;

    if (indicatorCount >= 3 && hasMeditationStructure) {
      debugLog('Detected ready-made meditation script', {
        indicatorCount,
        paragraphCount,
        hasAudioTags,
        length: message.length,
      });
      return message;
    }

    return null;
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Get a wisdom quote for the current context
   */
  getContextualQuote(): { quote: string; teacher: string } {
    const mood = this.context.sessionState.currentMood;
    if (mood) {
      const recommendation = getMeditationRecommendation(mood);
      if (recommendation.teachers.length > 0) {
        const teacher = recommendation.teachers[Math.floor(Math.random() * recommendation.teachers.length)]!;
        if (teacher.quotes.length > 0) {
          return {
            quote: teacher.quotes[Math.floor(Math.random() * teacher.quotes.length)]!,
            teacher: teacher.name,
          };
        }
      }
    }
    return getRandomQuote();
  }

  /**
   * Generate a meditation prompt based on conversation context
   */
  generateMeditationPrompt(type?: MeditationType): string {
    return promptBuilder.generateMeditationPrompt(
      this.context.messages,
      this.context.sessionState.currentMood,
      this.context.sessionState.selectedMeditation,
      this.meditationPreferences,
      type
    );
  }

  /**
   * Generate content prompt for any content category
   */
  generateContentPrompt(params?: ContentGenerationParams): { prompt: string; temperature: number; maxTokens: number } {
    return promptBuilder.generateContentPrompt(
      this.context.messages,
      this.context.sessionState.selectedContentCategory,
      this.context.sessionState.selectedContentSubType,
      this.context.sessionState.selectedMeditation,
      this.context.sessionState.currentMood,
      params
    );
  }

  /**
   * Get generation parameters from current session state
   */
  getContentGenerationParams(): ContentGenerationParams | null {
    const category = this.context.sessionState.selectedContentCategory;
    const subType = this.context.sessionState.selectedContentSubType;

    if (!category || !subType) return null;

    const categoryInfo = getContentCategory(category);
    return {
      category,
      subType,
      meditationType: this.context.sessionState.selectedMeditation,
      durationMinutes: categoryInfo?.defaultDuration.recommended || 10,
      goal: this.extractGoalFromContext(),
      emotionalState: this.context.sessionState.currentMood,
    };
  }

  /**
   * Reset the conversation context
   */
  resetConversation(): void {
    this.context = {
      messages: [],
      userPreferences: this.context.userPreferences,
      sessionState: {
        conversationStarted: new Date(),
        messageCount: 0,
      },
    };
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): ConversationMessage[] {
    return [...this.context.messages];
  }

  /**
   * Set user preferences
   */
  setPreferences(preferences: Partial<UserPreferences>): void {
    this.context.userPreferences = {
      ...this.context.userPreferences,
      ...preferences,
    };
  }

  /**
   * Get current session state
   */
  getSessionState(): SessionState {
    return { ...this.context.sessionState };
  }
}
