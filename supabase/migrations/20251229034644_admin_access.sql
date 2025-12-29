-- Migration 023: Admin Access Policies
-- Adds admin-level access to all tables for content moderation
-- Date: 2025-12-29

-- ============================================================================
-- ADMIN ACCESS: Users Table
-- ============================================================================

-- Admins can view all user profiles
CREATE POLICY "Admins can view all user profiles"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users admin_users
      WHERE admin_users.id = (SELECT auth.uid())
      AND admin_users.role = 'ADMIN'
    )
  );

-- Admins can delete users (cascade handled by foreign keys)
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users admin_users
      WHERE admin_users.id = (SELECT auth.uid())
      AND admin_users.role = 'ADMIN'
    )
  );

-- ============================================================================
-- ADMIN ACCESS: Meditation History
-- ============================================================================

-- Admins can view all meditation history (content moderation)
CREATE POLICY "Admins can view all meditation history"
  ON meditation_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'ADMIN'
    )
  );

-- Admins can delete any meditation (content moderation)
CREATE POLICY "Admins can delete any meditation"
  ON meditation_history FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'ADMIN'
    )
  );

-- ============================================================================
-- ADMIN ACCESS: Voice Profiles
-- ============================================================================

-- Admins can view all voice profiles
CREATE POLICY "Admins can view all voice profiles"
  ON voice_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'ADMIN'
    )
  );

-- Admins can delete any voice profile (content moderation)
CREATE POLICY "Admins can delete any voice profile"
  ON voice_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'ADMIN'
    )
  );

-- ============================================================================
-- ADMIN ACCESS: Audio Tag Presets
-- Note: migration 003 has a FOR ALL policy, but we need explicit SELECT for inactive tags
-- ============================================================================

-- Admins can view all audio tag presets (including inactive ones)
CREATE POLICY "Admins can view all audio tag presets"
  ON audio_tag_presets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'ADMIN'
    )
  );

-- ============================================================================
-- CREATE ADMIN FUNCTION: Aggregated Analytics with Role Check
-- Using SECURITY DEFINER to ensure admin-only access
-- ============================================================================

-- Create a function instead of a view for proper security
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
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM users)::bigint,
    (SELECT COUNT(*) FROM meditation_history)::bigint,
    (SELECT COUNT(*) FROM voice_profiles WHERE status != 'ARCHIVED')::bigint,
    (SELECT COUNT(*) FROM audio_tag_presets WHERE is_active = true)::bigint,
    (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days')::bigint,
    (SELECT COUNT(*) FROM meditation_history WHERE created_at > NOW() - INTERVAL '7 days')::bigint;
END;
$$;

-- Grant execute permission to authenticated users (function verifies admin internally)
GRANT EXECUTE ON FUNCTION get_admin_analytics() TO authenticated;

COMMENT ON FUNCTION get_admin_analytics() IS
  'Admin-only analytics function with aggregated counts. Verifies admin role internally.';

-- ============================================================================
-- Log migration completion
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 023: Admin access policies applied successfully';
  RAISE NOTICE '  - Admins can view/delete all users';
  RAISE NOTICE '  - Admins can view/delete all meditation history';
  RAISE NOTICE '  - Admins can view/delete all voice profiles';
  RAISE NOTICE '  - Admin analytics view created';
END $$;
