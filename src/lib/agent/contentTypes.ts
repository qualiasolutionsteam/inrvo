/**
 * INrVO Intelligent Content Type System
 *
 * Comprehensive type definitions for 5 content categories:
 * - Meditations (existing, refined)
 * - Affirmations (4 styles)
 * - Self-Hypnosis (3 depths)
 * - Guided Journeys (spiritual/esoteric)
 * - Children's Stories (2 age groups)
 */

import type { MeditationType } from './knowledgeBase';

// ============================================================================
// PRIMARY CONTENT CATEGORIES
// ============================================================================

export type ContentCategory =
  | 'meditation'
  | 'affirmation'
  | 'self_hypnosis'
  | 'guided_journey'
  | 'story';

// ============================================================================
// SUB-TYPES FOR EACH CATEGORY
// ============================================================================

/**
 * Affirmation styles with distinct structures and pacing
 */
export type AffirmationSubType =
  | 'power'        // High-energy "I AM" bursts, faster pacing (1.5 words/sec)
  | 'guided'       // Narrative-led affirmations with explanation
  | 'sleep'        // Fading energy, subliminal style, slower (1 word/sec)
  | 'mirror_work'; // Second-person "You are...", Louise Hay style

/**
 * Self-hypnosis depth levels
 * Each level has different induction techniques and session structure
 */
export type HypnosisDepth =
  | 'light'       // Relaxation focus, 5-10 min, minimal induction
  | 'standard'    // Full induction/deepening/suggestions, 15-25 min
  | 'therapeutic'; // Deep trance work, longer sessions, 25-45 min

/**
 * Guided journey sub-types for spiritual/esoteric content
 * No limits on esoteric precision - user can go as deep as desired
 */
export type JourneySubType =
  | 'inner_journey'   // Inner landscape exploration
  | 'past_life'       // Past life regression (Brian Weiss style)
  | 'spirit_guide'    // Meeting guides, higher self, entities
  | 'shamanic'        // Shamanic journeying (Sandra Ingerman style)
  | 'astral'          // Astral projection, out-of-body experiences
  | 'akashic'         // Akashic records access
  | 'quantum_field';  // Quantum consciousness exploration

/**
 * Children's story age groups
 * Each has distinct vocabulary, complexity, and themes
 */
export type StoryAgeGroup =
  | 'toddler'      // 2-4 years: simple vocabulary, repetition, animal characters
  | 'young_child'; // 5-8 years: adventure/magic, clear moral, richer narrative

/**
 * Audience types for content targeting
 */
export type ContentAudience =
  | 'adult'           // Standard adult content
  | 'parent_to_child' // Third-person narrative for parents to read aloud
  | 'toddler'         // Direct child-appropriate (rare)
  | 'young_child';    // Direct child-appropriate (rare)

// ============================================================================
// CONTENT CATEGORY METADATA
// ============================================================================

export interface ContentCategoryInfo {
  id: ContentCategory;
  name: string;
  description: string;
  icon: string;
  defaultDuration: { min: number; recommended: number; max: number };
  wordsPerSecond: number;
  requiresSafetyFraming: boolean;
  subTypes: string[];
}

