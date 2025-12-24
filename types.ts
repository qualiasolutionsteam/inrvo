
export enum View {
  HOME = 'home',
  WRITER = 'writer',
  STUDIO = 'studio',
  MIXER = 'mixer',
  PLAYER = 'player',
  CLONE = 'clone'
}

export interface SoundLayer {
  id: string;
  name: string;
  type: 'base' | 'texture';
  volume: number;
  url: string;
}

export interface ScriptTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
}

// Voice providers (only browser and chatterbox are implemented)
// Legacy providers ('ElevenLabs', 'Gemini') are treated as browser fallback
export type VoiceProvider = 'browser' | 'chatterbox';

export interface VoiceProfile {
  id: string;
  name: string;
  provider?: VoiceProvider;
  voiceName: string;
  description: string;
  isCloned?: boolean;
  providerVoiceId?: string;        // Provider voice ID (Chatterbox, etc.)
}

export interface BackgroundMusic {
  id: string;
  name: string;
  description: string;
  url: string;
  category: 'ambient' | 'nature' | 'binaural' | 'instrumental';
  duration: number; // in seconds, 0 for looping
}

export interface AudioTag {
  id: string;
  label: string;        // Display label like "[long pause]"
  description: string;  // Tooltip description
  category: 'pauses' | 'breathing' | 'voice' | 'sounds';
}

export interface AudioTagCategory {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  tags: AudioTag[];
}

// Text synchronization types for inline player
export interface TextSegment {
  type: 'word' | 'pause' | 'audioTag';
  content: string;
  startTime: number;
  endTime: number;
  wordIndex?: number;
  sentenceIndex: number;
}

export interface ScriptTimingMap {
  segments: TextSegment[];
  totalDuration: number;
  wordCount: number;
  sentenceCount: number;
}

export interface PlaybackProgress {
  currentTime: number;
  duration: number;
  percent: number;
  currentWordIndex: number;
  isPlaying: boolean;
}

// Voice cloning status types
export type CloningStatus =
  | { state: 'idle' }
  | { state: 'recording' }
  | { state: 'validating' }
  | { state: 'processing_audio' }                                         // Converting WebM to WAV
  | { state: 'uploading'; progress?: number; provider?: VoiceProvider }  // Generic upload state
  | { state: 'uploading_to_chatterbox'; progress?: number }               // Chatterbox via Replicate
  | { state: 'saving_to_database' }
  | { state: 'success'; voiceId: string; voiceName: string }
  | { state: 'error'; message: string; canRetry: boolean };

export interface CreditInfo {
  canClone: boolean;
  creditsRemaining: number;
  clonesRemaining: number;
  cloneCost: number;
  reason?: string;
}

// Voice cloning metadata for improved accuracy
export interface VoiceMetadata {
  language: string;           // ISO code: 'en', 'es', 'fr', etc.
  accent: string;             // 'american', 'british', 'australian', etc.
  gender: 'male' | 'female' | 'other';
  ageRange: 'young' | 'middle-aged' | 'mature';
  hasBackgroundNoise: boolean;
  useCase?: string;           // 'meditation', 'narration', 'conversational'
  descriptive?: string;       // 'calm', 'warm', 'soothing'
}

// Supported languages for voice cloning
export const VOICE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'pl', label: 'Polish' },
  { code: 'nl', label: 'Dutch' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ko', label: 'Korean' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
  { code: 'tr', label: 'Turkish' },
  { code: 'ru', label: 'Russian' },
  { code: 'sv', label: 'Swedish' },
  { code: 'id', label: 'Indonesian' },
  { code: 'fil', label: 'Filipino' },
  { code: 'th', label: 'Thai' },
  { code: 'vi', label: 'Vietnamese' },
] as const;

// Supported accents grouped by language
export const VOICE_ACCENTS: Record<string, { value: string; label: string }[]> = {
  en: [
    { value: 'american', label: 'American' },
    { value: 'british', label: 'British' },
    { value: 'australian', label: 'Australian' },
    { value: 'indian', label: 'Indian' },
    { value: 'canadian', label: 'Canadian' },
    { value: 'irish', label: 'Irish' },
    { value: 'scottish', label: 'Scottish' },
    { value: 'south-african', label: 'South African' },
  ],
  es: [
    { value: 'castilian', label: 'Castilian (Spain)' },
    { value: 'mexican', label: 'Mexican' },
    { value: 'argentinian', label: 'Argentinian' },
    { value: 'colombian', label: 'Colombian' },
  ],
  fr: [
    { value: 'parisian', label: 'Parisian (France)' },
    { value: 'canadian-french', label: 'Canadian French' },
    { value: 'belgian', label: 'Belgian' },
  ],
  pt: [
    { value: 'brazilian', label: 'Brazilian' },
    { value: 'european', label: 'European (Portugal)' },
  ],
  de: [
    { value: 'german', label: 'German (Germany)' },
    { value: 'austrian', label: 'Austrian' },
    { value: 'swiss', label: 'Swiss' },
  ],
  ar: [
    { value: 'gulf', label: 'Gulf Arabic' },
    { value: 'egyptian', label: 'Egyptian' },
    { value: 'levantine', label: 'Levantine' },
  ],
  zh: [
    { value: 'mandarin', label: 'Mandarin' },
    { value: 'cantonese', label: 'Cantonese' },
  ],
  // Default for languages without specific accents
  default: [
    { value: 'native', label: 'Native' },
  ],
};

// Get accents for a language code
export function getAccentsForLanguage(langCode: string): { value: string; label: string }[] {
  return VOICE_ACCENTS[langCode] || VOICE_ACCENTS.default;
}

// Default voice metadata
export const DEFAULT_VOICE_METADATA: VoiceMetadata = {
  language: 'en',
  accent: 'american',
  gender: 'female',
  ageRange: 'middle-aged',
  hasBackgroundNoise: false,
  useCase: 'meditation',
  descriptive: 'calm',
};
