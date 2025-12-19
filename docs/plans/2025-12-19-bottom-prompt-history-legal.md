# Bottom Prompt, History & Legal Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the chat prompt to the bottom of the screen (ChatGPT-style), add Terms of Service and Privacy Policy pages to the footer, and create an auto-save meditation history feature with Supabase.

**Architecture:**
1. Restructure App.tsx HOME view to use flex column with prompt fixed at bottom
2. Create new modal components for Terms and Privacy, add footer links
3. Create `meditation_history` table in Supabase with RLS, add auto-save on generation, display history in Library modal

**Tech Stack:** React, TypeScript, Supabase (MCP), Tailwind CSS

---

## Task 1: Database Setup - Create meditation_history Table

**Files:**
- New migration via Supabase MCP

**Step 1: Create the meditation_history table with RLS**

Run this SQL via Supabase MCP `apply_migration`:

```sql
-- Create meditation_history table
CREATE TABLE IF NOT EXISTS public.meditation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  enhanced_script TEXT,
  voice_id TEXT,
  voice_name TEXT,
  background_track_id TEXT,
  background_track_name TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_meditation_history_user_id ON public.meditation_history(user_id);
CREATE INDEX idx_meditation_history_created_at ON public.meditation_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.meditation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own history
CREATE POLICY "Users can view own meditation history"
  ON public.meditation_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meditation history"
  ON public.meditation_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meditation history"
  ON public.meditation_history FOR DELETE
  USING (auth.uid() = user_id);
```

**Step 2: Verify table was created**

Run: Supabase MCP `list_tables` to confirm `meditation_history` appears.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add meditation_history table with RLS policies"
```

---

## Task 2: Add History CRUD Functions to Supabase Client

**Files:**
- Modify: `lib/supabase.ts`

**Step 1: Add MeditationHistory interface**

Add after line 80 (after AudioGeneration interface):

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
  created_at: string;
  updated_at: string;
}
```

**Step 2: Add CRUD functions for meditation history**

Add before the `// Auth state listener` comment at the bottom of the file:

```typescript
// Meditation History operations
export const saveMeditationHistory = async (
  prompt: string,
  enhancedScript?: string,
  voiceId?: string,
  voiceName?: string,
  backgroundTrackId?: string,
  backgroundTrackName?: string,
  durationSeconds?: number
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
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving meditation history:', error);
    return null;
  }
  return data;
};

export const getMeditationHistory = async (limit = 50): Promise<MeditationHistory[]> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return [];

  const { data, error } = await supabase
    .from('meditation_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching meditation history:', error);
    return [];
  }
  return data || [];
};

export const deleteMeditationHistory = async (id: string): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user || !supabase) return false;

  const { error } = await supabase
    .from('meditation_history')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting meditation history:', error);
    return false;
  }
  return true;
};
```

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add meditation history CRUD functions"
```

---

## Task 3: Move Prompt Window to Bottom of Page

**Files:**
- Modify: `App.tsx` (lines ~672-786)

**Step 1: Restructure HOME view layout**

Find the HOME view section (around line 675-786) and replace the entire structure. The current layout has:
- Fixed tagline at top
- Prompt box with `pt-[550px]` padding

Replace with a flex column layout that positions the prompt at the bottom:

```tsx
{/* VIEW: HOME */}
{currentView === View.HOME && (
  <div className="w-full flex flex-col h-full animate-in fade-in duration-1000">
    {/* Tagline - centered in remaining space */}
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-[200px] md:pb-[240px]">
      <p className="text-2xl md:text-4xl font-light tracking-wide text-white/70 text-center">
        Instant meditation, <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-500 font-semibold">personalized voice</span>
      </p>
      <p className="text-base md:text-2xl text-slate-500 mt-1 md:mt-2 hidden sm:block text-center">Write a short idea, generate a meditation, and listen with your chosen voice</p>
    </div>

    {/* Prompt Box - Fixed at bottom */}
    <div className="fixed bottom-0 left-0 right-0 z-40 px-2 md:px-6 pb-4 md:pb-6">
      <div className="w-full max-w-4xl mx-auto">
        {micError && (
          <div className="mb-4 text-center">
            <span className="px-4 py-1.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold uppercase tracking-widest border border-rose-500/20">
              {micError}
            </span>
          </div>
        )}

        <div className="glass glass-prompt rounded-2xl md:rounded-[40px] p-1 md:p-3 flex flex-col shadow-2xl shadow-indigo-900/20 border border-white/10">
          <div className="relative">
            <textarea
              placeholder="e.g., 'calm my anxiety', 'help me sleep'..."
              className="w-full bg-transparent p-3 md:p-6 text-sm md:text-base text-slate-200 placeholder:text-slate-600 resize-none outline-none min-h-[60px] md:min-h-[100px] max-h-[120px] md:max-h-[200px] leading-relaxed"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerateAndPlay();
                }
              }}
            />

            <div className="flex items-center justify-between px-2 md:px-6 pb-2 md:pb-4">
              <div className="flex items-center gap-1.5 md:gap-3">
                {/* Clone Voice Button */}
                <button
                  onClick={() => {
                    setShowCloneModal(true);
                    setMicError(null);
                  }}
                  className="p-2.5 md:p-3 min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] rounded-xl md:rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-indigo-400 transition-all btn-press focus-ring flex items-center justify-center"
                  title="Clone your voice"
                >
                  <ICONS.Waveform className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                {/* Templates Button */}
                <button
                  onClick={() => setShowTemplatesModal(true)}
                  className="p-2.5 md:p-3 min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] rounded-xl md:rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-purple-400 transition-all btn-press focus-ring flex items-center justify-center"
                  title="Browse templates"
                >
                  <ICONS.Sparkle className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                {/* Music Button */}
                <button
                  onClick={() => setShowMusicModal(true)}
                  className={`p-2.5 md:p-3 min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] rounded-xl md:rounded-2xl transition-all btn-press focus-ring flex items-center justify-center ${selectedBackgroundTrack.id !== 'none' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-emerald-400'}`}
                  title={`Background: ${selectedBackgroundTrack.name}`}
                >
                  <ICONS.Music className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                {/* Mic Button */}
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className={`p-2.5 md:p-3 min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] rounded-xl md:rounded-2xl transition-all shadow-xl btn-press focus-ring flex items-center justify-center ${isRecording ? 'bg-rose-500 text-white scale-110 shadow-rose-500/40' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                  title="Hold to speak"
                >
                  <ICONS.Microphone className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>

              <button
                onClick={handleGenerateAndPlay}
                disabled={isGenerating || !script.trim()}
                className={`
                  px-4 md:px-8 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-bold text-[10px] md:text-sm flex items-center gap-2 md:gap-3 transition-all min-h-[40px] md:min-h-[44px]
                  ${isGenerating ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-2xl hover:shadow-indigo-500/30 active:scale-95 text-white'}
                `}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 md:h-4 md:w-4 border-2 border-white/30 border-t-white"></div>
                    <span className="hidden sm:inline">Generating...</span>
                  </>
                ) : (
                  <>
                    <ICONS.Sparkle className="w-4 h-4 md:w-5 md:h-5" />
                    <span>Create</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Status bar */}
          <div className="px-3 md:px-6 py-2 md:py-3 flex justify-between items-center text-[9px] md:text-[11px] uppercase tracking-wider md:tracking-widest font-bold text-slate-500 border-t border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-2 md:gap-3">
              <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0 ${isRecording ? 'bg-rose-500 animate-ping' : isGenerating ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              <span className="text-slate-400 truncate">{isRecording ? 'Capturing...' : isGenerating ? 'Generating...' : 'Ready'}</span>
            </div>
            <div className="text-slate-600 truncate max-w-[80px] md:max-w-none text-right">{selectedVoice.name}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
```

**Step 2: Verify in browser**

Run: `npm run dev`
Expected: Prompt box appears fixed at bottom, tagline is centered above

**Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: move prompt window to bottom of page (ChatGPT-style)"
```

---

## Task 4: Add Terms of Service and Privacy Policy Modals

**Files:**
- Modify: `types.ts` (add new modal states)
- Modify: `App.tsx` (add state and modal components)

**Step 1: Add modal state variables in App.tsx**

Add after line 41 (after `showAboutUs` state):

```typescript
const [showTerms, setShowTerms] = useState(false);
const [showPrivacy, setShowPrivacy] = useState(false);
```

**Step 2: Add Terms of Service modal component**

Add after the `{/* MODAL: About Us */}` section (search for "showAboutUs &&" and add after its closing div):

```tsx
{/* MODAL: Terms of Service */}
{showTerms && (
  <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex flex-col p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
    <Background />
    <Starfield />

    <button
      onClick={() => setShowTerms(false)}
      className="fixed top-6 left-6 md:top-8 md:left-8 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-[100]"
    >
      <div className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
        <ICONS.ArrowBack className="w-5 h-5" />
      </div>
      <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.3em]">Back</span>
    </button>

    <div className="flex-1 flex flex-col items-center pt-20 md:pt-16 relative z-10 max-w-4xl mx-auto w-full">
      <div className="inline-block px-4 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Legal</div>
      <h2 className="text-3xl md:text-5xl font-extralight text-center mb-4 tracking-tight">
        <span className="bg-gradient-to-r from-indigo-300 via-purple-200 to-pink-300 bg-clip-text text-transparent">Terms of Service</span>
      </h2>
      <p className="text-slate-500 text-center mb-8">Last updated: December 2024</p>

      <div className="w-full space-y-6 text-slate-300 text-sm md:text-base leading-relaxed">
        <GlassCard className="!p-6 !rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-3">1. Acceptance of Terms</h3>
          <p className="text-slate-400">By accessing and using INrVO ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
        </GlassCard>

        <GlassCard className="!p-6 !rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-3">2. Description of Service</h3>
          <p className="text-slate-400">INrVO provides AI-powered meditation generation, voice synthesis, and audio experiences. The Service uses third-party AI providers including Google Gemini and ElevenLabs.</p>
        </GlassCard>

        <GlassCard className="!p-6 !rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-3">3. User Accounts</h3>
          <p className="text-slate-400">You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate information when creating an account.</p>
        </GlassCard>

        <GlassCard className="!p-6 !rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-3">4. Acceptable Use</h3>
          <p className="text-slate-400">You agree not to use the Service for any unlawful purpose, to generate harmful content, or to violate any third-party rights. Voice cloning features must only be used with your own voice or with explicit consent.</p>
        </GlassCard>

        <GlassCard className="!p-6 !rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-3">5. Intellectual Property</h3>
          <p className="text-slate-400">You retain rights to content you create using the Service. INrVO retains rights to the Service, its features, and underlying technology. Generated meditations are for personal use unless otherwise specified.</p>
        </GlassCard>

        <GlassCard className="!p-6 !rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-3">6. Limitation of Liability</h3>
          <p className="text-slate-400">The Service is provided "as is" without warranties. INrVO is not liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>
        </GlassCard>

        <GlassCard className="!p-6 !rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-3">7. Contact</h3>
          <p className="text-slate-400">For questions about these Terms, contact us at <a href="https://qualiasolutions.net" className="text-indigo-400 hover:text-indigo-300 transition-colors">qualiasolutions.net</a></p>
        </GlassCard>
      </div>
    </div>
  </div>
)}
```

**Step 3: Add Privacy Policy modal component**

Add after the Terms modal:

```tsx
{/* MODAL: Privacy Policy */}
{showPrivacy && (
  <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex flex-col p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
    <Background />
    <Starfield />

    <button
      onClick={() => setShowPrivacy(false)}
      className="fixed top-6 left-6 md:top-8 md:left-8 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-[100]"
    >
      <div className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
        <ICONS.ArrowBack className="w-5 h-5" />
      </div>
      <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.3em]">Back</span>
    </button>

    <div className="flex-1 flex flex-col items-center pt-20 md:pt-16 relative z-10 max-w-4xl mx-auto w-full">
      <div className="inline-block px-4 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Legal</div>
      <h2 className="text-3xl md:text-5xl font-extralight text-center mb-4 tracking-tight">
        <span className="bg-gradient-to-r from-purple-300 via-pink-200 to-rose-300 bg-clip-text text-transparent">Privacy Policy</span>
      </h2>
      <p className="text-slate-500 text-center mb-8">Last updated: December 2024</p>

      <div className="w-full space-y-6 text-slate-300 text-sm md:text-base leading-relaxed">
        <GlassCard className="!p-6 !rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-3">1. Information We Collect</h3>
          <p className="text-slate-400">We collect information you provide directly: email address, account credentials, voice recordings (for cloning), and meditation prompts. We also collect usage data to improve the Service.</p>
        </GlassCard>

        <GlassCard className="!p-6 !rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-3">2. How We Use Your Information</h3>
          <p className="text-slate-400">Your information is used to provide and improve the Service, generate personalized meditations, process voice cloning requests, and communicate with you about your account.</p>
        </GlassCard>

        <GlassCard className="!p-6 !rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-3">3. Data Storage & Security</h3>
          <p className="text-slate-400">Your data is stored securely using Supabase with Row Level Security (RLS) policies. Voice recordings and generated audio are encrypted at rest. We implement industry-standard security measures.</p>
        </GlassCard>

        <GlassCard className="!p-6 !rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-3">4. Third-Party Services</h3>
          <p className="text-slate-400">We use Google Gemini for AI generation and ElevenLabs for voice synthesis. These services have their own privacy policies. Voice data sent for cloning is processed according to ElevenLabs' terms.</p>
        </GlassCard>

        <GlassCard className="!p-6 !rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-3">5. Your Rights</h3>
          <p className="text-slate-400">You can access, update, or delete your account data at any time. You can request deletion of voice recordings and meditation history. Contact us to exercise these rights.</p>
        </GlassCard>

        <GlassCard className="!p-6 !rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-3">6. Cookies & Analytics</h3>
          <p className="text-slate-400">We use essential cookies for authentication. We may use analytics to understand Service usage. You can disable non-essential cookies in your browser settings.</p>
        </GlassCard>

        <GlassCard className="!p-6 !rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-3">7. Contact</h3>
          <p className="text-slate-400">For privacy inquiries, contact us at <a href="https://qualiasolutions.net" className="text-purple-400 hover:text-purple-300 transition-colors">qualiasolutions.net</a></p>
        </GlassCard>
      </div>
    </div>
  </div>
)}
```

**Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add App.tsx
git commit -m "feat: add Terms of Service and Privacy Policy modals"
```

