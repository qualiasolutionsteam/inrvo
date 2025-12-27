// Lazy import for GoogleGenAI - only load when needed (fallback for unauthenticated users)
// This reduces initial bundle size by ~250KB
// Edge functions are dynamically imported to enable code splitting

// Feature flag: Use Edge Functions for all API calls (secure, API key server-side)
const USE_EDGE_FUNCTIONS = true;

// Lazy load GoogleGenAI only when needed (deprecated fallback for script generation)
let GoogleGenAI: any = null;

async function getAI() {
  if (!GoogleGenAI) {
    const genai = await import('@google/genai');
    GoogleGenAI = genai.GoogleGenAI;
  }
  return new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
}

/**
 * Calculate word count and structure based on duration minutes
 * At meditation pace: ~2 words/second (with pauses for breathing)
 */
function calculateWordStructure(durationMinutes: number): string {
  const clampedMinutes = Math.max(1, Math.min(30, durationMinutes));
  const targetWords = Math.round(clampedMinutes * 60 * 2);
  const minWords = Math.round(targetWords * 0.9);
  const maxWords = Math.round(targetWords * 1.1);

  // Calculate proportional section lengths
  const opening = Math.round(targetWords * 0.10);
  const grounding = Math.round(targetWords * 0.15);
  const core = Math.round(targetWords * 0.50);
  const integration = Math.round(targetWords * 0.15);
  const closing = Math.round(targetWords * 0.10);

  return `Structure (${minWords}-${maxWords} words total for ${clampedMinutes} minute meditation):
1. OPENING (${opening} words): Acknowledge exactly where they are emotionally. Make them feel SEEN.
2. GROUNDING (${grounding} words): Breath awareness, body settling
3. CORE EXPERIENCE (${core} words): The main visualization/practice
4. INTEGRATION (${integration} words): Connecting the experience to their situation
5. CLOSING (${closing} words): Gentle return with lasting calm/confidence`;
}

// Valid audio tags allowed in harmonized output
const VALID_AUDIO_TAGS = new Set([
  '[pause]',
  '[long pause]',
  '[deep breath]',
  '[exhale slowly]',
  '[silence]',
]);

/**
 * Validate and sanitize harmonized script output
 * Prevents XSS and ensures only valid audio tags are present
 */
function validateHarmonizedOutput(script: string): string {
  // Check for dangerous HTML/script patterns
  const dangerousPatterns = [
    /<script[^>]*>/i,
    /<\/script>/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i,
    /<style[^>]*>/i,
    /<link[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<img[^>]*onerror/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(script)) {
      throw new Error('Invalid content detected in response');
    }
  }

  // Filter to only allow known valid audio tags
  const sanitized = script.replace(/\[[^\]]+\]/g, (match) => {
    if (VALID_AUDIO_TAGS.has(match)) {
      return match;
    }
    console.warn(`Unknown audio tag removed: ${match}`);
    return '';
  });

  return sanitized.replace(/\s{2,}/g, ' ').trim();
}

