-- Migration for meditation audio storage
-- Adds audio_url column to meditation_history for storing generated meditation audio

-- Add audio_url column to store the path to the audio file in Supabase Storage
ALTER TABLE meditation_history
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Add is_favorite column for marking favorite meditations
ALTER TABLE meditation_history
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Add index for favorite meditations lookups
CREATE INDEX IF NOT EXISTS idx_meditation_history_favorites
ON meditation_history(user_id, is_favorite) WHERE is_favorite = true;

-- Add index for audio_url lookups (to find meditations with/without audio)
CREATE INDEX IF NOT EXISTS idx_meditation_history_audio
ON meditation_history(user_id, audio_url) WHERE audio_url IS NOT NULL;

-- Storage bucket 'meditation-audio' needs to be created via Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket called 'meditation-audio'
-- 3. Set it to private (authenticated users only)
-- 4. Add RLS policies:
--    - SELECT: auth.uid() = (storage.foldername(name))[1]::uuid
--    - INSERT: auth.uid() = (storage.foldername(name))[1]::uuid
--    - DELETE: auth.uid() = (storage.foldername(name))[1]::uuid

-- Comment on the audio_url column
COMMENT ON COLUMN meditation_history.audio_url IS 'Path to the meditation audio file in Supabase Storage (meditation-audio bucket)';
COMMENT ON COLUMN meditation_history.is_favorite IS 'Whether this meditation is marked as a favorite';
