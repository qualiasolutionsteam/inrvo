import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { trackAuth, setUserContext, clearUserContext } from '../src/lib/tracking';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials not found. Voice persistence will be disabled.');
}

// Only create client if we have real credentials
export const supabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ============================================================================
// Retry utility with exponential backoff for database operations
// ============================================================================

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableErrors?: string[];
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  retryableErrors: [
    'network_error',
    'PGRST301', // Connection error
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'fetch failed',
    'Failed to fetch',
    'NetworkError',
  ],
};

/**
 * Check if an error is retryable (network/connection issues)
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false;
  const errorString = String(error.message || error.code || error);
  return retryableErrors.some(e => errorString.includes(e));
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a database operation with retry logic and exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry non-retryable errors (auth errors, validation errors, etc.)
      if (!isRetryableError(error, opts.retryableErrors)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff + jitter
      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 100,
        opts.maxDelayMs
      );

      console.warn(
        `Database operation failed (attempt ${attempt + 1}/${opts.maxRetries + 1}), ` +
        `retrying in ${Math.round(delay)}ms:`,
        error.message || error
      );

      await sleep(delay);
    }
  }

  // All retries exhausted
  throw lastError;
}

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
  provider_voice_id?: string;
  voice_sample_url?: string;
  fish_audio_model_id?: string;  // Fish Audio model ID (primary provider)
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
  audio_tags_used?: string[];
  audio_url?: string;
  is_favorite?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AudioTagPreference {
  enabled: boolean;
  favorite_tags: string[];
}

// Auth helpers
export const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  // Combine names for the trigger and also keep separate fields
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
        }
      }
    });

    if (error) {
      trackAuth.signInFailed(error.message);
      throw error;
    }

    // Track successful signup and set user context
    if (data.user) {
      trackAuth.signUpCompleted(data.user.id);
      setUserContext({ id: data.user.id, email: data.user.email });
    }

    return data;
  } catch (error: any) {
    trackAuth.signInFailed(error.message || 'Unknown signup error');
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  trackAuth.signInStarted();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      trackAuth.signInFailed(error.message);
      throw error;
    }

    // Update last login
    if (data.user && supabase) {
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id);

      // Track successful sign in and set user context
      trackAuth.signInCompleted(data.user.id);
      setUserContext({ id: data.user.id, email: data.user.email });
    }

    return data;
  } catch (error: any) {
    trackAuth.signInFailed(error.message || 'Unknown sign-in error');
    throw error;
  }
};

export const signOut = async () => {
  if (!supabase) return;

  trackAuth.signOut();
  clearUserContext();

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
  providerVoiceId?: string // Provider voice ID (for cloned voices via Chatterbox)
): Promise<VoiceProfile | null> => {
  const user = await getCurrentUser();
  if (!user || !supabase) throw new Error('User not authenticated or Supabase not configured');

  const profileData: any = {
    user_id: user.id,
    name,
    description,
    language,
    provider: providerVoiceId ? 'chatterbox' : 'Gemini',
    status: 'READY',
  };

  // Set Gemini voice for non-cloned voices
  if (geminiVoice && !providerVoiceId) {
    profileData.accent = geminiVoice;
  }

  // Set provider voice ID for cloned voices (Chatterbox via Replicate)
  if (providerVoiceId) {
    profileData.provider_voice_id = providerVoiceId;
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

// Fields needed for voice profile display and TTS
const VOICE_PROFILE_FIELDS = 'id, user_id, name, description, language, provider, provider_voice_id, voice_sample_url, fish_audio_model_id, status, cloning_status, created_at, updated_at' as const;

export const getUserVoiceProfiles = async (): Promise<VoiceProfile[]> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return [];

  return withRetry(async () => {
    const { data, error } = await supabase
      .from('voice_profiles')
      .select(VOICE_PROFILE_FIELDS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  });
};

export const getVoiceProfileById = async (id: string): Promise<VoiceProfile | null> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return null;

  const { data, error } = await supabase
    .from('voice_profiles')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('Error fetching voice profile:', error);
    return null;
  }
  return data;
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

/**
 * Delete a voice profile and all associated resources
 * - Deletes voice sample files from Supabase Storage
 * - Deletes the database record
 * Note: Fish Audio models are NOT deleted (they remain in Fish Audio cloud)
 * as we don't have an endpoint to delete them. Consider manual cleanup if needed.
 */
