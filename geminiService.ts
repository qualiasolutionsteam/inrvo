// Lazy import for GoogleGenAI - only load when needed (fallback for unauthenticated users)
// This reduces initial bundle size by ~250KB
import { geminiTTS, geminiGenerateScript, geminiExtendScript, isEdgeFunctionAvailable } from './src/lib/edgeFunctions';

// Feature flag: Use Edge Functions for all API calls (secure, API key server-side)
const USE_EDGE_FUNCTIONS = true;

// Lazy load GoogleGenAI only when needed (deprecated fallback)
let GoogleGenAI: any = null;
let Modality: any = null;

async function getAI() {
  if (!GoogleGenAI) {
    const genai = await import('@google/genai');
    GoogleGenAI = genai.GoogleGenAI;
    Modality = genai.Modality;
  }
  return new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
}

export const geminiService = {
  /**
   * Fast script generation using gemini-2.0-flash
   * Uses Edge Functions for secure API key handling
   * @param thought - The user's meditation idea/prompt
   * @param audioTags - Optional array of audio tag labels to incorporate
   */
  async enhanceScript(thought: string, audioTags?: string[]): Promise<string> {
    try {
      // Use Edge Functions if available (secure, API key server-side)
      if (USE_EDGE_FUNCTIONS && await isEdgeFunctionAvailable()) {
        return geminiGenerateScript(thought, audioTags);
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

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `You are an expert wellness content creator. Create personalized content that PRECISELY matches the user's request.

USER'S REQUEST: "${thought}"

STEP 1 - DETECT CONTENT TYPE (do not output this, just use it internally):
- GUIDED MEDITATION: breathing, relaxation, mindfulness, visualization, chakras, grounding
- SLEEP STORY: sleep, bedtime, drifting off, rest, dreams, nighttime
- CALMING NARRATIVE: specific scene, journey, adventure, escape to a place
- AFFIRMATIONS: positive statements, mantras, self-love, confidence
- BREATHING EXERCISE: breath work, box breathing, counting breaths
- BODY SCAN: body awareness, tension release, progressive relaxation

STEP 2 - EXTRACT KEY ELEMENTS from the request:
- Specific setting mentioned (beach, forest, mountain, space, etc.)
- Specific goal (anxiety relief, focus, sleep, energy, healing)
- Specific emotions they want to feel
- Time of day context (morning, evening, night)
- Any specific techniques mentioned

STEP 3 - ADAPT YOUR RESPONSE:
Structure:
- Meditation: Opening breath → Core practice → Gentle close
- Sleep story: Scene setting → Slow journey → Fade to rest
- Affirmations: Grounding → Affirmation series → Empowerment
- Breathing: Setup → Rhythm → Guided cycles → Return

Tone:
- Sleep: Extra slow, dreamy, hypnotic, trailing sentences...
- Morning/Energy: Uplifting, awakening, vibrant yet calm
- Anxiety: Grounding, reassuring, present-moment
- Healing: Compassionate, nurturing, gentle
${audioTagsInstruction}

STEP 4 - WRITE THE SCRIPT (400-550 words for a 5-6 minute meditation):
- Use "you" for intimacy
- Rich sensory details (see, hear, feel, smell)
- Present tense
- Include frequent pauses using [pause], [long pause], [deep breath] tags
- Natural pauses via ellipses...
- Fresh, evocative language (avoid clichés)
- Build the experience gradually - don't rush
- Include opening grounding, main practice, and gentle closing
- Add breathing cues throughout: [deep breath], [exhale slowly]

PACING GUIDELINES:
- Start with grounding (30-50 words)
- Include 3-5 breathing moments with [deep breath] or [exhale slowly]
- Add [pause] after important phrases
- Add [long pause] between major sections
- End with gentle return to awareness (40-60 words)

OUTPUT: Only the script. No titles, headers, or explanations. Start immediately with the experience.

CRITICAL: Match EXACTLY what the user asked for. If they want a beach visualization, give them a beach. If they want sleep help, make it sleep-focused. Accuracy to their request is paramount.`,
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
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Instruction: ${instruction}\n\nContent: ${text}`,
    });
    return response.text || text;
  },

  /**
   * Extend an existing meditation script into a longer, more immersive version
   * Uses Edge Functions for secure API key handling
   * @param existingScript - The current meditation script to expand
   */
  async extendScript(existingScript: string): Promise<string> {
    try {
      // Use Edge Functions if available (secure, API key server-side)
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

  /**
   * TTS Generation using gemini-2.5-flash-preview-tts.
   * Uses Edge Functions for secure API key handling
   * Returns base64 encoded PCM audio data.
   */
  async generateSpeech(text: string, voiceName: string = 'Zephyr'): Promise<string> {
    try {
      if (!text || text.trim() === '') {
        throw new Error('Text is required for speech generation.');
      }

      // Use Edge Functions if available (secure, API key server-side)
      if (USE_EDGE_FUNCTIONS && await isEdgeFunctionAvailable()) {
        return geminiTTS(text, voiceName);
      }

      // Legacy fallback for unauthenticated users (dynamically loads 250KB SDK)
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error('Please sign in to generate speech.');
      }

      const ai = await getAI();

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData || audioData.trim() === '') {
        throw new Error('Empty audio response from API. Please try again.');
      }

      return audioData;
    } catch (error: any) {
      console.error('Error in generateSpeech:', error);
      throw new Error(error?.message || 'Failed to generate speech. Please try again.');
    }
  },

  /**
   * Audio Transcription using gemini-3-flash-preview.
   * Processes recorded audio blob converted to base64.
   */
  async transcribeAudio(base64Audio: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Audio, mimeType: 'audio/webm' } },
          { text: "Please transcribe this audio. Only return the transcribed text, nothing else." }
        ]
      },
    });
    return response.text || "";
  }
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
