/**
 * useEditorCursor Hook
 *
 * Provides cursor position management for contentEditable elements.
 * Extracted from shared logic between MeditationPanel and ScriptEditor.
 */

import { useCallback, RefObject } from 'react';

export interface UseEditorCursorReturn {
  /** Save current cursor position as character offset */
  saveCursorPosition: () => number | null;
  /** Restore cursor to a specific character offset */
  restoreCursorPosition: (pos: number) => void;
  /** Insert text at cursor position with proper spacing */
  insertAtCursor: (
    text: string,
    currentContent: string,
    onContentChange: (newContent: string) => void
  ) => number;
}

export function useEditorCursor(
  editorRef: RefObject<HTMLDivElement | null>
): UseEditorCursorReturn {
  /**
   * Save the current cursor position as a character offset from the start
   */
  const saveCursorPosition = useCallback((): number | null => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editorRef.current) return null;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    return preCaretRange.toString().length;
  }, [editorRef]);

  /**
   * Restore the cursor to a specific character offset
   */
  const restoreCursorPosition = useCallback(
    (pos: number): void => {
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
            nodeStack.push(children[i]!);
          }
        }
      }

      if (foundNode) {
        try {
          // Validate offset is within text node bounds
          const textLength = foundNode.textContent?.length || 0;
          const safeOffset = Math.min(Math.max(0, foundOffset), textLength);

          const range = document.createRange();
          range.setStart(foundNode, safeOffset);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (e) {
          // Cursor restoration failed - DOM may have changed
          // Fallback: try to place cursor at end of editor
          console.warn('Cursor restoration failed, placing at end:', e);
          try {
            const lastChild = editorRef.current?.lastChild;
            if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
              const range = document.createRange();
              range.setStart(lastChild, lastChild.textContent?.length || 0);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          } catch {
            // Silently fail - cursor position is lost but no crash
          }
        }
      }
    },
    [editorRef]
  );

  /**
   * Insert text at the current cursor position with proper spacing
   * Returns the new cursor position after insertion
   */
  const insertAtCursor = useCallback(
    (
      text: string,
      currentContent: string,
      onContentChange: (newContent: string) => void
    ): number => {
      const pos = saveCursorPosition();
      const insertPos = pos ?? currentContent.length;

      // Add space before if needed (not at start, not after space/newline)
      const needSpaceBefore =
        insertPos > 0 &&
        !/[\s\n]$/.test(currentContent.substring(0, insertPos));

      // Add space after if needed (not at end, not before space/newline)
      const needSpaceAfter =
        insertPos < currentContent.length &&
        !/^[\s\n]/.test(currentContent.substring(insertPos));

      const textWithSpacing =
        (needSpaceBefore ? ' ' : '') + text + (needSpaceAfter ? ' ' : '');

      const newContent =
        currentContent.substring(0, insertPos) +
        textWithSpacing +
        currentContent.substring(insertPos);

      const newCursorPos = insertPos + textWithSpacing.length;

      onContentChange(newContent);
      return newCursorPos;
    },
    [saveCursorPosition]
  );

  return {
    saveCursorPosition,
    restoreCursorPosition,
    insertAtCursor,
  };
}