export const geminiService = {
  /**
   * Conversational chat with Gemini
   * Uses Edge Functions for secure API key handling
   * This method respects the agent's system prompt for natural conversation
   *
   * @param prompt - Full prompt including system instructions and conversation
   * @param options - Optional settings for temperature and max tokens
   */
  async chat(prompt: string, options?: { maxTokens?: number; temperature?: number }): Promise<string> {
    try {
      const { isEdgeFunctionAvailable, geminiChat } = await import('./src/lib/edgeFunctions');
      if (USE_EDGE_FUNCTIONS && await isEdgeFunctionAvailable()) {
        return geminiChat(prompt, options);
      }

      // Fallback to client-side SDK (not recommended - exposes API key)
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error('Please sign in to use the meditation assistant.');
      }

      const ai = await getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        generationConfig: {
          temperature: options?.temperature ?? 0.8,
          maxOutputTokens: options?.maxTokens ?? 500,
        },
      });

      const text = response.text;
      if (!text || text.trim() === '') {
        throw new Error('Empty response from API. Please try again.');
      }

      return text;
    } catch (error: any) {
      console.error('Error in chat:', error);
      throw new Error(error?.message || 'Failed to get response. Please try again.');
    }
  },

  /**
   * Fast script generation using gemini-2.0-flash
   * Uses Edge Functions for secure API key handling
   * @param thought - The user's meditation idea/prompt
   * @param audioTags - Optional array of audio tag labels to incorporate
   * @param durationMinutes - Target duration in minutes (default: 5)
   */
  async enhanceScript(thought: string, audioTags?: string[], durationMinutes?: number): Promise<string> {
    try {
      // Use Edge Functions if available (secure, API key server-side)
      const { isEdgeFunctionAvailable, geminiGenerateScript } = await import('./src/lib/edgeFunctions');
      if (USE_EDGE_FUNCTIONS && await isEdgeFunctionAvailable()) {
        return geminiGenerateScript(thought, audioTags, durationMinutes);
      }

      // Legacy fallback for unauthenticated users (dynamically loads 250KB SDK)
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error('Please sign in to generate meditation scripts.');
      }

      const ai = await getAI();

      let audioTagsInstruction = '';
      if (audioTags && audioTags.length > 0) {
        audioTagsInstruction = `
AUDIO CUES TO INCORPORATE: ${audioTags.join(', ')}
Weave these naturally into the script where they enhance the experience.`;
      }

      // Use duration or default to 5 minutes
      const targetDuration = durationMinutes || 5;
      const structureGuide = calculateWordStructure(targetDuration);

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `You are an expert meditation guide creating HIGHLY PERSONALIZED content. Your meditation must feel like it was written specifically for THIS person's exact situation.

=== USER'S REQUEST ===
"${thought}"
=== END REQUEST ===

TARGET DURATION: ${targetDuration} minutes

## STEP 1: DEEP ANALYSIS (internal only)

Identify EVERYTHING specific in the user's request:
- SITUATION: What specific event/challenge are they facing? (e.g., job interview tomorrow, can't sleep, just had a fight)
- EMOTION: What are they actually feeling? (anxious, stressed, sad, overwhelmed, scared)
- SETTING: Did they request a specific place? (beach, forest, space, etc.)
- TIME: When is this for? (tonight, morning, quick break, before an event)
- GOAL: What outcome do they want? (calm, sleep, confidence, peace, clarity)
- TECHNIQUE: Any specific methods mentioned? (breathing, body scan, visualization)

## STEP 2: CONTENT TYPE SELECTION

Based on your analysis, choose ONE:
- SITUATION-SPECIFIC MEDITATION: For events like interviews, exams, presentations, dates
- EMOTIONAL HEALING: For sadness, grief, heartbreak, self-doubt
- ANXIETY/STRESS RELIEF: For overwhelm, panic, racing thoughts
- SLEEP INDUCTION: For insomnia, racing mind at night, restlessness
- GROUNDING/PRESENCE: For feeling scattered, disconnected, anxious
- ENERGY/MOTIVATION: For feeling stuck, unmotivated, tired
- SELF-LOVE/CONFIDENCE: For self-criticism, doubt, low esteem

## STEP 3: PERSONALIZATION REQUIREMENTS

YOUR MEDITATION MUST:
1. Reference their SPECIFIC situation within the first 50 words
   - If they have an interview → mention the interview directly
   - If they can't sleep → acknowledge their restless mind
   - If they're anxious about something → name that thing

2. Address their EXACT emotional state
   - Don't just do a "generic calm" meditation
   - Speak to what they're actually feeling

3. Use the setting THEY requested (if any)
   - If they said beach, use beach imagery
   - If they said forest, use forest imagery
   - If no setting mentioned, choose one that fits their mood

4. Match the TIME context
   - Night/sleep: Slower, drowsier, trailing sentences...
   - Morning: Gentle awakening energy
   - Before an event: Building confidence and grounding

## STEP 4: WRITE THE SCRIPT

${structureGuide}

Style requirements:
- Use FIRST PERSON "I" throughout (e.g., "I feel calm", "I breathe deeply", "I am safe")
- This is a self-affirmation meditation the listener speaks to themselves
- Rich sensory details (5 senses)
- Present tense
- Include audio tags: [pause], [long pause], [deep breath], [exhale slowly]
- Natural ellipses for pacing...
- Fresh language (avoid "journey", "sacred", overused meditation clichés)
- CRITICAL: The meditation MUST be ${targetDuration} minutes long when read at meditation pace

${audioTagsInstruction}

## OUTPUT

Only the meditation script. No titles, headers, labels, or explanations. Start immediately with the experience.

## CRITICAL ACCURACY CHECK

Before writing, verify:
✓ Does my script reference their specific situation?
✓ Does it address their exact emotional state?
✓ Am I using the setting they requested (or an appropriate one)?
✓ Does the tone match their needs (sleep vs. energy vs. confidence)?
✓ Would this feel personally written for THEM, not generic?
✓ Is the script the correct length for ${targetDuration} minutes?

If you cannot answer YES to all of these, revise your approach.`,
      });

      const text = response.text;
      if (!text || text.trim() === '') {
        throw new Error('Empty response from API. Please try again.');
      }

      return text;
    } catch (error: any) {
      console.error('Error in enhanceScript:', error);
      throw new Error(error?.message || 'Failed to generate meditation script. Please try again.');
    }
  },

  /**
   * Fast response for simple edits or prompts.
   */
  async quickEdit(instruction: string, text: string): Promise<string> {
    const ai = await getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Instruction: ${instruction}\n\nContent: ${text}`,
    });
    return response.text || text;
  },

  /**
   * Transcribe audio to text.
   * TODO: Implement using Gemini's audio capabilities or a dedicated transcription service.
   * @param _audioBase64 - Base64 encoded audio data (currently unused)
   */
  async transcribeAudio(_audioBase64: string): Promise<string> {
    // Voice transcription feature is not yet implemented
    // This would require either:
    // 1. Gemini's audio input capabilities
    // 2. A dedicated transcription service (Whisper, etc.)
    console.warn('Voice transcription is not yet implemented. Please type your meditation prompt instead.');
    return '';
  },

  /**
   * Harmonize a meditation script by intelligently adding audio tags
   * Uses Gemini AI to analyze the script and insert [pause], [deep breath], etc. at appropriate places
   * @param script - The meditation script to harmonize
   */
  async harmonizeScript(script: string): Promise<string> {
    // Validate input before making API call
    if (!script?.trim()) {
      throw new Error('Script is required for harmonization.');
    }

    try {
      // Use Edge Functions if available (secure, API key server-side)
      const { isEdgeFunctionAvailable, geminiHarmonizeScript } = await import('./src/lib/edgeFunctions');
      if (USE_EDGE_FUNCTIONS && await isEdgeFunctionAvailable()) {
        return geminiHarmonizeScript(script);
      }

      // Legacy fallback for unauthenticated users
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error('Please sign in to harmonize scripts.');
      }

      const ai = await getAI();

      const prompt = `You are enhancing a meditation script by adding audio tags at natural pause points.

MEDITATION SCRIPT:
"${script}"

AUDIO TAGS TO INSERT (use these EXACTLY as shown):
- [pause] - Short 2-3 second pause, use after phrases or short sentences
- [long pause] - Extended 4-5 second pause, use between major sections or after profound statements
- [deep breath] - Breathing cue, use before or after breathing instructions
- [exhale slowly] - Slow exhale cue, use when guiding relaxation
- [silence] - Complete silence moment, use for reflection points

HARMONIZATION RULES:
1. Add [pause] after sentences that introduce new imagery or concepts
2. Add [long pause] between major sections (opening, grounding, core, closing)
3. Add [deep breath] before phrases like "breathe in", "take a breath", "inhale"
4. Add [exhale slowly] after phrases like "breathe out", "release", "let go"
5. Add [silence] at moments of deep reflection or before final closing
6. Don't over-tag - aim for 1-2 tags per paragraph maximum
7. Preserve the original text EXACTLY - only add tags between sentences/phrases
8. Never add tags in the middle of a sentence

OUTPUT: The complete harmonized script with audio tags inserted. No explanations, just the enhanced script.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      const text = response.text;
      if (!text || text.trim() === '') {
        throw new Error('Empty response from API. Please try again.');
      }

      // Validate and sanitize harmonized output to prevent XSS
      return validateHarmonizedOutput(text);
    } catch (error: any) {
      console.error('Error in harmonizeScript:', error);
      throw new Error(error?.message || 'Failed to harmonize script. Please try again.');
    }
  },

  /**
   * Extend an existing meditation script into a longer, more immersive version
   * Uses Edge Functions for secure API key handling
   * @param existingScript - The current meditation script to expand
   */
  async extendScript(existingScript: string): Promise<string> {
    try {
      // Use Edge Functions if available (secure, API key server-side)
      const { isEdgeFunctionAvailable, geminiExtendScript } = await import('./src/lib/edgeFunctions');
      if (USE_EDGE_FUNCTIONS && await isEdgeFunctionAvailable()) {
        return geminiExtendScript(existingScript);
      }

      // Legacy fallback for unauthenticated users (dynamically loads 250KB SDK)
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error('Please sign in to extend meditation scripts.');
      }

      const ai = await getAI();

      const prompt = `You are expanding a guided meditation script into a longer, more immersive version.

EXISTING SCRIPT:
"${existingScript}"

TASK: Expand this meditation into a longer version (250-350 words) while preserving its essence, tone, and flow.

EXPANSION GUIDELINES:
- Keep the original opening and adapt it naturally into the expanded version
- Add deeper visualizations with richer sensory details
- Include additional breathing exercises or body awareness moments
- Expand the core meditation experience with more guided imagery
- Add gentle transitions between sections
- Maintain the same peaceful, professional tone throughout
- Keep the closing sentiment but make it feel like a natural conclusion to the longer journey
- Preserve any existing audio tags like [pause], [deep breath], etc. and add more where appropriate

OUTPUT: The complete expanded meditation script only, no explanations or labels.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      const text = response.text;
      if (!text || text.trim() === '') {
        throw new Error('Empty response from API. Please try again.');
      }

      return text;
    } catch (error: any) {
      console.error('Error in extendScript:', error);
      throw new Error(error?.message || 'Failed to extend meditation script. Please try again.');
    }
  },

  // NOTE: TTS is now handled by voiceService using Chatterbox via Replicate
  // Gemini TTS was removed as there's no backend implementation
};

/**
 * Creates a WAV file header for raw PCM data.
 * This allows us to use the browser's native, non-blocking decodeAudioData.
 */
function createWavHeader(pcmLength: number, sampleRate: number = 24000, channels: number = 1, bitsPerSample: number = 16): ArrayBuffer {
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;
  const dataSize = pcmLength;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // File size - 8
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1 size (16 for PCM)
  view.setUint16(20, 1, true); // Audio format (1 = PCM)
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  return buffer;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Decodes base64 PCM data into an AudioBuffer for playback.
 * Uses native browser decodeAudioData for GPU-accelerated decoding.
 */
export async function decodeAudioBuffer(base64: string, ctx: AudioContext): Promise<AudioBuffer> {
  // Convert base64 to binary using atob (avoids CSP issues with data: URLs)
  const binaryString = atob(base64);
  const pcmData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    pcmData[i] = binaryString.charCodeAt(i);
  }

  // Create WAV header for the PCM data
  const wavHeader = createWavHeader(pcmData.byteLength, 24000, 1, 16);

  // Combine header and PCM data into a valid WAV file
  const wavBuffer = new Uint8Array(wavHeader.byteLength + pcmData.byteLength);
  wavBuffer.set(new Uint8Array(wavHeader), 0);
  wavBuffer.set(pcmData, wavHeader.byteLength);

  // Use native browser decoder (GPU-accelerated)
  return ctx.decodeAudioData(wavBuffer.buffer);
}

/**
 * Legacy synchronous decoder (kept for fallback if needed).
 * @deprecated Use decodeAudioBuffer instead for better performance.
 */
export function decodeAudioBufferSync(base64: string, ctx: AudioContext): AudioBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const dataInt16 = new Int16Array(bytes.buffer);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(1, frameCount, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

/**
 * Utility to convert Blob to base64 string.
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
