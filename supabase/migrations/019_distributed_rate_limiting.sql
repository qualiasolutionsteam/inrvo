-- Migration: Distributed Rate Limiting
-- Created: 2025-12-27
-- Description: Implements database-backed rate limiting that persists across cold starts
-- and is distributed across Edge Function instances.

-- ============================================================================
-- RATE LIMITS TABLE
-- ============================================================================

-- Store rate limit counters in the database
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,           -- user_id or 'anon:ip_address'
  endpoint TEXT NOT NULL,             -- 'gemini-script', 'fish-audio-clone', etc.
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for upsert operations
  UNIQUE(identifier, endpoint)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON rate_limits(identifier, endpoint, window_start);

-- Index for cleanup job
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup
  ON rate_limits(window_start);

-- ============================================================================
-- CHECK AND INCREMENT RATE LIMIT FUNCTION
-- ============================================================================

-- Atomic function to check and increment rate limit
-- Uses upsert to avoid race conditions
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
) AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- Calculate the start of the current window
  v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;

  -- Upsert rate limit record atomically
  INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (p_identifier, p_endpoint, 1, NOW())
  ON CONFLICT (identifier, endpoint)
  DO UPDATE SET
    -- Reset count if window has expired, otherwise increment
    request_count = CASE
      WHEN rate_limits.window_start < v_window_start THEN 1
      ELSE rate_limits.request_count + 1
    END,
    -- Reset window start if expired
    window_start = CASE
      WHEN rate_limits.window_start < v_window_start THEN NOW()
      ELSE rate_limits.window_start
    END
  RETURNING
    rate_limits.request_count,
    rate_limits.window_start + (p_window_seconds || ' seconds')::INTERVAL
  INTO v_current_count, v_reset_at;

  -- Return results
  allowed := v_current_count <= p_max_requests;
  remaining := GREATEST(0, p_max_requests - v_current_count);
  reset_at := v_reset_at;
  current_count := v_current_count;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================

-- Cleanup old rate limit entries to prevent table bloat
-- Should be called periodically (e.g., via pg_cron or external scheduler)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits() RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete entries older than 1 hour (no window should be longer than this)
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECURITY POLICIES (RLS)
-- ============================================================================

-- Enable RLS on rate_limits table
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow Edge Functions (service role) to access rate_limits
-- Regular users cannot see or modify rate limit data
CREATE POLICY "Service role only" ON rate_limits
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Grant access to service role
GRANT ALL ON rate_limits TO service_role;
GRANT USAGE ON SEQUENCE rate_limits_id_seq TO service_role;

-- ============================================================================
-- OPTIONAL: Schedule cleanup (requires pg_cron extension)
-- ============================================================================

-- Uncomment if pg_cron is available:
-- SELECT cron.schedule('cleanup-rate-limits', '*/30 * * * *', 'SELECT cleanup_old_rate_limits()');

-- ============================================================================
-- MONITORING VIEW
-- ============================================================================

-- View for monitoring rate limit usage (admin only)
CREATE OR REPLACE VIEW rate_limit_stats AS
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

COMMENT ON TABLE rate_limits IS 'Distributed rate limiting for Edge Functions';
COMMENT ON FUNCTION check_rate_limit IS 'Atomically check and increment rate limit counter';
COMMENT ON FUNCTION cleanup_old_rate_limits IS 'Remove expired rate limit entries';
