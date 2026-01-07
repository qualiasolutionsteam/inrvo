import { VoiceProfile, VoiceProvider } from '../../types';
import { webSpeechService, isWebSpeechAvailable } from './webSpeechService';

// Debug logging - only enabled in development
const DEBUG = import.meta.env?.DEV ?? false;

// Feature flag for V3 model (must match backend elevenlabsConfig.ts)
const USE_V3_MODEL = true;

// Voice service supports ElevenLabs (primary) and Web Speech API (fallback):
// - 'elevenlabs': ElevenLabs API (primary - best quality voice cloning)
// - 'browser': Free Web Speech API (built-in browser TTS)

/**
 * Prepare meditation text for V3 model
 * Transforms INrVO tags to V3-native audio tags
 */
function prepareMeditationTextV3(text: string): string {
  return text
    // Breathing tags -> V3 [sighs] with descriptive text
    .replace(/\[deep breath\]/gi, '[sighs] Take a deep breath... [sighs]')
    .replace(/\[exhale slowly\]/gi, 'and exhale slowly... [sighs]')
    .replace(/\[inhale\]/gi, '[sighs]... breathe in...')
    .replace(/\[exhale\]/gi, '...breathe out... [sighs]')
    .replace(/\[breath\]/gi, '[sighs]')
    .replace(/\[breathe in\]/gi, '[sighs]... breathe in...')
    .replace(/\[breathe out\]/gi, '...breathe out... [sighs]')
    // Pause tags -> ellipses (V3 respects punctuation)
    .replace(/\[pause\]/gi, '...')
    .replace(/\[short pause\]/gi, '..')
    .replace(/\[long pause\]/gi, '......')
    .replace(/\[silence\]/gi, '........')
    // Voice modifiers -> V3 native tags
    .replace(/\[whisper\]/gi, '[whispers]')
    .replace(/\[soft voice\]/gi, '[calm]')
    .replace(/\[sigh\]/gi, '[sighs]')
    .replace(/\[calm\]/gi, '[calm]')
    .replace(/\[thoughtfully\]/gi, '[thoughtfully]')
    // Sound effects
    .replace(/\[hum\]/gi, '[calm]... mmm...')
    .replace(/\[soft hum\]/gi, '[calm]... mmm...')
    .replace(/\[gentle giggle\]/gi, '... [calm]...')
    // Handle [whisper: text] syntax
    .replace(/\[whisper:\s*([^\]]+)\]/gi, '[whispers] $1 [calm]')
    // Clean up any remaining unknown tags -> ellipses
    .replace(/\[[^\]]*\]/g, '...')
    // Normalize excessive periods
    .replace(/\.{9,}/g, '........')
    .trim();
}

/**
 * Prepare meditation text for V2 model (fallback)
 * Converts audio tags to natural pauses using ellipses
 */
function prepareMeditationTextV2(text: string): string {
  return text
    // Convert meditation tags to natural pauses
    .replace(/\[pause\]/gi, '...')
    .replace(/\[long pause\]/gi, '......')
    .replace(/\[deep breath\]/gi, '... take a deep breath ...')
    .replace(/\[exhale slowly\]/gi, '... and exhale slowly ...')
    .replace(/\[sigh\]/gi, '...')
    .replace(/\[breath\]/gi, '...')
    .replace(/\[silence\]/gi, '........')
    // Clean up any remaining brackets (unknown tags)
    .replace(/\[[^\]]*\]/g, '...')
    // Normalize multiple periods
    .replace(/\.{7,}/g, '......')
    .trim();
}

/**
 * Prepare meditation text based on model version
 */
function prepareMeditationText(text: string): string {
  return USE_V3_MODEL ? prepareMeditationTextV3(text) : prepareMeditationTextV2(text);
}

/**
 * Check if a voice profile needs to be re-cloned for ElevenLabs migration
 */
export function needsReclone(voice: VoiceProfile): boolean {
  // Legacy providers need re-cloning
  if (voice.provider === 'fish-audio' || voice.provider === 'chatterbox') {
    return !voice.elevenLabsVoiceId;
  }
  // Check cloning status
  if (voice.cloningStatus === 'NEEDS_RECLONE') {
    return true;
  }
  // Cloned voices without ElevenLabs ID need migration
  if (voice.isCloned && !voice.elevenLabsVoiceId) {
    return true;
  }
  return false;
}

