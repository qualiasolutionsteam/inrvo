# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

INrVO is a meditation and wellness app that generates personalized guided meditations using AI. Users describe their mood/needs, and the app generates custom meditation scripts with TTS voice synthesis.

**Live URL**: https://inrvo.com (Vercel)
**Supabase Project ID**: `jcvfnkuppbvkbzltkioa`

## Commands

```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm test             # Run tests with vitest (watch mode)
npm run test:run     # Single test run (no watch)
npm run test:coverage # Coverage report
npm run test:ui      # Vitest UI
ANALYZE=true npm run build  # Bundle analyzer
```

## Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Routing**: react-router-dom v7 (lazy-loaded pages in `src/router.tsx`)
- **Styling**: Tailwind CSS v4 + Framer Motion
- **State**: React Context pattern (see Context Architecture below)
- **Backend**: Supabase (Auth, PostgreSQL, Edge Functions, Storage)
- **AI/TTS**: Google Gemini (scripts), ElevenLabs (primary TTS), Web Speech API (fallback)
- **Monitoring**: Sentry + Vercel Analytics

### Key Data Flows

1. **Script Generation**: User prompt → `gemini-chat` Edge Function → AI-generated meditation script
2. **Voice Synthesis**: Script → `generate-speech` Edge Function → ElevenLabs → Audio stream
3. **Voice Cloning**: Audio upload → `elevenlabs-clone` Edge Function → Custom voice profile

### Project Structure

```
/                     # Root entry (index.tsx, App.tsx)
├── src/
│   ├── router.tsx    # Route definitions with lazy loading + prefetching
│   ├── pages/        # Page components
│   │   └── marketing/  # Marketing portal (admin dashboard)
│   ├── contexts/     # React contexts (see below)
│   ├── lib/          # Services and utilities
│   │   ├── voiceService.ts    # TTS provider routing
│   │   ├── edgeFunctions.ts   # Edge function API calls
│   │   └── agent/             # Gemini Live agent logic
│   └── hooks/        # Custom React hooks
├── lib/
│   └── supabase.ts   # Supabase client + all database operations
├── components/       # Shared React components
├── supabase/
│   ├── functions/    # Deno Edge Functions (see below)
│   └── migrations/   # SQL migrations
├── types.ts          # TypeScript type definitions
└── constants.tsx     # App constants, templates, voice profiles
```

### Context Architecture

Contexts live in `src/contexts/` and are re-exported from `src/contexts/index.ts`:

| Context | Purpose |
|---------|---------|
| `AuthContext` | User auth state, voice profile management |
| `ScriptContext` | Script generation state, chat history |
| `LibraryContext` | Meditation history/favorites |
| `AudioContext` | Playback state, volume, background music |
| `AudioTagsContext` | Audio tag preferences (pauses, breathing) |
| `ChatHistoryContext` | Conversation history with Gemini |
| `ModalContext` | Global modal state |
| `AppContext` | App-wide state (loading, errors) |

Modal-specific contexts are in `src/contexts/modals/`.

### Edge Functions

Located in `supabase/functions/`:

| Function | Purpose |
|----------|---------|
| `gemini-chat` | Conversational AI for script generation |
| `gemini-script` | Direct script generation |
| `gemini-live-token` | Token for Gemini Live API |
| `generate-speech` | ElevenLabs TTS synthesis |
| `elevenlabs-clone` | Voice cloning via ElevenLabs |
| `elevenlabs-tts` | Legacy TTS endpoint |
| `health` | Health check endpoint |
| `delete-user-data` | GDPR data deletion |
| `export-user-data` | GDPR data export |

Shared utilities are in `supabase/functions/_shared/` (rate limiting, sanitization, security headers, etc.).

### Voice Provider System

Voice profiles support multiple providers (defined in `types.ts`):
- `elevenlabs`: Primary provider (best quality, used for cloning)
- `browser`: Web Speech API fallback (free, works offline)

Legacy providers (`fish-audio`, `chatterbox`) are marked for re-cloning to ElevenLabs.

The `voiceService.ts` routes TTS requests to the appropriate provider based on voice profile configuration.

## Database

Core tables (RLS-protected by user_id):
- `users` - Extended user data and preferences
- `voice_profiles` - Voice profiles with ElevenLabs IDs
- `voice_clones` - Raw voice clone data
- `meditation_history` - Session history with generated audio
- `agent_conversations` - Gemini chat history

Key RPC functions:
- `toggle_meditation_favorite` - Atomic favorite toggle
- `check_user_credits` - Credit balance check

Database operations are in `lib/supabase.ts` with retry logic and query deduplication.

## Environment Variables

Frontend (`.env.local`):
```
VITE_SUPABASE_URL=https://jcvfnkuppbvkbzltkioa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SENTRY_DSN=...  # Optional
```

Edge Functions (Supabase Dashboard > Settings > Secrets):
```
ELEVENLABS_API_KEY=xi_...
GEMINI_API_KEY=...
```

## Testing

Tests use Vitest + React Testing Library + happy-dom. Test files mirror `src/` structure in `tests/`.

```bash
# Run single test file
npm test -- tests/lib/credits.test.ts

# Run tests matching pattern
npm test -- --grep "voice"
```

Coverage thresholds exist for critical paths (e.g., `src/lib/credits.ts`: 90%).

## Build Optimization

- Vite manual chunks split vendors (React, Supabase, Framer Motion, Sentry)
- Route prefetching for adjacent pages (`src/router.tsx` has prefetch map)
- Lazy loading for heavy components (VoiceManager, MeditationEditor)
