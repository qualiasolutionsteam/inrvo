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
supabase functions deploy <function-name> --no-verify-jwt  # Deploy with anonymous access
supabase db push                            # Push migrations to remote

# IMPORTANT: Most edge functions need --no-verify-jwt flag for anonymous access
# Functions requiring this flag: gemini-chat, gemini-script, generate-speech, health
# Without this flag, Supabase returns 401 before your code runs
```

## Architecture

### Frontend (React 19 + Vite)

**Routing:** Uses React Router v7 with lazy-loaded pages (`src/router.tsx`). All pages are code-split via `React.lazy()`.

**Routes:** `/` (home), `/play/:id?` (player), `/library` (My Audios), `/templates`, `/voice`, `/clone`, `/how-it-works`, `/about`, `/terms`, `/privacy`, `/pricing`, `/admin` (role-protected), `/auth/reset-password` (password reset), `/auth/verified` (email verification callback), `*` (404)

**State Management:**
- React Context for cross-cutting concerns (see `src/contexts/index.ts` for exports):
  - `AuthContext.tsx` - User authentication state
  - `ScriptContext.tsx` - Meditation script state
  - `LibraryContext.tsx` - Meditation history/library state
  - `AudioTagsContext.tsx` - Audio tag state
  - `AudioContext.tsx` - Audio playback state
  - `ModalContext.tsx` - Modal visibility coordination (with sub-contexts in `src/contexts/modals/`)
  - `OnboardingContext.tsx` - Post-signup guided tour state
  - `AppContext.tsx` - App-wide state (voices, preferences, remaining cross-cutting concerns)

**Key Components (two locations):**

Root `components/` - Shared, feature-rich components:
- `V0MeditationPlayer/` - Main player with BreathingOrb visualization
- `SimpleVoiceClone.tsx` - Voice cloning UI
- `AgentChat.tsx` - Conversational AI interface (text + voice toggle)
- `VoiceAgent.tsx` - Real-time voice interface with shooting stars animation (Gemini Live API)
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
- `ai-voice-input.tsx` - Voice recording button with real-time frequency visualizer, timer, auto-stop at 30s. Accepts `audioLevelData` prop for real audio data.
- `volume-meter.tsx` - Audio level indicators with ElevenLabs IVC color zones. Exports: `VolumeMeter` (bar), `VolumeIndicator` (dot), `VolumeBadge` (label)

**Audio Utilities (`src/lib/`):**
- `audioAnalyzer.ts` - Real-time audio level analysis using Web Audio API. Provides RMS/peak detection, frequency bins for visualizers, and ElevenLabs-optimized level zones (optimal: -18 to -23 dB, clipping: >-3 dB peak). Exports: `AudioAnalyzer` class, `useAudioAnalyzer` hook, `getLevelZone` helper.
- `audioConverter.ts` - Converts WebM recordings to high-quality WAV. Normalizes to ElevenLabs specs (-18dB RMS, -3dB peak limit) with soft-knee compression.

**Chat Input Styling:**
The chat input has a subtle cyan/purple glow effect that intensifies when recording. Recording button uses solid cyan (not red).

**Data Layer (two locations):**

Root `/lib/` - Core database layer:
- `lib/supabase.ts` - Supabase client and **all** database operations (~32KB)
- `lib/authStorage.ts` - Session storage adapter and "Remember Me" preference management

`src/lib/` - Feature-specific modules:
- `adminSupabase.ts` - Admin-specific database operations (protected by RLS)
- `edgeFunctions.ts` - Edge function wrappers with retry logic
- `voiceService.ts` - TTS provider routing (ElevenLabs primary, Web Speech API fallback)
- `mediaSessionManager.ts` - Media Session API for lock screen playback controls
- `credits.ts` - Credit system (DISABLED - all users have unlimited access)

### Backend (Supabase Edge Functions)

All API keys are server-side only. Edge functions in `supabase/functions/`:

| Function | Purpose |
|----------|---------|
| `generate-speech` | Unified TTS with provider routing |
| `elevenlabs-tts` | ElevenLabs TTS (primary provider, best quality) |
| `elevenlabs-clone` | Voice cloning via ElevenLabs API |
| `gemini-chat` | **Conversational AI** - respects agent's system prompt for natural dialogue |
| `gemini-script` | Meditation script generation via Gemini API (NOT for chat) |
| `gemini-live-token` | **Real-time voice** - returns Gemini Live API config for frontend WebSocket |
| `delete-user-data` | GDPR-compliant user data deletion |
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

**Agent Philosophy (High-Consciousness Design):**
The agent embodies a loving, calm, grounded presence inspired by:
- **New Thought teachers**: Neville Goddard ("feeling is the secret"), Wallace D. Wattles, James Allen, Ernest Holmes
- **Modern consciousness**: Joe Dispenza, Bruce Lipton, Eckhart Tolle, Ram Dass
- **Core principles**: Gratitude as foundational practice, world vision (peace, unity, generosity)
- **Safety/ethics**: No magical health guarantees, no shaming, respects all beliefs, suggests professional help when needed
- **Golden rule**: Before responding, considers "Would this response make the user feel loved, supported, and empowered?"

**Wisdom Traditions (`knowledgeBase.ts`):**
- `modern_consciousness` - Dispenza, Lipton, Tolle, Singer
- `ancient_wisdom` - Buddha, Rumi, Lao Tzu, Hafiz
- `psychology_healing` - Frankl, Kornfield, Neff
- `mindfulness` - Kabat-Zinn, Thich Nhat Hanh
- `science_consciousness` - Goleman, Davidson
- `new_thought` - Neville Goddard, Wattles, Allen, Holmes, Esther Hicks, Rhonda Byrne

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

**SYSTEM_PROMPT Architecture (Critical for Natural Responses):**
```
useMeditationAgent.ts
    │
    └── geminiService.chat(prompt, { systemPrompt: SYSTEM_PROMPT })
            │
            └── gemini-chat edge function
                    │
                    └── Gemini API with systemInstruction parameter
                        (NOT embedded in content)
