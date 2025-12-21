# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (port 3000)
npm run build        # Production build to /dist
npm run preview      # Preview production build locally

npm run test         # Run Vitest in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Interactive test UI
npm run test:coverage # Run tests with coverage report

# Run single test file
vitest run tests/lib/credits.test.ts
```

## Project Overview

**INrVO - Digital Zen Wellness** is a React + TypeScript SPA for AI-powered personalized meditation generation. Users describe their emotional state, the app generates custom meditation scripts via Google Gemini, synthesizes audio via ElevenLabs TTS, and provides real-time playback with synchronized text highlighting.

**Stack**: React 19 + TypeScript + Vite + Tailwind CSS 4 + Supabase + Vercel

## Architecture

### Voice Generation Pipeline

```
User prompt → Gemini 2.0 Flash (script) → ElevenLabs TTS → AudioBuffer → ScriptReader sync
```

1. User enters prompt describing emotional state
2. **Gemini 2.0 Flash** generates meditation script (100-180 words)
3. Audio tags like `[long pause]`, `[deep breath]` are injected for pacing
4. **ElevenLabs** synthesizes cloned voice audio (only cloned voices supported)
5. **ScriptReader** provides real-time word-by-word highlighting during playback

### Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Main component (~3000 lines, manages all views and state) |
| `geminiService.ts` | Google Generative AI integration for script generation |
| `src/lib/voiceService.ts` | Voice generation routing (cloned voices only) |
| `src/lib/elevenlabs.ts` | ElevenLabs TTS & voice cloning API |
| `src/lib/edgeFunctions.ts` | Edge Function client wrappers |
| `src/lib/textSync.ts` | Audio-text synchronization logic |
| `src/lib/credits.ts` | Credit management & usage tracking |
| `src/contexts/ModalContext.tsx` | Centralized state for modal types |
| `components/ScriptReader.tsx` | Real-time word highlighting during playback |
| `components/InlinePlayer.tsx` | Compact audio player with seek functionality |
| `components/SimpleVoiceClone.tsx` | Voice recording and cloning UI |
| `components/AgentChat.tsx` | Conversational AI chat interface |
| `lib/supabase.ts` | Supabase client and database operations |

### Edge Functions (Supabase)

All API keys are server-side. Frontend sends JWT for authentication.

| Function | Purpose |
|----------|---------|
| `elevenlabs-voice-ops/` | Voice operations (delete, status check) |
| `gemini-script/` | Script generation and extension via Gemini |
| `generate-speech/` | TTS generation with credit deduction |
| `process-voice/` | Voice cloning and processing |
| `health/` | Health check endpoint |

### Credit System

- Monthly free allowance: 100,000 credits
- TTS generation: 280 credits per 1K characters
- Voice cloning: 5,000 credits per clone
- Monthly clone limit: 20 clones

Database tables: `user_credits`, `voice_usage_limits`, `voice_cloning_usage`

## Database (Supabase)

Migrations in `supabase/migrations/`:
- `001_add_voice_cloning.sql` - Voice storage schema, credits tables
- `002_credit_functions.sql` - Credit increment functions
- `003_audio_tags.sql` - Audio tag configuration
- `004_secure_credit_functions.sql` - Secured credit operations
- `005_credit_check_rpc.sql` - Credit status RPC
- `006_perform_credit_operation.sql` - Atomic credit operations
- `007_performance_indexes.sql` - Query optimization indexes

Key tables with RLS: `voice_profiles`, `user_credits`, `voice_usage_limits`, `voice_cloning_usage`, `meditation_history`

## Environment Variables

Frontend (`.env.local`):
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SENTRY_DSN=https://...  # Optional
```

Edge Functions (Supabase secrets - NOT in .env.local):
```
ELEVENLABS_API_KEY=sk_...
GEMINI_API_KEY=AI...
SUPABASE_SERVICE_ROLE_KEY=...  # Auto-provided
```

## Security Architecture

- CORS restricted to allowed origins in Edge Functions
- JWT validation on all Edge Functions
- User identity derived from JWT, not request body
- RLS enabled on all user data tables
- CSP headers configured in `vercel.json`

## Testing

Uses Vitest + Happy DOM + MSW for mocking. Tests in `tests/` directory.

Coverage thresholds for critical paths:
- `src/lib/credits.ts`: 90% statements, 85% branches, 90% functions

## Code Patterns

### Modal Management
Use `useModals()` hook from `src/contexts/ModalContext.tsx`:
```typescript
const { openModal, closeModal, showCloneModal } = useModals();
openModal('clone');
```

### Voice Generation
```typescript
import { voiceService } from './src/lib/voiceService';
const { audioBuffer, base64 } = await voiceService.generateSpeech(text, voice, audioContext);
```

### Credit Operations
```typescript
import { creditService } from './src/lib/credits';
await creditService.deductCredits(amount, 'TTS_GENERATE', voiceProfileId);
const status = await creditService.checkCreditsStatus();
```

## UI Patterns

- **Glass morphism** effects throughout (see `index.css`)
- **GPU-optimized animations** with transform3d, respects `prefers-reduced-motion`
- **Mobile-first responsive** with iOS safe area support
- Lazy-loaded components for bundle optimization (~400KB saved)