/**
 * Unified voice service that routes between providers:
 * - 'elevenlabs': ElevenLabs API (primary - best quality)
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
  ): Promise<{ audioBuffer: AudioBuffer | null; base64: string; usedWebSpeech?: boolean; needsReclone?: boolean }> {
    // Check if voice needs re-cloning (legacy Fish Audio/Chatterbox voice)
    if (needsReclone(voice)) {
      return {
        audioBuffer: null,
        base64: '',
        needsReclone: true,
      };
    }

    // Prepare text for meditation-style delivery
    const meditationText = prepareMeditationText(text);

    const provider = voice.provider || this.detectProvider(voice);

    // Route to appropriate provider
    switch (provider) {
      case 'browser':
        return this.generateWithWebSpeech(meditationText, voice);

      case 'elevenlabs':
      default:
        // ElevenLabs is the primary provider
        return this.generateWithElevenLabs(meditationText, voice, audioContext);
    }
  },

  /**
   * Detect provider from voice profile
   * Routes to appropriate TTS backend:
   * - 'elevenlabs': Primary (best quality, voice cloning)
   * - 'browser': Web Speech API (free, works offline)
   */
  detectProvider(voice: VoiceProfile): VoiceProvider {
    // Check for browser voices first
    if (voice.id.startsWith('browser-')) return 'browser';

    // Check for preset ElevenLabs voices
    if (voice.id.startsWith('elevenlabs-')) return 'elevenlabs';

    // ElevenLabs voices (primary)
    if (voice.elevenLabsVoiceId) {
      return 'elevenlabs';
    }

    // Legacy providers should use browser fallback until re-cloned
    if (voice.provider === 'fish-audio' || voice.provider === 'chatterbox') {
      // These need migration - fall back to browser
      if (DEBUG) console.log('[voiceService] Legacy voice detected, needs re-clone:', voice.id);
      return 'browser';
    }

    // Any cloned voice with ElevenLabs voice ID
    if (voice.isCloned && voice.elevenLabsVoiceId) {
      return 'elevenlabs';
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
   * Generate speech using ElevenLabs API
   */
  async generateWithElevenLabs(
    text: string,
    voice: VoiceProfile,
    audioContext?: AudioContext
  ): Promise<{ audioBuffer: AudioBuffer | null; base64: string }> {
    // Import dynamically to avoid circular dependency
    const { generateSpeech } = await import('./edgeFunctions');

    // Determine voice ID to use
    // For preset voices, use the elevenLabsVoiceId directly
    // For user clones, use the voice profile ID (edge function will look up elevenLabsVoiceId)
    const isPresetVoice = voice.id.startsWith('elevenlabs-');

    // Call generate-speech edge function
    const base64 = await generateSpeech(
      isPresetVoice ? undefined : voice.id,  // voiceId for user clones
      text,
      isPresetVoice ? voice.elevenLabsVoiceId : undefined  // elevenLabsVoiceId for presets
    );

    // Decode to AudioBuffer if needed
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
    _mimeType: string = 'audio/mpeg'  // Kept for backward compatibility, but unused
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
      });

      return audioBuffer;
    } catch (error) {
      console.error('[voiceService] Failed to decode audio:', {
        error,
        audioSize: bytes.length,
        firstBytes: Array.from(bytes.slice(0, 12)).map(b => b.toString(16).padStart(2, '0')).join(' '),
      });
      throw new Error(`Failed to decode audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Checks if a voice is ready for TTS generation
   */
  async isVoiceReady(voice: VoiceProfile): Promise<boolean> {
    // Check if voice needs re-cloning first
    if (needsReclone(voice)) {
      return false;
    }

    const provider = voice.provider || this.detectProvider(voice);

    switch (provider) {
      case 'browser':
        // Browser voices are always ready if Web Speech API is available
        return isWebSpeechAvailable();

      case 'elevenlabs':
      default:
        // ElevenLabs voices are ready if they have a voice ID
        return !!voice.elevenLabsVoiceId;
    }
  },

  /**
   * Gets estimated credit cost for an operation
   * Note: ElevenLabs uses character-based pricing
   */
  getEstimatedCost(text: string, isCloning: boolean = false): number {
    // Credits configuration (mapped to ElevenLabs pricing)
    const CLONE_COST = 5000; // Voice cloning cost
    const TTS_COST_PER_1K_CHARS = 300; // ~300 credits per 1K characters

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
