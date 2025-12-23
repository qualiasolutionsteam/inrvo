-- Migration: Data Retention Policy
-- Implements automated cleanup for old data to comply with data minimization principles

-- ============================================================================
-- Retention Configuration
-- ============================================================================

-- Store retention policies (can be adjusted without code changes)
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  retention_days INTEGER,  -- NULL means no time-based retention
  cleanup_soft_deleted BOOLEAN DEFAULT TRUE,
  soft_delete_grace_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (admin only)
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

-- Insert default retention policies
INSERT INTO data_retention_policies (table_name, retention_days, cleanup_soft_deleted, soft_delete_grace_days)
VALUES
  ('agent_conversations', 365, FALSE, NULL),  -- Keep conversations for 1 year
  ('meditation_history', 730, FALSE, NULL),    -- Keep meditation history for 2 years
  ('voice_profiles', NULL, TRUE, 30),          -- Permanently delete soft-deleted after 30 days
  ('voice_clones', NULL, TRUE, 30)             -- Permanently delete soft-deleted after 30 days
ON CONFLICT (table_name) DO NOTHING;

-- ============================================================================
-- Cleanup Functions
-- ============================================================================

-- Function to clean up old soft-deleted records
CREATE OR REPLACE FUNCTION cleanup_soft_deleted_records()
RETURNS TABLE(table_name TEXT, deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  policy RECORD;
  count_deleted BIGINT;
BEGIN
  FOR policy IN
    SELECT * FROM public.data_retention_policies
    WHERE cleanup_soft_deleted = TRUE
    AND is_active = TRUE
    AND soft_delete_grace_days IS NOT NULL
  LOOP
    EXECUTE format(
      'DELETE FROM public.%I WHERE is_deleted = TRUE AND deleted_at < NOW() - INTERVAL ''%s days''',
      policy.table_name,
      policy.soft_delete_grace_days
    );
    GET DIAGNOSTICS count_deleted = ROW_COUNT;

    table_name := policy.table_name;
    deleted_count := count_deleted;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Function to clean up old conversations (beyond retention period)
CREATE OR REPLACE FUNCTION cleanup_old_conversations(p_retention_days INTEGER DEFAULT 365)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  DELETE FROM public.agent_conversations
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to anonymize old meditation history (keep stats, remove personal data)
CREATE OR REPLACE FUNCTION anonymize_old_meditation_history(p_retention_days INTEGER DEFAULT 730)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_count BIGINT;
BEGIN
  UPDATE public.meditation_history
  SET
    prompt = '[Anonymized]',
    voice_name = NULL
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
  AND prompt != '[Anonymized]';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- ============================================================================
-- Scheduled Job (requires pg_cron extension - enable in Supabase dashboard)
-- ============================================================================

-- Note: To enable scheduled cleanup, run this after enabling pg_cron:
--
-- SELECT cron.schedule(
--   'cleanup-soft-deleted',           -- job name
--   '0 3 * * *',                       -- every day at 3 AM UTC
--   $$SELECT * FROM cleanup_soft_deleted_records()$$
-- );
--
-- SELECT cron.schedule(
--   'cleanup-old-conversations',       -- job name
--   '0 4 * * 0',                        -- every Sunday at 4 AM UTC
--   $$SELECT cleanup_old_conversations(365)$$
-- );

-- ============================================================================
-- Manual Cleanup Trigger (for admin use via RPC)
-- ============================================================================

CREATE OR REPLACE FUNCTION run_data_retention_cleanup()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSON;
  soft_deleted_results JSON;
  conversations_deleted BIGINT;
  history_anonymized BIGINT;
BEGIN
  -- Get retention policy for conversations
  SELECT p.retention_days INTO conversations_deleted
  FROM public.data_retention_policies p
  WHERE p.table_name = 'agent_conversations';

  -- Clean up soft deleted records
  SELECT json_agg(row_to_json(t)) INTO soft_deleted_results
  FROM public.cleanup_soft_deleted_records() t;

  -- Clean up old conversations
  SELECT public.cleanup_old_conversations(COALESCE(conversations_deleted, 365)) INTO conversations_deleted;

  -- Anonymize old meditation history
  SELECT public.anonymize_old_meditation_history(730) INTO history_anonymized;

  result := json_build_object(
    'soft_deleted_cleanup', COALESCE(soft_deleted_results, '[]'::json),
    'conversations_deleted', conversations_deleted,
    'history_anonymized', history_anonymized,
    'run_at', NOW()
  );

  RETURN result;
END;
$$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE data_retention_policies IS 'Configurable data retention policies per table';
COMMENT ON FUNCTION cleanup_soft_deleted_records() IS 'Permanently deletes records that were soft-deleted beyond grace period';
COMMENT ON FUNCTION cleanup_old_conversations(INTEGER) IS 'Deletes conversations older than specified days';
COMMENT ON FUNCTION anonymize_old_meditation_history(INTEGER) IS 'Anonymizes meditation history older than specified days';
COMMENT ON FUNCTION run_data_retention_cleanup() IS 'Runs all retention cleanup tasks and returns summary';
