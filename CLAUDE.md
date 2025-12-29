# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

INrVO is a personalized meditation app built with React 19, Vite, and Supabase. Users describe how they feel, an AI agent generates a meditation script via Gemini, and text-to-speech creates audio using cloned or preset voices. The app features real-time audio playback with synchronized text highlighting.

**Requirements:** Node.js >= 20.0.0

## Commands

```bash
# Development
npm run dev              # Start dev server on port 3000
npm run build            # Production build
npm run preview          # Preview production build
npx tsc --noEmit         # Type-check without emitting
ANALYZE=true npm run build  # Bundle analyzer (opens dist/stats.html)

# Testing
npm test                 # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:coverage    # Run with coverage report
npm run test:ui          # Run tests with Vitest UI
vitest run tests/lib/credits.test.ts  # Run single test file

# Supabase Edge Functions (requires supabase CLI)
supabase functions serve                    # Run all functions locally
supabase functions deploy <function-name>   # Deploy a single function
supabase db push                            # Push migrations to remote
```

## Architecture

### Frontend (React 19 + Vite)

**Routing:** Uses React Router v7 with lazy-loaded pages (`src/router.tsx`). All pages are code-split via `React.lazy()`.

**Routes:** `/` (home), `/play/:id?` (player), `/library` (My Audios), `/templates`, `/voice`, `/clone`, `/how-it-works`, `/about`, `/terms`, `/privacy`, `/pricing`, `/admin` (role-protected), `*` (404)

**State Management:**
- React Context for cross-cutting concerns (see `src/contexts/index.ts` for exports):
  - `AuthContext.tsx` - User authentication state
  - `ScriptContext.tsx` - Meditation script state
  - `LibraryContext.tsx` - Meditation history/library state
  - `AudioTagsContext.tsx` - Audio tag state
  - `AudioContext.tsx` - Audio playback state
  - `ModalContext.tsx` - Modal visibility coordination (with sub-contexts in `src/contexts/modals/`)
  - `AppContext.tsx` - App-wide state (voices, preferences, remaining cross-cutting concerns)

**Key Components (two locations):**

Root `components/` - Shared, feature-rich components:
- `V0MeditationPlayer/` - Main player with BreathingOrb visualization
- `SimpleVoiceClone.tsx` - Voice cloning UI
- `AgentChat.tsx` - Conversational AI interface
- `ui/chronos-engine.tsx` - Animated gear engine for agent avatar and loading states

`src/components/` - Page-specific components:
- `MeditationEditor/` - Script editing with audio tag insertion
- `AudioTagsModal.tsx`, `MusicSelectorModal.tsx`, `NatureSoundSelectorModal.tsx` - Editor modals

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
The chat input has a subtle cyan/purple glow effect that intensifies when recording. Recording button uses solid cyan (not red).

**Data Layer:**
- `lib/supabase.ts` - Supabase client and all database operations
- `src/lib/adminSupabase.ts` - Admin-specific database operations (protected by RLS)
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
Script extend:      geminiService.extendScript() → gemini-script edge function (operation: 'extend')
```

**Note:** `geminiService` is located at project root (`/geminiService.ts`), not in `src/lib/`.

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

### Admin System

Protected admin panel at `/admin` for content moderation and analytics. Hidden route (no UI navigation links).

**Files:**
- `src/pages/AdminPage.tsx` - Tab-based admin UI (~590 lines)
- `src/lib/adminSupabase.ts` - Admin database functions (~290 lines)
- `supabase/migrations/20251229034644_admin_access.sql` - RLS policies and analytics function

**Access Control:**
```typescript
// Check admin status on mount
const isAdmin = await checkIsAdmin();
if (!isAdmin) navigate('/');
```

**Admin Functions (`src/lib/adminSupabase.ts`):**

| Function | Purpose |
|----------|---------|
| `checkIsAdmin()` | Verify current user has ADMIN role |
| `getAllUsers()` | List all users (protected by RLS) |
| `deleteUserAdmin(userId)` | Delete user and cascade data |
| `getAllMeditations(limit)` | List all meditations with user email |
| `deleteMeditationAdmin(id)` | Delete any meditation |
| `getAllVoiceProfiles(limit)` | List all voice profiles with user email |
| `deleteVoiceProfileAdmin(id)` | Soft delete (set status = ARCHIVED) |
| `getAdminAnalytics()` | Get aggregated counts via RPC |
| `getAllAudioTags()` | List all audio tag presets |
| `createAudioTag(tag)` | Create new audio tag preset |
| `updateAudioTag(id, updates)` | Update tag label/category/order |
| `deleteAudioTag(id)` | Soft delete (set is_active = false) |

**RLS Policies (Migration 20251229034644):**

All admin policies use this pattern:
```sql
CREATE POLICY "Admins can view all X"
  ON table_name FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'ADMIN'
    )
  );
