# Monitoring Setup Guide

This document describes how to set up production monitoring for INrVO.

## 1. Uptime Monitoring

### Recommended: BetterStack (formerly Better Uptime)

1. **Create account** at https://betterstack.com/uptime
2. **Add monitor** for the health endpoint:
   - URL: `https://ygweconeysctxpjjnehy.supabase.co/functions/v1/health`
   - Method: GET
   - Check interval: 1 minute
   - Alert after: 2 consecutive failures

3. **Add monitor** for the main app:
   - URL: `https://inrvo.com`
   - Method: GET
   - Expected status: 200
   - Check interval: 5 minutes

4. **Configure alerts**:
   - Email notifications
   - Slack integration (optional)
   - SMS for critical (optional)

### Alternative: Pingdom

1. **Create check** at https://www.pingdom.com
2. **Add HTTP check**:
   - URL: `https://ygweconeysctxpjjnehy.supabase.co/functions/v1/health`
   - Check interval: 1 minute
   - Alerting: Immediate

### Health Endpoint Response

The health endpoint returns:
```json
{
  "status": "healthy",      // or "degraded" or "unhealthy"
  "timestamp": "2025-12-31T17:00:00.000Z",
  "checks": {
    "database": true,
    "gemini": true,         // API key configured
    "fishAudio": true,      // API key configured
    "elevenLabs": true      // API key configured
  },
  "latency": {
    "database_ms": 12
  }
}
```

Monitor for:
- `status` != "healthy" → Alert
- Response time > 5s → Warning
- No response → Critical

---

## 2. Sentry Alert Configuration

### Access Sentry Dashboard

1. Log in at https://sentry.io
2. Go to **INrVO project** → **Alerts**

### Recommended Alert Rules

#### Alert 1: Error Spike
- **Name**: High Error Rate
- **Conditions**:
  - Event frequency: > 10 errors in 10 minutes
- **Actions**:
  - Send email to team
  - Send Slack notification (if configured)

#### Alert 2: New Issue Detection
- **Name**: New Production Errors
- **Conditions**:
  - First seen event (new error types)
- **Actions**:
  - Send email immediately

#### Alert 3: Poor Web Vitals
- **Name**: Performance Degradation
- **Conditions**:
  - LCP > 4s for > 5% of users
  - CLS > 0.25 for > 5% of users
- **Actions**:
  - Send daily digest

#### Alert 4: Critical Errors
- **Name**: Critical Application Errors
- **Conditions**:
  - Error message contains: "circuit breaker", "database", "auth"
- **Actions**:
  - Send email immediately
  - Send SMS (optional)

### Setting Up Alerts

1. Go to **Alerts** → **Create Alert Rule**
2. Select **Issue Alerts** or **Metric Alerts**
3. Configure conditions:
   ```
   WHEN: Number of events in 1 hour
   IS ABOVE: 50
   ```
4. Add actions:
   ```
   THEN: Send email to team@example.com
   ```
5. Set frequency: "At most once every 1 hour"

### Sentry Environment Setup

Ensure these are set in your Sentry configuration:

```typescript
// In index.tsx
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.PROD ? 'production' : 'development',
  release: `inrvo@${__APP_VERSION__}`, // Add version tracking
});
```

---

## 3. Vercel Analytics

Already integrated. View at:
- Vercel Dashboard → Project → Analytics

Key metrics to monitor:
- **Real Experience Score** - Aim for 90+
- **First Contentful Paint** - < 1.8s
- **Largest Contentful Paint** - < 2.5s
- **Cumulative Layout Shift** - < 0.1

---

## 4. Database Monitoring (Supabase)

Access via Supabase Dashboard:
- **Database** → **Reports** for query performance
- **Database** → **Logs** for query logs
- **Edge Functions** → **Logs** for function execution

### Key Metrics

1. **Active connections** - Should stay < 80% of limit
2. **Query latency** - P95 should be < 100ms
3. **Storage usage** - Monitor growth rate

---

## 5. Recommended Monitoring Stack

| Layer | Tool | What to Monitor |
|-------|------|-----------------|
| Uptime | BetterStack | Health endpoint, main site |
| Errors | Sentry | Exceptions, crashes |
| Performance | Vercel Analytics | Web Vitals, page speed |
| Backend | Supabase Dashboard | DB, Edge Functions |
| User Sessions | Sentry Replay | Session recordings on errors |

---

## Quick Setup Checklist

- [ ] Set up BetterStack/Pingdom for health endpoint
- [ ] Configure Sentry alert for error spikes (>10 in 10min)
- [ ] Configure Sentry alert for new issues
- [ ] Configure Sentry alert for poor Web Vitals
- [ ] Set up email/Slack notifications
- [ ] Test alerts by triggering intentional error
- [ ] Create status page (optional - BetterStack provides this)

---

## 6. Supabase pg_cron Setup (Data Retention)

Enable automated data retention cleanup by configuring pg_cron in Supabase:

1. Go to **Supabase Dashboard** → **Database** → **Extensions**
2. Enable the `pg_cron` extension
3. Run the following SQL in the SQL Editor:

```sql
-- Clean up soft-deleted records (daily at 3 AM UTC)
SELECT cron.schedule(
  'cleanup-soft-deleted',
  '0 3 * * *',
  $$SELECT cleanup_soft_deleted_records()$$
);

-- Clean up old conversations (weekly on Sunday at 4 AM UTC)
SELECT cron.schedule(
  'cleanup-old-conversations',
  '0 4 * * 0',
  $$SELECT cleanup_old_conversations(365)$$
);

-- Clean up old audit logs (weekly on Sunday at 3 AM UTC)
SELECT cron.schedule(
  'cleanup-old-audit-logs',
  '0 3 * * 0',
  $$DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '2 years'$$
);

-- Clean up expired TTS cache (daily at 2 AM UTC)
SELECT cron.schedule(
  'cleanup-tts-cache',
  '0 2 * * *',
  $$DELETE FROM tts_response_cache WHERE expires_at < NOW()$$
);
```

4. Verify jobs are scheduled:
```sql
SELECT * FROM cron.job;
```

---

## Production Deployment Checklist

### Pre-Deploy

- [ ] All environment variables set in Vercel
- [ ] Supabase project ID is `ygweconeysctxpjjnehy`
- [ ] Database migrations reviewed and applied
- [ ] TypeScript compiles without errors
- [ ] Tests pass

### Post-Deploy

- [ ] Verify app loads at https://inrvo.com
- [ ] Test sign up / sign in flow
- [ ] Test meditation generation
- [ ] Test voice playback
- [ ] Check Sentry dashboard for errors
- [ ] Check Vercel Analytics for Web Vitals
- [ ] Verify health endpoint returns healthy

### External Services to Configure

| Service | Purpose | Setup Required |
|---------|---------|----------------|
| Sentry | Error tracking | Configure alert rules |
| BetterStack/Pingdom | Uptime monitoring | Add health endpoint monitor |
| Supabase pg_cron | Data retention | Enable extension, schedule jobs |
