-- Migration: Security Fixes
-- Created: 2025-12-27
-- Description: Fixes security warnings from Supabase linter:
--   1. rate_limit_stats view with SECURITY DEFINER (ERROR)
--   2. 8 functions missing SET search_path = '' (WARN)
--   3. user_preferences RLS policies using auth.uid() instead of (SELECT auth.uid()) (WARN)

-- ============================================================================
-- FIX 1: rate_limit_stats VIEW (Remove SECURITY DEFINER)
-- ============================================================================

-- Drop and recreate the view with SECURITY INVOKER (the default, but explicit)
DROP VIEW IF EXISTS rate_limit_stats;

CREATE VIEW rate_limit_stats
WITH (security_invoker = true) AS
SELECT
  endpoint,
  COUNT(DISTINCT identifier) as unique_users,
  SUM(request_count) as total_requests,
  AVG(request_count)::INTEGER as avg_requests_per_user,
  MAX(request_count) as max_requests,
  MIN(window_start) as oldest_window,
  MAX(window_start) as newest_window
FROM rate_limits
WHERE window_start > NOW() - INTERVAL '1 hour'
GROUP BY endpoint
ORDER BY total_requests DESC;

COMMENT ON VIEW rate_limit_stats IS 'Rate limit statistics (security invoker mode)';

-- ============================================================================
-- FIX 2: FUNCTION SEARCH PATH (Add SET search_path = '')
-- ============================================================================

-- 2.1: check_rate_limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
) RETURNS TABLE(
  allowed BOOLEAN,
  remaining INTEGER,
  reset_at TIMESTAMPTZ,
  current_count INTEGER
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
  v_reset_at TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;

  INSERT INTO public.rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (p_identifier, p_endpoint, 1, NOW())
  ON CONFLICT (identifier, endpoint)
  DO UPDATE SET
    request_count = CASE
      WHEN public.rate_limits.window_start < v_window_start THEN 1
      ELSE public.rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN public.rate_limits.window_start < v_window_start THEN NOW()
      ELSE public.rate_limits.window_start
    END
  RETURNING
    public.rate_limits.request_count,
    public.rate_limits.window_start + (p_window_seconds || ' seconds')::INTERVAL
  INTO v_current_count, v_reset_at;

  allowed := v_current_count <= p_max_requests;
  remaining := GREATEST(0, p_max_requests - v_current_count);
  reset_at := v_reset_at;
  current_count := v_current_count;

  RETURN NEXT;
END;
$$;

-- 2.2: cleanup_old_rate_limits
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 2.3: update_user_preferences_timestamp (trigger function)
CREATE OR REPLACE FUNCTION update_user_preferences_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2.4: upsert_user_preferences
CREATE OR REPLACE FUNCTION upsert_user_preferences(
  p_user_id UUID,
  p_default_voice_id UUID DEFAULT NULL,
  p_background_volume DECIMAL DEFAULT 0.3,
  p_voice_volume DECIMAL DEFAULT 0.7,
  p_playback_rate DECIMAL DEFAULT 0.9,
  p_auto_play BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.user_preferences (
    user_id,
    default_voice_id,
    background_volume,
    voice_volume,
    playback_rate,
    auto_play
  )
  VALUES (
    p_user_id,
    p_default_voice_id,
    p_background_volume,
    p_voice_volume,
    p_playback_rate,
    p_auto_play
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    default_voice_id = COALESCE(EXCLUDED.default_voice_id, public.user_preferences.default_voice_id),
    background_volume = EXCLUDED.background_volume,
    voice_volume = EXCLUDED.voice_volume,
    playback_rate = EXCLUDED.playback_rate,
    auto_play = EXCLUDED.auto_play,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 2.5: batch_delete_meditations
CREATE OR REPLACE FUNCTION batch_delete_meditations(p_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.meditation_history
  WHERE id = ANY(p_ids)
    AND user_id = (SELECT auth.uid());

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 2.6: batch_toggle_favorites
CREATE OR REPLACE FUNCTION batch_toggle_favorites(p_ids UUID[], p_is_favorite BOOLEAN)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.meditation_history
  SET is_favorite = p_is_favorite
  WHERE id = ANY(p_ids)
    AND user_id = (SELECT auth.uid());

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- 2.7: batch_update_categories
CREATE OR REPLACE FUNCTION batch_update_categories(p_ids UUID[], p_content_category TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.meditation_history
  SET content_category = p_content_category
  WHERE id = ANY(p_ids)
    AND user_id = (SELECT auth.uid());

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- 2.8: get_meditation_stats
CREATE OR REPLACE FUNCTION get_meditation_stats()
RETURNS TABLE(
  total_meditations BIGINT,
  total_favorites BIGINT,
  categories JSONB
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_meditations,
    COUNT(*) FILTER (WHERE is_favorite)::BIGINT as total_favorites,
    COALESCE(
      jsonb_object_agg(
        COALESCE(mh.content_category, 'uncategorized'),
        cat_count
      ),
      '{}'::jsonb
    ) as categories
  FROM public.meditation_history mh
  CROSS JOIN LATERAL (
    SELECT COUNT(*) as cat_count
    FROM public.meditation_history mh2
    WHERE mh2.user_id = (SELECT auth.uid())
      AND COALESCE(mh2.content_category, 'uncategorized') = COALESCE(mh.content_category, 'uncategorized')
  ) counts
  WHERE mh.user_id = (SELECT auth.uid());
END;
$$;

-- ============================================================================
-- FIX 3: RLS POLICIES (Use (SELECT auth.uid()) for better performance)
-- ============================================================================

-- Drop existing policies on user_preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON user_preferences;

-- Recreate with optimized (SELECT auth.uid()) pattern
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own preferences"
  ON user_preferences FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION check_rate_limit IS 'Atomically check and increment rate limit counter (secure search_path)';
COMMENT ON FUNCTION cleanup_old_rate_limits IS 'Remove expired rate limit entries (secure search_path)';
COMMENT ON FUNCTION update_user_preferences_timestamp IS 'Trigger to update timestamp (secure search_path)';
COMMENT ON FUNCTION upsert_user_preferences IS 'Insert or update user preferences (secure search_path)';
COMMENT ON FUNCTION batch_delete_meditations IS 'Bulk delete meditations (secure search_path)';
COMMENT ON FUNCTION batch_toggle_favorites IS 'Bulk toggle favorites (secure search_path)';
COMMENT ON FUNCTION batch_update_categories IS 'Bulk update categories (secure search_path)';
COMMENT ON FUNCTION get_meditation_stats IS 'Get meditation statistics for current user (secure search_path)';
