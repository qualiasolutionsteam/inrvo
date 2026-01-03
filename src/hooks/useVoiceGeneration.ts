import { useState, useCallback, useRef, RefObject } from 'react';
import { VoiceProfile, ScriptTimingMap } from '../../types';
import { AUDIO_TAG_CATEGORIES } from '../../constants';
import { geminiService } from '../../geminiService';
import { voiceService } from '../lib/voiceService';
import { creditService } from '../lib/credits';
import { buildTimingMap } from '../lib/textSync';

type GenerationStage = 'idle' | 'script' | 'voice' | 'ready';

interface UseVoiceGenerationOptions {
  userId?: string;
  audioTagsEnabled?: boolean;
  selectedAudioTags?: string[];
  onError?: (error: string) => void;
  onScriptGenerated?: (script: string) => void;
  onAudioGenerated?: (audioBuffer: AudioBuffer, script: string, timingMap: ScriptTimingMap) => void;
}

interface UseVoiceGenerationReturn {
  // State
  script: string;
  editableScript: string;
  enhancedScript: string;
  originalPrompt: string;
  isGenerating: boolean;
  isExtending: boolean;
  generationStage: GenerationStage;
  showScriptPreview: boolean;

  // Setters
  setScript: (value: string) => void;
  setEditableScript: (value: string) => void;
  setShowScriptPreview: (value: boolean) => void;

  // Actions
  generateScript: (selectedVoice: VoiceProfile | null) => Promise<void>;
  extendScript: () => Promise<void>;
  playEditedScript: (
    selectedVoice: VoiceProfile,
    audioContextRef: RefObject<AudioContext | null>
  ) => Promise<{
    audioBuffer: AudioBuffer;
    timingMap: ScriptTimingMap;
  } | null>;

  // Utilities
  insertAudioTag: (tag: string, textareaRef: RefObject<HTMLTextAreaElement | null>) => void;
  clearGeneration: () => void;
}

