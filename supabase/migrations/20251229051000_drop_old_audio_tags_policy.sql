-- Migration: Drop old audio_tag_presets policy that causes recursion
-- Date: 2025-12-29
-- Issue: Migration 003 created "Admins can manage audio tag presets" with recursive pattern
--        Migration 20251229050000 added new policies but forgot to drop this old one

-- Drop the old FOR ALL policy from migration 003 that uses the recursive pattern
DROP POLICY IF EXISTS "Admins can manage audio tag presets" ON audio_tag_presets;

DO $$
BEGIN
  RAISE NOTICE 'Dropped old recursive admin policy from audio_tag_presets';
END $$;
