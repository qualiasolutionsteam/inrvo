-- Migration for Chatterbox voice cloning support
-- Adds provider_voice_id and voice_sample_url columns for multi-provider support

-- Add new columns to voice_profiles for Chatterbox/multi-provider support
ALTER TABLE voice_profiles
ADD COLUMN IF NOT EXISTS provider_voice_id TEXT,
ADD COLUMN IF NOT EXISTS voice_sample_url TEXT;

-- Add index for provider_voice_id lookups
CREATE INDEX IF NOT EXISTS idx_voice_profiles_provider_voice_id
ON voice_profiles(provider_voice_id) WHERE provider_voice_id IS NOT NULL;

-- Update provider column to use lowercase for new entries
-- Existing values will remain as-is for backwards compatibility
COMMENT ON COLUMN voice_profiles.provider IS 'Voice provider: browser, chatterbox, elevenlabs (lowercase for new entries)';

-- Create storage bucket for voice samples (used by Chatterbox)
-- Note: This needs to be done via Supabase Dashboard or API, not SQL
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('voice-samples', 'voice-samples', true)
-- ON CONFLICT (id) DO NOTHING;

-- Grant read access to authenticated users for voice samples
-- Note: Storage policies are typically managed via Dashboard
