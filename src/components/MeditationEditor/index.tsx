/**
 * MeditationEditor Component
 *
 * Unified meditation script editing experience.
 * Replaces both MeditationPanel (AgentChat.tsx) and ScriptEditor.tsx.
 *
 * Features:
 * - Full-screen overlay on mobile, centered modal on desktop
 * - contentEditable script editing with styled audio tags
 * - Voice/Music/Tags selection via bottom sheet controls
 * - Keyboard shortcuts (Escape to close, Ctrl+Enter to generate)
 * - Mobile-first responsive design with proper safe area handling
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import type { MeditationEditorProps, ScriptStats } from './types';
import { useAudioTags } from './hooks/useAudioTags';
import { useEditorCursor } from './hooks/useEditorCursor';
import { useKeyboard } from './hooks/useKeyboard';
import { ControlPanel } from './components/ControlPanel';
import { GenerateButton } from './components/GenerateButton';

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

const EditIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MeditationEditor = memo<MeditationEditorProps>(
  ({
    script,
    meditationType,
    selectedVoice,
    selectedMusic,
    selectedTags,
    availableMusic,
    availableTags,
    onVoiceSelect,
    onMusicSelect,
    onTagToggle,
    onGenerate,
    onClose,
    isGenerating,
    readOnly = false,
    source,
  }) => {
    // Local state
    const [editedScript, setEditedScript] = useState(script);
    const [cursorPosition, setCursorPosition] = useState<number | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    // Hooks
    const { renderStyledContent, stats } = useAudioTags(editedScript);
    const { restoreCursorPosition, insertAtCursor } = useEditorCursor(editorRef);

    // Keyboard shortcuts
    useKeyboard({
      onClose,
      onGenerate: () => onGenerate(editedScript),
      canGenerate: !!selectedVoice && !isGenerating && !!editedScript.trim(),
      isActive: true,
    });

    // Sync script prop with local state
    useEffect(() => {
      setEditedScript(script);
    }, [script]);

    // Handle content input
    const handleInput = useCallback(
      (e: React.FormEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const text = target.innerText;
        setEditedScript(text);
      },
      []
    );

    // Handle keyboard events for backspace/delete on tags
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const node = range.startContainer;
            // If inside a tag span, let default behavior handle it
            if (node.parentElement?.hasAttribute('data-tag')) {
              // Default behavior will remove the span
            }
          }
        }
      },
      []
    );

    // Handle tag insertion from control panel
    const handleTagInsert = useCallback(
      (tagLabel: string) => {
        const newCursorPos = insertAtCursor(
          tagLabel,
          editedScript,
          setEditedScript
        );
        setCursorPosition(newCursorPos);

        // Restore focus and cursor position after state update
        requestAnimationFrame(() => {
          if (editorRef.current) {
            editorRef.current.focus();
            restoreCursorPosition(newCursorPos);
          }
        });
      },
      [editedScript, insertAtCursor, restoreCursorPosition]
    );

    // Restore cursor position after state update
    useEffect(() => {
      if (cursorPosition !== null && editorRef.current) {
        editorRef.current.focus();
        restoreCursorPosition(cursorPosition);
        setCursorPosition(null);
      }
    }, [cursorPosition, restoreCursorPosition]);

    // Handle generate button click
    const handleGenerate = useCallback(() => {
      if (!selectedVoice) {
        onVoiceSelect();
        return;
      }
      onGenerate(editedScript);
    }, [editedScript, selectedVoice, onGenerate, onVoiceSelect]);

    // Prevent body scroll when editor is open
    useEffect(() => {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }, []);

    return (
      <div
        className="fixed inset-0 z-[100] bg-[#020617] animate-in fade-in duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        {/* Desktop: Centered modal container / Mobile: Full screen */}
        <div
          className="
            h-full flex flex-col overflow-hidden
            md:h-auto md:max-h-[90vh] md:w-full md:max-w-3xl
            md:mx-auto md:my-[5vh]
            md:rounded-3xl md:border md:border-white/10
            md:shadow-2xl md:shadow-black/50
          "
        >
          {/* Script Editing Area - Contains header elements and text */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-4 md:px-6"
            style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
          >
            <div className="relative h-full">
              {/* Top Bar - Stats left, Edit hint center, Close right */}
              <div className="flex items-center justify-between py-3 mb-2">
                {/* Left: Duration stat */}
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-cyan-400 font-bold text-sm">
                    {stats.estimatedMinutes}
                  </span>
                  <span className="text-white/50 text-xs">min</span>
                </div>

                {/* Center: Edit hint */}
                {!readOnly && (
                  <div className="flex items-center gap-1 text-[10px] md:text-xs text-white/40">
                    <EditIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tap to edit</span>
                    <span className="sm:hidden">Tap to edit</span>
                  </div>
                )}

                {/* Right: Close button */}
                <button
                  onClick={onClose}
                  aria-label="Close editor"
                  className="w-9 h-9 flex items-center justify-center text-white/40 hover:text-white transition-colors duration-200 active:scale-95"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Editable Area */}
              <div
                ref={editorRef}
                contentEditable={!readOnly}
                suppressContentEditableWarning
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                role="textbox"
                aria-multiline="true"
                aria-label="Meditation script editor"
                aria-readonly={readOnly}
                tabIndex={0}
                className={`
                  w-full min-h-[200px] md:min-h-[300px]
                  bg-transparent text-white/90 text-base md:text-lg leading-relaxed
                  outline-none whitespace-pre-wrap break-words
                  ${readOnly ? 'cursor-default' : 'cursor-text'}
                `}
                style={{
                  fontSize: '16px', // Prevent iOS zoom on focus
                  wordBreak: 'break-word',
                }}
              >
                {renderStyledContent}
              </div>

              {/* Placeholder */}
              {!editedScript && (
                <div className="absolute top-16 left-0 text-white/30 text-base md:text-lg pointer-events-none">
                  Your meditation script...
                </div>
              )}
            </div>
          </div>

          {/* Control Panel */}
          <ControlPanel
            selectedVoice={selectedVoice}
            selectedMusic={selectedMusic}
            availableMusic={availableMusic}
            availableTags={availableTags}
            onVoiceSelect={onVoiceSelect}
            onMusicSelect={onMusicSelect}
            onTagInsert={handleTagInsert}
          />

          {/* Generate Button */}
          <GenerateButton
            selectedVoice={selectedVoice}
            isGenerating={isGenerating}
            onClick={handleGenerate}
            disabled={!editedScript.trim()}
          />
        </div>
      </div>
    );
  }
);

MeditationEditor.displayName = 'MeditationEditor';

// Default export for lazy loading
export default MeditationEditor;

// Re-export types
export type { MeditationEditorProps, ScriptStats, ControlTab } from './types';