```

Tables with admin policies: `users`, `meditation_history`, `voice_profiles`, `audio_tag_presets`

**Analytics Function:**
```sql
-- SECURITY DEFINER ensures admin check runs with elevated privileges
CREATE OR REPLACE FUNCTION get_admin_analytics()
RETURNS TABLE (total_users, total_meditations, ...)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
```

**Setting Admin Role:**
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

**UI Structure (4 tabs):**
1. **Analytics** - Total counts, 7-day trends
2. **Users** - User list with delete action (non-admins only)
3. **Content** - Meditations and voice profiles with delete actions
4. **Audio Tags** - CRUD for audio tag presets with category grouping

### Database Schema

Key tables (see `supabase/migrations/` for full schema):
- `voice_profiles` - User voice clones with Fish Audio model IDs
- `voice_clones` - Legacy voice sample storage
- `meditation_history` - Saved meditations with audio URLs
- `users` - Extended user profile with audio preferences, `role` field (`USER`/`ADMIN`)
- `audio_tag_presets` - Configurable audio tags for meditation scripts

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

## Bundle Optimization

**Path Alias:** `@/` maps to project root (configured in `tsconfig.json` and `vite.config.ts`).

Vite config includes manual chunks for:
- `react-vendor` - React/ReactDOM
- `router-vendor` - React Router
- `supabase-vendor` - Supabase client
- `framer-motion-vendor` - Animation library (~74KB gzipped)
- `sentry-vendor` - Error tracking
- `icons-vendor` - Lucide icons
- `toast-vendor` - Sonner notifications

**Code Splitting Strategy:**
- All page components lazy-loaded via `React.lazy()` in `src/router.tsx`
- Heavy components (AuthModal, VoiceManager, SimpleVoiceClone, MeditationEditor, MeditationPlayer, AgentChat) lazy-loaded in App.tsx
- Edge function imports are dynamic to defer voice cloning/AI code until needed
- Initial bundle ~321KB gzipped, with ~400KB deferred via lazy loading

### Animation Optimization (LazyMotion)

App uses Framer Motion with `LazyMotion` and `domAnimation` feature set for smaller runtime:

```typescript
// App.tsx - Wraps entire app
import { LazyMotion, domAnimation } from 'framer-motion';
<LazyMotion features={domAnimation} strict>

// Animation files use `m` instead of `motion`
import { m, AnimatePresence } from 'framer-motion';
<m.div animate={{ opacity: 1 }} />
```

**Files using `m` components:**
- `components/V0MeditationPlayer/index.tsx` - Breathing orb, particles, controls
- `components/ui/AudioPreview.tsx` - Play/pause animations, waveform
- `src/pages/LibraryPage.tsx` - Card expansion animations
- `src/components/MeditationEditor/components/ControlPanel.tsx` - Tab transitions

**CSS Containment** (`index.css`):
```css
.animate-shimmer, .animate-gradient, [class*="animate-"] {
  contain: layout paint;
}
```

### Resource Preloading

`index.html` includes preconnect hints for external APIs:
- Supabase (`jcvfnkuppbvkbzltkioa.supabase.co`)
- Gemini API (`generativelanguage.googleapis.com`)
- Fish Audio (`api.fish.audio`)
- Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`)

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

**Test Files (355 tests total):**

| File | Tests | Coverage |
|------|-------|----------|
| `tests/lib/credits.test.ts` | 42 | Credit calculations, deductions, atomic RPC |
| `tests/lib/voiceService.test.ts` | 27 | Provider detection, paralanguage conversion, cost estimation |
| `tests/lib/edgeFunctions.test.ts` | 27 | Retry logic, timeout handling, error scenarios |
| `tests/lib/agent/MeditationAgent.test.ts` | 52 | Content detection, disambiguation, context extraction |
| `tests/hooks/useAudioPlayback.test.ts` | 37 | Audio playback, background music, volume control, callbacks |
| `tests/hooks/useMeditationAgent.test.ts` | 18 | Message sending, meditation generation, synthesis, actions |
| `tests/hooks/useVoiceCloning.test.ts` | 29 | Credit checks, Fish Audio/Chatterbox fallback, recording |
| `tests/hooks/useVoiceGeneration.test.ts` | 27 | Script generation, extension, audio synthesis, tags |
| `tests/contexts/AppContext.test.tsx` | 42 | All state categories, setters, auth, voices, history |
| `tests/contexts/ModalContext.test.tsx` | 54 | All 15 modal types, open/close/toggle, convenience setters |

