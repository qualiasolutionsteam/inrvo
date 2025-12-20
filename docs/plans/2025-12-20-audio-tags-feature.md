# Audio Tags Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create an audio tags system that lets users insert special markers (like [long pause], [giggling], [whispers], [inhale]) into meditation scripts, with full backend persistence in Supabase.

**Architecture:** Audio tags are defined in `constants.tsx`, displayed via a modal triggered from the prompt menu, stored as user preferences in Supabase, and injected into the AI prompt during script generation. The Gemini TTS model interprets these markers to produce appropriate audio effects.

**Tech Stack:** React, TypeScript, Supabase (PostgreSQL), Gemini AI

---

## Task 1: Create Database Migration for Audio Tags

**Files:**
- Create: `supabase/migrations/20251220_audio_tags.sql`

**Step 1: Write the SQL migration**

```sql
-- Migration: Add audio tags support
-- This adds columns to store user audio tag preferences and tracks usage in meditation history

-- Add audio_tags column to meditation_history to track which tags were used
ALTER TABLE meditation_history
ADD COLUMN IF NOT EXISTS audio_tags_used TEXT[] DEFAULT '{}';

-- Add audio tag preferences to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS audio_tag_preferences JSONB DEFAULT '{"enabled": false, "favorite_tags": []}'::jsonb;

-- Create audio_tag_presets table for admin-managed tag definitions (optional, for future extensibility)
CREATE TABLE IF NOT EXISTS audio_tag_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_key VARCHAR(50) UNIQUE NOT NULL,
  tag_label VARCHAR(100) NOT NULL,
  tag_description TEXT,
  category VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE audio_tag_presets ENABLE ROW LEVEL SECURITY;

-- Everyone can read active presets
CREATE POLICY "Anyone can read active audio tag presets"
ON audio_tag_presets FOR SELECT
USING (is_active = true);

-- Only admins can modify presets
CREATE POLICY "Admins can manage audio tag presets"
ON audio_tag_presets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
);

-- Insert default audio tag presets
INSERT INTO audio_tag_presets (tag_key, tag_label, tag_description, category, sort_order) VALUES
  ('short_pause', '[short pause]', 'A brief 1-2 second pause', 'pauses', 1),
  ('long_pause', '[long pause]', 'A longer 3-5 second pause', 'pauses', 2),
  ('silence', '[silence]', 'A moment of complete silence', 'pauses', 3),
  ('inhale', '[inhale]', 'Sound of breathing in deeply', 'breathing', 1),
  ('exhale', '[exhale]', 'Sound of breathing out slowly', 'breathing', 2),
  ('deep_breath', '[deep breath]', 'A full deep breath cycle', 'breathing', 3),
  ('whisper', '[whisper]', 'Speak in a soft whisper', 'voice', 1),
  ('soft_voice', '[soft voice]', 'Speak very gently', 'voice', 2),
  ('gentle_giggle', '[gentle giggle]', 'A soft, warm laugh', 'sounds', 1),
  ('sigh', '[sigh]', 'A relaxing sigh', 'sounds', 2),
  ('hum', '[hum]', 'A gentle humming sound', 'sounds', 3)
ON CONFLICT (tag_key) DO NOTHING;
```

**Step 2: Apply migration via Supabase MCP**

Run: Use `mcp__supabase__apply_migration` with the SQL above
Expected: Migration applies successfully, tables/columns created

**Step 3: Verify migration**

Run: Use `mcp__supabase__list_tables` to verify `audio_tag_presets` table exists
Expected: Table appears in list with correct columns

**Step 4: Commit**

```bash
git add supabase/migrations/20251220_audio_tags.sql
git commit -m "feat(db): add audio tags schema migration"
```

---

## Task 2: Define Audio Tag Types and Constants

**Files:**
- Modify: `types.ts` (add AudioTag interface)
- Modify: `constants.tsx` (add AUDIO_TAG_CATEGORIES and Tags icon)

**Step 1: Add AudioTag interface to types.ts**

Add after the `BackgroundMusic` interface (around line 44):

