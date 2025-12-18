# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

INrVO (Digital Zen Wellness) is an AI-powered wellness platform built with React and Google's Gemini AI. It provides personalized meditation generation, voice synthesis, and immersive audio experiences.

## Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Environment Setup

Create `.env.local` with:
```
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Architecture

### View System
The app uses a single `App.tsx` component (~960 lines) managing views via the `View` enum in `types.ts`:
- **HOME** - Main input page with text/voice input, template selection, voice selector
- **PLAYER** - Immersive audio playback with D3 radial visualizer
- (WRITER, STUDIO, MIXER, CLONE views defined but currently routed through HOME/modals)

### AI Integration Layer
`geminiService.ts` wraps Google Generative AI (@google/genai):
- `enhanceScript()` - gemini-3-pro-preview with Thinking Mode (32KB budget) for meditation script generation
- `quickEdit()` - gemini-3-flash-preview for fast edits
- `generateSpeech()` - gemini-2.5-flash-preview-tts for TTS (24kHz PCM, base64)
- `transcribeAudio()` - gemini-3-flash-preview for speech-to-text from WebM
- `decodeAudioBuffer()` - Utility to convert base64 PCM to AudioBuffer
- `blobToBase64()` - Utility for audio blob conversion

### Data Persistence
`lib/supabase.ts` provides:
- Auth helpers: `signUp`, `signIn`, `signOut`, `getCurrentUser`
- Voice profiles: `createVoiceProfile`, `getUserVoiceProfiles`, `updateVoiceProfile`, `deleteVoiceProfile`
- Voice clones: `createVoiceClone`, `getUserVoiceClones` (stores base64 audio samples)
- Audio generations: `saveAudioGeneration`, `getUserAudioGenerations`

Database schema in `supabase-schema.sql` - run in Supabase SQL Editor to set up tables with RLS policies.

### Component Structure
```
App.tsx              # Main app, all view rendering, state management
components/
  Visualizer.tsx     # D3 radial audio visualizer
  Starfield.tsx      # Procedural star background (250 stars, 5 animation types)
  GlassCard.tsx      # Glass-morphism card component
  LoadingScreen.tsx  # Initial loading animation
  AuthModal.tsx      # Sign in/up modal
  VoiceManager.tsx   # Saved voice profiles management
  ui/ai-voice-input  # Voice recording component with visualizer
constants.tsx        # TEMPLATE_CATEGORIES, VOICE_PROFILES, ICONS (SVG components)
types.ts             # View enum, interfaces (SoundLayer, ScriptTemplate, VoiceProfile)
lib/
  supabase.ts        # Supabase client and data operations
  utils.ts           # Utility functions (cn for classnames)
```

### State Management
All state in App.tsx using React hooks. Key state groups:
- View: `currentView`, `isLoading`
- Script: `script`, `isGenerating`
- Voice: `selectedVoice`, `availableVoices`
- Recording: `isRecording`, `isRecordingClone`, `recordedAudio`, `recordingProgress`
- Auth: `user`, `showAuthModal`, `savedVoices`
- Audio: `audioContextRef`, `audioSourceRef`, `isPlaying`

## Tech Stack

- **React 19** with TypeScript 5.8, Vite 6
- **Google Generative AI** (@google/genai) - Gemini 3 Pro/Flash, Gemini 2.5 TTS
- **Supabase** - Auth and database for voice profiles/clones
- **D3.js** - Audio visualization
- **Tailwind CSS 4** (via PostCSS) + custom glass-morphism in index.html
- **Web Audio API** / **MediaRecorder API** - Audio capture and playback
- **Lucide React** - Icons

## Styling

Global styles in `index.html` `<style>` block and `index.css`. Key patterns:
- CSS variables for colors: `--bg-deep: #020617`, `--accent-primary: #6366f1`
- Glass-morphism: `.glass`, `.glass-elevated` classes
- Animation classes: `.animate-shine`, `.animate-twinkle`, `.animate-glitch`, `.animate-pulsar`
- Fonts: Plus Jakarta Sans (body), Space Grotesk (neural/tech), Playfair Display (serif)
- Responsive typography using clamp()

## Extending the App

- **Add meditation template**: Edit `TEMPLATE_CATEGORIES` array in `constants.tsx`
- **Add voice profile**: Edit `VOICE_PROFILES` in `constants.tsx` (Gemini voices: Zephyr, Kore, Puck, Fenrir)
- **Modify AI prompts**: Edit prompt strings in `geminiService.ts`
- **Add new view**: Add to `View` enum in `types.ts`, add render logic in App.tsx
- **Add database table**: Update types in `lib/supabase.ts`, add CRUD functions, update `supabase-schema.sql`

## Notes

- Voice cloning stores audio samples but uses Gemini's prebuilt voices for TTS (no custom voice synthesis yet)
- Audio format: 24kHz sample rate, mono PCM, base64 encoded
- The `accent` field in voice_profiles stores the preferred Gemini voice name
- Recording limit: 30 seconds for voice clones, base64 size limit ~15MB
