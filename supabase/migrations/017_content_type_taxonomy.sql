-- ============================================================================
-- Migration: Content Type Taxonomy
-- Description: Adds content category columns to meditation_history for the
--              intelligent content type system (meditation, affirmation,
--              self_hypnosis, guided_journey, story)
-- ============================================================================

-- Add content category columns to meditation_history
ALTER TABLE meditation_history
ADD COLUMN IF NOT EXISTS content_category VARCHAR(50) DEFAULT 'meditation',
ADD COLUMN IF NOT EXISTS content_sub_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS hypnosis_depth VARCHAR(20),
ADD COLUMN IF NOT EXISTS target_age_group VARCHAR(20);

-- Add constraint to validate content_category values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_content_category'
  ) THEN
    ALTER TABLE meditation_history
    ADD CONSTRAINT check_content_category
    CHECK (content_category IN ('meditation', 'affirmation', 'self_hypnosis', 'guided_journey', 'story'));
  END IF;
END $$;

-- Add constraint to validate hypnosis_depth values (only for self_hypnosis category)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_hypnosis_depth'
  ) THEN
    ALTER TABLE meditation_history
    ADD CONSTRAINT check_hypnosis_depth
    CHECK (
      hypnosis_depth IS NULL OR
      hypnosis_depth IN ('light', 'standard', 'therapeutic')
    );
  END IF;
END $$;

-- Add constraint to validate target_age_group values (only for story category)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_target_age_group'
  ) THEN
    ALTER TABLE meditation_history
    ADD CONSTRAINT check_target_age_group
    CHECK (
      target_age_group IS NULL OR
      target_age_group IN ('toddler', 'young_child')
    );
  END IF;
END $$;

-- Create index for filtering by content category
-- This supports queries like "show me all my affirmations" or "my children's stories"
CREATE INDEX IF NOT EXISTS idx_meditation_history_category
ON meditation_history(user_id, content_category, created_at DESC);

-- Create index for filtering by sub-type within a category
CREATE INDEX IF NOT EXISTS idx_meditation_history_subtype
ON meditation_history(user_id, content_category, content_sub_type, created_at DESC);

-- Add comment explaining the new columns
COMMENT ON COLUMN meditation_history.content_category IS 'Primary content category: meditation, affirmation, self_hypnosis, guided_journey, or story';
COMMENT ON COLUMN meditation_history.content_sub_type IS 'Sub-type within the category (e.g., power, guided, sleep, mirror_work for affirmations)';
COMMENT ON COLUMN meditation_history.hypnosis_depth IS 'Depth level for self_hypnosis: light, standard, or therapeutic';
COMMENT ON COLUMN meditation_history.target_age_group IS 'Target age group for stories: toddler (2-4) or young_child (5-8)';

-- ============================================================================
-- Update RLS policies to include new columns (they inherit existing policies)
-- No changes needed as the existing user_id policies already protect these columns
-- ============================================================================

-- ============================================================================
-- Backfill existing records
-- Mark all existing records as 'meditation' category (the original content type)
-- ============================================================================

UPDATE meditation_history
SET content_category = 'meditation'
WHERE content_category IS NULL;

-- Try to infer content_sub_type from meditation_type for existing records
UPDATE meditation_history
SET content_sub_type = meditation_type
WHERE content_sub_type IS NULL AND meditation_type IS NOT NULL;
