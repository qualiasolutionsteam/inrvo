import { VoiceProfile } from '../../types';
import { elevenlabsService } from './elevenlabs';
import { geminiService, decodeAudioBuffer } from '../../geminiService';

/**
 * Strip audio tags from text before sending to TTS
 * TTS services speak these literally which causes timing sync issues
 */
function stripAudioTags(text: string): string {
  return text.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Unified voice service that routes between Gemini and ElevenLabs
 */
export const voiceService = {
  /**
   * Generates speech using the appropriate TTS provider
   * @param text - Text to synthesize
   * @param voice - Voice profile object
   * @param audioContext - AudioContext for decoding (optional)
   * @returns Promise<{ audioBuffer: AudioBuffer, base64: string }> - Generated audio
   */
  async generateSpeech(
    text: string,
    voice: VoiceProfile,
    audioContext?: AudioContext
  ): Promise<{ audioBuffer: AudioBuffer; base64: string }> {
    // Strip audio tags before sending to TTS - they would be spoken literally
    const cleanText = stripAudioTags(text);

    // Check if this is a cloned voice with ElevenLabs ID
    if (voice.isCloned && voice.elevenlabsVoiceId) {
      // Use ElevenLabs for cloned voices
      const base64 = await elevenlabsService.generateSpeech(cleanText, voice.elevenlabsVoiceId);

      // Decode to AudioBuffer if needed
      if (audioContext) {
        const audioBuffer = await this.decodeElevenLabsAudio(base64, audioContext);
        return { audioBuffer, base64 };
      }

      return { audioBuffer: null as any, base64 };
    } else {
      // Fall back to Gemini for prebuilt voices
      const base64 = await geminiService.generateSpeech(cleanText, voice.voiceName);

      // Decode to AudioBuffer if needed
      if (audioContext) {
        const audioBuffer = await decodeAudioBuffer(base64, audioContext);
        return { audioBuffer, base64 };
      }

      return { audioBuffer: null as any, base64 };
    }
  },

  /**
   * Decodes ElevenLabs MP3 audio to AudioBuffer
   * ElevenLabs returns MP3, need to decode it
   */
  async decodeElevenLabsAudio(base64: string, audioContext: AudioContext): Promise<AudioBuffer> {
    const response = await fetch(`data:audio/mpeg;base64,${base64}`);
    const arrayBuffer = await response.arrayBuffer();

    return audioContext.decodeAudioData(arrayBuffer);
  },

  /**
   * Checks if a voice is ready for TTS generation
   */
  async isVoiceReady(voice: VoiceProfile): Promise<boolean> {
    if (!voice.isCloned || !voice.elevenlabsVoiceId) {
      // Prebuilt Gemini voices are always ready
      return true;
    }

    try {
      const status = await elevenlabsService.getVoiceStatus(voice.elevenlabsVoiceId);
      return status === 'ready' || status === 'complete';
    } catch (error) {
      console.error('Failed to check voice status:', error);
      return false;
    }
  },

  /**
   * Gets estimated credit cost for an operation
   */
  getEstimatedCost(text: string, isCloning: boolean = false): number {
    // Credits configuration
    const CLONE_COST = 5000; // 5,000 credits to clone
    const TTS_COST_PER_1K_CHARS = 280; // 280 credits per 1K characters

    if (isCloning) {
      return CLONE_COST;
    }

    // Calculate TTS cost based on text length
    const charCount = text.length;
    const cost = Math.ceil((charCount / 1000) * TTS_COST_PER_1K_CHARS);
    return cost;
  },
};

// Export the existing services for backward compatibility
// These are already imported at the top of the file