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
 * Transforms INrVO meditation tags to V3-native audio tags
 */
const V3_TAG_MAPPINGS: Record<string, string> = {
  // Breathing tags -> V3 [sighs] with descriptive text
  '[deep breath]': '[sighs] Take a deep breath... [sighs]',
  '[exhale slowly]': 'and exhale slowly... [sighs]',
  '[inhale]': '[sighs]... breathe in...',
  '[exhale]': '...breathe out... [sighs]',
  '[breath]': '[sighs]',
  '[breathe in]': '[sighs]... breathe in...',
  '[breathe out]': '...breathe out... [sighs]',

  // Pause tags -> ellipses (V3 respects punctuation)
  '[pause]': '...',
  '[short pause]': '..',
  '[long pause]': '......',
  '[silence]': '........',

  // Voice modifiers -> V3 native tags
  '[whisper]': '[whispers]',
  '[soft voice]': '[calm]',
  '[sigh]': '[sighs]',
  '[calm]': '[calm]',
  '[thoughtfully]': '[thoughtfully]',

  // Sound effects
  '[hum]': '[calm]... mmm...',
  '[soft hum]': '[calm]... mmm...',
  '[gentle giggle]': '... [calm]...',
};

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

/**
 * Prepare meditation text for V3 model
 * Transforms INrVO tags to V3-native audio tags
 */
export function prepareMeditationTextV3(text: string): TextProcessingResult {
  const warnings: string[] = [];
  const originalLength = text.length;
  let processed = text;

  // Apply V3 tag mappings (case-insensitive)
  for (const [tag, replacement] of Object.entries(V3_TAG_MAPPINGS)) {
    const regex = new RegExp(escapeRegex(tag), 'gi');
    processed = processed.replace(regex, replacement);
  }

  // Handle [whisper: text] syntax -> [whispers] text [calm]
  processed = processed.replace(
    /\[whisper:\s*([^\]]+)\]/gi,
    '[whispers] $1 [calm]'
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

  // Apply V2 tag mappings (case-insensitive)
  for (const [tag, replacement] of Object.entries(V2_TAG_MAPPINGS)) {
    const regex = new RegExp(escapeRegex(tag), 'gi');
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