```

The `SYSTEM_PROMPT` is exported from `MeditationAgent.ts` and passed via Gemini's native `systemInstruction` parameter. This ensures Gemini FOLLOWS the instructions rather than summarizing them.

**DO NOT** embed SYSTEM_PROMPT in the content - this causes Gemini to respond with "Okay, I understand..." summaries instead of natural conversation.

### Real-Time Voice System

Real-time bidirectional voice conversation using Gemini Multimodal Live API.

**Architecture:**
```
Browser (VoiceAgent.tsx)
├── getUserMedia() → Mic Audio Stream (16kHz PCM16)
├── WebSocket → Gemini Live API (wss://generativelanguage.googleapis.com/...)
│     └── Audio In → Gemini 2.0 Flash → Audio Out (24kHz PCM16)
├── AudioContext → Speaker Playback
└── VoiceSession → Session state management
```

**Files:**
- `components/VoiceAgent.tsx` - Full-screen voice UI with shooting stars animation
- `src/lib/geminiLive.ts` - Gemini Live WebSocket client
- `src/lib/audioCapture.ts` - Mic audio capture at 16kHz PCM16
- `src/lib/audioPlayback.ts` - Audio playback queue with barge-in support
- `src/lib/voiceSession.ts` - Session lifecycle and transcript management
- `supabase/functions/gemini-live-token/index.ts` - Token endpoint for API config

**Visual Design (Minimalist Zen):**
- Dark gradient background (`slate-950` to `slate-900`)
- Shooting stars animation with cyan/white gradient trails
- Minimal voice level bars (5 bars, cyan glow)
- Soft frosted-glass call buttons
- Clean, calm aesthetic with no distracting effects

**Voice Session States:**
- `idle` - Not connected, shooting stars animate slowly
- `requesting-mic` - Awaiting microphone permission
- `connecting` - WebSocket connecting, loader visible
- `connected` - Ready, call button visible
- `listening` - Mic active, voice bars animate
- `agent-speaking` - Stars intensify, voice bars pulse
- `error` / `disconnected` - Session ended

**Access:** Phone icon button in AgentChat input area opens VoiceAgent modal.

**Features:**
- Barge-in (interrupt agent by speaking)
- Mute toggle with visual feedback
- Volume control
- Real-time transcripts
- Auto-reconnection (3 attempts)
- User-friendly error messages for mic/security issues

**Voice Names (meditation-optimized):**
- Aoede (default) - Calm female
- Charon - Deep male
- Fenrir - Warm male
- Kore - Soft female

### Lock Screen Playback (Media Session API)

Background audio controls for lock screen, Control Center, and external devices (headphones, car stereo).

**Files:**
- `src/lib/mediaSessionManager.ts` - `MediaSessionManager` class and `useMediaSession` hook
- `src/global.d.ts` - TypeScript type declarations for Media Session API
- `src/pages/PlayerPage.tsx` - Hook integration

**Architecture:**
```
PlayerPage
    │
    └── useMediaSession({
            metadata,        ← Title, artist, artwork
            isPlaying,       ← Playback state sync
            currentTime,     ← Position bar sync
            onPlay/onPause,  ← Control handlers
            onSeek/onSkip    ← Seek handlers
        })
            │
            └── MediaSessionManager
                    ├── navigator.mediaSession.metadata
                    ├── navigator.mediaSession.playbackState
                    ├── navigator.mediaSession.setPositionState()
                    └── Action handlers (play, pause, seekforward, seekbackward, seekto)
```

**Features:**
- Lock screen play/pause, skip ±15s, seek scrubber
- Metadata display (title: "INrVO Meditation", artist: voice name, artwork: app icon)
- Position bar synchronization (throttled to 1s updates)
- Headphone/Bluetooth controls support
- Progressive enhancement (graceful no-op if unsupported)

**iOS Workaround:**
iOS requires an `<audio>` element for Media Session to work with AudioContext:
```typescript
// In PlayerPage.tsx - on play
startIOSMediaSession();  // Creates silent audio element

// On close
stopIOSMediaSession();   // Removes silent audio element
```

**Usage in PlayerPage.tsx:**
```typescript
import { useMediaSession, startIOSMediaSession, stopIOSMediaSession } from '../lib/mediaSessionManager';

const meditationMetadata = useMemo(() => ({
  title: 'Meditation',
  category: 'meditation',
  voiceName: selectedVoice?.name,
  duration,
}), [duration, selectedVoice?.name]);

useMediaSession({
  metadata: meditationMetadata,
  isPlaying, currentTime, duration, playbackRate,
  skipSeconds: 15,
  onPlay: handleMediaSessionPlay,
  onPause: handleMediaSessionPause,
  onSeek: handleMediaSessionSeek,
  onSkip: handleMediaSessionSkip,
});
```

**Platform Support:**
| Platform | Controls Location |
|----------|-------------------|
| iOS | Lock screen, Control Center |
| Android | Notification shade, lock screen |
| Desktop | Media keys, browser tab indicator |

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

### Onboarding System

Post-signup guided tour with spotlight overlays and tooltips. Triggers automatically 1.5s after new user signup.

**Files:**
- `src/contexts/OnboardingContext.tsx` - State management and auth listener
- `src/components/Onboarding/OnboardingOverlay.tsx` - Spotlight overlay with cutout
- `src/components/Onboarding/OnboardingTooltip.tsx` - Positioned tooltip
- `src/components/Onboarding/OnboardingProgress.tsx` - Step indicator dots
- `src/components/Onboarding/steps.ts` - Step definitions
- `src/lib/onboardingStorage.ts` - localStorage persistence

**8 Steps:**
1. Welcome modal (centered)
2. Agent Chat - main conversation interface
3. Voice Toggle - speak to the agent
4. Clone Voice button - key feature highlight
5. Voice Collection - voice list
6. Templates - quick start options
7. Library - saved meditations
8. Complete modal (centered)

**Targeting:** Steps use `data-onboarding="step-id"` attributes for element targeting with fallback selectors.

**Storage:** Per-user localStorage (`inrvo_onboarding_{userId}`) tracks completion state.

### Audit Logging

Admin action tracking for security compliance. Immutable logs stored in `audit_log` table.

**Files:**
- `supabase/migrations/20251231030000_audit_log.sql` - Table, RLS, and functions
- `src/lib/adminSupabase.ts` - Client-side logging calls

**Logged Operations:** `INSERT`, `UPDATE`, `DELETE`, `ADMIN_DELETE`, `ADMIN_VIEW`, `DATA_EXPORT`

**Functions:**
```sql
-- Log an admin action
SELECT log_admin_action('users', user_id, 'ADMIN_DELETE', target_user_id, old_data, NULL);

-- Get recent admin activity
SELECT * FROM get_recent_admin_activity(50, 0);
```

**RLS:** Only admins can SELECT audit logs. No UPDATE/DELETE allowed (immutable).

**Retention:** 2-year retention recommended (GDPR compliance). Cleanup via pg_cron.

### Database Schema

Key tables (see `supabase/migrations/` for full schema):
- `voice_profiles` - User voice clones with ElevenLabs voice IDs
- `voice_clones` - Legacy voice sample storage
- `meditation_history` - Saved meditations with audio URLs
- `users` - Extended user profile with audio preferences, `role` field (`USER`/`ADMIN`)
- `audio_tag_presets` - Configurable audio tags for meditation scripts
- `audit_log` - Admin action tracking (immutable)
- `tts_response_cache` - Cached TTS responses (24hr TTL)

Audio files stored in Supabase Storage buckets: `voice-samples`, `meditation-audio`

## Voice Providers

Two-tier TTS provider system:
1. **ElevenLabs** (primary) - Industry-leading voice quality and cloning, uses `elevenLabsVoiceId` from voice profile
2. **Web Speech API** (fallback) - Free browser-based fallback for offline/free tier

Provider selection happens in `voiceService.detectProvider()` based on voice profile fields.

**ElevenLabs Settings (optimized for meditation):**
| Setting | Value | Purpose |
|---------|-------|---------|
| `model` | `eleven_multilingual_v2` | Best quality model |
| `stability` | 0.6 | Calm, consistent delivery |
| `similarity_boost` | 0.75 | Good voice matching |
| `style` | 0.3 | Subtle expression |

**Voice Migration:** Legacy Fish Audio/Chatterbox voices need re-cloning. The `needsReclone()` function in `voiceService.ts` detects this and prompts users to re-record.

## Voice Quality Optimization

### Audio Tag Processing

The `voiceService.ts` converts meditation script tags to natural pauses for ElevenLabs:

| Script Tag | Conversion | Result |
|------------|-----------|--------|
| `[pause]` | `...` | Short pause |
| `[long pause]` | `......` | Extended pause |
| `[deep breath]` | `... take a deep breath ...` | Breathing cue |
| `[exhale slowly]` | `... and exhale slowly ...` | Exhale cue |
| `[silence]` | `........` | Long silence |

ElevenLabs handles natural pauses through punctuation - no special API effects needed.

**Timeout Configuration:**
- Client-side (`edgeFunctions.ts`): 120s for TTS calls
- Server-side: 120s timeout on edge functions

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

### Audio Normalization (ElevenLabs IVC Specs)

`audioConverter.ts` normalizes recordings to ElevenLabs Instant Voice Cloning optimal levels:

| Parameter | Target | Purpose |
|-----------|--------|---------|
| RMS Level | -18 dB | Center of optimal range (-23 to -18 dB) |
| Peak Limit | -3 dB | Prevents clipping artifacts |
| Compression | Soft-knee | Natural sound vs hard clipping |

**Level Zones (shown in UI via `VolumeBadge`):**
- 🟢 **Optimal** (-18 to -23 dB RMS): Perfect for cloning
- 🔵 **Good** (-23 to -30 dB RMS): Acceptable
- 🟠 **Quiet** (< -30 dB RMS): Too quiet
- 🔴 **Clipping** (> -3 dB peak): Too loud

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
- `ELEVENLABS_API_KEY` - Primary TTS/cloning
- `GEMINI_API_KEY` - Script generation and chat

## Bundle Optimization

**Path Alias:** `@/` maps to repository root (not `src/`), configured in `tsconfig.json` and `vite.config.ts`. Use `@/src/...` for src files, `@/lib/...` for root lib, `@/components/...` for root components.

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
- ElevenLabs (`api.elevenlabs.io`)
- Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`)

