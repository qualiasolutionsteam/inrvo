# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

INrVO is a personalized meditation app that generates custom meditation scripts using AI and converts them to speech with voice cloning. Users can clone their own voice or select from built-in voices to hear meditations in a familiar tone.

**Tech Stack**: React 19 + TypeScript + Vite + Tailwind CSS 4 + Supabase (auth, database, edge functions) + Chatterbox via Replicate (TTS/voice cloning) + Gemini (script generation)

## Development Commands

```bash
npm run dev          # Start development server (Vite)
npm run build        # Production build
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Tests with Vitest UI
npm run test:coverage # Coverage report (90% threshold for credits.ts)
npm run test -- src/lib/credits  # Run specific test file
```

## Edge Function Deployment

```bash
# Deploy a specific function
supabase functions deploy generate-speech

# Deploy all functions
supabase functions deploy

# View function logs
supabase functions logs generate-speech --tail
```

## Architecture

### Frontend Structure

Single-page architecture with `App.tsx` containing most UI logic. State managed through React Context providers:

- **`ModalProvider`** (`src/contexts/ModalContext.tsx`) - Centralized modal state for 14+ modal types
- **`AudioProvider`** (`src/contexts/AudioContext.tsx`) - Audio playback and background music
- **`VoiceProvider`** (`src/contexts/VoiceContext.tsx`) - Voice selection and cloning state

Components are lazy-loaded for bundle optimization:
```typescript
const Visualizer = lazy(() => import('./components/Visualizer'));
const AuthModal = lazy(() => import('./components/AuthModal'));
```

### Backend Architecture

All AI/external API calls route through Supabase Edge Functions for security (API keys server-side only):

```
Frontend → src/lib/edgeFunctions.ts → Supabase Edge Functions → External APIs
```

**Edge Functions** (`supabase/functions/`):
- `generate-speech/` - Chatterbox TTS via Replicate with rate limiting
- `gemini-script/` - Meditation script generation via Gemini
- `chatterbox-clone/` - Voice cloning via Replicate's Chatterbox model
- `chatterbox-tts/` - Direct Chatterbox TTS endpoint
- `export-user-data/` - GDPR data export
- `health/` - System health checks (verifies Replicate + Gemini)

**Shared utilities** (`supabase/functions/_shared/`):
- `rateLimit.ts` - Request rate limiting per user
- `compression.ts` - Response compression
- `tracing.ts` - Request logging with correlation IDs

### AI Agent System

The **MeditationAgent** (`src/lib/agent/MeditationAgent.ts`) is a conversational AI that:
1. Has natural conversations (not immediately generating meditations)
2. Detects emotional state from user input
3. Only generates meditations when explicitly requested
4. Uses a knowledge base of wisdom teachers (`src/lib/agent/knowledgeBase.ts`)
5. Personalizes scripts based on user context and preferences (`src/lib/preferencesService.ts`)

Key trigger phrases for meditation generation:
- "I'll craft a", "Let me create", "Creating your"

### Database Schema

Main tables (`supabase/schema.sql`, migrations in `supabase/migrations/`):
- `voice_profiles` - User voice clones with `provider_voice_id` and `voice_sample_url`
- `voice_clones` - Audio samples for cloning
- `meditation_history` - Past meditation sessions with audio storage
- `voice_sessions` - Generated audio history
- `users` - Extended user profiles with audio tag preferences

All tables have RLS policies - users can only access their own data.

### Voice Flow

1. **Clone Voice**: Record 30+ sec → Convert WebM to WAV (`src/lib/audioConverter.ts`) → Edge Function → Chatterbox via Replicate
2. **Generate Meditation**: User prompt → Agent conversation → Explicit request → Gemini script → TTS provider
3. **Voice Selection**: Built-in voices (`constants.tsx`) + User clones (`voice_profiles` table)
4. **Background Music**: 18 tracks from SoundHelix (free, CORS-enabled) - selected in MeditationEditor

