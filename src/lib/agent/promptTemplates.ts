/**
 * INrVO Prompt Templates
 *
 * Category-specific generation prompts for the Gemini API.
 * Each content type has distinct structure, pacing, and requirements.
 */

import type {
  ContentCategory,
  AffirmationSubType,
  HypnosisDepth,
  JourneySubType,
  StoryAgeGroup,
  ContentGenerationParams,
} from './contentTypes';
import {
  HYPNOSIS_SAFETY_FRAMING,
  STORY_AGE_GROUPS,
  AFFIRMATION_SUBTYPES,
  HYPNOSIS_DEPTHS,
  JOURNEY_SUBTYPES,
  getAffirmationSubType,
  getHypnosisDepth,
  getJourneySubType,
  getStoryAgeGroup,
  calculateWordCount,
  getTemperatureForCategory,
} from './contentTypes';

// ============================================================================
// WORD COUNT CALCULATIONS
// ============================================================================

interface WordCountConfig {
  wordRange: string;
  structure: string;
  targetWords: number;
}

function calculateMeditationWordCount(durationMinutes: number): WordCountConfig {
  const clampedMinutes = Math.max(1, Math.min(45, durationMinutes));
  const targetWords = Math.round(clampedMinutes * 60 * 2); // 2 words/sec
  const minWords = Math.round(targetWords * 0.9);
  const maxWords = Math.round(targetWords * 1.1);

  const opening = Math.round(targetWords * 0.10);
  const grounding = Math.round(targetWords * 0.15);
  const core = Math.round(targetWords * 0.50);
  const integration = Math.round(targetWords * 0.15);
  const closing = Math.round(targetWords * 0.10);

  return {
    wordRange: `${minWords}-${maxWords}`,
    targetWords,
    structure: `STRUCTURE (${minWords}-${maxWords} words for ${clampedMinutes} minute meditation):
1. OPENING (${opening} words): Acknowledge their emotional state. Make them feel seen.
2. GROUNDING (${grounding} words): Breath awareness, settling
3. CORE (${core} words): Main visualization matching their needs
4. INTEGRATION (${integration} words): Connect to their situation
5. CLOSING (${closing} words): Gentle return with calm/confidence`,
  };
}

function calculateAffirmationWordCount(
  durationMinutes: number,
  subType: AffirmationSubType
): WordCountConfig {
  const typeInfo = getAffirmationSubType(subType);
  const wordsPerSec = typeInfo?.wordsPerSecond || 1.5;
  const clampedMinutes = Math.max(3, Math.min(20, durationMinutes));
  const targetWords = Math.round(clampedMinutes * 60 * wordsPerSec);
  const minWords = Math.round(targetWords * 0.9);
  const maxWords = Math.round(targetWords * 1.1);

  const statementCount = typeInfo?.statementCount || { min: 15, max: 40 };
  const adjustedStatements = Math.round((statementCount.min + statementCount.max) / 2 * (durationMinutes / 10));

  return {
    wordRange: `${minWords}-${maxWords}`,
    targetWords,
    structure: `TARGET: ${minWords}-${maxWords} words (~${adjustedStatements} statements for ${clampedMinutes} minutes)`,
  };
}

function calculateHypnosisWordCount(durationMinutes: number, depth: HypnosisDepth): WordCountConfig {
  const depthInfo = getHypnosisDepth(depth);
  const clampedMinutes = Math.max(
    depthInfo?.duration.min || 5,
    Math.min(depthInfo?.duration.max || 45, durationMinutes)
  );
  const targetWords = Math.round(clampedMinutes * 60 * 1.5); // 1.5 words/sec for hypnosis
  const minWords = Math.round(targetWords * 0.9);
  const maxWords = Math.round(targetWords * 1.1);

  const phases = depthInfo?.phases || ['Induction', 'Deepening', 'Suggestions', 'Emergence'];
  const phaseWords = Math.round(targetWords / phases.length);

  return {
    wordRange: `${minWords}-${maxWords}`,
    targetWords,
    structure: `STRUCTURE (${minWords}-${maxWords} words for ${clampedMinutes} minute ${depth} hypnosis):
${phases.map((phase, i) => `${i + 1}. ${phase.toUpperCase()} (~${phaseWords} words)`).join('\n')}`,
  };
}