export function useVoiceGeneration(
  options: UseVoiceGenerationOptions = {}
): UseVoiceGenerationReturn {
  const {
    userId,
    audioTagsEnabled = false,
    selectedAudioTags = [],
    onError,
    onScriptGenerated,
    onAudioGenerated,
  } = options;

  // Script state
  const [script, setScript] = useState('');
  const [editableScript, setEditableScript] = useState('');
  const [enhancedScript, setEnhancedScript] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [generationStage, setGenerationStage] = useState<GenerationStage>('idle');
  const [showScriptPreview, setShowScriptPreview] = useState(false);

  // Generate script from prompt (Step 1)
  const generateScript = useCallback(async (selectedVoice: VoiceProfile | null) => {
    if (!script.trim()) {
      onError?.('Please enter some text to generate a meditation');
      return;
    }

    // Require a cloned voice to generate
    if (!selectedVoice) {
      onError?.('Please clone a voice first to generate meditations');
      return;
    }

    setOriginalPrompt(script);
    setIsGenerating(true);
    setGenerationStage('script');

    try {
      // Check credits FIRST (fail fast before expensive operations)
      if (selectedVoice.isCloned) {
        const estimatedCost = creditService.calculateTTSCost(script, 150);
        const credits = await creditService.getCredits(userId);
        if (credits < estimatedCost) {
          onError?.(`Insufficient credits for TTS generation. Need ${estimatedCost} credits.`);
          setIsGenerating(false);
          setGenerationStage('idle');
          return;
        }
      }

      // Get audio tag labels from selected tag IDs (only if audio tags are enabled)
      const audioTagLabels = audioTagsEnabled && selectedAudioTags.length > 0
        ? AUDIO_TAG_CATEGORIES.flatMap(cat => cat.tags)
            .filter(tag => selectedAudioTags.includes(tag.id))
            .map(tag => tag.label)
        : undefined;

      // Generate enhanced meditation from short prompt
      const enhanced = await geminiService.enhanceScript(script, audioTagLabels);

      if (!enhanced || !enhanced.trim()) {
        throw new Error('Failed to generate meditation script. Please try again.');
      }

      // Show editable preview instead of auto-playing
      setEditableScript(enhanced);
      setShowScriptPreview(true);
      setIsGenerating(false);
      setGenerationStage('idle');

      onScriptGenerated?.(enhanced);
    } catch (error: unknown) {
      console.error('Failed to generate script:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate meditation. Please try again.';
      onError?.(errorMessage);
      setIsGenerating(false);
      setGenerationStage('idle');
    }
  }, [script, userId, audioTagsEnabled, selectedAudioTags, onError, onScriptGenerated]);

  // Extend the current script (Step 1b - optional)
  const extendScript = useCallback(async () => {
    if (!editableScript.trim()) return;

    setIsExtending(true);

    try {
      const extendedScript = await geminiService.extendScript(editableScript);
      setEditableScript(extendedScript);
    } catch (error: unknown) {
      console.error('Error extending script:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to extend script. Please try again.';
      onError?.(errorMessage);
    } finally {
      setIsExtending(false);
    }
  }, [editableScript, onError]);

  // Play the edited script (Step 2)
  const playEditedScript = useCallback(async (
    selectedVoice: VoiceProfile,
    audioContextRef: RefObject<AudioContext | null>
  ): Promise<{ audioBuffer: AudioBuffer; timingMap: ScriptTimingMap } | null> => {
    if (!editableScript.trim() || !selectedVoice) return null;

    setShowScriptPreview(false);
    setIsGenerating(true);
    setGenerationStage('voice');

    try {
      // Initialize audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Generate speech with the edited script
      const result = await voiceService.generateSpeech(
        editableScript,
        selectedVoice,
        audioContextRef.current
      );

      // Check if voice needs re-cloning (legacy Fish Audio/Chatterbox voice)
      if (result.needsReclone) {
        throw new Error('This voice needs to be re-cloned with ElevenLabs. Please go to Voice Settings and re-clone your voice.');
      }

      const { audioBuffer, base64 } = result;

      if (!base64 || base64.trim() === '') {
        throw new Error('Failed to generate audio. Please try again.');
      }

      if (!audioBuffer) {
        throw new Error('Failed to decode audio. Please try again.');
      }

      setGenerationStage('ready');

      // Update script state
      setScript(editableScript);
      setEnhancedScript(editableScript);

      // Build timing map
      const timingMap = buildTimingMap(editableScript, audioBuffer.duration);

      setIsGenerating(false);
      setGenerationStage('idle');

      // Notify caller
      onAudioGenerated?.(audioBuffer, editableScript, timingMap);

      return { audioBuffer, timingMap };
    } catch (error: unknown) {
      console.error('Failed to play edited script:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate audio. Please try again.';
      onError?.(errorMessage);
      setIsGenerating(false);
      setGenerationStage('idle');
      return null;
    }
  }, [editableScript, onError, onAudioGenerated]);

  // Insert audio tag at cursor position
  const insertAudioTag = useCallback((
    tag: string,
    textareaRef: RefObject<HTMLTextAreaElement | null>
  ) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = editableScript;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = before + ` ${tag} ` + after;
      setEditableScript(newText);

      // Restore cursor position after the inserted tag
      setTimeout(() => {
        if (textarea) {
          const newPosition = start + tag.length + 2;
          textarea.selectionStart = newPosition;
          textarea.selectionEnd = newPosition;
          textarea.focus();
        }
      }, 0);
    }
  }, [editableScript]);

  // Clear all generation state
  const clearGeneration = useCallback(() => {
    setScript('');
    setEditableScript('');
    setEnhancedScript('');
    setOriginalPrompt('');
    setIsGenerating(false);
    setIsExtending(false);
    setGenerationStage('idle');
    setShowScriptPreview(false);
  }, []);

  return {
    // State
    script,
    editableScript,
    enhancedScript,
    originalPrompt,
    isGenerating,
    isExtending,
    generationStage,
    showScriptPreview,

    // Setters
    setScript,
    setEditableScript,
    setShowScriptPreview,

    // Actions
    generateScript,
    extendScript,
    playEditedScript,

    // Utilities
    insertAudioTag,
    clearGeneration,
  };
}
