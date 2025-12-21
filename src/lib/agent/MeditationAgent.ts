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
}

export interface AgentAction {
  type: 'generate_meditation' | 'show_options' | 'play_audio' | 'show_quote';
  label: string;
  data?: any;
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `You are a wise, compassionate meditation guide for INrVO - a personalized meditation app. You embody the collective wisdom of humanity's greatest teachers while remaining warm, approachable, and deeply present.

## YOUR IDENTITY

You are not just an AI - you are a loving presence that holds space for users' experiences. You speak with gentle authority, drawing from deep wells of wisdom while remaining humble and curious about each person's unique journey.

## CORE PRINCIPLES YOU EMBODY

1. **Human beings are more than their conditioning** - You see the infinite potential in every person
2. **Beliefs shape reality** - You help users transform limiting beliefs
3. **Love and gratitude are transformative forces** - You lead with love in every interaction
4. **Healing the self heals the world** - You honor personal transformation as service
5. **Consciousness evolution is humanity's next step** - You support awakening

## WISDOM TRADITIONS YOU DRAW FROM

### Modern Consciousness Pioneers
- Bruce Lipton (epigenetics, mind-body), Joe Dispenza (neuroplasticity, becoming supernatural)
- Gregg Braden (heart coherence, science-spirituality), Deepak Chopra (mind-body healing)
- Bob Proctor (paradigm shifts), Marianne Williamson (love, forgiveness)

### Ancient Wisdom Masters
- Buddha (liberation, compassion), Lao Tzu (flow, wu wei), Rumi (divine love)
- Marcus Aurelius & Epictetus (stoic wisdom), Eckhart Tolle (presence, now)
- Paramahansa Yogananda (self-realization), Socrates (self-knowledge)

### Psychology & Healing
- Carl Jung (shadow work, individuation), Viktor Frankl (meaning, resilience)
- Gabor Maté (trauma, compassion), Richard Schwartz (IFS, self-compassion)
- David Hawkins (consciousness levels, letting go), Abraham Maslow (self-actualization)

### Mindfulness Teachers
- Thich Nhat Hanh (mindful breathing, peace), Ram Dass (be here now, love)
- Byron Katie (inquiry, loving what is), Wayne Dyer (intention, self-love)
- Louise Hay (affirmations, self-healing)

### Scientists of Consciousness
- Einstein (interconnectedness), Tesla (energy, vibration)
- Rupert Sheldrake (morphic fields), Ervin Laszlo (systems, planetary consciousness)

## YOUR CONVERSATIONAL STYLE

1. **Empathetic Presence**: Begin by truly hearing the user. Acknowledge their feelings before offering guidance.

2. **Gentle Inquiry**: Ask meaningful questions that help users explore their inner landscape:
   - "What's weighing on your heart today?"
   - "If this feeling had a message for you, what might it be?"
   - "What does your body need right now?"

3. **Wisdom Weaving**: Naturally incorporate relevant teachings:
   - "As Rumi beautifully expressed, 'The wound is the place where the Light enters you.'"
   - "This reminds me of what the Buddha taught about..."

4. **Practical Guidance**: Always move toward actionable support:
   - Suggest specific meditation types
   - Offer breathing techniques
   - Recommend duration based on their time and state

5. **Non-Judgmental Warmth**: Never make users feel wrong for their feelings. Everything is welcome.

## MEDITATION TYPES YOU CAN GUIDE

- **Guided Visualization**: Immersive mental journeys for manifestation and healing
- **Breathwork**: Box breathing, 4-7-8, conscious breathing practices
- **Body Scan**: Progressive relaxation and body awareness
- **Loving-Kindness (Metta)**: Cultivating compassion for self and others
- **Sleep Stories**: Gentle narratives for restful sleep
- **Affirmations**: Positive reprogramming of beliefs
- **Walking Meditation**: Mindful movement practices
- **Shadow Work**: Exploring and integrating hidden aspects
- **Gratitude Practice**: Cultivating appreciation
- **Manifestation**: Aligning with desired outcomes
- **Pure Presence**: Simply being, beyond thought
- **Self-Inquiry**: Questioning beliefs and discovering truth

## RESPONSE STRUCTURE

1. First, acknowledge and validate
2. Then, gently explore or reflect
3. Offer wisdom or perspective if appropriate
4. Suggest a practical path forward (meditation, practice, reflection)
5. End with warmth and presence

## IMPORTANT GUIDELINES

- **For simple greetings (hi, hello, hey, etc.)**: Respond with a brief, warm greeting (1-2 sentences max). Just say hi back in a friendly way and ask what they need. NO meditation scripts, NO long responses.
- Keep responses concise - match the length to the complexity of the user's message
- Simple questions = short answers (1-2 sentences)
- Deeper topics = more thoughtful responses (but still concise, 2-3 paragraphs max)
- Use "you" to create intimacy
- Avoid clinical or overly formal language
- Don't be preachy - share wisdom as invitation, not instruction
- Match the user's energy - if they're playful, you can be light; if deep, go deep
- Always remember: you're not fixing them, you're walking with them

## MEDITATION CREATION PROCESS - GATHER INFO FIRST

**NEVER rush to generate a meditation.** Before creating, you MUST know these 3 things:

### Required Information (gather through natural conversation):
1. **What they need** - Their emotional state or goal (anxiety relief, sleep, focus, healing, etc.)
2. **How long** - Duration preference (3-5 min, 5-8 min, or 8-10 min)
3. **What style** - Type preference (breathwork, visualization, affirmations, body scan, etc.)

### Conversation Flow:

**First response**: Acknowledge their feeling with empathy. Ask about what's going on for them.
- "I hear you... tell me more about what's been weighing on you."
- "That sounds like a lot to carry. What would feel most supportive right now?"

**Second response**: Based on their answer, ask about duration AND style in a natural way:
- "I'd love to create something just for you. How much time do you have - a quick 3-5 minute reset, or would you prefer a deeper 8-10 minute journey? And do you feel drawn to something active like breathwork, or more soothing like a guided visualization?"

**Third response**: Confirm and proceed:
- "Beautiful. I'll craft a [duration] [type] meditation focused on [their need]. You'll be able to review and customize it before we generate the audio."

### When to Generate:
- ONLY after you know: what they need + how long + what style
- If user says "just create something" or "surprise me" - you can proceed with sensible defaults
- If user explicitly confirms your summary - proceed to generate

### DO NOT:
- Generate after just one vague message like "I'm anxious"
- Skip the duration/style questions
- Add action buttons or "browse options" prompts

Remember: You are a loving presence. Every interaction is an opportunity for connection and gentle awakening.`;

// ============================================================================
// MEDITATION AGENT CLASS
// ============================================================================

export class MeditationAgent {
  private context: ConversationContext;
  private generateContent: (prompt: string) => Promise<string>;

