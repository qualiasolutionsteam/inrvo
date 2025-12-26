# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

INrVO is a personalized meditation app built with React 19, Vite, and Supabase. Users describe how they feel, an AI agent generates a meditation script via Gemini, and text-to-speech creates audio using cloned or preset voices. The app features real-time audio playback with synchronized text highlighting.

## Commands

```bash
# Development
npm run dev              # Start dev server on port 3000
npm run build            # Production build
npm run preview          # Preview production build

# Testing
npm test                 # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:coverage    # Run with coverage report
npm run test:ui          # Run tests with Vitest UI
vitest run src/lib/credits.test.ts  # Run single test file
```

## Architecture

### Frontend (React 19 + Vite)

**Routing:** Uses React Router v7 with lazy-loaded pages (`src/router.tsx`). All pages are code-split via `React.lazy()`.

**State Management:**
- React Context for cross-cutting concerns:
  - `src/contexts/VoiceContext.tsx` - Voice selection state
  - `src/contexts/ModalContext.tsx` - Modal visibility coordination (with sub-contexts in `src/contexts/modals/`)
  - `src/contexts/AudioContext.tsx` - Audio playback state
  - `src/contexts/AppContext.tsx` - App-wide state

**Key Components:**
- `components/V0MeditationPlayer/` - Main player with audio visualization
- `src/components/MeditationEditor/` - Script editing with audio tag insertion
- `components/SimpleVoiceClone.tsx` - Voice cloning UI
- `components/AgentChat.tsx` - Conversational AI interface
- `components/ui/chronos-engine.tsx` - Animated gear engine for agent avatar and loading states

**UI Components (`components/ui/`):**
- `chronos-engine.tsx` - Animated gear component with variants: `avatar` (32px), `mini` (24px), `loading` (120px). Exports: `ChronosEngine`, `ChronosAvatar`, `ChronosLoader`, `ChronosMiniLoader`

**Data Layer:**
- `lib/supabase.ts` - Supabase client and all database operations
- `src/lib/edgeFunctions.ts` - Edge function wrappers with retry logic
- `src/lib/voiceService.ts` - TTS provider routing (Fish Audio primary, Chatterbox fallback, Web Speech API free tier)
- `src/lib/credits.ts` - Credit system (currently disabled, returns unlimited credits)

### Backend (Supabase Edge Functions)

All API keys are server-side only. Edge functions in `supabase/functions/`:

| Function | Purpose |
|----------|---------|
| `generate-speech` | TTS via Fish Audio (primary) with ElevenLabs legacy support |
| `gemini-script` | Meditation script generation via Gemini API |
| `fish-audio-clone` | Voice cloning via Fish Audio API |
| `chatterbox-clone` | Fallback voice cloning via Replicate |
| `chatterbox-tts` | Fallback TTS via Replicate |

**Shared utilities** in `supabase/functions/_shared/`:
- `compression.ts` - Response compression
- `rateLimit.ts` - Per-user rate limiting
- `tracing.ts` - Request ID propagation
- `encoding.ts` - Base64 encoding helpers

### AI Agent System

`src/lib/agent/` contains the meditation agent:
- `MeditationAgent.ts` - Conversational AI that understands emotional states and generates meditation prompts
- `knowledgeBase.ts` - Wisdom traditions, meditation types, emotional state detection
- `conversationStore.ts` - Conversation persistence
- `contentTypes.ts` - 5 content categories: Meditations, Affirmations, Self-Hypnosis, Guided Journeys, Children's Stories
- `contentDetection.ts` - Intelligent content type detection from user input
- `promptTemplates.ts` - Category-specific prompt generation

The agent is designed to **converse first, generate later** - it only creates meditation scripts when explicitly requested.

### Database Schema

Key tables (see `supabase/migrations/` for full schema):
- `voice_profiles` - User voice clones with Fish Audio model IDs
- `voice_clones` - Legacy voice sample storage
- `meditation_history` - Saved meditations with audio URLs
- `users` - Extended user profile with audio preferences

Audio files stored in Supabase Storage buckets: `voice-samples`, `meditation-audio`

## Voice Providers

Three-tier TTS provider system:
1. **Fish Audio** (primary) - Best quality, uses `fish_audio_model_id` from voice profile
2. **Chatterbox** (fallback) - Via Replicate, uses `voice_sample_url` for zero-shot cloning
3. **Web Speech API** - Free browser-based fallback

Provider selection happens in `voiceService.detectProvider()` based on voice profile fields.

## Environment Variables

Frontend (`.env.local`):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key
- `VITE_SENTRY_DSN` - Optional error tracking

Edge Functions (set in Supabase Dashboard):
- `FISH_AUDIO_API_KEY` - Primary TTS/cloning
- `GEMINI_API_KEY` - Script generation
- `ELEVENLABS_API_KEY` - Legacy voice support (optional)

## Path Aliases

`@/` maps to the project root (configured in both `tsconfig.json` and `vite.config.ts`).

```typescript
import { supabase } from '@/lib/supabase';
```

## Bundle Optimization

Vite config includes manual chunks for:
- `react-vendor` - React/ReactDOM (~12KB)
- `supabase-vendor` - Supabase client (~169KB)
- `framer-motion-vendor` - Animation library (~116KB)
- `sentry-vendor` - Error tracking (~11KB)
- `edgeFunctions` - Voice cloning and Gemini API (~4KB, dynamically loaded)

**Code Splitting Strategy:**
- All page components lazy-loaded via `React.lazy()` in `src/router.tsx`
- Heavy components (AuthModal, VoiceManager, SimpleVoiceClone, MeditationEditor, MeditationPlayer, AgentChat) lazy-loaded in App.tsx
- Edge function imports are dynamic to defer voice cloning/AI code until needed
- Initial bundle ~321KB gzipped, with ~400KB deferred via lazy loading

**Important:** Always use dynamic imports for `edgeFunctions.ts` to maintain code splitting:
```typescript
// ✅ Good - dynamic import
const { fishAudioCloneVoice } = await import('./src/lib/edgeFunctions');

// ❌ Bad - static import pulls into main bundle
import { fishAudioCloneVoice } from './src/lib/edgeFunctions';
```

## Testing

- Test environment: happy-dom (configured in `vitest.config.ts`)
- Test setup: `tests/setup.ts` includes mocks for AudioContext, MediaRecorder, and fetch
- Coverage thresholds: `src/lib/credits.ts` has strict 90% coverage requirement
