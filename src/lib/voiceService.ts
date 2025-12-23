import { VoiceProfile } from '../../types';
import { elevenlabsService } from './elevenlabs';
// Note: Gemini TTS removed - only cloned ElevenLabs voices are supported

/**
 * Strip audio tags from text before sending to TTS
 * TTS services speak these literally which causes timing sync issues
 */
function stripAudioTags(text: string): string {
  return text.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Pre-process text for meditation-style natural speech
 * Adds subtle pauses at sentence boundaries for a calm but natural delivery
 */
function prepareMeditationText(text: string): string {
  let processed = text;

  // Add gentle pauses after sentences only (not after every comma)
  // Single ellipsis for natural breath pauses between sentences
  processed = processed.replace(/\.(\s+)/g, '. ... $1');
  processed = processed.replace(/\!(\s+)/g, '! ... $1');
  processed = processed.replace(/\?(\s+)/g, '? ... $1');

  // Preserve existing ellipses as longer pauses
  processed = processed.replace(/\.\.\.(?!\s*\.)/g, '..... ');

  // Clean up multiple spaces
  processed = processed.replace(/\s+/g, ' ').trim();

  return processed;
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

    // Prepare text for slower, meditation-style delivery
    const meditationText = prepareMeditationText(cleanText);

    // Only cloned voices with ElevenLabs ID are supported
    if (!voice.isCloned || !voice.elevenlabsVoiceId) {
      throw new Error('Please clone a voice to generate meditations. Default voices are no longer available.');
    }

    // Voice settings optimized for natural, human-like meditation delivery
    // Lower stability + higher style = more natural variations in tone
    const meditationTTSOptions = {
      voice_settings: {
        stability: 0.55,           // Lower = more natural variation in delivery
        similarity_boost: 0.80,    // Higher = closer to original voice sample
        style: 0.35,               // Higher = more expressiveness, less robotic
        use_speaker_boost: true,
      },
    };

    // Use ElevenLabs for cloned voices with meditation settings
    // Pass voice profile ID (not ElevenLabs ID) - edge function verifies ownership
    const base64 = await elevenlabsService.generateSpeech(
      meditationText,
      voice.id, // Profile ID for ownership verification
      meditationTTSOptions
    );

    // Decode to AudioBuffer if needed
    if (audioContext) {
      const audioBuffer = await this.decodeElevenLabsAudio(base64, audioContext);
      return { audioBuffer, base64 };
    }

    return { audioBuffer: null as any, base64 };
  },

  /**
   * Decodes ElevenLabs MP3 audio to AudioBuffer
   * ElevenLabs returns MP3, need to decode it
   * Uses Blob + Object URL for better memory efficiency (avoids data URL overhead)
   */
  async decodeElevenLabsAudio(base64: string, audioContext: AudioContext): Promise<AudioBuffer> {
    // Convert base64 to binary using atob (avoids data URL memory bloat)
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create blob and object URL (more memory efficient than data URL)
    const blob = new Blob([bytes], { type: 'audio/mpeg' });
    const objectUrl = URL.createObjectURL(blob);

    try {
      const response = await fetch(objectUrl);
      const arrayBuffer = await response.arrayBuffer();
      return audioContext.decodeAudioData(arrayBuffer);
    } finally {
      // Clean up object URL to free memory
      URL.revokeObjectURL(objectUrl);
    }
  },

  /**
   * Checks if a voice is ready for TTS generation
   * Only cloned voices are supported
   */
  async isVoiceReady(voice: VoiceProfile): Promise<boolean> {
    // Only cloned voices with ElevenLabs ID are supported
    if (!voice.isCloned || !voice.elevenlabsVoiceId) {
      return false;
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