**Important:** Always use dynamic imports for `edgeFunctions.ts` to maintain code splitting:
```typescript
// ✅ Good - dynamic import
const { callElevenLabsClone } = await import('./src/lib/edgeFunctions');

// ❌ Bad - static import pulls into main bundle
import { callElevenLabsClone } from './src/lib/edgeFunctions';
```

## Testing

- Test environment: happy-dom (configured in `vitest.config.ts`)
- Test setup: `tests/setup.ts` includes mocks for AudioContext, MediaRecorder, and fetch
- Coverage thresholds: `src/lib/credits.ts` has strict 90% coverage requirement
- Tests located in `tests/lib/`, `tests/hooks/`, and `tests/contexts/`

**Note:** `tsconfig.json` excludes `tests/` directory - tests use Vitest's own TypeScript handling.

## Code Quality Patterns

### TypeScript Strict Mode

The project uses TypeScript with **strict mode enabled** (`tsconfig.json`). Key patterns:

```typescript
// Null checks required - use guards or non-null assertions
if (!supabase) throw new Error('Supabase not initialized');
const data = supabase!.from('table');  // After guard check

// AudioBuffer null handling
const { audioBuffer } = await generateSpeech(...);
if (!audioBuffer) throw new Error('Failed to generate audio');

// Discriminated unions - access properties after narrowing
if (cloningStatus.state === 'success') {
  console.log(cloningStatus.voiceName);  // Now TypeScript knows voiceName exists
}

// Framer Motion ease arrays need 'as const'
ease: [0.32, 0.72, 0, 1] as const
```

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
if (DEBUG) console.log('[moduleName] Debug info:', data);
```

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

**Authentication (`components/AuthModal.tsx`, `src/pages/ResetPasswordPage.tsx`, `src/pages/EmailVerifiedPage.tsx`):**
- Password minimum: 8 characters (enforced client-side and displayed in UI)
- Password strength indicator: Weak/Fair/Good/Strong based on length, case mix, digits, special chars
- Email validation: Regex pattern before form submission
- Email verification required for new signups
- Custom SMTP via Resend (`info@inrvo.com`) for better deliverability

**Signup Flow:**
```
AuthModal (signup mode) → signUp() → Show "Check your email" confirmation
                                                    ↓
