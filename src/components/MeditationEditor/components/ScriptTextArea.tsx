/**
 * ScriptTextArea Component
 *
 * contentEditable script editing area with styled audio tags.
 */

import React, { memo, useRef, useEffect, useCallback } from 'react';
import { useEditorCursor } from '../hooks/useEditorCursor';
import { useAudioTags } from '../hooks/useAudioTags';
import type { ScriptStats } from '../types';

// ============================================================================
// ICONS
// ============================================================================

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
// TYPES
// ============================================================================

interface ScriptTextAreaProps {
  content: string;
  onChange: (content: string) => void;
  onStatsChange?: (stats: ScriptStats) => void;
  readOnly?: boolean;
  placeholder?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ScriptTextArea = memo<ScriptTextAreaProps>(
  ({
    content,
    onChange,
    onStatsChange,
    readOnly = false,
    placeholder = 'Your meditation script...',
  }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const cursorPositionRef = useRef<number | null>(null);
    const { restoreCursorPosition } = useEditorCursor(editorRef);
    const { renderStyledContent, stats } = useAudioTags(content);

    // Notify parent of stats changes
    useEffect(() => {
      onStatsChange?.(stats);
    }, [stats, onStatsChange]);

    // Handle content input
    const handleInput = useCallback(
      (e: React.FormEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const text = target.innerText;
        onChange(text);
      },
      [onChange]
    );

    // Handle keyboard events for backspace/delete on tags
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
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
    }, []);

    // Restore cursor position after re-render
    useEffect(() => {
      if (cursorPositionRef.current !== null && editorRef.current) {
        editorRef.current.focus();
        restoreCursorPosition(cursorPositionRef.current);
        cursorPositionRef.current = null;
      }
    }, [content, restoreCursorPosition]);

    return (
      <div className="relative h-full">
        {/* Edit hint */}
        {!readOnly && (
          <div className="absolute top-2 right-2 md:top-3 md:right-3 flex items-center gap-1 text-[10px] md:text-xs text-white/40 z-10 pointer-events-none">
            <EditIcon />
            <span className="hidden sm:inline">Edit script below</span>
            <span className="sm:hidden">Tap to edit</span>
          </div>
        )}

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
            w-full h-full min-h-[200px] pt-8 md:pt-10
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
        {!content && (
          <div className="absolute top-8 md:top-10 left-0 text-white/30 text-base md:text-lg pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>
    );
  }
);

ScriptTextArea.displayName = 'ScriptTextArea';

// Export for use in main component
export { useEditorCursor };
