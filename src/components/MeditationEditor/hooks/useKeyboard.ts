/**
 * useKeyboard Hook
 *
 * Provides keyboard shortcuts for the meditation editor.
 * - Escape: Close the editor
 * - Ctrl/Cmd + Enter: Generate audio
 */

import { useEffect, useCallback } from 'react';

export interface UseKeyboardOptions {
  /** Called when Escape is pressed */
  onClose: () => void;
  /** Called when Ctrl/Cmd + Enter is pressed */
  onGenerate: () => void;
  /** Whether generation is allowed (voice selected, not generating) */
  canGenerate: boolean;
  /** Whether the editor is active/mounted */
  isActive?: boolean;
}

export function useKeyboard({
  onClose,
  onGenerate,
  canGenerate,
  isActive = true,
}: UseKeyboardOptions): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isActive) return;

      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Ctrl/Cmd + Enter to generate
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (canGenerate) {
          e.preventDefault();
          onGenerate();
        }
        return;
      }
    },
    [onClose, onGenerate, canGenerate, isActive]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