User clicks verification link → /auth/verified → Session established → Welcome page
                                                    ↓
                                        Auto-redirect to home (5s)
```

**Password Reset Flow:**
```
AuthModal (forgot mode) → resetPasswordForEmail() → Email sent
                                                        ↓
User clicks email link → /auth/reset-password → updatePassword() → Success
                                                        ↓
                                            Auto-redirect to home (3s)
```

**Auth Pages:**
- `src/pages/EmailVerifiedPage.tsx` - Email verification callback with personalized welcome
- `src/pages/ResetPasswordPage.tsx` - Password reset form with strength indicator

**Supabase Auth Functions (`lib/supabase.ts`):**
- `signIn(email, password, rememberMe = true)` - Email/password authentication with session persistence option
- `signUp(email, password, firstName, lastName)` - New user registration with email verification
- `signOut()` - Clear session from both storage types
- `resetPasswordForEmail(email)` - Send password reset email (redirects to `/auth/reset-password`)
- `updatePassword(newPassword)` - Update password for authenticated user
- `getSupabaseClient()` - Returns appropriate client based on "Remember Me" preference

### Remember Me Authentication

Persistent session management using dual Supabase client strategy.

**Problem:** Supabase JS SDK only allows `persistSession` config at client initialization, not at sign-in time.

**Solution:** Two Supabase clients with different storage backends:

```
User checks "Remember Me" → signIn(email, password, rememberMe)
                                      ↓
              rememberMe=true         │         rememberMe=false
                    ↓                 │               ↓
        persistentClient              │         sessionClient
        (localStorage)                │         (sessionStorage)
        Session survives              │         Session expires on
        browser restart               │         browser close
