/**
 * Prompt Builder Module
 *
 * Builds prompts for Gemini API calls, including context, preferences,
 * and meditation generation prompts.
 */

import type { MeditationType, MeditationTypeInfo } from '../knowledgeBase';
import type { ContentGenerationParams, ContentCategory } from '../contentTypes';
import type { ConversationMessage, UserPreferences, ExtractedUserContext } from '../types';
import type { MeditationPreferences } from '../../preferencesService';
import {
  MEDITATION_TYPES,
  EMOTIONAL_STATES,
  getMeditationRecommendation,
} from '../knowledgeBase';
import {
  buildPersonalizationPrompt,
  getPreferredApproach,
} from '../../preferencesService';
import { buildContentPrompt } from '../promptTemplates';
import { getContentCategory } from '../contentTypes';
import { contextExtractor } from './ContextExtractor';
import { contentRouter } from './ContentRouter';
import { debugLog } from '../utils';

// ============================================================================
// PROMPT BUILDER CLASS
// ============================================================================

export class PromptBuilder {
  /**
   * Build the full prompt including context and system instructions
   * NOTE: SYSTEM_PROMPT is now passed separately to Gemini's systemInstruction
   */
  buildPrompt(
    userMessage: string,
    messages: ConversationMessage[],
    userPreferences: UserPreferences,
    emotionalState?: string,
    requestedMeditation?: MeditationType
  ): string {
    let contextInfo = '';

    // Add emotional context if detected
    if (emotionalState) {
      const recommendation = getMeditationRecommendation(emotionalState);
      contextInfo += `\n\n[CONTEXT: User appears to be feeling ${emotionalState}. `;
      contextInfo += `Recommended approach: ${recommendation.message}]\n`;
    }

    // Add requested meditation context
    if (requestedMeditation) {
      const meditationType = MEDITATION_TYPES.find(m => m.id === requestedMeditation);
      if (meditationType) {
        contextInfo += `\n[USER IS REQUESTING: ${meditationType.name} meditation]\n`;
      }
    }

    // Add conversation history (last 6 messages for context)
    const recentMessages = messages.slice(-6);
    let conversationHistory = '';
    if (recentMessages.length > 1) {
      conversationHistory = '\n\n[RECENT CONVERSATION]\n';
      for (const msg of recentMessages.slice(0, -1)) { // Exclude current message
        conversationHistory += `${msg.role === 'user' ? 'User' : 'Guide'}: ${msg.content}\n\n`;
      }
    }

    // Add user preferences if any
    let preferencesInfo = '';
    if (userPreferences.preferredTraditions?.length) {
      preferencesInfo += `\n[USER PREFERS: ${userPreferences.preferredTraditions.join(', ')} traditions]\n`;
    }

    return `${contextInfo}
${preferencesInfo}
${conversationHistory}

User: ${userMessage}

Guide:`;
  }

