/**
 * Content Type Templates for Edge Functions
 *
 * Shared prompt templates for generating different content categories.
 * This is a Deno-compatible version of the frontend promptTemplates.
 */

// ============================================================================
// CONTENT TYPES
// ============================================================================

export type ContentCategory =
  | 'meditation'
  | 'affirmation'
  | 'self_hypnosis'
  | 'guided_journey'
  | 'story';

export type AffirmationSubType = 'power' | 'guided' | 'sleep' | 'mirror_work';
export type HypnosisDepth = 'light' | 'standard' | 'therapeutic';
export type JourneySubType = 'inner_journey' | 'past_life' | 'spirit_guide' | 'shamanic' | 'astral' | 'akashic' | 'quantum_field';
export type StoryAgeGroup = 'toddler' | 'young_child';

export interface ContentGenerationParams {
  category: ContentCategory;
  subType: string;
  hypnosisDepth?: HypnosisDepth;
  targetAgeGroup?: StoryAgeGroup;
  durationMinutes: number;
  goal: string;
  emotionalState?: string;
  audioTags?: string[];
}

// ============================================================================
// SAFETY FRAMING
// ============================================================================

const HYPNOSIS_SAFETY = {
  disclaimer: `Before we begin, please ensure you are in a safe, comfortable place where you will not be disturbed. Never listen to hypnosis while driving or operating machinery. If you have a history of psychosis, severe mental health conditions, or are unsure if hypnosis is appropriate for you, please consult with a healthcare professional first.`,
  consent: `Throughout this session, you remain in complete control. You can open your eyes and return to full alertness at any time simply by choosing to do so.`,
  emergence: `In a moment, I'm going to count from 1 to 5. With each number, you'll become more alert and aware. At the count of 5, your eyes will open, and you'll feel completely awake, refreshed, and wonderful.

1... Beginning to return now, feeling energy flowing back into your body.
2... More aware now, becoming alert and present.
3... Feeling your body, feeling the surface beneath you, energy increasing.
4... Almost there now, eyes ready to open, mind clear and focused.
5... Eyes open, fully awake, fully alert, feeling absolutely wonderful.`,
};

// ============================================================================
// WORD COUNT CALCULATIONS
// ============================================================================

interface WordConfig {
  wordRange: string;
  targetWords: number;
  structure: string;
}

function calculateMeditationWords(minutes: number): WordConfig {
  const clamped = Math.max(1, Math.min(45, minutes));
  const target = Math.round(clamped * 60 * 2);
  const min = Math.round(target * 0.9);
  const max = Math.round(target * 1.1);

  return {
    wordRange: `${min}-${max}`,
    targetWords: target,
    structure: `STRUCTURE (${min}-${max} words for ${clamped} minute meditation):
1. OPENING (${Math.round(target * 0.10)} words): Acknowledge emotional state
2. GROUNDING (${Math.round(target * 0.15)} words): Breath awareness
3. CORE (${Math.round(target * 0.50)} words): Main visualization
4. INTEGRATION (${Math.round(target * 0.15)} words): Connect to situation
5. CLOSING (${Math.round(target * 0.10)} words): Gentle return`,
  };
}

function calculateAffirmationWords(minutes: number, subType: string): WordConfig {
  const wordsPerSec = subType === 'sleep' ? 1 : subType === 'power' ? 1.5 : 2;
  const clamped = Math.max(3, Math.min(20, minutes));
  const target = Math.round(clamped * 60 * wordsPerSec);
  const min = Math.round(target * 0.9);
  const max = Math.round(target * 1.1);

  return {
    wordRange: `${min}-${max}`,
    targetWords: target,
    structure: `TARGET: ${min}-${max} words for ${clamped} minutes`,
  };
}

function calculateStoryWords(minutes: number, ageGroup: string): WordConfig {
  const limits = ageGroup === 'toddler' ? { min: 150, max: 300 } : { min: 400, max: 900 };
  const durationBased = Math.round(minutes * 60 * 1.2);
  const target = Math.min(limits.max, Math.max(limits.min, durationBased));
  const min = Math.max(limits.min, Math.round(target * 0.9));
  const max = Math.min(limits.max, Math.round(target * 1.1));

  return {
    wordRange: `${min}-${max}`,
    targetWords: target,
    structure: `TARGET: ${min}-${max} words`,
  };
}

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

