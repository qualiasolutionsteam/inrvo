/**
 * ScriptEditor Component
 *
 * Allows users to review, edit, and customize their meditation script
 * before generating audio. Includes audio tag insertion and voice selection.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { VoiceProfile } from '../types';
import { AUDIO_TAG_CATEGORIES } from '../constants';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);

  // Calculate word count and estimated duration
  const wordCount = editableScript.split(/\s+/).filter(w => !w.startsWith('[')).length;
  const estimatedMinutes = Math.round(wordCount / 100); // ~100 words per minute at meditative pace

  // Count existing audio tags
  const tagCount = (editableScript.match(/\[[^\]]+\]/g) || []).length;

  // Insert tag at cursor position
  const insertTag = useCallback((tag: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = editableScript;

    // Add space before and after if needed
    const before = text.substring(0, start);
    const after = text.substring(end);
    const needSpaceBefore = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n');
    const needSpaceAfter = after.length > 0 && !after.startsWith(' ') && !after.startsWith('\n');

    const newText = before + (needSpaceBefore ? ' ' : '') + tag + (needSpaceAfter ? ' ' : '') + after;
    setEditableScript(newText);

    // Update cursor position after tag
    const newCursorPos = start + tag.length + (needSpaceBefore ? 1 : 0) + (needSpaceAfter ? 1 : 0);
    setCursorPosition(newCursorPos);
    setShowTagMenu(false);
  }, [editableScript]);

  // Restore cursor position after state update
  useEffect(() => {
    if (cursorPosition !== null && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      setCursorPosition(null);
    }
  }, [cursorPosition]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/95 via-indigo-950/90 to-slate-900/95 border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <SparkleIcon />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">Review Your Meditation</h2>
              <p className="text-sm text-white/50">{formatMeditationType(meditationType)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Stats Bar */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className="text-white/50">Words:</span>
              <span className="text-white font-medium">{wordCount}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className="text-white/50">Duration:</span>
              <span className="text-white font-medium">~{estimatedMinutes} min</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <TagIcon />
              <span className="text-white/50">Tags:</span>
              <span className="text-white font-medium">{tagCount}</span>
            </div>
          </div>

          {/* Quick Tag Buttons */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <TagIcon />
              <span className="text-sm text-white/70">Quick Insert Audio Cues:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_TAGS.map(({ tag, label, description }) => (
                <button
                  key={tag}
                  onClick={() => insertTag(tag)}
                  className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full
                           bg-gradient-to-r from-indigo-500/20 to-purple-500/20
                           hover:from-indigo-500/30 hover:to-purple-500/30
                           border border-indigo-500/30 hover:border-indigo-400/50
                           text-indigo-200 text-xs font-medium transition-all duration-200
                           hover:shadow-[0_0_15px_-5px_rgba(99,102,241,0.5)]"
                  title={description}
                >
                  <span className="text-indigo-400">+</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Script Editor */}
          <div className="relative">
            <div className="absolute top-3 right-3 flex items-center gap-1 text-xs text-white/40">
              <EditIcon />
              <span>Edit script below</span>
            </div>
            <textarea
              ref={textareaRef}
              value={editableScript}
              onChange={(e) => setEditableScript(e.target.value)}
              className="w-full h-80 p-4 pt-10 rounded-2xl bg-white/5 border border-white/10
                       text-white/90 text-sm leading-relaxed resize-none
                       focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20
                       placeholder:text-white/30 transition-all duration-200"
              placeholder="Your meditation script will appear here..."
            />
          </div>

          {/* Audio Tag Tips */}
          <div className="mt-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <h4 className="text-sm font-medium text-indigo-300 mb-2">Tips for a Better Meditation</h4>
            <ul className="text-xs text-white/60 space-y-1">
              <li>Add [pause] after important phrases for reflection</li>
              <li>Use [deep breath] to guide the listener's breathing</li>
              <li>Place [long pause] between major sections</li>
              <li>These tags create natural silences in the audio</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/5">
          {/* Voice Selection */}
          <button
            onClick={onRequestVoiceSelection}
            className="flex items-center gap-2 px-4 py-2 rounded-xl
                     bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                     text-white/70 hover:text-white transition-all duration-200"
          >
            <VoiceIcon />
            {selectedVoice ? (
              <span className="text-sm">{selectedVoice.name}</span>
            ) : (
              <span className="text-sm text-amber-400">Select Voice</span>
            )}
          </button>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-white/60 hover:text-white
                       hover:bg-white/10 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !editableScript.trim()}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium
                       transition-all duration-200
                       ${isGenerating || !editableScript.trim()
                         ? 'bg-white/10 text-white/40 cursor-not-allowed'
                         : selectedVoice
                           ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50'
                           : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500 shadow-lg shadow-amber-500/30'
                       }`}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  <span>Generating...</span>
                </>
              ) : selectedVoice ? (
                <>
                  <PlayIcon />
                  <span>Generate Audio</span>
                </>
              ) : (
                <>
                  <VoiceIcon />
                  <span>Select Voice First</span>
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
