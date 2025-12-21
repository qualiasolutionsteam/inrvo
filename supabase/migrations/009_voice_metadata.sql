-- Migration for voice cloning metadata
-- Adds metadata column for improved voice clone accuracy

-- Add metadata column to voice_profiles table
ALTER TABLE voice_profiles
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add comment explaining the metadata structure
COMMENT ON COLUMN voice_profiles.metadata IS 'Voice cloning metadata: { language, accent, gender, ageRange, hasBackgroundNoise, useCase, descriptive }';

-- Create index for metadata queries (e.g., filtering by language)
CREATE INDEX IF NOT EXISTS idx_voice_profiles_metadata ON voice_profiles USING GIN (metadata);

-- Optional: Add a function to get voices by language
CREATE OR REPLACE FUNCTION get_voices_by_language(p_user_id UUID, p_language TEXT)
RETURNS SETOF voice_profiles AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM voice_profiles
  WHERE user_id = p_user_id
    AND metadata->>'language' = p_language
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
