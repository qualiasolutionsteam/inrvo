import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials not found. Voice persistence will be disabled.');
}

// Only create client if we have real credentials
export const supabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Database types matching the existing schema
export type UserRole = 'USER' | 'ADMIN' | 'ENTERPRISE';
export type SubscriptionTier = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
export type VoiceProfileStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | 'ARCHIVED';
export type VoiceQuality = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXCELLENT';

export interface User {
  id: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  role: UserRole;
  tier: SubscriptionTier;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface VoiceProfile {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  language: string;
  gender?: string;
  age_range?: string;
  accent?: string;
  status: VoiceProfileStatus;
  quality?: VoiceQuality;
  quality_score?: number;
  elevenlabs_voice_id?: string;
  provider?: string;
  cloning_status?: string;
  sample_duration?: number;
  credits_used?: number;
  created_at: string;
  updated_at: string;
}

export interface VoiceSample {
  id: string;
  profile_id: string;
  filename: string;
  file_size: number;
  duration: number;
  format: 'WAV' | 'MP3' | 'OGG' | 'FLAC';
  sample_rate: number;
  storage_path: string;
  transcription?: string;
  quality_score?: number;
  created_at: string;
}

export interface AudioGeneration {
  id: string;
  profile_id: string;
  model_id: string;
  user_id: string;
  text: string;
  audio_url?: string;
  duration?: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at: string;
}

export interface MeditationHistory {
  id: string;
  user_id: string;
  prompt: string;
  enhanced_script?: string;
  voice_id?: string;
  voice_name?: string;
  background_track_id?: string;
  background_track_name?: string;
  duration_seconds?: number;
  created_at: string;
  updated_at: string;
}

// Auth helpers
export const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      }
    }
  });

  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Update last login
  if (data.user && supabase) {
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id);
  }

  return data;
};

export const signOut = async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getCurrentUserProfile = async (): Promise<User | null> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
  return data;
};

