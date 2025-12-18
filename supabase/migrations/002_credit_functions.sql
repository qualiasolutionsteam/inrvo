-- SQL functions for credit management

-- Function to deduct credits from user account
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE user_credits
  SET
    credits_used = credits_used + p_amount,
    last_updated = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment clone count for the current month
CREATE OR REPLACE FUNCTION increment_clone_count(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO voice_usage_limits (user_id, month_start, clones_created)
  VALUES (p_user_id, DATE_TRUNC('month', CURRENT_DATE), 1)
  ON CONFLICT (user_id, month_start)
  DO UPDATE SET
    clones_created = voice_usage_limits.clones_created + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to add TTS credits usage
CREATE OR REPLACE FUNCTION add_tts_usage(p_user_id UUID, p_voice_profile_id UUID, p_credits_consumed INTEGER)
RETURNS void AS $$
BEGIN
  -- Update monthly usage
  INSERT INTO voice_usage_limits (user_id, month_start, credits_used)
  VALUES (p_user_id, DATE_TRUNC('month', CURRENT_DATE), p_credits_consumed)
  ON CONFLICT (user_id, month_start)
  DO UPDATE SET
    credits_used = voice_usage_limits.credits_used + p_credits_consumed;

  -- Update user credits
  UPDATE user_credits
  SET
    credits_used = credits_used + p_credits_consumed,
    last_updated = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for voice profile updates
CREATE OR REPLACE FUNCTION update_voice_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to voice_profiles table
CREATE TRIGGER voice_profiles_updated_at
  BEFORE UPDATE ON voice_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_profile_timestamp();