```typescript
export interface AudioTag {
  id: string;
  label: string;        // Display label like "[long pause]"
  description: string;  // Tooltip description
  category: 'pauses' | 'breathing' | 'voice' | 'sounds';
}

export interface AudioTagCategory {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  tags: AudioTag[];
}
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Add AUDIO_TAG_CATEGORIES to constants.tsx**

Add after `BACKGROUND_TRACKS` array (around line 206):

```typescript
export const AUDIO_TAG_CATEGORIES: { id: string; name: string; color: string; bgColor: string; tags: { id: string; label: string; description: string }[] }[] = [
  {
    id: 'pauses',
    name: 'Pauses',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    tags: [
      { id: 'short_pause', label: '[short pause]', description: 'A brief 1-2 second pause' },
      { id: 'long_pause', label: '[long pause]', description: 'A longer 3-5 second pause' },
      { id: 'silence', label: '[silence]', description: 'A moment of complete silence' },
    ]
  },
  {
    id: 'breathing',
    name: 'Breathing',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    tags: [
      { id: 'inhale', label: '[inhale]', description: 'Sound of breathing in deeply' },
      { id: 'exhale', label: '[exhale]', description: 'Sound of breathing out slowly' },
      { id: 'deep_breath', label: '[deep breath]', description: 'A full deep breath cycle' },
    ]
  },
  {
    id: 'voice',
    name: 'Voice Style',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    tags: [
      { id: 'whisper', label: '[whisper]', description: 'Speak in a soft whisper' },
      { id: 'soft_voice', label: '[soft voice]', description: 'Speak very gently' },
    ]
  },
  {
    id: 'sounds',
    name: 'Sounds',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    tags: [
      { id: 'gentle_giggle', label: '[gentle giggle]', description: 'A soft, warm laugh' },
      { id: 'sigh', label: '[sigh]', description: 'A relaxing sigh' },
      { id: 'hum', label: '[hum]', description: 'A gentle humming sound' },
    ]
  },
];
```

**Step 4: Add Tags icon to ICONS object**

Find the ICONS object in constants.tsx and add:

```typescript
Tags: (props: any) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z"/>
    <path d="M6 9.01V9"/>
    <path d="m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19"/>
  </svg>
),
```

**Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add types.ts constants.tsx
git commit -m "feat: add audio tag types and constants"
```

---

## Task 3: Add Supabase Functions for Audio Tags

**Files:**
- Modify: `lib/supabase.ts`

**Step 1: Add AudioTagPreference interface**

Add after the `MeditationHistory` interface (around line 94):

```typescript
export interface AudioTagPreference {
  enabled: boolean;
  favorite_tags: string[];
}
```

**Step 2: Add functions to manage audio tag preferences**

Add at the end of the file before the `onAuthStateChange` function:

```typescript
// Audio Tag Preference operations
export const getAudioTagPreferences = async (): Promise<AudioTagPreference> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return { enabled: false, favorite_tags: [] };

  const { data, error } = await supabase
    .from('users')
    .select('audio_tag_preferences')
    .eq('id', user.id)
    .single();

  if (error || !data?.audio_tag_preferences) {
    return { enabled: false, favorite_tags: [] };
  }
  return data.audio_tag_preferences as AudioTagPreference;
};

export const updateAudioTagPreferences = async (
  preferences: Partial<AudioTagPreference>
): Promise<void> => {
  const user = await getCurrentUser();
  if (!user || !supabase) throw new Error('User not authenticated or Supabase not configured');

  // Get current preferences first
  const current = await getAudioTagPreferences();
  const updated = { ...current, ...preferences };

  const { error } = await supabase
    .from('users')
    .update({
      audio_tag_preferences: updated,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);

  if (error) throw error;
};

export const toggleFavoriteAudioTag = async (tagId: string): Promise<string[]> => {
  const prefs = await getAudioTagPreferences();
  const favorites = prefs.favorite_tags || [];

  const updated = favorites.includes(tagId)
    ? favorites.filter(id => id !== tagId)
    : [...favorites, tagId];

  await updateAudioTagPreferences({ favorite_tags: updated });
  return updated;
};
```

**Step 3: Update saveMeditationHistory to include audio tags**

Find the `saveMeditationHistory` function and update its signature and implementation:

```typescript
export const saveMeditationHistory = async (
  prompt: string,
  enhancedScript?: string,
  voiceId?: string,
  voiceName?: string,
  backgroundTrackId?: string,
  backgroundTrackName?: string,
  durationSeconds?: number,
  audioTagsUsed?: string[]  // NEW PARAMETER
): Promise<MeditationHistory | null> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return null;

  const { data, error } = await supabase
    .from('meditation_history')
    .insert({
      user_id: user.id,
      prompt,
      enhanced_script: enhancedScript,
      voice_id: voiceId,
      voice_name: voiceName,
      background_track_id: backgroundTrackId,
      background_track_name: backgroundTrackName,
      duration_seconds: durationSeconds,
      audio_tags_used: audioTagsUsed || [],  // NEW FIELD
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving meditation history:', error);
    return null;
  }
  return data;
};
```

