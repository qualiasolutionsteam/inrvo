// ElevenLabs API service for voice cloning and TTS
// Uses the correct /v1/voices/add endpoint for instant voice cloning

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io';

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
 * Check if ElevenLabs API key is configured
 */
export function isElevenLabsConfigured(): boolean {
  return !!ELEVENLABS_API_KEY;
}

export const elevenlabsService = {
  /**
   * Creates an instant voice clone from audio sample using the correct /v1/voices/add endpoint
   * @param audioBlob - Audio blob (recommended 30+ seconds for best quality)
   * @param options - Voice cloning options
   * @returns Promise<VoiceCloningResult> - Voice ID and name
   */
  async cloneVoice(audioBlob: Blob, options: VoiceCloningOptions): Promise<string> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured. Please add VITE_ELEVENLABS_API_KEY to your .env.local file.');
    }

    // Get audio duration for validation/warning (not blocking)
    let duration = 0;
    try {
      duration = await getAudioDuration(audioBlob);
      console.log(`Audio duration: ${duration.toFixed(1)}s`);

      // Warn if less than recommended duration but don't block
      if (duration < 10) {
        throw new Error(`Audio is too short (${duration.toFixed(1)}s). Please record at least 10 seconds for basic quality, 30+ seconds recommended.`);
      }
    } catch (e: any) {
      // If duration check fails, log warning but continue
      if (e.message?.includes('too short')) {
        throw e;
      }
      console.warn('Could not determine audio duration, proceeding anyway:', e.message);
    }

    // Convert WebM to WAV for better compatibility with ElevenLabs
    let audioFile: Blob;
    let fileName: string;

    if (audioBlob.type === 'audio/webm' || audioBlob.type.includes('webm')) {
      try {
        console.log('Converting WebM to WAV for better compatibility...');
        audioFile = await convertToWav(audioBlob);
        fileName = 'voice_sample.wav';
        console.log(`Converted to WAV: ${(audioFile.size / 1024).toFixed(1)} KB`);
      } catch (conversionError) {
        console.warn('WAV conversion failed, using original WebM:', conversionError);
        audioFile = audioBlob;
        fileName = 'voice_sample.webm';
      }
    } else if (audioBlob.type === 'audio/mpeg' || audioBlob.type === 'audio/mp3') {
      audioFile = audioBlob;
      fileName = 'voice_sample.mp3';
    } else if (audioBlob.type === 'audio/wav' || audioBlob.type === 'audio/wave') {
      audioFile = audioBlob;
      fileName = 'voice_sample.wav';
    } else {
      // Default to original blob with webm extension
      audioFile = audioBlob;
      fileName = 'voice_sample.webm';
    }

    // Create multipart form data for the /v1/voices/add endpoint
    const formData = new FormData();
    formData.append('name', options.name);
    formData.append('files', audioFile, fileName);

    if (options.description) {
      formData.append('description', options.description);
    }

    // Add labels if provided (must be JSON string)
    if (options.labels) {
      formData.append('labels', JSON.stringify(options.labels));
    }

    console.log('Uploading voice to ElevenLabs /v1/voices/add...');

    // Single request to /v1/voices/add - this is the correct endpoint for instant voice cloning
    const response = await fetch(`${ELEVENLABS_BASE_URL}/v1/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        // DO NOT set Content-Type header - let browser set multipart boundary automatically
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Voice cloning failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail?.message || errorData.detail || errorData.message || `HTTP ${response.status}`;

        // Provide helpful error messages for common issues
        if (response.status === 401) {
          errorMessage = 'Invalid ElevenLabs API key. Please check your VITE_ELEVENLABS_API_KEY.';
        } else if (response.status === 422) {
          errorMessage = `Invalid request: ${errorMessage}. Make sure your audio is clear and at least 10 seconds long.`;
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        }
      } catch {
        errorMessage = `Voice cloning failed with status ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data.voice_id) {
      throw new Error('No voice_id returned from ElevenLabs API');
    }

    console.log(`Voice cloned successfully! Voice ID: ${data.voice_id}`);
    return data.voice_id;
  },

  /**
   * Generates speech using a cloned voice
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
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    if (!text || text.trim() === '') {
      throw new Error('Text is required for speech generation');
    }

    const requestData = {
      text,
      model_id: options.model_id || 'eleven_multilingual_v2',
      voice_settings: {
        stability: options.voice_settings?.stability ?? 0.5,
        similarity_boost: options.voice_settings?.similarity_boost ?? 0.75,
        style: options.voice_settings?.style ?? 0.0,
        use_speaker_boost: options.voice_settings?.use_speaker_boost ?? true,
      },
    };

    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify(requestData),
      }
    );

    if (!response.ok) {
      let errorMessage = 'TTS generation failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail?.message || errorData.detail || errorData.message || `HTTP ${response.status}`;

        if (response.status === 401) {
          errorMessage = 'Invalid ElevenLabs API key';
        } else if (response.status === 404) {
          errorMessage = 'Voice not found. It may have been deleted.';
        }
      } catch {
        errorMessage = `TTS failed with status ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    const audioBlob = await response.blob();

    // Convert to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Remove data URL prefix to get pure base64
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert audio to base64'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read audio blob'));
      reader.readAsDataURL(audioBlob);
    });
  },

  /**
   * Gets the status of a voice
   * @param voiceId - Voice ID to check
   * @returns Promise<string> - Status ('ready' if voice exists)
   */
  async getVoiceStatus(voiceId: string): Promise<string> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/v1/voices/${voiceId}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return 'deleted';
      }
      throw new Error('Failed to get voice status');
    }

    return 'ready';
  },

  /**
   * Deletes a voice clone from ElevenLabs
   * @param voiceId - Voice ID to delete
   */
  async deleteVoice(voiceId: string): Promise<void> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/v1/voices/${voiceId}`,
      {
        method: 'DELETE',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      let errorMessage = 'Failed to delete voice';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // Ignore JSON parse errors
      }
      throw new Error(errorMessage);
    }
  },

  /**
   * Lists all voices for the user
   * @returns Promise<Array> - Array of voice objects
   */
  async getUserVoices(): Promise<any[]> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    const response = await fetch(`${ELEVENLABS_BASE_URL}/v1/voices`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }

    const data = await response.json();
    return data.voices || [];
  },

  /**
   * Get user subscription info (for checking quotas)
   */
  async getUserInfo(): Promise<any> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    const response = await fetch(`${ELEVENLABS_BASE_URL}/v1/user`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    return response.json();
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
