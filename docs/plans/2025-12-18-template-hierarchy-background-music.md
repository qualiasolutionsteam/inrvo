# Template Hierarchy & Background Music Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize templates into a 3-level hierarchy (Group > Subgroup > Template) and add background music selection for meditations.

**Architecture:** Extend `TemplateCategory` to support nested subgroups. Add `BackgroundMusic` interface and `BACKGROUND_TRACKS` constant. Modify the template modal to show collapsible groups with subgroup navigation. Add music selector in the generation flow.

**Tech Stack:** React, TypeScript, Web Audio API (for mixing TTS with background audio)

---

## Task 1: Update Type Definitions

**Files:**
- Modify: `types.ts`
- Modify: `constants.tsx:4-10`

**Step 1: Add BackgroundMusic interface to types.ts**

```typescript
// Add after VoiceProfile interface (line 33)

export interface BackgroundMusic {
  id: string;
  name: string;
  description: string;
  url: string;
  category: 'ambient' | 'nature' | 'binaural' | 'instrumental';
  duration: number; // in seconds, 0 for looping
}
```

**Step 2: Run build to verify no type errors**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add types.ts
git commit -m "feat: add BackgroundMusic interface"
```

---

## Task 2: Create New Template Hierarchy Structure

**Files:**
- Modify: `constants.tsx:4-80`

**Step 1: Update TemplateCategory interface to support subgroups**

Replace lines 4-10 in constants.tsx:

```typescript
export interface TemplateSubgroup {
  id: string;
  name: string;
  description: string;
  templates: ScriptTemplate[];
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: 'sparkle' | 'story';
  subgroups: TemplateSubgroup[];
}
```

**Step 2: Run build to see expected errors**

Run: `npm run build`
Expected: FAIL - TEMPLATE_CATEGORIES structure doesn't match new interface

**Step 3: Commit interface changes**

```bash
git add constants.tsx
git commit -m "feat: add TemplateSubgroup interface for 3-level hierarchy"
```

---

## Task 3: Restructure Meditation Templates

**Files:**
- Modify: `constants.tsx:12-44`

**Step 1: Reorganize meditation category with subgroups**

Replace the manifesting category (lines 12-44) with:

```typescript
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'meditation',
    name: 'Meditation',
    description: 'Guided meditations for transformation and inner peace',
    icon: 'sparkle',
    subgroups: [
      {
        id: 'happiness',
        name: 'Happiness',
        description: 'Cultivate joy, gratitude, and inner peace',
        templates: [
          {
            id: 'self-love',
            title: 'Self-Love & Confidence',
            description: 'Manifest unshakeable confidence and deep self-worth.',
            prompt: 'Create a transformative self-love meditation that helps the listener see themselves through eyes of unconditional love. Include mirror visualization, healing inner child work, and powerful affirmations of worthiness. End with feeling radiantly confident and magnetically attractive.'
          },
          {
            id: 'gratitude',
            title: 'Gratitude Flow',
            description: 'Open your heart to appreciation and abundance.',
            prompt: 'Write a heartfelt gratitude meditation. Guide the listener to reflect on blessings in their life - relationships, health, simple pleasures. Include visualization of gratitude as warm golden light filling the heart. End with feeling deeply thankful and at peace.'
          }
        ]
      },
      {
        id: 'money',
        name: 'Money & Abundance',
        description: 'Attract wealth, prosperity, and financial freedom',
        templates: [
          {
            id: 'abundance',
            title: 'Abundance Flow',
            description: 'Open yourself to unlimited wealth and prosperity.',
            prompt: 'Create a powerful 5-minute manifesting meditation for attracting financial abundance. Use visualization of golden light flowing through the body, affirmations of worthiness, and imagery of money flowing effortlessly. Include gratitude for current blessings and certainty that more is coming.'
          },
          {
            id: 'success-mindset',
            title: 'Success Mindset',
            description: 'Reprogram your mind for unstoppable success.',
            prompt: 'Write a powerful success manifesting meditation. Include visualization of achieving major goals, standing ovations, celebrating wins, and feeling deeply fulfilled. Use anchoring techniques to lock in the feeling of success. Include affirmations about being destined for greatness.'
          }
        ]
      },
      {
        id: 'health',
        name: 'Health & Vitality',
        description: 'Heal your body and cultivate radiant wellness',
        templates: [
          {
            id: 'healing-light',
            title: 'Healing Light',
            description: 'Channel healing energy throughout your body.',
            prompt: 'Create a healing meditation where warm, golden healing light enters through the crown and flows through every cell of the body. Focus on releasing tension, pain, and illness. Include visualization of cells regenerating and the body returning to perfect health. End feeling vibrant and whole.'
          },
          {
            id: 'dream-life',
            title: 'Dream Life Vision',
            description: 'Visualize your ideal life in vivid detail.',
            prompt: 'Write an immersive manifesting meditation where the listener walks through their perfect day in their dream life. Include waking up in their ideal home, doing work they love, surrounded by loving relationships, feeling complete health and vitality. Make it sensory-rich and emotionally powerful.'
          }
        ]
      }
    ]
  },
