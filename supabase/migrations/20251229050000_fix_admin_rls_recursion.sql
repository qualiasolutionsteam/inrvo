-- Migration: Fix Admin RLS Policy Recursion
-- Date: 2025-12-29
-- Issue: Admin policies query `users` table which triggers RLS evaluation
--        which needs to check admin status again -> infinite recursion -> 500 error
-- Fix: Use SECURITY DEFINER function to bypass RLS when checking admin status

-- ============================================================================
-- STEP 1: Create a helper function that bypasses RLS to check admin status
-- ============================================================================

-- Drop if exists for idempotency
DROP FUNCTION IF EXISTS is_admin();

-- Create admin check function with SECURITY DEFINER (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Direct query bypasses RLS due to SECURITY DEFINER
  SELECT role INTO v_role
  FROM users
  WHERE id = auth.uid();

  RETURN COALESCE(v_role = 'ADMIN', false);
END;
$$;

COMMENT ON FUNCTION is_admin() IS
  'Check if current user is admin. Uses SECURITY DEFINER to bypass RLS and prevent recursion.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- ============================================================================
-- STEP 2: Drop the broken admin policies that cause recursion
-- ============================================================================

-- Users table
DROP POLICY IF EXISTS "Admins can view all user profiles" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- Meditation history
DROP POLICY IF EXISTS "Admins can view all meditation history" ON meditation_history;
DROP POLICY IF EXISTS "Admins can delete any meditation" ON meditation_history;

-- Voice profiles
DROP POLICY IF EXISTS "Admins can view all voice profiles" ON voice_profiles;
DROP POLICY IF EXISTS "Admins can delete any voice profile" ON voice_profiles;

-- Audio tag presets
DROP POLICY IF EXISTS "Admins can view all audio tag presets" ON audio_tag_presets;

-- ============================================================================
-- STEP 3: Recreate admin policies using the safe is_admin() function
-- ============================================================================

-- Users table: Admins can view all
CREATE POLICY "Admins can view all user profiles"
  ON users FOR SELECT
  USING (is_admin());

-- Users table: Admins can delete (non-admin users only for safety)
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  USING (is_admin() AND role != 'ADMIN');

-- Meditation history: Admins can view all
CREATE POLICY "Admins can view all meditation history"
  ON meditation_history FOR SELECT
  USING (is_admin());

-- Meditation history: Admins can delete any
CREATE POLICY "Admins can delete any meditation"
  ON meditation_history FOR DELETE
  USING (is_admin());

-- Voice profiles: Admins can view all
CREATE POLICY "Admins can view all voice profiles"
  ON voice_profiles FOR SELECT
  USING (is_admin());

-- Voice profiles: Admins can update any (for soft delete)
CREATE POLICY "Admins can update any voice profile"
  ON voice_profiles FOR UPDATE
  USING (is_admin());

-- Voice profiles: Admins can delete any
CREATE POLICY "Admins can delete any voice profile"
  ON voice_profiles FOR DELETE
  USING (is_admin());

-- Audio tag presets: Admins can view all (including inactive)
CREATE POLICY "Admins can view all audio tag presets"
  ON audio_tag_presets FOR SELECT
  USING (is_admin());

-- Audio tag presets: Admins can insert
CREATE POLICY "Admins can insert audio tag presets"
  ON audio_tag_presets FOR INSERT
  WITH CHECK (is_admin());

-- Audio tag presets: Admins can update
CREATE POLICY "Admins can update audio tag presets"
  ON audio_tag_presets FOR UPDATE
  USING (is_admin());

-- Audio tag presets: Admins can delete
CREATE POLICY "Admins can delete audio tag presets"
  ON audio_tag_presets FOR DELETE
  USING (is_admin());

-- ============================================================================
-- STEP 4: Update get_admin_analytics to use is_admin() for consistency
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
BEGIN
  -- Use is_admin() for consistent admin checking
  IF NOT is_admin() THEN
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

-- ============================================================================
-- Log migration completion
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration: Fixed admin RLS recursion';
  RAISE NOTICE '  - Created is_admin() SECURITY DEFINER function';
  RAISE NOTICE '  - Recreated all admin policies using is_admin()';
  RAISE NOTICE '  - Updated get_admin_analytics to use is_admin()';
END $$;
