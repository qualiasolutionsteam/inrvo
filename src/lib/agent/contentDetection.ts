/**
 * INrVO Content Detection System
 *
 * Multi-layer detection pipeline that analyzes user input to determine:
 * 1. Content category (meditation, affirmation, hypnosis, journey, story)
 * 2. Sub-type within category
 * 3. Confidence score (0-100)
 * 4. Audience and context
 * 5. Whether disambiguation is needed
 */

import type { MeditationType } from './knowledgeBase';
import { MEDITATION_TYPES } from './knowledgeBase';
import {
  type ContentCategory,
  type ContentDetectionResult,
  type ContentAudience,
  type AffirmationSubType,
  type HypnosisDepth,
  type JourneySubType,
  type StoryAgeGroup,
  CONTENT_CATEGORIES,
  AFFIRMATION_SUBTYPES,
  HYPNOSIS_DEPTHS,
  JOURNEY_SUBTYPES,
  STORY_AGE_GROUPS,
} from './contentTypes';

// Re-export the ContentDetectionResult type for use by other modules
export type { ContentDetectionResult } from './contentTypes';

// ============================================================================
// DETECTION PATTERNS
// ============================================================================

interface DetectionPattern {
  pattern: RegExp;
  category: ContentCategory;
  subType: string;
  confidence: number;
  audience?: ContentAudience;
  depth?: HypnosisDepth;
  ageGroup?: StoryAgeGroup;
}

/**
 * Explicit request patterns - highest confidence (85-95%)
 * These are direct requests that clearly indicate content type
 */
