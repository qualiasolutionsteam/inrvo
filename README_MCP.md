# MCP Quick Start Guide for INrVO Voice Cloning

## 🚀 Quick Setup

### 1. Install MCP Servers
```bash
# Install required MCP servers
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-web-reader
```

### 2. Restart Claude Code
```bash
# Exit and restart Claude Code to load MCP servers
exit
claude-code
```

### 3. Deploy Edge Functions
```bash
# Run the deployment script
deno run --allow-net --allow-read --allow-write scripts/deploy-mcp.ts
```

### 4. Set Environment Variables
In your Supabase dashboard, go to Settings > Edge Functions and add:
- `ELEVENLABS_API_KEY=sk_4d5789f31cb5bc48f403a4d7e11a6b59c586f1a5ab84cafa`
- `GEMINI_API_KEY=your_gemini_api_key`

## 🧪 Test MCP Integration
```bash
# Run the test script
deno run --allow-net scripts/test-mcp.ts
```

## 💡 Using MCP with Claude Code

### Database Operations
```typescript
// List all tables
const tables = await mcp__supabase_list_tables({ schemas: ['public'] });

// Execute SQL query
const result = await mcp__supabase_execute_sql({
  query: 'SELECT * FROM voice_profiles WHERE user_id = $1',
  params: [userId]
});

// Get performance advisors
const advisors = await mcp__supabase_get_advisors({ type: 'performance' });
```

### File Operations
```typescript
// Read a file
const content = await filesystem_read_file('src/lib/voiceService.ts');

// List directory
const files = await filesystem_list_directory('supabase/migrations');
```

### Web Operations
```typescript
// Fetch documentation
const docs = await web_reader_webReader({
  url: 'https://elevenlabs.io/docs/api-reference',
  return_format: 'markdown'
});
```

### Edge Function Management
```typescript
// Deploy a new edge function
await mcp__supabase_deploy_edge_function({
  name: 'new-function',
  files: [{
    name: 'index.ts',
    content: '// Your function code'
  }],
  verify_jwt: true
});

// Get edge function logs
const logs = await mcp__supabase_get_logs({
  service: 'edge-function',
  metadata: { function_name: 'process-voice' }
});
```

## 🎯 Common MCP Tasks for Voice Cloning

### 1. Monitor Voice Cloning Usage
```typescript
// Get recent usage
const usage = await mcp__supabase_execute_sql({
  query: `
    SELECT u.email, v.name, vc.credits_consumed, vc.created_at
    FROM voice_cloning_usage vc
    JOIN auth.users u ON vc.user_id = u.id
    JOIN voice_profiles v ON vc.voice_profile_id = v.id
    WHERE vc.operation_type = 'CLONE_CREATE'
    ORDER BY vc.created_at DESC
    LIMIT 10
  `
});
```

### 2. Check System Health
```typescript
// Check all advisors
const securityAdvisors = await mcp__supabase_get_advisors({ type: 'security' });
const performanceAdvisors = await mcp__supabase_get_advisors({ type: 'performance' });

// Get recent logs
const recentLogs = await mcp__supabase_get_logs({
  service: 'api',
  limit: 50
});
```

### 3. Manage Credits
```typescript
// Update user credits
await mcp__supabase_execute_sql({
  query: 'UPDATE user_credits SET total_credits = $1 WHERE user_id = $2',
  params: [newCreditTotal, userId]
});

// Get credit summary
const summary = await mcp__supabase_execute_sql({
  query: `
    SELECT
      SUM(credits_consumed) as total_consumed,
      COUNT(DISTINCT user_id) as unique_users
    FROM voice_cloning_usage
    WHERE created_at >= NOW() - INTERVAL '30 days'
  `
});
```

## 🔧 Available MCP Tools

### Supabase MCP
- Database operations and management
- Edge function deployment
- Log retrieval
- Performance monitoring
- Security advisories

### Filesystem MCP
- Read/write local files
- Manage project files
- Access migration files
- Update configuration

### Web Reader MCP
- Fetch documentation
- Read API references
- Get tutorials
- Access web resources

## 📊 Monitoring with MCP

### Real-time Metrics
```typescript
// Track active clones
const activeClones = await mcp__supabase_execute_sql({
  query: `
    SELECT COUNT(*) as count
    FROM voice_profiles
    WHERE provider = 'ElevenLabs'
    AND created_at >= NOW() - INTERVAL '24 hours'
  `
});

// Credit consumption by tier
const consumptionByTier = await mcp__supabase_execute_sql({
  query: `
    SELECT
      u.raw_user_meta_data->>'tier' as tier,
      SUM(vc.credits_consumed) as total_credits,
      COUNT(*) as operations
    FROM voice_cloning_usage vc
    JOIN auth.users u ON vc.user_id = u.id
    GROUP BY tier
    ORDER BY total_credits DESC
  `
});
```

## 🚨 Troubleshooting

### MCP Server Not Responding
1. Check `.mcp.json` configuration
2. Restart Claude Code
3. Verify npm packages installed

### Database Errors
1. Check migrations applied: `mcp__supabase_list_migrations()`
2. Verify table structure: `mcp__supabase_list_tables()`
3. Check RLS policies

### Edge Function Failures
1. Get logs: `mcp__supabase_get_logs({ service: 'edge-function' })`
2. Verify environment variables
3. Check function deployment status

## 💡 Pro Tips

1. **Use MCP for debugging**: Quickly check database state without leaving Claude
2. **Automate deployments**: Create scripts that use MCP for CI/CD
3. **Monitor in real-time**: Use MCP to check logs and metrics
4. **Generate documentation**: Use MCP to fetch and format API docs
5. **Batch operations**: Use MCP to run bulk database updates

## 📚 Learn More

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Supabase MCP Guide](https://supabase.com/docs/guides/ai/mcp)
- [Edge Functions](https://supabase.com/docs/guides/functions)