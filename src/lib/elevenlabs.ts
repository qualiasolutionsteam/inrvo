// ElevenLabs API service for voice cloning and TTS

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io';

export interface VoiceCloningOptions {
  name: string;
  description?: string;
}

export interface TTSSOptions {
  model_id?: string;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export const elevenlabsService = {
  /**
   * Creates an instant voice clone from audio sample
   * @param audioBlob - Audio blob (30 seconds minimum)
   * @param options - Voice cloning options
   * @returns Promise<string> - Voice ID
   */
  async cloneVoice(audioBlob: Blob, options: VoiceCloningOptions): Promise<string> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Validate audio duration (must be at least 30 seconds for instant cloning)
    const duration = await getAudioDuration(audioBlob);
    if (duration < 30) {
      throw new Error(`Audio must be at least 30 seconds. Current duration: ${duration.toFixed(1)}s`);
    }

    // Step 1: Get user ID
    const userResponse = await fetch(`${ELEVENLABS_BASE_URL}/v1/user`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user information from ElevenLabs');
    }

    const userData = await userResponse.json();
    const userId = userData.subscription?.user_id || 'default';

    // Step 2: Add voice to collection
    const addVoiceResponse = await fetch(`${ELEVENLABS_BASE_URL}/v1/voices`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: options.name,
        description: options.description || `Voice clone created on ${new Date().toISOString()}`,
      }),
    });

    if (!addVoiceResponse.ok) {
      const error = await addVoiceResponse.json();
      throw new Error(`Failed to create voice: ${error.detail || error.message}`);
    }

    const voiceData = await addVoiceResponse.json();
    const voiceId = voiceData.voice_id;

    // Step 3: Upload audio sample
    const formData = new FormData();
    formData.append('name', `${voiceId}_sample`);
    formData.append('files', audioBlob, 'voice_sample.webm');

    const uploadResponse = await fetch(
      `${ELEVENLABS_BASE_URL}/v1/voices/${voiceId}/samples`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      // Clean up the voice if upload fails
      await this.deleteVoice(voiceId);
      const error = await uploadResponse.json();
      throw new Error(`Failed to upload audio: ${error.detail || error.message}`);
    }

    return voiceId;
  },

  /**
   * Generates speech using a cloned voice
   * @param text - Text to synthesize
   * @param voiceId - Voice ID from cloning
   * @param options - TTS options
   * @returns Promise<string> - Base64 encoded audio
   */
  async generateSpeech(
    text: string,
    voiceId: string,
    options: TTSSOptions = {}
  ): Promise<string> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    const requestData = {
      text,
      model_id: options.model_id || 'eleven_multilingual_v2',
      voice_settings: {
        stability: options.voice_settings?.stability ?? 0.5,
        similarity_boost: options.voice_settings?.similarity_boost ?? 0.8,
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
      const error = await response.json();
      throw new Error(`TTS generation failed: ${error.detail || error.message}`);
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
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  },

  /**
   * Gets the status of a voice
   * @param voiceId - Voice ID to check
   * @returns Promise<string> - Status
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
      throw new Error('Failed to get voice status');
    }

    const voiceData = await response.json();
    return voiceData.status || 'ready';
  },

  /**
   * Deletes a voice clone
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to delete voice: ${error.detail || error.message}`);
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
};

/**
 * Helper function to get audio duration from a blob
 */
async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    const url = URL.createObjectURL(blob);

    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
      URL.revokeObjectURL(url);
    });

    audio.addEventListener('error', () => {
      reject(new Error('Failed to load audio metadata'));
      URL.revokeObjectURL(url);
    });

    audio.src = url;
  });
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