import { VoiceProfile, VoiceProvider } from '../../types';
import { elevenlabsService } from './elevenlabs';
import { webSpeechService, isWebSpeechAvailable } from './webSpeechService';
// Voice service supports multiple providers:
// - 'browser': Free Web Speech API (built-in browser TTS)
// - 'chatterbox': Chatterbox via Replicate (cloned voices)
// - 'elevenlabs': Legacy ElevenLabs support (being phased out)

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
 * Unified voice service that routes between providers:
 * - 'browser': Free Web Speech API
 * - 'chatterbox': Chatterbox via Replicate (for cloned voices)
 * - 'elevenlabs': Legacy support
 */
export const voiceService = {
  /**
   * Generates speech using the appropriate TTS provider
   * @param text - Text to synthesize
   * @param voice - Voice profile object
   * @param audioContext - AudioContext for decoding (optional)
   * @returns Promise<{ audioBuffer: AudioBuffer | null, base64: string, usedWebSpeech?: boolean }> - Generated audio
   */
  async generateSpeech(
    text: string,
    voice: VoiceProfile,
    audioContext?: AudioContext
  ): Promise<{ audioBuffer: AudioBuffer | null; base64: string; usedWebSpeech?: boolean }> {
    // Strip audio tags before sending to TTS - they would be spoken literally
    const cleanText = stripAudioTags(text);

    // Prepare text for slower, meditation-style delivery
    const meditationText = prepareMeditationText(cleanText);

    const provider = voice.provider || this.detectProvider(voice);

    // Route to appropriate provider
    switch (provider) {
      case 'browser':
        return this.generateWithWebSpeech(meditationText, voice);

      case 'chatterbox':
        return this.generateWithChatterbox(meditationText, voice, audioContext);

      case 'elevenlabs':
      default:
        return this.generateWithElevenLabs(meditationText, voice, audioContext);
    }
  },

  /**
   * Detect provider from voice profile (for backwards compatibility)
   */
  detectProvider(voice: VoiceProfile): VoiceProvider {
    if (voice.provider) return voice.provider;
    if (voice.id.startsWith('browser-')) return 'browser';
    if (voice.providerVoiceId) return 'chatterbox';
    if (voice.elevenlabsVoiceId || voice.isCloned) return 'elevenlabs';
    return 'browser'; // Default to free browser TTS
  },

  /**
   * Generate speech using free Web Speech API
   */
  async generateWithWebSpeech(
    text: string,
    voice: VoiceProfile
  ): Promise<{ audioBuffer: null; base64: string; usedWebSpeech: true }> {
    if (!isWebSpeechAvailable()) {
      throw new Error('Web Speech API is not available in this browser. Please use a cloned voice.');
    }

    // Web Speech API plays directly - we can't get audio data
    // The caller should handle this by using webSpeechService.speak() directly
    await webSpeechService.speak(text, voice.id, {
      rate: 0.85,  // Slower for meditation
      pitch: 1.0,
      volume: 1.0,
    });

    // Return empty data since Web Speech plays directly
    return { audioBuffer: null, base64: '', usedWebSpeech: true };
  },

  /**
   * Generate speech using Chatterbox via Replicate
   */
  async generateWithChatterbox(
    text: string,
    voice: VoiceProfile,
    audioContext?: AudioContext
  ): Promise<{ audioBuffer: AudioBuffer | null; base64: string }> {
    // Import dynamically to avoid circular dependency
    const { chatterboxTTS } = await import('./edgeFunctions');

    const voiceId = voice.providerVoiceId || voice.id;

    // Call Chatterbox edge function
    const base64 = await chatterboxTTS(voiceId, text);

    // Decode to AudioBuffer if needed
    if (audioContext) {
      const audioBuffer = await this.decodeAudio(base64, audioContext, 'audio/wav');
      return { audioBuffer, base64 };
    }

    return { audioBuffer: null, base64 };
  },

  /**
   * Generate speech using ElevenLabs (legacy)
   */
  async generateWithElevenLabs(
    text: string,
    voice: VoiceProfile,
    audioContext?: AudioContext
  ): Promise<{ audioBuffer: AudioBuffer | null; base64: string }> {
    // Only cloned voices with ElevenLabs ID are supported
    if (!voice.isCloned || !voice.elevenlabsVoiceId) {
      throw new Error('Please clone a voice to generate meditations, or use a browser voice.');
    }

    // Voice settings optimized for natural, human-like meditation delivery
    const meditationTTSOptions = {
      voice_settings: {
        stability: 0.55,           // Lower = more natural variation in delivery
        similarity_boost: 0.80,    // Higher = closer to original voice sample
        style: 0.35,               // Higher = more expressiveness, less robotic
        use_speaker_boost: true,
      },
    };

    // Use ElevenLabs for cloned voices with meditation settings
    const base64 = await elevenlabsService.generateSpeech(
      text,
      voice.id, // Profile ID for ownership verification
      meditationTTSOptions
    );

    // Decode to AudioBuffer if needed
    if (audioContext) {
      const audioBuffer = await this.decodeElevenLabsAudio(base64, audioContext);
      return { audioBuffer, base64 };
    }

    return { audioBuffer: null, base64 };
  },

  /**
   * Generic audio decoder for base64 audio data
   * Supports MP3, WAV, and other formats
   */
  async decodeAudio(
    base64: string,
    audioContext: AudioContext,
    mimeType: string = 'audio/mpeg'
  ): Promise<AudioBuffer> {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);

    try {
      const response = await fetch(objectUrl);
      const arrayBuffer = await response.arrayBuffer();
      return audioContext.decodeAudioData(arrayBuffer);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  },

  /**
   * Decodes ElevenLabs MP3 audio to AudioBuffer (legacy)
   * Uses Blob + Object URL for better memory efficiency
   */
  async decodeElevenLabsAudio(base64: string, audioContext: AudioContext): Promise<AudioBuffer> {
    return this.decodeAudio(base64, audioContext, 'audio/mpeg');
  },

  /**
   * Checks if a voice is ready for TTS generation
   * Supports multiple providers
   */
  async isVoiceReady(voice: VoiceProfile): Promise<boolean> {
    const provider = voice.provider || this.detectProvider(voice);

    switch (provider) {
      case 'browser':
        // Browser voices are always ready if Web Speech API is available
        return isWebSpeechAvailable();

      case 'chatterbox':
        // Chatterbox voices are ready if they have a provider voice ID
        return !!voice.providerVoiceId;

      case 'elevenlabs':
      default:
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