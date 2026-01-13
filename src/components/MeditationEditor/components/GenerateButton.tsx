/**
 * GenerateButton Component
 *
 * Primary action button for generating audio from the meditation script.
 * Features animated gradient, proper safe area handling, and polished styling.
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

const SparklesIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
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
    const isDisabled = disabled || isGenerating;
    const needsVoice = !selectedVoice;

    return (
      <div
        className="flex-shrink-0 px-4 pt-4 bg-gradient-to-t from-black via-black/95 to-transparent border-t border-white/5"
        style={{ paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
      >
        <button
          onClick={onClick}
          // Explicit touch handler for mobile - ensures tap is captured reliably
          onTouchEnd={(e) => {
            if (e.cancelable && !isDisabled) {
              e.preventDefault(); // Prevent ghost click
              onClick();
            }
          }}
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
            relative w-full py-4 rounded-2xl font-semibold text-base
            flex items-center justify-center gap-3
            transition-all duration-300 ease-out
            touch-manipulation overflow-hidden
            ${isDisabled && !needsVoice
              ? 'bg-white/10 text-white/40 cursor-not-allowed'
              : isGenerating
              ? 'bg-gradient-to-r from-sky-600 via-sky-600 to-sky-600 bg-[length:200%_100%] animate-gradient text-white cursor-wait shadow-xl shadow-sky-500/20'
              : needsVoice
              ? 'bg-gradient-to-r from-amber-500/80 to-orange-500/80 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:from-amber-500 hover:to-orange-500 active:scale-[0.98]'
              : 'bg-gradient-to-r from-sky-500 to-sky-500 text-white shadow-xl shadow-sky-500/30 hover:shadow-sky-500/50 hover:from-sky-500 hover:to-sky-500 active:scale-[0.98]'
            }
          `}
        >
          {/* Shimmer effect for ready state */}
          {!isDisabled && !isGenerating && selectedVoice && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-shimmer pointer-events-none" />
          )}

          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
              <span>Creating Your Meditation...</span>
            </>
          ) : needsVoice ? (
            <>
              <VoiceIcon className="w-5 h-5" />
              <span>Select Voice to Continue</span>
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5" />
              <span>Generate Meditation</span>
              <PlayIcon className="w-4 h-4 opacity-70" />
            </>
          )}
        </button>

        {/* Keyboard shortcut hint (desktop only) */}
        {selectedVoice && !isGenerating && (
          <p className="hidden md:flex items-center justify-center gap-1.5 text-xs text-white/30 mt-3">
            <kbd className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/50 font-mono text-[10px]">⌘</kbd>
            <span>+</span>
            <kbd className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/50 font-mono text-[10px]">Enter</kbd>
            <span className="ml-1">to generate</span>
          </p>
        )}
      </div>
    );
  }
);

GenerateButton.displayName = 'GenerateButton';