export const deleteVoiceProfile = async (id: string): Promise<void> => {
  const user = await getCurrentUser();
  if (!user || !supabase) throw new Error('User not authenticated or Supabase not configured');

  // First, fetch the voice profile to get associated resources
  const { data: profile, error: fetchError } = await supabase
    .from('voice_profiles')
    .select('voice_sample_url, fish_audio_model_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError) {
    console.warn('Could not fetch voice profile for cleanup:', fetchError);
  }

  // Delete voice sample from storage if it exists
  if (profile?.voice_sample_url) {
    try {
      // Extract the storage path from the URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/voice-samples/userId/filename.wav
      const url = new URL(profile.voice_sample_url);
      const pathMatch = url.pathname.match(/\/voice-samples\/(.+)$/);
      if (pathMatch) {
        const storagePath = pathMatch[1];
        const { error: storageError } = await supabase.storage
          .from('voice-samples')
          .remove([storagePath]);
        if (storageError) {
          console.warn('Failed to delete voice sample from storage:', storageError);
        }
      }
    } catch (e) {
      console.warn('Error cleaning up voice sample:', e);
    }
  }

  // Delete the database record
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

  return withRetry(async () => {
    const { data, error } = await supabase
      .from('voice_clones')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  });
};

// Meditation History operations

/**
 * Convert base64 audio to a Blob
 */
function base64ToBlob(base64: string, mimeType: string = 'audio/wav'): Blob {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Upload meditation audio to Supabase Storage
 */
export const uploadMeditationAudio = async (
  audioBase64: string,
  meditationId: string
): Promise<string | null> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return null;

  try {
    // Convert base64 to blob
    const audioBlob = base64ToBlob(audioBase64, 'audio/wav');

    // Create unique filename: userId/meditationId_timestamp.wav
    const fileName = `${user.id}/${meditationId}_${Date.now()}.wav`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('meditation-audio')
      .upload(fileName, audioBlob, {
        contentType: 'audio/wav',
        upsert: false
      });

    if (error) {
      console.error('Error uploading meditation audio:', error);
      return null;
    }

    return data.path;
  } catch (error) {
    console.error('Error uploading meditation audio:', error);
    return null;
  }
};

/**
 * Get public URL for meditation audio
 */
export const getMeditationAudioUrl = (audioPath: string): string | null => {
  if (!supabase || !audioPath) return null;

  const { data } = supabase.storage
    .from('meditation-audio')
    .getPublicUrl(audioPath);

  return data?.publicUrl || null;
};

/**
 * Get signed URL for meditation audio (for private buckets)
 */
export const getMeditationAudioSignedUrl = async (audioPath: string): Promise<string | null> => {
  if (!supabase || !audioPath) return null;

  const { data, error } = await supabase.storage
    .from('meditation-audio')
    .createSignedUrl(audioPath, 3600); // 1 hour expiry

  if (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }

  return data?.signedUrl || null;
};

export const saveMeditationHistory = async (
  prompt: string,
  enhancedScript?: string,
  voiceId?: string,
  voiceName?: string,
  backgroundTrackId?: string,
  backgroundTrackName?: string,
  durationSeconds?: number,
  audioTagsUsed?: string[],
  audioBase64?: string
): Promise<MeditationHistory | null> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return null;

  // First, insert the meditation history record
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
      audio_tags_used: audioTagsUsed || [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving meditation history:', error);
    return null;
  }

  // If we have audio data, upload it and update the record
  if (audioBase64 && data) {
    const audioPath = await uploadMeditationAudio(audioBase64, data.id);

    if (audioPath) {
      // Update the record with the audio URL
      const { data: updatedData, error: updateError } = await supabase
        .from('meditation_history')
        .update({ audio_url: audioPath })
        .eq('id', data.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating meditation with audio URL:', updateError);
        return data; // Return original data even if audio update failed
      }

      return updatedData;
    }
  }

  return data;
};

// Fields needed for meditation history display
const MEDITATION_HISTORY_FIELDS = 'id, user_id, prompt, voice_name, background_track_name, duration_seconds, audio_url, is_favorite, created_at, updated_at' as const;

export const getMeditationHistory = async (limit = 50): Promise<MeditationHistory[]> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return [];

  return withRetry(async () => {
    const { data, error } = await supabase
      .from('meditation_history')
      .select(MEDITATION_HISTORY_FIELDS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching meditation history:', error);
      throw error;
    }
    return data || [];
  });
};

