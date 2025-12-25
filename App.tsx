
import React, { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { View, VoiceProfile, ScriptTimingMap, CloningStatus, CreditInfo, VoiceMetadata } from './types';
import { TEMPLATE_CATEGORIES, VOICE_PROFILES, ICONS, BACKGROUND_TRACKS, BackgroundTrack, AUDIO_TAG_CATEGORIES } from './constants';
import { useModals } from './src/contexts/ModalContext';
import { useVoice } from './src/contexts/VoiceContext';
import GlassCard from './components/GlassCard';
import Starfield from './components/Starfield';
import Background from './components/Background';
import LoadingScreen from './components/LoadingScreen';
import { AIVoiceInput } from './components/ui/ai-voice-input';

// Lazy-loaded components for bundle optimization (~400KB saved on initial load)
const Visualizer = lazy(() => import('./components/Visualizer'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const VoiceManager = lazy(() => import('./components/VoiceManager'));
const SimpleVoiceClone = lazy(() => import('./components/SimpleVoiceClone').then(m => ({ default: m.SimpleVoiceClone })));
const ScriptReader = lazy(() => import('./components/ScriptReader'));
const MeditationEditor = lazy(() => import('./src/components/MeditationEditor'));
const MeditationPlayer = lazy(() => import('./components/V0MeditationPlayer'));
// InlinePlayer removed - using only V0MeditationPlayer now
import { AgentChat } from './components/AgentChat';
import OfflineIndicator from './components/OfflineIndicator';
import { buildTimingMap, getCurrentWordIndex } from './src/lib/textSync';
import { geminiService, blobToBase64 } from './geminiService';
import { voiceService } from './src/lib/voiceService';
import { fishAudioCloneVoice } from './src/lib/edgeFunctions';
import { convertToWAV } from './src/lib/audioConverter';
import { creditService } from './src/lib/credits';

/**
 * Convert base64 audio to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}
import { throttleLeading } from './src/utils/debounce';
import { supabase, getCurrentUser, signOut, createVoiceProfile, getUserVoiceProfiles, getVoiceProfileById, VoiceProfile as DBVoiceProfile, createVoiceClone, saveMeditationHistory, getMeditationHistoryPaginated, deleteMeditationHistory, MeditationHistory, getAudioTagPreferences, updateAudioTagPreferences, AudioTagPreference, getMeditationAudioSignedUrl, toggleMeditationFavorite } from './lib/supabase';

// Rotating taglines - one shown randomly per session
const TAGLINES = [
  { main: 'Meditation,', highlight: 'made for you', sub: 'Just describe how you feel.' },
  { main: 'Your calm,', highlight: 'on demand', sub: 'Tell us what you need.' },
  { main: 'Wellness,', highlight: 'personalized', sub: 'Say what you are feeling.' },
  { main: 'Your moment of', highlight: 'calm', sub: 'Describe it. We create it.' },
  { main: 'Rest,', highlight: 'reimagined', sub: 'Just tell us what you need.' },
  { main: 'Designed', highlight: 'around you', sub: 'Describe your state of mind.' },
  { main: 'Your personal', highlight: 'sanctuary', sub: 'Say how you are feeling.' },
  { main: 'Peace,', highlight: 'on your terms', sub: 'Tell us what you seek.' },
];

const App: React.FC = () => {
  // Use centralized modal context
  const {
    showCloneModal, setShowCloneModal,
    showTemplatesModal, setShowTemplatesModal,
    showMusicModal, setShowMusicModal,
    showAudioTagsModal, setShowAudioTagsModal,
    showBurgerMenu, setShowBurgerMenu,
    showHowItWorks, setShowHowItWorks,
    showLibrary, setShowLibrary,
    showPricing, setShowPricing,
    showAboutUs, setShowAboutUs,
    showTerms, setShowTerms,
    showPrivacy, setShowPrivacy,
    showPromptMenu, setShowPromptMenu,
    showAuthModal, setShowAuthModal,
    showVoiceManager, setShowVoiceManager,
    closeAllModals,
  } = useModals();

  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [tagline] = useState(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);
  const [chatStarted, setChatStarted] = useState(false); // Track if user has started chatting
  const [script, setScript] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [generationStage, setGenerationStage] = useState<'idle' | 'script' | 'voice' | 'ready'>('idle');
  const [availableVoices, setAvailableVoices] = useState<VoiceProfile[]>(VOICE_PROFILES);
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile | null>(null);

  // Cloning states
  const [cloningStatus, setCloningStatus] = useState<CloningStatus>({ state: 'idle' });
  const [creditInfo, setCreditInfo] = useState<CreditInfo>({
    canClone: false,
    creditsRemaining: 0,
    clonesRemaining: 0,
    cloneCost: 5000,
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState<string | null>(null);
  const [selectedBackgroundTrack, setSelectedBackgroundTrack] = useState<BackgroundTrack>(BACKGROUND_TRACKS[0]);

  // Music preview state
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Audio tags states
  const [selectedAudioTags, setSelectedAudioTags] = useState<string[]>([]);
  const [audioTagsEnabled, setAudioTagsEnabled] = useState(false);
  const [favoriteAudioTags, setFavoriteAudioTags] = useState<string[]>([]);
  const [suggestedAudioTags, setSuggestedAudioTags] = useState<string[]>([]);

  // Keyword to tag mapping (memoized to prevent recreation)
  const keywordTagMap = useMemo(() => ({
    // Breathing related
    'breath': ['deep_breath', 'exhale'],
    'breathing': ['deep_breath', 'exhale'],
    'inhale': ['deep_breath'],
    'exhale': ['exhale'],
    // Pause/calm related
    'pause': ['short_pause', 'long_pause'],
    'calm': ['long_pause', 'silence'],
    'peace': ['long_pause', 'silence'],
    'quiet': ['silence'],
    'silent': ['silence'],
    'stillness': ['silence', 'long_pause'],
    // Sound related
    'laugh': ['giggling'],
    'happy': ['giggling'],
    'joy': ['giggling'],
    'gentle': ['soft_hum'],
    'hum': ['soft_hum'],
    // Voice related
    'whisper': ['whisper'],
    'soft': ['whisper', 'soft_hum'],
    'sigh': ['sigh'],
    'relax': ['sigh', 'deep_breath'],
    'release': ['sigh', 'exhale'],
  }), []);

  // Smart tag suggestions based on prompt content (memoized callback)
  const getSuggestedTags = useCallback((prompt: string): string[] => {
    const lowerPrompt = prompt.toLowerCase();
    const suggestions: string[] = [];

    // Check each keyword
    Object.entries(keywordTagMap).forEach(([keyword, tags]) => {
      if (lowerPrompt.includes(keyword)) {
        tags.forEach(tag => {
          if (!suggestions.includes(tag)) {
            suggestions.push(tag);
          }
        });
      }
    });

    // Limit to top 4 suggestions
    return suggestions.slice(0, 4);
  }, [keywordTagMap]);

  // Group tracks by category for music modal (memoized - static data)
  const tracksByCategory = useMemo(() =>
    BACKGROUND_TRACKS.reduce((acc, track) => {
      if (!acc[track.category]) acc[track.category] = [];
      acc[track.category].push(track);
      return acc;
    }, {} as Record<string, BackgroundTrack[]>),
  []);

  // Category config for styling (memoized - static data)
  const categoryConfig = useMemo(() => ({
    'ambient': { label: 'Ambient', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
    'nature': { label: 'Nature', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
    'binaural': { label: 'Binaural', color: 'text-violet-400', bgColor: 'bg-violet-500/10' },
    'instrumental': { label: 'Instrumental', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    'lofi': { label: 'Lo-Fi', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
    'classical': { label: 'Classical', color: 'text-rose-400', bgColor: 'bg-rose-500/10' },
  } as Record<string, { label: string; color: string; bgColor: string }>), []);

  // Library state with pagination
  const [libraryTab, setLibraryTab] = useState<'all' | 'favorites'>('all');
  const [meditationHistory, setMeditationHistory] = useState<MeditationHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [libraryPlayingId, setLibraryPlayingId] = useState<string | null>(null);
  const [libraryAudioRef, setLibraryAudioRef] = useState<HTMLAudioElement | null>(null);

  // Voice profile creation
  const [isProcessing, setIsProcessing] = useState(false); // Prevents double-clicks

  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Inline player state
  const [isInlineMode, setIsInlineMode] = useState(false);
  const [enhancedScript, setEnhancedScript] = useState('');
  const [restoredScript, setRestoredScript] = useState<string | null>(null);

  // Script edit preview state (after generation, before playing)
  const [showScriptPreview, setShowScriptPreview] = useState(false);
  const [editableScript, setEditableScript] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [timingMap, setTimingMap] = useState<ScriptTimingMap | null>(null);
  const playbackStartTimeRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastWordIndexRef = useRef(-1); // Track last word index to avoid unnecessary state updates

  // Background music refs
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const [backgroundVolume, setBackgroundVolume] = useState(0.3); // 30% default
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicError, setMusicError] = useState<string | null>(null);

  // Auth states
  const [user, setUser] = useState<any>(null);
  const [savedVoices, setSavedVoices] = useState<DBVoiceProfile[]>([]);
  const [currentClonedVoice, setCurrentClonedVoice] = useState<DBVoiceProfile | null>(null);

  // Voice clone recording states
  const [isRecordingClone, setIsRecordingClone] = useState(false);
  const [recordingProgressClone, setRecordingProgressClone] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  const [voiceSaved, setVoiceSaved] = useState(false);
  const [savedVoiceId, setSavedVoiceId] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const cloneMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const cloneChunksRef = useRef<Blob[]>([]);
  const scriptTextareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  // Check auth state on mount
  useEffect(() => {
    checkUser();

    // Only set up auth listener if supabase is available
    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Run initial data fetches in parallel for faster startup
        Promise.all([loadUserVoices(), loadAudioTagPrefs()]).catch(console.error);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Fetch meditation history when library or burger menu opens (with pagination)
  useEffect(() => {
    if ((showLibrary || showBurgerMenu) && user && meditationHistory.length === 0) {
      setIsLoadingHistory(true);
      setHistoryPage(0);
      getMeditationHistoryPaginated(0, 20)
        .then(result => {
          setMeditationHistory(result.data);
          setHasMoreHistory(result.hasMore);
        })
        .catch(err => console.error('Failed to load history:', err))
        .finally(() => setIsLoadingHistory(false));
    }
  }, [showLibrary, showBurgerMenu, user]);

  // Load more meditation history
  const loadMoreHistory = useCallback(async () => {
    if (isLoadingMore || !hasMoreHistory) return;

    setIsLoadingMore(true);
    try {
      const nextPage = historyPage + 1;
      const result = await getMeditationHistoryPaginated(nextPage, 20);
      setMeditationHistory(prev => [...prev, ...result.data]);
      setHistoryPage(nextPage);
      setHasMoreHistory(result.hasMore);
    } catch (err) {
      console.error('Failed to load more history:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [historyPage, hasMoreHistory, isLoadingMore]);

  // Library audio playback functions
  const playLibraryMeditation = async (meditation: MeditationHistory) => {
    if (!meditation.audio_url) return;

    // Stop any existing playback
    if (libraryAudioRef) {
      libraryAudioRef.pause();
      libraryAudioRef.currentTime = 0;
    }

    try {
      // Get signed URL for the audio
      const signedUrl = await getMeditationAudioSignedUrl(meditation.audio_url);
      if (!signedUrl) {
        console.error('Failed to get signed URL for meditation audio');
        return;
      }

      // Create and play audio
      const audio = new Audio(signedUrl);
      audio.onended = () => {
        setLibraryPlayingId(null);
        setLibraryAudioRef(null);
      };
      audio.onerror = (e) => {
        console.error('Error playing meditation audio:', e);
        setLibraryPlayingId(null);
        setLibraryAudioRef(null);
      };

      setLibraryAudioRef(audio);
      setLibraryPlayingId(meditation.id);
      await audio.play();
    } catch (error) {
      console.error('Error playing library meditation:', error);
      setLibraryPlayingId(null);
      setLibraryAudioRef(null);
    }
  };

  const stopLibraryPlayback = () => {
    if (libraryAudioRef) {
      libraryAudioRef.pause();
      libraryAudioRef.currentTime = 0;
    }
    setLibraryPlayingId(null);
    setLibraryAudioRef(null);
  };

  const handleToggleFavorite = async (id: string) => {
    const success = await toggleMeditationFavorite(id);
    if (success) {
      // Update local state
      setMeditationHistory(prev =>
        prev.map(m => m.id === id ? { ...m, is_favorite: !m.is_favorite } : m)
      );
    }
  };

  const handleDeleteMeditation = async (id: string) => {
    // Stop playback if this meditation is playing
    if (libraryPlayingId === id) {
      stopLibraryPlayback();
    }
    const success = await deleteMeditationHistory(id);
    if (success) {
      setMeditationHistory(prev => prev.filter(m => m.id !== id));
    }
  };

  // Cleanup library audio on unmount or when library closes
  useEffect(() => {
    if (!showLibrary && libraryAudioRef) {
      stopLibraryPlayback();
    }
  }, [showLibrary]);

  // Cleanup background music on unmount
  useEffect(() => {
    return () => {
      stopBackgroundMusic();
    };
  }, []);

  // Close prompt menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPromptMenu) {
        setShowPromptMenu(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showPromptMenu]);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (showBurgerMenu) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => {
      document.body.classList.remove('sidebar-open');
    };
  }, [showBurgerMenu]);

  const checkUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      await loadUserVoices();
    }
  };

  const loadUserVoices = async () => {
    try {
      const voices = await getUserVoiceProfiles();
      setSavedVoices(voices);

      // Add saved voices to available voices (cloned voices only)
      // A voice is cloned if it has fish_audio_model_id OR voice_sample_url
      const clonedVoiceProfiles = voices
        .filter(v => v.fish_audio_model_id || v.voice_sample_url || v.provider_voice_id)
        .map(v => {
          // Determine the correct provider based on available IDs
          // Priority: fish-audio > chatterbox
          const provider = v.fish_audio_model_id ? 'fish-audio' as const : 'chatterbox' as const;
          return {
            id: v.id,
            name: v.name,
            provider,
            voiceName: v.name,
            description: v.description || 'Your personalized voice clone',
            isCloned: true,
            providerVoiceId: v.provider_voice_id,
            fishAudioModelId: v.fish_audio_model_id,
            voiceSampleUrl: v.voice_sample_url,
          };
        });

      setAvailableVoices(clonedVoiceProfiles);

      // Auto-select first cloned voice if none selected
      if (!selectedVoice && clonedVoiceProfiles.length > 0) {
        setSelectedVoice(clonedVoiceProfiles[0]);
      }
    } catch (error) {
      console.error('Failed to load voices:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setSavedVoices([]);
    setAvailableVoices([]);
    setSelectedVoice(null);
  };

  const handleDeleteHistory = async (id: string) => {
    const success = await deleteMeditationHistory(id);
    if (success) {
      setMeditationHistory(prev => prev.filter(h => h.id !== id));
    }
  };

  const handleReplayHistory = (history: MeditationHistory) => {
    setScript(history.prompt);
    setShowLibrary(false);
    setCurrentView(View.HOME);
  };


  // Home Transcription Logic - auto-transcribe and auto-submit
  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const base64 = await blobToBase64(blob);
        setIsGenerating(true);
        setGenerationStage('script');
        try {
          const text = await geminiService.transcribeAudio(base64);
          if (text) {
            // Set the script and auto-submit
            setScript(text);
            // Use a small delay to ensure state is updated before generating
            setTimeout(() => {
              // Trigger the generation flow directly
              autoGenerateFromVoice(text);
            }, 100);
          } else {
            setIsGenerating(false);
            setGenerationStage('idle');
          }
        } catch (e) {
          console.error("Transcription failed", e);
          setIsGenerating(false);
          setGenerationStage('idle');
        }
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (e: any) {
      console.error("Microphone access denied", e);
      setMicError(e.message || "Microphone not found. Check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Start recording for voice clone
  const startRecordingClone = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      cloneMediaRecorderRef.current = recorder;
      cloneChunksRef.current = [];

      recorder.ondataavailable = (e) => cloneChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(cloneChunksRef.current, { type: 'audio/webm' });
        const base64 = await blobToBase64(blob);
        setRecordedAudio(base64);
        stream.getTracks().forEach(track => track.stop());
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        setRecordingProgressClone(0);
        setIsRecordingClone(false);
        
        // Auto-save the voice recording
        await autoSaveVoiceRecording(base64);
      };

      recorder.start();
      setIsRecordingClone(true);
      setRecordingProgressClone(0);
      
      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (cloneMediaRecorderRef.current && isRecordingClone) {
          stopRecordingClone();
        }
      }, 30000);
    } catch (e: any) {
      console.error("Microphone access denied", e);
      setMicError(e.message || "Microphone not found. Check permissions.");
      setIsRecordingClone(false);
    }
  };

  const stopRecordingClone = () => {
    if (cloneMediaRecorderRef.current && isRecordingClone) {
      cloneMediaRecorderRef.current.stop();
      setIsRecordingClone(false);
    }
  };

  // Auto-save voice recording when it stops
  const autoSaveVoiceRecording = async (audioData: string) => {
    // Check if user is authenticated
    if (!user) {
      setMicError('Please sign in to save your voice');
      return;
    }

    // Generate a default name if not provided
    let profileName = newProfileName.trim();

    if (!profileName) {
      // Create a unique default name with timestamp and random suffix
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const dateStr = now.toLocaleDateString();
      // Add milliseconds and random number to ensure uniqueness
      const ms = now.getMilliseconds().toString().padStart(3, '0');
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      profileName = `My Voice ${dateStr} ${timeStr}.${ms}.${randomSuffix}`;
    }

    // Check for existing names and add suffix if needed
    const existingProfiles = await getUserVoiceProfiles();
    const existingNames = new Set(existingProfiles.map(p => p.name.toLowerCase()));
    let finalName = profileName;
    let counter = 1;

    while (existingNames.has(finalName.toLowerCase())) {
      // Try different formats for uniqueness
      if (counter === 1) {
        finalName = `${profileName} (copy)`;
      } else if (counter === 2) {
        finalName = `${profileName} (2)`;
      } else {
        finalName = `${profileName} (${counter})`;
      }
      counter++;

      // Prevent infinite loop - use UUID as last resort
      if (counter > 100) {
        const uuid = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        finalName = `${profileName}-${uuid}`;
        break;
      }
    }

    setIsSavingVoice(true);
    setMicError(null);
    setVoiceSaved(false);

    try {
      // Check if user can clone voice (credit and limit check)
      const { can: canClone, reason } = await creditService.canClone(user.id);
      if (!canClone) {
        setMicError(reason || 'Cannot clone voice at this time');
        setIsSavingVoice(false);
        return;
      }

      // Convert base64 to blob for Chatterbox
      const audioBlob = base64ToBlob(audioData, 'audio/webm');

      // Convert WebM to WAV for Chatterbox (required format)
      const wavBlob = await convertToWAV(audioBlob);

      // Clone voice with Chatterbox via Replicate
      let cloneResult: { voiceProfileId: string; voiceSampleUrl: string };
      try {
        cloneResult = await chatterboxCloneVoice(
          wavBlob,
          finalName,
          'Voice clone created with INrVO'
        );
      } catch (cloneError: any) {
        console.error('Chatterbox voice clone failed:', cloneError);
        setMicError(`Voice cloning failed: ${cloneError.message}`);
        return;
      }

      // Save audio sample backup (non-critical)
      try {
        await createVoiceClone(
          finalName,
          audioData,
          'Voice sample for cloned voice',
          { providerVoiceId: cloneResult.voiceSampleUrl }
        );
      } catch (e) {
        console.warn('Failed to save voice sample:', e);
      }

      // Update the profile name if it was auto-generated
      if (!newProfileName.trim()) {
        setNewProfileName(finalName);
      }

      setSavedVoiceId(cloneResult.voiceProfileId);
      setVoiceSaved(true);

      // Reload voices to include the new one
      await loadUserVoices();

      // Auto-select the new voice
      const newVoice: VoiceProfile = {
        id: cloneResult.voiceProfileId,
        name: finalName,
        provider: 'chatterbox',
        voiceName: finalName,
        description: 'Your personalized cloned voice',
        isCloned: true,
        providerVoiceId: cloneResult.voiceSampleUrl,
      };
      setSelectedVoice(newVoice);
    } catch (error: any) {
      console.error('Failed to auto-save voice:', error);
      setMicError(error?.message || 'Failed to save voice. Please try again.');
    } finally {
      setIsSavingVoice(false);
    }
  };

  // Fetch credit info when clone modal opens
  const fetchCreditInfo = useCallback(async () => {
    if (!user) {
      setCreditInfo({
        canClone: false,
        creditsRemaining: 0,
        clonesRemaining: 0,
        cloneCost: 5000,
        reason: 'Please sign in to clone your voice',
      });
      return;
    }

    try {
      const [canCloneResult, credits, clonesRemaining] = await Promise.all([
        creditService.canClone(user.id),
        creditService.getCredits(user.id),
        creditService.getClonesRemaining(user.id),
      ]);

      const costConfig = creditService.getCostConfig();

      setCreditInfo({
        canClone: canCloneResult.can,
        creditsRemaining: credits,
        clonesRemaining: clonesRemaining,
        cloneCost: costConfig.VOICE_CLONE,
        reason: canCloneResult.reason,
      });
    } catch (error) {
      console.error('Failed to fetch credit info:', error);
      setCreditInfo({
        canClone: false,
        creditsRemaining: 0,
        clonesRemaining: 0,
        cloneCost: 5000,
        reason: 'Failed to check credits',
      });
    }
  }, [user]);

  // Handle recording complete from SimpleVoiceClone
  // Uses Chatterbox via Replicate for voice cloning
  const handleCloneRecordingComplete = useCallback(async (blob: Blob, name: string, metadata?: VoiceMetadata) => {
    if (!user) {
      setCloningStatus({ state: 'error', message: 'Please sign in to clone your voice', canRetry: false });
      return;
    }

    setCloningStatus({ state: 'validating' });

    try {
      setCloningStatus({ state: 'processing_audio' });

      // Convert to WAV for Chatterbox (required format)
      const wavBlob = await convertToWAV(blob);

      setCloningStatus({ state: 'uploading_to_fish_audio' });

      // Clone with Fish Audio (primary, with Chatterbox backup storage)
      let cloneResult: { voiceProfileId: string; fishAudioModelId: string | null; voiceSampleUrl: string | null };
      try {
        cloneResult = await fishAudioCloneVoice(
          wavBlob,
          name,
          'Meditation voice clone created with INrVO',
          metadata
        );
        console.log('Voice cloned successfully! Profile ID:', cloneResult.voiceProfileId, 'Fish Audio Model:', cloneResult.fishAudioModelId);
      } catch (cloneError: any) {
        console.error('Voice cloning failed:', cloneError);
        setCloningStatus({
          state: 'error',
          message: cloneError.message || 'Voice cloning failed',
          canRetry: true,
        });
        return;
      }

      setCloningStatus({ state: 'saving_to_database' });

      // Voice profile already created by Edge Function - fetch it
      let savedVoice;
      try {
        if (!cloneResult.voiceProfileId) {
          throw new Error('No voice profile ID returned from server');
        }
        savedVoice = await getVoiceProfileById(cloneResult.voiceProfileId);
        if (!savedVoice) {
          throw new Error('Voice profile not found after cloning');
        }
      } catch (dbError: any) {
        console.error('Failed to fetch voice profile:', dbError);
        setCloningStatus({
          state: 'error',
          message: dbError.message || 'Failed to fetch voice profile',
          canRetry: true,
        });
        return;
      }

      // Save audio sample as backup (non-critical, don't fail on error)
      try {
        const base64 = await blobToBase64(blob);
        await createVoiceClone(
          savedVoice.name,
          base64,
          'Voice sample for cloned voice',
          { providerVoiceId: cloneResult.voiceSampleUrl }
        );
      } catch (e) {
        console.warn('Failed to save voice sample backup:', e);
      }

      // Create voice profile for UI
      const newVoice: VoiceProfile = {
        id: savedVoice.id,
        name: savedVoice.name,
        provider: 'chatterbox',
        voiceName: savedVoice.name,
        description: savedVoice.description || 'Your personalized cloned voice',
        isCloned: true,
        providerVoiceId: cloneResult.voiceSampleUrl,
      };

      // Update available voices
      setAvailableVoices((prev) => [...prev, newVoice]);
      setSelectedVoice(newVoice);

      // Reload voices
      await loadUserVoices();

      // Update credit info
      await fetchCreditInfo();

      setCloningStatus({
        state: 'success',
        voiceId: savedVoice.id,
        voiceName: savedVoice.name,
      });
    } catch (error: any) {
      console.error('Voice cloning failed:', error);
      setCloningStatus({
        state: 'error',
        message: error.message || 'Failed to clone voice',
        canRetry: true,
      });
    }
  }, [user, fetchCreditInfo]);

  // Open clone modal and fetch credit info
  const openCloneModal = useCallback(() => {
    setCloningStatus({ state: 'idle' });
    setShowCloneModal(true);
    fetchCreditInfo();
  }, [fetchCreditInfo]);

  // Create Voice Profile (now just closes modal if voice is already saved)
  const handleCreateVoiceProfile = async () => {
    // Prevent double-clicks
    if (isProcessing || isSavingVoice) {
      return;
    }

    // If voice is already saved, just close the modal
    if (voiceSaved && savedVoiceId) {
      setNewProfileName('');
      setRecordedAudio(null);
      setVoiceSaved(false);
      setSavedVoiceId(null);
      setShowCloneModal(false);
      return;
    }

    // If recording exists but not saved yet, trigger save
    if (recordedAudio && !voiceSaved) {
      // Check for name conflicts before saving
      if (newProfileName.trim() && nameError) {
        setMicError('Please choose a different name or leave empty for auto-generation');
        return;
      }
      setIsProcessing(true);
      await autoSaveVoiceRecording(recordedAudio);
      setIsProcessing(false);
      return;
    }

    // Otherwise, require recording
    if (!recordedAudio) {
      setMicError('Please record your voice first');
      return;
    }
  };

  const handleEnhance = async (input: string) => {
    if (!input.trim()) return;
    setIsGenerating(true);
    try {
      const enhanced = await geminiService.enhanceScript(input);
      setScript(enhanced);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Start background music
  const startBackgroundMusic = async (track: BackgroundTrack) => {
    // Stop any existing background music
    stopBackgroundMusic();
    setMusicError(null);

    if (track.id === 'none' || !track.audioUrl) {
      console.log('[Music] No track selected or no audio URL');
      setIsMusicPlaying(false);
      return;
    }

    try {
      console.log('[Music] Loading track:', track.name, track.audioUrl);
      const audio = new Audio();
      // Note: crossOrigin not needed for playback-only, and causes CORS issues with some hosts
      audio.preload = 'auto';
      audio.loop = true;
      audio.volume = backgroundVolume;

      // Set up event handlers before setting src
      audio.onerror = (e) => {
        console.error('[Music] Audio error:', e, audio.error);
        setIsMusicPlaying(false);
        setMusicError(`Failed to load: ${track.name}`);
      };
      audio.oncanplaythrough = () => {
        console.log('[Music] Audio ready to play:', track.name);
      };
      audio.onplay = () => {
        console.log('[Music] Audio started playing:', track.name);
        setIsMusicPlaying(true);
        setMusicError(null);
      };
      audio.onpause = () => {
        console.log('[Music] Audio paused:', track.name);
        setIsMusicPlaying(false);
      };
      audio.onended = () => {
        console.log('[Music] Audio ended:', track.name);
        setIsMusicPlaying(false);
      };

      // Add load timeout
      const loadTimeout = setTimeout(() => {
        if (!audio.readyState || audio.readyState < 3) {
          console.error('[Music] Load timeout for:', track.name);
          setMusicError(`Timeout loading: ${track.name}`);
          setIsMusicPlaying(false);
        }
      }, 15000);

      audio.onloadeddata = () => {
        clearTimeout(loadTimeout);
      };

      audio.src = track.audioUrl;
      backgroundAudioRef.current = audio;

      // Wait for audio to be ready, then play
      await audio.play();
      console.log('[Music] Play called successfully');
    } catch (error: any) {
      console.error('[Music] Failed to play background music:', error);

      // Handle autoplay policy
      if (error?.name === 'NotAllowedError') {
        console.warn('[Music] Autoplay blocked - will retry on user interaction');
        setMusicError('Tap to enable music');
      } else {
        // Try without crossOrigin as fallback
        try {
          console.log('[Music] Retrying without crossOrigin...');
          const audio = new Audio(track.audioUrl);
          audio.loop = true;
          audio.volume = backgroundVolume;
          audio.onplay = () => {
            setIsMusicPlaying(true);
            setMusicError(null);
          };
          audio.onpause = () => setIsMusicPlaying(false);
          audio.onerror = () => {
            setIsMusicPlaying(false);
            setMusicError(`Failed to load: ${track.name}`);
          };
          backgroundAudioRef.current = audio;
          await audio.play();
          console.log('[Music] Fallback play successful');
        } catch (fallbackError) {
          console.error('[Music] Fallback also failed:', fallbackError);
          setIsMusicPlaying(false);
          setMusicError(`Could not play: ${track.name}`);
        }
      }
    }
  };

  // Stop background music
  const stopBackgroundMusic = () => {
    if (backgroundAudioRef.current) {
      console.log('[Music] Stopping background music');
      backgroundAudioRef.current.pause();
      backgroundAudioRef.current.currentTime = 0;
      backgroundAudioRef.current = null;
    }
    setIsMusicPlaying(false);
  };

  // Preview track toggle
  const togglePreviewTrack = (track: BackgroundTrack) => {
    // If already previewing this track, stop it
    if (previewingTrackId === track.id) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPreviewingTrackId(null);
      return;
    }

    // Stop any current preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }

    // No audio URL for this track
    if (!track.audioUrl) {
      setPreviewingTrackId(null);
      return;
    }

    // Start new preview
    const audio = new Audio(track.audioUrl);
    audio.volume = 0.5;
    audio.loop = false;

    audio.onended = () => {
      setPreviewingTrackId(null);
      previewAudioRef.current = null;
    };

    audio.onerror = () => {
      console.error('[Preview] Failed to load track:', track.name);
      setPreviewingTrackId(null);
      previewAudioRef.current = null;
    };

    audio.play().then(() => {
      previewAudioRef.current = audio;
      setPreviewingTrackId(track.id);
    }).catch((err) => {
      console.error('[Preview] Failed to play:', err);
      setPreviewingTrackId(null);
    });
  };

  // Stop preview when modal closes
  const stopPreview = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPreviewingTrackId(null);
  }, []);

  // Update background volume
  const updateBackgroundVolume = (volume: number) => {
    setBackgroundVolume(volume);
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.volume = volume;
    }
  };

  // Progress tracking for inline player
  // Optimized: Only update currentTime on RAF, but only update wordIndex when it changes
  // This reduces state updates from 60x/sec to only when words actually change (~2-5x/sec)
  const updateProgress = useCallback(() => {
    if (!audioContextRef.current || !isPlaying) return;

    const elapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current;
    const newCurrentTime = Math.min(pauseOffsetRef.current + elapsed, duration);

    setCurrentTime(newCurrentTime);

    // Update word index only when it actually changes (reduces ~60x/sec to ~2-5x/sec)
    if (timingMap) {
      const wordIndex = getCurrentWordIndex(timingMap, newCurrentTime);
      if (wordIndex !== lastWordIndexRef.current) {
        lastWordIndexRef.current = wordIndex;
        setCurrentWordIndex(wordIndex);
      }
    }

    if (newCurrentTime < duration && isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPlaying, duration, timingMap]);

  // Start progress tracking when playing in inline mode
  useEffect(() => {
    if (isPlaying && isInlineMode) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isInlineMode, updateProgress]);

  // Pause playback for inline player
  const handleInlinePause = useCallback(() => {
    if (!audioContextRef.current || !audioSourceRef.current || !isPlaying) return;

    // Calculate current position
    const elapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current;
    pauseOffsetRef.current = Math.min(pauseOffsetRef.current + elapsed, duration);

    // Stop the source
    try {
      audioSourceRef.current.stop();
    } catch (e) {
      // Already stopped
    }
    audioSourceRef.current = null;

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setIsPlaying(false);
  }, [isPlaying, duration]);

  // Resume playback for inline player
  const handleInlinePlay = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current || isPlaying) return;

    // Resume audio context if suspended
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    // Create new source
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.connect(audioContextRef.current.destination);

    // Start from offset
    source.start(0, pauseOffsetRef.current);
    audioSourceRef.current = source;

    // Track timing
    playbackStartTimeRef.current = audioContextRef.current.currentTime;
    setIsPlaying(true);

    // Handle natural end
    source.onended = () => {
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  // Toggle play/pause for inline player
  const handleInlineTogglePlayback = useCallback(() => {
    if (isPlaying) {
      handleInlinePause();
    } else {
      handleInlinePlay();
    }
  }, [isPlaying, handleInlinePause, handleInlinePlay]);

  // Seek for inline player
  const handleInlineSeek = useCallback((time: number) => {
    const wasPlaying = isPlaying;
    const clampedTime = Math.max(0, Math.min(time, duration));

    // Stop current playback
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      audioSourceRef.current = null;
    }

    // Update offset
    pauseOffsetRef.current = clampedTime;
    setCurrentTime(clampedTime);

    // Update word index
    if (timingMap) {
      const wordIndex = getCurrentWordIndex(timingMap, clampedTime);
      setCurrentWordIndex(wordIndex);
    }

    // Resume if was playing
    if (wasPlaying && audioContextRef.current && audioBufferRef.current) {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioContextRef.current.destination);
      source.start(0, clampedTime);
      audioSourceRef.current = source;

      playbackStartTimeRef.current = audioContextRef.current.currentTime;
      setIsPlaying(true);

      source.onended = () => {
        setIsPlaying(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } else {
      setIsPlaying(false);
    }
  }, [isPlaying, duration, timingMap]);

  // Stop and exit inline mode
  const handleInlineStop = useCallback(() => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      audioSourceRef.current = null;
    }

    stopBackgroundMusic();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    pauseOffsetRef.current = 0;
    lastWordIndexRef.current = -1; // Reset word index tracking ref
    setIsPlaying(false);
    setIsInlineMode(false);
    setEnhancedScript('');
    setCurrentTime(0);
    setDuration(0);
    setCurrentWordIndex(-1);
    setTimingMap(null);
    audioBufferRef.current = null;
    setScript('');
  }, []);

  // Expand to full-screen PLAYER view
  const handleExpandToPlayer = useCallback(() => {
    setCurrentView(View.PLAYER);
  }, []);

  // Stable callback for closing burger menu when meditation panel opens
  const handleMeditationPanelOpen = useCallback(() => {
    setShowBurgerMenu(false);
  }, []);

  // Auto-generate from voice input (called after transcription)
  const autoGenerateFromVoice = async (transcribedText: string) => {
    if (!transcribedText.trim()) {
      setMicError('No speech detected. Please try again.');
      setIsGenerating(false);
      setGenerationStage('idle');
      return;
    }

    // Require a cloned voice to generate
    if (!selectedVoice) {
      setMicError('Please clone a voice first to generate meditations');
      setShowCloneModal(true);
      setIsGenerating(false);
      setGenerationStage('idle');
      return;
    }

    setOriginalPrompt(transcribedText);
    setMicError(null);

    try {
      // Check credits FIRST
      if (selectedVoice.isCloned) {
        const estimatedCost = creditService.calculateTTSCost(transcribedText, 150);
        const credits = await creditService.getCredits(user?.id);
        if (credits < estimatedCost) {
          setMicError(`Insufficient credits. Need ${estimatedCost} credits.`);
          setIsGenerating(false);
          setGenerationStage('idle');
          return;
        }
      }

      // Get audio tag labels
      const audioTagLabels = audioTagsEnabled && selectedAudioTags.length > 0
        ? AUDIO_TAG_CATEGORIES.flatMap(cat => cat.tags)
            .filter(tag => selectedAudioTags.includes(tag.id))
            .map(tag => tag.label)
        : undefined;

      // Generate enhanced meditation
      const enhanced = await geminiService.enhanceScript(transcribedText, audioTagLabels);

      if (!enhanced || !enhanced.trim()) {
        throw new Error('Failed to generate meditation script.');
      }

      // Show editable preview
      setEditableScript(enhanced);
      setShowScriptPreview(true);
      setIsGenerating(false);
      setGenerationStage('idle');

    } catch (error: any) {
      console.error('Failed to generate script:', error);
      setMicError(error?.message || 'Failed to generate meditation.');
      setIsGenerating(false);
      setGenerationStage('idle');
    }
  };

  // Step 1: Generate script and show editable preview
  const handleGenerateAndPlay = async () => {
    if (!script.trim()) {
      setMicError('Please enter some text to generate a meditation');
      return;
    }

    // Require a cloned voice to generate
    if (!selectedVoice) {
      setMicError('Please clone a voice first to generate meditations');
      setShowCloneModal(true);
      return;
    }

    setOriginalPrompt(script); // Store original prompt
    setIsGenerating(true);
    setGenerationStage('script');
    setMicError(null);

    try {
      // Check credits FIRST (fail fast before expensive operations)
      if (selectedVoice.isCloned) {
        const estimatedCost = creditService.calculateTTSCost(script, 150);
        const credits = await creditService.getCredits(user?.id);
        if (credits < estimatedCost) {
          setMicError(`Insufficient credits for TTS generation. Need ${estimatedCost} credits.`);
          setIsGenerating(false);
          setGenerationStage('idle');
          return;
        }
      }

      // Get audio tag labels from selected tag IDs (only if audio tags are enabled)
      const audioTagLabels = audioTagsEnabled && selectedAudioTags.length > 0
        ? AUDIO_TAG_CATEGORIES.flatMap(cat => cat.tags)
            .filter(tag => selectedAudioTags.includes(tag.id))
            .map(tag => tag.label)
        : undefined;

      // Generate enhanced meditation from short prompt
      const enhanced = await geminiService.enhanceScript(script, audioTagLabels);

      if (!enhanced || !enhanced.trim()) {
        throw new Error('Failed to generate meditation script. Please try again.');
      }

      // Show editable preview instead of auto-playing
      setEditableScript(enhanced);
      setShowScriptPreview(true);
      setIsGenerating(false);
      setGenerationStage('idle');

    } catch (error: any) {
      console.error('Failed to generate script:', error);
      setMicError(error?.message || 'Failed to generate meditation. Please try again.');
      setIsGenerating(false);
      setGenerationStage('idle');
    }
  };

  // Step 2: Play the edited script after user confirms
  // Handler to extend the current script into a longer version
  const handleExtendScript = async () => {
    if (!editableScript.trim()) return;

    setIsExtending(true);
    setMicError(null);

    try {
      const extendedScript = await geminiService.extendScript(editableScript);
      setEditableScript(extendedScript);
    } catch (error: any) {
      console.error('Error extending script:', error);
      setMicError(error?.message || 'Failed to extend script. Please try again.');
    } finally {
      setIsExtending(false);
    }
  };

  const handlePlayEditedScript = async () => {
    if (!editableScript.trim() || !selectedVoice) return;

    setShowScriptPreview(false);
    setIsGenerating(true);
    setGenerationStage('voice');
    setMicError(null);

    try {
      // Initialize audio context
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Generate speech with the edited script
      const { audioBuffer, base64 } = await voiceService.generateSpeech(
        editableScript,
        selectedVoice,
        audioContextRef.current
      );

      if (!base64 || base64.trim() === '') {
        throw new Error('Failed to generate audio. Please try again.');
      }

      setGenerationStage('ready');

      // Stop any existing playback
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (e) {}
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Store the audio buffer
      audioBufferRef.current = audioBuffer;
      setDuration(audioBuffer.duration);
      setCurrentTime(0);
      lastWordIndexRef.current = 0; // Reset word index tracking ref
      setCurrentWordIndex(0);
      pauseOffsetRef.current = 0;

      // Start playback
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      audioSourceRef.current = source;
      playbackStartTimeRef.current = audioContextRef.current.currentTime;

      // Update state
      setScript(editableScript);
      setEnhancedScript(editableScript);
      setIsPlaying(true);
      setCurrentView(View.PLAYER);  // Go directly to V0MeditationPlayer
      setIsGenerating(false);
      setGenerationStage('idle');

      // Build timing map
      const map = buildTimingMap(editableScript, audioBuffer.duration);
      setTimingMap(map);

      // Start background music
      startBackgroundMusic(selectedBackgroundTrack);

      // Deduct credits
      if (selectedVoice.isCloned) {
        creditService.deductCredits(
          creditService.calculateTTSCost(editableScript),
          'TTS_GENERATE',
          selectedVoice.id,
          user?.id
        ).catch(err => console.warn('Failed to deduct credits:', err));
      }

      // Save to history (include audio for cloned voices)
      saveMeditationHistory(
        originalPrompt,
        editableScript,
        selectedVoice.id,
        selectedVoice.name,
        selectedBackgroundTrack?.id,
        selectedBackgroundTrack?.name,
        Math.round(audioBuffer.duration),
        audioTagsEnabled && selectedAudioTags.length > 0 ? selectedAudioTags : undefined,
        selectedVoice.isCloned ? base64 : undefined // Save audio only for cloned voices
      ).catch(err => console.warn('Failed to save meditation history:', err));

      source.onended = () => {
        setIsPlaying(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } catch (error: any) {
      console.error('Failed to play edited script:', error);
      setMicError(error?.message || 'Failed to generate audio. Please try again.');
      setIsGenerating(false);
      setGenerationStage('idle');
    }
  };

  // Insert audio tag at cursor position in editable script
  const insertAudioTag = (tag: string) => {
    const textarea = scriptTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = editableScript;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = before + ` ${tag} ` + after;
      setEditableScript(newText);
      // Restore cursor position after the inserted tag
      setTimeout(() => {
        textarea.focus();
        const newPos = start + tag.length + 2;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      setEditableScript(prev => prev + ` ${tag} `);
    }
  };

  // Throttled versions of generate functions to prevent duplicate API calls from rapid clicks
  // Using useMemo to create stable function references
  const throttledGenerateAndPlay = useMemo(
    () => throttleLeading(handleGenerateAndPlay, 2000),
    [handleGenerateAndPlay]
  );

  const throttledPlayEditedScript = useMemo(
    () => throttleLeading(handlePlayEditedScript, 2000),
    [handlePlayEditedScript]
  );

  const handleSelectTemplate = (prompt: string) => {
    setScript(prompt);
    setShowTemplatesModal(false);
    setSelectedCategory(null);
    setSelectedSubgroup(null);
  };

  const startPlayback = async () => {
    if (!script) return;
    setIsGenerating(true);
    setMicError(null);
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Check for credits if this is a cloned voice
      if (selectedVoice.isCloned) {
        const ttSCost = creditService.calculateTTSCost(script);
        const credits = await creditService.getCredits(user?.id);

        if (credits < ttSCost) {
          setMicError(`Insufficient credits for TTS generation. Need ${ttSCost} credits.`);
          setIsGenerating(false);
          return;
        }
      }

      // Generate speech with unified voice service
      const { audioBuffer, base64 } = await voiceService.generateSpeech(
        script,
        selectedVoice,
        audioContextRef.current
      );

      if (!base64 || base64.trim() === '') {
        throw new Error('Failed to generate audio. Please check your API key and try again.');
      }

      // Deduct credits for TTS generation if cloned voice
      if (selectedVoice.isCloned) {
        await creditService.deductCredits(
          creditService.calculateTTSCost(script),
          'TTS_GENERATE',
          selectedVoice.id,
          user?.id
        );
      }

      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      audioSourceRef.current = source;

      setIsPlaying(true);
      setCurrentView(View.PLAYER);

      source.onended = () => setIsPlaying(false);
    } catch (error: any) {
      console.error('Failed to start playback:', error);
      setMicError(error?.message || 'Failed to generate audio. Please try again.');
      setIsGenerating(false);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      audioSourceRef.current?.stop();
      setIsPlaying(false);
    } else {
      startPlayback();
    }
  };

  return (
    <>
      <OfflineIndicator />
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}

      <div className={`relative h-[100dvh] w-full flex flex-col transition-all duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} ${isInlineMode ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        <Starfield />

        {/* Simple Navigation - Mobile Optimized */}
        <nav className="fixed top-0 left-0 right-0 z-50 p-3 md:p-6 flex justify-between items-center bg-gradient-to-b from-[#020617]/80 to-transparent">
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            {/* Sidebar Toggle Button - Only show when sidebar is closed */}
            {!showBurgerMenu && (
              <button
                onClick={() => setShowBurgerMenu(true)}
                className="ml-1 md:ml-2 p-2 md:p-2.5 min-w-[40px] min-h-[40px] md:min-w-[44px] md:min-h-[44px]
                           rounded-lg md:rounded-xl bg-gradient-to-r from-cyan-600/20 to-purple-600/20
                           hover:from-cyan-600/30 hover:to-purple-600/30
                           text-cyan-400 hover:text-cyan-300 transition-all flex items-center justify-center
                           border border-cyan-500/20 hover:border-cyan-500/40"
                title="Open sidebar"
              >
                <ICONS.SidebarToggle className="w-5 h-5" />
              </button>
            )}

          </div>

          {/* Voice selector and user menu - compact on mobile */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Voice selector - hidden on very small screens, compact on mobile */}
            <div className="hidden xs:flex items-center gap-2">
              {availableVoices.length > 0 ? (
                <select
                  value={selectedVoice?.id || ''}
                  onChange={(e) => {
                    const voice = availableVoices.find(v => v.id === e.target.value);
                    if (voice) setSelectedVoice(voice);
                  }}
                  className="bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-[11px] font-bold uppercase tracking-wider md:tracking-widest text-slate-300 outline-none focus:border-cyan-500 transition-all cursor-pointer hover:bg-white/10 max-w-[100px] md:max-w-none truncate"
                >
                  {availableVoices.map(v => (
                    <option key={v.id} value={v.id} className="bg-slate-900">
                      {v.name} ★
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={() => setShowCloneModal(true)}
                  className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg md:rounded-xl px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-500/30 transition-all"
                >
                  Clone Voice
                </button>
              )}
            </div>

            {/* User Menu */}
            {!user && (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 md:px-4 py-2 min-h-[40px] md:min-h-[44px] rounded-lg md:rounded-xl bg-gradient-to-r from-cyan-600/20 to-purple-600/20 hover:from-cyan-600/30 hover:to-purple-600/30 border border-cyan-500/20 text-[10px] font-bold uppercase tracking-wider md:tracking-widest text-cyan-400 transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </nav>

        <main className="flex-1 flex flex-col items-center justify-between p-4 md:p-6 w-full relative">

          {/* VIEW: HOME */}
          {currentView === View.HOME && (
            <div className="w-full h-full animate-in fade-in duration-1000">

              {/* Tagline - shown before chat starts, not in inline mode */}
              {!chatStarted && !isInlineMode && (
                <div className="fixed top-24 md:top-32 left-0 right-0 text-center z-10 px-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  <p className="text-2xl md:text-4xl font-light tracking-wide text-white/70">
                    {tagline.main} <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-cyan-500 font-semibold">{tagline.highlight}</span>
                  </p>
                  <p className="text-base md:text-2xl text-slate-500 mt-1 md:mt-2 hidden sm:block">{tagline.sub}</p>
                </div>
              )}

              {/* Error message */}
              {micError && !isInlineMode && (
                <div className="fixed bottom-24 left-0 right-0 z-50 text-center">
                  <span className="px-4 py-1.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold uppercase tracking-widest border border-rose-500/20">
                    {micError}
                  </span>
                </div>
              )}

              {/* AI Agent Chat - Full screen when not in inline mode */}
              {!isInlineMode && (
                <AgentChat
                      onMeditationReady={(generatedScript, meditationType, userPrompt) => {
                        // Set the user's original prompt for display
                        setScript(userPrompt);
                        // Set the generated script as enhanced script
                        setEnhancedScript(generatedScript);
                        // If a voice is selected, automatically start synthesis
                        if (selectedVoice) {
                          handleGenerateAndPlay();
                        } else {
                          // Prompt user to select a voice
                          setShowVoiceManager(true);
                        }
                      }}
                      onGenerateAudio={async (meditationScript, tags) => {
                        if (!selectedVoice) {
                          setShowVoiceManager(true);
                          return;
                        }
                        // Set script and tags, then synthesize
                        setEditableScript(meditationScript);
                        setSelectedAudioTags(tags);
                        setScript(meditationScript);
                        setEnhancedScript(meditationScript);
                        // Use the play edited script flow
                        setShowScriptPreview(false);
                        setIsGenerating(true);
                        setGenerationStage('voice');
                        setMicError(null);

                        try {
                          // Initialize audio context (check state to handle closed contexts)
                          if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                          }

                          // Generate speech
                          const { audioBuffer, base64 } = await voiceService.generateSpeech(
                            meditationScript,
                            selectedVoice,
                            audioContextRef.current
                          );

                          if (!base64 || base64.trim() === '') {
                            throw new Error('Failed to generate audio. Please try again.');
                          }

                          setGenerationStage('ready');

                          // Stop any existing playback
                          if (audioSourceRef.current) {
                            try { audioSourceRef.current.stop(); } catch (e) {}
                          }
                          if (animationFrameRef.current) {
                            cancelAnimationFrame(animationFrameRef.current);
                          }

                          // Store the audio buffer
                          audioBufferRef.current = audioBuffer;
                          setDuration(audioBuffer.duration);
                          setCurrentTime(0);
                          lastWordIndexRef.current = 0;
                          setCurrentWordIndex(0);
                          pauseOffsetRef.current = 0;

                          // Start playback
                          const source = audioContextRef.current.createBufferSource();
                          source.buffer = audioBuffer;
                          source.connect(audioContextRef.current.destination);
                          source.start();
                          audioSourceRef.current = source;
                          playbackStartTimeRef.current = audioContextRef.current.currentTime;

                          // Update state
                          setIsPlaying(true);
                          setCurrentView(View.PLAYER);  // Go directly to V0MeditationPlayer
                          setIsGenerating(false);
                          setGenerationStage('idle');

                          // Build timing map
                          const map = buildTimingMap(meditationScript, audioBuffer.duration);
                          setTimingMap(map);

                          // Start background music
                          startBackgroundMusic(selectedBackgroundTrack);

                          // Deduct credits if cloned voice
                          if (selectedVoice.isCloned) {
                            creditService.deductCredits(
                              creditService.calculateTTSCost(meditationScript),
                              'TTS_GENERATE',
                              selectedVoice.id,
                              user?.id
                            ).catch(err => console.warn('Failed to deduct credits:', err));
                          }

                          // Save to history (include audio for cloned voices)
                          saveMeditationHistory(
                            meditationScript.substring(0, 100),
                            meditationScript,
                            selectedVoice.id,
                            selectedVoice.name,
                            selectedBackgroundTrack?.id,
                            selectedBackgroundTrack?.name,
                            Math.round(audioBuffer.duration),
                            tags.length > 0 ? tags : undefined,
                            selectedVoice.isCloned ? base64 : undefined // Save audio only for cloned voices
                          ).catch(err => console.warn('Failed to save history:', err));

                          source.onended = () => {
                            setIsPlaying(false);
                            if (animationFrameRef.current) {
                              cancelAnimationFrame(animationFrameRef.current);
                            }
                          };
                        } catch (error: any) {
                          console.error('Failed to generate audio:', error);
                          setMicError(error?.message || 'Failed to generate audio. Please try again.');
                          setIsGenerating(false);
                          setGenerationStage('idle');
                        }
                      }}
                      onChatStarted={() => setChatStarted(true)}
                      onMeditationPanelOpen={handleMeditationPanelOpen}
                      onRequestVoiceSelection={() => setShowVoiceManager(true)}
                      selectedVoice={selectedVoice}
                      selectedMusic={selectedBackgroundTrack}
                      availableMusic={BACKGROUND_TRACKS}
                      availableTags={AUDIO_TAG_CATEGORIES}
                      onMusicChange={(track) => setSelectedBackgroundTrack(track)}
                      isGenerating={isGenerating}
                      isGeneratingAudio={isGenerating && generationStage === 'voice'}
                      restoredScript={restoredScript}
                      onRestoredScriptClear={() => setRestoredScript(null)}
                    />
              )}

              {/* InlinePlayer removed - using only V0MeditationPlayer now */}

            </div>
          )}

          {/* VIEW: PLAYER (Immersive Mode) */}
          {currentView === View.PLAYER && (
            <Suspense fallback={<div className="fixed inset-0 z-[100] bg-[#0f172a] flex items-center justify-center"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>}>
              <MeditationPlayer
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                onPlayPause={handleInlineTogglePlayback}
                onSeek={handleInlineSeek}
                onSkip={(seconds) => {
                  // Calculate new time and seek to it
                  const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
                  handleInlineSeek(newTime);
                }}
                onClose={() => {
                  handleInlinePause();
                  stopBackgroundMusic();
                  setCurrentView(View.HOME);
                }}
                backgroundMusicEnabled={selectedBackgroundTrack.id !== 'none' && isMusicPlaying}
                backgroundVolume={backgroundVolume}
                onBackgroundVolumeChange={updateBackgroundVolume}
                onBackgroundMusicToggle={() => {
                  if (isMusicPlaying) {
                    stopBackgroundMusic();
                  } else if (selectedBackgroundTrack.id !== 'none') {
                    startBackgroundMusic(selectedBackgroundTrack);
                  }
                }}
                backgroundTrackName={selectedBackgroundTrack.name}
                userId={user?.id}
                voiceId={selectedVoice?.id}
                voiceName={selectedVoice?.name}
                meditationType="custom"
              />
            </Suspense>
          )}

        </main>

        {/* MODAL: Voice Clone (lazy-loaded) */}
        {showCloneModal && (
          <Suspense fallback={<div className="fixed inset-0 z-[90] bg-slate-950/90 flex items-center justify-center"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <SimpleVoiceClone
              onClose={() => {
                setShowCloneModal(false);
                setCloningStatus({ state: 'idle' });
              }}
              onRecordingComplete={handleCloneRecordingComplete}
              cloningStatus={cloningStatus}
              creditInfo={creditInfo}
            />
          </Suspense>
        )}

        {/* MODAL: Templates */}
        {showTemplatesModal && (
          <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex flex-col p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
            <Starfield />

            {/* Back Button */}
            <button
              onClick={() => {
                setShowTemplatesModal(false);
                setSelectedCategory(null);
                setSelectedSubgroup(null);
              }}
              className="fixed top-6 left-6 md:top-8 md:left-8 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-[100]"
            >
              <div className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
                <ICONS.ArrowBack className="w-5 h-5" />
              </div>
              <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.3em]">Back</span>
            </button>

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
                          ? 'hover:border-cyan-500/30 '
                          : 'hover:border-pink-500/30 '
                      }`}
                    >
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                        category.id === 'meditation'
                          ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20'
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
                          ? 'hover:border-cyan-500/30'
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
                            ? 'hover:border-cyan-500/30'
                            : 'hover:border-pink-500/30'
                        }`}
                      >
                        <h5 className="text-base font-bold text-white mb-1.5">{template.title}</h5>
                        <p className="text-sm text-slate-400 leading-relaxed">{template.description}</p>
                        <div className={`mt-3 text-[10px] font-bold uppercase tracking-widest ${
                          selectedCategory === 'meditation' ? 'text-cyan-400' : 'text-pink-400'
                        }`}>
                          Use Template →
                        </div>
                      </GlassCard>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: Music Selector */}
        {showMusicModal && (
          <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex flex-col p-4 md:p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
            <Starfield />

            <button
              onClick={() => {
                stopPreview();
                setShowMusicModal(false);
              }}
              className="fixed top-4 left-4 md:top-6 md:left-6 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-[100]"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 min-w-[40px] min-h-[40px] rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
                <ICONS.ArrowBack className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.3em]">Back</span>
            </button>

            <div className="flex-1 flex flex-col items-center pt-16 md:pt-12 relative z-10 max-w-5xl mx-auto w-full">
              <div className="inline-block px-4 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-4 md:mb-6">Background</div>
              <h2 className="text-2xl md:text-4xl font-extralight text-center mb-2 tracking-tight">
                <span className="bg-gradient-to-r from-emerald-300 via-cyan-200 to-teal-300 bg-clip-text text-transparent">Choose Music</span>
              </h2>
              <p className="text-slate-500 text-center mb-6 md:mb-8 text-sm">Select background audio for your meditation</p>

              <div className="w-full space-y-6">
                {Object.entries(tracksByCategory).map(([category, tracks]) => {
                  const config = categoryConfig[category];
                  if (!config) return null;
                  return (
                    <div key={category}>
                      <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${config.color}`}>
                        {config.label}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                        {tracks.map((track) => (
                          <div
                            key={track.id}
                            className={`p-3 md:p-4 rounded-xl text-left transition-all relative group ${
                              selectedBackgroundTrack.id === track.id
                                ? `${config.bgColor} border-2 border-current ${config.color}`
                                : 'bg-white/5 hover:bg-white/10 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <ICONS.Music className={`w-4 h-4 flex-shrink-0 ${selectedBackgroundTrack.id === track.id ? config.color : 'text-slate-500'}`} />
                                <span className={`font-medium text-sm truncate ${selectedBackgroundTrack.id === track.id ? 'text-white' : 'text-slate-300'}`}>
                                  {track.name}
                                </span>
                              </div>
                              {/* Preview button - only show if track has audioUrl */}
                              {track.audioUrl && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePreviewTrack(track);
                                  }}
                                  className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                                    previewingTrackId === track.id
                                      ? 'bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/30'
                                      : 'bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white hover:scale-105'
                                  }`}
                                  title={previewingTrackId === track.id ? 'Stop preview' : 'Preview track'}
                                >
                                  {previewingTrackId === track.id ? (
                                    <ICONS.Pause className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                  ) : (
                                    <ICONS.Player className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2 mb-2">{track.description}</p>
                            {/* Select button */}
                            <button
                              onClick={() => {
                                stopPreview();
                                setSelectedBackgroundTrack(track);
                                startBackgroundMusic(track);
                                setShowMusicModal(false);
                              }}
                              className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                                selectedBackgroundTrack.id === track.id
                                  ? 'bg-white/20 text-white'
                                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              {selectedBackgroundTrack.id === track.id ? '✓ Selected' : 'Select'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Audio Tags Selector */}
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
                        try {
                          await updateAudioTagPreferences({ enabled: newValue });
                        } catch (err) {
                          console.warn('Failed to save audio tag preference:', err);
                        }
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

                  {/* Smart Suggestions */}
                  {suggestedAudioTags.length > 0 && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                      <p className="text-xs font-medium text-amber-300 mb-2">✨ Suggested for your prompt</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedAudioTags.map(tagId => {
                          const tag = AUDIO_TAG_CATEGORIES.flatMap(c => c.tags).find(t => t.id === tagId);
                          const isAlreadySelected = selectedAudioTags.includes(tagId);
                          return tag ? (
                            <button
                              key={tagId}
                              onClick={() => {
                                if (!isAlreadySelected) {
                                  setSelectedAudioTags(prev => [...prev, tagId]);
                                }
                              }}
                              disabled={isAlreadySelected}
                              className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                                isAlreadySelected
                                  ? 'bg-amber-500/10 text-amber-500/50 cursor-not-allowed'
                                  : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                              }`}
                            >
                              {tag.label} {isAlreadySelected ? '✓' : '+'}
                            </button>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

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

        {/* MODAL: Script Preview & Edit - Using unified MeditationEditor */}
        {showScriptPreview && (
          <Suspense fallback={
            <div className="fixed inset-0 z-[60] bg-[#020617] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
            </div>
          }>
            <MeditationEditor
              script={editableScript}
              selectedVoice={selectedVoice}
              selectedMusic={selectedBackgroundTrack}
              selectedTags={selectedAudioTags}
              availableMusic={BACKGROUND_TRACKS}
              availableTags={AUDIO_TAG_CATEGORIES}
              onVoiceSelect={() => setShowVoiceManager(true)}
              onMusicSelect={(track) => setSelectedBackgroundTrack(track)}
              onTagToggle={(tagId) => {
                setSelectedAudioTags(prev =>
                  prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
                );
              }}
              onGenerate={(updatedScript) => {
                setEditableScript(updatedScript);
                throttledPlayEditedScript();
              }}
              onClose={() => !(isGenerating || isExtending) && setShowScriptPreview(false)}
              isGenerating={isGenerating || isExtending}
              source="direct"
            />
          </Suspense>
        )}

        {/* Auth Modal (lazy-loaded) */}
        <Suspense fallback={null}>
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => {
              setShowAuthModal(false);
              checkUser();
            }}
          />
        </Suspense>

        {/* Voice Manager Modal (lazy-loaded) */}
        <Suspense fallback={null}>
          <VoiceManager
            isOpen={showVoiceManager}
            onClose={() => setShowVoiceManager(false)}
            onSelectVoice={(voice) => {
              // Determine provider based on available IDs (fish-audio > chatterbox)
              const provider = voice.fish_audio_model_id ? 'fish-audio' as const : 'chatterbox' as const;
              const voiceProfile: VoiceProfile = {
                id: voice.id,
                name: voice.name,
                provider,
                voiceName: voice.name,
                description: voice.description || 'Your personalized voice clone',
                isCloned: true,
                providerVoiceId: voice.provider_voice_id,
                fishAudioModelId: voice.fish_audio_model_id,
                voiceSampleUrl: voice.voice_sample_url,
              };
              setSelectedVoice(voiceProfile);
              setShowVoiceManager(false);
            }}
            onCloneVoice={() => {
              openCloneModal();
              setMicError(null);
            }}
            onVoiceDeleted={(deletedVoiceId) => {
              // Clear selection if deleted voice was selected
              if (selectedVoice?.id === deletedVoiceId) {
                setSelectedVoice(null);
              }
              // Remove from available voices
              setAvailableVoices(prev => prev.filter(v => v.id !== deletedVoiceId));
            }}
            currentVoiceId={selectedVoice?.id}
          />
        </Suspense>

        {/* Sidebar Overlay */}
        {showBurgerMenu && (
          <div
            className="fixed inset-0 z-[90] bg-black/70"
            onClick={() => setShowBurgerMenu(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed top-0 left-0 h-full w-72 z-[95] flex flex-col transition-transform duration-300 ${
            showBurgerMenu ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ backgroundColor: '#030712' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <div
              className="cursor-pointer"
              onClick={() => { setCurrentView(View.HOME); setShowBurgerMenu(false); }}
            >
              <ICONS.Logo className="h-5 text-white" />
            </div>
            <button
              onClick={() => setShowBurgerMenu(false)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <div className="p-4 space-y-1">
            <button
              onClick={() => { setShowBurgerMenu(false); setShowHowItWorks(true); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
              How It Works
            </button>
            <button
              onClick={() => { setShowBurgerMenu(false); setShowLibrary(true); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              Library
            </button>
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-white/5" />

          {/* History */}
          <div className="flex-1 flex flex-col min-h-0 p-4">
            <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider mb-3">History</p>
            <div className="flex-1 overflow-y-auto space-y-1">
              {user ? (
                isLoadingHistory ? (
                  <div className="flex justify-center py-6">
                    <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                  </div>
                ) : meditationHistory.length > 0 ? (
                  meditationHistory.slice(0, 10).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        const scriptToRestore = item.enhanced_script || item.prompt;
                        setScript(item.prompt);
                        setEnhancedScript(scriptToRestore);
                        setRestoredScript(scriptToRestore);
                        if (item.voice_id && savedVoices.length > 0) {
                          const matchingVoice = savedVoices.find(v => v.id === item.voice_id);
                          if (matchingVoice) {
                            setSelectedVoice({
                              id: matchingVoice.id,
                              name: matchingVoice.name,
                              provider: 'chatterbox',
                              voiceName: matchingVoice.name,
                              description: 'Cloned voice',
                              isCloned: true,
                              providerVoiceId: matchingVoice.provider_voice_id,
                            });
                          }
                        }
                        setShowBurgerMenu(false);
                      }}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-white/5 transition-colors group"
                    >
                      <p className="text-sm text-slate-400 group-hover:text-white truncate">{item.prompt}</p>
                      <p className="text-[10px] text-slate-600 mt-1">{new Date(item.created_at).toLocaleDateString()}</p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-600 text-center py-6">No history yet</p>
                )
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500 mb-3">Sign in to view history</p>
                  <button
                    onClick={() => { setShowBurgerMenu(false); setShowAuthModal(true); }}
                    className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/30 transition-colors"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/5 space-y-3">
            {user && (
              <button
                onClick={() => { setShowBurgerMenu(false); handleSignOut(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/5 transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            )}
            <div className="flex items-center justify-center gap-3 text-[10px] text-slate-600">
              <button onClick={() => { setShowBurgerMenu(false); setShowAboutUs(true); }} className="hover:text-white transition-colors">About</button>
              <span>·</span>
              <button onClick={() => { setShowBurgerMenu(false); setShowTerms(true); }} className="hover:text-white transition-colors">Terms</button>
              <span>·</span>
              <button onClick={() => { setShowBurgerMenu(false); setShowPrivacy(true); }} className="hover:text-white transition-colors">Privacy</button>
            </div>
            <p className="text-[9px] text-slate-700 text-center">© {new Date().getFullYear()} INrVO</p>
          </div>
        </div>

        {/* MODAL: How It Works */}
        {showHowItWorks && (
          <div className="fixed inset-0 z-[80] bg-[#020617]/98 backdrop-blur-3xl flex flex-col p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
            <Starfield />

            <button
              onClick={() => setShowHowItWorks(false)}
              className="fixed top-6 left-6 md:top-8 md:left-8 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-[100]"
            >
              <div className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full border border-white/[0.06] bg-white/[0.02] flex items-center justify-center group-hover:bg-white/[0.08] group-hover:scale-105 group-hover:border-cyan-500/20 transition-all">
                <ICONS.ArrowBack className="w-5 h-5" />
              </div>
              <span className="hidden md:inline text-[11px] font-medium uppercase tracking-[0.25em] text-slate-500 group-hover:text-white transition-colors">Back</span>
            </button>

            <div className="flex-1 flex flex-col items-center justify-center pt-16 md:pt-0 relative z-10 max-w-4xl mx-auto w-full">
              {/* Badge */}
              <div className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-semibold uppercase tracking-[0.35em] mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                Guide
              </div>

              {/* Title */}
              <h2 className="text-3xl md:text-5xl font-extralight text-center mb-3 tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms' }}>
                <span className="bg-gradient-to-r from-cyan-300 via-white to-purple-300 bg-clip-text text-transparent">How INrVO Works</span>
              </h2>
              <p className="text-slate-500 text-center mb-14 max-w-md text-sm animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '150ms' }}>Create personalized meditations in seconds with AI</p>

              {/* Step Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
                {/* Step 1 */}
                <div className="step-card group">
                  <GlassCard className="!p-7 !rounded-2xl text-center h-full border-white/[0.04] hover:border-cyan-500/20 transition-all duration-300" hover={false}>
                    <div className="step-number w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-cyan-400/5 border border-cyan-500/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform duration-300">
                      <span className="text-2xl font-bold bg-gradient-to-br from-cyan-300 to-cyan-500 bg-clip-text text-transparent">1</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2.5">Write Your Intention</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">Type a short phrase like "calm my anxiety" or "help me sleep" - or use voice input</p>
                  </GlassCard>
                </div>

                {/* Step 2 */}
                <div className="step-card group">
                  <GlassCard className="!p-7 !rounded-2xl text-center h-full border-white/[0.04] hover:border-purple-500/20 transition-all duration-300" hover={false}>
                    <div className="step-number w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/15 to-purple-400/5 border border-purple-500/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform duration-300">
                      <span className="text-2xl font-bold bg-gradient-to-br from-purple-300 to-purple-500 bg-clip-text text-transparent">2</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2.5">Customize</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">Choose a voice, select background music, or browse templates for inspiration</p>
                  </GlassCard>
                </div>

                {/* Step 3 */}
                <div className="step-card group">
                  <GlassCard className="!p-7 !rounded-2xl text-center h-full border-white/[0.04] hover:border-pink-500/20 transition-all duration-300" hover={false}>
                    <div className="step-number w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/15 to-pink-400/5 border border-pink-500/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform duration-300">
                      <span className="text-2xl font-bold bg-gradient-to-br from-pink-300 to-pink-500 bg-clip-text text-transparent">3</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2.5">Listen & Relax</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">AI generates a full meditation script and reads it aloud with your chosen voice</p>
                  </GlassCard>
                </div>
              </div>

              {/* Pro Tips */}
              <div className="mt-14 w-full animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '600ms' }}>
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em] text-center mb-6">Pro Tips</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="pro-tip flex items-start gap-3.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <ICONS.Sparkle className="tip-icon w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-500"><span className="text-slate-300 font-medium">Be specific:</span> "5-minute morning energy boost" works better than just "energy"</p>
                  </div>
                  <div className="pro-tip flex items-start gap-3.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <ICONS.Microphone className="tip-icon w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-500"><span className="text-slate-300 font-medium">Clone your voice:</span> Record yourself to hear meditations in your own voice</p>
                  </div>
                  <div className="pro-tip flex items-start gap-3.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <ICONS.Music className="tip-icon w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-500"><span className="text-slate-300 font-medium">Add emotion:</span> Include feelings like "warm", "peaceful", or "empowering"</p>
                  </div>
                  <div className="pro-tip flex items-start gap-3.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <ICONS.Book className="tip-icon w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-500"><span className="text-slate-300 font-medium">Use templates:</span> Browse pre-made prompts for quick inspiration</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Library */}
        {showLibrary && (
          <div className="fixed inset-0 z-[80] flex flex-col p-6 animate-in fade-in duration-300 overflow-y-auto">
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

            <div className="flex-1 flex flex-col items-center justify-center pt-16 md:pt-0 relative z-10 max-w-4xl mx-auto">
              <div className="inline-block px-4 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Library</div>
              <h2 className="text-3xl md:text-5xl font-extralight text-center mb-4 tracking-tight">
                <span className="bg-gradient-to-r from-emerald-300 via-cyan-200 to-teal-300 bg-clip-text text-transparent">My Library</span>
              </h2>
              <p className="text-slate-500 text-center mb-12 max-w-lg">Your saved meditations and audio generations</p>

              {user ? (
                <div className="w-full">
                  {/* Tab Switcher */}
                  <div className="flex justify-center gap-2 mb-8">
                    <button
                      onClick={() => setLibraryTab('all')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        libraryTab === 'all'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      All Meditations
                    </button>
                    <button
                      onClick={() => setLibraryTab('favorites')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        libraryTab === 'favorites'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      ⭐ Favorites
                    </button>
                  </div>

                  {/* Meditation List */}
                  {isLoadingHistory ? (
                    <div className="flex justify-center py-12">
                      <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    </div>
                  ) : (
                    (() => {
                      const filteredMeditations = libraryTab === 'favorites'
                        ? meditationHistory.filter(m => m.is_favorite)
                        : meditationHistory;

                      const meditationsWithAudio = filteredMeditations.filter(m => m.audio_url);
                      const meditationsWithoutAudio = filteredMeditations.filter(m => !m.audio_url);

                      if (filteredMeditations.length === 0) {
                        return (
                          <GlassCard className="!p-8 !rounded-2xl text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-500/10 flex items-center justify-center mx-auto mb-4">
                              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">
                              {libraryTab === 'favorites' ? 'No favorites yet' : 'No meditations yet'}
                            </h3>
                            <p className="text-slate-400 text-sm">
                              {libraryTab === 'favorites'
                                ? 'Mark meditations as favorites to see them here'
                                : 'Generate a meditation with a cloned voice to save it here'}
                            </p>
                          </GlassCard>
                        );
                      }

                      return (
                        <div className="space-y-6">
                          {/* Meditations with saved audio */}
                          {meditationsWithAudio.length > 0 && (
                            <div>
                              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                                Saved with Audio ({meditationsWithAudio.length})
                              </h3>
                              <div className="grid gap-4">
                                {meditationsWithAudio.map((meditation) => (
                                  <GlassCard key={meditation.id} className="!p-4 !rounded-xl">
                                    <div className="flex items-start gap-4">
                                      {/* Play/Stop Button */}
                                      <button
                                        onClick={() => {
                                          if (libraryPlayingId === meditation.id) {
                                            stopLibraryPlayback();
                                          } else {
                                            playLibraryMeditation(meditation);
                                          }
                                        }}
                                        className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                                          libraryPlayingId === meditation.id
                                            ? 'bg-emerald-500 text-white animate-pulse'
                                            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                        }`}
                                      >
                                        {libraryPlayingId === meditation.id ? (
                                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <rect x="6" y="4" width="4" height="16" rx="1" />
                                            <rect x="14" y="4" width="4" height="16" rx="1" />
                                          </svg>
                                        ) : (
                                          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                          </svg>
                                        )}
                                      </button>

                                      {/* Content */}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm line-clamp-2 mb-1">{meditation.prompt}</p>
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                          <span>{new Date(meditation.created_at).toLocaleDateString()}</span>
                                          {meditation.duration_seconds && (
                                            <span>{Math.floor(meditation.duration_seconds / 60)}:{String(meditation.duration_seconds % 60).padStart(2, '0')}</span>
                                          )}
                                          {meditation.voice_name && (
                                            <span className="text-cyan-400">{meditation.voice_name}</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Actions */}
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleToggleFavorite(meditation.id)}
                                          className={`p-2 rounded-lg transition-colors ${
                                            meditation.is_favorite
                                              ? 'text-amber-400 bg-amber-500/20'
                                              : 'text-slate-500 hover:text-amber-400 hover:bg-white/5'
                                          }`}
                                        >
                                          <svg className="w-4 h-4" fill={meditation.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => handleDeleteMeditation(meditation.id)}
                                          className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/5 transition-colors"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  </GlassCard>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Meditations without audio (history only) */}
                          {meditationsWithoutAudio.length > 0 && libraryTab === 'all' && (
                            <div>
                              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                History (no audio saved) ({meditationsWithoutAudio.length})
                              </h3>
                              <div className="grid gap-3">
                                {meditationsWithoutAudio.slice(0, 10).map((meditation) => (
                                  <div key={meditation.id} className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 rounded-full bg-slate-500/20 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-slate-400 text-sm truncate">{meditation.prompt}</p>
                                        <p className="text-xs text-slate-600 mt-1">{new Date(meditation.created_at).toLocaleDateString()}</p>
                                      </div>
                                      <button
                                        onClick={() => {
                                          // Restore meditation to editor
                                          const scriptToRestore = meditation.enhanced_script || meditation.prompt;
                                          setScript(meditation.prompt);
                                          setEnhancedScript(scriptToRestore);
                                          setRestoredScript(scriptToRestore);
                                          setShowLibrary(false);
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs hover:bg-cyan-500/30 transition-colors"
                                      >
                                        Restore
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Load More Button */}
                          {hasMoreHistory && libraryTab === 'all' && (
                            <div className="flex justify-center pt-4">
                              <button
                                onClick={loadMoreHistory}
                                disabled={isLoadingMore}
                                className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                {isLoadingMore ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Loading...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    Load More
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              ) : (
                <GlassCard className="!p-8 !rounded-2xl text-center max-w-md">
                  <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Sign in to access your library</h3>
                  <p className="text-slate-400 mb-6">Create an account to save and revisit your meditations</p>
                  <button
                    onClick={() => {
                      setShowLibrary(false);
                      setShowAuthModal(true);
                    }}
                    className="px-6 py-3 rounded-full bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-all"
                  >
                    Sign In
                  </button>
                </GlassCard>
              )}
            </div>
          </div>
        )}

        {/* MODAL: Pricing */}
        {showPricing && (
          <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex flex-col p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
            <Starfield />

            <button
              onClick={() => setShowPricing(false)}
              className="fixed top-6 left-6 md:top-8 md:left-8 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-[100]"
            >
              <div className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
                <ICONS.ArrowBack className="w-5 h-5" />
              </div>
              <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.3em]">Back</span>
            </button>

            <div className="flex-1 flex flex-col items-center justify-center pt-16 md:pt-0 relative z-10 max-w-5xl mx-auto">
              <div className="inline-block px-4 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Pricing</div>
              <h2 className="text-3xl md:text-5xl font-extralight text-center mb-4 tracking-tight">
                <span className="bg-gradient-to-r from-amber-300 via-orange-200 to-yellow-300 bg-clip-text text-transparent">Simple Pricing</span>
              </h2>
              <p className="text-slate-500 text-center mb-12 max-w-lg">Choose the plan that works for you</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                {/* Free Tier */}
                <GlassCard className="!p-6 !rounded-2xl">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-white mb-1">Free</h3>
                    <div className="text-3xl font-bold text-white">$0</div>
                    <div className="text-sm text-slate-500">Forever free</div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      5 meditations per day
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      4 AI voices
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Basic templates
                    </li>
                  </ul>
                  <button className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all">
                    Current Plan
                  </button>
                </GlassCard>

                {/* Pro Tier */}
                <GlassCard className="!p-6 !rounded-2xl border-2 border-amber-500/30 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider">
                    Most Popular
                  </div>
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-white mb-1">Pro</h3>
                    <div className="text-3xl font-bold text-white">$9.99</div>
                    <div className="text-sm text-slate-500">per month</div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Unlimited meditations
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Voice cloning
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      All background music
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Download audio files
                    </li>
                  </ul>
                  <button className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-all">
                    Upgrade to Pro
                  </button>
                </GlassCard>

                {/* Team Tier */}
                <GlassCard className="!p-6 !rounded-2xl">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-white mb-1">Team</h3>
                    <div className="text-3xl font-bold text-white">$29.99</div>
                    <div className="text-sm text-slate-500">per month</div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Everything in Pro
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      5 team members
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Shared library
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Priority support
                    </li>
                  </ul>
                  <button className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all">
                    Contact Sales
                  </button>
                </GlassCard>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: About Us */}
        {showAboutUs && (
          <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex flex-col p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
            <Starfield />

            <button
              onClick={() => setShowAboutUs(false)}
              className="fixed top-6 left-6 md:top-8 md:left-8 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-[100]"
            >
              <div className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
                <ICONS.ArrowBack className="w-5 h-5" />
              </div>
              <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.3em]">Back</span>
            </button>

            <div className="flex-1 flex flex-col items-center justify-center pt-16 md:pt-0 relative z-10 max-w-3xl mx-auto">
              <div className="inline-block px-4 py-1 rounded-full bg-pink-500/10 text-pink-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">About</div>
              <h2 className="text-3xl md:text-5xl font-extralight text-center mb-4 tracking-tight">
                <span className="bg-gradient-to-r from-pink-300 via-rose-200 to-purple-300 bg-clip-text text-transparent">About INrVO</span>
              </h2>

              <div className="w-full space-y-8 mt-8">
                <GlassCard className="!p-8 !rounded-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">Our Mission</h3>
                  <p className="text-slate-400 leading-relaxed">
                    INrVO was born from a simple belief: everyone deserves access to personalized wellness tools.
                    We're combining the ancient wisdom of meditation with cutting-edge AI to create experiences
                    that are uniquely tailored to you.
                  </p>
                </GlassCard>

                <GlassCard className="!p-8 !rounded-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">What Makes Us Different</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <ICONS.Sparkle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">AI-Powered Personalization</h4>
                        <p className="text-sm text-slate-400">Every meditation is generated uniquely for you based on your intentions and preferences.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <ICONS.Microphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">Voice Cloning Technology</h4>
                        <p className="text-sm text-slate-400">Hear meditations in your own voice or choose from our selection of calming AI voices.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <ICONS.Neural className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">Instant Generation</h4>
                        <p className="text-sm text-slate-400">No waiting for pre-recorded content. Get a fresh meditation in seconds, whenever you need it.</p>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                <div className="text-center pt-4">
                  <p className="text-slate-500 text-sm">
                    Built with love for wellness seekers everywhere.
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">Twitter</a>
                    <span className="text-slate-700">•</span>
                    <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">Instagram</a>
                    <span className="text-slate-700">•</span>
                    <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">Contact</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
              <div className="inline-block px-4 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Legal</div>
              <h2 className="text-3xl md:text-5xl font-extralight text-center mb-4 tracking-tight">
                <span className="bg-gradient-to-r from-cyan-300 via-purple-200 to-pink-300 bg-clip-text text-transparent">Terms of Service</span>
              </h2>
              <p className="text-slate-500 text-center mb-8">Last updated: December 2024</p>

              <div className="w-full space-y-6 text-slate-300 text-sm md:text-base leading-relaxed pb-8">
                <GlassCard className="!p-6 !rounded-2xl">
                  <h3 className="text-lg font-bold text-white mb-3">1. Acceptance of Terms</h3>
                  <p className="text-slate-400">By accessing and using INrVO ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
                </GlassCard>

                <GlassCard className="!p-6 !rounded-2xl">
                  <h3 className="text-lg font-bold text-white mb-3">2. Description of Service</h3>
                  <p className="text-slate-400">INrVO provides AI-powered meditation generation, voice synthesis, and audio experiences. The Service uses third-party AI providers including Google Gemini and Replicate.</p>
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
                  <p className="text-slate-400">For questions about these Terms, contact us at <a href="https://qualiasolutions.net" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 transition-colors">qualiasolutions.net</a></p>
                </GlassCard>
              </div>
            </div>
          </div>
        )}

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

              <div className="w-full space-y-6 text-slate-300 text-sm md:text-base leading-relaxed pb-8">
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
                  <p className="text-slate-400">We use secure AI services for meditation generation and voice synthesis. These services have their own privacy policies. Voice data sent for cloning is processed securely according to our providers' terms.</p>
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
                  <p className="text-slate-400">For privacy inquiries, contact us at <a href="https://qualiasolutions.net" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">qualiasolutions.net</a></p>
                </GlassCard>
              </div>
            </div>
          </div>
        )}

        {/* Music Debug Panel (Development Only) */}
        {import.meta.env.DEV && (
          <div className="fixed bottom-4 right-4 bg-slate-900/95 border border-slate-700 p-4 rounded-lg text-xs font-mono z-[200] max-w-xs shadow-xl">
            <h3 className="font-bold text-cyan-400 mb-2 flex items-center gap-2">
              <ICONS.Music className="w-4 h-4" />
              Music Debug
            </h3>
            <div className="space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Selected:</span>
                <span>{selectedBackgroundTrack.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Playing:</span>
                <span className={isMusicPlaying ? 'text-green-400' : 'text-red-400'}>
                  {isMusicPlaying ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Audio Ref:</span>
                <span className={backgroundAudioRef.current ? 'text-green-400' : 'text-slate-500'}>
                  {backgroundAudioRef.current ? 'Active' : 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Volume:</span>
                <span>{Math.round(backgroundVolume * 100)}%</span>
              </div>
              {musicError && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Error:</span>
                  <span className="text-amber-400 truncate max-w-[120px]">{musicError}</span>
                </div>
              )}
              {backgroundAudioRef.current && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Paused:</span>
                    <span>{backgroundAudioRef.current.paused ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ready:</span>
                    <span>{backgroundAudioRef.current.readyState >= 3 ? 'Yes' : 'Loading...'}</span>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => {
                if (selectedBackgroundTrack.id !== 'none') {
                  console.log('[Debug] Manual music test');
                  startBackgroundMusic(selectedBackgroundTrack);
                }
              }}
              className="mt-3 w-full bg-cyan-600 hover:bg-cyan-500 text-white py-1.5 px-3 rounded text-xs transition-colors"
            >
              Test Music
            </button>
          </div>
        )}

      </div>
    </>
  );
};

export default App;
