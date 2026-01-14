# Rollback Procedures

This document describes how to rollback deployments for Innrvo in case of production issues.

---

## Quick Reference

| Component | Rollback Method | Time to Rollback |
|-----------|-----------------|------------------|
| Frontend (Vercel) | Dashboard → Deployments → Redeploy | < 1 minute |
| Edge Functions | Vercel → Redeploy (bundles with frontend) | < 1 minute |
| Database Schema | Manual migration reversal | 5-15 minutes |
| Supabase RLS | SQL rollback in dashboard | 2-5 minutes |

---

## 1. Frontend Rollback (Vercel)

Vercel maintains all previous deployments. Rollback is instant.

### Via Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com) → **innrvo** project
2. Click **Deployments** tab
3. Find the last working deployment (green checkmark)
4. Click the **⋮** menu → **Promote to Production**
5. Confirm the promotion

The previous version will be live within ~30 seconds.

### Via CLI

```bash
# List recent deployments
vercel ls innrvo

# Promote a specific deployment to production
vercel promote <deployment-url> --scope=qualiasolutions
```

### Verify Rollback

```bash
# Check the app loads
curl -I https://innrvo.com

# Check version in browser console (if version tracking enabled)
# window.__APP_VERSION__ should show the older commit hash
```

---

## 2. Edge Functions Rollback

Edge Functions are deployed alongside the frontend via Vercel. Rolling back the frontend deployment also rolls back Edge Functions.

**Exception**: If Edge Functions were deployed separately via `supabase functions deploy`, you need to redeploy the previous version:

```bash
# Navigate to project root
cd ~/Desktop/Projects/voice/inrvo

# Checkout the previous working commit
git checkout <previous-commit-hash>

# Redeploy Edge Functions
supabase functions deploy --project-ref ygweconeysctxpjjnehy

# Return to main branch
git checkout main
```

### Verify Edge Functions

```bash
# Check health endpoint
curl https://ygweconeysctxpjjnehy.supabase.co/functions/v1/health

# Should return {"status": "healthy", ...}
```

---

## 3. Database Schema Rollback

Database migrations are **NOT automatically rolled back** with frontend deployments. Each migration must be manually reversed.

### Check Current Migration State

```bash
# Via Supabase CLI
supabase db migrations list --project-ref ygweconeysctxpjjnehy

# Or in Supabase Dashboard → Database → Migrations
```

### Rolling Back a Migration

Most migrations are additive (CREATE TABLE, ADD COLUMN) and don't need rollback. For breaking changes:

#### Option A: Write Reversal SQL

Create a new migration that undoes the changes:

```bash
# Create reversal migration
supabase migration new revert_<original_migration_name>
```

Edit the file with reversal SQL:

```sql
-- Example: Revert adding a column
ALTER TABLE voice_profiles DROP COLUMN IF EXISTS new_column;

-- Example: Revert creating a table
DROP TABLE IF EXISTS new_table;

-- Example: Revert RLS policy
DROP POLICY IF EXISTS "policy_name" ON table_name;
```

Apply the reversal:

```bash
supabase db push --project-ref ygweconeysctxpjjnehy
```

#### Option B: Use Point-in-Time Recovery (PITR)

For catastrophic changes, Supabase Pro includes PITR:

1. Go to **Supabase Dashboard** → **Settings** → **Database**
2. Click **Database Backups**
3. Select a point in time before the migration
4. Click **Restore**

⚠️ **Warning**: PITR restores the ENTIRE database to that point, losing all data changes since then.

### Common Migration Rollbacks

| Migration Type | Rollback SQL |
|----------------|--------------|
| `CREATE TABLE x` | `DROP TABLE IF EXISTS x;` |
| `ALTER TABLE ADD COLUMN` | `ALTER TABLE x DROP COLUMN IF EXISTS y;` |
| `CREATE INDEX` | `DROP INDEX IF EXISTS idx_name;` |
| `CREATE POLICY` | `DROP POLICY IF EXISTS "name" ON table;` |
| `CREATE FUNCTION` | `DROP FUNCTION IF EXISTS func_name();` |

