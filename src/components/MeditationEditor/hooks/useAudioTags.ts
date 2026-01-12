/**
 * useAudioTags Hook
 *
 * Parses and renders audio tags within script text.
 * Provides script statistics (word count, duration, tag count).
 *
 * Returns HTML string for dangerouslySetInnerHTML to avoid React/contentEditable conflicts.
 */

import { useMemo } from 'react';
import type { ScriptStats } from '../types';

const AUDIO_TAG_REGEX = /\[([^\]]+)\]/g;

export interface UseAudioTagsReturn {
  /** HTML string with styled audio tags for dangerouslySetInnerHTML */
  styledContentHtml: string;
  /** Script statistics */
  stats: ScriptStats;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function useAudioTags(script: string): UseAudioTagsReturn {
  /**
   * Generate HTML string with styled audio tags (purple highlights)
   * Using HTML string instead of React nodes to avoid contentEditable conflicts
   */
  const styledContentHtml = useMemo(() => {
    const parts: string[] = [];
    let lastIndex = 0;
    let match;

    const regex = new RegExp(AUDIO_TAG_REGEX.source, 'g');

    while ((match = regex.exec(script)) !== null) {
      // Add escaped text before the tag
      if (match.index > lastIndex) {
        parts.push(escapeHtml(script.slice(lastIndex, match.index)));
      }

      // Add styled audio tag span (tag content is escaped)
      const escapedTag = escapeHtml(match[0]);
      parts.push(
        `<span class="audio-tag" contenteditable="false" data-tag="${escapedTag}">${escapedTag}</span>`
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining escaped text
    if (lastIndex < script.length) {
      parts.push(escapeHtml(script.slice(lastIndex)));
    }

    return parts.join('');
  }, [script]);

  /**
   * Calculate script statistics
   */
  const stats = useMemo((): ScriptStats => {
    // Remove audio tags for word count
    const textWithoutTags = script.replace(/\[.*?\]/g, '');
    const wordCount = textWithoutTags
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    // 120 words per minute (2 words/second) at meditative pace
    // This matches the generation logic in agentTools.ts
    const estimatedMinutes = Math.round(wordCount / 120) || 1;

    // Count audio tags
    const tagMatches = script.match(/\[[^\]]+\]/g);
    const tagCount = tagMatches ? tagMatches.length : 0;

    return { wordCount, estimatedMinutes, tagCount };
  }, [script]);

  return { styledContentHtml, stats };
}