**Voice Providers** (`types.ts:VoiceProvider`):
- `browser` - Web Speech API (free, lower quality, works offline)
- `chatterbox` - Chatterbox via Replicate (~$0.03/run, high quality, voice cloning)
Note: Legacy providers ('ElevenLabs', 'Gemini') in database are treated as browser fallback.

## Key Files

- `App.tsx` - Main application component (~2400 lines), background music playback
- `types.ts` - TypeScript definitions for views, voice profiles, audio tags
- `constants.tsx` - Built-in voices, templates, 18 background tracks (SoundHelix), audio tags
- `src/lib/edgeFunctions.ts` - Edge function API wrapper (generateSpeech, chatterboxTTS, etc.)
- `src/lib/voiceService.ts` - Voice routing (browser, chatterbox providers)
- `src/components/MeditationEditor/` - Meditation creation UI with Voice/Music/Tags tabs
- `lib/supabase.ts` - Database operations, voice profile management
- `geminiService.ts` - Script generation prompts

### Background Music

Music is handled via HTML5 Audio in `App.tsx`:
- `BACKGROUND_TRACKS` in `constants.tsx` - 18 tracks across 7 categories
- `backgroundAudioRef` - Audio element reference for playback control
- Categories: nature, ambient, instrumental, binaural, lofi, classical
- All tracks use SoundHelix URLs (free, public domain, CORS-enabled)

### MeditationEditor Component

The **MeditationEditor** (`src/components/MeditationEditor/`) is a unified meditation script editing experience.

**Structure:**
```
src/components/MeditationEditor/
├── index.tsx              # Main component with contentEditable script editing
├── types.ts               # TypeScript types (MeditationEditorProps, ScriptStats, ControlTab)
├── components/
│   ├── EditorHeader.tsx   # Header with back button, centered title, stats (desktop)
│   ├── ControlPanel.tsx   # Bottom sheet with Voice/Music/Tags tabs
│   ├── GenerateButton.tsx # Primary CTA for audio generation
│   └── ScriptTextArea.tsx # Script editing area
└── hooks/
    ├── useAudioTags.ts    # Renders styled [tag] content
    ├── useEditorCursor.ts # Cursor position management
    └── useKeyboard.ts     # Keyboard shortcuts (Escape, Ctrl+Enter)
```

**Features:**
- Full-screen overlay on mobile, centered modal on desktop
- contentEditable script editing with styled audio tags (e.g., `[pause]`, `[deep breath]`)
- Voice/Music/Tags selection via expandable bottom sheet
- Keyboard shortcuts: `Escape` to close, `Ctrl+Enter` to generate
- Mobile-first responsive design with iOS safe area handling

**Mobile Header Design:**
- Back arrow button on left (clean, intuitive navigation)
- Centered title with meditation type subtitle
- Stats row shown below header on mobile, inline on desktop
- Uses `safe-top` CSS class for iOS notch handling

## Environment Variables

Frontend (`.env.local`):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SENTRY_DSN=https://...  # Optional
```

Edge Function secrets (set in Supabase dashboard, not .env):
```
REPLICATE_API_TOKEN=r8_...  # For Chatterbox TTS/voice cloning
GEMINI_API_KEY=AI...        # For script generation
```

## Testing

Tests use Vitest with happy-dom. Setup in `tests/setup.ts`, mocks in `tests/mocks/`.

The credits service (`src/lib/credits.ts`) has 90% coverage threshold.

## Path Aliases

`@/*` resolves to project root (configured in tsconfig.json and vite.config.ts).

## MCP Integration

The project supports MCP tools for Supabase operations. See `README_MCP.md` for usage patterns.

Key MCP commands:
- `mcp__supabase__execute_sql` - Run SQL queries
- `mcp__supabase__list_tables` - View schema
- `mcp__supabase__get_logs` - Debug edge functions
- `mcp__supabase__get_advisors` - Security/performance checks