---

## 4. RLS Policy Rollback

If a broken RLS policy blocks users:

### Quick Fix (Disable)

```sql
-- In Supabase Dashboard → SQL Editor
-- Temporarily disable RLS (DANGER: exposes all data)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- Fix the policy, then re-enable
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Revert to Previous Policy

```sql
-- Drop the broken policy
DROP POLICY IF EXISTS "broken_policy_name" ON table_name;

-- Recreate the previous working policy
CREATE POLICY "working_policy_name" ON table_name
  FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 5. Environment Variable Rollback

If environment variables were changed incorrectly:

### Vercel Environment Variables

1. Go to **Vercel Dashboard** → **innrvo** → **Settings** → **Environment Variables**
2. Edit the variable to the previous value
3. **Important**: Redeploy for changes to take effect
   - Go to **Deployments** → Latest → **⋮** → **Redeploy**

### Supabase Secrets (Edge Functions)

1. Go to **Supabase Dashboard** → **Project Settings** → **Secrets**
2. Edit the secret value
3. Edge Functions will use new value on next invocation (no redeploy needed)

---

## 6. Emergency Procedures

### App Completely Down

1. **Check Vercel Status**: https://www.vercel-status.com/
2. **Check Supabase Status**: https://status.supabase.com/
3. If services are up, rollback to last working deployment (Section 1)
4. Check Sentry for error spikes
5. Check Edge Function logs in Supabase Dashboard

### Database Connection Issues

1. Check Supabase Dashboard for connection pool usage
2. If pool exhausted, pause and resume the project:
   - **Settings** → **General** → **Pause Project**
   - Wait 30 seconds
   - Click **Resume Project**

### Auth Not Working

1. Check Supabase Dashboard → **Authentication** → **Logs**
2. Verify environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Check if RLS policies on `users` table are correct

---

## 7. Rollback Communication

### Internal (Slack/Email)

Template for team notification:

```
🚨 ROLLBACK INITIATED

Issue: [Brief description]
Component: [Frontend/Edge Functions/Database]
Previous Version: [commit hash or deployment URL]
Time: [timestamp]
Status: [In Progress/Complete]

Next Steps: [Investigation plan]
```

### External (Status Page)

If using BetterStack status page:

1. Go to status page dashboard
2. Create incident: "Temporary service degradation"
3. Update when resolved

---

## 8. Post-Rollback Checklist

After any rollback:

- [ ] Verify app loads at https://innrvo.com
- [ ] Test sign in/sign up
- [ ] Test core feature (meditation generation)
- [ ] Check Sentry for new errors
- [ ] Check health endpoint: `curl https://ygweconeysctxpjjnehy.supabase.co/functions/v1/health`
- [ ] Document the incident (what happened, why, prevention)
- [ ] Create bug ticket for the issue that caused rollback

---

## 9. Prevention

To minimize rollbacks:

1. **Preview deployments**: Test on Vercel preview URLs before merging to main
2. **Database migrations**: Test on branch database before production
3. **Feature flags**: Use for risky features
4. **Monitoring**: Set up Sentry alerts for error spikes
5. **Health checks**: Verify health endpoint after each deploy

---

## Quick Commands Reference

```bash
# Check current deployment
vercel ls innrvo --scope=qualiasolutions

# Rollback frontend (get URL from vercel ls, then promote)
vercel promote <deployment-url> --scope=qualiasolutions

# Check Edge Function health
curl https://ygweconeysctxpjjnehy.supabase.co/functions/v1/health

# Check database migrations
supabase db migrations list --project-ref ygweconeysctxpjjnehy

# Redeploy Edge Functions from specific commit
git checkout <commit> && supabase functions deploy --project-ref ygweconeysctxpjjnehy && git checkout main
```