function buildMeditationPrompt(params: ContentGenerationParams): string {
  const { durationMinutes, goal, audioTags = [] } = params;
  const { structure } = calculateMeditationWords(durationMinutes);
  const audioLine = audioTags.length > 0 ? `AUDIO CUES: ${audioTags.join(', ')}` : '';

  return `Create a PERSONALIZED meditation for this person's exact situation.

REQUEST: "${goal}"
${audioLine}
TARGET DURATION: ${durationMinutes} minutes

${structure}

REQUIREMENTS:
- Reference their specific situation in first 50 words
- CRITICAL: Write ENTIRELY in FIRST PERSON ("I feel", "I breathe", "I notice", "I am"). NEVER use "you" or "your". The listener speaks AS themselves.
- Rich sensory details, present tense
- Include: [pause], [long pause], [deep breath], [exhale slowly]
- Fresh language (avoid "journey", "sacred")
- Match tone to need

VOICE DELIVERY (TTS emotional markers):
- Use (relaxed) at the beginning to set calm tone
- Use (soft tone) for gentle, soothing instructions
- Use (whispering) for deepest relaxation moments
- Use (empathetic) when acknowledging feelings

OUTPUT: Only the meditation script. No titles or explanations. Start immediately.`;
}

function buildAffirmationPrompt(params: ContentGenerationParams): string {
  const { subType, durationMinutes, goal, audioTags = [] } = params;
  const { structure } = calculateAffirmationWords(durationMinutes, subType);
  const audioLine = audioTags.length > 0 ? `AUDIO CUES: ${audioTags.join(', ')}` : '';

  switch (subType) {
    case 'power':
      return `Create POWER AFFIRMATIONS for: "${goal}"

${structure}
${audioLine}

STYLE: High-energy "I AM" statements
FORMAT: CRITICAL - Write ENTIRELY in FIRST PERSON. Every statement starts with "I am", "I have", "I create", "I choose". NEVER use "you" or "your".

REQUIREMENTS:
- Short, punchy statements (5-10 words each)
- Present tense, absolute certainty
- Include [pause] between statements, [deep breath] at transitions
- Building energy and conviction
- End with 3 climactic declarations

VOICE DELIVERY: Use (confident) for empowering statements, (determined) for commitment declarations.

OUTPUT: Only the affirmation script. No titles or explanations.`;

    case 'sleep':
      return `Create SLEEP AFFIRMATIONS for: "${goal}"

${structure}
${audioLine}

STYLE: Fading, hypnotic affirmations for sleep onset
FORMAT: CRITICAL - Write ENTIRELY in FIRST PERSON ("I drift", "I release", "I am safe"). NEVER use "you" or "your". Soft, dreamy tone.

REQUIREMENTS:
- Progressive slowing of pace throughout
- Increasing [long pause] frequency
- Repetition for hypnotic effect
- Use ellipses... for trailing off...
- Final statements barely above whisper
- Sleep-inducing language: "drifting", "floating", "peaceful"

CRITICAL: Energy MUST fade throughout. Do NOT energize at the end.

VOICE DELIVERY: Use (sleepy), (soft tone), (whispering) progressively throughout.

OUTPUT: Only the affirmation script. No titles or explanations.`;

    case 'mirror_work':
      return `Create MIRROR WORK AFFIRMATIONS (Louise Hay style) for: "${goal}"

${structure}
${audioLine}

STYLE: Second-person "You are..." statements
FORMAT: SECOND PERSON - "You are", "You deserve", "You choose"

REQUIREMENTS:
- Loving, nurturing tone
- "You are worthy of love" style statements
- [pause] after each statement
- Address inner child where appropriate
- End with profound self-acceptance

OUTPUT: Only the affirmation script. No titles or explanations.`;

    default: // guided
      return `Create GUIDED AFFIRMATIONS for: "${goal}"

${structure}
${audioLine}

STYLE: Narrative-led affirmations with context
FORMAT: CRITICAL - Write ENTIRELY in FIRST PERSON ("I feel", "I know", "I embrace"). NEVER use "you" or "your".

STRUCTURE:
- Affirmation → Brief expansion → Feeling anchor → Next

REQUIREMENTS:
- Warm, supportive narrative voice
- Connect affirmations to feelings
- Include [pause], [long pause], [deep breath]
- Present tense, embodied language

OUTPUT: Only the affirmation script. No titles or explanations.`;
  }
}

