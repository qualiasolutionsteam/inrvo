/**
 * ScriptEditor Component
 *
 * Allows users to review, edit, and customize their meditation script
 * before generating audio. Includes audio tag insertion and voice selection.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { VoiceProfile } from '../types';
import { AUDIO_TAG_CATEGORIES } from '../constants';

// ============================================================================
// AUDIO TAG REGEX - matches [tag name] patterns
// ============================================================================
const AUDIO_TAG_REGEX = /\[([^\]]+)\]/g;

// ============================================================================
// ICONS
// ============================================================================

const CloseIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const TagIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M7 7h.01M7 3h5a2 2 0 012 2l6 6a2 2 0 010 2.83l-6 6a2 2 0 01-2.83 0l-6-6A2 2 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const VoiceIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const SparkleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
  </svg>
);

// ============================================================================
// TYPES
// ============================================================================

interface ScriptEditorProps {
  script: string;
  meditationType: string;
  onClose: () => void;
  onGenerate: (script: string, selectedTags: string[]) => void;
  selectedVoice: VoiceProfile | null;
  onRequestVoiceSelection: () => void;
  isGenerating?: boolean;
}

// Common audio tags for quick insertion
const QUICK_TAGS = [
  { tag: '[pause]', label: 'Pause', description: '2-3 second pause' },
  { tag: '[long pause]', label: 'Long Pause', description: '5-6 second pause' },
  { tag: '[deep breath]', label: 'Deep Breath', description: 'Breathing cue' },
  { tag: '[exhale slowly]', label: 'Exhale', description: 'Slow exhale cue' },
  { tag: '[silence]', label: 'Silence', description: '4-5 seconds silence' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  script,
  meditationType,
  onClose,
  onGenerate,
  selectedVoice,
  onRequestVoiceSelection,
  isGenerating = false,
}) => {
  const [editableScript, setEditableScript] = useState(script);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);

  // Save and restore cursor position in contenteditable
  const saveCursorPosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editorRef.current) return null;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    return preCaretRange.toString().length;
  }, []);

  const restoreCursorPosition = useCallback((pos: number) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection) return;

    let charCount = 0;
    const nodeStack: Node[] = [editorRef.current];
    let foundNode: Node | null = null;
    let foundOffset = 0;

    while (nodeStack.length > 0) {
      const node = nodeStack.pop()!;

      if (node.nodeType === Node.TEXT_NODE) {
        const textLength = node.textContent?.length || 0;
        if (charCount + textLength >= pos) {
          foundNode = node;
          foundOffset = pos - charCount;
          break;
        }
        charCount += textLength;
      } else {
        const children = node.childNodes;
        for (let i = children.length - 1; i >= 0; i--) {
          nodeStack.push(children[i]);
        }
      }
    }

    if (foundNode) {
      const range = document.createRange();
      range.setStart(foundNode, foundOffset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, []);

  // Render script with styled audio tags
  const renderStyledContent = useMemo(() => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    const regex = new RegExp(AUDIO_TAG_REGEX.source, 'g');

    while ((match = regex.exec(editableScript)) !== null) {
      // Add text before the tag
      if (match.index > lastIndex) {
        parts.push(editableScript.slice(lastIndex, match.index));
      }

      // Add styled tag
      parts.push(
        <span
          key={match.index}
          className="audio-tag"
          contentEditable={false}
          data-tag={match[0]}
        >
          {match[0]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < editableScript.length) {
      parts.push(editableScript.slice(lastIndex));
    }

    return parts;
  }, [editableScript]);

  // Calculate word count and estimated duration
  const wordCount = editableScript.split(/\s+/).filter(w => !w.startsWith('[')).length;
  const estimatedMinutes = Math.round(wordCount / 100); // ~100 words per minute at meditative pace

  // Count existing audio tags
  const tagCount = (editableScript.match(/\[[^\]]+\]/g) || []).length;

  // Insert tag at cursor position
  const insertTag = useCallback((tag: string) => {
    const pos = saveCursorPosition();
    const insertPos = pos ?? editableScript.length;

    const text = editableScript;
    const before = text.substring(0, insertPos);
    const after = text.substring(insertPos);

    // Add space before and after if needed
    const needSpaceBefore = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n');
    const needSpaceAfter = after.length > 0 && !after.startsWith(' ') && !after.startsWith('\n');

    const newText = before + (needSpaceBefore ? ' ' : '') + tag + (needSpaceAfter ? ' ' : '') + after;
    setEditableScript(newText);

    // Update cursor position after tag
    const newCursorPos = insertPos + tag.length + (needSpaceBefore ? 1 : 0) + (needSpaceAfter ? 1 : 0);
    setCursorPosition(newCursorPos);
    setShowTagMenu(false);
  }, [editableScript, saveCursorPosition]);

  // Restore cursor position after state update
  useEffect(() => {
    if (cursorPosition !== null && editorRef.current) {
      editorRef.current.focus();
      restoreCursorPosition(cursorPosition);
      setCursorPosition(null);
    }
  }, [cursorPosition, restoreCursorPosition]);

  // Handle generate button click
  const handleGenerate = () => {
    if (!selectedVoice) {
      onRequestVoiceSelection();
      return;
    }
    onGenerate(editableScript, selectedTags);
  };

  // Format meditation type for display
  const formatMeditationType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900/95 via-cyan-950/90 to-slate-900/95 border border-white/20 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 shrink-0">
              <SparkleIcon />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-medium text-white truncate">Review Your Meditation</h2>
              <p className="text-xs sm:text-sm text-white/50 truncate">{formatMeditationType(meditationType)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors shrink-0 ml-2"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {/* Stats Bar - Responsive grid on mobile */}
          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm">
            <div className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className="text-white/50 hidden sm:inline">Words:</span>
              <span className="text-white font-medium">{wordCount}</span>
              <span className="text-white/50 sm:hidden">w</span>
            </div>
            <div className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className="text-white/50 hidden sm:inline">Duration:</span>
              <span className="text-white font-medium">~{estimatedMinutes}</span>
              <span className="text-white/50 sm:hidden">m</span>
              <span className="text-white/50 hidden sm:inline">min</span>
            </div>
            <div className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <TagIcon />
              <span className="text-white font-medium">{tagCount}</span>
              <span className="text-white/50 hidden sm:inline">Tags</span>
            </div>
          </div>

          {/* Quick Tag Buttons */}
          <div className="mb-3 sm:mb-4">
            <div className="flex items-center gap-2 mb-2">
              <TagIcon />
              <span className="text-xs sm:text-sm text-white/70">Quick Insert:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {QUICK_TAGS.map(({ tag, label, description }) => (
                <button
                  key={tag}
                  onClick={() => insertTag(tag)}
                  className="group flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full
                           bg-gradient-to-r from-purple-500/20 to-violet-500/20
                           hover:from-purple-500/30 hover:to-violet-500/30
                           border border-purple-500/30 hover:border-purple-400/50
                           text-purple-200 text-[10px] sm:text-xs font-medium transition-all duration-200
                           "
                  title={description}
                >
                  <span className="text-purple-400">+</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Script Editor */}
          <div className="relative">
            <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex items-center gap-1 text-[10px] sm:text-xs text-white/40 z-10">
              <EditIcon />
              <span className="hidden sm:inline">Edit script below</span>
              <span className="sm:hidden">Edit</span>
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => {
                const target = e.currentTarget;
                // Extract text content, preserving the actual tag text
                const text = target.innerText;
                setEditableScript(text);
              }}
              onKeyDown={(e) => {
                // Prevent default behavior for backspace on tag spans
                if (e.key === 'Backspace' || e.key === 'Delete') {
                  const selection = window.getSelection();
                  if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const node = range.startContainer;
                    // Check if we're at the edge of a tag span
                    if (node.parentElement?.hasAttribute('data-tag')) {
                      // Let default behavior handle it
                    }
                  }
                }
              }}
              className="w-full h-48 sm:h-64 md:h-80 p-3 sm:p-4 pt-8 sm:pt-10 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10
                       text-white/90 text-xs sm:text-sm leading-relaxed overflow-y-auto
                       focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
                       transition-all duration-200 whitespace-pre-wrap"
              style={{ minHeight: '12rem' }}
            >
              {renderStyledContent}
            </div>
            {!editableScript && (
              <div className="absolute top-8 sm:top-10 left-3 sm:left-4 text-white/30 text-xs sm:text-sm pointer-events-none">
                Your meditation script will appear here...
              </div>
            )}
          </div>

        </div>

        {/* Footer - Stacked on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-white/10 bg-white/5 shrink-0">
          {/* Voice Selection */}
          <button
            onClick={onRequestVoiceSelection}
            className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 sm:py-2 rounded-xl
                     bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                     text-white/70 hover:text-white transition-all duration-200 w-full sm:w-auto"
          >
            <VoiceIcon />
            {selectedVoice ? (
              <span className="text-sm truncate max-w-[200px]">{selectedVoice.name}</span>
            ) : (
              <span className="text-sm text-amber-400">Select Voice</span>
            )}
          </button>

          {/* Action Buttons - Full width on mobile */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 rounded-xl text-white/60 hover:text-white
                       hover:bg-white/10 border border-white/10 sm:border-transparent transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !editableScript.trim()}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-5 sm:px-7 py-2.5 rounded-xl font-medium
                       transition-all duration-300 ease-out
                       ${isGenerating || !editableScript.trim()
                         ? 'bg-white/[0.06] text-white/30 cursor-not-allowed border border-white/[0.04]'
                         : selectedVoice
                           ? 'generate-btn bg-gradient-to-r from-cyan-500 via-cyan-400 to-purple-500 text-white hover:from-cyan-400 hover:via-cyan-300 hover:to-purple-400 hover:scale-[1.02] active:scale-[0.98]'
                           : 'bg-gradient-to-r from-purple-500/80 to-purple-600/80 text-white hover:from-purple-400 hover:to-purple-500 border border-purple-400/30'
                       }`}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  <span className="hidden sm:inline">Generating...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : selectedVoice ? (
                <>
                  <PlayIcon />
                  <span className="hidden sm:inline">Generate Audio</span>
                  <span className="sm:hidden">Generate</span>
                </>
              ) : (
                <>
                  <VoiceIcon />
                  <span className="hidden sm:inline">Select Voice First</span>
                  <span className="sm:hidden">Select Voice</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptEditor;
