import { VoiceProfile, VoiceProvider } from '../../types';
import { webSpeechService, isWebSpeechAvailable } from './webSpeechService';

// Debug logging - only enabled in development
const DEBUG = import.meta.env?.DEV ?? false;

// Voice service supports multiple providers:
// - 'fish-audio': Fish Audio API (primary - best quality, real-time)
// - 'chatterbox': Chatterbox via Replicate (fallback)
// - 'browser': Free Web Speech API (built-in browser TTS)

/**
 * Convert audio tags to Fish Audio paralanguage effects
 * Instead of stripping tags, we convert them to TTS-supported effects
 *
 * Fish Audio V1.6 supported effects:
 * - (break) - Short pause
 * - (long-break) - Extended pause
 * - (breath) - Breathing sound
 * - (sigh) - Sighing sound
 */
function convertAudioTagsToEffects(text: string): string {
  let processed = text;

  // Convert known audio tags to Fish Audio paralanguage effects
  processed = processed.replace(/\[pause\]/gi, '(break)');
  processed = processed.replace(/\[long pause\]/gi, '(long-break)');
  processed = processed.replace(/\[deep breath\]/gi, '(breath)');
  processed = processed.replace(/\[exhale slowly\]/gi, '(sigh)');
  processed = processed.replace(/\[sigh\]/gi, '(sigh)');
  processed = processed.replace(/\[breath\]/gi, '(breath)');

  // Strip any remaining unknown tags (they would be spoken literally)
  processed = processed.replace(/\[[^\]]+\]/g, '');

  return processed.replace(/\s+/g, ' ').trim();
}

/**
 * Pre-process text for meditation-style natural speech
 * Uses Fish Audio V1.6 paralanguage effects for natural pauses and breathing
 *
 * Supported Fish Audio effects:
 * - (break) - Short pause
 * - (long-break) - Extended pause
 * - (breath) - Breathing sound
 * - (sigh) - Sighing sound
 */
function prepareMeditationText(text: string): string {
  let processed = text;

  // 1. Add pauses after sentences for meditation pacing
  processed = processed.replace(/\.(\s+)(?=[A-Z])/g, '. (long-break) $1');  // Extended pause between sentences
  processed = processed.replace(/\!(\s+)(?=[A-Z])/g, '! (break) $1');       // Short pause for exclamations
  processed = processed.replace(/\?(\s+)(?=[A-Z])/g, '? (break) $1');       // Short pause for questions

  // 2. Add subtle pauses after commas for natural phrasing
  processed = processed.replace(/,(\s+)/g, ', (break) $1');

  // 3. Add breath sounds for breathing instructions
  processed = processed.replace(/\b(breathe in|inhale)\b/gi, '$1 (breath) (long-break) ');
  processed = processed.replace(/\b(breathe out|exhale)\b/gi, '$1 (sigh) (long-break) ');

  // 4. Add pauses around key meditation words for emphasis
  processed = processed.replace(
    /\b(relax|release|let go|soften|peace|calm|stillness)\b/gi,
    '(break) $1 (break)'
  );

  // 5. Convert existing ellipses to Fish Audio pauses
  processed = processed.replace(/\.{3,}/g, '(long-break)');

  // Clean up multiple spaces and redundant consecutive effects
  processed = processed.replace(/\(break\)\s*\(break\)/g, '(long-break)');
  processed = processed.replace(/\(long-break\)\s*\(long-break\)/g, '(long-break)');
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
    // Convert audio tags to Fish Audio paralanguage effects (e.g., [pause] -> (break))
    const cleanText = convertAudioTagsToEffects(text);

    // Prepare text for slower, meditation-style delivery with additional effects
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

    // Legacy ElevenLabs voices go through unified endpoint (routes internally)
    // @ts-ignore - voice.provider may have legacy 'ElevenLabs' value from database
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

    // Decode to AudioBuffer if needed
    // decodeAudio automatically detects format (MP3 from Fish Audio, WAV from Chatterbox)
    if (audioContext) {
      const audioBuffer = await this.decodeAudio(base64, audioContext);
      return { audioBuffer, base64 };
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

    // Decode to AudioBuffer if needed
    // decodeAudio automatically detects format
    if (audioContext) {
      const audioBuffer = await this.decodeAudio(base64, audioContext);
      return { audioBuffer, base64 };
    }

    return { audioBuffer: null, base64 };
  },

  /**
   * Generic audio decoder for base64 audio data
   * Supports MP3, WAV, and other formats
   *
   * Note: Web Audio API's decodeAudioData is format-agnostic and automatically
   * detects the audio format from the binary data, so MIME type is not needed.
   */
  async decodeAudio(
    base64: string,
    audioContext: AudioContext,
    mimeType: string = 'audio/mpeg'  // Kept for backward compatibility, but unused
  ): Promise<AudioBuffer> {
    // Decode base64 to binary
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert to ArrayBuffer - MUST use slice() to create properly-bounded copy
    // bytes.buffer returns the underlying ArrayBuffer which may have different size/offset
    // than the Uint8Array view, causing decodeAudioData to receive garbage data
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

    try {
      // Decode audio data - this auto-detects MP3, WAV, OGG, etc.
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Log successful decode for debugging
      if (DEBUG) console.log('[voiceService] Audio decoded successfully:', {
        duration: audioBuffer.duration.toFixed(2) + 's',
        sampleRate: audioBuffer.sampleRate + 'Hz',
        channels: audioBuffer.numberOfChannels,
        expectedMimeType: mimeType,
      });

      return audioBuffer;
    } catch (error) {
      console.error('[voiceService] Failed to decode audio:', {
        error,
        audioSize: bytes.length,
        expectedMimeType: mimeType,
        firstBytes: Array.from(bytes.slice(0, 12)).map(b => b.toString(16).padStart(2, '0')).join(' '),
      });
      throw new Error(`Failed to decode audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
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