function calculateJourneyWordCount(durationMinutes: number): WordCountConfig {
  const clampedMinutes = Math.max(15, Math.min(60, durationMinutes));
  const targetWords = Math.round(clampedMinutes * 60 * 1.8); // 1.8 words/sec for journeys
  const minWords = Math.round(targetWords * 0.9);
  const maxWords = Math.round(targetWords * 1.1);

  return {
    wordRange: `${minWords}-${maxWords}`,
    targetWords,
    structure: `TARGET: ${minWords}-${maxWords} words for ${clampedMinutes} minute journey`,
  };
}

function calculateStoryWordCount(durationMinutes: number, ageGroup: StoryAgeGroup): WordCountConfig {
  const ageInfo = getStoryAgeGroup(ageGroup);
  const wordLimits = ageInfo?.structure.wordCount || { min: 200, max: 600 };

  // Calculate based on duration at ~1.2 words/sec reading pace
  const durationBasedWords = Math.round(durationMinutes * 60 * 1.2);
  const targetWords = Math.min(wordLimits.max, Math.max(wordLimits.min, durationBasedWords));
  const minWords = Math.max(wordLimits.min, Math.round(targetWords * 0.9));
  const maxWords = Math.min(wordLimits.max, Math.round(targetWords * 1.1));

  return {
    wordRange: `${minWords}-${maxWords}`,
    targetWords,
    structure: `TARGET: ${minWords}-${maxWords} words (age-appropriate for ${ageInfo?.ageRange || '2-8 years'})`,
  };
}

// ============================================================================
// MEDITATION PROMPT
// ============================================================================

export function buildMeditationPrompt(params: ContentGenerationParams): string {
  const { durationMinutes, goal, audioTags = [], emotionalState, teacherPreference } = params;
  const { structure } = calculateMeditationWordCount(durationMinutes);

  const audioTagsLine = audioTags.length > 0
    ? `AUDIO CUES: ${audioTags.join(', ')} (weave naturally into script)`
    : '';

  const teacherLine = teacherPreference
    ? `INSPIRATION: Draw from the wisdom tradition of ${teacherPreference}`
    : '';

  return `Create a PERSONALIZED meditation for this person's exact situation.

REQUEST: "${goal}"
${audioTagsLine}
${teacherLine}
TARGET DURATION: ${durationMinutes} minutes

ANALYZE (internal):
- Situation: What specific challenge? (interview, can't sleep, etc.)
- Emotion: ${emotionalState || 'Determine from context'}
- Setting: Requested place? (beach, forest, space)
- Goal: Calm, sleep, confidence, clarity?

${structure}

REQUIREMENTS:
- Reference their specific situation in first 50 words
- Use FIRST PERSON "I" throughout (e.g., "I feel calm", "I breathe deeply", "I am safe")
- This is a self-affirmation meditation the listener speaks to themselves
- Rich sensory details (5 senses), present tense
- Include: [pause], [long pause], [deep breath], [exhale slowly]
- Natural ellipses for pacing...
- Fresh language (avoid "journey", "sacred")
- Match tone to need (drowsy for sleep, energizing for confidence)
- CRITICAL: The meditation MUST be ${durationMinutes} minutes long when read at meditation pace

OUTPUT: Only the meditation script. No titles, headers, or explanations. Start immediately.`;
}

// ============================================================================
// AFFIRMATION PROMPTS
// ============================================================================