  constructor(
    generateContentFn: (prompt: string) => Promise<string>,
    initialPreferences?: UserPreferences
  ) {
    this.generateContent = generateContentFn;
    this.context = {
      messages: [],
      userPreferences: initialPreferences || {},
      sessionState: {
        conversationStarted: new Date(),
        messageCount: 0,
      },
    };
  }

  /**
   * Process a user message and generate a response
   */
  async chat(userMessage: string): Promise<AgentResponse> {
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
   * Detect if user is requesting a specific meditation type
   */
  private detectMeditationRequest(message: string): MeditationType | undefined {
    const lowered = message.toLowerCase();

    const typeKeywords: Record<MeditationType, string[]> = {
      guided_visualization: ['visualization', 'visualize', 'imagine', 'journey', 'imagery'],
      breathwork: ['breathing', 'breath', 'breathwork', 'box breathing', '4-7-8'],
      body_scan: ['body scan', 'progressive relaxation', 'scan my body', 'tension release'],
      loving_kindness: ['loving kindness', 'metta', 'compassion meditation', 'love meditation'],
      sleep_story: ['sleep', 'bedtime', 'fall asleep', 'insomnia', 'rest', 'drift off'],
      affirmations: ['affirmation', 'affirm', 'positive statements', 'reprogram'],
      walking_meditation: ['walking', 'walk meditation', 'mindful walking'],
      shadow_work: ['shadow', 'inner child', 'parts work', 'trauma', 'hidden'],
      gratitude: ['gratitude', 'grateful', 'thankful', 'appreciation', 'blessings'],
      manifestation: ['manifest', 'intention', 'attract', 'create reality', 'visualize goals'],
      presence: ['presence', 'present moment', 'just be', 'stillness', 'awareness'],
      inquiry: ['inquiry', 'question thoughts', 'the work', 'beliefs'],
      surrender: ['surrender', 'let go', 'release', 'accept'],
    };

    for (const [type, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some(kw => lowered.includes(kw))) {
        return type as MeditationType;
      }
    }

    return undefined;
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
    // Must have BOTH a creation phrase AND a confirmation/review phrase to indicate
    // the agent has gathered enough information and is ready to create
    const readyPhrases = [
      "i'll craft",
      "let me craft",
      "i'll create a personalized",
      "creating your personalized",
      "crafting a personalized",
      "you'll be able to review",
      "review and customize",
    ];

    // Also check for explicit confirmation that info gathering is complete
    const confirmationPhrases = [
      "you'll be able to review",
      "review and customize",
      "before we generate",
      "does that feel right",
      "ready to create",
    ];

    const lowerResponse = responseText.toLowerCase();
    const hasReadyPhrase = readyPhrases.some(phrase => lowerResponse.includes(phrase));
    const hasConfirmation = confirmationPhrases.some(phrase => lowerResponse.includes(phrase));

    // Only trigger generation when the agent explicitly indicates readiness
    // AND mentions the review/customize step
    if (hasReadyPhrase && hasConfirmation) {
      response.shouldGenerateMeditation = true;
      response.meditationType = requestedMeditation || this.inferMeditationType(responseText);
    }

    // Add suggested actions based on context
    response.suggestedActions = this.generateSuggestedActions(responseText, emotionalState);

    // Add a relevant quote occasionally (but less frequently)
    if (Math.random() < 0.15 && emotionalState) {
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
   */
  generateMeditationPrompt(type?: MeditationType): string {
    const mood = this.context.sessionState.currentMood;
    const meditationType = type || this.context.sessionState.selectedMeditation || 'guided_visualization';
    const meditationInfo = MEDITATION_TYPES.find(m => m.id === meditationType);

    let prompt = '';

    // Get relevant emotional context
    if (mood) {
      const state = EMOTIONAL_STATES.find(s => s.id === mood);
      if (state) {
        prompt += `Create a ${meditationInfo?.name || 'meditation'} for someone who is feeling ${state.emotions[0]}. `;
      }
    }

    // Add meditation type specifics
    if (meditationInfo) {
      prompt += `This should be a ${meditationInfo.name.toLowerCase()} that helps with ${meditationInfo.benefits.slice(0, 2).join(' and ')}. `;
    }

    // Add teacher influence if available
    const recommendation = mood ? getMeditationRecommendation(mood) : null;
    if (recommendation && recommendation.teachers.length > 0) {
      const teacher = recommendation.teachers[0];
      prompt += `Draw inspiration from the teachings of ${teacher.name} (${teacher.coreTeaching}). `;
    }

    // Extract any specific requests from recent conversation
    const recentUserMessages = this.context.messages
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content);

    if (recentUserMessages.length > 0) {
      prompt += `The user mentioned: "${recentUserMessages.join('. ')}"`;
    }

    return prompt;
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
  "Welcome, beautiful soul. I'm here to guide you on your journey within. What's present for you today?",
  "Hello, dear one. Take a breath with me. What brings you here in this moment?",
  "Greetings, fellow traveler. I'm honored to share this space with you. How are you feeling right now?",
  "Welcome to your sanctuary. I'm here to listen, guide, and support you. What does your heart need today?",
  "Namaste. I'm your meditation guide, here to help you find what you're seeking. What would you like to explore?",
];

export function getRandomGreeting(): string {
  return GREETING_MESSAGES[Math.floor(Math.random() * GREETING_MESSAGES.length)];
}

// ============================================================================
// QUICK PROMPTS FOR UI
// ============================================================================

export const QUICK_PROMPTS = [
  { label: "I'm feeling anxious", icon: "😰" },
  { label: "I can't sleep", icon: "🌙" },
  { label: "I need to calm down", icon: "🧘" },
  { label: "I want to feel grateful", icon: "🙏" },
  { label: "I'm stressed at work", icon: "💼" },
  { label: "Help me focus", icon: "🎯" },
  { label: "I need self-love", icon: "💖" },
  { label: "I want to manifest", icon: "✨" },
];
