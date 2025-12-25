# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

INrVO is a personalized meditation app that generates custom meditations using AI. Users describe how they feel, and the app creates personalized meditation scripts with text-to-speech (TTS) playback via voice cloning.

**Key technologies:** React 19, Vite, TypeScript, Supabase (auth + database + storage + edge functions), Tailwind CSS v4, Framer Motion

**Node requirement:** >=20.0.0

## Commands

```bash
# Development
npm run dev              # Start dev server on port 3000

# Build & Type Check
npm run build            # Production build (outputs to dist/)
npm run preview          # Preview production build
npx tsc --noEmit         # Type check without emitting

# Testing
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:ui          # Run tests with Vitest UI
npm run test:coverage    # Run tests with coverage report
npx vitest run tests/lib/credits.test.ts  # Run single test file

# Supabase
npx supabase start       # Start local Supabase
npx supabase stop        # Stop local Supabase
npx supabase db push     # Push migrations to remote
npx supabase functions serve  # Serve edge functions locally
npx supabase functions deploy <name>  # Deploy single function
```

## Architecture

### Frontend Structure (Vite SPA)

```
App.tsx               # Main app component - manages views, state, generation flow
index.tsx             # Entry point - React providers, Sentry, analytics
types.ts              # Shared TypeScript types (View, VoiceProfile, CloningStatus, etc.)
constants.tsx         # Template categories, voice profiles, audio tags

components/           # UI components
  V0MeditationPlayer/ # Audio player - playback controls, breathing visualizer
  MeditationEditor/   # Script editing with audio tags
  AgentChat.tsx       # AI conversation interface
  SimpleVoiceClone.tsx # Voice cloning UI (records audio, uploads via Fish Audio)
  VoiceManager.tsx    # Manage cloned voices
  Visualizer.tsx      # Audio visualizer canvas

src/
  contexts/           # React contexts
    ModalContext.tsx  # Centralized modal state management
    AudioContext.tsx  # Audio playback state
    VoiceContext.tsx  # Voice selection state
  hooks/
    useVoiceCloning.ts      # Voice cloning workflow (record → process → upload)
    useMeditationAgent.ts   # AI conversation with MeditationAgent
    useVoiceGeneration.ts   # TTS generation workflow
    useAudioPlayback.ts     # Audio player controls
  lib/
    agent/            # MeditationAgent - conversational AI with wisdom teachers
      MeditationAgent.ts     # Main agent class - handles conversation, meditation generation
      knowledgeBase.ts       # Wisdom teachers (Buddha, Rumi, Thich Nhat Hanh, etc.)
    edgeFunctions.ts  # Client for Supabase Edge Functions
    voiceService.ts   # TTS service abstraction
    credits.ts        # Credit system (DISABLED by default - unlimited access)
lib/
  supabase.ts         # Supabase client + database operations
```

### Backend (Supabase Edge Functions)

All API keys are stored server-side in Edge Functions. Frontend only sends JWT tokens.

```
supabase/functions/
  generate-speech/    # TTS endpoint (Fish Audio primary, ElevenLabs legacy)
  fish-audio-clone/   # Voice cloning via Fish Audio
  gemini-script/      # Generate meditation scripts via Gemini 2.0 Flash
  health/             # Health check endpoint
  export-user-data/   # GDPR data export
  _shared/            # Shared utilities (rate limiting, tracing, compression)
```

### Voice Provider Architecture

**Fish Audio is the primary (and only) TTS provider.**
ElevenLabs is retained only for legacy cloned voices.

```
Voice Cloning Flow:
  Record audio → Convert to WAV → fish-audio-clone → Creates Fish Audio model
                                                   → Stores sample in Supabase Storage

TTS Flow (generate-speech endpoint):
  1. Check fish_audio_model_id → Use Fish Audio API (primary)
  2. Check elevenlabs_voice_id → Use ElevenLabs API (legacy only)
  3. No fallback - errors are surfaced to user
```

### Database (Supabase)

Key tables with RLS enabled:
- `voice_profiles` - User voice profiles with `fish_audio_model_id`
- `voice_clones` - Base64 audio samples for cloning
- `meditation_history` - Saved meditations with audio storage paths
- `users` - Extended auth.users with preferences

Migrations are in `supabase/migrations/` (numbered SQL files).

### Key Data Flow

1. **Meditation Generation:**
   User prompt → `AgentChat` → `MeditationAgent.chat()` → Gemini Edge Function → Script → Editor view

2. **TTS Playback:**
   Script + Voice → `generate-speech` Edge Function → Fish Audio → Audio → V0MeditationPlayer

3. **Voice Cloning:**
   Record audio → Convert to WAV → `fish-audio-clone` Edge Function → Voice profile saved

## Environment Variables

Frontend (`.env.local`):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SENTRY_DSN=https://...  # Optional
```

Edge Function secrets (set via `npx supabase secrets set`):
```
GEMINI_API_KEY=AI...
FISH_AUDIO_API_KEY=...       # Primary TTS/cloning provider (required)
ELEVENLABS_API_KEY=xi_...    # Legacy voice support (optional)
```

## Important Patterns

### Modal Management
All modals use centralized `ModalContext`. Two hook options:
```tsx
// For single modal - more efficient, only re-renders when this modal changes
const [isOpen, setOpen] = useModal('clone');

// For multiple modals - backwards compatible, re-renders on any modal change
const { showCloneModal, setShowCloneModal, closeAllModals } = useModals();
```

### Path Alias
`@/` maps to project root. Use for imports: `import { supabase } from '@/lib/supabase'`

### Audio Handling
- WebM recordings are converted to WAV before cloning (required by Fish Audio)
- Audio is stored as base64 in database or in Supabase Storage (`meditation-audio`, `voice-samples` buckets)

### Edge Function Calls
All edge function calls go through `src/lib/edgeFunctions.ts` which handles:
- JWT authentication
- Request ID generation for tracing
- Retry with exponential backoff
- Timeout handling

### Meditation Player (V0MeditationPlayer)
The player is a minimal, immersive playback experience:
- Breathing circle visualizer (4-7-8 pattern)
- Play/pause, seek, skip ±15s controls
- Volume control with mute toggle
- Progress bar with time display
- Floating particle animations
- No script text display - pure audio focus

### MeditationAgent Conversation Flow
The agent (`src/lib/agent/MeditationAgent.ts`) is conversational by default:
- Detects emotional state from user input
- Only generates meditations when explicitly requested (trigger phrases like "I'll craft a", "Let me create")
- Validates responses to prevent unwanted meditation content in chat
- Supports pasted meditation scripts (bypasses AI processing)
- Builds personalized prompts using extracted context (situation, settings, goals, duration)

## Testing

Tests use Vitest + React Testing Library + happy-dom:
- Test files: `*.test.ts` or `*.spec.ts` in `tests/` directory
- Setup file: `tests/setup.ts`
- Mocks: `tests/mocks/`
- Coverage thresholds enforced for `src/lib/credits.ts` (90%)

### Credit System Testing
The credit system is disabled by default (`CREDITS_DISABLED = true`). Tests use the `_testing` helper:
```ts
import { creditService, _testing } from '../../src/lib/credits';

beforeEach(() => _testing.enableCredits());
afterEach(() => _testing.disableCredits());
```

## TypeScript Configuration

`tsconfig.json` excludes directories with different TypeScript targets:
- `supabase/functions/` - Uses Deno runtime (different lib)
- `scripts/` - Node.js scripts with different module settings
- `tests/` - Test files with Vitest globals