export function buildAffirmationPrompt(params: ContentGenerationParams): string {
  const subType = params.subType as AffirmationSubType;
  const { durationMinutes, goal, audioTags = [] } = params;
  const { structure } = calculateAffirmationWordCount(durationMinutes, subType);
  const typeInfo = getAffirmationSubType(subType);

  const audioTagsLine = audioTags.length > 0
    ? `AUDIO CUES: ${audioTags.join(', ')} (weave naturally)`
    : '';

  // Different prompts for each affirmation style
  switch (subType) {
    case 'power':
      return `Create POWER AFFIRMATIONS for: "${goal}"

${structure}
${audioTagsLine}

STYLE: High-energy "I AM" statements
FORMAT: FIRST PERSON - Every statement starts with "I am", "I have", "I create", "I choose"

STRUCTURE:
1. Opening burst (3-5 strong declarations)
2. Theme blocks grouped by aspect (confidence, abundance, health, etc.)
3. Building intensity throughout
4. Powerful closing declarations

REQUIREMENTS:
- Short, punchy statements (5-10 words each)
- Present tense, absolute certainty
- NO qualifiers (no "trying to", "learning to")
- Include [pause] between statements, [deep breath] at transitions
- Building energy and conviction
- End with 3 climactic declarations

AVOID: Passive voice, future tense, hedging, long sentences

OUTPUT: Only the affirmation script. No titles or explanations.`;

    case 'guided':
      return `Create GUIDED AFFIRMATIONS for: "${goal}"

${structure}
${audioTagsLine}

STYLE: Narrative-led affirmations with context and feeling anchors
FORMAT: FIRST PERSON throughout

STRUCTURE:
1. Gentle opening that acknowledges the goal
2. Each affirmation followed by brief expansion:
   - Statement: "I am confident and capable."
   - Expansion: "Feel this truth resonating in your body..."
   - Anchor: [deep breath]
3. Emotional deepening as session progresses
4. Integration and closing

REQUIREMENTS:
- Warm, supportive narrative voice between affirmations
- Connect affirmations to feelings and sensations
- Include [pause], [long pause], [deep breath] for reflection
- Build emotional connection to each statement
- Present tense, embodied language

OUTPUT: Only the affirmation script. No titles or explanations.`;

    case 'sleep':
      return `Create SLEEP AFFIRMATIONS for: "${goal}"

${structure}
${audioTagsLine}

STYLE: Fading, hypnotic affirmations designed for sleep onset
FORMAT: FIRST PERSON - soft, dreamy tone

STRUCTURE:
1. Opening: Soft acknowledgment, permission to rest
2. Early phase: Normal pacing, settling statements
3. Middle phase: Slower pacing, longer pauses, repetition
4. Late phase: Very slow, whisper-soft, fading energy
5. Final phase: Minimal words, maximum silence between

REQUIREMENTS:
- Progressive slowing of pace throughout
- Increasing [long pause] frequency
- Repetition of key phrases for hypnotic effect
- Use ellipses... for dreamy trailing off...
- Final statements barely above a whisper (indicate with ...)
- End in comfortable silence
- Sleep-inducing language: "drifting", "floating", "peaceful", "safe"

CRITICAL: Energy MUST fade throughout. Do NOT energize at the end.

OUTPUT: Only the affirmation script. No titles or explanations.`;

    case 'mirror_work':
      return `Create MIRROR WORK AFFIRMATIONS in Louise Hay style for: "${goal}"

${structure}
${audioTagsLine}

STYLE: Second-person "You are..." statements as if speaking to yourself in a mirror
FORMAT: SECOND PERSON throughout - "You are", "You deserve", "You choose"

STRUCTURE:
1. Opening: Acknowledgment of looking at yourself with love
2. Self-love foundation statements
3. Specific goal-related affirmations
4. Healing and forgiveness statements
5. Closing with deep self-acceptance

REQUIREMENTS:
- Loving, nurturing tone throughout
- "You are worthy of love" style statements
- Include moments for the listener to repeat silently
- [pause] after each statement for integration
- Address the inner child where appropriate
- Emphasize worthiness, deserving, enough-ness
- End with profound self-acceptance

INSPIRED BY: Louise Hay's mirror work technique

OUTPUT: Only the affirmation script. No titles or explanations.`;

    default:
      return buildAffirmationPrompt({ ...params, subType: 'power' });
  }
}

// ============================================================================
// SELF-HYPNOSIS PROMPTS
// ============================================================================

