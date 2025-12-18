import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Voice persistence will be disabled.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

// Auth helpers
export const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Update last login
  if (data.user) {
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id);
  }

  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getCurrentUserProfile = async (): Promise<User | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

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
// Note: We use 'accent' field to store the preferred Gemini voice name (Zephyr, Kore, Puck, Fenrir)
export const createVoiceProfile = async (
  name: string,
  description?: string,
  language: string = 'en-US',
  geminiVoice: string = 'Kore' // Default Gemini voice
): Promise<VoiceProfile | null> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('voice_profiles')
    .insert({
      user_id: user.id,
      name,
      description,
      language,
      accent: geminiVoice, // Store Gemini voice name in accent field
      status: 'READY', // Mark as ready since we're using Gemini voices
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getUserVoiceProfiles = async (): Promise<VoiceProfile[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

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
  if (!user) throw new Error('User not authenticated');

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
  if (!user) throw new Error('User not authenticated');

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
  if (!user) throw new Error('User not authenticated');

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
  if (!user) return [];

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
  if (!user) throw new Error('User not authenticated');

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
      throw new Error(error.message || 'Failed to save voice clone. Please check if the voice_clones table exists.');
    }
    return data;
  } catch (err: any) {
    console.error('Error in createVoiceClone:', err);
    throw err;
  }
};

export const getUserVoiceClones = async (): Promise<VoiceClone[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('voice_clones')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Auth state listener
export const onAuthStateChange = (callback: (user: any) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
};
