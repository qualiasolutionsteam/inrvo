/**
 * Type definitions for MeditationEditor component
 */

import type { VoiceProfile } from '../../../types';
import type { BackgroundTrack } from '../../../constants';
import type { MeditationType } from '../../lib/agent/knowledgeBase';

export interface AudioTagCategory {
  id: string;
  name: string;
  color: string;
  tags: { id: string; label: string; description?: string }[];
}

export interface MeditationEditorProps {
  /** The initial script text */
  script: string;

  /** Type of meditation for display purposes */
  meditationType?: MeditationType;

  /** Currently selected voice profile */
  selectedVoice: VoiceProfile | null;

  /** Currently selected background track */
  selectedMusic: BackgroundTrack | null;

  /** IDs of selected audio tags to insert */
  selectedTags: string[];

  /** Available background tracks to choose from */
  availableMusic: BackgroundTrack[];

  /** Available audio tag categories */
  availableTags: AudioTagCategory[];

  /** Called when user taps voice selection */
  onVoiceSelect: () => void;

  /** Called when user selects a music track */
  onMusicSelect: (track: BackgroundTrack) => void;

  /** Called when user toggles an audio tag */
  onTagToggle: (tagId: string) => void;

  /** Called when user confirms generation with edited script */
  onGenerate: (editedScript: string) => void;

  /** Called when user closes the editor */
  onClose: () => void;

  /** Whether audio generation is in progress */
  isGenerating: boolean;

  /** Optional: Read-only mode (for viewing saved meditations) */
  readOnly?: boolean;

  /** Optional: Source context (agent-chat, direct, library) */
  source?: 'agent' | 'direct' | 'library';
}

export interface ScriptStats {
  wordCount: number;
  estimatedMinutes: number;
  tagCount: number;
}

export type ControlTab = 'voice' | 'music' | 'tags';
