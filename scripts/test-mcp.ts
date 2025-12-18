#!/usr/bin/env deno run --allow-net

/**
 * Test script for MCP integration with INrVO Voice Cloning
 * Verifies all MCP servers are working correctly
 */

console.log('🧪 Testing MCP Integration for INrVO Voice Cloning\n');

async function testSupabaseMCP() {
  console.log('1️⃣ Testing Supabase MCP Server...');

  try {
    // Test project URL
    const projectUrl = await mcp__supabase_get_project_url();
    console.log('   ✅ Project URL retrieved:', projectUrl.api_url);

    // Test list tables
    const tables = await mcp__supabase_list_tables({ schemas: ['public'] });
    console.log('   ✅ Tables listed:', tables.length, 'tables found');

    // Test execute SQL
    const result = await mcp__supabase_execute_sql({
      query: 'SELECT COUNT(*) as count FROM voice_profiles'
    });
    console.log('   ✅ SQL executed successfully');

    // Test advisors
    const advisors = await mcp__supabase_get_advisors({ type: 'security' });
    console.log('   ✅ Security advisors retrieved:', advisors.length, 'recommendations');

  } catch (error) {
    console.error('   ❌ Supabase MCP test failed:', error);
  }
}

async function testElevenLabsMCP() {
  console.log('\n2️⃣ Testing ElevenLabs MCP Server...');

  try {
    // List voices
    const voices = await elevenlabs_list_voices();
    console.log('   ✅ Voices listed:', voices.length, 'voices available');

    // Get user info
    const userInfo = await elevenlabs_get_user_info();
    console.log('   ✅ User info retrieved, subscription:', userInfo.subscription?.tier);

    // Get usage stats
    const usage = await elevenlabs_get_usage();
    console.log('   ✅ Usage stats retrieved');

  } catch (error) {
    console.error('   ❌ ElevenLabs MCP test failed:', error);
    console.log('   ℹ️  Make sure ElevenLabs MCP server is configured in .mcp.json');
  }
}

async function testFilesystemMCP() {
  console.log('\n3️⃣ Testing Filesystem MCP Server...');

  try {
    // Read a file
    const content = await filesystem_read_file('package.json');
    const packageJson = JSON.parse(content);
    console.log('   ✅ package.json read successfully, version:', packageJson.version);

    // List directory
    const srcFiles = await filesystem_list_directory('src/lib');
    console.log('   ✅ src/lib directory listed:', srcFiles.length, 'files');

  } catch (error) {
    console.error('   ❌ Filesystem MCP test failed:', error);
    console.log('   ℹ️  Make sure Filesystem MCP server is configured in .mcp.json');
  }
}

async function testWebReaderMCP() {
  console.log('\n4️⃣ Testing Web Reader MCP Server...');

  try {
    // Read a web page
    const content = await web_reader_webReader({
      url: 'https://elevenlabs.io/docs',
      return_format: 'markdown'
    });
    console.log('   ✅ ElevenLabs docs fetched, length:', content.length, 'characters');

  } catch (error) {
    console.error('   ❌ Web Reader MCP test failed:', error);
    console.log('   ℹ️  Make sure Web Reader MCP server is configured in .mcp.json');
  }
}

async function testEdgeFunctions() {
  console.log('\n5️⃣ Testing Edge Functions...');

  try {
    // List edge functions
    const functions = await mcp__supabase_list_edge_functions();
    console.log('   ✅ Edge functions listed:', functions.length);

    // Check for our functions
    const processVoice = functions.find(f => f.function_name === 'process-voice');
    const generateSpeech = functions.find(f => f.function_name === 'generate-speech');

    if (processVoice) {
      console.log('   ✅ process-voice function is deployed');
    } else {
      console.log('   ⚠️  process-voice function not found');
    }

    if (generateSpeech) {
      console.log('   ✅ generate-speech function is deployed');
    } else {
      console.log('   ⚠️  generate-speech function not found');
    }

  } catch (error) {
    console.error('   ❌ Edge functions test failed:', error);
  }
}

async function testDatabaseSchema() {
  console.log('\n6️⃣ Testing Database Schema...');

  try {
    // Check required tables
    const tables = await mcp__supabase_list_tables({ schemas: ['public'] });
    const requiredTables = [
      'user_credits',
      'voice_cloning_usage',
      'voice_usage_limits',
      'voice_profiles',
      'voice_clones'
    ];

    console.log('   Required tables:');
    requiredTables.forEach(table => {
      const exists = tables.some(t => t.table_name === table);
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
    });

    // Check indexes
    const indexes = await mcp__supabase_execute_sql({
      query: `
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexname LIKE '%voice%'
      `
    });
    console.log('   ✅ Voice-related indexes:', indexes.length);

  } catch (error) {
    console.error('   ❌ Database schema test failed:', error);
  }
}

async function testCreditsSystem() {
  console.log('\n7️⃣ Testing Credits System...');

  try {
    // Test credit function exists
    const result = await mcp__supabase_execute_sql({
      query: `
        SELECT proname
        FROM pg_proc
        WHERE proname = 'deduct_credits'
      `
    });

    if (result.length > 0) {
      console.log('   ✅ deduct_credits function exists');
    } else {
      console.log('   ❌ deduct_credits function missing');
    }

    // Test user credits table
    const creditsTable = await mcp__supabase_list_tables({ schemas: ['public'] });
    const hasCreditsTable = creditsTable.some(t => t.table_name === 'user_credits');

    if (hasCreditsTable) {
      console.log('   ✅ user_credits table exists');
    } else {
      console.log('   ❌ user_credits table missing');
    }

  } catch (error) {
    console.error('   ❌ Credits system test failed:', error);
  }
}

// Test configuration
async function testConfiguration() {
  console.log('\n8️⃣ Testing Configuration...');

  try {
    // Read .mcp.json
    const mcpConfig = await filesystem_read_file('.mcp.json');
    const config = JSON.parse(mcpConfig);

    console.log('   ✅ MCP configuration loaded');
    console.log('   Configured servers:', Object.keys(config.mcpServers || {}));

    // Check if required servers are configured
    const requiredServers = ['supabase'];
    const configuredServers = Object.keys(config.mcpServers || {});

    requiredServers.forEach(server => {
      const configured = configuredServers.includes(server);
      console.log(`   ${configured ? '✅' : '❌'} ${server} MCP server`);
    });

    // Check optional servers
    const optionalServers = ['filesystem', 'elevenlabs', 'web-reader'];
    console.log('\n   Optional servers:');
    optionalServers.forEach(server => {
      const configured = configuredServers.includes(server);
      console.log(`   ${configured ? '✅' : '⚪'} ${server} MCP server`);
    });

  } catch (error) {
    console.error('   ❌ Configuration test failed:', error);
  }
}

// Run all tests
async function main() {
  await testConfiguration();
  await testSupabaseMCP();
  await testElevenLabsMCP();
  await testFilesystemMCP();
  await testWebReaderMCP();
  await testEdgeFunctions();
  await testDatabaseSchema();
  await testCreditsSystem();

  console.log('\n' + '=' .repeat(50));
  console.log('✅ MCP Integration Testing Complete!');
  console.log('\nIf any tests failed, check:');
  console.log('1. MCP servers are properly configured in .mcp.json');
  console.log('2. API keys are set in environment variables');
  console.log('3. Database migrations have been applied');
}

// Execute tests
main();