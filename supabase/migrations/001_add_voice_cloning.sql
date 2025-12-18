-- Migration for voice cloning feature
-- Adds support for ElevenLabs voice cloning

-- Update voice_profiles table to support ElevenLabs
ALTER TABLE voice_profiles
ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'Gemini',
ADD COLUMN IF NOT EXISTS elevenlabs_voice_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS cloning_status VARCHAR(50) DEFAULT 'NONE',
ADD COLUMN IF NOT EXISTS sample_duration FLOAT,
ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0;

-- Create user credits table
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_credits INTEGER DEFAULT 10000 NOT NULL,
  credits_used INTEGER DEFAULT 0 NOT NULL,
  credits_remaining INTEGER GENERATED ALWAYS AS (total_credits - credits_used) STORED,
  last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id)
);

-- Create voice cloning usage tracking table
CREATE TABLE IF NOT EXISTS voice_cloning_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_profile_id UUID REFERENCES voice_profiles(id) ON DELETE CASCADE,
  credits_consumed INTEGER NOT NULL,
  operation_type VARCHAR(50) NOT NULL, -- 'CLONE_CREATE', 'TTS_GENERATE'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create voice usage limits table
CREATE TABLE IF NOT EXISTS voice_usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_start DATE NOT NULL DEFAULT DATE_TRUNC('month', CURRENT_DATE),
  credits_used INTEGER DEFAULT 0 NOT NULL,
  credits_limit INTEGER DEFAULT 10000 NOT NULL,
  clones_created INTEGER DEFAULT 0 NOT NULL,
  clones_limit INTEGER DEFAULT 2 NOT NULL,
  UNIQUE(user_id, month_start)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_profiles_user_id ON voice_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_profiles_provider ON voice_profiles(provider);
CREATE INDEX IF NOT EXISTS idx_voice_profiles_elevenlabs_id ON voice_profiles(elevenlabs_voice_id) WHERE elevenlabs_voice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_cloning_usage_user_id ON voice_cloning_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_cloning_usage_created_at ON voice_cloning_usage(created_at);

-- Update existing voice profiles to have proper provider
UPDATE voice_profiles
SET provider = 'Gemini'
WHERE provider IS NULL OR provider = '';

-- Enable RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_cloning_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_usage_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own credits
CREATE POLICY "Users can view own credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own credits
CREATE POLICY "Users can update own credits" ON user_credits
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own credits
CREATE POLICY "Users can insert own credits" ON user_credits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read their own usage
CREATE POLICY "Users can view own usage" ON voice_cloning_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own usage
CREATE POLICY "Users can insert own usage" ON voice_cloning_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read their own limits
CREATE POLICY "Users can view own limits" ON voice_usage_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own limits
CREATE POLICY "Users can update own limits" ON voice_usage_limits
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own limits
CREATE POLICY "Users can insert own limits" ON voice_usage_limits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to initialize user credits
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_credits (user_id, total_credits)
  VALUES (
    NEW.id,
    CASE
      WHEN NEW.raw_user_meta_data->>'tier' = 'pro' THEN 500000
      WHEN NEW.raw_user_meta_data->>'tier' = 'starter' THEN 50000
      ELSE 10000 -- Free tier
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize credits on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_credits();