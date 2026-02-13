/**
 * Response Handler Module
 *
 * Parses AI responses, detects meditation content, and provides fallbacks.
 * Ensures responses adhere to conversational guidelines.
 */

import type { MeditationType } from '../knowledgeBase';
import type { ContentDetectionResult } from '../contentDetection';
import type { AgentResponse } from '../types';
import { getContentCategory } from '../contentTypes';
import { getMeditationRecommendation } from '../knowledgeBase';
import { GENERATION_TRIGGER_PHRASES } from '../systemPrompt';
import { debugLog } from '../utils';

// ============================================================================
// MEDITATION CONTENT INDICATORS
// ============================================================================

const MEDITATION_INDICATORS = [
  // Breathing instructions
  /(?:take a (?:deep |slow )?breath|breathe (?:in|out|deeply)|inhale|exhale)/i,
  // Body awareness
  /(?:close your eyes|relax your|feel your body|notice your|let go of)/i,
  // Visualization guidance
  /(?:allow yourself|let yourself|imagine|visualize|picture yourself)/i,
  // Audio tags (dead giveaway)
  /\[(?:pause|breath|deep breath|silence|exhale|inhale)\]/i,
  // Meditation endings
  /(?:gently|slowly|when you're ready|return|come back|open your eyes)/i,
  // Guided meditation language
  /(?:inner peace|peaceful place|safe space|sanctuary|awareness|mindful)/i,
];

// ============================================================================
// CONVERSATIONAL FALLBACKS
// ============================================================================

const STATE_RESPONSES: Record<string, string[]> = {
  'anxious': [
    "What's going on?",
    "What's making you anxious?",
    "Tell me what's happening.",
  ],
  'stressed': [
    "What's stressing you out?",
    "What's going on?",
    "Tell me about it.",
  ],
  'sad': [
    "What happened?",
    "What's going on?",
    "I'm listening.",
  ],
  'overwhelmed': [
    "What's the main thing?",
    "Where do you want to start?",
    "What's happening?",
  ],
  'seeking_clarity': [
    "What are you thinking about?",
    "Tell me more.",
    "What's on your mind?",
  ],
  'neutral': [
    "What's on your mind?",
    "Tell me more.",
    "Go on.",
  ],
};

const DEFAULT_FALLBACKS = [
  "What's on your mind?",
  "Tell me more.",
  "Go on.",
  "What's happening?",
  "I'm listening.",
];

// ============================================================================
// RESPONSE HANDLER CLASS
// ============================================================================

export class ResponseHandler {
  /**
   * Detect if AI response contains meditation content when user didn't ask for it
   * This is a safety check to prevent meditation scripts from appearing in chat
   */
  detectMeditationContentInResponse(response: string): boolean {
    const lowered = response.toLowerCase();

    // Count indicators - if 3+ present, likely meditation content
    let count = 0;
    for (const pattern of MEDITATION_INDICATORS) {
      if (pattern.test(lowered)) count++;
    }

    // Also check response length (meditation scripts are typically long)
    const isLongResponse = response.length > 500;

    // Check for multiple paragraphs (meditation structure)
    const paragraphCount = response.split(/\n\s*\n/).length;
    const hasMultipleParagraphs = paragraphCount >= 3;

    const isMeditationContent = count >= 3 && (isLongResponse || hasMultipleParagraphs);

    if (isMeditationContent) {
      debugLog('Detected meditation content in response', {
        indicatorCount: count,
        responseLength: response.length,
        paragraphCount,
      });
    }

    return isMeditationContent;
  }

  /**
   * Get a conversational fallback when AI generates unwanted meditation content
   */
  getConversationalFallback(emotionalState?: string): string {
    if (emotionalState) {
      const responses = STATE_RESPONSES[emotionalState];
      if (responses) {
        return responses[Math.floor(Math.random() * responses.length)]!;
      }
    }

    return DEFAULT_FALLBACKS[Math.floor(Math.random() * DEFAULT_FALLBACKS.length)]!;
  }

  /**
   * Infer meditation type from response text
   */
  inferMeditationType(responseText: string): MeditationType {
    const lowered = responseText.toLowerCase();

    if (lowered.includes('breath')) return 'breathwork';
    if (lowered.includes('body scan') || lowered.includes('relaxation')) return 'body_scan';
    if (lowered.includes('sleep') || lowered.includes('rest')) return 'sleep_story';
    if (lowered.includes('loving') || lowered.includes('compassion')) return 'loving_kindness';
    if (lowered.includes('gratitude') || lowered.includes('thankful')) return 'gratitude';
    if (lowered.includes('affirm')) return 'affirmations';
    if (lowered.includes('visualiz')) return 'guided_visualization';
    if (lowered.includes('manifest') || lowered.includes('intention')) return 'manifestation';
    if (lowered.includes('shadow') || lowered.includes('inner child')) return 'shadow_work';
    if (lowered.includes('presence') || lowered.includes('present moment')) return 'presence';

    return 'guided_visualization'; // Default
  }

  /**
   * Parse the response and extract structured data
   */
  parseResponse(
    responseText: string,
    emotionalState: string | undefined,
    requestedMeditation: MeditationType | undefined,
    detection: ContentDetectionResult | undefined,
    messageCount: number,
    extractGoalFromContext: () => string
  ): AgentResponse {
    const response: AgentResponse = {
      message: responseText,
      emotionalState,
    };

    // Check if response indicates readiness to generate meditation
    const lowerResponse = responseText.toLowerCase();
    const shouldGenerate = GENERATION_TRIGGER_PHRASES.some(phrase => lowerResponse.includes(phrase));

    debugLog('parseResponse', {
      shouldGenerate,
      meditationType: requestedMeditation,
      emotionalState,
    });

    // Trigger generation only on explicit phrases
    if (shouldGenerate) {
      response.shouldGenerateMeditation = true;
      response.meditationType = requestedMeditation || this.inferMeditationType(responseText);

      // Include content category info if we have detection results
      if (detection) {
        response.contentCategory = detection.category;
        response.contentSubType = detection.subType;

        // Build generation params for the new system
        const categoryInfo = getContentCategory(detection.category);
        response.contentGenerationParams = {
          category: detection.category,
          subType: detection.subType,
          meditationType: response.meditationType,
          hypnosisDepth: detection.depth,
          targetAgeGroup: detection.ageGroup,
          durationMinutes: detection.durationMinutes || categoryInfo?.defaultDuration.recommended || 10,
          goal: detection.extractedGoal || extractGoalFromContext(),
          emotionalState: emotionalState,
        };
      }
    }

    // SAFETY CHECK: Detect if AI wrote meditation content without being asked
    if (!shouldGenerate && !requestedMeditation) {
      const hasMeditationContent = this.detectMeditationContentInResponse(responseText);

      if (hasMeditationContent) {
        console.warn('[MeditationAgent] AI generated meditation content without being asked - replacing with conversational response');
        response.message = this.getConversationalFallback(emotionalState);
      }
    }

    // Suggested actions are intentionally empty - let conversation flow naturally
    response.suggestedActions = [];

    // Add a relevant quote very rarely (5% chance) and only after deeper conversations
    if (Math.random() < 0.05 && emotionalState && messageCount > 3) {
      const recommendation = getMeditationRecommendation(emotionalState);
      if (recommendation.teachers.length > 0) {
        const teacher = recommendation.teachers[0]!;
        if (teacher.quotes.length > 0) {
          response.quote = {
            quote: teacher.quotes[Math.floor(Math.random() * teacher.quotes.length)]!,
            teacher: teacher.name,
          };
        }
      }
    }

    return response;
  }
}

// Export singleton instance
export const responseHandler = new ResponseHandler();