export const CONTENT_CATEGORIES: ContentCategoryInfo[] = [
  {
    id: 'meditation',
    name: 'Meditation',
    description: 'Guided mindfulness and relaxation practices for inner peace and personal growth.',
    icon: '🧘',
    defaultDuration: { min: 5, recommended: 15, max: 45 },
    wordsPerSecond: 2,
    requiresSafetyFraming: false,
    subTypes: [
      'guided_visualization', 'breathwork', 'body_scan', 'loving_kindness',
      'sleep_story', 'walking_meditation', 'shadow_work', 'gratitude',
      'manifestation', 'presence', 'inquiry', 'surrender'
    ],
  },
  {
    id: 'affirmation',
    name: 'Affirmations',
    description: 'Positive statements to reprogram beliefs and align with your highest potential.',
    icon: '💫',
    defaultDuration: { min: 3, recommended: 10, max: 20 },
    wordsPerSecond: 1.5, // Faster for power affirmations, adjusted per sub-type
    requiresSafetyFraming: false,
    subTypes: ['power', 'guided', 'sleep', 'mirror_work'],
  },
  {
    id: 'self_hypnosis',
    name: 'Self-Hypnosis',
    description: 'Structured hypnotic sessions for deep subconscious reprogramming.',
    icon: '🌀',
    defaultDuration: { min: 10, recommended: 20, max: 45 },
    wordsPerSecond: 1.5,
    requiresSafetyFraming: true, // Always requires safety disclaimers
    subTypes: ['light', 'standard', 'therapeutic'],
  },
  {
    id: 'guided_journey',
    name: 'Guided Journey',
    description: 'Deep spiritual explorations and esoteric experiences without limits.',
    icon: '✨',
    defaultDuration: { min: 15, recommended: 30, max: 60 },
    wordsPerSecond: 1.8,
    requiresSafetyFraming: false,
    subTypes: ['inner_journey', 'past_life', 'spirit_guide', 'shamanic', 'astral', 'akashic', 'quantum_field'],
  },
  {
    id: 'story',
    name: "Children's Story",
    description: 'Age-appropriate bedtime stories for parents to read aloud to their children.',
    icon: '📖',
    defaultDuration: { min: 3, recommended: 8, max: 15 },
    wordsPerSecond: 1.2, // Parent reading pace
    requiresSafetyFraming: false,
    subTypes: ['toddler', 'young_child'],
  },
];

// ============================================================================
// AFFIRMATION SUB-TYPE DETAILS
// ============================================================================

export interface AffirmationTypeInfo {
  id: AffirmationSubType;
  name: string;
  description: string;
  structure: string;
  wordsPerSecond: number;
  statementCount: { min: number; max: number };
  format: 'first_person' | 'second_person';
  energy: 'high' | 'medium' | 'fading';
  relatedTeachers: string[];
}

export const AFFIRMATION_SUBTYPES: AffirmationTypeInfo[] = [
  {
    id: 'power',
    name: 'Power Affirmations',
    description: 'High-energy "I AM" statements delivered with confidence and conviction.',
    structure: 'Short, punchy statements with brief pauses. Building intensity.',
    wordsPerSecond: 1.5,
    statementCount: { min: 15, max: 40 },
    format: 'first_person',
    energy: 'high',
    relatedTeachers: ['Bob Proctor', 'Wayne Dyer', 'Joe Dispenza'],
  },
  {
    id: 'guided',
    name: 'Guided Affirmations',
    description: 'Narrative-led affirmations with explanation and emotional context.',
    structure: 'Affirmation → Brief explanation → Feeling anchor → Next affirmation',
    wordsPerSecond: 2,
    statementCount: { min: 8, max: 20 },
    format: 'first_person',
    energy: 'medium',
    relatedTeachers: ['Deepak Chopra', 'Wayne Dyer', 'Marianne Williamson'],
  },
  {
    id: 'sleep',
    name: 'Sleep Affirmations',
    description: 'Gentle, fading affirmations designed to sink into the subconscious during sleep onset.',
    structure: 'Statements become progressively softer and slower, with longer pauses.',
    wordsPerSecond: 1,
    statementCount: { min: 20, max: 60 },
    format: 'first_person',
    energy: 'fading',
    relatedTeachers: ['Joe Dispenza', 'Bruce Lipton'],
  },
  {
    id: 'mirror_work',
    name: 'Mirror Work',
    description: 'Second-person affirmations in the style of Louise Hay, as if speaking to yourself in a mirror.',
    structure: '"You are..." statements with deep self-love focus.',
    wordsPerSecond: 1.5,
    statementCount: { min: 10, max: 25 },
    format: 'second_person',
    energy: 'medium',
    relatedTeachers: ['Louise Hay', 'Marianne Williamson'],
  },
];

// ============================================================================
// HYPNOSIS DEPTH DETAILS
// ============================================================================

export interface HypnosisDepthInfo {
  id: HypnosisDepth;
  name: string;
  description: string;
  phases: string[];
  inductionStyle: string;
  duration: { min: number; recommended: number; max: number };
  relatedTeachers: string[];
}

