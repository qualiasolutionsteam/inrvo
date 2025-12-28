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

import React, { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import type { MeditationEditorProps, ScriptStats } from './types';
import { useAudioTags } from './hooks/useAudioTags';
import { useEditorCursor } from './hooks/useEditorCursor';
import { useKeyboard } from './hooks/useKeyboard';
import { ControlPanel } from './components/ControlPanel';
import { GenerateButton } from './components/GenerateButton';
import Starfield from '@/components/Starfield';
import { geminiService } from '../../../geminiService';

// Voice preview sample text - short but representative
const VOICE_PREVIEW_TEXT = `Take a deep breath in... and slowly release. Let yourself settle into this moment of calm.`;

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
    const [isHarmonizing, setIsHarmonizing] = useState(false);
    const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
    const [previewingMusicId, setPreviewingMusicId] = useState<string | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    const musicPreviewRef = useRef<HTMLAudioElement | null>(null);

    // Sanitize script content to prevent XSS attacks
    // Only allow text content - strip all HTML tags except our audio tag spans
    const sanitizedScript = useMemo(() => {
      // DOMPurify with strict config - only allow text content
      const config = {
        ALLOWED_TAGS: [], // No HTML tags allowed in the text content
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true, // Keep text content, remove tags
      };
      return DOMPurify.sanitize(editedScript, config);
    }, [editedScript]);

    // Hooks - use sanitized script for rendering
    const { renderStyledContent, stats } = useAudioTags(sanitizedScript);
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

    // Handle harmonize - AI-powered audio tag insertion
    const handleHarmonize = useCallback(async () => {
      if (!sanitizedScript.trim() || isHarmonizing) return;

      setIsHarmonizing(true);
      try {
        // Use sanitized script for API call
        const harmonizedScript = await geminiService.harmonizeScript(sanitizedScript);
        setEditedScript(harmonizedScript);
        toast.success('Script harmonized', {
          description: 'Audio tags have been added for natural pacing',
        });
      } catch (error: unknown) {
        console.error('Failed to harmonize script:', error);
        const errorMessage = error instanceof Error ? error.message : 'Please try again';
        toast.error('Failed to harmonize', {
          description: errorMessage,
        });
      } finally {
        setIsHarmonizing(false);
      }
    }, [sanitizedScript, isHarmonizing]);

    // Handle voice preview generation
    const handleGenerateVoicePreview = useCallback(async () => {
      if (!selectedVoice || isGeneratingPreview) return;

      setIsGeneratingPreview(true);
      setVoicePreviewUrl(null);

      try {
        // Dynamically import voiceService to maintain code splitting
        const { voiceService } = await import('../../lib/voiceService');

        // Generate preview audio using the selected voice
        const result = await voiceService.generateSpeech(
          VOICE_PREVIEW_TEXT,
          selectedVoice
        );

        if (!result.base64) {
          throw new Error('Failed to generate audio');
        }

        // Convert base64 to blob and create object URL
        const binaryString = atob(result.base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setVoicePreviewUrl(audioUrl);

        toast.success('Preview ready', {
          description: `Listen to "${selectedVoice.name}" voice sample`,
        });
      } catch (error: unknown) {
        console.error('Failed to generate voice preview:', error);
        const errorMessage = error instanceof Error ? error.message : 'Could not generate voice preview';
        toast.error('Preview failed', {
          description: errorMessage,
        });
      } finally {
        setIsGeneratingPreview(false);
      }
    }, [selectedVoice, isGeneratingPreview]);

    // Stop voice preview and cleanup
    const handleStopVoicePreview = useCallback(() => {
      if (voicePreviewUrl) {
        URL.revokeObjectURL(voicePreviewUrl);
        setVoicePreviewUrl(null);
      }
    }, [voicePreviewUrl]);

    // Clear voice preview when voice changes
    useEffect(() => {
      handleStopVoicePreview();
    }, [selectedVoice?.id]);

    // Cleanup preview URL on unmount
    useEffect(() => {
      return () => {
        if (voicePreviewUrl) {
          URL.revokeObjectURL(voicePreviewUrl);
        }
      };
    }, []);

    // Handle music preview toggle
    const handleMusicPreviewToggle = useCallback((track: typeof availableMusic[0]) => {
      // If already previewing this track, stop it
      if (previewingMusicId === track.id) {
        if (musicPreviewRef.current) {
          musicPreviewRef.current.pause();
          musicPreviewRef.current.currentTime = 0;
        }
        setPreviewingMusicId(null);
        return;
      }

      // Stop any current preview
      if (musicPreviewRef.current) {
        musicPreviewRef.current.pause();
        musicPreviewRef.current.currentTime = 0;
      }

      // Start new preview if track has audio
      if (track.audioUrl) {
        const audio = new Audio(track.audioUrl);
        audio.volume = 0.5; // Preview at 50% volume
        audio.onended = () => {
          setPreviewingMusicId(null);
        };
        audio.onerror = () => {
          setPreviewingMusicId(null);
        };
        musicPreviewRef.current = audio;
        setPreviewingMusicId(track.id);
        audio.play().catch(() => {
          setPreviewingMusicId(null);
        });
      }
    }, [previewingMusicId]);

    // Stop music preview (used when closing panel or switching tabs)
    const handleStopMusicPreview = useCallback(() => {
      if (musicPreviewRef.current) {
        musicPreviewRef.current.pause();
        musicPreviewRef.current.currentTime = 0;
      }
      setPreviewingMusicId(null);
    }, []);

    // Cleanup music preview on unmount
    useEffect(() => {
      return () => {
        if (musicPreviewRef.current) {
          musicPreviewRef.current.pause();
        }
      };
    }, []);

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
      // Use sanitized script for generation
      onGenerate(sanitizedScript);
    }, [sanitizedScript, selectedVoice, onGenerate, onVoiceSelect]);

    // Handle close - stop music before closing
    const handleClose = useCallback(() => {
      handleStopMusicPreview();
      handleStopVoicePreview();
      onClose();
    }, [handleStopMusicPreview, handleStopVoicePreview, onClose]);

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
        {/* Starfield background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Starfield />
        </div>

        {/* Desktop: Centered modal container / Mobile: Full screen */}
        <div
          className="
            relative h-full flex flex-col overflow-hidden
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
              {/* Top Bar - Responsive layout */}
              <div className="flex items-center justify-between py-3 mb-2 relative z-10">
                {/* Left section - Duration stat (desktop only, mobile shows on right) */}
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-cyan-400 font-bold text-sm">
                      {stats.estimatedMinutes}
                    </span>
                    <span className="text-white/50 text-xs">min</span>
                  </div>
                </div>

                {/* Center: Edit hint */}
                {!readOnly && (
                  <div className="flex items-center gap-1 text-[10px] md:text-xs text-white/40">
                    <EditIcon className="w-3.5 h-3.5" />
                    <span>Tap to edit</span>
                  </div>
                )}

                {/* Right section */}
                <div className="flex items-center gap-1.5">
                  {/* Mobile: Duration stat */}
                  <div className="md:hidden flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-cyan-400 font-bold text-xs">
                      {stats.estimatedMinutes}
                    </span>
                    <span className="text-white/50 text-[10px]">min</span>
                  </div>

                  {/* Close button - larger touch target for mobile */}
                  <button
                    onClick={handleClose}
                    aria-label="Close editor"
                    className="w-11 h-11 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors duration-200 active:scale-95 relative z-20"
                  >
                    <CloseIcon className="w-5 h-5" />
                  </button>
                </div>
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
            onHarmonize={handleHarmonize}
            isHarmonizing={isHarmonizing}
            voicePreviewUrl={voicePreviewUrl}
            isGeneratingPreview={isGeneratingPreview}
            previewingMusicId={previewingMusicId}
            onMusicPreviewToggle={handleMusicPreviewToggle}
            onGenerateVoicePreview={handleGenerateVoicePreview}
            onStopVoicePreview={handleStopVoicePreview}
            onStopMusicPreview={handleStopMusicPreview}
          />

          {/* Generate Button */}
          <GenerateButton
            selectedVoice={selectedVoice}
            isGenerating={isGenerating}
            onClick={handleGenerate}
            disabled={!sanitizedScript.trim()}
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
