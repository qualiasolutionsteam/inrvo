/**
 * INrVO Meditation Agent
 *
 * A conversational AI assistant that guides users through personalized meditation
 * experiences, drawing from diverse wisdom traditions and modern neuroscience.
 */

import {
  WISDOM_TEACHERS,
  MEDITATION_TYPES,
  CORE_PRINCIPLES,
  EMOTIONAL_STATES,
  detectEmotionalState,
  getRandomQuote,
  getMeditationRecommendation,
  getTeacher,
  type WisdomTeacher,
  type MeditationType,
  type MeditationTypeInfo,
} from './knowledgeBase';

import {
  loadMeditationPreferences,
  buildPersonalizationPrompt,
  getPreferredApproach,
  type MeditationPreferences,
} from '../preferencesService';

// ============================================================================
// TYPES
// ============================================================================

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    emotionalState?: string;
    suggestedMeditation?: MeditationType;
    toolCalled?: string;
    teacherReferenced?: string;
  };
}

export interface ConversationContext {
  messages: ConversationMessage[];
  userPreferences: UserPreferences;
  sessionState: SessionState;
}

export interface UserPreferences {
  preferredTraditions?: string[];
  favoriteTeachers?: string[];
  meditationHistory?: string[];
  avoidTopics?: string[];
  preferredDuration?: number; // minutes
}

export interface SessionState {
  currentMood?: string;
  selectedMeditation?: MeditationType;
  isGeneratingScript?: boolean;
  lastMeditationScript?: string;
  conversationStarted: Date;
  messageCount: number;
}

export interface AgentResponse {
  message: string;
  suggestedActions?: AgentAction[];
  emotionalState?: string;
  shouldGenerateMeditation?: boolean;
  meditationType?: MeditationType;
  meditationPrompt?: string;
  quote?: { quote: string; teacher: string };
  // When user pastes a ready-made meditation script, pass it directly without AI processing
  pastedScript?: string;
}