function buildHypnosisPrompt(params: ContentGenerationParams): string {
  const { hypnosisDepth = 'standard', durationMinutes, goal, audioTags = [] } = params;
  const audioLine = audioTags.length > 0 ? `AUDIO CUES: ${audioTags.join(', ')}` : '';

  const phases: Record<HypnosisDepth, string[]> = {
    light: ['Brief relaxation', 'Light suggestions', 'Gentle return'],
    standard: ['Induction', 'Deepening', 'Suggestions', 'Post-hypnotic anchoring', 'Emergence'],
    therapeutic: ['Extended induction', 'Deep deepening', 'Therapeutic suggestions', 'Inner work', 'Integration', 'Careful emergence'],
  };

  const depthPhases = phases[hypnosisDepth] || phases.standard;
  const targetWords = Math.round(durationMinutes * 60 * 1.5);

  return `Create a SELF-HYPNOSIS SESSION for: "${goal}"

DEPTH LEVEL: ${hypnosisDepth.toUpperCase()}
TARGET DURATION: ${durationMinutes} minutes
${audioLine}

TARGET: ${Math.round(targetWords * 0.9)}-${Math.round(targetWords * 1.1)} words

PHASE STRUCTURE:
${depthPhases.map((p, i) => `${i + 1}. ${p.toUpperCase()}`).join('\n')}

=== REQUIRED SAFETY ELEMENTS ===

OPENING DISCLAIMER (include at beginning):
"${HYPNOSIS_SAFETY.disclaimer}"

CONSENT STATEMENT (include after disclaimer):
"${HYPNOSIS_SAFETY.consent}"

EMERGENCE PROTOCOL (REQUIRED at end):
"${HYPNOSIS_SAFETY.emergence}"

=== STYLE REQUIREMENTS ===

- Soothing, rhythmic pacing
- Permissive language: "you may", "allow yourself"
- Include embedded commands
- [pause], [long pause], [deep breath] throughout
- First person for listener's experience

VOICE DELIVERY: Use (hypnotic), (soft tone), (relaxed), (whispering) for deepening.

CRITICAL:
- MUST include all safety elements
- MUST end with proper emergence protocol
- NEVER leave listener in trance

OUTPUT: Complete hypnosis script only. No titles or headers.`;
}

function buildJourneyPrompt(params: ContentGenerationParams): string {
  const { subType, durationMinutes, goal, audioTags = [] } = params;
  const audioLine = audioTags.length > 0 ? `AUDIO CUES: ${audioTags.join(', ')}` : '';
  const targetWords = Math.round(durationMinutes * 60 * 1.8);

  const structures: Record<string, string> = {
    past_life: `1. RELAXATION & PREPARATION
2. CORRIDOR OF TIME: Visualize hallway with doors to past lives
3. LIFE SELECTION: Choose a door, enter the memory
4. KEY SCENES: Explore 2-3 significant moments
5. DEATH TRANSITION: Gently experience passing (peaceful)
6. BETWEEN-LIVES: Soul perspective, lessons learned
7. INTEGRATION: Bring wisdom forward
8. RETURN: Gentle return, grounding`,
    spirit_guide: `1. SACRED SPACE CREATION
2. RAISING VIBRATION: Heart opening
3. INVITATION: Invite guide with intention
4. RECOGNITION: Sensing the presence
5. COMMUNICATION: Exchange of message or gift
6. DEEPENING CONNECTION: Establish ongoing relationship
7. GRATITUDE & FAREWELL
8. GROUNDED RETURN`,
    shamanic: `1. PREPARATION: Set sacred space
2. DRUMMING/RHYTHM: Establish journey rhythm
3. ENTRY POINT: Find entrance (tree, cave, water)
4. WORLD AXIS: Travel to other world
5. ENCOUNTERS: Meet power animals or spirits
6. RETRIEVAL/HEALING: Receive what is needed
7. RETURN JOURNEY: Same path back
8. INTEGRATION: Ground the experience`,
    astral: `1. DEEP RELAXATION
2. VIBRATION STATE: Energy building, tingling
3. SEPARATION: Lifting out techniques
4. NEAR-BODY EXPLORATION
5. ASTRAL NAVIGATION
6. EXPLORATION
7. RETURN: Re-entering body
8. GROUNDING: Full body awareness`,
  };

  const structure = structures[subType] || structures.spirit_guide;

  return `Create a ${subType.replace(/_/g, ' ').toUpperCase()} JOURNEY for: "${goal}"

TARGET DURATION: ${durationMinutes} minutes
TARGET: ${Math.round(targetWords * 0.9)}-${Math.round(targetWords * 1.1)} words
${audioLine}

STRUCTURE:
${structure}

STYLE:
- Rich, multi-sensory descriptions
- Present tense, immersive narrative
- Technical terminology appropriate to tradition
- [pause], [long pause], [deep breath] at transitions
- NO LIMITS on esoteric or spiritual content

VOICE DELIVERY: Use (mystical), (soft tone), (whispering), (awe) for visionary moments.

CRITICAL:
- Ground experience at the end
- Return fully to present awareness
- Include integration
- First person format

OUTPUT: Complete journey script only. No titles or explanations.`;
}

