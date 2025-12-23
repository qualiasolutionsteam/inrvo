-- Migration: Add soft delete support for voice profiles
-- This allows recovery of accidentally deleted voices

-- Add soft delete columns to voice_profiles
ALTER TABLE voice_profiles
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index for efficient filtering of non-deleted profiles
CREATE INDEX IF NOT EXISTS idx_voice_profiles_not_deleted
ON voice_profiles(user_id)
WHERE is_deleted = FALSE;

-- Update RLS policies to exclude deleted profiles by default
DROP POLICY IF EXISTS "Users can view their own voice profiles" ON voice_profiles;
CREATE POLICY "Users can view their own voice profiles"
ON voice_profiles FOR SELECT
USING (auth.uid() = user_id AND is_deleted = FALSE);

-- Allow users to soft delete their own profiles
DROP POLICY IF EXISTS "Users can update their own voice profiles" ON voice_profiles;
CREATE POLICY "Users can update their own voice profiles"
ON voice_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Create a function to soft delete a voice profile
CREATE OR REPLACE FUNCTION soft_delete_voice_profile(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE voice_profiles
  SET is_deleted = TRUE, deleted_at = NOW(), updated_at = NOW()
  WHERE id = profile_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;

-- Create a function to restore a soft-deleted voice profile
CREATE OR REPLACE FUNCTION restore_voice_profile(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE voice_profiles
  SET is_deleted = FALSE, deleted_at = NULL, updated_at = NOW()
  WHERE id = profile_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;

-- Add soft delete to voice_clones table as well
ALTER TABLE voice_clones
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_voice_clones_not_deleted
ON voice_clones(user_id)
WHERE is_deleted = FALSE;

-- Update voice_clones RLS to exclude deleted
DROP POLICY IF EXISTS "Users can select own voice clones" ON voice_clones;
CREATE POLICY "Users can select own voice clones"
ON voice_clones FOR SELECT
USING (auth.uid() = user_id AND is_deleted = FALSE);

COMMENT ON COLUMN voice_profiles.is_deleted IS 'Soft delete flag - profiles with TRUE are not shown by default';
COMMENT ON COLUMN voice_profiles.deleted_at IS 'Timestamp when the profile was soft deleted';