```

**Files:**
- `lib/authStorage.ts` - sessionStorage adapter implementing Supabase's `SupportedStorage` interface
- `lib/supabase.ts` - Dual client factory (`getPersistentClient()`, `getSessionClient()`)
- `components/AuthModal.tsx` - Remember Me checkbox UI
- `src/contexts/AuthContext.tsx` - Uses `getSupabaseClient()` for dynamic client selection

**Key Functions (`lib/authStorage.ts`):**
```typescript
export const sessionStorageAdapter = { getItem, setItem, removeItem };
export const REMEMBER_ME_KEY = 'inrvo_remember_me';
export function getRememberMePreference(): boolean;  // Default: true
export function setRememberMePreference(rememberMe: boolean): void;
export function clearAuthStorage(): void;  // Clears both localStorage and sessionStorage
```

**UI (AuthModal.tsx):**
- Checkbox appears only in sign-in mode (not signup or forgot password)
- Default: checked (maintains backward compatibility)
- Styled with cyan accent when checked

**Behavior:**
| Remember Me | Storage | Session Lifetime |
|-------------|---------|------------------|
| Checked (default) | localStorage | Survives browser restart |
| Unchecked | sessionStorage | Cleared on browser close |

**Supabase Dashboard Configuration:**
- **URL Configuration** → Redirect URLs must include:
  - `https://inrvo.com/auth/verified` (email verification)
  - `https://inrvo.com/auth/reset-password` (password reset)
- **SMTP Settings** (Auth → SMTP Settings):
  - Host: `smtp.resend.com`, Port: 465
  - Sender: `info@inrvo.com`
  - Domain must be verified in Resend dashboard

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

**Note:** Edge functions use Deno runtime (excluded from `tsconfig.json`). They have their own import system using URL imports.