## Bundle Optimization

Configured in `vite.config.ts`:
- Code splitting: react-vendor, d3-vendor, supabase-vendor, sentry-vendor
- `@google/genai` dynamically imported (not in initial bundle)
- Target: ES2020 for modern browsers

## AI Meditation Agent

### Overview

The app includes a conversational AI agent (`src/lib/agent/`) that guides users through personalized meditation experiences. It draws from 35+ wisdom teachers across multiple traditions.

### Agent Architecture

```
User message → MeditationAgent → Gemini 2.0 Flash → Response + Actions
                    ↓
              Knowledge Base (teachers, traditions, meditations)
                    ↓
              Agent Tools (generateScript, synthesizeAudio, etc.)
```

### Key Agent Files

| File | Purpose |
|------|---------|
| `src/lib/agent/knowledgeBase.ts` | 35+ wisdom teachers, meditation types, emotional states |
| `src/lib/agent/MeditationAgent.ts` | Core agent with system prompt and conversation logic |
| `src/lib/agent/agentTools.ts` | Tools: generateScript, synthesizeAudio, suggestMeditation |
| `src/lib/agent/conversationStore.ts` | Conversation history and persistence |
| `src/hooks/useMeditationAgent.ts` | React hook for chat interface |
| `components/AgentChat.tsx` | Chat UI component |

### Wisdom Traditions

The agent embodies teachings from:
- **Modern Consciousness**: Joe Dispenza, Bruce Lipton, Deepak Chopra, Eckhart Tolle
- **Ancient Wisdom**: Buddha, Lao Tzu, Rumi, Marcus Aurelius, Yogananda
- **Psychology**: Carl Jung, Viktor Frankl, Gabor Maté, Richard Schwartz
- **Mindfulness**: Thich Nhat Hanh, Ram Dass, Byron Katie, Louise Hay
- **Science**: Einstein, Tesla, Rupert Sheldrake

### Using the Agent

```typescript
import { useMeditationAgent } from './src/hooks/useMeditationAgent';

function ChatComponent() {
  const { messages, sendMessage, isLoading, greeting } = useMeditationAgent();

  return (
    <div>
      <p>{greeting}</p>
      {messages.map(msg => <Message key={msg.id} {...msg} />)}
      <input onSubmit={(e) => sendMessage(e.target.value)} />
    </div>
  );
}
```

### Agent Tools

```typescript
import { generateMeditationScript, suggestMeditation, getWisdomQuote } from './src/lib/agent';

// Generate a meditation
const result = await generateMeditationScript('I feel anxious', 'breathwork', {
  duration: 'medium',
  teacherInfluence: 'Thich Nhat Hanh'
});

// Get meditation suggestions
const suggestions = suggestMeditation('anxious', 10); // 10 minutes available

// Get a wisdom quote
const quote = getWisdomQuote('Rumi', 'love');
```

### AgentChat Component

The `AgentChat` component replaces the original prompt input in `App.tsx`. It provides:
- Expandable chat area with message history
- Quick prompt chips with elegant SVG icons
- Integration with voice selection, templates, music, and audio tags modals

```tsx
<AgentChat
  onMeditationReady={(script, type, prompt) => { /* handle meditation */ }}
  onRequestVoiceSelection={() => setShowVoiceManager(true)}
  onOpenTemplates={() => setShowTemplatesModal(true)}
  selectedVoice={selectedVoice}
  isGenerating={isGenerating}
/>
```

### Quick Prompt Icons

Custom SVG icons for emotional states:
| Icon | Meaning | Style |
|------|---------|-------|
| waves | Anxious | Flowing wave lines |
| moon | Can't sleep | Crescent moon |
| lotus | Need calm | Lotus flower |
| heart | Grateful | Heart outline |
| cloud | Work stress | Soft cloud |
| target | Need focus | Concentric circles |
| sparkle | Self-love | 4-point star |
| star | Manifest | 5-point star |

### Meditation Types

Supported types in `knowledgeBase.ts`:
- `guided_visualization` - Visual journeys
- `breathwork` - Breathing exercises (box, 4-7-8)
- `body_scan` - Progressive relaxation
- `loving_kindness` - Metta meditation
- `sleep_story` - Sleep induction
- `affirmations` - Positive affirmations
- `walking_meditation` - Movement practice
- `shadow_work` - Inner child healing
- `gratitude` - Appreciation practice
- `manifestation` - Intention setting
- `presence` - Mindfulness/awareness
- `inquiry` - Self-examination
- `surrender` - Letting go

### Core Principles

Embedded in all agent responses:
1. Human beings are more than their conditioning
2. Beliefs shape reality
3. Love and gratitude are transformative forces
4. Healing the self heals the world
5. Consciousness evolution is humanity's next step

### Database

Agent conversations stored in `agent_conversations` table (migration `008_agent_conversations.sql`):
- `id` - Conversation ID
- `user_id` - User reference
- `messages` - JSONB array of messages
- `preferences` - User preferences (traditions, teachers)
- `session_state` - Current mood, selected meditation
- `summary` - Auto-generated conversation summary