## Code Quality Patterns

### Error Handling

All error handlers use `unknown` type with type guards (not `any`):

```typescript
// ✅ Correct pattern
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error('Operation failed:', errorMessage);
}

// ❌ Avoid
} catch (error: any) {
  console.error(error.message);  // Unsafe
}
```

**Edge function errors** use the `EdgeFunctionError` interface (`src/lib/edgeFunctions.ts`):
```typescript
interface EdgeFunctionError extends Error {
  requestId?: string;   // For distributed tracing
  status?: number;      // HTTP status code
  isNetworkError?: boolean;
}
```

### Debug Logging

All debug logs are wrapped with a DEV flag to avoid console noise in production:

```typescript
const DEBUG = import.meta.env?.DEV ?? false;

// Usage
if (DEBUG) console.log('[moduleName] Debug info:', data);
```

Files using this pattern:
- `src/lib/voiceService.ts`
- `src/lib/edgeFunctions.ts`
- `src/lib/audioConverter.ts`
- `src/lib/agent/MeditationAgent.ts`
- `src/hooks/useMeditationAgent.ts`

### Error Boundaries

Lazy-loaded components are wrapped with `ErrorBoundary` to handle chunk load failures:

```typescript
// In AgentChat.tsx and App.tsx
<ErrorBoundary>
  <Suspense fallback={<LoadingSpinner />}>
    <LazyComponent />
  </Suspense>
</ErrorBoundary>
```

The `ErrorBoundary` component (`src/components/ErrorBoundary.tsx`) catches render errors and displays a user-friendly fallback.

### Retry Logic (Edge Functions)

`src/lib/edgeFunctions.ts` implements automatic retry with exponential backoff:

| Error Type | Retryable? | Behavior |
|------------|------------|----------|
| 5xx Server Error | ✅ Yes | Retry with backoff |
| 429 Rate Limit | ✅ Yes | Retry with backoff |
| Network Error | ✅ Yes | Retry if online |
| Timeout | ✅ Yes | Retry with backoff |
| 4xx Client Error | ❌ No | Fail immediately |
| 401/403 Auth Error | ❌ No | Fail immediately |

Default config: 3 retries, 500ms base delay, 5s max delay, with jitter.

### Security Policies

**Authentication (`components/AuthModal.tsx`):**
- Password minimum: 8 characters (enforced client-side and displayed in UI)
- Password strength indicator: Weak/Fair/Good/Strong based on length, case mix, digits, special chars
- Email validation: Regex pattern before form submission

**Storage RLS (`supabase/migrations/021_storage_bucket_rls.sql`):**
- `meditation-audio` and `voice-samples` buckets have row-level security
- Users can only access files in their own folder (`{user_id}/{filename}`)
- Policies enforce SELECT, INSERT, UPDATE, DELETE permissions per-user

## Architecture Decisions

### Context Structure (Partially Decomposed)

The app uses a hybrid context approach:
- **Domain-specific contexts** (`AuthContext`, `ScriptContext`, `LibraryContext`, `AudioTagsContext`) handle focused state
- **AppContext** (~363 lines) remains a "god context" for cross-cutting concerns: voices, preferences, and app-wide state

**Rationale for keeping AppContext large:**
- No observable performance issues
- Meditation app doesn't have high-frequency state updates
- Works fine in production

**Future decomposition triggers:**
- UI lag during playback
- File grows past 500 lines
- Multiple devs causing merge conflicts

### Type Exports

`AgentAction` type is defined once in `MeditationAgent.ts` and re-exported from `useMeditationAgent.ts`:

```typescript
// src/hooks/useMeditationAgent.ts
import { type AgentAction } from '../lib/agent/MeditationAgent';
export type { AgentAction };
```

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

## Stack Research

See `docs/STACK_RESEARCH_2025.md` for current best practices research on:
- React 19 hooks (`useActionState`, `useOptimistic`, `useFormStatus`)
- Supabase Edge Functions optimization
- Tailwind CSS v4 migration
- Vite 6 build optimization
- React Router v7 patterns
- Framer Motion performance
