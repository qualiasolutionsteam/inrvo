/**
 * useAudioTags Hook
 *
 * Parses and renders audio tags within script text.
 * Provides script statistics (word count, duration, tag count).
 */

import React, { useMemo } from 'react';
import type { ScriptStats } from '../types';

const AUDIO_TAG_REGEX = /\[([^\]]+)\]/g;

export interface UseAudioTagsReturn {
  /** React nodes with styled audio tags */
  renderStyledContent: React.ReactNode[];
  /** Script statistics */
  stats: ScriptStats;
}

export function useAudioTags(script: string): UseAudioTagsReturn {
  /**
   * Render script with styled audio tags (purple highlights)
   */
  const renderStyledContent = useMemo(() => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    const regex = new RegExp(AUDIO_TAG_REGEX.source, 'g');

    while ((match = regex.exec(script)) !== null) {
      // Add text before the tag
      if (match.index > lastIndex) {
        parts.push(script.slice(lastIndex, match.index));
      }

      // Add styled audio tag
      parts.push(
        React.createElement(
          'span',
          {
            key: match.index,
            className: 'audio-tag',
            contentEditable: false,
            'data-tag': match[0],
          },
          match[0]
        )
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < script.length) {
      parts.push(script.slice(lastIndex));
    }

    return parts;
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

    // ~100 words per minute at meditative pace
    const estimatedMinutes = Math.ceil(wordCount / 100);

    // Count audio tags
    const tagMatches = script.match(/\[[^\]]+\]/g);
    const tagCount = tagMatches ? tagMatches.length : 0;

    return { wordCount, estimatedMinutes, tagCount };
  }, [script]);

  return { renderStyledContent, stats };
}
