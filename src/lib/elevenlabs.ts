// ElevenLabs API service for voice cloning and TTS
// All API keys are stored server-side in Edge Functions
// Frontend only sends JWT token for authentication

import {
  elevenLabsTTS,
  elevenLabsCloneVoice,
  elevenLabsDeleteVoice,
  elevenLabsGetVoiceStatus,
} from './edgeFunctions';

// Voice status cache to reduce API calls (5-minute TTL)
const voiceStatusCache = new Map<string, { status: string; timestamp: number }>();
const VOICE_STATUS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedVoiceStatus(voiceId: string): string | null {
  const cached = voiceStatusCache.get(voiceId);
  if (cached && Date.now() - cached.timestamp < VOICE_STATUS_CACHE_TTL) {
    return cached.status;
  }
  return null;
}

function setCachedVoiceStatus(voiceId: string, status: string): void {
  voiceStatusCache.set(voiceId, { status, timestamp: Date.now() });
}

// Clear stale cache entries periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of voiceStatusCache.entries()) {
    if (now - value.timestamp > VOICE_STATUS_CACHE_TTL * 2) {
      voiceStatusCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

export interface VoiceCloningOptions {
  name: string;
  description?: string;
  labels?: Record<string, string>;
}

export interface TTSOptions {
  model_id?: string;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export interface VoiceCloningResult {
  voice_id: string;
  name: string;
}

/**
 * Check if ElevenLabs is configured
 * With Edge Functions, we just need to be authenticated
 */
export function isElevenLabsConfigured(): boolean {
  // Edge Functions handle API keys server-side
  // We just need Supabase to be configured for auth
  return true;
}

export const elevenlabsService = {
  /**
   * Creates an instant voice clone from audio sample
   * Uses Edge Functions for secure API key handling
   * @param audioBlob - Audio blob (recommended 30+ seconds for best quality)
   * @param options - Voice cloning options
   * @returns Promise<string> - Voice ID
   */
  async cloneVoice(audioBlob: Blob, options: VoiceCloningOptions): Promise<string> {
    // Validate audio duration first
    let duration = 0;
    try {
      duration = await getAudioDuration(audioBlob);
      console.log(`Audio duration: ${duration.toFixed(1)}s`);

      if (duration < 10) {
        throw new Error(`Audio is too short (${duration.toFixed(1)}s). Please record at least 10 seconds for basic quality, 30+ seconds recommended.`);
      }
    } catch (e: any) {
      if (e.message?.includes('too short')) {
        throw e;
      }
      console.warn('Could not determine audio duration, proceeding anyway:', e.message);
    }

    // Convert WebM to WAV for better compatibility
    let audioFile: Blob;

    if (audioBlob.type === 'audio/webm' || audioBlob.type.includes('webm')) {
      try {
        console.log('Converting WebM to WAV for better compatibility...');
        audioFile = await convertToWav(audioBlob);
        console.log(`Converted to WAV: ${(audioFile.size / 1024).toFixed(1)} KB`);
      } catch (conversionError) {
        console.warn('WAV conversion failed, using original:', conversionError);
        audioFile = audioBlob;
      }
    } else {
      audioFile = audioBlob;
    }

    // Use Edge Functions (secure, API key server-side)
    console.log('Uploading voice via Edge Function...');
    const voiceId = await elevenLabsCloneVoice(audioFile, options.name, options.description);
    console.log(`Voice cloned successfully! Voice ID: ${voiceId}`);
    return voiceId;
  },

  /**
   * Generates speech using a cloned voice
   * Uses Edge Functions for secure API key handling
   * @param text - Text to synthesize
   * @param voiceId - Voice ID from cloning
   * @param options - TTS options
   * @returns Promise<string> - Base64 encoded audio (MP3)
   */
  async generateSpeech(
    text: string,
    voiceId: string,
    options: TTSOptions = {}
  ): Promise<string> {
    if (!text || text.trim() === '') {
      throw new Error('Text is required for speech generation');
    }

    // Use Edge Functions (secure, API key server-side)
    // Default settings optimized for meditative, calm delivery
    return elevenLabsTTS(voiceId, text, {
      stability: options.voice_settings?.stability ?? 0.75,        // Higher = calmer
      similarity_boost: options.voice_settings?.similarity_boost ?? 0.7,
      style: options.voice_settings?.style ?? 0.15,                // Low = more soothing
      use_speaker_boost: options.voice_settings?.use_speaker_boost ?? true,
    });
  },

  /**
   * Gets the status of a voice with caching (5-minute TTL)
   * Uses Edge Functions for secure API key handling
   * @param voiceId - Voice ID to check
   * @returns Promise<string> - Status ('ready' if voice exists, 'deleted' if not)
   */
  async getVoiceStatus(voiceId: string): Promise<string> {
    // Check cache first
    const cached = getCachedVoiceStatus(voiceId);
    if (cached !== null) {
      return cached;
    }

    // Fetch from API and cache result
    const status = await elevenLabsGetVoiceStatus(voiceId);
    setCachedVoiceStatus(voiceId, status);
    return status;
  },

  /**
   * Invalidates the voice status cache for a specific voice
   * Call this after cloning or deleting a voice
   */
  invalidateVoiceCache(voiceId: string): void {
    voiceStatusCache.delete(voiceId);
  },

  /**
   * Deletes a voice clone from ElevenLabs
   * Uses Edge Functions for secure API key handling
   * @param voiceId - Voice ID to delete
   */
  async deleteVoice(voiceId: string): Promise<void> {
    await elevenLabsDeleteVoice(voiceId);
    // Invalidate cache after deletion
    this.invalidateVoiceCache(voiceId);
  },
};

/**
 * Helper function to get audio duration from a blob
 * Includes timeout to prevent hanging on malformed audio
 */
async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    const url = URL.createObjectURL(blob);

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Timeout getting audio duration'));
    }, 5000);

    audio.addEventListener('loadedmetadata', () => {
      clearTimeout(timeout);
      const duration = audio.duration;
      URL.revokeObjectURL(url);

      // Handle Infinity duration (common with WebM)
      if (!isFinite(duration) || duration === Infinity) {
        // Estimate based on file size (rough approximation: ~128kbps for webm)
        const estimatedDuration = (blob.size / 16000); // bytes / (128kbps / 8)
        console.log(`Duration was Infinity, estimating: ${estimatedDuration.toFixed(1)}s`);
        resolve(estimatedDuration);
      } else {
        resolve(duration);
      }
    });

    audio.addEventListener('error', () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load audio metadata'));
    });

    audio.src = url;
  });
}

/**
 * Convert WebM audio to WAV format for better ElevenLabs compatibility
 * Uses Web Audio API for decoding and manual WAV encoding
 */
async function convertToWav(webmBlob: Blob): Promise<Blob> {
  const audioContext = new AudioContext({ sampleRate: 44100 });

  try {
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Encode as WAV
    const wavBuffer = encodeWAV(audioBuffer);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  } finally {
    await audioContext.close();
  }
}

/**
 * Encode an AudioBuffer to WAV format
 */
function encodeWAV(audioBuffer: AudioBuffer): ArrayBuffer {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  // Interleave channels
  const length = audioBuffer.length * numChannels * (bitDepth / 8);
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  // Write audio data
  const channelData: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channelData.push(audioBuffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Converts base64 audio to blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