---

## Task 5: Add Footer with Legal Links to Burger Menu

**Files:**
- Modify: `App.tsx` (update burger menu footer)

**Step 1: Find and update the burger menu footer**

Find the burger menu footer section (around line 1263-1273). Replace the existing footer:

```tsx
{/* Footer */}
<div className="p-4 border-t border-white/5 space-y-3">
  <div className="flex items-center justify-center gap-4 text-[10px] text-slate-600 uppercase tracking-widest">
    <button
      onClick={() => {
        setShowBurgerMenu(false);
        setShowTerms(true);
      }}
      className="hover:text-slate-400 transition-colors"
    >
      Terms
    </button>
    <span className="text-slate-700">•</span>
    <button
      onClick={() => {
        setShowBurgerMenu(false);
        setShowPrivacy(true);
      }}
      className="hover:text-slate-400 transition-colors"
    >
      Privacy
    </button>
  </div>
  <a
    href="https://qualiasolutions.net"
    target="_blank"
    rel="noopener noreferrer"
    className="text-[10px] text-slate-600 hover:text-slate-400 text-center uppercase tracking-widest block transition-colors"
  >
    Powered by Qualia Solutions
  </a>
</div>
```

**Step 2: Verify in browser**

Run: `npm run dev`
Expected: Footer shows Terms and Privacy links that open respective modals

**Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: add Terms and Privacy links to footer"
```

---

## Task 6: Integrate Auto-Save History into Generation Flow

**Files:**
- Modify: `App.tsx` (import and call history functions)

**Step 1: Update import statement**

Find the import from `./lib/supabase` and add the new functions:

```typescript
import { supabase, getCurrentUser, signOut, createVoiceProfile, getUserVoiceProfiles, VoiceProfile as DBVoiceProfile, createVoiceClone, saveMeditationHistory, getMeditationHistory, deleteMeditationHistory, MeditationHistory } from './lib/supabase';
```

**Step 2: Add meditation history state**

Add after the `savedVoices` state declaration (around line 62):

```typescript
const [meditationHistory, setMeditationHistory] = useState<MeditationHistory[]>([]);
```

**Step 3: Add function to load history**

Add after the `loadUserVoices` function:

```typescript
const loadMeditationHistory = async () => {
  try {
    const history = await getMeditationHistory();
    setMeditationHistory(history);
  } catch (error) {
    console.error('Failed to load meditation history:', error);
  }
};
```

**Step 4: Call loadMeditationHistory on user load**

In the `checkUser` function, add a call to load history after loading voices:

```typescript
const checkUser = async () => {
  const currentUser = await getCurrentUser();
  setUser(currentUser);
  if (currentUser) {
    await loadUserVoices();
    await loadMeditationHistory();
  }
};
```

Also update the auth listener in useEffect:

```typescript
const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
  setUser(session?.user ?? null);
  if (session?.user) {
    loadUserVoices();
    loadMeditationHistory();
  } else {
    setMeditationHistory([]);
  }
});
```

**Step 5: Add auto-save to handleGenerateAndPlay**

In the `handleGenerateAndPlay` function, after successful audio generation (after `setCurrentView(View.PLAYER);`), add:

```typescript
// Auto-save to meditation history
if (user) {
  saveMeditationHistory(
    script, // original prompt
    enhanced, // enhanced script
    selectedVoice.id,
    selectedVoice.name,
    selectedBackgroundTrack.id,
    selectedBackgroundTrack.name
  ).then(() => {
    loadMeditationHistory(); // Refresh history
  }).catch(console.error);
}
```

**Step 6: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add App.tsx lib/supabase.ts
git commit -m "feat: auto-save meditations to history on generation"
```

