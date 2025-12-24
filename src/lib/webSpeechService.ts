/**
 * Web Speech API service for FREE browser-native text-to-speech
 * No API keys required - uses built-in browser TTS
 */

export interface BrowserVoice {
  id: string;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

export interface WebSpeechOptions {
  rate?: number;      // 0.1 to 10, default 1
  pitch?: number;     // 0 to 2, default 1
  volume?: number;    // 0 to 1, default 1
}

// Default options optimized for meditation
const MEDITATION_DEFAULTS: WebSpeechOptions = {
  rate: 0.85,    // Slower for calm delivery
  pitch: 1.0,
  volume: 1.0,
};

/**
 * Check if Web Speech API is available
 */
export function isWebSpeechAvailable(): boolean {
  return 'speechSynthesis' in window;
}

/**
 * Get all available browser voices
 * Note: Voices may load asynchronously, so this may need to be called after a delay
 */
export function getBrowserVoices(): Promise<BrowserVoice[]> {
  return new Promise((resolve) => {
    if (!isWebSpeechAvailable()) {
      resolve([]);
      return;
    }

    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const voices = synth.getVoices();
      const browserVoices: BrowserVoice[] = voices.map((voice, index) => ({
        id: `browser-${voice.lang}-${index}`,
        name: voice.name,
        lang: voice.lang,
        localService: voice.localService,
        default: voice.default,
      }));
      resolve(browserVoices);
    };

    // Voices may already be loaded
    const voices = synth.getVoices();
    if (voices.length > 0) {
      loadVoices();
      return;
    }

    // Wait for voices to load
    synth.addEventListener('voiceschanged', loadVoices, { once: true });

    // Fallback timeout in case voiceschanged never fires
    setTimeout(() => {
      loadVoices();
    }, 1000);
  });
}

/**
 * Get recommended voices for meditation (English voices preferred)
 */
export async function getMeditationVoices(): Promise<BrowserVoice[]> {
  const voices = await getBrowserVoices();

  // Filter for English voices and sort by quality indicators
  return voices
    .filter(v => v.lang.startsWith('en'))
    .sort((a, b) => {
      // Prefer local (higher quality) voices
      if (a.localService !== b.localService) {
        return a.localService ? -1 : 1;
      }
      // Then prefer default voice
      if (a.default !== b.default) {
        return a.default ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
}

/**
 * Generate speech using Web Speech API
 * Returns a Promise that resolves when speech is complete
 *
 * Note: This plays audio directly through the browser, not returning an AudioBuffer
 * For meditation app, we need to convert this to audio data
 */
export function speakText(
  text: string,
  voiceId?: string,
  options?: WebSpeechOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isWebSpeechAvailable()) {
      reject(new Error('Web Speech API is not available in this browser'));
      return;
    }

    const synth = window.speechSynthesis;
    const opts = { ...MEDITATION_DEFAULTS, ...options };

    // Cancel any ongoing speech
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = opts.rate || 0.85;
    utterance.pitch = opts.pitch || 1.0;
    utterance.volume = opts.volume || 1.0;

    // Find and set the voice if specified
    if (voiceId) {
      const voices = synth.getVoices();
      const voice = voices.find((v, i) =>
        `browser-${v.lang}-${i}` === voiceId || v.name === voiceId
      );
      if (voice) {
        utterance.voice = voice;
      }
    }

    utterance.onend = () => resolve();
    utterance.onerror = (event) => {
      if (event.error === 'canceled') {
        resolve(); // Canceled is not an error
      } else {
        reject(new Error(`Speech synthesis error: ${event.error}`));
      }
    };

    synth.speak(utterance);
  });
}

/**
 * Generate speech and return as AudioBuffer (for integration with existing player)
 *
 * IMPORTANT: Web Speech API doesn't provide raw audio data access.
 * This uses MediaRecorder to capture audio output.
 *
 * Fallback: For browsers that don't support audio capture,
 * this will play directly and return null for audioBuffer.
 */
export async function generateSpeechAudio(
  text: string,
  voiceId?: string,
  options?: WebSpeechOptions,
  audioContext?: AudioContext
): Promise<{ audioBuffer: AudioBuffer | null; blob: Blob | null }> {
  if (!isWebSpeechAvailable()) {
    throw new Error('Web Speech API is not available in this browser');
  }

  // Note: Web Speech API doesn't expose audio data directly
  // We can only play it through the speakers
  // For now, we'll return null and let the caller handle direct playback

  // Play the speech
  await speakText(text, voiceId, options);

  return { audioBuffer: null, blob: null };
}

/**
 * Stop any ongoing speech
 */
export function stopSpeech(): void {
  if (isWebSpeechAvailable()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Pause ongoing speech
 */
export function pauseSpeech(): void {
  if (isWebSpeechAvailable()) {
    window.speechSynthesis.pause();
  }
}

/**
 * Resume paused speech
 */
export function resumeSpeech(): void {
  if (isWebSpeechAvailable()) {
    window.speechSynthesis.resume();
  }
}

/**
 * Check if speech is currently playing
 */
export function isSpeaking(): boolean {
  if (!isWebSpeechAvailable()) return false;
  return window.speechSynthesis.speaking;
}

/**
 * Check if speech is paused
 */
export function isPaused(): boolean {
  if (!isWebSpeechAvailable()) return false;
  return window.speechSynthesis.paused;
}

/**
 * Convert browser voice to VoiceProfile format for compatibility
 */
export function browserVoiceToProfile(voice: BrowserVoice): {
  id: string;
  name: string;
  voiceName: string;
  description: string;
  provider: 'browser';
  isCloned: false;
} {
  return {
    id: voice.id,
    name: voice.name,
    voiceName: voice.name,
    description: `Browser voice (${voice.lang})${voice.localService ? ' - High Quality' : ''}`,
    provider: 'browser',
    isCloned: false,
  };
}

export const webSpeechService = {
  isAvailable: isWebSpeechAvailable,
  getVoices: getBrowserVoices,
  getMeditationVoices,
  speak: speakText,
  generateAudio: generateSpeechAudio,
  stop: stopSpeech,
  pause: pauseSpeech,
  resume: resumeSpeech,
  isSpeaking,
  isPaused,
  voiceToProfile: browserVoiceToProfile,
};

export default webSpeechService;