export const HYPNOSIS_DEPTHS: HypnosisDepthInfo[] = [
  {
    id: 'light',
    name: 'Light Relaxation Hypnosis',
    description: 'Gentle relaxation with light suggestion work. Perfect for beginners.',
    phases: ['Brief relaxation', 'Light suggestions', 'Gentle return'],
    inductionStyle: 'Progressive relaxation, counting down from 10',
    duration: { min: 5, recommended: 10, max: 15 },
    relatedTeachers: ['Milton Erickson'],
  },
  {
    id: 'standard',
    name: 'Standard Hypnosis',
    description: 'Full hypnotic session with proper induction, deepening, and emergence.',
    phases: ['Induction', 'Deepening', 'Suggestions', 'Post-hypnotic anchoring', 'Emergence'],
    inductionStyle: 'Eye fixation or progressive relaxation, staircase deepening',
    duration: { min: 15, recommended: 25, max: 35 },
    relatedTeachers: ['Milton Erickson', 'Dave Elman'],
  },
  {
    id: 'therapeutic',
    name: 'Therapeutic Deep Trance',
    description: 'Extended session for deep subconscious work and significant change.',
    phases: ['Extended induction', 'Deep deepening', 'Therapeutic suggestions', 'Inner work', 'Integration', 'Careful emergence'],
    inductionStyle: 'Elman-style rapid induction or Ericksonian metaphor',
    duration: { min: 25, recommended: 40, max: 60 },
    relatedTeachers: ['Milton Erickson', 'Dave Elman', 'Richard Bandler'],
  },
];

// ============================================================================
// GUIDED JOURNEY SUB-TYPE DETAILS
// ============================================================================

export interface JourneyTypeInfo {
  id: JourneySubType;
  name: string;
  description: string;
  keyElements: string[];
  technicalDepth: 'accessible' | 'intermediate' | 'advanced' | 'expert';
  tradition?: string;
  relatedTeachers: string[];
}

export const JOURNEY_SUBTYPES: JourneyTypeInfo[] = [
  {
    id: 'inner_journey',
    name: 'Inner Landscape Journey',
    description: 'Exploration of your inner world, meeting aspects of self, finding inner resources.',
    keyElements: ['Inner sanctuary', 'Symbolic landscape', 'Meeting inner self', 'Receiving insight'],
    technicalDepth: 'accessible',
    relatedTeachers: ['Carl Jung', 'Richard Schwartz', 'Joe Dispenza'],
  },
  {
    id: 'past_life',
    name: 'Past Life Regression',
    description: 'Journey to past life memories for healing and understanding current patterns.',
    keyElements: ['Corridor of time', 'Life selection', 'Key scenes', 'Death and between-lives', 'Integration'],
    technicalDepth: 'intermediate',
    tradition: 'Regression therapy',
    relatedTeachers: ['Brian Weiss', 'Michael Newton', 'Dolores Cannon'],
  },
  {
    id: 'spirit_guide',
    name: 'Spirit Guide Connection',
    description: 'Meeting and communicating with spirit guides, higher self, or benevolent entities.',
    keyElements: ['Sacred space creation', 'Guide invitation', 'Communication', 'Gift/message', 'Ongoing connection'],
    technicalDepth: 'intermediate',
    relatedTeachers: ['Sonia Choquette', 'Robert Moss', 'Doreen Virtue'],
  },
  {
    id: 'shamanic',
    name: 'Shamanic Journey',
    description: 'Traditional shamanic journeying to lower, middle, or upper worlds.',
    keyElements: ['Power animal retrieval', 'World axis travel', 'Spirit encounters', 'Soul retrieval elements'],
    technicalDepth: 'advanced',
    tradition: 'Core shamanism',
    relatedTeachers: ['Sandra Ingerman', 'Michael Harner', 'Alberto Villoldo'],
  },
  {
    id: 'astral',
    name: 'Astral Projection',
    description: 'Guided out-of-body experience for exploration of astral planes.',
    keyElements: ['Vibration state', 'Separation techniques', 'Astral navigation', 'Return protocols'],
    technicalDepth: 'expert',
    tradition: 'Western esotericism',
    relatedTeachers: ['Robert Monroe', 'William Buhlman', 'Robert Bruce'],
  },
  {
    id: 'akashic',
    name: 'Akashic Records Access',
    description: 'Journey to the hall of records for soul history and universal knowledge.',
    keyElements: ['Portal opening', 'Library visualization', 'Record retrieval', 'Integration'],
    technicalDepth: 'advanced',
    tradition: 'Theosophy / New Age',
    relatedTeachers: ['Edgar Cayce', 'Linda Howe', 'Ernesto Ortiz'],
  },
  {
    id: 'quantum_field',
    name: 'Quantum Field Exploration',
    description: 'Journey into the unified field of infinite possibility and quantum consciousness.',
    keyElements: ['Heart coherence', 'Field access', 'Possibility wave collapse', 'Reality selection'],
    technicalDepth: 'advanced',
    tradition: 'Modern consciousness science',
    relatedTeachers: ['Joe Dispenza', 'Gregg Braden', 'Lynne McTaggart'],
  },
];