export interface AgentAction {
  type: 'generate_meditation' | 'show_options' | 'play_audio' | 'show_quote';
  label: string;
  data?: any;
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `You are a wise, compassionate meditation guide for INrVO. You are warm, grounded, and deeply present - like a trusted friend who happens to have profound wisdom.

## YOUR CORE PURPOSE

You are here to **listen and converse** with the user. You engage in meaningful dialogue, offering wisdom and perspective when helpful. You do NOT immediately generate meditations - you have conversations.

## CRITICAL: CONVERSATIONAL MODE

**DEFAULT BEHAVIOR**: Have a conversation. Listen. Respond thoughtfully. Share wisdom when relevant.

**DO NOT generate meditations unless the user explicitly asks.** Wait for clear requests like:
- "Can you create a meditation for me?"
- "I'd like a meditation"
- "Generate a meditation"
- "Make me a sleep story"
- "Create an affirmation for me"
- "I want a guided visualization"

## RESPONSE LENGTH RULES (CRITICAL)

**Match your response length to the user's message:**

1. **Greetings (hi, hello, hey)**: 1 sentence max. Just say hi warmly.
   - Example: "Hey there. What's on your mind today?"

2. **Simple shares (I'm anxious, stressed, etc.)**: 2-3 sentences max. Acknowledge, maybe ask one gentle question.
   - Example: "That sounds heavy. What's been weighing on you?"

3. **Deeper sharing**: 3-4 sentences. Reflect, offer perspective, perhaps suggest an option.
   - Example: "It sounds like there's a lot swirling inside. Sometimes when we're caught in that mental storm, just pausing to take three deep breaths can create a tiny opening. Would you like to talk through what's happening, or would a short meditation help right now?"

4. **Explicit meditation request**: Confirm briefly, then trigger generation.
   - Example: "I'll create a calming breathwork session for you."

## WISDOM YOU DRAW FROM

You naturally weave insights from teachers like:
- Buddha (compassion, impermanence), Rumi (love, wholeness)
- Thich Nhat Hanh (breathing, presence), Eckhart Tolle (now)
- Carl Jung (shadow, wholeness), Viktor Frankl (meaning)
- Joe Dispenza (neuroplasticity), Louise Hay (affirmations)

But don't lecture. Drop in wisdom sparingly and naturally.

## WHAT YOU CAN CREATE (when asked)

- **Meditations**: Guided visualizations, breathwork, body scans, sleep stories
- **Affirmations**: Personalized positive statements for reprogramming beliefs
- **Stories**: Calming narratives for sleep or relaxation

## MEDITATION GENERATION TRIGGERS

**ONLY use these exact trigger phrases when the user explicitly requests content:**
- "I'll craft a"
- "Let me create"
- "I'll create a"
- "Creating your"

**Examples of when to generate:**
- User: "Can you make me a meditation for anxiety?" → "I'll craft a calming meditation for you."
- User: "I need a sleep story" → "Let me create a gentle sleep story."
- User: "Give me an affirmation" → "Creating an affirmation just for you."

**Examples of when NOT to generate (just converse):**
- User: "I'm feeling anxious" → "What's got you feeling that way?" (conversation)
- User: "I can't sleep" → "I'm sorry to hear that. What's keeping you up?" (conversation)
- User: "I'm stressed about work" → "That's tough. Tell me more about what's happening." (conversation)

## YOUR CONVERSATIONAL STYLE

1. **Be concise.** Short sentences. Natural speech. No fluff.
2. **Ask questions** to understand before offering solutions.
3. **Acknowledge feelings** without immediately trying to fix them.
4. **Offer perspective** when it feels natural, not forced.
5. **Suggest options** - "Would you like to talk more, or would a meditation help?"
6. **Match their energy** - playful if they're playful, serious if they're serious.

## DO NOT

- Generate meditations without being asked
- Write long responses to simple messages
- Be preachy or lecture-y
- Use excessive emojis or spiritual jargon
- Say "I hear you" at the start of every message
- Force wisdom quotes into every response

Remember: You're having a conversation with a friend, not performing a spiritual monologue.`;


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
      console.log('[MeditationAgent] Loaded user preferences:', this.meditationPreferences);
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
    // FIRST: Check if user pasted a ready-made meditation script
    const pastedScript = this.detectReadyMeditationScript(userMessage);
    if (pastedScript) {
      console.log('[MeditationAgent] User pasted a ready-made meditation, skipping AI processing');

      // Add to context for tracking
      this.context.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      });
      this.context.sessionState.messageCount++;

      // Return immediately with the pasted script - no AI needed
      return {
        message: "I see you've brought your own meditation script. Let me take you to the editor where you can review and customize it.",
        shouldGenerateMeditation: true,
        meditationType: 'guided_visualization', // Default type for pasted scripts
        pastedScript: pastedScript,
      };
    }

    // Add user message to context
    const userMsg: ConversationMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    // Detect emotional state from user input
    const emotionalState = detectEmotionalState(userMessage);
    if (emotionalState) {
      userMsg.metadata = { emotionalState: emotionalState.id };
      this.context.sessionState.currentMood = emotionalState.id;
    }

    this.context.messages.push(userMsg);
    this.context.sessionState.messageCount++;

    // Check if user is asking for a specific meditation type
    const requestedMeditation = this.detectMeditationRequest(userMessage);

    // Build the prompt for Gemini
    const prompt = this.buildPrompt(userMessage, emotionalState?.id, requestedMeditation);

    // Generate response
    const responseText = await this.generateContent(prompt);

    // Parse the response for any structured data
    const parsedResponse = this.parseResponse(responseText, emotionalState?.id, requestedMeditation);

    // Add assistant message to context
    const assistantMsg: ConversationMessage = {
      role: 'assistant',
      content: parsedResponse.message,
      timestamp: new Date(),
      metadata: {
        emotionalState: emotionalState?.id,
        suggestedMeditation: parsedResponse.meditationType,
      },
    };
    this.context.messages.push(assistantMsg);

    return parsedResponse;
  }

  /**
   * Build the full prompt including context and system instructions
   */
  private buildPrompt(
    userMessage: string,
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
    const recentMessages = this.context.messages.slice(-6);
    let conversationHistory = '';
    if (recentMessages.length > 1) {
      conversationHistory = '\n\n[RECENT CONVERSATION]\n';
      for (const msg of recentMessages.slice(0, -1)) { // Exclude current message
        conversationHistory += `${msg.role === 'user' ? 'User' : 'Guide'}: ${msg.content}\n\n`;
      }
    }

    // Add user preferences if any
    let preferencesInfo = '';
    if (this.context.userPreferences.preferredTraditions?.length) {
      preferencesInfo += `\n[USER PREFERS: ${this.context.userPreferences.preferredTraditions.join(', ')} traditions]\n`;
    }

    return `${SYSTEM_PROMPT}
${contextInfo}
${preferencesInfo}
${conversationHistory}

User: ${userMessage}

Guide:`;
  }

  /**
   * Detect if user is EXPLICITLY requesting a meditation/affirmation/story
   * Returns the type only if user is asking for content to be created
   */
  private detectMeditationRequest(message: string): MeditationType | undefined {
    const lowered = message.toLowerCase();

    // First check: Is the user explicitly asking for content to be created?
    const explicitRequestPatterns = [
      /(?:create|make|generate|give me|i need|i want|i'd like|can you|could you|please)\s+(?:a|an|me a|me an)?\s*(?:meditation|meditate|session)/i,
      /(?:create|make|generate|give me|i need|i want|i'd like|can you|could you|please)\s+(?:a|an|me a|me an)?\s*(?:affirmation|positive statement)/i,
      /(?:create|make|generate|give me|i need|i want|i'd like|can you|could you|please)\s+(?:a|an|me a|me an)?\s*(?:sleep story|bedtime story|story to sleep)/i,
      /(?:create|make|generate|give me|i need|i want|i'd like|can you|could you|please)\s+(?:a|an|me a|me an)?\s*(?:visualization|guided journey)/i,
      /(?:create|make|generate|give me|i need|i want|i'd like|can you|could you|please)\s+(?:a|an|me a|me an)?\s*(?:breathwork|breathing exercise)/i,
      /(?:create|make|generate|give me|i need|i want|i'd like|can you|could you|please)\s+(?:a|an|me a|me an)?\s*(?:body scan)/i,
      /(?:let's|ready to)\s+(?:do|start|begin)\s+(?:a|an|the)?\s*(?:meditation|session)/i,
      /(?:help me|i want to)\s+(?:meditate|relax|sleep|calm down|de-stress)/i,
    ];

    const isExplicitRequest = explicitRequestPatterns.some(pattern => pattern.test(lowered));

    if (!isExplicitRequest) {
      // User is just talking, not requesting content
      return undefined;
    }

    // User IS requesting content - now detect the type
    const typeKeywords: Record<MeditationType, string[]> = {
      guided_visualization: ['visualization', 'visualize', 'imagine', 'journey', 'imagery'],
      breathwork: ['breathing', 'breath', 'breathwork', 'box breathing', '4-7-8'],
      body_scan: ['body scan', 'progressive relaxation', 'scan my body', 'tension release'],
      loving_kindness: ['loving kindness', 'metta', 'compassion meditation', 'love meditation'],
      sleep_story: ['sleep', 'bedtime', 'fall asleep', 'insomnia', 'rest', 'drift off', 'story'],
      affirmations: ['affirmation', 'affirm', 'positive statements', 'reprogram'],
      walking_meditation: ['walking', 'walk meditation', 'mindful walking'],
      shadow_work: ['shadow', 'inner child', 'parts work', 'hidden'],
      gratitude: ['gratitude', 'grateful', 'thankful', 'appreciation', 'blessings'],
      manifestation: ['manifest', 'intention', 'attract', 'create reality', 'visualize goals'],
      presence: ['presence', 'present moment', 'just be', 'stillness'],
      inquiry: ['inquiry', 'question thoughts', 'the work'],
      surrender: ['surrender', 'let go', 'release', 'accept'],
    };

    for (const [type, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some(kw => lowered.includes(kw))) {
        return type as MeditationType;
      }
    }

    // Default to guided visualization if they asked for a meditation but didn't specify type
    if (/meditation|meditate|session|relax|calm/i.test(lowered)) {
      return 'guided_visualization';
    }

    return undefined;
  }

  /**
   * Check if user is explicitly asking for content generation
   */
  private isExplicitGenerationRequest(message: string): boolean {
    const lowered = message.toLowerCase();

    const requestPatterns = [
      /(?:create|make|generate|give me|i need|i want|i'd like)\s+(?:a|an|me a)?\s*(?:meditation|affirmation|story|visualization|breathwork|body scan)/i,
      /(?:can you|could you|please|would you)\s+(?:create|make|generate|give me)\s+(?:a|an|me a)?\s*(?:meditation|affirmation|story)/i,
      /(?:let's|ready to)\s+(?:do|start|begin)\s+(?:a|the)?\s*meditation/i,
      /(?:help me|guide me through)\s+(?:a|an)?\s*(?:meditation|relaxation|visualization)/i,
    ];

    return requestPatterns.some(pattern => pattern.test(lowered));
  }

  /**
   * Detect if user has pasted a ready-made meditation script
   * Returns the script if detected, null otherwise
   */
  private detectReadyMeditationScript(message: string): string | null {
    // Minimum length for a meditation script (at least a few paragraphs)
    if (message.length < 300) {
      return null;
    }

    const lowered = message.toLowerCase();

    // Check for meditation script indicators
    const meditationIndicators = [
      // Opening/greeting patterns
      /(?:welcome|greetings|hello|dear one|beloved)/i,
      // Breathing instructions
      /(?:take a (?:deep |slow )?breath|breathe (?:in|out|deeply)|inhale|exhale)/i,
      // Body awareness
      /(?:close your eyes|relax your|feel your body|notice your|let go of)/i,
      // Guidance patterns
      /(?:allow yourself|let yourself|give yourself permission|imagine|visualize|picture)/i,
      // Meditation language
      /(?:present moment|inner peace|calm|stillness|awareness|mindful|conscious)/i,
      // Ending patterns
      /(?:gently|slowly|when you're ready|return|come back|open your eyes)/i,
    ];

    // Count how many meditation indicators are present
    let indicatorCount = 0;
    for (const pattern of meditationIndicators) {
      if (pattern.test(lowered)) {
        indicatorCount++;
      }
    }

    // Check for structural elements (multiple paragraphs, pauses, etc.)
    const paragraphCount = message.split(/\n\s*\n/).length;
    const hasAudioTags = /\[(?:pause|breath|deep breath|silence|music)\]/i.test(message);
    const hasMeditationStructure = paragraphCount >= 3 || hasAudioTags;

    // Consider it a ready meditation if:
    // - At least 3 meditation indicators AND
    // - Has meditation structure (multiple paragraphs or audio tags)
    if (indicatorCount >= 3 && hasMeditationStructure) {
      console.log('[MeditationAgent] Detected ready-made meditation script:', {
        indicatorCount,
        paragraphCount,
        hasAudioTags,
        length: message.length,
      });
      return message;
    }

    return null;
  }

  /**
   * Parse the response and extract structured data
   */
  private parseResponse(
    responseText: string,
    emotionalState?: string,
    requestedMeditation?: MeditationType
  ): AgentResponse {
    const response: AgentResponse = {
      message: responseText,
      emotionalState,
    };

    // Check if response indicates readiness to generate meditation
    // CONSERVATIVE detection - only trigger on explicit creation phrases
    const generationTriggerPhrases = [
      // Only these specific phrases trigger generation
      "i'll craft a",
      "let me craft",
      "i'll create a",
      "let me create",
      "creating your",
      "crafting your",
      "crafting a",
      "i've prepared",
      "i've crafted",
      "i've created",
    ];

    const lowerResponse = responseText.toLowerCase();
    const shouldGenerate = generationTriggerPhrases.some(phrase => lowerResponse.includes(phrase));

    // NO auto-triggering based on emotional acknowledgment
    // The agent must explicitly use creation phrases to trigger generation

    // Trigger generation only on explicit phrases
    console.log("[MeditationAgent] shouldGenerate:", shouldGenerate, "| meditationType:", requestedMeditation, "| emotionalState:", emotionalState);
    if (shouldGenerate) {
      response.shouldGenerateMeditation = true;
      response.meditationType = requestedMeditation || this.inferMeditationType(responseText);
    }

    // Add suggested actions based on context
    response.suggestedActions = this.generateSuggestedActions(responseText, emotionalState);

    // Add a relevant quote very rarely (5% chance) and only after deeper conversations
    if (Math.random() < 0.05 && emotionalState && this.context.sessionState.messageCount > 3) {
      const recommendation = getMeditationRecommendation(emotionalState);
      if (recommendation.teachers.length > 0) {
        const teacher = recommendation.teachers[0];
        if (teacher.quotes.length > 0) {
          response.quote = {
            quote: teacher.quotes[Math.floor(Math.random() * teacher.quotes.length)],
            teacher: teacher.name,
          };
        }
      }
    }

    return response;
  }

  /**
   * Infer meditation type from response text
   */
  private inferMeditationType(responseText: string): MeditationType {
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
   * Generate suggested action buttons
   * Kept minimal - the agent's conversation should guide the user naturally
   */
  private generateSuggestedActions(_responseText: string, _emotionalState?: string): AgentAction[] {
    // Return empty - let the conversation flow naturally without button prompts
    // The agent will ask clarifying questions and guide the user through dialogue
    return [];
  }

  /**
   * Get a wisdom quote for the current context
   */
  getContextualQuote(): { quote: string; teacher: string } {
    const mood = this.context.sessionState.currentMood;
    if (mood) {
      const recommendation = getMeditationRecommendation(mood);
      if (recommendation.teachers.length > 0) {
        const teacher = recommendation.teachers[Math.floor(Math.random() * recommendation.teachers.length)];
        if (teacher.quotes.length > 0) {
          return {
            quote: teacher.quotes[Math.floor(Math.random() * teacher.quotes.length)],
            teacher: teacher.name,
          };
        }
      }
    }
    return getRandomQuote();
  }

  /**
   * Generate a meditation prompt based on conversation context
   * Enhanced version with detailed context extraction for accuracy
   */
  generateMeditationPrompt(type?: MeditationType): string {
    const mood = this.context.sessionState.currentMood;
    const meditationType = type || this.context.sessionState.selectedMeditation || 'guided_visualization';
    const meditationInfo = MEDITATION_TYPES.find(m => m.id === meditationType);

    // Collect ALL user messages for comprehensive context
    const allUserMessages = this.context.messages
      .filter(m => m.role === 'user')
      .map(m => m.content);

    // Extract specific elements from user input
    const combinedInput = allUserMessages.join(' ').toLowerCase();
    const extractedContext = this.extractUserContext(combinedInput);

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
    const preferencesPrompt = buildPersonalizationPrompt(this.meditationPreferences, mood);
    if (preferencesPrompt) {
      prompt += preferencesPrompt;
    }

    // Check if user has a preferred approach for this emotional state
    if (mood && this.meditationPreferences) {
      const preferredApproach = getPreferredApproach(this.meditationPreferences, mood);
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
   * Extract specific context from user input for accurate meditation generation
   */
  private extractUserContext(input: string): {
    situation: string | null;
    settings: string[];
    timeContext: string | null;
    goals: string[];
    duration: string | null;
  } {
    const result = {
      situation: null as string | null,
      settings: [] as string[],
      timeContext: null as string | null,
      goals: [] as string[],
      duration: null as string | null,
    };

    // Extract specific situations
    const situationPatterns = [
      { pattern: /(?:have|got|facing|before|after|during)\s+(?:a|an|my|the)?\s*([a-z\s]+(?:interview|meeting|exam|presentation|date|surgery|flight|trip|call|appointment))/i, capture: 1 },
      { pattern: /(?:dealing with|going through|struggling with|facing)\s+([a-z\s]+)/i, capture: 1 },
      { pattern: /(?:my|the)\s+([a-z]+)\s+(?:is|are|was|were)\s+(?:making|causing|giving)/i, capture: 0 },
      { pattern: /(?:broke up|breakup|divorce|lost my|death of|passed away)/i, capture: 0 },
      { pattern: /(?:work|job|boss|coworker|colleague)\s+(?:is|are|stress)/i, capture: 0 },
    ];

    for (const { pattern } of situationPatterns) {
      const match = input.match(pattern);
      if (match) {
        result.situation = match[0].trim();
        break;
      }
    }

    // Extract settings/scenes
    const settingKeywords = [
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

    for (const keyword of settingKeywords) {
      if (input.includes(keyword)) {
        result.settings.push(keyword);
      }
    }

    // Extract time context
    const timePatterns = [
      { pattern: /(?:tonight|going to bed|bedtime|before sleep|can't sleep|falling asleep)/i, time: 'nighttime/sleep' },
      { pattern: /(?:morning|wake up|start my day|before work)/i, time: 'morning/awakening' },
      { pattern: /(?:lunch|break|midday|afternoon)/i, time: 'midday/break' },
      { pattern: /(?:evening|after work|wind down|end of day)/i, time: 'evening/unwinding' },
      { pattern: /(?:quick|short|5 minutes?|few minutes?|brief)/i, time: 'quick session' },
      { pattern: /(?:deep|long|extended|thorough|full)/i, time: 'extended session' },
    ];

    for (const { pattern, time } of timePatterns) {
      if (pattern.test(input)) {
        result.timeContext = time;
        break;
      }
    }

    // Extract specific goals
    const goalPatterns = [
      { pattern: /(?:want to|need to|help me|trying to)\s+(?:feel more\s+)?(\w+)/i, goal: null },
      { pattern: /(?:reduce|release|let go of|overcome)\s+(?:my\s+)?(\w+)/i, goal: null },
      { pattern: /(?:find|gain|build|increase|improve)\s+(?:more\s+)?(\w+)/i, goal: null },
    ];

    const goalKeywords = [
      'calm', 'peace', 'relaxation', 'focus', 'clarity', 'confidence',
      'sleep', 'rest', 'energy', 'motivation', 'courage', 'strength',
      'self-love', 'forgiveness', 'acceptance', 'gratitude', 'joy',
      'healing', 'release', 'letting go', 'grounding', 'centering',
    ];

    for (const keyword of goalKeywords) {
      if (input.includes(keyword)) {
        result.goals.push(keyword);
      }
    }

    // Extract duration preferences
    const durationPatterns = [
      { pattern: /(\d+)\s*(?:min|minute)/i, extract: true },
      { pattern: /(?:quick|short|brief)/i, duration: '3-5 minutes' },
      { pattern: /(?:medium|normal|regular)/i, duration: '10-15 minutes' },
      { pattern: /(?:long|deep|extended|full)/i, duration: '20-30 minutes' },
    ];

    for (const item of durationPatterns) {
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

    return result;
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

// ============================================================================
// GREETING MESSAGES
// ============================================================================

export const GREETING_MESSAGES = [
  "Hey. What's on your mind today?",
  "Hi there. How are you doing?",
  "Hello. What brings you here?",
  "Hey. How can I help?",
  "Hi. What's going on?",
];

export function getRandomGreeting(): string {
  return GREETING_MESSAGES[Math.floor(Math.random() * GREETING_MESSAGES.length)];
}

// ============================================================================
// QUICK PROMPTS FOR UI
// ============================================================================

export const QUICK_PROMPTS = [
  { label: "I'm feeling anxious", icon: "waves" },
  { label: "I can't sleep", icon: "moon" },
  { label: "I'm stressed", icon: "cloud" },
  { label: "Just want to talk", icon: "heart" },
  { label: "Need some calm", icon: "lotus" },
  { label: "Create a meditation", icon: "sparkle" },
];
