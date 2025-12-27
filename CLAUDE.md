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
npx tsc --noEmit         # Type-check without emitting

# Testing
npm test                 # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:coverage    # Run with coverage report
npm run test:ui          # Run tests with Vitest UI
vitest run src/lib/credits.test.ts  # Run single test file

# Supabase Edge Functions (requires supabase CLI)
supabase functions serve                    # Run all functions locally
supabase functions deploy <function-name>   # Deploy a single function
supabase db push                            # Push migrations to remote
```

## Architecture

### Frontend (React 19 + Vite)

**Routing:** Uses React Router v7 with lazy-loaded pages (`src/router.tsx`). All pages are code-split via `React.lazy()`.

**Routes:** `/` (home), `/play/:id?` (player), `/library` (My Audios), `/templates`, `/voice`, `/clone`, `/how-it-works`, `/about`, `/terms`, `/privacy`, `/pricing`

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
- `src/pages/TemplatesPage.tsx` - Template browser with category navigation

**Templates System (`constants.tsx`):**
4 main categories with 50+ ready-to-use templates:
- **Meditation** (cyan) - Stress Relief, Sleep, Focus, Self-Love, Spiritual
- **Affirmations** (amber) - Morning Power, Confidence, Abundance, Health
- **Self-Hypnosis** (violet) - Weight Loss, Quit Smoking, Confidence, Sleep
- **Sleep Stories** (pink) - Nature Journeys, Fantasy Realms, Cozy Nights

Each category has color theming, custom icons (Sparkle, Affirmation heart, Hypnosis spiral, Book), and subcategories. Templates populate the meditation editor when selected. Access via burger menu → Templates.

**UI Components (`components/ui/`):**
- `chronos-engine.tsx` - Animated gear component with variants: `avatar` (32px), `mini` (24px), `loading` (120px). Exports: `ChronosEngine`, `ChronosAvatar`, `ChronosLoader`, `ChronosMiniLoader`
- `ai-voice-input.tsx` - Standalone voice recording button with visualizer bars, timer, and auto-stop at 30s

**Chat Input Styling:**
The chat input has a subtle cyan/purple glow effect:
- **Default:** `border-cyan-500/20` with glow `0 0 15px rgba(34, 211, 238, 0.08), 0 0 30px rgba(139, 92, 246, 0.05)`
- **Recording:** `border-cyan-400/50` with brighter glow `0 0 25px rgba(34, 211, 238, 0.2), 0 0 50px rgba(139, 92, 246, 0.15)`
- **Recording button:** Solid cyan (`bg-cyan-500/90`), not red

**Data Layer:**
- `lib/supabase.ts` - Supabase client and all database operations
- `src/lib/edgeFunctions.ts` - Edge function wrappers with retry logic
- `src/lib/voiceService.ts` - TTS provider routing (Fish Audio primary, Chatterbox fallback, Web Speech API free tier)
- `src/lib/credits.ts` - Credit system (currently disabled, returns unlimited credits)

### Backend (Supabase Edge Functions)

All API keys are server-side only. Edge functions in `supabase/functions/`:

| Function | Purpose |
|----------|---------|
| `generate-speech` | Unified TTS with provider routing (Fish Audio primary, Chatterbox fallback) |
| `fish-audio-tts` | Fish Audio TTS with automatic Chatterbox fallback |
| `fish-audio-clone` | Voice cloning via Fish Audio API |
| `gemini-chat` | **Conversational AI** - respects agent's system prompt for natural dialogue |
| `gemini-script` | Meditation script generation via Gemini API (NOT for chat) |
| `chatterbox-tts` | Fallback TTS via Replicate |
| `chatterbox-clone` | Fallback voice cloning via Replicate |
| `delete-user-data` | GDPR-compliant user data deletion |
| `delete-fish-audio-model` | Remove Fish Audio voice models |
| `export-user-data` | GDPR-compliant user data export |
| `health` | Health check endpoint |

**Shared utilities** in `supabase/functions/_shared/`:
- `circuitBreaker.ts` - Circuit breaker for external API calls
- `compression.ts` - Response compression
- `contentTemplates.ts` - Category-specific prompt templates
- `encoding.ts` - Base64 encoding helpers
- `rateLimit.ts` - Per-user rate limiting (IP-based for anonymous users)
- `sanitization.ts` - Input sanitization
- `securityHeaders.ts` - CORS and security headers
- `tracing.ts` - Request ID propagation

### AI Agent System

`src/lib/agent/` contains the meditation agent:
- `MeditationAgent.ts` - Conversational AI that understands emotional states and generates meditation prompts
- `agentTools.ts` - Tool functions for script generation, audio synthesis, quote retrieval
- `knowledgeBase.ts` - Wisdom traditions, meditation types, emotional state detection
- `conversationStore.ts` - Conversation persistence
- `contentTypes.ts` - 5 content categories: Meditations, Affirmations, Self-Hypnosis, Guided Journeys, Children's Stories
- `contentDetection.ts` - Intelligent content type detection from user input
- `promptTemplates.ts` - Category-specific prompt generation
- `index.ts` - Public exports

The agent is designed to **converse first, generate later** - it only creates meditation scripts when explicitly requested.

**CRITICAL Architecture:**
```
Conversation flow:  geminiService.chat() → gemini-chat edge function
Script generation:  geminiService.enhanceScript() → gemini-script edge function
Script harmonize:   geminiService.harmonizeScript() → gemini-script edge function (operation: 'harmonize')
```

The agent uses TWO different Gemini endpoints:
- `gemini-chat` - For natural conversation, respects the agent's SYSTEM_PROMPT
- `gemini-script` - For meditation generation, extension, and harmonization

### Harmonize Feature

The "Harmonize" button (magic wand icon) in MeditationEditor's Status Row uses AI to intelligently insert audio tags:
- **Location:** Always visible in Status Row (`ControlPanel.tsx`), not hidden in expanded panel
- **Flow:** `handleHarmonize` in `MeditationEditor/index.tsx` → `geminiService.harmonizeScript()` → `gemini-script` edge function with `operation: 'harmonize'`
- **Tags inserted:** `[pause]`, `[long pause]`, `[deep breath]`, `[exhale slowly]`, `[silence]` at natural points
- **Preserves paragraph structure:** All newlines (single and double) are maintained
- Lower temperature (0.3) for consistent, precise tag placement

**DO NOT** use `enhanceScript()` for chat - it will produce robotic responses because `gemini-script` ignores conversational prompts.

**Disambiguation triggers** only for explicit generation requests ("create a meditation", "make me a..."), NOT casual mentions of meditation topics.

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

## Voice Quality Optimization

### Fish Audio Settings (Edge Functions)

Optimized for speed with good quality (long meditations can take 35-76s):

| Setting | Value | Purpose |
|---------|-------|---------|
| `mp3_bitrate` | 128 | Good quality, faster encoding |
| `chunk_length` | 300 | Larger chunks for faster processing |
| `model` header | `speech-1.6` | Enables paralanguage effects |
| `normalize` | true | Consistent volume levels |
| `latency` | `balanced` | Faster generation (vs `normal`) |
| `train_mode` | `fast_high_quality` | Better voice clone fidelity |

**Timeout Configuration:**
- Client-side (`edgeFunctions.ts`): 120s for TTS calls
- Server-side: 120s timeout on edge functions
- Fish Audio can take 35-76s for long meditation scripts

### Fish Audio V1.6 Paralanguage Effects

The `voiceService.ts` converts meditation script tags to Fish Audio effects:

| Script Tag | Fish Audio Effect | Result |
|------------|------------------|--------|
| `[pause]` | `(break)` | Short pause |
| `[long pause]` | `(long-break)` | Extended pause |
| `[deep breath]` | `(breath)` | Breathing sound |
| `[exhale slowly]` | `(sigh)` | Sighing sound |

Additional meditation pacing is applied automatically:
- `(long-break)` after sentences
- `(break)` after commas
- `(breath)` after "breathe in/inhale"
- `(sigh)` after "breathe out/exhale"

### Chatterbox Settings

Optimized for calm meditation delivery:

| Setting | Value | Purpose |
|---------|-------|---------|
| `exaggeration` | 0.35 | Lower = calmer, less emphatic (default 0.5) |
| `cfg_weight` | 0.5-0.6 | Deliberate pacing |

### Voice Recording Settings

`SimpleVoiceClone.tsx` captures raw audio for better cloning:

```typescript
audio: {
  echoCancellation: false,   // Preserve natural voice
  noiseSuppression: false,   // Keep voice qualities
  autoGainControl: false,    // Natural volume dynamics
  sampleRate: 44100,
}
```

### Script Generation Emotional Markers

`gemini-script` and `_shared/contentTemplates.ts` include emotional markers for TTS:
- `(relaxed)`, `(soft tone)`, `(whispering)`, `(empathetic)` - Meditations
- `(confident)`, `(determined)` - Power Affirmations
- `(sleepy)`, `(whispering)` - Sleep Affirmations
- `(hypnotic)`, `(relaxed)` - Self-Hypnosis

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
- `react-vendor` - React/ReactDOM
- `supabase-vendor` - Supabase client
- `framer-motion-vendor` - Animation library (~120KB)
- `sentry-vendor` - Error tracking

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

## Local Edge Function Development

```bash
# Link local project to remote Supabase project
supabase link --project-ref <project-id>

# Serve functions locally (auto-reloads on changes)
supabase functions serve

# Test a specific function
curl -X POST http://localhost:54321/functions/v1/health

# Deploy single function to production
supabase functions deploy gemini-chat

# View function logs
supabase functions logs gemini-chat
```

Edge functions require environment variables set in the Supabase Dashboard (Settings > Edge Functions > Secrets).

## Deployment

**Frontend:** Vercel (auto-deploys on push to main)
```bash
npx vercel --prod              # Manual production deploy
```

**Edge Functions:** Supabase
```bash
supabase functions deploy <name>   # Deploy single function
```

**After deployment:** Users may need to hard refresh (Ctrl+Shift+R) if they see 404 errors on lazy-loaded chunks due to browser caching old bundle hashes.