// Voice Profile operations
export const createVoiceProfile = async (
  name: string,
  description?: string,
  language: string = 'en-US',
  geminiVoice?: string, // Gemini voice name (optional for cloned voices)
  elevenlabsVoiceId?: string // ElevenLabs voice ID (for cloned voices)
): Promise<VoiceProfile | null> => {
  const user = await getCurrentUser();
  if (!user || !supabase) throw new Error('User not authenticated or Supabase not configured');

  const profileData: any = {
    user_id: user.id,
    name,
    description,
    language,
    provider: elevenlabsVoiceId ? 'ElevenLabs' : 'Gemini',
    status: 'READY',
  };

  // Set Gemini voice for non-cloned voices
  if (geminiVoice && !elevenlabsVoiceId) {
    profileData.accent = geminiVoice;
  }

  // Set ElevenLabs voice ID for cloned voices
  if (elevenlabsVoiceId) {
    profileData.elevenlabs_voice_id = elevenlabsVoiceId;
    profileData.cloning_status = 'READY';
    profileData.accent = null; // Clear Gemini voice for clones
  }

  try {
    const { data, error } = await supabase
      .from('voice_profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    // Handle duplicate key constraint specifically
    if (error.code === '23505') {
      if (error.message?.includes('voice_profiles_user_id_name_key')) {
        throw new Error(`A voice profile named "${name}" already exists. Please choose a different name.`);
      }
      // Handle any other unique constraint violations
      if (error.message?.includes('duplicate key')) {
        throw new Error(`A voice profile with this name already exists. Please choose a different name.`);
      }
    }
    throw error;
  }
};

export const getUserVoiceProfiles = async (): Promise<VoiceProfile[]> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return [];

  const { data, error } = await supabase
    .from('voice_profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const updateVoiceProfile = async (
  id: string,
  updates: Partial<VoiceProfile>
): Promise<VoiceProfile | null> => {
  const user = await getCurrentUser();
  if (!user || !supabase) throw new Error('User not authenticated or Supabase not configured');

  const { data, error } = await supabase
    .from('voice_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteVoiceProfile = async (id: string): Promise<void> => {
  const user = await getCurrentUser();
  if (!user || !supabase) throw new Error('User not authenticated or Supabase not configured');

  const { error } = await supabase
    .from('voice_profiles')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
};

// Audio Generation operations
export const saveAudioGeneration = async (
  profileId: string,
  modelId: string,
  text: string,
  audioUrl?: string,
  duration?: number
): Promise<AudioGeneration | null> => {
  const user = await getCurrentUser();
  if (!user || !supabase) throw new Error('User not authenticated or Supabase not configured');

  const { data, error } = await supabase
    .from('audio_generations')
    .insert({
      profile_id: profileId,
      model_id: modelId,
      user_id: user.id,
      text,
      text_hash: btoa(text).slice(0, 64), // Simple hash for caching
      audio_url: audioUrl,
      duration,
      status: audioUrl ? 'COMPLETED' : 'PENDING',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getUserAudioGenerations = async (limit = 20): Promise<AudioGeneration[]> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return [];

  const { data, error } = await supabase
    .from('audio_generations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

// Voice Clone operations
export interface VoiceClone {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  audio_data: string; // Base64 encoded audio
  voice_characteristics?: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const createVoiceClone = async (
  name: string,
  audioData: string, // Base64 encoded audio
  description?: string,
  voiceCharacteristics?: Record<string, any>
): Promise<VoiceClone | null> => {
  const user = await getCurrentUser();
  if (!user || !supabase) throw new Error('User not authenticated or Supabase not configured');

  // Check if audio data is too large (Supabase text field limit is ~1GB, but let's be safe)
  // Base64 encoding increases size by ~33%, so limit to ~10MB raw audio
  if (audioData.length > 15000000) {
    throw new Error('Audio file is too large. Please record a shorter sample (max 30 seconds).');
  }

  try {
    const { data, error } = await supabase
      .from('voice_clones')
      .insert({
        user_id: user.id,
        name,
        description,
        audio_data: audioData,
        voice_characteristics: voiceCharacteristics || {},
        is_active: true,
        is_default: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating voice clone:', error);
      // Handle duplicate key constraint specifically
      if (error.code === '23505') {
        if (error.message?.includes('unique_user_voice_name')) {
          throw new Error(`A voice clone named "${name}" already exists. Please choose a different name.`);
        }
        // Handle any other unique constraint violations
        if (error.message?.includes('duplicate key')) {
          throw new Error(`A voice clone with this name already exists. Please choose a different name.`);
        }
      }
      throw new Error(error.message || 'Failed to save voice clone. Please check if the voice_clones table exists.');
    }
    return data;
  } catch (err: any) {
    console.error('Error in createVoiceClone:', err);
    // Ensure duplicate key errors are properly propagated
    if (err.code === '23505' && err.message?.includes('duplicate key')) {
      if (err.message?.includes('unique_user_voice_name') || err.message?.includes('voice_clones')) {
        throw new Error(`A voice clone named "${name}" already exists. Please choose a different name.`);
      }
    }
    throw err;
  }
};

export const getUserVoiceClones = async (): Promise<VoiceClone[]> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return [];

  const { data, error } = await supabase
    .from('voice_clones')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Meditation History operations
export const saveMeditationHistory = async (
  prompt: string,
  enhancedScript?: string,
  voiceId?: string,
  voiceName?: string,
  backgroundTrackId?: string,
  backgroundTrackName?: string,
  durationSeconds?: number
): Promise<MeditationHistory | null> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return null;

  const { data, error } = await supabase
    .from('meditation_history')
    .insert({
      user_id: user.id,
      prompt,
      enhanced_script: enhancedScript,
      voice_id: voiceId,
      voice_name: voiceName,
      background_track_id: backgroundTrackId,
      background_track_name: backgroundTrackName,
      duration_seconds: durationSeconds,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving meditation history:', error);
    return null;
  }
  return data;
};

export const getMeditationHistory = async (limit = 50): Promise<MeditationHistory[]> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return [];

  const { data, error } = await supabase
    .from('meditation_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching meditation history:', error);
    return [];
  }
  return data || [];
};

export const deleteMeditationHistory = async (id: string): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return false;

  const { error } = await supabase
    .from('meditation_history')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting meditation history:', error);
    return false;
  }
  return true;
};

// Auth state listener
export const onAuthStateChange = (callback: (user: any) => void) => {
  if (!supabase) return { data: { subscription: null } };
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
};
