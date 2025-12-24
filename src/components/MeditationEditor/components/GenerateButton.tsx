/**
 * GenerateButton Component
 *
 * Primary action button for generating audio from the meditation script.
 */

import React, { memo } from 'react';
import type { VoiceProfile } from '../../../../types';

// ============================================================================
// ICONS
// ============================================================================

const PlayIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const VoiceIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
    <path d="M19 10v2a7 7 0 01-14 0v-2" />
    <path d="M12 19v4M8 23h8" />
  </svg>
);

// ============================================================================
// TYPES
// ============================================================================

interface GenerateButtonProps {
  selectedVoice: VoiceProfile | null;
  isGenerating: boolean;
  onClick: () => void;
  disabled?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const GenerateButton = memo<GenerateButtonProps>(
  ({ selectedVoice, isGenerating, onClick, disabled = false }) => {
    const isDisabled = disabled || !selectedVoice || isGenerating;

    const getButtonContent = () => {
      if (isGenerating) {
        return (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
            <span>Generating Audio...</span>
          </>
        );
      }

      if (!selectedVoice) {
        return (
          <>
            <VoiceIcon className="w-5 h-5" />
            <span>Select a Voice First</span>
          </>
        );
      }

      return (
        <>
          <PlayIcon className="w-5 h-5" />
          <span>Generate & Play</span>
        </>
      );
    };

    const getButtonStyles = () => {
      if (isDisabled) {
        return 'bg-white/10 text-white/40 cursor-not-allowed';
      }

      if (isGenerating) {
        return 'bg-cyan-500/60 text-white cursor-wait';
      }

      return `
        bg-gradient-to-r from-cyan-500 to-purple-600 text-white
        shadow-lg shadow-cyan-500/30
        hover:from-cyan-400 hover:to-purple-500
        hover:shadow-cyan-500/40
        active:scale-[0.98]
      `;
    };

    return (
      <div className="flex-shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 bg-black/60 backdrop-blur-xl">
        <button
          onClick={onClick}
          disabled={isDisabled}
          aria-busy={isGenerating}
          aria-label={
            isGenerating
              ? 'Generating audio...'
              : selectedVoice
              ? 'Generate and play meditation'
              : 'Select a voice first'
          }
          className={`
            w-full py-4 rounded-2xl font-semibold text-base
            flex items-center justify-center gap-3
            transition-all duration-200
            touch-manipulation
            ${getButtonStyles()}
          `}
        >
          {getButtonContent()}
        </button>

        {/* Keyboard shortcut hint (desktop only) */}
        {selectedVoice && !isGenerating && (
          <p className="hidden md:block text-center text-xs text-white/30 mt-2">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/50">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/50">Enter</kbd> to generate
          </p>
        )}
      </div>
    );
  }
);

GenerateButton.displayName = 'GenerateButton';
