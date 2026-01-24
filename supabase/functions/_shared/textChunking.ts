/**
 * Text Chunking Utility for Long-Form TTS
 *
 * Splits long text into chunks under the ElevenLabs character limit
 * while preserving natural sentence boundaries for better audio quality.
 *
 * ElevenLabs limit: 5000 characters per request
 */

// ElevenLabs character limit (with buffer for safety)
const MAX_CHUNK_SIZE = 4800;

// Context size for previous_text/next_text parameters
// ElevenLabs uses these for continuity between chunks
const CONTEXT_SIZE = 200;

export interface TextChunk {
  text: string;
  previousText: string;  // For ElevenLabs previous_text param
  nextText: string;      // For ElevenLabs next_text param
  index: number;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * Split text into chunks at natural boundaries
 * Prioritizes: paragraph > sentence > clause > word
 */
export function chunkText(text: string, maxChunkSize = MAX_CHUNK_SIZE): TextChunk[] {
  // If text fits in one chunk, return as-is
  if (text.length <= maxChunkSize) {
    return [{
      text,
      previousText: '',
      nextText: '',
      index: 0,
      isFirst: true,
      isLast: true,
    }];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChunkSize) {
      chunks.push(remaining);
      break;
    }

    // Find the best split point within the max size
    const splitPoint = findSplitPoint(remaining, maxChunkSize);
    chunks.push(remaining.slice(0, splitPoint).trim());
    remaining = remaining.slice(splitPoint).trim();
  }

  // Build chunks with context for continuity
  return chunks.map((chunk, index) => {
    const isFirst = index === 0;
    const isLast = index === chunks.length - 1;

    // Get context from adjacent chunks for ElevenLabs continuity
    const previousText = isFirst
      ? ''
      : getEndContext(chunks[index - 1], CONTEXT_SIZE);

    const nextText = isLast
      ? ''
      : getStartContext(chunks[index + 1], CONTEXT_SIZE);

    return {
      text: chunk,
      previousText,
      nextText,
      index,
      isFirst,
      isLast,
    };
  });
}

/**
 * Find the best split point within maxSize
 * Prioritizes natural boundaries for better TTS flow
 */
function findSplitPoint(text: string, maxSize: number): number {
  const searchText = text.slice(0, maxSize);

  // Priority 1: Paragraph break (double newline)
  const paragraphBreak = searchText.lastIndexOf('\n\n');
  if (paragraphBreak > maxSize * 0.5) {
    return paragraphBreak + 2;
  }

  // Priority 2: Single newline
  const newlineBreak = searchText.lastIndexOf('\n');
  if (newlineBreak > maxSize * 0.5) {
    return newlineBreak + 1;
  }

  // Priority 3: Sentence end (. ! ?)
  // Look for sentence-ending punctuation followed by space
  const sentenceRegex = /[.!?][\s]+/g;
  let lastSentenceEnd = -1;
  let match;
  while ((match = sentenceRegex.exec(searchText)) !== null) {
    if (match.index + match[0].length <= maxSize) {
      lastSentenceEnd = match.index + match[0].length;
    }
  }
  if (lastSentenceEnd > maxSize * 0.3) {
    return lastSentenceEnd;
  }

  // Priority 4: Clause break (comma, semicolon, colon, dash)
  const clauseRegex = /[,;:\-—][\s]+/g;
  let lastClauseEnd = -1;
  while ((match = clauseRegex.exec(searchText)) !== null) {
    if (match.index + match[0].length <= maxSize) {
      lastClauseEnd = match.index + match[0].length;
    }
  }
  if (lastClauseEnd > maxSize * 0.3) {
    return lastClauseEnd;
  }

  // Priority 5: Word boundary (space)
  const lastSpace = searchText.lastIndexOf(' ');
  if (lastSpace > maxSize * 0.3) {
    return lastSpace + 1;
  }

  // Fallback: hard cut at maxSize
  return maxSize;
}

/**
 * Get the last N characters of text for context
 */
function getEndContext(text: string, size: number): string {
  if (text.length <= size) return text;

  // Try to start at a word boundary
  const slice = text.slice(-size);
  const firstSpace = slice.indexOf(' ');
  if (firstSpace > 0 && firstSpace < size * 0.3) {
    return slice.slice(firstSpace + 1);
  }
  return slice;
}

/**
 * Get the first N characters of text for context
 */
function getStartContext(text: string, size: number): string {
  if (text.length <= size) return text;

  // Try to end at a word boundary
  const slice = text.slice(0, size);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > size * 0.7) {
    return slice.slice(0, lastSpace);
  }
  return slice;
}

/**
 * Check if text needs chunking
 */
export function needsChunking(text: string, maxChunkSize = MAX_CHUNK_SIZE): boolean {
  return text.length > maxChunkSize;
}

/**
 * Get estimated number of chunks
 */
export function estimateChunkCount(text: string, maxChunkSize = MAX_CHUNK_SIZE): number {
  if (text.length <= maxChunkSize) return 1;
  return Math.ceil(text.length / (maxChunkSize * 0.9)); // Account for split point variance
}
