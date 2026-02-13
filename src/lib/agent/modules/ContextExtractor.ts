/**
 * Context Extractor Module
 *
 * Extracts specific context from user input for accurate content generation.
 * Handles situations, settings, time context, goals, and duration preferences.
 */

import type { ExtractedUserContext } from '../types';
import { debugLog } from '../utils';

// ============================================================================
// SITUATION PATTERNS
// ============================================================================

const SITUATION_PATTERNS = [
  { pattern: /(?:have|got|facing|before|after|during)\s+(?:a|an|my|the)?\s*([a-z\s]+(?:interview|meeting|exam|presentation|date|surgery|flight|trip|call|appointment))/i, capture: 1 },
  { pattern: /(?:dealing with|going through|struggling with|facing)\s+([a-z\s]+)/i, capture: 1 },
  { pattern: /(?:my|the)\s+([a-z]+)\s+(?:is|are|was|were)\s+(?:making|causing|giving)/i, capture: 0 },
  { pattern: /(?:broke up|breakup|divorce|lost my|death of|passed away)/i, capture: 0 },
  { pattern: /(?:work|job|boss|coworker|colleague)\s+(?:is|are|stress)/i, capture: 0 },
];

// ============================================================================
// SETTING KEYWORDS
// ============================================================================

const SETTING_KEYWORDS = [
  'beach', 'ocean', 'sea', 'waves', 'shore', 'sand',
  'forest', 'woods', 'trees', 'nature', 'garden',
  'mountain', 'mountains', 'peak', 'summit', 'hiking',
  'river', 'stream', 'waterfall', 'lake', 'pond',
  'meadow', 'field', 'flowers', 'grass',
  'sky', 'clouds', 'stars', 'moon', 'sun', 'sunrise', 'sunset',
  'rain', 'storm', 'thunder', 'snow', 'winter',
  'cabin', 'cottage', 'home', 'room', 'bed',
  'temple', 'sanctuary', 'sacred', 'spiritual',
  'space', 'cosmos', 'universe', 'floating',
];

// ============================================================================
// TIME PATTERNS
// ============================================================================

const TIME_PATTERNS = [
  { pattern: /(?:tonight|going to bed|bedtime|before sleep|can't sleep|falling asleep)/i, time: 'nighttime/sleep' },
  { pattern: /(?:morning|wake up|start my day|before work)/i, time: 'morning/awakening' },
  { pattern: /(?:lunch|break|midday|afternoon)/i, time: 'midday/break' },
  { pattern: /(?:evening|after work|wind down|end of day)/i, time: 'evening/unwinding' },
  { pattern: /(?:quick|short|5 minutes?|few minutes?|brief)/i, time: 'quick session' },
  { pattern: /(?:deep|long|extended|thorough|full)/i, time: 'extended session' },
];

// ============================================================================
// GOAL KEYWORDS
// ============================================================================

const GOAL_KEYWORDS = [
  'calm', 'peace', 'relaxation', 'focus', 'clarity', 'confidence',
  'sleep', 'rest', 'energy', 'motivation', 'courage', 'strength',
  'self-love', 'forgiveness', 'acceptance', 'gratitude', 'joy',
  'healing', 'release', 'letting go', 'grounding', 'centering',
];

// ============================================================================
// DURATION PATTERNS
// ============================================================================

const DURATION_PATTERNS = [
  { pattern: /(\d+)\s*(?:min|minute)/i, extract: true },
  { pattern: /(?:quick|short|brief)/i, duration: '3-5 minutes' },
  { pattern: /(?:medium|normal|regular)/i, duration: '10-15 minutes' },
  { pattern: /(?:long|deep|extended|full)/i, duration: '20-30 minutes' },
];

// ============================================================================
// CONTEXT EXTRACTOR CLASS
// ============================================================================

export class ContextExtractor {
  /**
   * Extract specific context from user input for accurate meditation generation
   */
  extract(input: string): ExtractedUserContext {
    const result: ExtractedUserContext = {
      situation: null,
      settings: [],
      timeContext: null,
      goals: [],
      duration: null,
    };

    // Extract specific situations
    for (const { pattern } of SITUATION_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        result.situation = match[0].trim();
        break;
      }
    }

    // Extract settings/scenes
    for (const keyword of SETTING_KEYWORDS) {
      if (input.includes(keyword)) {
        result.settings.push(keyword);
      }
    }

    // Extract time context
    for (const { pattern, time } of TIME_PATTERNS) {
      if (pattern.test(input)) {
        result.timeContext = time;
        break;
      }
    }

    // Extract specific goals
    for (const keyword of GOAL_KEYWORDS) {
      if (input.includes(keyword)) {
        result.goals.push(keyword);
      }
    }

    // Extract duration preferences
    for (const item of DURATION_PATTERNS) {
      if ('extract' in item) {
        const match = input.match(item.pattern);
        if (match) {
          result.duration = `${match[1]} minutes`;
          break;
        }
      } else if (item.pattern.test(input)) {
        result.duration = item.duration;
        break;
      }
    }

    debugLog('Extracted context', result as unknown as Record<string, unknown>);
    return result;
  }

  /**
   * Extract goal from conversation messages
   */
  extractGoalFromMessages(messages: { role: string; content: string }[]): string {
    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .slice(-3)
      .join(' ');
    return userMessages.slice(0, 200);
  }

  /**
   * Parse duration from extracted context
   */
  parseDurationMinutes(duration: string | null): number | null {
    if (!duration) return null;
    const match = duration.match(/(\d+)/);
    if (match) {
      return parseInt(match[1]!);
    }
    return null;
  }
}

// Export singleton instance
export const contextExtractor = new ContextExtractor();