export function buildHypnosisPrompt(params: ContentGenerationParams): string {
  const depth = (params.hypnosisDepth || params.subType) as HypnosisDepth;
  const { durationMinutes, goal, audioTags = [] } = params;
  const { structure } = calculateHypnosisWordCount(durationMinutes, depth);
  const depthInfo = getHypnosisDepth(depth);

  const audioTagsLine = audioTags.length > 0
    ? `AUDIO CUES: ${audioTags.join(', ')} (weave naturally)`
    : '';

  // Build phase-specific instructions
  const phaseInstructions = depthInfo?.phases.map((phase, i) => {
    switch (phase.toLowerCase()) {
      case 'brief relaxation':
        return `${i + 1}. BRIEF RELAXATION: Progressive relaxation of body, counting down from 10`;
      case 'light suggestions':
        return `${i + 1}. LIGHT SUGGESTIONS: Gentle, positive suggestions for ${goal}`;
      case 'gentle return':
        return `${i + 1}. GENTLE RETURN: Counting 1-5, feeling refreshed and alert`;
      case 'induction':
        return `${i + 1}. INDUCTION: Eye fixation or progressive relaxation, moving into trance`;
      case 'deepening':
        return `${i + 1}. DEEPENING: Staircase or elevator metaphor, going deeper with each step`;
      case 'extended induction':
        return `${i + 1}. EXTENDED INDUCTION: Thorough, methodical relaxation and focus`;
      case 'deep deepening':
        return `${i + 1}. DEEP DEEPENING: Multiple deepening techniques layered`;
      case 'suggestions':
        return `${i + 1}. SUGGESTIONS: Direct and indirect suggestions for ${goal}`;
      case 'therapeutic suggestions':
        return `${i + 1}. THERAPEUTIC SUGGESTIONS: Multi-layered suggestions addressing root causes`;
      case 'inner work':
        return `${i + 1}. INNER WORK: Visualization or dialogue with subconscious`;
      case 'post-hypnotic anchoring':
        return `${i + 1}. POST-HYPNOTIC ANCHORING: Set triggers for continued benefit`;
      case 'integration':
        return `${i + 1}. INTEGRATION: Allow subconscious to process and integrate`;
      case 'emergence':
        return `${i + 1}. EMERGENCE: Count 1-5 to full alertness (REQUIRED)`;
      case 'careful emergence':
        return `${i + 1}. CAREFUL EMERGENCE: Gradual, thorough return to full awareness`;
      default:
        return `${i + 1}. ${phase.toUpperCase()}`;
    }
  }).join('\n') || '';

  return `Create a SELF-HYPNOSIS SESSION for: "${goal}"

DEPTH LEVEL: ${depth.toUpperCase()} (${depthInfo?.name || depth})
TARGET DURATION: ${durationMinutes} minutes
${audioTagsLine}

${structure}

PHASE STRUCTURE:
${phaseInstructions}

=== REQUIRED SAFETY ELEMENTS ===

OPENING DISCLAIMER (include at very beginning):
"${HYPNOSIS_SAFETY_FRAMING.openingDisclaimer}"

CONSENT STATEMENT (include after disclaimer):
"${HYPNOSIS_SAFETY_FRAMING.consentStatement}"

EMERGENCE PROTOCOL (REQUIRED at end):
"${HYPNOSIS_SAFETY_FRAMING.emergenceProtocol}"

=== STYLE REQUIREMENTS ===

LANGUAGE:
- Soothing, rhythmic, slightly hypnotic pacing
- Use permissive language: "you may", "perhaps", "allow yourself"
- Include embedded commands (italicized or emphasized)
- Repetition for deepening effect
- Present tense, positive framing

AUDIO CUES:
- [pause] for brief pauses
- [long pause] for integration moments
- [deep breath] at transitions
- ... for trailing, dreamy phrasing...

CRITICAL REQUIREMENTS:
- MUST include all safety elements
- MUST end with proper emergence protocol
- NEVER leave listener in trance
- User remains in control throughout
- Format: FIRST PERSON for the listener's internal experience

OUTPUT: Complete hypnosis script only. No titles, headers, or meta-commentary.`;
}

// ============================================================================
// GUIDED JOURNEY PROMPTS
// ============================================================================