const EXPLICIT_PATTERNS: DetectionPattern[] = [
  // ========== CHILDREN'S STORIES ==========
  // Age-specific patterns
  { pattern: /(?:bedtime\s+)?story\s+for\s+(?:my\s+)?(?:(\d+)[-\s]?(?:year[-\s]?old|yo)|\b(two|three|four)\b)/i, category: 'story', subType: 'toddler', confidence: 95, audience: 'parent_to_child', ageGroup: 'toddler' },
  { pattern: /(?:bedtime\s+)?story\s+for\s+(?:my\s+)?(?:toddler|baby|little\s+one|infant)/i, category: 'story', subType: 'toddler', confidence: 95, audience: 'parent_to_child', ageGroup: 'toddler' },
  { pattern: /(?:bedtime\s+)?story\s+for\s+(?:my\s+)?(?:(\d+)[-\s]?(?:year[-\s]?old|yo))/i, category: 'story', subType: 'young_child', confidence: 90, audience: 'parent_to_child', ageGroup: 'young_child' },
  { pattern: /(?:bedtime\s+)?story\s+for\s+(?:my\s+)?(?:kid|child|son|daughter)/i, category: 'story', subType: 'young_child', confidence: 85, audience: 'parent_to_child', ageGroup: 'young_child' },
  { pattern: /children(?:'s)?\s+(?:bedtime\s+)?story/i, category: 'story', subType: 'young_child', confidence: 90, audience: 'parent_to_child' },
  { pattern: /read\s+(?:to\s+)?(?:my\s+)?(?:kid|child|son|daughter)/i, category: 'story', subType: 'young_child', confidence: 85, audience: 'parent_to_child' },

  // ========== SELF-HYPNOSIS ==========
  { pattern: /(?:self[-\s]?)?hypnosis\s+(?:for|about|to)/i, category: 'self_hypnosis', subType: 'standard', confidence: 95, depth: 'standard' },
  { pattern: /(?:create|make|generate)\s+(?:a\s+)?(?:self[-\s]?)?hypnosis/i, category: 'self_hypnosis', subType: 'standard', confidence: 95, depth: 'standard' },
  { pattern: /hypnotize\s+me/i, category: 'self_hypnosis', subType: 'standard', confidence: 95, depth: 'standard' },
  { pattern: /deep\s+(?:trance|hypnosis)/i, category: 'self_hypnosis', subType: 'therapeutic', confidence: 90, depth: 'therapeutic' },
  { pattern: /therapeutic\s+hypnosis/i, category: 'self_hypnosis', subType: 'therapeutic', confidence: 95, depth: 'therapeutic' },
  { pattern: /light\s+(?:relaxation\s+)?hypnosis/i, category: 'self_hypnosis', subType: 'light', confidence: 95, depth: 'light' },
  { pattern: /(?:reprogram|rewire)\s+(?:my\s+)?(?:subconscious|mind)/i, category: 'self_hypnosis', subType: 'standard', confidence: 80, depth: 'standard' },

  // ========== AFFIRMATIONS ==========
  { pattern: /power\s+affirmations?/i, category: 'affirmation', subType: 'power', confidence: 95 },
  { pattern: /i\s+am\s+affirmations?/i, category: 'affirmation', subType: 'power', confidence: 90 },
  { pattern: /mirror\s+work\s+affirmations?/i, category: 'affirmation', subType: 'mirror_work', confidence: 95 },
  { pattern: /louise\s+hay(?:\s+style)?/i, category: 'affirmation', subType: 'mirror_work', confidence: 90 },
  { pattern: /sleep\s+affirmations?/i, category: 'affirmation', subType: 'sleep', confidence: 95 },
  { pattern: /subliminal\s+affirmations?/i, category: 'affirmation', subType: 'sleep', confidence: 90 },
  { pattern: /guided\s+affirmations?/i, category: 'affirmation', subType: 'guided', confidence: 95 },
  { pattern: /(?:create|make|generate)\s+affirmations?\s+(?:for|about|to)/i, category: 'affirmation', subType: 'power', confidence: 85 },
  { pattern: /affirmations?\s+for\s+(?:confidence|self[-\s]?esteem|abundance|wealth|money|success)/i, category: 'affirmation', subType: 'power', confidence: 85 },

  // ========== GUIDED JOURNEYS ==========
  { pattern: /past\s+life\s+(?:regression|journey|exploration)/i, category: 'guided_journey', subType: 'past_life', confidence: 95 },
  { pattern: /(?:meet|connect\s+with)\s+(?:my\s+)?(?:spirit\s+)?guide/i, category: 'guided_journey', subType: 'spirit_guide', confidence: 95 },
  { pattern: /higher\s+self\s+(?:journey|connection|meditation)/i, category: 'guided_journey', subType: 'spirit_guide', confidence: 90 },
  { pattern: /shamanic\s+(?:journey|meditation)/i, category: 'guided_journey', subType: 'shamanic', confidence: 95 },
  { pattern: /(?:power\s+)?animal\s+(?:journey|retrieval)/i, category: 'guided_journey', subType: 'shamanic', confidence: 90 },
  { pattern: /astral\s+(?:projection|travel|journey)/i, category: 'guided_journey', subType: 'astral', confidence: 95 },
  { pattern: /out\s+of\s+body\s+(?:experience|journey)/i, category: 'guided_journey', subType: 'astral', confidence: 95 },
  { pattern: /akashic\s+(?:records?|journey)/i, category: 'guided_journey', subType: 'akashic', confidence: 95 },
  { pattern: /quantum\s+(?:field|journey|meditation)/i, category: 'guided_journey', subType: 'quantum_field', confidence: 90 },
  { pattern: /inner\s+journey/i, category: 'guided_journey', subType: 'inner_journey', confidence: 85 },
  { pattern: /soul\s+retrieval/i, category: 'guided_journey', subType: 'shamanic', confidence: 90 },

  // ========== MEDITATIONS ==========
  { pattern: /breathwork\s+(?:meditation|session)/i, category: 'meditation', subType: 'breathwork', confidence: 95 },
  { pattern: /body\s+scan\s+(?:meditation)?/i, category: 'meditation', subType: 'body_scan', confidence: 95 },
  { pattern: /loving[-\s]?kindness\s+(?:meditation)?/i, category: 'meditation', subType: 'loving_kindness', confidence: 95 },
  { pattern: /metta\s+(?:meditation)?/i, category: 'meditation', subType: 'loving_kindness', confidence: 95 },
  { pattern: /sleep\s+(?:meditation|story)/i, category: 'meditation', subType: 'sleep_story', confidence: 90 },
  { pattern: /guided\s+visualization/i, category: 'meditation', subType: 'guided_visualization', confidence: 95 },
  { pattern: /shadow\s+work\s+(?:meditation)?/i, category: 'meditation', subType: 'shadow_work', confidence: 95 },
  { pattern: /inner\s+child\s+(?:healing|meditation)/i, category: 'meditation', subType: 'shadow_work', confidence: 90 },
  { pattern: /gratitude\s+(?:meditation|practice)/i, category: 'meditation', subType: 'gratitude', confidence: 95 },
  { pattern: /manifestation\s+(?:meditation)?/i, category: 'meditation', subType: 'manifestation', confidence: 90 },
  { pattern: /walking\s+meditation/i, category: 'meditation', subType: 'walking_meditation', confidence: 95 },
  { pattern: /self[-\s]?inquiry\s+(?:meditation)?/i, category: 'meditation', subType: 'inquiry', confidence: 90 },
  { pattern: /presence\s+(?:meditation|practice)/i, category: 'meditation', subType: 'presence', confidence: 85 },
  { pattern: /mindfulness\s+(?:meditation)?/i, category: 'meditation', subType: 'presence', confidence: 85 },
];

/**
 * Keyword clusters for semantic pattern detection
 * Each cluster contributes weighted points to category scoring
 */
interface KeywordCluster {
  category: ContentCategory;
  subType: string;
  keywords: string[];
  weight: number;
  contextBoost?: string[]; // Additional words that boost confidence
}

const KEYWORD_CLUSTERS: KeywordCluster[] = [
  // ========== STORY KEYWORDS ==========
  {
    category: 'story',
    subType: 'toddler',
    keywords: ['toddler', 'baby', '2 year', '3 year', '4 year', 'little one', 'bunny', 'teddy'],
    weight: 15,
    contextBoost: ['bedtime', 'sleep', 'read'],
  },
  {
    category: 'story',
    subType: 'young_child',
    keywords: ['kid', 'child', 'son', 'daughter', '5 year', '6 year', '7 year', '8 year', 'adventure', 'dragon', 'fairy'],
    weight: 15,
    contextBoost: ['bedtime', 'story', 'read', 'magical'],
  },

  // ========== HYPNOSIS KEYWORDS ==========
  {
    category: 'self_hypnosis',
    subType: 'standard',
    keywords: ['hypnosis', 'hypnotic', 'trance', 'subconscious', 'reprogram', 'induction', 'deepen'],
    weight: 20,
    contextBoost: ['suggestions', 'emergence', 'deeper'],
  },
  {
    category: 'self_hypnosis',
    subType: 'therapeutic',
    keywords: ['therapeutic', 'deep trance', 'profound', 'intensive', 'transformation'],
    weight: 15,
    contextBoost: ['healing', 'trauma', 'release'],
  },

  // ========== AFFIRMATION KEYWORDS ==========
  {
    category: 'affirmation',
    subType: 'power',
    keywords: ['i am', 'affirmation', 'confident', 'powerful', 'worthy', 'abundance'],
    weight: 15,
    contextBoost: ['manifest', 'believe', 'deserve'],
  },
  {
    category: 'affirmation',
    subType: 'mirror_work',
    keywords: ['mirror', 'you are', 'self-love', 'louise hay'],
    weight: 15,
    contextBoost: ['reflection', 'looking at yourself'],
  },
  {
    category: 'affirmation',
    subType: 'sleep',
    keywords: ['sleep affirmation', 'subliminal', 'overnight', 'as i sleep'],
    weight: 15,
    contextBoost: ['drift', 'peaceful', 'subconscious'],
  },

  // ========== JOURNEY KEYWORDS ==========
  {
    category: 'guided_journey',
    subType: 'past_life',
    keywords: ['past life', 'previous life', 'regression', 'incarnation', 'karma'],
    weight: 20,
    contextBoost: ['memory', 'lifetime', 'before this life'],
  },
  {
    category: 'guided_journey',
    subType: 'spirit_guide',
    keywords: ['spirit guide', 'higher self', 'guardian', 'angel', 'guide'],
    weight: 20,
    contextBoost: ['meet', 'connect', 'communicate', 'message'],
  },
  {
    category: 'guided_journey',
    subType: 'shamanic',
    keywords: ['shamanic', 'power animal', 'spirit animal', 'lower world', 'upper world', 'drumming'],
    weight: 20,
    contextBoost: ['journey', 'retrieve', 'wisdom'],
  },
  {
    category: 'guided_journey',
    subType: 'astral',
    keywords: ['astral', 'out of body', 'obe', 'projection', 'etheric', 'floating'],
    weight: 20,
    contextBoost: ['leave body', 'travel', 'plane'],
  },
  {
    category: 'guided_journey',
    subType: 'akashic',
    keywords: ['akashic', 'records', 'hall of records', 'soul history', 'cosmic library'],
    weight: 20,
    contextBoost: ['access', 'read', 'information'],
  },
  {
    category: 'guided_journey',
    subType: 'quantum_field',
    keywords: ['quantum', 'unified field', 'infinite possibility', 'collapse', 'wave'],
    weight: 15,
    contextBoost: ['consciousness', 'reality', 'create'],
  },
  {
    category: 'guided_journey',
    subType: 'inner_journey',
    keywords: ['inner world', 'inner landscape', 'sanctuary', 'inner temple'],
    weight: 15,
    contextBoost: ['explore', 'discover', 'within'],
  },

  // ========== MEDITATION KEYWORDS (general) ==========
  {
    category: 'meditation',
    subType: 'breathwork',
    keywords: ['breath', 'breathing', 'inhale', 'exhale', 'pranayama'],
    weight: 15,
    contextBoost: ['relax', 'calm', 'regulate'],
  },
  {
    category: 'meditation',
    subType: 'body_scan',
    keywords: ['body scan', 'progressive relaxation', 'body awareness', 'tension release'],
    weight: 15,
    contextBoost: ['relax', 'muscles', 'scan'],
  },
  {
    category: 'meditation',
    subType: 'sleep_story',
    keywords: ['sleep', 'insomnia', 'can\'t sleep', 'restless', 'drift off'],
    weight: 15,
    contextBoost: ['bed', 'night', 'rest'],
  },
];

/**
 * Ambiguous phrases that trigger disambiguation
 * These could map to multiple content types
 */
const AMBIGUOUS_PHRASES: Array<{
  pattern: RegExp;
  possibleCategories: Array<{ category: ContentCategory; subType: string }>;
  question: string;
}> = [
  {
    pattern: /help\s+(?:me\s+)?sleep/i,
    possibleCategories: [
      { category: 'meditation', subType: 'sleep_story' },
      { category: 'story', subType: 'young_child' },
      { category: 'affirmation', subType: 'sleep' },
      { category: 'self_hypnosis', subType: 'light' },
    ],
    question: 'I can help you sleep in several ways. Would you prefer: (1) A calming sleep meditation, (2) A bedtime story for your child, (3) Gentle sleep affirmations, or (4) Sleep hypnosis?',
  },
  {
    pattern: /(?:reprogram|change)\s+(?:my\s+)?beliefs?/i,
    possibleCategories: [
      { category: 'affirmation', subType: 'power' },
      { category: 'self_hypnosis', subType: 'standard' },
    ],
    question: 'For belief work, I can offer: (1) Power affirmations to reinforce new beliefs, or (2) Self-hypnosis to reprogram at the subconscious level. Which feels right for you?',
  },
  {
    pattern: /(?:story|tale)\s+(?:about|for)/i,
    possibleCategories: [
      { category: 'story', subType: 'young_child' },
      { category: 'meditation', subType: 'sleep_story' },
      { category: 'guided_journey', subType: 'inner_journey' },
    ],
    question: 'Would you like: (1) A children\'s bedtime story for a parent to read aloud, (2) A sleep story for yourself, or (3) A guided inner journey?',
  },
  {
    pattern: /spiritual\s+(?:journey|exploration|experience)/i,
    possibleCategories: [
      { category: 'guided_journey', subType: 'inner_journey' },
      { category: 'meditation', subType: 'guided_visualization' },
    ],
    question: 'For your spiritual exploration, would you prefer: (1) A deep guided journey (past life, spirit guides, etc.), or (2) A spiritual meditation for inner peace?',
  },
];

// ============================================================================
// CONTEXT EXTRACTION
// ============================================================================

interface ExtractedContext {
  duration?: number;
  ageGroup?: StoryAgeGroup;
  depth?: HypnosisDepth;
  goal?: string;
  emotionalState?: string;
}

/**
 * Extract contextual information from user input
 */
function extractContext(input: string): ExtractedContext {
  const context: ExtractedContext = {};
  const lowered = input.toLowerCase();

  // Duration extraction
  const durationPatterns = [
    /(\d+)\s*(?:minute|min)/i,
    /(\d+)\s*(?:hour|hr)/i,
    /(?:short|quick)\s+(?:\d+)?/i,
    /(?:long|extended)\s+(?:\d+)?/i,
  ];

  for (const pattern of durationPatterns) {
    const match = input.match(pattern);
    if (match) {
      if (match[1]) {
        context.duration = parseInt(match[1]);
        // Convert hours to minutes
        if (/hour|hr/i.test(match[0])) {
          context.duration *= 60;
        }
      } else if (/short|quick/i.test(match[0])) {
        context.duration = 5;
      } else if (/long|extended/i.test(match[0])) {
        context.duration = 30;
      }
      break;
    }
  }

  // Age group extraction for stories
  const ageMatch = input.match(/(\d+)[-\s]?(?:year[-\s]?old|yo)/i);
  if (ageMatch) {
    const age = parseInt(ageMatch[1]);
    if (age >= 2 && age <= 4) {
      context.ageGroup = 'toddler';
    } else if (age >= 5 && age <= 8) {
      context.ageGroup = 'young_child';
    } else if (age < 2) {
      context.ageGroup = 'toddler'; // Default very young to toddler
    } else {
      context.ageGroup = 'young_child'; // Default older to young_child
    }
  } else if (/toddler|baby/i.test(lowered)) {
    context.ageGroup = 'toddler';
  } else if (/kid|child/i.test(lowered)) {
    context.ageGroup = 'young_child';
  }

  // Hypnosis depth extraction
  if (/deep\s+(?:trance|hypnosis)|therapeutic|intensive/i.test(lowered)) {
    context.depth = 'therapeutic';
  } else if (/light|gentle|relaxation|beginner/i.test(lowered)) {
    context.depth = 'light';
  } else if (/hypnosis|hypno/i.test(lowered)) {
    context.depth = 'standard'; // Default
  }

  // Goal extraction - look for "for X" or "about X" patterns
  const goalPatterns = [
    /(?:for|about|to help with|to overcome|to improve|to increase)\s+(.+?)(?:\.|,|$)/i,
    /(?:i\s+(?:want|need)\s+(?:to|help\s+with))\s+(.+?)(?:\.|,|$)/i,
  ];

  for (const pattern of goalPatterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      context.goal = match[1].trim().slice(0, 100); // Limit length
      break;
    }
  }

  return context;
}

// ============================================================================
// MAIN DETECTION CLASS
// ============================================================================

export class ContentDetector {
  /**
   * Main detection method - analyzes user input and returns detection result
   */
  detect(input: string): ContentDetectionResult {
    const lowered = input.toLowerCase().trim();

    // Layer 1: Check for explicit patterns (highest confidence)
    const explicitResult = this.checkExplicitPatterns(lowered);
    if (explicitResult && explicitResult.confidence >= 85) {
      return this.enrichResult(explicitResult, input);
    }

    // Layer 2: Check for ambiguous phrases that need disambiguation
    const ambiguousResult = this.checkAmbiguousPatterns(lowered);
    if (ambiguousResult) {
      return ambiguousResult;
    }

    // Layer 3: Semantic pattern detection with keyword scoring
    const semanticResult = this.semanticDetection(lowered);

    // Layer 4: Extract context and enrich result
    const enrichedResult = this.enrichResult(semanticResult, input);

    // Layer 5: Determine if disambiguation is needed
    if (enrichedResult.confidence < 60 && !enrichedResult.needsDisambiguation) {
      enrichedResult.needsDisambiguation = true;
      enrichedResult.disambiguationQuestion = this.generateDisambiguationQuestion(enrichedResult);
    }

    return enrichedResult;
  }

  /**
   * Check explicit regex patterns
   */
  private checkExplicitPatterns(input: string): ContentDetectionResult | null {
    for (const pattern of EXPLICIT_PATTERNS) {
      if (pattern.pattern.test(input)) {
        return {
          category: pattern.category,
          subType: pattern.subType,
          confidence: pattern.confidence,
          audience: pattern.audience || 'adult',
          depth: pattern.depth,
          ageGroup: pattern.ageGroup,
          needsDisambiguation: false,
        };
      }
    }
    return null;
  }

  /**
   * Check for ambiguous patterns that need clarification
   */
  private checkAmbiguousPatterns(input: string): ContentDetectionResult | null {
    for (const ambiguous of AMBIGUOUS_PHRASES) {
      if (ambiguous.pattern.test(input)) {
        const first = ambiguous.possibleCategories[0];
        return {
          category: first.category,
          subType: first.subType,
          confidence: 50,
          audience: 'adult',
          needsDisambiguation: true,
          disambiguationQuestion: ambiguous.question,
          alternativeInterpretations: ambiguous.possibleCategories.map((pc, i) => ({
            category: pc.category,
            subType: pc.subType,
            confidence: 50 - i * 5,
          })),
        };
      }
    }
    return null;
  }

  /**
   * Semantic detection using keyword cluster scoring
   */
  private semanticDetection(input: string): ContentDetectionResult {
    const scores: Map<string, { score: number; category: ContentCategory; subType: string }> = new Map();

    // Score each keyword cluster
    for (const cluster of KEYWORD_CLUSTERS) {
      let clusterScore = 0;

      // Check primary keywords
      for (const keyword of cluster.keywords) {
        if (input.includes(keyword.toLowerCase())) {
          clusterScore += cluster.weight;
        }
      }

      // Check context boost keywords
      if (cluster.contextBoost) {
        for (const boostWord of cluster.contextBoost) {
          if (input.includes(boostWord.toLowerCase())) {
            clusterScore += 5;
          }
        }
      }

      if (clusterScore > 0) {
        const key = `${cluster.category}:${cluster.subType}`;
        const existing = scores.get(key);
        if (!existing || clusterScore > existing.score) {
          scores.set(key, {
            score: clusterScore,
            category: cluster.category,
            subType: cluster.subType,
          });
        }
      }
    }

    // Find highest scoring match
    let bestMatch: { score: number; category: ContentCategory; subType: string } | null = null;
    let alternatives: Array<{ category: ContentCategory; subType: string; confidence: number }> = [];

    for (const [_, match] of scores) {
      if (!bestMatch || match.score > bestMatch.score) {
        if (bestMatch) {
          alternatives.push({
            category: bestMatch.category,
            subType: bestMatch.subType,
            confidence: Math.min(bestMatch.score * 2, 75),
          });
        }
        bestMatch = match;
      } else {
        alternatives.push({
          category: match.category,
          subType: match.subType,
          confidence: Math.min(match.score * 2, 75),
        });
      }
    }

    // Default to meditation if nothing matched
    if (!bestMatch) {
      return {
        category: 'meditation',
        subType: 'guided_visualization',
        confidence: 30, // Low confidence - will trigger disambiguation
        audience: 'adult',
        needsDisambiguation: true,
        disambiguationQuestion: 'I\'d love to help you. What kind of experience are you looking for? A meditation, affirmations, self-hypnosis, a guided journey, or perhaps a children\'s bedtime story?',
      };
    }

    // Convert score to confidence (cap at 80 for semantic detection)
    const confidence = Math.min(bestMatch.score * 2, 80);

    return {
      category: bestMatch.category,
      subType: bestMatch.subType,
      confidence,
      audience: 'adult',
      needsDisambiguation: confidence < 60,
      alternativeInterpretations: alternatives.slice(0, 3),
    };
  }

  /**
   * Enrich detection result with extracted context
   */
  private enrichResult(result: ContentDetectionResult, input: string): ContentDetectionResult {
    const context = extractContext(input);

    // Apply extracted context
    if (context.duration) {
      result.durationMinutes = context.duration;
    }
    if (context.ageGroup && result.category === 'story') {
      result.ageGroup = context.ageGroup;
      result.subType = context.ageGroup;
      result.audience = 'parent_to_child';
    }
    if (context.depth && result.category === 'self_hypnosis') {
      result.depth = context.depth;
      result.subType = context.depth;
    }
    if (context.goal) {
      result.extractedGoal = context.goal;
    }

    // Map meditation sub-types to MeditationType
    if (result.category === 'meditation') {
      const meditationType = MEDITATION_TYPES.find(m => m.id === result.subType);
      if (meditationType) {
        result.meditationType = meditationType.id;
      }
    }

    return result;
  }

  /**
   * Generate a disambiguation question based on detection result
   */
  private generateDisambiguationQuestion(result: ContentDetectionResult): string {
    if (result.alternativeInterpretations && result.alternativeInterpretations.length > 0) {
      const options = [
        { category: result.category, subType: result.subType },
        ...result.alternativeInterpretations.slice(0, 2),
      ];

      const optionTexts = options.map((opt, i) => {
        const catInfo = CONTENT_CATEGORIES.find(c => c.id === opt.category);
        return `(${i + 1}) ${catInfo?.name || opt.category}`;
      }).join(', ');

      return `I want to make sure I create exactly what you need. Are you looking for: ${optionTexts}?`;
    }

    return 'I\'d love to help you. Could you tell me more about what kind of experience you\'re looking for?';
  }

  /**
   * Handle disambiguation response - user selected an option
   */
  handleDisambiguationResponse(
    response: string,
    previousResult: ContentDetectionResult
  ): ContentDetectionResult {
    const lowered = response.toLowerCase().trim();

    // Check for numeric selection (1, 2, 3, etc.)
    const numMatch = lowered.match(/^(\d)$/);
    if (numMatch && previousResult.alternativeInterpretations) {
      const index = parseInt(numMatch[1]) - 1;
      const allOptions = [
        { category: previousResult.category, subType: previousResult.subType },
        ...previousResult.alternativeInterpretations,
      ];

      if (index >= 0 && index < allOptions.length) {
        const selected = allOptions[index];
        return {
          ...previousResult,
          category: selected.category,
          subType: selected.subType,
          confidence: 95,
          needsDisambiguation: false,
          disambiguationQuestion: undefined,
        };
      }
    }

    // Check for category name mentions
    for (const cat of CONTENT_CATEGORIES) {
      if (lowered.includes(cat.name.toLowerCase()) || lowered.includes(cat.id)) {
        return {
          ...previousResult,
          category: cat.id,
          subType: cat.subTypes[0],
          confidence: 90,
          needsDisambiguation: false,
          disambiguationQuestion: undefined,
        };
      }
    }

    // If we can't parse the response, re-detect
    return this.detect(response);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const contentDetector = new ContentDetector();
