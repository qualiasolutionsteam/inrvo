# MCP Setup Guide for INrVO Voice Cloning App

This guide explains how to set up Model Context Protocol (MCP) servers to enhance your voice cloning application with real-time capabilities and advanced features.

## Current MCP Configuration

Your `.mcp.json` already includes the Supabase MCP server:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=jcvfnkuppbvkbzltkioa"
    }
  }
}
```

## Recommended MCP Servers for Voice Cloning

### 1. Supabase MCP (Already configured)
**Purpose**: Direct database operations, real-time subscriptions, and edge functions

**Available Tools**:
- `mcp__supabase_list_tables` - List database tables
- `mcp__supabase_list_migrations` - View migration history
- `mcp__supabase_execute_sql` - Run SQL queries
- `mcp__supabase_apply_migration` - Apply database migrations
- `mcp__supabase_list_extensions` - List PostgreSQL extensions
- `mcp__supabase_get_logs` - Fetch service logs
- `mcp__supabase_get_advisors` - Get performance/security advisories
- `mcp__supabase_get_project_url` - Get project URLs
- `mcp__supabase_get_publishable_keys` - Get API keys
- `mcp__supabase_generate_typescript_types` - Generate TS types
- `mcp__supabase_list_edge_functions` - List edge functions
- `mcp__supabase_get_edge_function` - Get edge function code
- `mcp__supabase_deploy_edge_function` - Deploy edge functions
- `mcp__supabase_create_branch` - Create development branch
- `mcp__supabase_list_branches` - List branches
- `mcp__supabase_delete_branch` - Delete branch
- `mcp__supabase_merge_branch` - Merge branch
- `mcp__supabase_reset_branch` - Reset branch
- `mcp__supabase_rebase_branch` - Rebase branch

### 2. Filesystem MCP (For Local Development)
**Purpose**: Read/write local files, manage migrations, configuration files

**Installation**:
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/qualiasolutions/Desktop/Projects/voice/inrvo"]
    }
  }
}
```

### 3. ElevenLabs MCP (For Voice Operations)
**Purpose**: Direct ElevenLabs API access, voice management, and monitoring

**Installation**:
```json
{
  "mcpServers": {
    "elevenlabs": {
      "command": "npx",
      "args": ["-y", "@elevenlabs/mcp-server"],
      "env": {
        "ELEVENLABS_API_KEY": "sk_4d5789f31cb5bc48f403a4d7e11a6b59c586f1a5ab84cafa"
      }
    }
  }
}
```

### 4. Web Reader MCP (For Documentation)
**Purpose**: Fetch documentation, tutorials, and API docs

**Installation**:
```json
{
  "mcpServers": {
    "web-reader": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-web-reader"]
    }
  }
}
```

## Complete MCP Configuration

Update your `.mcp.json` file to include all recommended servers:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=jcvfnkuppbvkbzltkioa"
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/qualiasolutions/Desktop/Projects/voice/inrvo"]
    },
    "elevenlabs": {
      "command": "npx",
      "args": ["-y", "@elevenlabs/mcp-server"],
      "env": {
        "ELEVENLABS_API_KEY": "sk_4d5789f31cb5bc48f403a4d7e11a6b59c586f1a5ab84cafa"
      }
    },
    "web-reader": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-web-reader"]
    }
  }
}
```

## Using MCP with Your Voice Cloning App

### Database Operations
```typescript
// Using MCP to run migrations
await mcp__supabase_apply_migration({
  name: "001_add_voice_cloning",
  query: "-- Your SQL here --"
});

// Check database health
const advisors = await mcp__supabase_get_advisors({
  type: "security"
});
```

### Voice Cloning Enhancements
```typescript
// Monitor ElevenLabs voice status
const voices = await elevenlabs_list_voices();

// Get real-time logs
const logs = await mcp__supabase_get_logs({
  service: "edge-function"
});
```

## Edge Functions Setup

Create these edge functions using MCP:

### 1. Voice Processing Edge Function
```typescript
// supabase/functions/process-voice/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ElevenLabsAPI } from "https://deno.land/x/elevenlabs@v0.0.3/mod.ts";