export function buildJourneyPrompt(params: ContentGenerationParams): string {
  const subType = params.subType as JourneySubType;
  const { durationMinutes, goal, audioTags = [], customInstructions } = params;
  const { structure } = calculateJourneyWordCount(durationMinutes);
  const journeyInfo = getJourneySubType(subType);

  const audioTagsLine = audioTags.length > 0
    ? `AUDIO CUES: ${audioTags.join(', ')} (weave naturally)`
    : '';

  const customLine = customInstructions
    ? `SPECIFIC INSTRUCTIONS: ${customInstructions}`
    : '';

  // Build journey-specific elements
  const keyElements = journeyInfo?.keyElements.join(', ') || '';
  const tradition = journeyInfo?.tradition ? `TRADITION: ${journeyInfo.tradition}` : '';
  const technicalDepth = journeyInfo?.technicalDepth || 'intermediate';
  const teachers = journeyInfo?.relatedTeachers.join(', ') || '';

  // Journey-specific structure based on sub-type
  let journeyStructure = '';
  switch (subType) {
    case 'past_life':
      journeyStructure = `STRUCTURE:
1. RELAXATION & PREPARATION: Deep relaxation, protection visualization
2. CORRIDOR OF TIME: Visualize hallway/corridor with doors to past lives
3. LIFE SELECTION: Guide to choose a door, enter the memory
4. KEY SCENES: Explore 2-3 significant moments in that life
5. DEATH TRANSITION: Gently experience the passing (peaceful)
6. BETWEEN-LIVES: Brief moment of soul perspective, lessons learned
7. INTEGRATION: Bring wisdom forward, heal any connections
8. RETURN: Gentle return to present, grounding`;
      break;

    case 'spirit_guide':
      journeyStructure = `STRUCTURE:
1. SACRED SPACE CREATION: Establish protected, elevated space
2. RAISING VIBRATION: Heart opening, love expansion
3. INVITATION: Invite guide/higher self with clear intention
4. RECOGNITION: Describe sensing/seeing/feeling the presence
5. COMMUNICATION: Exchange of message, wisdom, or gift
6. DEEPENING CONNECTION: Establish ongoing relationship
7. GRATITUDE & FAREWELL: Thank the guide
8. GROUNDED RETURN: Return with connection intact`;
      break;

    case 'shamanic':
      journeyStructure = `STRUCTURE:
1. PREPARATION: Set sacred space, call in directions
2. DRUMMING/RHYTHM: Establish journey rhythm (describe)
3. ENTRY POINT: Find entrance to other world (tree, cave, water)
4. WORLD AXIS: Travel to lower, middle, or upper world
5. ENCOUNTERS: Meet power animals, spirits, or guides
6. RETRIEVAL/HEALING: Receive what is needed
7. RETURN JOURNEY: Same path back
8. INTEGRATION: Ground the experience`;
      break;

    case 'astral':
      journeyStructure = `STRUCTURE:
1. DEEP RELAXATION: Progressive relaxation to near-sleep
2. VIBRATION STATE: Describe energy building, tingling sensations
3. SEPARATION: Techniques for lifting out (rope, roll-out, lift)
4. NEAR-BODY EXPLORATION: Examine room, physical body
5. ASTRAL NAVIGATION: Travel intention-based
6. EXPLORATION: Experience astral environment
7. RETURN: Intention to return, re-entering body
8. GROUNDING: Full body awareness, physical sensation`;
      break;

    case 'akashic':
      journeyStructure = `STRUCTURE:
1. ELEVATION: Rise through dimensions
2. PORTAL: Find and enter the gateway to records
3. LIBRARY: Describe the hall of records environment
4. GUIDE: Meet the keeper/librarian
5. ACCESS: Request and receive specific record
6. READING: Experience the information
7. INTEGRATION: Understand the significance
8. RETURN: Close the record, thank keeper, return`;
      break;

    case 'quantum_field':
      journeyStructure = `STRUCTURE:
1. HEART COHERENCE: Establish heart-brain connection
2. FIELD ACCESS: Move beyond space-time
3. INFINITE POSSIBILITY: Experience the wave of all possibilities
4. INTENTION: Set clear intention for what to collapse
5. FEELING STATE: Embody the reality as already present
6. COLLAPSE: Witness the wave becoming particle/reality
7. GRATITUDE: Thanks for the manifestation
8. INTEGRATION: Bring the new frequency back`;
      break;

    default: // inner_journey
      journeyStructure = `STRUCTURE:
1. RELAXATION: Deep body relaxation
2. DESCENT: Journey inward (staircase, path, etc.)
3. INNER SANCTUARY: Arrive at personal sacred space
4. EXPLORATION: Discover aspects of inner landscape
5. ENCOUNTER: Meet aspect of self or inner guide
6. WISDOM: Receive insight or healing
7. INTEGRATION: Accept and integrate the experience
8. RETURN: Journey back, grounding`;
  }

  return `Create a ${journeyInfo?.name || 'GUIDED JOURNEY'} for: "${goal}"

JOURNEY TYPE: ${subType.replace(/_/g, ' ').toUpperCase()}
${tradition}
KEY ELEMENTS: ${keyElements}
TECHNICAL DEPTH: ${technicalDepth.toUpperCase()} - Be as precise and technical as this level requires
INSPIRED BY: ${teachers}
${audioTagsLine}
${customLine}

${structure}

${journeyStructure}

=== STYLE REQUIREMENTS ===

LANGUAGE:
- Rich, multi-sensory descriptions (all 5 senses)
- Present tense, immersive narrative
- Second person ("You find yourself...") OR first person ("I find myself...")
- Poetic but precise - no vagueness
- Technical terminology appropriate to the tradition

PACING:
- [pause] for scene transitions
- [long pause] for deep experiences
- [deep breath] at significant moments
- ... for dreamlike, expansive moments...

DEPTH REQUIREMENTS:
- NO LIMITS on esoteric or spiritual content
- Be as precise and technical as the tradition requires
- Include authentic elements of the practice
- Trust the user knows what they're seeking
- Professional quality matching the technical depth requested

CRITICAL:
- Ground the experience at the end
- Return fully to present awareness
- Include integration of the experience
- First person format for listener's experience

OUTPUT: Complete journey script only. No titles, headers, or explanations.`;
}

