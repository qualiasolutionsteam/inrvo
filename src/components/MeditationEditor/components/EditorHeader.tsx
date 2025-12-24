/**
 * EditorHeader Component
 *
 * Header section with close button and script statistics.
 */

import React, { memo } from 'react';
import type { ScriptStats } from '../types';
import type { MeditationType } from '../../../lib/agent/knowledgeBase';

// ============================================================================
// ICONS
// ============================================================================

const CloseIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const SparkleIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
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
        className="flex-shrink-0 flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-white/10"
      >
        {/* Left: Title & Type */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600
                        flex items-center justify-center shadow-lg shadow-cyan-500/30 flex-shrink-0"
          >
            <SparkleIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-medium text-white truncate">
              Edit Meditation
            </h1>
            <p className="text-xs md:text-sm text-white/50 truncate">
              {formatMeditationType(meditationType)}
            </p>
          </div>
        </div>

        {/* Center: Stats (hidden on mobile, shown in a row on desktop) */}
        <div
          id="editor-stats"
          className="hidden md:flex items-center gap-3 text-sm"
          aria-label={`${stats.wordCount} words, approximately ${stats.estimatedMinutes} minutes, ${stats.tagCount} audio tags`}
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className="text-white/50">Words:</span>
            <span className="text-white font-medium">{stats.wordCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className="text-white/50">~</span>
            <span className="text-white font-medium">
              {stats.estimatedMinutes}
            </span>
            <span className="text-white/50">min</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <TagIcon />
            <span className="text-white font-medium">{stats.tagCount}</span>
          </div>
        </div>

        {/* Right: Close Button */}
        <button
          onClick={onClose}
          aria-label="Close editor"
          className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-white/10 hover:bg-white/20
                     text-slate-300 hover:text-white transition-all flex items-center justify-center
                     border border-white/10 hover:border-cyan-500/30 active:scale-95
                     cursor-pointer touch-manipulation flex-shrink-0 ml-3"
        >
          <CloseIcon className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </header>
    );
  }
);

EditorHeader.displayName = 'EditorHeader';
