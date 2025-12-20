# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Production build to /dist
npm run preview      # Preview production build locally

npm run test         # Run Vitest in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Interactive test UI
npm run test:coverage # Run tests with coverage report
```

## Project Overview

**INrVO - Digital Zen Wellness** is a React + TypeScript web app for AI-powered personalized meditation generation. Users describe their emotional state, the app generates custom meditation scripts via Google Gemini, synthesizes audio via ElevenLabs/Gemini TTS, and provides real-time playback with synchronized text highlighting.

**Stack**: React 19 + TypeScript + Vite + Tailwind CSS 4 + Supabase + Vercel

## Architecture

### Voice Generation Pipeline
1. User enters prompt describing emotional state
2. **Gemini 2.0 Flash** generates meditation script (100-150 words, optimized for 5-10s generation)
3. Audio tags like `[long pause]`, `[deep breath]` are injected for pacing
4. **ElevenLabs** (cloned voices) or **Gemini TTS** (prebuilt voices) synthesizes audio
5. **ScriptReader** provides real-time word-by-word highlighting during playback

### Key Files
- `App.tsx` - Main component handling all views and state (large file, candidate for refactoring)
- `geminiService.ts` - Google Generative AI integration for script generation
- `src/lib/voiceService.ts` - Voice generation routing (Gemini vs ElevenLabs)
- `src/lib/elevenlabs.ts` - ElevenLabs TTS & voice cloning API
- `src/lib/textSync.ts` - Audio-text synchronization logic
- `src/lib/credits.ts` - Credit management & usage tracking
- `src/contexts/ModalContext.tsx` - Centralized state for 14 modal types
- `components/ScriptReader.tsx` - Real-time word highlighting during playback
- `components/InlinePlayer.tsx` - Compact audio player with seek functionality

### Voice Cloning Flow
1. User records 30+ seconds of voice in `SimpleVoiceClone.tsx`
2. Audio uploaded to ElevenLabs `/v1/voices/add` endpoint
3. Returns `voice_id` stored in Supabase
4. Costs 5,000 credits per clone with duplicate detection

### Credit System
- Monthly free allowance: 10,000 credits
- TTS generation: 280 credits per 1K characters
- Voice cloning: 5,000 credits per clone
- Database-backed tracking with RLS policies

## Database (Supabase)

Migrations in `supabase/migrations/`:
- `001_add_voice_cloning.sql` - Voice storage schema
- `002_credit_functions.sql` - Credit increment functions
- `003_audio_tags.sql` - Audio tag configuration
- `004_secure_credit_functions.sql` - Secured credit operations

Edge Functions in `supabase/functions/` - Deno-based serverless

## Environment Variables

Required in `.env.local`:
```
VITE_GEMINI_API_KEY=...
VITE_ELEVENLABS_API_KEY=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Testing

Uses Vitest + Happy DOM + MSW for mocking. Tests located in `tests/` directory.

```bash
npm run test             # Watch mode
npm run test:run         # Single run
vitest run src/lib/credits.test.ts  # Run single test file
```

## Security Architecture

### ⚠️ KNOWN ISSUE: API Key Exposure

**Current State**: Frontend code (`elevenlabs.ts`, `geminiService.ts`) calls third-party APIs directly using `VITE_*` environment variables. These keys are exposed to the browser and could be extracted by users.

**Mitigation in Place**:
- Edge Functions exist in `supabase/functions/` with server-side keys
- Edge Functions have CORS restricted to allowed origins only
- Edge Functions validate JWT tokens from Authorization header
- User identity derived from JWT, not from request body (prevents spoofing)

**Recommended Fix** (requires architecture change):
1. Move all API calls from frontend to Edge Functions
2. Remove `VITE_ELEVENLABS_API_KEY` and `VITE_GEMINI_API_KEY` from frontend
3. Update frontend to call Edge Functions instead of APIs directly
4. Add rate limiting per user at Edge Function level

**Edge Functions Status**:
- `generate-speech/` - Ready with JWT validation & CORS
- `process-voice/` - Ready with JWT validation & CORS
- Both use `SUPABASE_SERVICE_ROLE_KEY` + `ELEVENLABS_API_KEY` + `GEMINI_API_KEY` (server-side only)

### Production Audit Fixes (Dec 2024)
- ✅ CORS restricted to allowed origins (not wildcard)
- ✅ JWT validation on all Edge Functions
- ✅ React ErrorBoundary for crash recovery
- ✅ RLS enabled on all user data tables
- ✅ Background images compressed (7.7MB → 200KB)

## Deployment

Deployed to Vercel with security headers configured in `vercel.json` (CSP, HSTS, X-Frame-Options).

Code splitting configured in `vite.config.ts` with separate chunks for React, D3, Supabase, and Google GenAI.

## UI Patterns

- **Glass morphism** effects throughout (see `index.css`)
- **GPU-optimized animations** with transform3d, respects `prefers-reduced-motion`
- **Mobile-first responsive** with iOS safe area support
- **ModalContext** for centralized modal state management