// ============================================================================
// CHILDREN'S STORY AGE GROUP DETAILS
// ============================================================================

export interface StoryAgeGroupInfo {
  id: StoryAgeGroup;
  name: string;
  ageRange: string;
  description: string;
  vocabulary: {
    level: 'simple' | 'moderate';
    maxSyllables: number;
    avoidWords: string[];
  };
  structure: {
    wordCount: { min: number; max: number };
    sentenceLength: { avg: number; max: number };
    paragraphs: { min: number; max: number };
  };
  themes: string[];
  characters: string[];
  requirements: string[];
}

export const STORY_AGE_GROUPS: StoryAgeGroupInfo[] = [
  {
    id: 'toddler',
    name: 'Toddler Story',
    ageRange: '2-4 years',
    description: 'Simple, soothing stories with repetition and familiar characters.',
    vocabulary: {
      level: 'simple',
      maxSyllables: 2,
      avoidWords: ['scary', 'monster', 'dark', 'alone', 'lost', 'afraid'],
    },
    structure: {
      wordCount: { min: 150, max: 300 },
      sentenceLength: { avg: 6, max: 10 },
      paragraphs: { min: 3, max: 6 },
    },
    themes: [
      'bedtime routines', 'cozy feelings', 'friendship', 'family love',
      'nature walks', 'animal friends', 'gentle adventures', 'dreams',
    ],
    characters: [
      'bunny', 'bear', 'owl', 'mouse', 'kitten', 'puppy', 'duckling',
      'squirrel', 'butterfly', 'stars', 'moon',
    ],
    requirements: [
      'Repetitive phrases for comfort',
      'Predictable, gentle plot',
      'Always ends with cozy sleep',
      'No conflict or scary elements',
      'Third-person for parent to read aloud',
    ],
  },
  {
    id: 'young_child',
    name: 'Young Child Story',
    ageRange: '5-8 years',
    description: 'Richer narratives with adventure, magic, and gentle life lessons.',
    vocabulary: {
      level: 'moderate',
      maxSyllables: 3,
      avoidWords: ['terrifying', 'death', 'blood', 'violent'],
    },
    structure: {
      wordCount: { min: 400, max: 900 },
      sentenceLength: { avg: 10, max: 18 },
      paragraphs: { min: 6, max: 12 },
    },
    themes: [
      'courage', 'kindness', 'curiosity', 'magic', 'adventure',
      'friendship', 'problem-solving', 'believing in yourself',
      'nature wonder', 'fantasy worlds', 'gentle quests',
    ],
    characters: [
      'brave children', 'wise animals', 'friendly dragons', 'helpful fairies',
      'talking trees', 'star guardians', 'dream guides', 'magical creatures',
    ],
    requirements: [
      'Clear beginning, middle, end',
      'Simple conflict that resolves positively',
      'Gentle moral or lesson (not preachy)',
      'Imaginative but not frightening',
      'Always ends with safety and rest',
      'Third-person for parent to read aloud',
    ],
  },
];

// ============================================================================
// HYPNOSIS SAFETY FRAMING
// ============================================================================

export const HYPNOSIS_SAFETY_FRAMING = {
  openingDisclaimer: `Before we begin, please ensure you are in a safe, comfortable place where you will not be disturbed. Never listen to hypnosis while driving or operating machinery. If you have a history of psychosis, severe mental health conditions, or are unsure if hypnosis is appropriate for you, please consult with a healthcare professional first.`,

  consentStatement: `Throughout this session, you remain in complete control. You can open your eyes and return to full alertness at any time simply by choosing to do so. Hypnosis is a natural state that you enter multiple times daily - like when you're absorbed in a book or daydreaming. You will only accept suggestions that are beneficial and aligned with your highest good.`,

  emergencyExit: `Remember: At any moment, if you need to return to full alertness, simply take three deep breaths, open your eyes, and say "I am fully awake and alert." You are always in control.`,

  emergenceProtocol: `In a moment, I'm going to count from 1 to 5. With each number, you'll become more alert and aware. At the count of 5, your eyes will open, and you'll feel completely awake, refreshed, and wonderful.

1... Beginning to return now, feeling energy flowing back into your body.
2... More aware now, becoming alert and present.
3... Feeling your body, feeling the surface beneath you, energy increasing.
4... Almost there now, eyes ready to open, mind clear and focused.
5... Eyes open, fully awake, fully alert, feeling absolutely wonderful.

Take a moment to stretch and reorient yourself to your surroundings.`,
};

