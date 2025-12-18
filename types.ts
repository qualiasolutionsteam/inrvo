
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

export interface VoiceProfile {
  id: string;
  name: string;
  provider: string;
  voiceName: string;
  description: string;
  isCloned?: boolean;
}

export interface BackgroundMusic {
  id: string;
  name: string;
  description: string;
  url: string;
  category: 'ambient' | 'nature' | 'binaural' | 'instrumental';
  duration: number; // in seconds, 0 for looping
}
