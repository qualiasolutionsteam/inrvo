# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**INrVO** is an AI-powered personalized meditation app with voice cloning. Users describe their mood/intention, the app generates a custom meditation script using Gemini AI, and reads it aloud using ElevenLabs TTS with optional voice cloning.

**Live**: https://inrvo.vercel.app

## Tech Stack

- **Frontend**: React 19, TypeScript 5.8, Vite 6.2, Tailwind CSS 4.1
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **AI**: Google Gemini (script generation), ElevenLabs (TTS + voice cloning)
- **Monitoring**: Sentry (errors), Web Vitals (performance)
- **Deployment**: Vercel

## Commands

```bash
npm run dev          # Start dev server on port 3000
npm run build        # Production build to dist/
npm run preview      # Preview production build
npm test             # Run tests in watch mode
npm run test:run     # Single test run with coverage
npm run test:ui      # Vitest UI
```

## Project Structure

```
├── App.tsx                    # Main app - all views, state, modals
├── index.tsx                  # React root with Sentry init
├── types.ts                   # Global TypeScript types
├── constants.tsx              # Templates, voices, backgrounds, icons
│
├── components/
│   ├── AgentChat.tsx          # Meditation agent conversation UI
│   ├── SimpleVoiceClone.tsx   # Voice cloning workflow
│   ├── VoiceManager.tsx       # Voice profile management
│   ├── InlinePlayer.tsx       # Audio player with text sync
│   ├── ScriptEditor.tsx       # Script editor with audio tags
│   ├── Visualizer.tsx         # D3 audio waveform (lazy-loaded)
│   └── AuthModal.tsx          # Auth modal (lazy-loaded)
│
├── src/
│   ├── contexts/
│   │   └── ModalContext.tsx   # Centralized modal state
│   │
│   ├── hooks/
│   │   ├── useMeditationAgent.ts   # Agent conversation logic
│   │   ├── useAudioPlayback.ts     # Audio playback + sync
│   │   ├── useVoiceCloning.ts      # Voice cloning workflow
│   │   └── useVoiceGeneration.ts   # TTS generation
│   │
│   └── lib/
│       ├── agent/
│       │   ├── MeditationAgent.ts   # AI agent with wisdom KB
│       │   ├── knowledgeBase.ts     # Teachers, meditation types
│       │   └── conversationStore.ts # Conversation persistence
│       │
│       ├── credits.ts         # Credit system with caching
│       ├── voiceService.ts    # Voice generation routing
│       ├── elevenlabs.ts      # ElevenLabs API client
│       ├── edgeFunctions.ts   # Edge function callers
│       └── textSync.ts        # Text-to-audio synchronization
│
├── lib/
│   └── supabase.ts            # Supabase client + DB helpers
│
├── supabase/
│   ├── migrations/            # 8 migration files
│   └── functions/             # Edge functions (Deno)
│       ├── generate-speech/   # TTS via ElevenLabs
│       ├── gemini-script/     # Script generation
│       ├── process-voice/     # Voice cloning
│       ├── elevenlabs-voice-ops/  # Voice delete/status
│       └── health/            # Health check
│
└── tests/
    ├── setup.ts               # Test mocks (AudioContext, fetch)
    └── lib/credits.test.ts    # Credit system tests
```

## Architecture

### State Management
- **ModalContext**: Centralized modal open/close state
- **Custom hooks**: Feature-specific logic (useAudioPlayback, useMeditationAgent, etc.)
- **Credit cache**: 5-minute TTL client-side cache to reduce API calls

### Component Loading
Lazy-loaded for bundle optimization (~400KB saved):
- Visualizer, AuthModal, VoiceManager, SimpleVoiceClone

### API Flow
1. Client calls edge functions (never direct API keys)
2. Edge functions validate JWT from Supabase Auth
3. Edge functions use service role key for DB + external APIs
4. All user data filtered by RLS policies

### Credit System
```typescript
COST_CONFIG = {
  VOICE_CLONE: 5000,      // Per clone
  TTS_1K_CHARS: 280,      // Per 1K characters
  FREE_MONTHLY: 100000,   // Free tier
  FREE_CLONES: 20         // Monthly limit
}
```

Uses atomic RPC functions for performance:
- `check_user_credits_status()` - Single call for all credit info
- `perform_credit_operation()` - Atomic deduct + track + update

## Database Schema (Key Tables)

- **voice_profiles**: User voice clones with ElevenLabs IDs
- **voice_sessions**: Meditation history (scripts, audio)
- **user_credits**: Credit balance tracking
- **voice_cloning_usage**: Usage audit log
- **agent_conversations**: Meditation agent chat history

All tables have RLS policies enforcing user isolation.

## Edge Functions

All require JWT auth, use CORS whitelist, run on Deno:

| Function | Purpose |
|----------|---------|
| `generate-speech` | TTS via ElevenLabs (280 credits/1K chars) |
| `gemini-script` | Script generation via Gemini |
| `process-voice` | Voice cloning (5000 credits) |
| `elevenlabs-voice-ops` | Delete/status operations |
| `health` | Health check endpoint |

## Environment Variables

```bash
# Required (client)
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Optional (client)
VITE_SENTRY_DSN=https://...

# Edge function secrets (Supabase Dashboard)
ELEVENLABS_API_KEY=sk_...
GEMINI_API_KEY=AI...
```

## Testing

```bash
npm test              # Watch mode
npm run test:coverage # Coverage report
```

- Uses Vitest + happy-dom + Testing Library
- Mocks: AudioContext, MediaRecorder, fetch, Supabase
- Coverage threshold: 90% for credits.ts

## Key Patterns

### Audio Tags
Scripts can include tags that get processed:
- `[pause]`, `[long pause]` - Silence
- `[deep breath]`, `[exhale]` - Breathing cues
- `[soft hum]`, `[whisper]` - Voice effects

### Text Sync
InlinePlayer highlights words in real-time using ScriptTimingMap:
```typescript
interface TextSegment {
  type: 'word' | 'pause' | 'audioTag';
  text: string;
  start: number;
  end: number;
}
```

### Mobile Sidebar
Uses overlay approach (not margin push) to prevent horizontal scroll:
- Dark backdrop on mobile
- Body scroll lock when open
- Tap overlay to close

## Code Style

- Tailwind for styling with custom glass morphism classes
- Lucide icons (lucide-react)
- No emojis in code unless explicitly requested
- Functional components with hooks
- Memoization for expensive renders

## Build Optimization

Vite code splitting by vendor:
- react-vendor (~12KB gzipped)
- d3-vendor (~14KB gzipped)
- sentry-vendor (~3KB gzipped)
- Main bundle (~52KB gzipped)

## Security

- JWT validation on all edge functions
- User ID from verified token (never request body)
- RLS policies on all tables
- CSP headers in vercel.json
- Service role key only in edge functions