**Step 4: Update MeditationHistory interface**

Find the `MeditationHistory` interface and add:

```typescript
export interface MeditationHistory {
  id: string;
  user_id: string;
  prompt: string;
  enhanced_script?: string;
  voice_id?: string;
  voice_name?: string;
  background_track_id?: string;
  background_track_name?: string;
  duration_seconds?: number;
  audio_tags_used?: string[];  // NEW FIELD
  created_at: string;
  updated_at: string;
}
```

**Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add audio tag Supabase functions"
```

---

## Task 4: Add Audio Tags State to App.tsx

**Files:**
- Modify: `App.tsx`

**Step 1: Add imports**

Find the imports section and add to the supabase import:

```typescript
import {
  supabase, getCurrentUser, signOut, createVoiceProfile, getUserVoiceProfiles,
  VoiceProfile as DBVoiceProfile, createVoiceClone, saveMeditationHistory,
  getMeditationHistory, deleteMeditationHistory, MeditationHistory,
  getAudioTagPreferences, updateAudioTagPreferences, toggleFavoriteAudioTag, AudioTagPreference
} from './lib/supabase';
```

Add to the constants import:

```typescript
import { TEMPLATE_CATEGORIES, VOICE_PROFILES, ICONS, BACKGROUND_TRACKS, BackgroundTrack, AUDIO_TAG_CATEGORIES } from './constants';
```

**Step 2: Add state variables**

Find the modal states section (around line 28-34) and add:

```typescript
// Audio tags states
const [showAudioTagsModal, setShowAudioTagsModal] = useState(false);
const [selectedAudioTags, setSelectedAudioTags] = useState<string[]>([]);
const [audioTagsEnabled, setAudioTagsEnabled] = useState(false);
const [favoriteAudioTags, setFavoriteAudioTags] = useState<string[]>([]);
```

**Step 3: Load audio tag preferences on mount**

Find the `useEffect` that loads user data (look for `getCurrentUser()`) and add audio tag loading:

```typescript
// Load audio tag preferences
const loadAudioTagPrefs = async () => {
  try {
    const prefs = await getAudioTagPreferences();
    setAudioTagsEnabled(prefs.enabled);
    setFavoriteAudioTags(prefs.favorite_tags || []);
  } catch (err) {
    console.warn('Failed to load audio tag preferences:', err);
  }
};

// Call this in the useEffect after user auth check
if (currentUser) {
  loadAudioTagPrefs();
}
```

**Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add App.tsx
git commit -m "feat: add audio tags state management"
```

---

## Task 5: Add Audio Tags Button to Prompt Menu

**Files:**
- Modify: `App.tsx`

**Step 1: Find the prompt menu grid**

Locate the prompt menu section (around line 900) with the `grid-cols-2 gap-2` div.

**Step 2: Add Audio Tags button after Music button**

Insert this button after the Music button (around line 943):

```typescript
{/* Audio Tags */}
<button
  onClick={() => {
    setShowAudioTagsModal(true);
    setShowPromptMenu(false);
  }}
  className={`p-3 rounded-xl transition-all btn-press focus-ring flex flex-col items-center gap-1.5 ${
    selectedAudioTags.length > 0
      ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
      : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-violet-400'
  }`}
  title={selectedAudioTags.length > 0 ? `${selectedAudioTags.length} tags selected` : 'Add audio tags'}
>
  <ICONS.Tags className="w-5 h-5" />
  <span className="text-[10px] font-medium">Tags</span>
</button>
```

**Step 3: Update grid to accommodate 5 items**

Change the grid from `grid-cols-2` to handle the 5th item gracefully. Update the grid container:

```typescript
<div className="grid grid-cols-2 gap-2 w-full">
```

The 5th item will wrap to a new row, which is acceptable. Alternatively, you can use `grid-cols-3` for a tighter layout on the first row.

**Step 4: Run dev server to verify UI**

Run: `npm run dev`
Expected: Tags button appears in prompt menu grid

**Step 5: Commit**

```bash
git add App.tsx
git commit -m "feat: add audio tags button to prompt menu"
```

---

## Task 6: Create Audio Tags Modal

