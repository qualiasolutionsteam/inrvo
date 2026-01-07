import { TextSegment, ScriptTimingMap } from '../../types';

// Audio tag pause durations in seconds
// V3 Alpha: Some tags now produce actual audio ([sighs] creates breathing sounds)
//
// IMPORTANT: Any text in brackets [like this] is recognized as an audio tag
// via the isAudioTag() function which uses regex /^\[.+\]$/
// This dictionary provides specific durations for known tags
// V3 native tags that produce audio have non-zero durations
const AUDIO_TAG_DURATIONS: Record<string, number> = {
  // Pauses (converted to ellipses, duration handled by TTS)
  '[pause]': 0,
  '[short pause]': 0,
  '[long pause]': 0,
  '[silence]': 0,

  // Breathing (V3: these become [sighs] which produces actual audio)
  '[inhale]': 0.5,
  '[exhale]': 0.5,
  '[exhale slowly]': 0.8,
  '[deep breath]': 1.0,
  '[breathe in]': 0.5,
  '[breathe out]': 0.5,
  '[breath]': 0.3,

  // V3 Native Audio Tags (produce actual sounds)
  '[sighs]': 0.5,        // V3 produces natural sigh sound
  '[whispers]': 0,       // Just changes delivery style, no extra duration
  '[calm]': 0,           // Just changes delivery style
  '[thoughtfully]': 0,   // Just changes delivery style

  // Voice modifiers (converted to V3 tags)
  '[whisper]': 0,
  '[soft voice]': 0,
  '[sigh]': 0.5,         // Converted to [sighs] in V3

  // Sounds
  '[gentle giggle]': 0.3,
  '[hum]': 0.5,
  '[soft hum]': 0.5,
};

/**
 * Get the duration for an audio tag
 * V3 Alpha: Some tags like [sighs] produce actual audio with duration
 * Tags that just modify delivery style (e.g. [whispers], [calm]) have 0 duration
 */
function getAudioTagDuration(tag: string): number {
  const normalizedTag = tag.toLowerCase().trim();
  return AUDIO_TAG_DURATIONS[normalizedTag] || 0;
}

/**
 * Check if a token is an audio tag
 */
function isAudioTag(token: string): boolean {
  return /^\[.+\]$/.test(token.trim());
}

/**
 * Build a timing map for the script based on audio duration
 */
export function buildTimingMap(script: string, audioDuration: number): ScriptTimingMap {
  const segments: TextSegment[] = [];

  // Split script into tokens (words and audio tags)
  const audioTagRegex = /(\[[^\]]+\])/g;
  const parts = script.split(audioTagRegex).filter(Boolean);

  // First pass: count words and estimate total pause time from audio tags
  let wordCount = 0;
  let totalPauseTime = 0;

  parts.forEach(part => {
    if (isAudioTag(part)) {
      totalPauseTime += getAudioTagDuration(part);
    } else {
      const words = part.trim().split(/\s+/).filter(w => w.length > 0);
      wordCount += words.length;
    }
  });

  // Calculate speaking time (total duration minus pauses)
  const speakingTime = Math.max(audioDuration - totalPauseTime, 1);

  // Calculate average time per word
  const baseTimePerWord = speakingTime / Math.max(wordCount, 1);

  // Second pass: build timing segments
  let currentTime = 0;
  let sentenceIndex = 0;
  let wordIdx = 0;

  parts.forEach(part => {
    if (isAudioTag(part)) {
      // Audio tag segment
      const duration = getAudioTagDuration(part);
      segments.push({
        type: 'audioTag',
        content: part,
        startTime: currentTime,
        endTime: currentTime + duration,
        sentenceIndex,
      });
      currentTime += duration;
    } else {
      // Text segment - split into words
      const words = part.trim().split(/\s+/).filter(w => w.length > 0);

      words.forEach(word => {
        // Adjust word duration based on characteristics
        let wordDuration = baseTimePerWord;

        // Longer words take slightly more time
        const lengthFactor = Math.min(word.length / 5, 1.5);
        wordDuration *= (0.85 + lengthFactor * 0.3);

        // Punctuation adds pause time
        if (/[.!?]$/.test(word)) {
          wordDuration *= 1.4; // Sentence end
        } else if (/[,;:]$/.test(word)) {
          wordDuration *= 1.15; // Clause break
        }

        segments.push({
          type: 'word',
          content: word,
          startTime: currentTime,
          endTime: currentTime + wordDuration,
          wordIndex: wordIdx++,
          sentenceIndex,
        });

        currentTime += wordDuration;

        // Detect sentence boundaries
        if (/[.!?]$/.test(word)) {
          sentenceIndex++;
        }
      });
    }
  });

  return {
    segments,
    totalDuration: audioDuration,
    wordCount,
    sentenceCount: sentenceIndex + 1,
  };
}

// Offset to compensate for TTS pacing - text highlights ahead of audio
// Positive value = text highlights earlier (leads the audio)
const SYNC_LEAD_TIME = 1.5; // seconds

/**
 * Get the current word index based on playback time
 */
export function getCurrentWordIndex(
  timingMap: ScriptTimingMap | null,
  currentTime: number
): number {
  if (!timingMap) return -1;

  // Apply lead time offset so text highlights slightly ahead of audio
  const adjustedTime = currentTime + SYNC_LEAD_TIME;

  for (const segment of timingMap.segments) {
    if (segment.type === 'word' &&
        adjustedTime >= segment.startTime &&
        adjustedTime < segment.endTime) {
      return segment.wordIndex ?? -1;
    }
  }

  // If past all segments, return last word
  const lastWordSegment = [...timingMap.segments]
    .reverse()
    .find(s => s.type === 'word');

  if (lastWordSegment && adjustedTime >= lastWordSegment.endTime) {
    return lastWordSegment.wordIndex ?? -1;
  }

  return -1;
}

/**
 * Get the current segment at a given time
 */
export function getCurrentSegment(
  timingMap: ScriptTimingMap,
  currentTime: number
): TextSegment | null {
  for (const segment of timingMap.segments) {
    if (currentTime >= segment.startTime && currentTime < segment.endTime) {
      return segment;
    }
  }
  return null;
}

/**
 * Count words in script (excluding audio tags)
 */
export function countWords(script: string): number {
  // Remove audio tags first
  const textOnly = script.replace(/\[[^\]]+\]/g, ' ');
  const words = textOnly.trim().split(/\s+/).filter(w => w.length > 0);
  return words.length;
}