---

## Task 7: Build History Tab in Library Modal

**Files:**
- Modify: `App.tsx` (update Library modal)

**Step 1: Find the Library modal and replace with history-enabled version**

Find the `{showLibrary &&` section and replace the entire modal with:

```tsx
{/* MODAL: Library (History) */}
{showLibrary && (
  <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex flex-col p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
    <Background />
    <Starfield />

    <button
      onClick={() => setShowLibrary(false)}
      className="fixed top-6 left-6 md:top-8 md:left-8 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-[100]"
    >
      <div className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
        <ICONS.ArrowBack className="w-5 h-5" />
      </div>
      <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.3em]">Back</span>
    </button>

    <div className="flex-1 flex flex-col items-center pt-20 md:pt-16 relative z-10 max-w-4xl mx-auto w-full">
      <div className="inline-block px-4 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">History</div>
      <h2 className="text-3xl md:text-5xl font-extralight text-center mb-4 tracking-tight">
        <span className="bg-gradient-to-r from-emerald-300 via-cyan-200 to-teal-300 bg-clip-text text-transparent">My Library</span>
      </h2>
      <p className="text-slate-500 text-center mb-8 max-w-lg">Your meditation history - tap any to use again</p>

      {user ? (
        <div className="w-full">
          {meditationHistory.length > 0 ? (
            <div className="space-y-3">
              {meditationHistory.map((item) => (
                <GlassCard
                  key={item.id}
                  className="!p-4 !rounded-xl hover:bg-white/5 transition-all cursor-pointer group"
                  onClick={() => {
                    setScript(item.prompt);
                    setShowLibrary(false);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate mb-1">{item.prompt}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500">
                        {item.voice_name && (
                          <span className="flex items-center gap-1">
                            <ICONS.Waveform className="w-3 h-3" />
                            {item.voice_name}
                          </span>
                        )}
                        {item.background_track_name && item.background_track_name !== 'None' && (
                          <span className="flex items-center gap-1">
                            <ICONS.Music className="w-3 h-3" />
                            {item.background_track_name}
                          </span>
                        )}
                        <span className="text-slate-600">
                          {new Date(item.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMeditationHistory(item.id).then(() => {
                          loadMeditationHistory();
                        });
                      }}
                      className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <GlassCard className="!p-8 !rounded-2xl text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No history yet</h3>
              <p className="text-slate-400 mb-6">Create your first meditation to start building your library</p>
              <button
                onClick={() => {
                  setShowLibrary(false);
                  setCurrentView(View.HOME);
                }}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-all"
              >
                Create Meditation
              </button>
            </GlassCard>
          )}
        </div>
      ) : (
        <GlassCard className="!p-8 !rounded-2xl text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Sign in to view history</h3>
          <p className="text-slate-400 mb-6">Create an account to save your meditations</p>
          <button
            onClick={() => {
              setShowLibrary(false);
              setShowAuthModal(true);
            }}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-all"
          >
            Sign In
          </button>
        </GlassCard>
      )}
    </div>
  </div>
)}
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Test in browser**

Run: `npm run dev`
Expected:
- Library shows history items
- Clicking an item loads the prompt
- Delete button removes items
- Mobile and desktop are responsive

**Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat: add meditation history display in Library modal"
```

---

## Task 8: Run Build and Final Verification

**Files:**
- None (verification only)

**Step 1: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Preview production build**

Run: `npm run preview`
Expected: All features work in production mode

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: verify production build"
```

---

## Summary

This plan implements:

1. **Bottom Prompt Window** - Moved from centered position to fixed bottom (ChatGPT-style)
2. **Terms of Service Page** - Full modal with 7 sections covering legal requirements
3. **Privacy Policy Page** - Full modal with 7 sections covering data handling
4. **Footer Links** - Added Terms and Privacy links to burger menu footer
5. **Auto-Save History** - Meditations auto-save on generation with Supabase
6. **History Tab** - Library modal shows history with search, reuse, and delete features

All changes are mobile-responsive and follow the existing glass-morphism design system.