**Files:**
- Modify: `App.tsx`

**Step 1: Add the modal JSX**

Find where other modals are rendered (search for `showMusicModal &&`) and add the Audio Tags modal nearby:

```typescript
{/* Audio Tags Modal */}
{showAudioTagsModal && (
  <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setShowAudioTagsModal(false)}
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-lg glass rounded-3xl border border-white/10 shadow-2xl shadow-black/50 max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Audio Tags</h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Add special markers to enhance your meditation
            </p>
          </div>
          <button
            onClick={() => setShowAudioTagsModal(false)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <ICONS.Close className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div>
              <p className="text-sm font-medium text-white">Enable Audio Tags</p>
              <p className="text-xs text-slate-400">Include tags in generated scripts</p>
            </div>
            <button
              onClick={async () => {
                const newValue = !audioTagsEnabled;
                setAudioTagsEnabled(newValue);
                await updateAudioTagPreferences({ enabled: newValue });
              }}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                audioTagsEnabled ? 'bg-violet-500' : 'bg-slate-600'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                audioTagsEnabled ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Selected Tags Preview */}
          {selectedAudioTags.length > 0 && (
            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <p className="text-xs font-medium text-violet-300 mb-2">Selected Tags ({selectedAudioTags.length})</p>
              <div className="flex flex-wrap gap-2">
                {selectedAudioTags.map(tagId => {
                  const tag = AUDIO_TAG_CATEGORIES.flatMap(c => c.tags).find(t => t.id === tagId);
                  return tag ? (
                    <button
                      key={tagId}
                      onClick={() => setSelectedAudioTags(prev => prev.filter(id => id !== tagId))}
                      className="px-2 py-1 rounded-lg bg-violet-500/20 text-violet-300 text-xs hover:bg-red-500/20 hover:text-red-300 transition-colors"
                    >
                      {tag.label} ×
                    </button>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Tag Categories */}
          {AUDIO_TAG_CATEGORIES.map(category => (
            <div key={category.id}>
              <h3 className={`text-sm font-semibold mb-3 ${category.color}`}>
                {category.name}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {category.tags.map(tag => {
                  const isSelected = selectedAudioTags.includes(tag.id);
                  const isFavorite = favoriteAudioTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setSelectedAudioTags(prev =>
                          isSelected
                            ? prev.filter(id => id !== tag.id)
                            : [...prev, tag.id]
                        );
                      }}
                      className={`p-3 rounded-xl text-left transition-all btn-press ${
                        isSelected
                          ? `${category.bgColor} ${category.color} border border-current/30`
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{tag.label}</span>
                        {isFavorite && <span className="text-yellow-400 text-xs">★</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{tag.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-white/10 flex gap-3">
          <button
            onClick={() => setSelectedAudioTags([])}
            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium transition-all"
          >
            Clear All
          </button>
          <button
            onClick={() => setShowAudioTagsModal(false)}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium transition-all hover:shadow-lg hover:shadow-violet-500/25"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </>
)}
```

**Step 2: Run dev server to verify modal**

Run: `npm run dev`
Expected: Clicking Tags button opens modal with categories and tags

**Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: add audio tags selection modal"
```

---

## Task 7: Integrate Audio Tags into Script Generation

**Files:**
- Modify: `geminiService.ts`
- Modify: `App.tsx`

**Step 1: Update enhanceScript to accept audio tags**

Modify the `enhanceScript` function in `geminiService.ts`:

```typescript
async enhanceScript(thought: string, audioTags?: string[]): Promise<string> {
  try {
    const ai = getAI();
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error('API key not found. Please set VITE_GEMINI_API_KEY in your environment variables.');
    }

    // Build audio tag instruction if tags are provided
    let audioTagInstruction = '';
    if (audioTags && audioTags.length > 0) {
      audioTagInstruction = `
5. Audio Tags: Incorporate these audio markers naturally throughout the script where appropriate: ${audioTags.join(', ')}
   - [short pause] = 1-2 second pause
   - [long pause] = 3-5 second pause
   - [silence] = moment of complete silence
   - [inhale], [exhale], [deep breath] = breathing cues
   - [whisper], [soft voice] = voice style changes
   - [gentle giggle], [sigh], [hum] = natural sounds
   Place these tags on their own lines where they should occur in the narration.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Transform this short, messy thought into a beautiful, immersive, and structured guided meditation script or story outline: "${thought}".
      Requirements:
      1. Length: 300-500 words.
      2. Tone: Professional, soothing, and high-fidelity.
      3. Structure: Include an introduction, a guided journey/visualization, and a gentle closing.
      4. Creativity: Use evocative and sensory language.${audioTagInstruction}`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }
      },
    });

    const text = response.text;
    if (!text || text.trim() === '') {
      throw new Error('Empty response from API. Please try again.');
    }

    return text;
  } catch (error: any) {
    console.error('Error in enhanceScript:', error);
    throw new Error(error?.message || 'Failed to generate meditation script. Please check your API key and try again.');
  }
},
```

**Step 2: Update handleGenerateAndPlay in App.tsx**

Find the `handleGenerateAndPlay` function and update the `enhanceScript` call:

```typescript
// Get selected tag labels for the prompt
const tagLabels = audioTagsEnabled && selectedAudioTags.length > 0
  ? AUDIO_TAG_CATEGORIES.flatMap(c => c.tags)
      .filter(t => selectedAudioTags.includes(t.id))
      .map(t => t.label)
  : undefined;

// Generate enhanced meditation from short prompt
const enhanced = await geminiService.enhanceScript(script, tagLabels);
```

**Step 3: Update saveMeditationHistory call**

Find the `saveMeditationHistory` call in `handleGenerateAndPlay` and add audio tags:

```typescript
// Auto-save to meditation history (fire and forget, don't block playback)
saveMeditationHistory(
  script, // original prompt
  enhanced, // enhanced script
  selectedVoice.id,
  selectedVoice.name,
  selectedBackgroundTrack?.id,
  selectedBackgroundTrack?.name,
  Math.round(audioBuffer.duration),
  audioTagsEnabled ? selectedAudioTags : undefined  // NEW: audio tags used
).catch(err => console.warn('Failed to save meditation history:', err));
```

**Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Test end-to-end**

Run: `npm run dev`
1. Select some audio tags
2. Enable audio tags toggle
3. Enter a prompt and generate
Expected: Generated script includes audio tag markers

**Step 6: Commit**

```bash
git add geminiService.ts App.tsx
git commit -m "feat: integrate audio tags into script generation"
```

---

## Task 8: Add Smart Tag Suggestions

**Files:**
- Modify: `App.tsx`

**Step 1: Add suggestion logic based on prompt content**

Add this helper function near the top of App.tsx (after imports):

```typescript
const getSuggestedAudioTags = (prompt: string): string[] => {
  const suggestions: string[] = [];
  const lowerPrompt = prompt.toLowerCase();

  // Breathing-related prompts
  if (lowerPrompt.includes('breath') || lowerPrompt.includes('relax') || lowerPrompt.includes('calm')) {
    suggestions.push('inhale', 'exhale', 'deep_breath');
  }

  // Sleep-related prompts
  if (lowerPrompt.includes('sleep') || lowerPrompt.includes('rest') || lowerPrompt.includes('dream')) {
    suggestions.push('long_pause', 'silence', 'soft_voice');
  }

  // Anxiety/stress prompts
  if (lowerPrompt.includes('anxiety') || lowerPrompt.includes('stress') || lowerPrompt.includes('worry')) {
    suggestions.push('deep_breath', 'sigh', 'whisper');
  }

  // Joy/happiness prompts
  if (lowerPrompt.includes('happy') || lowerPrompt.includes('joy') || lowerPrompt.includes('gratitude')) {
    suggestions.push('gentle_giggle', 'hum');
  }

  // Default: always suggest some pauses
  if (suggestions.length === 0) {
    suggestions.push('short_pause', 'long_pause');
  }

  return [...new Set(suggestions)]; // Remove duplicates
};
```

**Step 2: Add suggestions display in modal**

In the Audio Tags modal, add a suggestions section after the enable toggle:

```typescript
{/* Smart Suggestions */}
{script.trim() && (
  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
    <p className="text-xs font-medium text-indigo-300 mb-2">
      Suggested for your prompt
    </p>
    <div className="flex flex-wrap gap-2">
      {getSuggestedAudioTags(script).map(tagId => {
        const tag = AUDIO_TAG_CATEGORIES.flatMap(c => c.tags).find(t => t.id === tagId);
        const isSelected = selectedAudioTags.includes(tagId);
        return tag ? (
          <button
            key={tagId}
            onClick={() => {
              if (!isSelected) {
                setSelectedAudioTags(prev => [...prev, tagId]);
              }
            }}
            disabled={isSelected}
            className={`px-2 py-1 rounded-lg text-xs transition-colors ${
              isSelected
                ? 'bg-indigo-500/30 text-indigo-200 cursor-default'
                : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
            }`}
          >
            {tag.label} {isSelected ? '✓' : '+'}
          </button>
        ) : null;
      })}
    </div>
  </div>
)}
```

**Step 3: Run dev server to verify suggestions**

Run: `npm run dev`
1. Type "help me sleep" in the prompt
2. Open audio tags modal
Expected: Suggestions appear with sleep-related tags

**Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat: add smart audio tag suggestions based on prompt"
```

---

## Task 9: Display Audio Tags in Status Bar

**Files:**
- Modify: `App.tsx`

**Step 1: Find the status bar**

Locate the status bar section (around line 998-1005).

**Step 2: Add audio tags indicator**

Update the status bar to show selected tags count:

```typescript
{/* Status bar */}
<div className="px-3 md:px-6 py-2 md:py-3 flex justify-between items-center text-[9px] md:text-[11px] uppercase tracking-wider md:tracking-widest font-bold text-slate-500 border-t border-white/5 bg-white/[0.01]">
  <div className="flex items-center gap-2 md:gap-3">
    <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0 ${isRecording ? 'bg-rose-500 animate-ping' : isGenerating ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`}></span>
    <span className="text-slate-400 truncate">{isRecording ? 'Capturing...' : isGenerating ? 'Generating...' : 'Ready'}</span>
  </div>
  <div className="flex items-center gap-2 md:gap-4">
    {/* Audio tags indicator */}
    {audioTagsEnabled && selectedAudioTags.length > 0 && (
      <button
        onClick={() => setShowAudioTagsModal(true)}
        className="text-violet-400 hover:text-violet-300 flex items-center gap-1"
      >
        <ICONS.Tags className="w-3 h-3" />
        <span>{selectedAudioTags.length}</span>
      </button>
    )}
    <div className="text-slate-600 truncate max-w-[80px] md:max-w-none text-right">{selectedVoice.name}</div>
  </div>
</div>
```

**Step 3: Run dev server to verify**

Run: `npm run dev`
Expected: Tags count shows in status bar when tags are selected

**Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat: show audio tags count in status bar"
```

---

## Task 10: Build and Final Verification

**Files:**
- All modified files

**Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run production build**

Run: `npm run build`
Expected: Build completes successfully

**Step 3: Test full flow**

Run: `npm run preview`
1. Open the app
2. Click the + menu, select Tags
3. Enable audio tags toggle
4. Select some tags (e.g., [inhale], [long pause])
5. Enter a prompt like "help me relax"
6. Click Create
7. Verify the generated script contains the audio tags
Expected: Full flow works, tags appear in generated meditation

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete audio tags feature with backend integration"
```

---

## Troubleshooting Guide

### Error: Column 'audio_tags_used' does not exist
**Cause:** Migration not applied
**Fix:** Run the migration via Supabase MCP:
```
mcp__supabase__apply_migration with the SQL from Task 1
```

### Error: AUDIO_TAG_CATEGORIES is not defined
**Cause:** Missing export in constants.tsx
**Fix:** Ensure `export const AUDIO_TAG_CATEGORIES` is present and exported

### Error: Tags not appearing in generated script
**Cause:** `audioTagsEnabled` is false or tags not passed to enhanceScript
**Fix:**
1. Check the toggle is ON
2. Verify `tagLabels` is being built correctly before the enhanceScript call
3. Add console.log to debug: `console.log('Tags:', tagLabels)`

### Error: Modal doesn't close
**Cause:** Missing onClick handler on backdrop
**Fix:** Ensure backdrop div has `onClick={() => setShowAudioTagsModal(false)}`

### Error: Supabase update fails silently
**Cause:** RLS policy blocking updates
**Fix:** Check user is authenticated, verify policy allows updates to users table

---

## File Summary

| File | Changes |
|------|---------|
| `supabase/migrations/20251220_audio_tags.sql` | New migration for audio tags schema |
| `types.ts` | Add AudioTag and AudioTagCategory interfaces |
| `constants.tsx` | Add AUDIO_TAG_CATEGORIES array and Tags icon |
| `lib/supabase.ts` | Add audio tag preference functions, update MeditationHistory |
| `geminiService.ts` | Update enhanceScript to accept audio tags |
| `App.tsx` | Add modal, state, button, suggestions, status bar indicator |