/**
 * Get meditation history with pagination support
 * Returns data and hasMore flag for infinite scroll / load more
 */
export interface PaginatedHistoryResult {
  data: MeditationHistory[];
  hasMore: boolean;
  totalCount: number;
}

export const getMeditationHistoryPaginated = async (
  page = 0,
  pageSize = 20
): Promise<PaginatedHistoryResult> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return { data: [], hasMore: false, totalCount: 0 };

  return withRetry(async () => {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('meditation_history')
      .select(MEDITATION_HISTORY_FIELDS, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching paginated meditation history:', error);
      throw error;
    }

    const totalCount = count || 0;
    const hasMore = (page + 1) * pageSize < totalCount;

    return {
      data: data || [],
      hasMore,
      totalCount,
    };
  });
};

export const deleteMeditationHistory = async (id: string): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return false;

  // First, get the record to find the audio URL
  const { data: record } = await supabase
    .from('meditation_history')
    .select('audio_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  // Delete audio file from storage if it exists
  if (record?.audio_url) {
    await supabase.storage
      .from('meditation-audio')
      .remove([record.audio_url]);
  }

  // Delete the database record
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

/**
 * Toggle favorite status for a meditation
 * Uses atomic database function to reduce 2 queries to 1
 */
export const toggleMeditationFavorite = async (id: string): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return false;

  try {
    // Use atomic RPC function for single-query toggle
    const { data, error } = await supabase.rpc('toggle_meditation_favorite', {
      p_meditation_id: id
    });

    if (error) {
      // Fallback to manual toggle if function doesn't exist yet
      if (error.message?.includes('function') || error.code === '42883') {
        console.warn('Atomic toggle not available, using fallback');
        return toggleMeditationFavoriteFallback(id, user.id);
      }
      console.error('Error toggling meditation favorite:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error toggling meditation favorite:', err);
    return false;
  }
};

// Fallback for environments without the RPC function
async function toggleMeditationFavoriteFallback(id: string, userId: string): Promise<boolean> {
  if (!supabase) return false;

  const { data: record } = await supabase
    .from('meditation_history')
    .select('is_favorite')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!record) return false;

  const { error } = await supabase
    .from('meditation_history')
    .update({ is_favorite: !record.is_favorite })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error toggling meditation favorite (fallback):', error);
    return false;
  }
  return true;
}

/**
 * Get favorite meditations
 */
export const getFavoriteMeditations = async (): Promise<MeditationHistory[]> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return [];

  return withRetry(async () => {
    const { data, error } = await supabase
      .from('meditation_history')
      .select(MEDITATION_HISTORY_FIELDS)
      .eq('user_id', user.id)
      .eq('is_favorite', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorite meditations:', error);
      throw error;
    }
    return data || [];
  });
};

// Audio Tag Preference operations
export const getAudioTagPreferences = async (): Promise<AudioTagPreference> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return { enabled: false, favorite_tags: [] };

  // Only select the field we need instead of the entire user row
  const { data, error } = await supabase
    .from('users')
    .select('audio_tag_preferences')
    .eq('id', user.id)
    .single();

  if (error || !data?.audio_tag_preferences) {
    return { enabled: false, favorite_tags: [] };
  }
  return data.audio_tag_preferences as AudioTagPreference;
};

export const updateAudioTagPreferences = async (
  preferences: Partial<AudioTagPreference>
): Promise<void> => {
  const user = await getCurrentUser();
  if (!user || !supabase) throw new Error('User not authenticated or Supabase not configured');

  // Get current preferences first
  const current = await getAudioTagPreferences();
  const updated = { ...current, ...preferences };

  const { error } = await supabase
    .from('users')
    .update({
      audio_tag_preferences: updated,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);

  if (error) throw error;
};

export const toggleFavoriteAudioTag = async (tagId: string): Promise<string[]> => {
  const prefs = await getAudioTagPreferences();
  const favorites = prefs.favorite_tags || [];

  const updated = favorites.includes(tagId)
    ? favorites.filter(id => id !== tagId)
    : [...favorites, tagId];

  await updateAudioTagPreferences({ favorite_tags: updated });
  return updated;
};

// Auth state listener
export const onAuthStateChange = (callback: (user: any) => void) => {
  if (!supabase) return { data: { subscription: null } };
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
};
