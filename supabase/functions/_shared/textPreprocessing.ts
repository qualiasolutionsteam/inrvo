/**
 * Text Preprocessing for ElevenLabs TTS
 *
 * Transforms meditation audio tags to ElevenLabs-compatible format.
 *
 * V3 Alpha supports native audio tags:
 * - [sighs] - Natural breathing/sighing sound
 * - [whispers] - Soft, whispering delivery
 * - [calm] - Calm, measured delivery (experimental)
 * - [thoughtfully] - Reflective, contemplative delivery
 *
 * V2 uses ellipses for pauses (no native tags).
 */

import { V3_CONFIG, USE_V3_MODEL } from './elevenlabsConfig.ts';

export interface TextProcessingResult {
  text: string;
  warnings: string[];
  originalLength: number;
  processedLength: number;
}

/**
 * Escape regex special characters in a string
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * V3 tag mappings
 * Transforms Innrvo meditation tags to V3-native audio tags
 *
 * V3 supported tags (from ElevenLabs docs):
 * - Emotions: [sad], [laughing], [whispering], [giggling], [groaning]
 * - Audio events: [sigh], [leaves rustling], [gentle footsteps]
 * - Punctuation: ellipses for pauses, hyphens for interruptions
 *
 * See: https://elevenlabs.io/docs/overview/capabilities/text-to-dialogue
 */
const V3_TAG_MAPPINGS: Record<string, string> = {
  // Breathing tags -> V3 [sigh] (singular, not [sighs])
  '[deep breath]': '[sigh] Take a deep breath... [sigh]',
  '[exhale slowly]': 'and exhale slowly... [sigh]',
  '[inhale]': '[sigh]... breathe in...',
  '[exhale]': '...breathe out... [sigh]',
  '[breath]': '[sigh]',
  '[breathe in]': '[sigh]... breathe in...',
  '[breathe out]': '...breathe out... [sigh]',

  // Pause tags -> ellipses (V3 uses punctuation for pacing)
  '[pause]': '...',
  '[short pause]': '..',
  '[long pause]': '......',
  '[silence]': '........',

  // Voice modifiers -> V3 native tags
  '[whisper]': '[whispering]',
  '[soft voice]': '[sigh]',
  '[sigh]': '[sigh]',
  '[calm]': '[sigh]',
  '[thoughtfully]': '[sigh]',

  // Sound effects
  '[hum]': '... mmm...',
  '[soft hum]': '... mmm...',
  '[gentle giggle]': '[giggling]',
};

// Pre-compiled regex patterns at module load (performance optimization)
// Avoids creating 20+ RegExp objects per TTS request
const V3_TAG_REGEX_MAP = Object.entries(V3_TAG_MAPPINGS).map(([tag, replacement]) => ({
  regex: new RegExp(escapeRegex(tag), 'gi'),
  replacement,
}));

/**
 * V2 tag mappings (fallback - existing behavior)
 * Converts all tags to ellipses
 */
const V2_TAG_MAPPINGS: Record<string, string> = {
  '[pause]': '...',
  '[short pause]': '..',
  '[long pause]': '......',
  '[deep breath]': '... take a deep breath ...',
  '[exhale slowly]': '... and exhale slowly ...',
  '[inhale]': '... breathe in ...',
  '[exhale]': '... breathe out ...',
  '[breathe in]': '... breathe in ...',
  '[breathe out]': '... breathe out ...',
  '[sigh]': '...',
  '[breath]': '...',
  '[silence]': '........',
  '[whisper]': '...',
  '[soft voice]': '',
  '[calm]': '',
  '[thoughtfully]': '',
  '[hum]': '...',
  '[soft hum]': '...',
  '[gentle giggle]': '...',
};

// Pre-compiled V2 regex patterns
const V2_TAG_REGEX_MAP = Object.entries(V2_TAG_MAPPINGS).map(([tag, replacement]) => ({
  regex: new RegExp(escapeRegex(tag), 'gi'),
  replacement,
}));

/**
 * Prepare meditation text for V3 model
 * Transforms Innrvo tags to V3-native audio tags
 */
export function prepareMeditationTextV3(text: string): TextProcessingResult {
  const warnings: string[] = [];
  const originalLength = text.length;
  let processed = text;

  // Apply V3 tag mappings using pre-compiled regexes (2-5ms faster per request)
  for (const { regex, replacement } of V3_TAG_REGEX_MAP) {
    processed = processed.replace(regex, replacement);
  }

  // Handle [whisper: text] syntax -> [whispering] text
  processed = processed.replace(
    /\[whisper:\s*([^\]]+)\]/gi,
    '[whispering] $1'
  );

  // Clean up any remaining unknown tags -> ellipses
  processed = processed.replace(/\[[^\]]*\]/g, '...');

  // Normalize excessive periods (cap at 8)
  processed = processed.replace(/\.{9,}/g, '........');

  // Clean up spacing around ellipses
  processed = processed.replace(/\s*\.\.\.\s*/g, '... ');

  // Trim whitespace
  processed = processed.trim();

  // Text length validation for V3
  if (processed.length < V3_CONFIG.MIN_TEXT_LENGTH) {
    warnings.push(`Text under ${V3_CONFIG.MIN_TEXT_LENGTH} chars may have inconsistent delivery`);
    // Pad with leading pause for better consistency
    processed = V3_CONFIG.PADDING_TEXT + processed;
  }

  if (processed.length > V3_CONFIG.MAX_TEXT_LENGTH) {
    warnings.push(`Text exceeds ${V3_CONFIG.MAX_TEXT_LENGTH} chars - audio may be truncated`);
  }

  return {
    text: processed,
    warnings,
    originalLength,
    processedLength: processed.length,
  };
}

/**
 * Prepare meditation text for V2 model (fallback)
 * Converts all tags to ellipses for natural pauses
 */
export function prepareMeditationTextV2(text: string): TextProcessingResult {
  const originalLength = text.length;
  let processed = text;

  // Apply V2 tag mappings using pre-compiled regexes
  for (const { regex, replacement } of V2_TAG_REGEX_MAP) {
    processed = processed.replace(regex, replacement);
  }

  // Strip remaining unknown tags
  processed = processed.replace(/\[[^\]]*\]/g, '...');

  // Normalize periods (cap at 6 for V2)
  processed = processed.replace(/\.{7,}/g, '......');

  // Trim whitespace
  processed = processed.trim();

  return {
    text: processed,
    warnings: [],
    originalLength,
    processedLength: processed.length,
  };
}

/**
 * Prepare meditation text based on model version
 * Automatically selects V3 or V2 preprocessing
 */
export function prepareMeditationText(text: string): TextProcessingResult {
  return USE_V3_MODEL
    ? prepareMeditationTextV3(text)
    : prepareMeditationTextV2(text);
}
