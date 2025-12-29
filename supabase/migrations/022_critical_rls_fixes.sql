-- Migration 022: Critical RLS Security Fixes
-- Addresses production audit findings for missing RLS policies
-- Date: 2025-12-29

-- ============================================================================
-- CRITICAL FIX 1: Add RLS to meditation_history table
-- Risk: User meditation history was accessible to other authenticated users
-- ============================================================================

-- Enable RLS on meditation_history (may already be enabled, but ensure it is)
ALTER TABLE meditation_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "Users can view own meditation history" ON meditation_history;
DROP POLICY IF EXISTS "Users can insert own meditation history" ON meditation_history;
DROP POLICY IF EXISTS "Users can update own meditation history" ON meditation_history;
DROP POLICY IF EXISTS "Users can delete own meditation history" ON meditation_history;

-- Create comprehensive RLS policies for meditation_history
CREATE POLICY "Users can view own meditation history"
  ON meditation_history FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own meditation history"
  ON meditation_history FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own meditation history"
  ON meditation_history FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own meditation history"
  ON meditation_history FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

COMMENT ON POLICY "Users can view own meditation history" ON meditation_history IS
  'RLS: Users can only view their own meditation history records';

-- ============================================================================
-- CRITICAL FIX 2: Add RLS to users table (extended profile)
-- Risk: Extended user profile data was exposed to other users
-- ============================================================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create comprehensive RLS policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING ((SELECT auth.uid()) = id);

COMMENT ON POLICY "Users can view own profile" ON users IS
  'RLS: Users can only view their own extended profile';

-- ============================================================================
-- HIGH PRIORITY FIX: Add missing INSERT/DELETE policies to voice_profiles
-- Existing: SELECT and UPDATE policies
-- Missing: INSERT and DELETE policies
-- ============================================================================

-- Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "Users can insert own voice profiles" ON voice_profiles;
DROP POLICY IF EXISTS "Users can delete own voice profiles" ON voice_profiles;

-- Create INSERT policy for voice_profiles
CREATE POLICY "Users can insert own voice profiles"
  ON voice_profiles FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Create DELETE policy for voice_profiles (hard delete, as soft delete is primary)
-- This allows cleanup of profiles after the soft delete grace period
CREATE POLICY "Users can delete own voice profiles"
  ON voice_profiles FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

COMMENT ON POLICY "Users can insert own voice profiles" ON voice_profiles IS
  'RLS: Users can create voice profiles for themselves';

COMMENT ON POLICY "Users can delete own voice profiles" ON voice_profiles IS
  'RLS: Users can hard delete their own voice profiles (typically after soft delete grace period)';

-- ============================================================================
-- Performance optimization: Use (SELECT auth.uid()) pattern
-- This prevents the auth.uid() function from being called for each row
-- Instead, it's called once and cached for the query
-- ============================================================================

-- Verify RLS is enabled on all critical tables
DO $$
DECLARE
  tables_without_rls TEXT;
BEGIN
  SELECT string_agg(tablename, ', ')
  INTO tables_without_rls
  FROM pg_tables t
  LEFT JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename IN ('meditation_history', 'users', 'voice_profiles')
    AND NOT c.relrowsecurity;

  IF tables_without_rls IS NOT NULL THEN
    RAISE WARNING 'Tables without RLS enabled: %', tables_without_rls;
  END IF;
END $$;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 022: Critical RLS fixes applied successfully';
  RAISE NOTICE '  - meditation_history: RLS enabled with SELECT/INSERT/UPDATE/DELETE policies';
  RAISE NOTICE '  - users: RLS enabled with SELECT/INSERT/UPDATE policies';
  RAISE NOTICE '  - voice_profiles: Added INSERT/DELETE policies';
END $$;
