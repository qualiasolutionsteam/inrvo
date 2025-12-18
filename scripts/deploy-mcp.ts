#!/usr/bin/env deno run --allow-net --allow-read --allow-write

/**
 * Deployment script using MCP servers for INrVO Voice Cloning
 * This script deploys edge functions and sets up the database
 */

import { readFile } from "https://deno.land/std@0.168.0/fs/read_file.ts";

// Edge function configurations
const edgeFunctions = [
  {
    name: 'process-voice',
    path: './supabase/functions/process-voice/index.ts',
    description: 'Processes voice cloning requests with ElevenLabs',
  },
  {
    name: 'generate-speech',
    path: './supabase/functions/generate-speech/index.ts',
    description: 'Generates speech using ElevenLabs or Gemini',
  },
];

// Database migrations
const migrations = [
  {
    name: '001_add_voice_cloning',
    path: './supabase/migrations/001_add_voice_cloning.sql',
  },
  {
    name: '002_credit_functions',
    path: './supabase/migrations/002_credit_functions.sql',
  },
];

async function deployEdgeFunctions() {
  console.log('🚀 Deploying Edge Functions...\n');

  for (const func of edgeFunctions) {
    try {
      console.log(`   Deploying ${func.name}...`);

      const fileContent = await readFile(func.path);
      const content = new TextDecoder().decode(fileContent);

      // Use MCP to deploy
      const deployResult = await mcp__supabase_deploy_edge_function({
        name: func.name,
        files: [{
          name: 'index.ts',
          content: content
        }],
        verify_jwt: true
      });

      if (deployResult.success) {
        console.log(`   ✅ ${func.name} deployed successfully`);
      } else {
        console.error(`   ❌ ${func.name} deployment failed:`, deployResult.error);
      }
    } catch (error) {
      console.error(`   ❌ Error deploying ${func.name}:`, error);
    }
    console.log('');
  }
}

async function runMigrations() {
  console.log('📊 Running Database Migrations...\n');

  // Check existing migrations
  const existingMigrations = await mcp__supabase_list_migrations();
  const existingNames = existingMigrations.map(m => m.name);

  for (const migration of migrations) {
    if (existingNames.includes(migration.name)) {
      console.log(`   ⏭️  Skipping ${migration.name} (already applied)`);
      continue;
    }

    try {
      console.log(`   Applying ${migration.name}...`);

      const fileContent = await readFile(migration.path);
      const query = new TextDecoder().decode(fileContent);

      // Use MCP to apply migration
      await mcp__supabase_apply_migration({
        name: migration.name,
        query: query
      });

      console.log(`   ✅ ${migration.name} applied successfully`);
    } catch (error) {
      console.error(`   ❌ Error applying ${migration.name}:`, error);
    }
    console.log('');
  }
}

async function setupEnvironment() {
  console.log('⚙️  Setting up Environment...\n');

  // Get project URLs
  const projectUrl = await mcp__supabase_get_project_url();
  console.log(`   Project URL: ${projectUrl.api_url}`);
  console.log(`   Studio URL: ${projectUrl.studio_url}`);

  // Get API keys
  const keys = await mcp__supabase_get_publishable_keys();
  console.log(`   Anon Key: ${keys.find(k => !k.disabled && k.name === 'anon')?.key?.substring(0, 20)}...`);

  // Check advisors
  const securityAdvisors = await mcp__supabase_get_advisors({ type: 'security' });
  if (securityAdvisors.length > 0) {
    console.log('\n   ⚠️  Security Recommendations:');
    securityAdvisors.forEach(advisor => {
      console.log(`   - ${advisor.title}: ${advisor.description}`);
    });
  }
}

async function generateTypes() {
  console.log('\n📝 Generating TypeScript Types...');

  try {
    const types = await mcp__supabase_generate_typescript_types();

    // Save to file
    await Deno.writeTextFile('./src/types/database.ts', types);
    console.log('   ✅ Types generated at ./src/types/database.ts');
  } catch (error) {
    console.error('   ❌ Error generating types:', error);
  }
}

async function verifySetup() {
  console.log('\n✅ Verifying Setup...');

  // Check tables
  const tables = await mcp__supabase_list_tables({ schemas: ['public'] });
  const requiredTables = ['user_credits', 'voice_cloning_usage', 'voice_usage_limits', 'voice_profiles'];

  console.log('\n   📋 Database Tables:');
  requiredTables.forEach(table => {
    const exists = tables.some(t => t.table_name === table);
    console.log(`   ${exists ? '✅' : '❌'} ${table}`);
  });

  // Check edge functions
  const functions = await mcp__supabase_list_edge_functions();
  console.log('\n   🔧 Edge Functions:');
  edgeFunctions.forEach(func => {
    const exists = functions.some(f => f.function_name === func.name);
    console.log(`   ${exists ? '✅' : '❌'} ${func.name}`);
  });
}

async function main() {
  console.log('🎤 INrVO Voice Cloning - MCP Deployment Script\n');
  console.log('=' .repeat(50));

  try {
    await setupEnvironment();
    await runMigrations();
    await deployEdgeFunctions();
    await generateTypes();
    await verifySetup();

    console.log('\n' + '=' .repeat(50));
    console.log('✅ Deployment complete!');
    console.log('\nNext steps:');
    console.log('1. Set environment variables in Supabase dashboard:');
    console.log('   - ELEVENLABS_API_KEY');
    console.log('   - GEMINI_API_KEY');
    console.log('2. Test the voice cloning feature');
    console.log('3. Monitor usage with the Supabase dashboard');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    Deno.exit(1);
  }
}

// Run the deployment
if (import.meta.main) {
  await main();
}