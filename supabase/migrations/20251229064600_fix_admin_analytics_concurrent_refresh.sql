-- Migration: Fix Admin Analytics Concurrent Refresh Issue
-- Date: 2025-12-29
-- Problem: REFRESH MATERIALIZED VIEW CONCURRENTLY fails if view was never populated
-- Solution: Catch the error and fall back to non-concurrent refresh

-- ============================================================================
-- Fix refresh_admin_analytics() function
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_admin_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try concurrent refresh first (non-blocking)
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY admin_analytics_cache;
  EXCEPTION WHEN OTHERS THEN
    -- Fall back to non-concurrent refresh if concurrent fails
    -- This can happen if the view was never populated or has no unique index
    REFRESH MATERIALIZED VIEW admin_analytics_cache;
  END;
END;
$$;

COMMENT ON FUNCTION refresh_admin_analytics() IS
  'Refreshes admin analytics cache. Attempts concurrent refresh, falls back to blocking refresh if needed.';

-- ============================================================================
-- Fix get_admin_analytics() to not fail on refresh errors
-- ============================================================================

CREATE OR REPLACE FUNCTION get_admin_analytics()
RETURNS TABLE (
  total_users bigint,
  total_meditations bigint,
  total_voice_profiles bigint,
  total_audio_tags bigint,
  new_users_7d bigint,
  new_meditations_7d bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_updated timestamptz;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Check if cache needs refresh (older than 5 minutes)
  SELECT aac.last_updated INTO v_last_updated FROM admin_analytics_cache aac LIMIT 1;

  IF v_last_updated IS NULL OR v_last_updated < NOW() - INTERVAL '5 minutes' THEN
    -- Try to refresh cache, but don't fail if refresh errors
    BEGIN
      PERFORM refresh_admin_analytics();
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with stale data
      RAISE WARNING 'Failed to refresh admin analytics cache: %', SQLERRM;
    END;
  END IF;

  -- Return cached data (even if refresh failed)
  RETURN QUERY
  SELECT
    c.total_users,
    c.total_meditations,
    c.total_voice_profiles,
    c.total_audio_tags,
    c.new_users_7d,
    c.new_meditations_7d
  FROM admin_analytics_cache c;
END;
$$;

COMMENT ON FUNCTION get_admin_analytics() IS
  'Admin-only analytics function. Uses materialized view for 90% faster response. Auto-refreshes every 5 minutes. Gracefully handles refresh errors.';

-- Ensure view has fresh data
REFRESH MATERIALIZED VIEW admin_analytics_cache;
