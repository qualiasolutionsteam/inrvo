import { VoiceProfile, VoiceProvider } from '../../types';
import { webSpeechService, isWebSpeechAvailable } from './webSpeechService';
// Voice service supports multiple providers:
// - 'fish-audio': Fish Audio API (primary - best quality, real-time)
// - 'chatterbox': Chatterbox via Replicate (fallback)
// - 'browser': Free Web Speech API (built-in browser TTS)

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
 * - 'fish-audio': Fish Audio API (primary - best quality)
 * - 'chatterbox': Chatterbox via Replicate (fallback)
 * - 'browser': Free Web Speech API
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

      case 'fish-audio':
        // Fish Audio uses unified generate-speech endpoint (handles fallback internally)
        return this.generateWithFishAudio(meditationText, voice, audioContext);

      case 'chatterbox':
      default:
        return this.generateWithChatterbox(meditationText, voice, audioContext);
    }
  },

  /**
   * Detect provider from voice profile
   * Routes to appropriate TTS backend:
   * - 'fish-audio': Primary (best quality, real-time API)
   * - 'chatterbox': Fallback (via Replicate)
   * - 'browser': Web Speech API (free, works offline)
   */
  detectProvider(voice: VoiceProfile): VoiceProvider {
    // Check for browser voices first
    if (voice.id.startsWith('browser-')) return 'browser';

    // Fish Audio voices (primary)
    if (voice.provider === 'fish-audio') {
      return 'fish-audio';
    }

    // ElevenLabs voices go through unified endpoint (routes internally)
    if (voice.provider === 'ElevenLabs') {
      return 'fish-audio';  // Unified endpoint handles fallback
    }

    // Chatterbox voices with proper setup
    if (voice.provider === 'chatterbox' && (voice.providerVoiceId || voice.isCloned)) {
      return 'fish-audio';  // Route through unified endpoint for Fish Audio fallback
    }

    // Any cloned voice with voice data - use unified endpoint
    if (voice.providerVoiceId || voice.isCloned) {
      return 'fish-audio';  // Unified endpoint handles provider selection
    }

    // Voices without proper setup fall back to free browser TTS
    return 'browser';
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
   * Generate speech using Fish Audio (with automatic Chatterbox fallback)
   * Uses the unified generate-speech endpoint which handles provider selection
   */
  async generateWithFishAudio(
    text: string,
    voice: VoiceProfile,
    audioContext?: AudioContext
  ): Promise<{ audioBuffer: AudioBuffer | null; base64: string }> {
    // Import dynamically to avoid circular dependency
    const { generateSpeech } = await import('./edgeFunctions');

    // Use voice profile ID - the edge function will look up the voice
    const voiceId = voice.id;

    // Call generate-speech edge function (handles Fish Audio with Chatterbox fallback)
    const base64 = await generateSpeech(voiceId, text);

    // Decode to AudioBuffer if needed (Fish Audio returns MP3, Chatterbox returns WAV)
    if (audioContext) {
      // Try MP3 first (Fish Audio), fall back to WAV (Chatterbox)
      try {
        const audioBuffer = await this.decodeAudio(base64, audioContext, 'audio/mpeg');
        return { audioBuffer, base64 };
      } catch {
        // Fallback to WAV decoding
        const audioBuffer = await this.decodeAudio(base64, audioContext, 'audio/wav');
        return { audioBuffer, base64 };
      }
    }

    return { audioBuffer: null, base64 };
  },

  /**
   * Generate speech using Chatterbox via edge function (legacy/fallback)
   */
  async generateWithChatterbox(
    text: string,
    voice: VoiceProfile,
    audioContext?: AudioContext
  ): Promise<{ audioBuffer: AudioBuffer | null; base64: string }> {
    // Import dynamically to avoid circular dependency
    const { generateSpeech } = await import('./edgeFunctions');

    // Use voice profile ID - the edge function will look up the voice
    const voiceId = voice.id;

    // Call generate-speech edge function
    const base64 = await generateSpeech(voiceId, text);

    // Decode to AudioBuffer if needed (Chatterbox returns WAV)
    if (audioContext) {
      const audioBuffer = await this.decodeAudio(base64, audioContext, 'audio/wav');
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
   * Checks if a voice is ready for TTS generation
   */
  async isVoiceReady(voice: VoiceProfile): Promise<boolean> {
    const provider = voice.provider || this.detectProvider(voice);

    switch (provider) {
      case 'browser':
        // Browser voices are always ready if Web Speech API is available
        return isWebSpeechAvailable();

      case 'fish-audio':
      case 'chatterbox':
      default:
        // Cloned voices are ready if they have a voice reference
        return !!(voice.providerVoiceId || voice.isCloned);
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