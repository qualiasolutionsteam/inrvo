/**
 * EditorHeader Component
 *
 * Header section with back button and script statistics.
 * Mobile-first design with clean, minimal layout.
 */

import React, { memo } from 'react';
import type { ScriptStats } from '../types';
import type { MeditationType } from '../../../lib/agent/knowledgeBase';

// ============================================================================
// ICONS
// ============================================================================

const BackArrowIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const TagIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <circle cx="7" cy="7" r="1" fill="currentColor" />
  </svg>
);

// ============================================================================
// TYPES
// ============================================================================

interface EditorHeaderProps {
  onClose: () => void;
  stats: ScriptStats;
  meditationType?: MeditationType;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatMeditationType(type?: MeditationType): string {
  if (!type) return 'Meditation';
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============================================================================
// COMPONENT
// ============================================================================

export const EditorHeader = memo<EditorHeaderProps>(
  ({ onClose, stats, meditationType }) => {
    return (
      <header
        role="banner"
        aria-label="Meditation editor header"
        className="flex-shrink-0 flex items-center px-3 py-3 md:px-6 md:py-4 border-b border-white/10 safe-top"
      >
        {/* Left: Back Button - Hidden on mobile */}
        <button
          onClick={onClose}
          aria-label="Go back"
          className="hidden md:flex w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/5 hover:bg-white/10
                     text-white/70 hover:text-white transition-all items-center justify-center
                     active:scale-95 cursor-pointer touch-manipulation flex-shrink-0"
        >
          <BackArrowIcon className="w-5 h-5" />
        </button>
        {/* Spacer for mobile to keep title centered */}
        <div className="w-10 h-10 md:hidden flex-shrink-0" />

        {/* Center: Title & Type */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-3">
          <h1 className="text-base md:text-lg font-medium text-white truncate">
            Edit Meditation
          </h1>
          <p className="text-xs text-white/50 truncate">
            {formatMeditationType(meditationType)}
          </p>
        </div>

        {/* Right: Stats (desktop only) - placeholder for layout balance on mobile */}
        <div className="w-10 h-10 md:w-auto md:h-auto flex-shrink-0">
          <div
            id="editor-stats"
            className="hidden md:flex items-center gap-2 text-sm"
            aria-label={`${stats.wordCount} words, approximately ${stats.estimatedMinutes} minutes, ${stats.tagCount} audio tags`}
          >
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
              <span className="text-white/50 text-xs">Words:</span>
              <span className="text-white font-medium text-xs">{stats.wordCount}</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
              <span className="text-white/50 text-xs">~</span>
              <span className="text-white font-medium text-xs">
                {stats.estimatedMinutes}
              </span>
              <span className="text-white/50 text-xs">min</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
              <TagIcon className="w-3 h-3 text-white/50" />
              <span className="text-white font-medium text-xs">{stats.tagCount}</span>
            </div>
          </div>
        </div>
      </header>
    );
  }
);

EditorHeader.displayName = 'EditorHeader';