// ============================================================================
// CONTENT DETECTION RESULT
// ============================================================================

export interface ContentDetectionResult {
  category: ContentCategory;
  subType: string;
  meditationType?: MeditationType; // For meditation category, maps to existing types
  confidence: number; // 0-100
  audience: ContentAudience;
  depth?: HypnosisDepth;
  ageGroup?: StoryAgeGroup;
  durationMinutes?: number;
  extractedGoal?: string;
  needsDisambiguation: boolean;
  disambiguationQuestion?: string;
  alternativeInterpretations?: Array<{
    category: ContentCategory;
    subType: string;
    confidence: number;
  }>;
}

// ============================================================================
// GENERATION PARAMETERS
// ============================================================================

export interface ContentGenerationParams {
  category: ContentCategory;
  subType: string;
  meditationType?: MeditationType;
  hypnosisDepth?: HypnosisDepth;
  targetAgeGroup?: StoryAgeGroup;
  durationMinutes: number;
  goal: string;
  emotionalState?: string;
  teacherPreference?: string;
  customInstructions?: string;
  audioTags?: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get content category info by ID
 */
export function getContentCategory(id: ContentCategory): ContentCategoryInfo | undefined {
  return CONTENT_CATEGORIES.find(c => c.id === id);
}

/**
 * Get affirmation sub-type info
 */
export function getAffirmationSubType(id: AffirmationSubType): AffirmationTypeInfo | undefined {
  return AFFIRMATION_SUBTYPES.find(a => a.id === id);
}

/**
 * Get hypnosis depth info
 */
export function getHypnosisDepth(id: HypnosisDepth): HypnosisDepthInfo | undefined {
  return HYPNOSIS_DEPTHS.find(h => h.id === id);
}

/**
 * Get journey sub-type info
 */
export function getJourneySubType(id: JourneySubType): JourneyTypeInfo | undefined {
  return JOURNEY_SUBTYPES.find(j => j.id === id);
}

/**
 * Get story age group info
 */
export function getStoryAgeGroup(id: StoryAgeGroup): StoryAgeGroupInfo | undefined {
  return STORY_AGE_GROUPS.find(s => s.id === id);
}

/**
 * Calculate word count for a given duration and content category
 */
export function calculateWordCount(
  category: ContentCategory,
  subType: string,
  durationMinutes: number
): number {
  let wordsPerSecond: number;

  // Get category-specific words per second
  const categoryInfo = getContentCategory(category);
  if (!categoryInfo) {
    wordsPerSecond = 2; // Default fallback
  } else {
    wordsPerSecond = categoryInfo.wordsPerSecond;
  }

  // Adjust for sub-type specifics
  if (category === 'affirmation') {
    const affirmationType = getAffirmationSubType(subType as AffirmationSubType);
    if (affirmationType) {
      wordsPerSecond = affirmationType.wordsPerSecond;
    }
  }

  return Math.round(durationMinutes * 60 * wordsPerSecond);
}

/**
 * Check if content category requires safety framing
 */
export function requiresSafetyFraming(category: ContentCategory): boolean {
  const categoryInfo = getContentCategory(category);
  return categoryInfo?.requiresSafetyFraming ?? false;
}

/**
 * Get appropriate temperature setting for Gemini based on content category
 */
export function getTemperatureForCategory(category: ContentCategory): number {
  switch (category) {
    case 'meditation':
      return 0.7; // Balanced creativity
    case 'affirmation':
      return 0.6; // More focused
    case 'self_hypnosis':
      return 0.5; // Structured, consistent
    case 'guided_journey':
      return 0.8; // High creativity for spiritual content
    case 'story':
      return 0.65; // Consistent storytelling
    default:
      return 0.7;
  }
}
