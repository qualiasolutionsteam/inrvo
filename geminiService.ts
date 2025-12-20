
import { GoogleGenAI, Type, Modality } from "@google/genai";

// Fix: Strictly follow initialization guidelines: Always use new GoogleGenAI({apiKey: process.env.API_KEY});
const getAI = () => new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export const geminiService = {
  /**
   * Fast script generation using gemini-2.0-flash (no thinking mode).
   * Generates concise 100-150 word meditations for quick playback.
   * @param thought - The user's meditation idea/prompt
   * @param audioTags - Optional array of audio tag labels to incorporate
   */
  async enhanceScript(thought: string, audioTags?: string[]): Promise<string> {
    try {
      const ai = getAI();
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error('API key not found. Please set VITE_GEMINI_API_KEY in your environment variables.');
      }

      // Build audio tags instruction if tags are provided
      let audioTagsInstruction = '';
      if (audioTags && audioTags.length > 0) {
        audioTagsInstruction = `
Include these audio cues naturally: ${audioTags.join(', ')}.
Place them inline where they should occur (e.g., "Take a breath in... [pause] ...and release.").`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Create a short, soothing guided meditation (100-150 words) from this idea: "${thought}"

Requirements:
- Brief calming introduction (1-2 sentences)
- Core visualization or breathing exercise (main body)
- Gentle closing (1 sentence)
- Professional, peaceful tone
- Evocative sensory language${audioTagsInstruction ? '\n' + audioTagsInstruction : ''}

Output only the meditation script, no titles or labels.`,
      });

      const text = response.text;
      if (!text || text.trim() === '') {
        throw new Error('Empty response from API. Please try again.');
      }

      return text;
    } catch (error: any) {
      console.error('Error in enhanceScript:', error);
      throw new Error(error?.message || 'Failed to generate meditation script. Please check your API key and try again.');
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
   * TTS Generation using gemini-2.5-flash-preview-tts.
   * Returns base64 encoded PCM audio data.
   */
  async generateSpeech(text: string, voiceName: string = 'Zephyr'): Promise<string> {
    try {
      const ai = getAI();
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error('API key not found. Please set VITE_GEMINI_API_KEY in your environment variables.');
      }
      
      if (!text || text.trim() === '') {
        throw new Error('Text is required for speech generation.');
      }
      
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
      throw new Error(error?.message || 'Failed to generate speech. Please check your API key and try again.');
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
 * Decodes base64 PCM data into an AudioBuffer for playback.
 */
export async function decodeAudioBuffer(base64: string, ctx: AudioContext): Promise<AudioBuffer> {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const dataInt16 = new Int16Array(bytes.buffer);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(1, frameCount, 24000); // API uses 24kHz
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