// ============================================================================
// CHILDREN'S STORY PROMPTS
// ============================================================================

export function buildStoryPrompt(params: ContentGenerationParams): string {
  const ageGroup = (params.targetAgeGroup || params.subType) as StoryAgeGroup;
  const { durationMinutes, goal, customInstructions } = params;
  const { structure, targetWords } = calculateStoryWordCount(durationMinutes, ageGroup);
  const ageInfo = getStoryAgeGroup(ageGroup);

  const customLine = customInstructions
    ? `SPECIFIC REQUEST: ${customInstructions}`
    : '';

  const themes = ageInfo?.themes.slice(0, 5).join(', ') || 'bedtime, friendship, adventure';
  const characters = ageInfo?.characters.slice(0, 5).join(', ') || 'bunny, bear, owl';
  const requirements = ageInfo?.requirements.join('\n- ') || '';
  const vocabLevel = ageInfo?.vocabulary.level || 'simple';
  const maxSyllables = ageInfo?.vocabulary.maxSyllables || 2;
  const avoidWords = ageInfo?.vocabulary.avoidWords.join(', ') || 'scary, monster, dark';
  const sentenceLength = ageInfo?.structure.sentenceLength || { avg: 8, max: 12 };

  if (ageGroup === 'toddler') {
    return `Create a TODDLER BEDTIME STORY (ages 2-4)

THEME/REQUEST: "${goal}"
${customLine}

${structure}

=== STORY REQUIREMENTS ===

FORMAT: THIRD PERSON narrative for a PARENT to read aloud to their child

VOCABULARY:
- Maximum ${maxSyllables} syllables per word
- Simple, familiar words only
- AVOID: ${avoidWords}

SENTENCE STRUCTURE:
- Average ${sentenceLength.avg} words per sentence
- Maximum ${sentenceLength.max} words per sentence
- Short paragraphs (2-3 sentences)

STORY ELEMENTS:
- CHARACTERS: Choose from gentle animals (${characters})
- THEMES: ${themes}
- Repetitive phrases for comfort (repeat key phrases 2-3 times)
- Soothing, rhythmic language
- Predictable, gentle plot
- NO conflict, NO scary elements
- ALWAYS ends with the character falling asleep/resting

STRUCTURE:
1. Introduce character in cozy setting
2. Simple, gentle activity or small adventure
3. Character gets sleepy
4. Cozy bedtime routine element
5. Peaceful sleep ending

PACING:
- Include natural pauses indicated by ...
- Slow, dreamy pacing
- End very softly and peacefully

CRITICAL:
- This is for a PARENT to read to a TODDLER
- MUST be soothing and sleep-inducing
- NEVER include anything scary or exciting
- Keep it SHORT (${targetWords} words maximum)
- End with sleep/rest

OUTPUT: Story only. No title, headers, or explanations. Start directly with the story.`;
  } else {
    // young_child (5-8)
    return `Create a CHILDREN'S BEDTIME STORY (ages 5-8)

THEME/REQUEST: "${goal}"
${customLine}

${structure}

=== STORY REQUIREMENTS ===

FORMAT: THIRD PERSON narrative for a PARENT to read aloud to their child

VOCABULARY:
- Maximum ${maxSyllables} syllables for most words
- Some more advanced words okay with context
- AVOID: ${avoidWords}

SENTENCE STRUCTURE:
- Average ${sentenceLength.avg} words per sentence
- Maximum ${sentenceLength.max} words per sentence
- Varied paragraph length (3-5 sentences)

STORY ELEMENTS:
- CHARACTERS: Child protagonist, magical helpers, or (${characters})
- THEMES: ${themes}
- Simple adventure or magical element
- Small challenge that resolves positively
- Gentle life lesson (not preachy)
- Imaginative, wonder-filled

STRUCTURE:
1. OPENING: Introduce character and setting (spark wonder)
2. CALL: Something interesting happens or is discovered
3. ADVENTURE: Brief journey or magical experience
4. GENTLE CHALLENGE: Small problem to overcome
5. RESOLUTION: Problem solved through kindness/courage/wisdom
6. WIND-DOWN: Adventure ends, heading home/to rest
7. COZY ENDING: Safe, warm, peaceful sleep

REQUIREMENTS:
- ${requirements}

PACING:
- Include ... for natural pauses
- Build wonder in the adventure section
- Slow down progressively toward ending
- Final paragraph should be very peaceful and sleep-inducing

CRITICAL:
- This is for a PARENT to read to a CHILD
- Adventure should be exciting but NOT scary
- Always end peacefully and safely
- Include a subtle positive message
- Word count: approximately ${targetWords} words

OUTPUT: Story only. No title, headers, or explanations. Start directly with the story.`;
  }
}

