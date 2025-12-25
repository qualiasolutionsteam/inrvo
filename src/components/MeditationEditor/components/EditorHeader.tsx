/**
 * EditorHeader Component
 *
 * Minimal header with stats on left and close button on right.
 * Mobile-first design with proper safe areas.
 */

import React, { memo } from 'react';
import type { ScriptStats } from '../types';

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
    strokeLinejoin="round"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

// ============================================================================
// TYPES
// ============================================================================

interface EditorHeaderProps {
  onClose: () => void;
  stats: ScriptStats;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const EditorHeader = memo<EditorHeaderProps>(({ onClose, stats }) => {
  return (
    <header
      role="banner"
      aria-label="Meditation editor header"
      className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      {/* Left: Stats - Compact on mobile, detailed on desktop */}
      <div className="flex items-center gap-2">
        {/* Mobile: Compact duration only */}
        <div className="md:hidden flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
          <span className="text-cyan-400 font-bold text-sm">
            {stats.estimatedMinutes}
          </span>
          <span className="text-white/50 text-xs">min</span>
        </div>

        {/* Desktop: Full stats */}
        <div
          id="editor-stats"
          className="hidden md:flex items-center gap-2 text-sm"
          aria-label={`${stats.wordCount} words, approximately ${stats.estimatedMinutes} minutes, ${stats.tagCount} audio tags`}
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 transition-colors">
            <span className="text-white/50 text-xs">Words</span>
            <span className="text-white font-semibold text-xs">
              {stats.wordCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <span className="text-cyan-400 font-bold text-xs">
              {stats.estimatedMinutes}
            </span>
            <span className="text-cyan-400/70 text-xs">min</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <span className="text-violet-400 font-bold text-xs">
              {stats.tagCount}
            </span>
            <span className="text-violet-400/70 text-xs">tags</span>
          </div>
        </div>
      </div>

      {/* Right: Minimal Close Button */}
      <button
        onClick={onClose}
        aria-label="Close editor"
        className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white
                   transition-colors duration-200 active:scale-95 cursor-pointer touch-manipulation"
      >
        <CloseIcon className="w-6 h-6" />
      </button>
    </header>
  );
});

EditorHeader.displayName = 'EditorHeader';