function buildStoryPrompt(params: ContentGenerationParams): string {
  const { targetAgeGroup = 'young_child', durationMinutes, goal } = params;
  const { targetWords } = calculateStoryWords(durationMinutes, targetAgeGroup);

  if (targetAgeGroup === 'toddler') {
    return `Create a TODDLER BEDTIME STORY (ages 2-4)

THEME: "${goal}"

TARGET: ${targetWords} words maximum

FORMAT: THIRD PERSON for a PARENT to read aloud

VOCABULARY:
- Maximum 2 syllables per word
- Simple, familiar words only
- AVOID: scary, monster, dark, alone, lost, afraid

STRUCTURE:
- Average 6 words per sentence (max 10)
- Short paragraphs (2-3 sentences)
- Repetitive phrases for comfort
- ALWAYS end with character falling asleep

ELEMENTS:
- Gentle animals (bunny, bear, owl, kitten)
- Cozy feelings, family love
- NO conflict, NO scary elements

OUTPUT: Story only. No title. Start directly.`;
  }

  return `Create a CHILDREN'S BEDTIME STORY (ages 5-8)

THEME: "${goal}"

TARGET: ${targetWords} words

FORMAT: THIRD PERSON for a PARENT to read aloud

VOCABULARY:
- Maximum 3 syllables for most words
- AVOID: terrifying, death, blood, violent

STRUCTURE:
- Average 10 words per sentence (max 18)
- Paragraphs 3-5 sentences
- Beginning → Adventure → Challenge → Resolution → Sleep

ELEMENTS:
- Child protagonist or magical helpers
- Gentle adventure, wonder
- Small challenge resolved positively
- Subtle positive message (not preachy)
- Always end peacefully and safely

OUTPUT: Story only. No title. Start directly.`;
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export interface PromptResult {
  prompt: string;
  temperature: number;
  maxTokens: number;
}

export function buildContentPrompt(params: ContentGenerationParams): PromptResult {
  let prompt: string;
  let temperature: number;

  switch (params.category) {
    case 'meditation':
      prompt = buildMeditationPrompt(params);
      temperature = 0.7;
      break;
    case 'affirmation':
      prompt = buildAffirmationPrompt(params);
      temperature = 0.6;
      break;
    case 'self_hypnosis':
      prompt = buildHypnosisPrompt(params);
      temperature = 0.5;
      break;
    case 'guided_journey':
      prompt = buildJourneyPrompt(params);
      temperature = 0.8;
      break;
    case 'story':
      prompt = buildStoryPrompt(params);
      temperature = 0.65;
      break;
    default:
      prompt = buildMeditationPrompt(params);
      temperature = 0.7;
  }

  // Calculate max tokens based on expected words
  const wordsPerSec: Record<ContentCategory, number> = {
    meditation: 2,
    affirmation: 1.5,
    self_hypnosis: 1.5,
    guided_journey: 1.8,
    story: 1.2,
  };

  const expectedWords = Math.round(params.durationMinutes * 60 * (wordsPerSec[params.category] || 2));
  const maxTokens = Math.max(1200, Math.round(expectedWords * 1.5 * 1.2));

  return { prompt, temperature, maxTokens };
}