// ============================================================================
// MAIN PROMPT BUILDER
// ============================================================================

export interface PromptBuildResult {
  prompt: string;
  temperature: number;
  maxTokens: number;
}

/**
 * Build the appropriate prompt based on content category and parameters
 */
export function buildContentPrompt(params: ContentGenerationParams): PromptBuildResult {
  const { category, durationMinutes } = params;

  let prompt: string;
  const temperature = getTemperatureForCategory(category);

  switch (category) {
    case 'meditation':
      prompt = buildMeditationPrompt(params);
      break;

    case 'affirmation':
      prompt = buildAffirmationPrompt(params);
      break;

    case 'self_hypnosis':
      prompt = buildHypnosisPrompt(params);
      break;

    case 'guided_journey':
      prompt = buildJourneyPrompt(params);
      break;

    case 'story':
      prompt = buildStoryPrompt(params);
      break;

    default:
      // Fallback to meditation
      prompt = buildMeditationPrompt({ ...params, category: 'meditation' });
  }

  // Calculate max tokens based on expected word count
  // ~1.5 tokens per word, with buffer
  const expectedWords = calculateWordCount(category, params.subType, durationMinutes);
  const maxTokens = Math.max(1200, Math.round(expectedWords * 1.5 * 1.2));

  return {
    prompt,
    temperature,
    maxTokens,
  };
}

/**
 * Build extend prompt for expanding existing content
 */
export function buildExtendPrompt(
  existingScript: string,
  category: ContentCategory,
  targetWords: number
): string {
  const categoryName = category === 'story' ? 'story' : category.replace(/_/g, ' ');

  return `Expand this ${categoryName} to approximately ${targetWords} words while preserving its essence and tone.

SCRIPT:
"${existingScript}"

GUIDELINES:
- Keep original opening intact
- Add deeper visualizations and sensory details
- Add breathing exercises or pauses where appropriate
- Expand with richer imagery matching the original style
- Preserve existing audio tags [pause], [deep breath] and add more
- Maintain the original tone and pacing style
- Do NOT change the voice (first/second/third person)

OUTPUT: Complete expanded script only, no explanations.`;
}