```

**Step 2: Run build to verify meditation structure**

Run: `npm run build`
Expected: FAIL - stories category still uses old structure

**Step 3: Commit meditation restructure**

```bash
git add constants.tsx
git commit -m "feat: restructure meditation templates with happiness/money/health subgroups"
```

---

## Task 4: Restructure Stories Templates

**Files:**
- Modify: `constants.tsx` (stories section)

**Step 1: Reorganize stories category with subgroups**

Add after the meditation category (continuing TEMPLATE_CATEGORIES array):

```typescript
  {
    id: 'stories',
    name: 'Stories',
    description: 'Immersive narrative journeys for relaxation and escape',
    icon: 'story',
    subgroups: [
      {
        id: 'bedtime',
        name: 'Bedtime',
        description: 'Drift into peaceful sleep with calming tales',
        templates: [
          {
            id: 'enchanted-forest',
            title: 'The Enchanted Forest',
            description: 'Wander through a magical woodland filled with wonder.',
            prompt: 'Write an immersive bedtime story about discovering a hidden enchanted forest. Include glowing mushrooms, friendly woodland creatures, a wise ancient oak tree that shares life wisdom, and a peaceful clearing where the listener can rest. Make it dreamy, slow-paced, and deeply calming.'
          },
          {
            id: 'ocean-voyage',
            title: 'Midnight Ocean Voyage',
            description: 'Sail across calm seas under a blanket of stars.',
            prompt: 'Create a sleep story about a peaceful nighttime boat journey across a calm, moonlit ocean. Include the gentle rocking of the boat, the sound of waves, bioluminescent creatures glowing in the water, and constellations telling ancient stories overhead. End with drifting into peaceful sleep.'
          }
        ]
      },
      {
        id: 'afternoon',
        name: 'Afternoon',
        description: 'Relaxing escapes for daytime unwinding',
        templates: [
          {
            id: 'mountain-retreat',
            title: 'Mountain Sanctuary',
            description: 'Find peace in a cozy cabin high in the misty mountains.',
            prompt: 'Write a relaxing story about discovering a hidden cabin in the mountains. Include the journey up through misty forests, arriving at a warm cabin with a crackling fireplace, hot tea, soft blankets, and snow gently falling outside. Describe the deep silence and peace of being far from the world.'
          },
          {
            id: 'garden-meditation',
            title: 'Secret Garden',
            description: 'Discover a hidden garden of tranquility.',
            prompt: 'Create a peaceful story about finding a secret walled garden. Include wandering through fragrant flowers, sitting by a gentle fountain, watching butterflies dance, and feeling the warm sun on your skin. Make it sensory-rich and deeply calming for afternoon relaxation.'
          }
        ]
      },
      {
        id: 'morning',
        name: 'Morning',
        description: 'Energizing stories to start your day with intention',
        templates: [
          {
            id: 'space-journey',
            title: 'Journey Through the Stars',
            description: 'Float weightlessly through the cosmos.',
            prompt: 'Create a story about floating peacefully through space. Include passing colorful nebulas, watching distant galaxies spin, feeling completely weightless and free, and being held safely by the universe. Make it awe-inspiring yet grounding, perfect for starting the day with wonder.'
          },
          {
            id: 'sunrise-beach',
            title: 'Sunrise Beach Walk',
            description: 'Greet the day on a peaceful shoreline.',
            prompt: 'Write an uplifting morning story about walking along a beautiful beach at sunrise. Include the soft sand beneath your feet, gentle waves, seabirds calling, and the golden sun rising over the horizon. Fill the listener with hope, energy, and gratitude for the new day.'
          }
        ]
      }
    ]
  }
];
```

**Step 2: Update the TEMPLATES flattening logic**

Replace line 80:

```typescript
// Flattened templates for backwards compatibility
export const TEMPLATES: ScriptTemplate[] = TEMPLATE_CATEGORIES.flatMap(cat =>
  cat.subgroups.flatMap(subgroup => subgroup.templates)
);
```

**Step 3: Run build to verify complete structure**

Run: `npm run build`
Expected: Build succeeds (App.tsx will have type errors next)

**Step 4: Commit stories restructure**

```bash
git add constants.tsx
git commit -m "feat: restructure stories templates with bedtime/afternoon/morning subgroups"
```

---

## Task 5: Add Background Music Tracks

**Files:**
- Modify: `constants.tsx` (after VOICE_PROFILES)

**Step 1: Add BACKGROUND_TRACKS constant**

Add after VOICE_PROFILES (around line 90):

```typescript
export interface BackgroundTrack {
  id: string;
  name: string;
  description: string;
  category: 'ambient' | 'nature' | 'binaural' | 'instrumental';
  previewUrl?: string; // For future use
}