serve(async (req) => {
  // Process voice cloning in edge function
  // Better performance and security
});
```

Deploy using MCP:
```typescript
await mcp__supabase_deploy_edge_function({
  name: "process-voice",
  files: [{
    name: "index.ts",
    content: "// Your function code"
  }],
  verify_jwt: true
});
```

### 2. Credit Management Edge Function
```typescript
// supabase/functions/manage-credits/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Handle credit operations
  // Prevent fraud, track usage
});
```

## Real-time Features with Supabase Realtime

### Voice Cloning Status Updates
```typescript
// In your React component
import { useEffect } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';

const VoiceCloningStatus = ({ voiceId }: { voiceId: string }) => {
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const channel = supabase
      .channel(`voice-${voiceId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'voice_profiles', filter: `id=eq.${voiceId}` },
        (payload) => {
          setStatus(payload.new.cloning_status);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [voiceId]);

  return <div>Status: {status}</div>;
};
```

## MCP Commands for Development

### 1. Initialize Database
```bash
# Apply all migrations
mcp__supabase_apply_migration({
  name: "001_add_voice_cloning",
  query: "-- SQL from migration file --"
});
```

### 2. Generate TypeScript Types
```typescript
// Auto-generate types based on database schema
const types = await mcp__supabase_generate_typescript_types();
// Save to src/types/database.ts
```

### 3. Monitor Performance
```typescript
// Get security advisories
const securityAdvisors = await mcp__supabase_get_advisors({
  type: "security"
});

// Get performance recommendations
const perfAdvisors = await mcp__supabase_get_advisors({
  type: "performance"
});
```

### 4. Debug with Logs
```typescript
// Get recent function logs
const logs = await mcp__supabase_get_logs({
  service: "edge-function",
  metadata: {
    function_name: "process-voice"
  }
});
```

## Best Practices

### 1. Security
- Keep API keys in environment variables
- Use Row Level Security (RLS) policies
- Deploy sensitive operations to edge functions

### 2. Performance
- Use edge functions for heavy processing
- Implement proper indexing
- Cache frequent queries

### 3. Error Handling
```typescript
// Wrap MCP calls in try-catch
try {
  const result = await mcp__supabase_execute_sql({
    query: "SELECT * FROM voice_profiles"
  });
} catch (error) {
  console.error('MCP operation failed:', error);
  // Fallback to direct API call
}
```

## Testing MCP Integration

### Test Script
```typescript
// test-mcp-integration.ts
import { supabase } from './lib/supabase';

async function testMCPIntegration() {
  // Test 1: List tables
  const tables = await mcp__supabase_list_tables({ schemas: ['public'] });
  console.log('Available tables:', tables);

  // Test 2: Check user credits
  const credits = await mcp__supabase_execute_sql({
    query: "SELECT * FROM user_credits WHERE user_id = $1",
    params: [user.id]
  });
  console.log('User credits:', credits);

  // Test 3: Get project info
  const projectUrl = await mcp__supabase_get_project_url();
  console.log('Project URL:', projectUrl);
}
```

## Next Steps

1. Update your `.mcp.json` with the complete configuration
2. Restart your Claude Code instance
3. Test MCP servers are working
4. Implement edge functions for better performance
5. Add real-time features with Supabase Realtime

## Troubleshooting

### Common Issues
1. **MCP servers not loading**: Check npm packages are installed
2. **Permission errors**: Ensure API keys are correct
3. **CORS issues**: Configure allowed origins in Supabase
4. **Edge function failures**: Check logs using MCP

### Debug Commands
```bash
# Check MCP server status
claude-code --status

# Test Supabase connection
mcp__supabase_get_project_url()

# View logs
mcp__supabase_get_logs({ service: "api" })
```

This setup provides a powerful foundation for your voice cloning app with real-time capabilities, better performance, and enhanced debugging options.