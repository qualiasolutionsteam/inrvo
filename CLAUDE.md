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
```

## Tech Stack

- **Frontend**: React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL with RLS, Edge Functions in Deno)
- **AI Services**: Gemini 2.0 Flash (script generation), ElevenLabs (voice cloning + TTS)
- **Monitoring**: Sentry (production only)

## Architecture

### Key Directories
- `components/` - React UI components (lazy-loaded for bundle optimization)
- `src/contexts/` - React Context for modal state management (ModalContext)
- `src/hooks/` - Custom hooks: useVoiceGeneration, useVoiceCloning, useAudioPlayback
- `src/lib/agent/` - MeditationAgent (emotional detection, wisdom teachers, conversation management)
- `src/lib/` - Services: voiceService.ts, elevenlabs.ts, edgeFunctions.ts, credits.ts
- `supabase/functions/` - Edge Functions: generate-speech, gemini-script, process-voice
- `supabase/migrations/` - Database schema migrations

### Data Flow
1. User input → AgentChat → MeditationAgent (emotional state detection)
2. Script generation → Edge Function → Gemini API
3. User edits script with audio tags in ScriptEditor
4. Voice selection → TTS via Edge Function → ElevenLabs API
5. Audio playback with text sync via InlinePlayer

### Audio Tag System
Scripts contain inline markers like `[pause]`, `[deep breath]`, `[long pause]` that control TTS pacing and enable text-to-audio synchronization. Tags are defined in `constants.tsx`.

## Environment Variables

```env
# Frontend (.env.local)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Edge Function secrets (set in Supabase dashboard)
ELEVENLABS_API_KEY=sk_...
GEMINI_API_KEY=AI...
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

## Deployment

- **Frontend**: Vercel (auto-deploys from main branch)
- **Edge Functions**: Deploy via `supabase functions deploy <function-name>`
- **Security headers**: Configured in vercel.json (HSTS, CSP, etc.)
