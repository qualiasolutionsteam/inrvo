# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

INrVO is an AI-powered meditation platform that generates personalized meditation scripts using Gemini 2.0 Flash and synthesizes audio using ElevenLabs voice cloning. Users can clone their own voice or use existing profiles for intimate, personalized meditation guidance.

## Build & Development Commands

```bash
npm run dev          # Vite dev server (http://localhost:3000)
npm run build        # Production build
npm test             # Run Vitest in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Generate coverage report
npm run test:ui      # Run Vitest with UI
```

**Testing a single file:**
```bash
npx vitest run tests/lib/credits.test.ts
npx vitest tests/lib/credits.test.ts  # watch mode
```

**Edge Functions (Deno):**
```bash
supabase functions deploy <function-name>
supabase functions serve  # local development
```

## Tech Stack

- **Frontend**: React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL with RLS, Edge Functions in Deno)
- **AI Services**: Gemini 2.0 Flash (script generation), ElevenLabs (voice cloning + TTS)
- **Testing**: Vitest + @testing-library/react + happy-dom + MSW
- **Monitoring**: Sentry (production only)

## Architecture

### Key Directories
- `components/` - React UI components (lazy-loaded for bundle optimization)
- `src/contexts/` - React Context for modal state management (ModalContext)
- `src/hooks/` - Custom hooks: useVoiceGeneration, useVoiceCloning, useAudioPlayback, useMeditationAgent
- `src/lib/agent/` - MeditationAgent (emotional detection, wisdom teachers, conversation management)
- `src/lib/` - Services: voiceService.ts, elevenlabs.ts, edgeFunctions.ts, credits.ts, textSync.ts
- `supabase/functions/` - Edge Functions: generate-speech, gemini-script, process-voice, elevenlabs-voice-ops
- `supabase/migrations/` - Database schema migrations (numbered 001-009)
- `tests/` - Test files with setup in tests/setup.ts

### Data Flow
1. User input → AgentChat → MeditationAgent (emotional state detection)
2. Script generation → Edge Function → Gemini API
3. User edits script with audio tags in ScriptEditor
4. Voice selection → TTS via Edge Function → ElevenLabs API
5. Audio playback with text sync via InlinePlayer

### Audio Tag System
Scripts contain inline markers like `[pause]`, `[deep breath]`, `[long pause]` that control TTS pacing and enable text-to-audio synchronization. Tags are detected via regex `/^\[.+\]$/` in `src/lib/textSync.ts`. Tag categories and templates are defined in `constants.tsx`.

### Edge Function Pattern
All Edge Functions follow this pattern:
- CORS handling with allowed origins list
- JWT authentication via Supabase
- Service role key for database operations
- Return JSON responses with success/error structure

## Environment Variables

```env
# Frontend (.env.local)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Edge Function secrets (set in Supabase dashboard)
ELEVENLABS_API_KEY=sk_...
GEMINI_API_KEY=AI...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Database

Core tables: `voice_profiles`, `user_credits`, `agent_conversations`, `voice_metadata`, `user_audio_tag_preferences`

All tables use Row Level Security - users can only access their own data.

The credit system is currently disabled (`CREDITS_DISABLED = true` in credits.ts) for unlimited access.

## Key Files

- `App.tsx` - Main app component (~1400 lines, handles core UI state)
- `types.ts` - Global TypeScript interfaces
- `constants.tsx` - Audio tag categories, template types, background tracks
- `src/lib/agent/MeditationAgent.ts` - Core agent with emotional state detection
- `src/lib/agent/knowledgeBase.ts` - Wisdom teachers, meditation types, emotional mapping
- `src/lib/edgeFunctions.ts` - Client for calling Edge Functions with auth
- `src/lib/textSync.ts` - Text-to-audio synchronization logic

## Path Aliases

`@/` maps to project root (configured in vite.config.ts and vitest.config.ts)

## Deployment

- **Frontend**: Vercel (auto-deploys from main branch via GitHub Actions)
- **Edge Functions**: Deploy via `supabase functions deploy <function-name>`
- **Security headers**: Configured in vercel.json (HSTS, CSP, etc.)

### Rollback Strategy

**Frontend (Vercel):**
1. Go to Vercel Dashboard → Project → Deployments
2. Find the last known good deployment
3. Click "..." → "Promote to Production"
4. Rollback is instant with zero downtime

**Database Migrations:**
```bash
# List applied migrations
supabase db remote list

# Reset to specific migration (CAUTION: destructive)
supabase db reset --linked --version <migration_number>

# For non-destructive rollback, create a new migration that reverses changes
```

**Edge Functions:**
```bash
# Redeploy previous version from git
git checkout <previous-commit> -- supabase/functions/<function-name>
supabase functions deploy <function-name>
```

**Emergency Contacts:**
- Vercel Status: status.vercel.com
- Supabase Status: status.supabase.com

## Monitoring

- **Error Tracking**: Sentry (see `index.tsx` for config)
- **Analytics**: Vercel Analytics
- **Health Check**: `GET /functions/v1/health`
- **Uptime**: See `docs/UPTIME_MONITORING.md`