  /**
   * Generate a meditation prompt based on conversation context
   * Enhanced version with detailed context extraction for accuracy
   */
  generateMeditationPrompt(
    messages: ConversationMessage[],
    currentMood: string | undefined,
    selectedMeditation: MeditationType | undefined,
    meditationPreferences: MeditationPreferences | null,
    type?: MeditationType
  ): string {
    const mood = currentMood;
    const meditationType = type || selectedMeditation || 'guided_visualization';
    const meditationInfo = MEDITATION_TYPES.find(m => m.id === meditationType);

    // Collect ALL user messages for comprehensive context
    const allUserMessages = messages
      .filter(m => m.role === 'user')
      .map(m => m.content);

    // Extract specific elements from user input
    const combinedInput = allUserMessages.join(' ').toLowerCase();
    const extractedContext = contextExtractor.extract(combinedInput);

    let prompt = '';

    // Primary emotional state
    if (mood) {
      const state = EMOTIONAL_STATES.find(s => s.id === mood);
      if (state) {
        prompt += `PRIMARY EMOTIONAL STATE: ${state.emotions[0]}\n`;
        prompt += `SUPPORTIVE APPROACH: ${state.supportiveMessage}\n\n`;
      }
    }

    // Specific user situation
    if (extractedContext.situation) {
      prompt += `USER'S SITUATION: ${extractedContext.situation}\n`;
    }

    // Specific settings/scenes requested
    if (extractedContext.settings.length > 0) {
      prompt += `REQUESTED SETTING: ${extractedContext.settings.join(', ')}\n`;
    }

    // Time context
    if (extractedContext.timeContext) {
      prompt += `TIME CONTEXT: ${extractedContext.timeContext}\n`;
    }

    // Specific goals mentioned
    if (extractedContext.goals.length > 0) {
      prompt += `USER'S GOALS: ${extractedContext.goals.join(', ')}\n`;
    }

    // Duration preferences
    if (extractedContext.duration) {
      prompt += `PREFERRED DURATION: ${extractedContext.duration}\n`;
    }

    // Meditation type with benefits
    if (meditationInfo) {
      prompt += `\nMEDITATION TYPE: ${meditationInfo.name}\n`;
      prompt += `BENEFITS TO EMPHASIZE: ${meditationInfo.benefits.join(', ')}\n`;
    }

    // Add teacher influence for authenticity
    const recommendation = mood ? getMeditationRecommendation(mood) : null;
    if (recommendation && recommendation.teachers.length > 0) {
      const teacher = recommendation.teachers[0];
      prompt += `\nWISDOM INFLUENCE: Draw subtly from ${teacher.name}'s approach - "${teacher.coreTeaching}"\n`;
    }

    // Include learned preferences from past sessions
    const preferencesPrompt = buildPersonalizationPrompt(meditationPreferences, mood);
    if (preferencesPrompt) {
      prompt += preferencesPrompt;
    }

    // Check if user has a preferred approach for this emotional state
    if (mood && meditationPreferences) {
      const preferredApproach = getPreferredApproach(meditationPreferences, mood);
      if (preferredApproach) {
        prompt += `\nIMPORTANT: This user has responded well to ${preferredApproach} in the past when feeling ${mood}. Consider incorporating this approach.\n`;
      }
    }

    // Include the actual user words for maximum accuracy
    prompt += `\n--- USER'S EXACT WORDS ---\n`;
    prompt += allUserMessages.slice(-5).join('\n');
    prompt += `\n--- END USER'S WORDS ---\n`;

    prompt += `\nCRITICAL: The meditation MUST directly address what the user asked for. Match their specific situation, not a generic version.`;

    return prompt;
  }

  /**
   * Generate content prompt for any content category using the new template system.
   * This is the primary method for new content types (affirmations, hypnosis, journeys, stories).
   */
  generateContentPrompt(
    messages: ConversationMessage[],
    selectedContentCategory: string | undefined,
    selectedContentSubType: string | undefined,
    selectedMeditation: MeditationType | undefined,
    currentMood: string | undefined,
    params?: ContentGenerationParams
  ): { prompt: string; temperature: number; maxTokens: number } {
    // If params provided, use the new template system
    if (params) {
      return buildContentPrompt(params);
    }

    // Fallback: Build params from session state
    const category = (selectedContentCategory || 'meditation') as ContentCategory;
    const subType = selectedContentSubType || 'guided_visualization';
    const mood = currentMood;

    // Get all user messages for goal extraction
    const allUserMessages = messages
      .filter(m => m.role === 'user')
      .map(m => m.content);

    const combinedInput = allUserMessages.join(' ').toLowerCase();
    const extractedContext = contextExtractor.extract(combinedInput);

    // Detect duration from context
    let durationMinutes = 10;
    if (extractedContext.duration) {
      const parsed = contextExtractor.parseDurationMinutes(extractedContext.duration);
      if (parsed) {
        durationMinutes = parsed;
      }
    }

    const categoryInfo = getContentCategory(category);

    const generationParams: ContentGenerationParams = {
      category,
      subType,
      meditationType: selectedMeditation || contentRouter.inferMeditationTypeFromSubType(subType),
      durationMinutes: durationMinutes || categoryInfo?.defaultDuration.recommended || 10,
      goal: extractedContext.goals.join(', ') || allUserMessages.slice(-3).join(' ').slice(0, 200),
      emotionalState: mood,
    };

    // Include audio tags if settings suggest specific ones
    if (extractedContext.settings.length > 0) {
      generationParams.audioTags = extractedContext.settings;
    }

    return buildContentPrompt(generationParams);
  }
}

// Export singleton instance
export const promptBuilder = new PromptBuilder();
