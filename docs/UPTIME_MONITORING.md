# Uptime Monitoring Setup

This document describes how to set up uptime monitoring for INrVO using the health check endpoint.

## Health Endpoint

**URL:** `https://YOUR_PROJECT.supabase.co/functions/v1/health`

**Method:** GET

**Authentication:** None required (public endpoint)

### Response Format

```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2025-12-23T12:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": "up" | "down",
    "elevenlabs": "configured" | "not_configured",
    "gemini": "configured" | "not_configured"
  },
  "latency": {
    "database_ms": 45
  }
}
```

### Status Codes

| Status | HTTP Code | Meaning |
|--------|-----------|---------|
| healthy | 200 | All services operational |
| degraded | 200 | Database up, but some API keys missing |
| unhealthy | 503 | Database down or critical failure |

## Recommended Monitoring Tools

### UptimeRobot (Free tier available)

1. Create account at [uptimerobot.com](https://uptimerobot.com)
2. Add new monitor:
   - Monitor Type: HTTP(s)
   - URL: `https://YOUR_PROJECT.supabase.co/functions/v1/health`
   - Monitoring Interval: 5 minutes
   - Monitor Timeout: 30 seconds

3. Configure alerts:
   - Email notifications
   - Slack webhook (optional)
   - Status page (optional)

### Better Uptime (Recommended)

1. Create account at [betteruptime.com](https://betteruptime.com)
2. Add new monitor:
   - URL: `https://YOUR_PROJECT.supabase.co/functions/v1/health`
   - Check interval: 1-3 minutes
   - Confirm threshold: 1-2 checks

3. Advanced options:
   - Expected status code: 200
   - Check for JSON response: `{"status": "healthy"}`
   - Region: US East (or closest to users)

### Checkly (Advanced)

For more complex monitoring with API checks:

```js
// checkly.config.js
const { defineConfig } = require('@checkly/cli');

module.exports = defineConfig({
  checks: [
    {
      name: 'INrVO Health Check',
      type: 'API',
      request: {
        method: 'GET',
        url: 'https://YOUR_PROJECT.supabase.co/functions/v1/health',
      },
      assertions: [
        {
          source: 'STATUS_CODE',
          comparison: 'EQUALS',
          target: 200,
        },
        {
          source: 'JSON_BODY',
          property: 'status',
          comparison: 'EQUALS',
          target: 'healthy',
        },
      ],
    },
  ],
});
```

## Alert Configuration

### Recommended Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Response time | > 2s | > 5s |
| Consecutive failures | 1 | 2 |
| Database latency | > 200ms | > 500ms |

### Alert Channels

1. **Primary:** Email to on-call team
2. **Secondary:** Slack #alerts channel
3. **Critical:** PagerDuty/SMS for database failures

## Vercel Status

For frontend monitoring, use Vercel's built-in analytics:

1. Go to Vercel Dashboard > Project > Analytics
2. Enable Web Vitals monitoring
3. Set up alerts for LCP > 2.5s

## Supabase Status

Monitor Supabase service status:

- Status page: [status.supabase.com](https://status.supabase.com)
- Subscribe to incidents via email or RSS

## Dashboard Example

Create a simple status dashboard at `/status` (optional):

```tsx
// pages/status.tsx
import { useEffect, useState } from 'react';

export default function StatusPage() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(setHealth);
  }, []);

  if (!health) return <div>Loading...</div>;

  return (
    <div>
      <h1>System Status</h1>
      <p>Status: {health.status}</p>
      <ul>
        <li>Database: {health.services.database}</li>
        <li>Voice AI: {health.services.elevenlabs}</li>
        <li>Script AI: {health.services.gemini}</li>
      </ul>
    </div>
  );
}
```

## Production URLs

- Health Check: `https://YOUR_PROJECT.supabase.co/functions/v1/health`
- Frontend: `https://inrvo.com` or `https://inrvo.vercel.app`
- Supabase Dashboard: `https://supabase.com/dashboard/project/YOUR_PROJECT`

## Sentry Error Alerts

Configure Sentry alerts for proactive error monitoring:

### Setup Steps

1. Go to [sentry.io](https://sentry.io) → Your Project → Alerts → Create Alert

2. **Error Rate Alert:**
   - When: Number of errors > 10 in 1 hour
   - Action: Send email + Slack notification
   - Priority: High

3. **New Error Alert:**
   - When: A new issue is seen
   - Filter: `level:error`
   - Action: Send email notification
   - Priority: Medium

4. **Performance Alert:**
   - When: LCP p95 > 2500ms
   - Action: Send Slack notification
   - Priority: Medium

### Recommended Alert Rules

```yaml
# Critical - Immediate Response
- name: "High Error Volume"
  when: count(errors) > 50 in 1h
  action: PagerDuty + Slack

# Warning - Investigate Soon
- name: "Elevated Errors"
  when: count(errors) > 10 in 1h
  action: Slack #alerts

# Info - Track Trends
- name: "New Issue Type"
  when: first_seen
  action: Email digest
```

### Integration with Slack

1. Install Sentry Slack integration
2. Create `#sentry-alerts` channel
3. Route critical alerts to on-call channel
4. Route warnings to general alerts channel

### User Context (Optional Enhancement)

Add user context for better debugging:

```typescript
// After user authentication
import * as Sentry from '@sentry/react';

Sentry.setUser({
  id: user.id,
  email: user.email,
});
```

## Maintenance Windows

When performing maintenance:

1. Update status page (if configured)
2. Notify users via email/in-app banner
3. Disable non-critical alerts temporarily
4. Re-enable alerts after verification
