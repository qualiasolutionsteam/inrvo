/**
 * ElevenLabs Configuration
 *
 * Shared configuration for ElevenLabs TTS integration.
 * V3 Alpha model provides native audio tags for meditation content.
 */

// Model identifiers
export const ELEVENLABS_MODELS = {
  V2: 'eleven_multilingual_v2',
  V3: 'eleven_v3',
} as const;

export type ElevenLabsModel = typeof ELEVENLABS_MODELS[keyof typeof ELEVENLABS_MODELS];

/**
 * Feature flag for V3 model
 * Set to true to use eleven_v3 (V3 Alpha)
 * Set to false to fallback to eleven_multilingual_v2
 */
export const USE_V3_MODEL = true;

/**
 * V3-specific configuration
 */
export const V3_CONFIG = {
  // Text length requirements for consistent output
  MIN_TEXT_LENGTH: 250,  // V3 recommends 250+ chars for consistency
  MAX_TEXT_LENGTH: 5000, // ~5 minutes of audio
  PADDING_TEXT: '... ',  // Used to pad short texts

  // Stability presets (V3 interprets differently than V2)
  STABILITY_MODES: {
    CREATIVE: 0.3,  // Most expressive, some hallucination risk
    NATURAL: 0.5,   // Balanced - RECOMMENDED for meditation
    ROBUST: 0.7,    // Very stable, less responsive to tags
  },
} as const;

/**
 * Voice settings optimized for V3 meditation content
 */
export const V3_VOICE_SETTINGS = {
  stability: V3_CONFIG.STABILITY_MODES.NATURAL,
  similarity_boost: 0.75,
  // Note: V3 may not support all V2 parameters
  // style, use_speaker_boost, speed are not confirmed for V3
} as const;

/**
 * Voice settings for V2 model (fallback)
 */
export const V2_VOICE_SETTINGS = {
  stability: 0.6,
  similarity_boost: 0.75,
  style: 0.3,
  use_speaker_boost: true,
} as const;

/**
 * Get voice settings based on model version
 */
export function getVoiceSettings(
  modelId: ElevenLabsModel,
  overrides?: Partial<typeof V3_VOICE_SETTINGS>
) {
  const baseSettings = modelId === ELEVENLABS_MODELS.V3
    ? { ...V3_VOICE_SETTINGS }
    : { ...V2_VOICE_SETTINGS };

  return { ...baseSettings, ...overrides };
}

/**
 * Get the appropriate model ID based on feature flag
 */
export function getModelId(): ElevenLabsModel {
  return USE_V3_MODEL ? ELEVENLABS_MODELS.V3 : ELEVENLABS_MODELS.V2;
}