export const BACKGROUND_TRACKS: BackgroundTrack[] = [
  { id: 'none', name: 'No Music', description: 'Voice only, no background', category: 'ambient' },
  { id: 'rain', name: 'Gentle Rain', description: 'Soft rainfall for deep relaxation', category: 'nature' },
  { id: 'ocean', name: 'Ocean Waves', description: 'Rhythmic waves on a peaceful shore', category: 'nature' },
  { id: 'forest', name: 'Forest Ambience', description: 'Birds and rustling leaves', category: 'nature' },
  { id: 'space', name: 'Cosmic Drift', description: 'Deep space ambient tones', category: 'ambient' },
  { id: 'piano', name: 'Soft Piano', description: 'Gentle piano melodies', category: 'instrumental' },
  { id: 'binaural-alpha', name: 'Alpha Waves', description: '10Hz for relaxation and creativity', category: 'binaural' },
  { id: 'binaural-theta', name: 'Theta Waves', description: '6Hz for deep meditation', category: 'binaural' },
];
```

**Step 2: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit background tracks**

```bash
git add constants.tsx
git commit -m "feat: add BACKGROUND_TRACKS constant for music selection"
```

---

## Task 6: Update Template Modal UI - Part 1 (Structure)

**Files:**
- Modify: `App.tsx:863-924`

**Step 1: Add state for selected subgroup**

Add near other modal states (around line 25):

```typescript
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const [selectedSubgroup, setSelectedSubgroup] = useState<string | null>(null);
```

**Step 2: Update imports**

Update the constants import (line 4):

```typescript
import { TEMPLATE_CATEGORIES, VOICE_PROFILES, ICONS, BACKGROUND_TRACKS, BackgroundTrack } from './constants';
```

**Step 3: Run build to check imports**

Run: `npm run build`
Expected: May have errors in modal rendering (expected)

**Step 4: Commit state additions**

```bash
git add App.tsx
git commit -m "feat: add category/subgroup selection state for template modal"
```

---

## Task 7: Update Template Modal UI - Part 2 (Rendering)

**Files:**
- Modify: `App.tsx:863-924`

**Step 1: Replace template modal content**

Replace lines 879-921 (the modal content after back button):

```typescript
            <div className="w-full max-w-5xl mx-auto space-y-8 relative py-16 md:py-20">
              <div className="text-center space-y-4">
                <div className="inline-block px-4 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-[0.4em]">Templates</div>
                <h3 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-tight">
                  {selectedSubgroup
                    ? TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.subgroups.find(s => s.id === selectedSubgroup)?.name
                    : selectedCategory
                      ? TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.name
                      : 'Choose a Category'}
                </h3>
                <p className="text-slate-500 text-sm md:text-base max-w-lg mx-auto">
                  {selectedSubgroup
                    ? TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.subgroups.find(s => s.id === selectedSubgroup)?.description
                    : selectedCategory
                      ? TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.description
                      : 'Select from meditation or immersive stories.'}
                </p>
              </div>

              {/* Breadcrumb Navigation */}
              {(selectedCategory || selectedSubgroup) && (
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => { setSelectedCategory(null); setSelectedSubgroup(null); }}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    All
                  </button>
                  {selectedCategory && (
                    <>
                      <span className="text-slate-600">/</span>
                      <button
                        onClick={() => setSelectedSubgroup(null)}
                        className={`transition-colors ${selectedSubgroup ? 'text-slate-400 hover:text-white' : 'text-white'}`}
                      >
                        {TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.name}
                      </button>
                    </>
                  )}
                  {selectedSubgroup && (
                    <>
                      <span className="text-slate-600">/</span>
                      <span className="text-white">
                        {TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.subgroups.find(s => s.id === selectedSubgroup)?.name}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Level 1: Categories */}
              {!selectedCategory && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {TEMPLATE_CATEGORIES.map(category => (
                    <GlassCard
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`!p-8 !rounded-3xl cursor-pointer border border-transparent transition-all hover:scale-[1.02] ${
                        category.id === 'meditation'
                          ? 'hover:border-indigo-500/30 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)]'
                          : 'hover:border-pink-500/30 hover:shadow-[0_0_30px_rgba(236,72,153,0.1)]'
                      }`}
                    >
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                        category.id === 'meditation'
                          ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20'
                          : 'bg-gradient-to-br from-pink-500/20 to-purple-500/20'
                      }`}>
                        {category.icon === 'sparkle' ? <ICONS.Sparkle className="w-8 h-8" /> : <ICONS.Book className="w-8 h-8" />}
                      </div>
                      <h4 className="text-2xl font-bold text-white mb-2">{category.name}</h4>
                      <p className="text-slate-400 mb-4">{category.description}</p>
                      <div className="text-xs text-slate-500">{category.subgroups.length} subcategories</div>
                    </GlassCard>
                  ))}
                </div>
              )}

              {/* Level 2: Subgroups */}
              {selectedCategory && !selectedSubgroup && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.subgroups.map(subgroup => (
                    <GlassCard
                      key={subgroup.id}
                      onClick={() => setSelectedSubgroup(subgroup.id)}
                      className={`!p-6 !rounded-2xl cursor-pointer border border-transparent transition-all hover:scale-[1.02] ${
                        selectedCategory === 'meditation'
                          ? 'hover:border-indigo-500/30'
                          : 'hover:border-pink-500/30'
                      }`}
                    >
                      <h5 className="text-lg font-bold text-white mb-1">{subgroup.name}</h5>
                      <p className="text-sm text-slate-400 mb-3">{subgroup.description}</p>
                      <div className="text-xs text-slate-500">{subgroup.templates.length} templates</div>
                    </GlassCard>
                  ))}
                </div>
              )}

              {/* Level 3: Templates */}
              {selectedSubgroup && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TEMPLATE_CATEGORIES
                    .find(c => c.id === selectedCategory)
                    ?.subgroups.find(s => s.id === selectedSubgroup)
                    ?.templates.map(template => (
                      <GlassCard
                        key={template.id}
                        onClick={() => handleSelectTemplate(template.prompt)}
                        className={`!p-5 !rounded-2xl cursor-pointer border border-transparent transition-all ${
                          selectedCategory === 'meditation'
                            ? 'hover:border-indigo-500/30'
                            : 'hover:border-pink-500/30'
                        }`}
                      >
                        <h5 className="text-base font-bold text-white mb-1.5">{template.title}</h5>
                        <p className="text-sm text-slate-400 leading-relaxed">{template.description}</p>
                        <div className={`mt-3 text-[10px] font-bold uppercase tracking-widest ${
                          selectedCategory === 'meditation' ? 'text-indigo-400' : 'text-pink-400'
                        }`}>
                          Use Template →
                        </div>
                      </GlassCard>
                    ))}
                </div>
              )}
            </div>
```

**Step 2: Run build and test**

Run: `npm run build && npm run dev`
Expected: Build succeeds, modal shows hierarchical navigation

**Step 3: Commit modal UI update**

```bash
git add App.tsx
git commit -m "feat: implement 3-level hierarchical template browser UI"
```

---

## Task 8: Add Music Selector State

**Files:**
- Modify: `App.tsx`

**Step 1: Add background music state**

Add near other state declarations (around line 20):

```typescript
const [selectedMusic, setSelectedMusic] = useState<BackgroundTrack>(BACKGROUND_TRACKS[0]);
const [showMusicSelector, setShowMusicSelector] = useState(false);
```

**Step 2: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit music state**

```bash
git add App.tsx
git commit -m "feat: add selectedMusic state for background track selection"
```

---

## Task 9: Add Music Selector UI in HOME View

**Files:**
- Modify: `App.tsx` (HOME view section)

**Step 1: Add music selector button after voice selector**

Find the voice selector button in HOME view and add after it:

```typescript
                {/* Music Selector */}
                <button
                  onClick={() => setShowMusicSelector(true)}
                  className="w-full glass !rounded-2xl p-4 flex items-center gap-4 text-left transition-all hover:bg-white/5 focus-ring group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                    <ICONS.Waveform className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-0.5">Background Music</div>
                    <div className="text-white font-medium truncate">{selectedMusic.name}</div>
                  </div>
                  <ICONS.ArrowBack className="w-5 h-5 text-slate-600 rotate-180 group-hover:translate-x-1 transition-transform" />
                </button>
```

**Step 2: Run dev server to test**

Run: `npm run dev`
Expected: Music selector button appears below voice selector

**Step 3: Commit music button**

```bash
git add App.tsx
git commit -m "feat: add music selector button in HOME view"
```

---

## Task 10: Add Music Selector Modal

**Files:**
- Modify: `App.tsx` (add modal before AuthModal)

**Step 1: Add music selector modal**

Add before the AuthModal section:

```typescript
        {/* MODAL: Music Selector */}
        {showMusicSelector && (
          <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex flex-col p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
            <Starfield />

            {/* Back Button */}
            <button
              onClick={() => setShowMusicSelector(false)}
              className="fixed top-6 left-6 md:top-8 md:left-8 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-10"
            >
              <div className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
                <ICONS.ArrowBack className="w-5 h-5" />
              </div>
              <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.3em]">Back</span>
            </button>

            <div className="w-full max-w-3xl mx-auto space-y-8 relative py-16 md:py-20">
              <div className="text-center space-y-4">
                <div className="inline-block px-4 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.4em]">Background Music</div>
                <h3 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-tight">Choose Your Soundscape</h3>
                <p className="text-slate-500 text-sm md:text-base max-w-lg mx-auto">Add ambient sounds to enhance your meditation experience.</p>
              </div>

              {/* Music Categories */}
              {(['nature', 'ambient', 'binaural', 'instrumental'] as const).map(category => {
                const tracks = BACKGROUND_TRACKS.filter(t => t.category === category || (category === 'ambient' && t.id === 'none'));
                if (tracks.length === 0) return null;
                return (
                  <div key={category} className="space-y-4">
                    <h4 className="text-lg font-bold text-white capitalize">{category === 'binaural' ? 'Binaural Beats' : category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {tracks.map(track => (
                        <GlassCard
                          key={track.id}
                          onClick={() => {
                            setSelectedMusic(track);
                            setShowMusicSelector(false);
                          }}
                          className={`!p-4 !rounded-xl cursor-pointer border transition-all ${
                            selectedMusic.id === track.id
                              ? 'border-emerald-500/50 bg-emerald-500/10'
                              : 'border-transparent hover:border-emerald-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              selectedMusic.id === track.id
                                ? 'bg-emerald-500/30'
                                : 'bg-white/5'
                            }`}>
                              <ICONS.Waveform className={`w-5 h-5 ${selectedMusic.id === track.id ? 'text-emerald-400' : 'text-slate-400'}`} />
                            </div>
                            <div className="flex-1">
                              <h5 className="text-white font-medium">{track.name}</h5>
                              <p className="text-xs text-slate-500">{track.description}</p>
                            </div>
                            {selectedMusic.id === track.id && (
                              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </GlassCard>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
```

**Step 2: Run dev server and test**

Run: `npm run dev`
Expected: Music selector modal opens, tracks can be selected

**Step 3: Commit music modal**

```bash
git add App.tsx
git commit -m "feat: add music selector modal with categorized tracks"
```

---

## Task 11: Reset Template Selection on Modal Close

**Files:**
- Modify: `App.tsx`

**Step 1: Update modal close handler**

Find the back button in the templates modal and update:

```typescript
            <button
              onClick={() => {
                setShowTemplatesModal(false);
                setSelectedCategory(null);
                setSelectedSubgroup(null);
              }}
```

**Step 2: Also reset on template selection**

Update handleSelectTemplate:

```typescript
  const handleSelectTemplate = (prompt: string) => {
    setScript(prompt);
    setShowTemplatesModal(false);
    setSelectedCategory(null);
    setSelectedSubgroup(null);
  };
```

**Step 3: Run and test**

Run: `npm run dev`
Expected: Modal resets to category view when reopened

**Step 4: Commit reset logic**

```bash
git add App.tsx
git commit -m "fix: reset template selection state on modal close"
```

---

## Task 12: Final Build Verification

**Step 1: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Preview production build**

Run: `npm run preview`
Expected: App works correctly with new template hierarchy and music selector

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete template hierarchy and background music feature"
```

---

## Summary

**Files Modified:**
- `types.ts` - Added BackgroundMusic interface
- `constants.tsx` - New TemplateSubgroup interface, restructured TEMPLATE_CATEGORIES, added BACKGROUND_TRACKS
- `App.tsx` - Added state, updated template modal with 3-level navigation, added music selector

**New Template Structure:**
```
Meditation/
├── Happiness/ (2 templates)
├── Money & Abundance/ (2 templates)
└── Health & Vitality/ (2 templates)

Stories/
├── Bedtime/ (2 templates)
├── Afternoon/ (2 templates)
└── Morning/ (2 templates)
```

**Background Music Options:**
- No Music (default)
- Nature: Gentle Rain, Ocean Waves, Forest Ambience
- Ambient: Cosmic Drift
- Instrumental: Soft Piano
- Binaural: Alpha Waves (10Hz), Theta Waves (6Hz)

**Note:** The background music URLs are placeholders. In a future task, you'll need to either:
1. Add actual audio file URLs to the tracks
2. Generate ambient audio using Web Audio API oscillators
3. Integrate with an audio library/CDN