**IMPORTANT: JWT Verification**
Most edge functions must be deployed with `--no-verify-jwt` to allow anonymous access:
```bash
supabase functions deploy gemini-chat --no-verify-jwt
supabase functions deploy generate-speech --no-verify-jwt
```
Without this flag, Supabase returns 401 "Missing authorization header" before your function code runs.

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

## Performance Optimizations

See `docs/` for detailed optimization reports:
- `OPTIMIZATION_ROADMAP.md` - Full optimization plan and status
- `DATABASE_OPTIMIZATION_REPORT.md` - Database performance improvements
- `FRONTEND_PERFORMANCE_OPTIMIZATION.md` - Client-side optimizations
- `PERFORMANCE_OPTIMIZATION_REPORT.md` - Comprehensive audit results

**Key optimizations applied:**
- AI script quality: Few-shot prompting, temperature tuning (0.5), topP/topK sampling in `gemini-script/index.ts`
- Client caching: `historyCache.ts` (5min), `voiceProfileCache.ts` (15min), server-side LRU cache (1hr)
- Database: Atomic `save_meditation_with_audio()` RPC, TTS response cache (24hr TTL), consolidated RLS policies
- Frontend: Route prefetching, parallel background music loading, mobile particle reduction (60%)

## Credit System (DISABLED)

The credit/subscription system is currently **disabled** for all users:

**Client-side (`src/lib/credits.ts`):**
- `CREDITS_DISABLED = true` - All functions return unlimited credits
- `canClone()` always returns `{ can: true }`
- `deductCredits()` always returns `true` without deducting

**Database defaults:**
- All users: PRO tier, 10,000,000 credits, 1,000 clone limit
- New signups: Automatically get PRO tier via `handle_new_user()` trigger
- No subscription enforcement

**To re-enable credits:**
1. Set `CREDITS_DISABLED = false` in `src/lib/credits.ts`
2. Update `handle_new_user()` function to use FREE tier
3. Reset user credits in database

## Production Monitoring

See `docs/MONITORING.md` for setup instructions. Key monitoring layers:

| Layer | Tool | Purpose |
|-------|------|---------|
| Uptime | BetterStack/Pingdom | Health endpoint monitoring |
| Errors | Sentry | Exception tracking, session replay |
| Performance | Vercel Analytics | Web Vitals, page speed |
| Backend | Supabase Dashboard | DB queries, Edge Functions |

**Health Endpoint:** `GET /functions/v1/health` returns service status, API key configs, and database latency.

**Sentry Alerts:** Configure for error spikes (>10 in 10min), new issues, and poor Web Vitals.

**Event Tracking (`src/lib/tracking.ts`):** Sentry breadcrumbs for debugging context:
- `trackVoice`: clone started/completed/failed, deleted, selected
- `trackMeditation`: script generated/extended, audio generated, saved
- `trackAudio`: playback started/stopped/completed
- `trackAuth`: sign in/up, failures, sign out

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 "Missing authorization header" on edge functions | JWT verification enabled | Deploy with `--no-verify-jwt` flag |
| 404 on lazy-loaded chunks after deploy | Browser cached old bundle hashes | Hard refresh (Ctrl+Shift+R) |
| Edge function timeout | Long TTS generation (>120s) | Check `edgeFunctions.ts` timeout config |
| Voice cloning fails silently | Legacy Fish Audio/Chatterbox voice | Re-clone with ElevenLabs (check `needsReclone()`) |
| Chat responses robotic | Using `gemini-script` instead of `gemini-chat` | Ensure `geminiService.chat()` for conversation |
| Agent says "Okay, I understand..." | SYSTEM_PROMPT embedded in content | Pass via `systemInstruction` parameter, not content |
| Audio not playing | AudioContext suspended | User interaction required before `audioContext.resume()` |
| Lock screen controls not showing (iOS) | Missing silent audio element | Ensure `startIOSMediaSession()` called on play |
| Session persists after "Remember Me" unchecked | Old localStorage data | Call `clearAuthStorage()` on sign out |
| TypeScript errors in edge functions | Using `npx tsc` instead of Deno | Edge functions use Deno - run `supabase functions serve` to check |
| Tests fail with import errors | Test file outside `tests/` | Tests must be in `tests/` directory (excluded from tsconfig) |

## Stack Research

See `docs/STACK_RESEARCH_2025.md` for current best practices research on:
- React 19 hooks (`useActionState`, `useOptimistic`, `useFormStatus`)
- Supabase Edge Functions optimization
- Tailwind CSS v4 migration
- Vite 6 build optimization
- React Router v7 patterns
- Framer Motion performance
