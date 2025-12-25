-- Migration for Fish Audio voice provider support
-- Adds fish_audio_model_id column for storing Fish Audio voice model IDs
-- Fish Audio provides higher quality TTS with zero-shot voice cloning

-- Add column for Fish Audio model ID (returned from POST /model)
ALTER TABLE voice_profiles
ADD COLUMN IF NOT EXISTS fish_audio_model_id TEXT;

-- Add index for Fish Audio model ID lookups
CREATE INDEX IF NOT EXISTS idx_voice_profiles_fish_audio_model_id
ON voice_profiles(fish_audio_model_id) WHERE fish_audio_model_id IS NOT NULL;

-- Update provider column comment
COMMENT ON COLUMN voice_profiles.provider IS 'Voice provider: browser, chatterbox, fish-audio';

-- Comment on the new column
COMMENT ON COLUMN voice_profiles.fish_audio_model_id IS 'Fish Audio model ID for zero-shot voice cloning. Used as reference_id in TTS API calls.';
