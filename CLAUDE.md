# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

INrVO is a meditation and wellness app that generates personalized guided meditations using AI. Users describe their mood/needs, and the app generates custom meditation scripts with TTS voice synthesis.

**Live URL**: https://inrvo.com (Vercel)
**Supabase Project ID**: `ygweconeysctxpjjnehy`

## Commands

```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm test             # Run tests with vitest (watch mode)
npm run test:run     # Single test run (CI mode)
npm run test:ui      # Vitest UI
ANALYZE=true npm run build  # Bundle analyzer (opens stats.html)
```

## Path Alias

The `@/` alias resolves to the project root (configured in `vitest.config.ts` and `tsconfig.json`):
```typescript
import { supabase } from '@/lib/supabase';
```

## Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Routing**: react-router-dom v7 (lazy-loaded pages in `src/router.tsx`)
- **Styling**: Tailwind CSS v4 + Framer Motion
- **State**: React Context pattern (10 contexts in `src/contexts/`)
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
│   ├── contexts/     # React contexts (10 contexts, 8 re-exported from index.ts)
│   ├── lib/          # Services and utilities
│   │   ├── voiceService.ts    # TTS provider routing
│   │   ├── edgeFunctions.ts   # Edge function API calls with retry/tracing
│   │   └── agent/             # Gemini-powered MeditationAgent (5 content types)
│   └── hooks/        # Custom React hooks
├── lib/
│   └── supabase.ts   # Supabase client + all database operations
├── components/       # Shared React components
├── supabase/
│   ├── functions/    # Deno Edge Functions
│   └── migrations/   # SQL migrations
├── types.ts          # TypeScript type definitions
└── constants.tsx     # App constants, templates, voice profiles
```

### Meditation Agent (`src/lib/agent/`)

Conversational AI assistant supporting 5 content categories:
- **Meditations**: guided visualizations, breathwork, body scans
- **Affirmations**: power, guided, sleep, mirror work styles
- **Self-Hypnosis**: light, standard, therapeutic depths
- **Guided Journeys**: past life, spirit guide, shamanic, astral
- **Children's Stories**: toddler (2-4), young child (5-8)

Key files:
- `MeditationAgent.ts` - Main agent logic, conversation state
- `contentDetection.ts` - Detects content type from user input
- `knowledgeBase.ts` - Wisdom teachers, meditation types, emotional states
- `conversationStore.ts` - LocalStorage + Supabase conversation persistence

### Voice Provider System

Voice profiles support multiple providers (defined in `types.ts`):
- `elevenlabs`: Primary provider (best quality, used for cloning)
- `browser`: Web Speech API fallback (free, works offline)

Legacy providers (`fish-audio`, `chatterbox`) are marked for re-cloning to ElevenLabs. The `voiceService.ts` routes TTS requests based on voice profile config.

**ElevenLabs V3 Model**: Text preprocessing in `voiceService.ts` transforms INrVO audio tags (`[pause]`, `[deep breath]`) to V3-native tags (`[sighs]`, `[whispers]`).

### Edge Functions (`supabase/functions/`)

| Function | Purpose |
|----------|---------|
| `gemini-chat` | Conversational AI for script generation |
| `gemini-script` | Direct script generation |
| `gemini-live-token` | Token for Gemini Live API |
| `generate-speech` | ElevenLabs TTS synthesis (main) |
| `elevenlabs-tts` | ElevenLabs TTS (alternative endpoint) |
| `elevenlabs-clone` | Voice cloning via ElevenLabs |
| `health` | Health check endpoint |
| `delete-user-data` | GDPR data deletion |
| `export-user-data` | GDPR data export |

Shared utilities in `supabase/functions/_shared/`:
- `circuitBreaker.ts` - Prevents cascading failures (configurable per provider)
- `rateLimit.ts` - Request rate limiting
- `sanitization.ts` - Input sanitization
- `securityHeaders.ts` - CORS and security headers
- `elevenlabsConfig.ts` - ElevenLabs API configuration

### Resilience Patterns

**Database Operations** (`lib/supabase.ts`):
- `withRetry()` - Exponential backoff with jitter for transient errors
- `deduplicatedQuery()` - Prevents duplicate concurrent requests
- Optimized field selection (e.g., `VOICE_PROFILE_FIELDS`, `MEDITATION_HISTORY_FIELDS`)

**Edge Function Calls** (`src/lib/edgeFunctions.ts`):
- Auth token caching (avoids session fetch per request)
- Request ID generation for distributed tracing
- Retry with exponential backoff for 5xx/429 errors

**LocalStorage** (`src/lib/agent/conversationStore.ts`):
- Quota protection with automatic pruning
- Graceful degradation on storage limits

### Route Prefetching

`src/router.tsx` implements route prefetching:
- Pages are lazy-loaded with `React.lazy()`
- Adjacent routes prefetched via `requestIdleCallback`
- `prefetchMap` defines route adjacency (e.g., `/` prefetches `/library`, `/templates`)

## Database

Core tables (all RLS-protected):
- `users` - Extended user data, preferences, `onboarding_completed` flag
- `voice_profiles` - Voice profiles with `elevenlabs_voice_id`, cloning metadata
- `voice_clones` - Raw voice clone data (base64 audio)
- `meditation_history` - Session history with `audio_url`, content categories, timing maps
- `agent_conversations` - Gemini chat history with session state
- `user_credits` - Credit balance tracking (`total_credits`, `credits_used`, `credits_remaining`)
- `voice_usage_limits` - Monthly usage limits per user
- `voice_cloning_usage` - Voice cloning operation tracking
- `audio_generations` - TTS generation records
- `templates` / `template_categories` - Meditation templates
- `audio_tag_presets` - Available audio tags (pauses, breaths, etc.)

Marketing Portal tables (admin-only):
- `marketing_deliverables`, `marketing_content_calendar`, `marketing_influencers`
- `marketing_partnerships`, `marketing_reports`, `marketing_documents`
- `marketing_communications`, `marketing_client_inputs`

Key RPC functions:
- `toggle_meditation_favorite` - Atomic favorite toggle
- `check_user_credits` - Credit balance check

Storage buckets:
- `voice-samples` - Voice clone audio samples
- `meditation-audio` - Generated meditation audio

## Environment Variables

Frontend (`.env.local`):
```
VITE_SUPABASE_URL=https://ygweconeysctxpjjnehy.supabase.co
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
# Run all tests
npm test

# Run specific test file
npm test -- tests/lib/credits.test.ts

# Run tests matching pattern
npm test -- --grep "voice"

# Single run (CI mode)
npm run test:run

# Coverage report
npm run test:coverage
```

Coverage thresholds in `vitest.config.ts`:
- Global: 50% statements/functions/lines, 40% branches
- `src/lib/credits.ts`: 90% statements/functions/lines, 85% branches (critical path)

## Build Optimization

Configured in `vite.config.ts`:
- Manual chunks: `react-vendor`, `router-vendor`, `supabase-vendor`, `framer-motion-vendor`, `sentry-vendor`, `icons-vendor`
- Target: `es2020` for modern browsers
- CSS code splitting enabled
- Source maps only in development

## Auth Flow

`AuthContext` manages auth state:
- `onAuthStateChange` is single source of truth (fires `INITIAL_SESSION` on mount)
- `isSessionReady` flag indicates when access token is available (safe for DB requests)
- Token cached in `edgeFunctions.ts` to avoid session fetch per API call
