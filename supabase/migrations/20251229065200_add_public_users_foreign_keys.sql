-- Migration: Add Foreign Keys to public.users for PostgREST Embedded Joins
-- Date: 2025-12-29
-- Problem: Admin panel uses `users:user_id(email)` but FK points to auth.users, not public.users
-- Solution: Add FK from meditation_history and voice_profiles to public.users

-- ============================================================================
-- Add FK from meditation_history.user_id to public.users.id
-- ============================================================================

ALTER TABLE meditation_history
ADD CONSTRAINT meditation_history_public_user_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ============================================================================
-- Add FK from voice_profiles.user_id to public.users.id
-- ============================================================================

ALTER TABLE voice_profiles
ADD CONSTRAINT voice_profiles_public_user_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ============================================================================
-- Notify PostgREST to reload schema cache
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration: Added FK constraints to public.users for PostgREST embedded joins';
END $$;
