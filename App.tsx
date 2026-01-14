
import React, { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { View, VoiceProfile, ScriptTimingMap, CloningStatus, CreditInfo, VoiceMetadata } from './types';
import { TEMPLATE_CATEGORIES, VOICE_PROFILES, ICONS, BACKGROUND_TRACKS, BackgroundTrack, AUDIO_TAG_CATEGORIES, KEYWORD_TAG_MAP, MUSIC_CATEGORY_CONFIG, TRACKS_BY_CATEGORY, getSuggestedTags, NATURE_SOUNDS, NatureSound } from './constants';
import { useModals } from './src/contexts/ModalContext';
import { useAuthModal, type AuthModalMode } from './src/contexts/modals/AuthModalContext';
import { useAuth } from './src/contexts/AuthContext';
import { useScript } from './src/contexts/ScriptContext';
import { useLibrary } from './src/contexts/LibraryContext';
import { useAudioTags } from './src/contexts/AudioTagsContext';
import { useChatHistory } from './src/contexts/ChatHistoryContext';
import { useOnboarding } from './src/contexts/OnboardingContext';
import { useAudioPlayback } from './src/contexts/AudioPlaybackContext';
import GlassCard from './components/GlassCard';
import Starfield from './components/Starfield';
import Background from './components/Background';
import LoadingScreen from './components/LoadingScreen';
import { AIVoiceInput } from './components/ui/ai-voice-input';

// Lazy-loaded components for bundle optimization (~400KB saved on initial load)
const AuthModal = lazy(() => import('./components/AuthModal'));
const SimpleVoiceClone = lazy(() => import('./components/SimpleVoiceClone').then(m => ({ default: m.SimpleVoiceClone })));
const MeditationEditor = lazy(() => import('./src/components/MeditationEditor'));
const MeditationPlayer = lazy(() => import('./components/V0MeditationPlayer'));
// InlinePlayer removed - using only V0MeditationPlayer now
// AgentChat lazy-loaded to reduce initial bundle (~15KB savings)
const AgentChat = lazy(() => import('./components/AgentChat').then(m => ({ default: m.AgentChat })));
// Onboarding lazy-loaded to not impact initial bundle
const Onboarding = lazy(() => import('./src/components/Onboarding'));
// Error boundary for handling chunk load failures gracefully
import ErrorBoundary from './components/ErrorBoundary';
// Modal components extracted to reduce App.tsx complexity
import { MusicSelectorModal } from './src/components/MusicSelectorModal';
import { NatureSoundSelectorModal } from './src/components/NatureSoundSelectorModal';
import { AudioTagsModal } from './src/components/AudioTagsModal';
import OfflineIndicator from './components/OfflineIndicator';
import { Sidebar } from './components/Sidebar';
import { buildTimingMap, getCurrentWordIndex } from './src/lib/textSync';
import { geminiService, blobToBase64 } from './geminiService';
import { voiceService } from './src/lib/voiceService';
// Voice cloning functions are dynamically imported where used to avoid bundle bloat
// See: voiceService.ts also imports edgeFunctions dynamically
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
import { supabase, signOut, createVoiceProfile, getUserVoiceProfiles, getVoiceProfileById, VoiceProfile as DBVoiceProfile, createVoiceClone, saveMeditationHistory, deleteMeditationHistory, MeditationHistory, updateAudioTagPreferences, AudioTagPreference, getMeditationAudioSignedUrl, toggleMeditationFavorite } from './lib/supabase';
import { checkIsAdmin } from './src/lib/adminSupabase';

// Time-aware taglines for more personalized greeting experience
const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

const TAGLINES_BY_TIME = {
  morning: [
    { main: 'Start your day', highlight: 'mindfully', sub: '' },
    { main: 'Good morning.', highlight: 'Breathe deep.', sub: '' },
    { main: 'A fresh start', highlight: 'awaits', sub: '' },
  ],
  afternoon: [
    { main: 'Take a moment', highlight: 'to reset', sub: '' },
    { main: 'Pause.', highlight: 'Breathe.', sub: '' },
    { main: 'Find your', highlight: 'center', sub: '' },
  ],
  evening: [
    { main: 'Unwind', highlight: 'your mind', sub: '' },
    { main: 'Let the day', highlight: 'fade away', sub: '' },
    { main: 'Time to', highlight: 'decompress', sub: '' },
  ],
  night: [
    { main: 'Quiet your', highlight: 'thoughts', sub: '' },
    { main: 'Drift into', highlight: 'tranquility', sub: '' },
    { main: 'Peace', highlight: 'before sleep', sub: '' },
  ],
};

// Universal taglines (fallback and variety)
const UNIVERSAL_TAGLINES = [
  { main: 'Meditation,', highlight: 'made for you', sub: '' },
  { main: 'Your moment of', highlight: 'calm', sub: '' },
  { main: 'Designed', highlight: 'around you', sub: '' },
  { main: 'Your personal', highlight: 'sanctuary', sub: '' },
  { main: 'Peace,', highlight: 'on your terms', sub: '' },
];

// Get a contextual tagline based on time of day
const getTagline = () => {
  const timeOfDay = getTimeOfDay();
  const timeTaglines = TAGLINES_BY_TIME[timeOfDay];
  // 70% chance to use time-specific tagline, 30% universal for variety
  const useTimeSpecific = Math.random() < 0.7;
  const pool = useTimeSpecific ? timeTaglines : UNIVERSAL_TAGLINES;
  return pool[Math.floor(Math.random() * pool.length)];
};

const App: React.FC = () => {
  const navigate = useNavigate();

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
    closeAllModals,
  } = useModals();

  // Auth modal mode context for controlling signin/signup/forgot mode
  const { authModalMode, openAuthModal: openAuthModalWithMode } = useAuthModal();

  // URL search params for auth redirects
  const [searchParams, setSearchParams] = useSearchParams();

  // Use domain-specific contexts for shared state
  const {
    user, checkUser, savedVoices, setSavedVoices, currentClonedVoice, setCurrentClonedVoice,
    loadUserVoices, isLoadingVoices, isSessionReady
  } = useAuth();

  const {
    script, setScript, enhancedScript, setEnhancedScript, editableScript, setEditableScript,
    isGenerating, setIsGenerating, generationStage, setGenerationStage,
    chatStarted, setChatStarted, restoredScript, setRestoredScript, resetScript
  } = useScript();

  const {
    meditationHistory, setMeditationHistory, isLoadingHistory,
    isLoadingMore, hasMoreHistory, loadMoreHistory, refreshHistory
  } = useLibrary();

  const {
    selectedAudioTags, setSelectedAudioTags,
    audioTagsEnabled, setAudioTagsEnabled,
    favoriteAudioTags, setFavoriteAudioTags,
    loadAudioTagPreferences
  } = useAudioTags();

  const {
    chatHistory,
    isLoadingChatHistory,
    refreshChatHistory,
    loadConversation,
    deleteConversation,
    startNewConversation,
  } = useChatHistory();

  // Onboarding context for restart tour functionality
  const { restartOnboarding } = useOnboarding();

  // Audio playback context - shared ref for nature sound (allows PlayerPage to stop it on close)
  const { natureSoundAudioRef } = useAudioPlayback();

  // UI-specific state (not shared across components)
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [tagline] = useState(() => getTagline());
  const [isExtending, setIsExtending] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<VoiceProfile[]>(VOICE_PROFILES);
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile | null>(null);

  // Cloning states
  const [cloningStatus, setCloningStatus] = useState<CloningStatus>({ state: 'idle' });
  // Credits are disabled - default to unlimited access for all users
  const [creditInfo, setCreditInfo] = useState<CreditInfo>({
    canClone: true,
    creditsRemaining: 999999999,
    clonesRemaining: 999999,
    cloneCost: 0,
  });

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState<string | null>(null);
  const [selectedBackgroundTrack, setSelectedBackgroundTrack] = useState<BackgroundTrack>(BACKGROUND_TRACKS[0]);

  // Music preview state
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Audio tags - suggestedAudioTags is computed locally, rest from context
  const [suggestedAudioTags, setSuggestedAudioTags] = useState<string[]>([]);

  // Library UI state - pagination managed by context
  const [libraryTab, setLibraryTab] = useState<'all' | 'favorites'>('all');
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

  // Inline player state - script content from ScriptContext
  const [isInlineMode, setIsInlineMode] = useState(false);

  // Resume conversation state - ID of conversation to resume
  const [resumeConversationId, setResumeConversationId] = useState<string | null>(null);

  // Script edit preview state - editableScript from ScriptContext
  const [showScriptPreview, setShowScriptPreview] = useState(false);
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
  const preloadedMusicRef = useRef<Map<string, { audio: HTMLAudioElement; ready: boolean }>>(new Map());
  const [backgroundVolume, setBackgroundVolume] = useState(0.3); // 30% default
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicError, setMusicError] = useState<string | null>(null);

  // Nature/ambient sound state (natureSoundAudioRef comes from AudioPlaybackContext)
  const [selectedNatureSound, setSelectedNatureSound] = useState<NatureSound>(NATURE_SOUNDS[0]); // 'none' by default
  const [natureSoundVolume, setNatureSoundVolume] = useState(0.4); // 40% default
  const [showNatureSoundModal, setShowNatureSoundModal] = useState(false);
  const [previewingNatureSoundId, setPreviewingNatureSoundId] = useState<string | null>(null);
  const previewNatureSoundAudioRef = useRef<HTMLAudioElement | null>(null);

  // Voice playback controls
  const [playbackRate, setPlaybackRate] = useState(1.0); // Normal playback speed
  const [voiceVolume, setVoiceVolume] = useState(0.7); // 70% default for better music balance
  const gainNodeRef = useRef<GainNode | null>(null);
  const playbackRateRef = useRef(1.0);

  // Auth states now managed by AuthContext

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

  // Auth state is now managed by AuthContext - it handles:
  // - checkUser() on mount
  // - Auth listener subscription
  // - Loading voice profiles on login
  // Audio tag preferences are loaded by AudioTagsContext

  // Cleanup audio resources on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Stop and disconnect audio source
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
          audioSourceRef.current.disconnect();
        } catch {
          // Ignore errors if already stopped
        }
        audioSourceRef.current = null;
      }

      // Disconnect gain node
      if (gainNodeRef.current) {
        try {
          gainNodeRef.current.disconnect();
        } catch {
          // Ignore disconnect errors
        }
        gainNodeRef.current = null;
      }

      // Close audio context to release hardware resources
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Release audio buffer memory (can be 5-10MB)
      audioBufferRef.current = null;

      // Stop and release background audio
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.pause();
        backgroundAudioRef.current.src = '';
        backgroundAudioRef.current.load(); // Force release
        backgroundAudioRef.current = null;
      }

      // Stop and release nature sound audio
      if (natureSoundAudioRef.current) {
        natureSoundAudioRef.current.pause();
        natureSoundAudioRef.current.src = '';
        natureSoundAudioRef.current.load();
        natureSoundAudioRef.current = null;
      }

      // Stop preview audio if playing
      if (previewNatureSoundAudioRef.current) {
        previewNatureSoundAudioRef.current.pause();
        previewNatureSoundAudioRef.current.src = '';
        previewNatureSoundAudioRef.current = null;
      }

      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  // Handle auth redirects from email verification or password reset
  useEffect(() => {
    const authAction = searchParams.get('auth');
    const message = searchParams.get('message');

    if (authAction === 'signin') {
      // Open auth modal in signin mode
      setShowAuthModal(true);
      openAuthModalWithMode('signin');

      // Show success toast if there's a message
      if (message) {
        toast.success(decodeURIComponent(message));
      }

      // Clean up URL params
      searchParams.delete('auth');
      searchParams.delete('message');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, setShowAuthModal, openAuthModalWithMode]);

  // Fetch meditation history when library opens
  useEffect(() => {
    if (showLibrary && user && meditationHistory.length === 0) {
      refreshHistory();
    }
  }, [showLibrary, user, meditationHistory.length, refreshHistory]);

  // Fetch chat history when burger menu opens
  useEffect(() => {
    if (showBurgerMenu && user && chatHistory.length === 0) {
      refreshChatHistory();
    }
  }, [showBurgerMenu, user, chatHistory.length, refreshChatHistory]);

  // Check admin status when user changes AND session is ready (has access token)
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id || !isSessionReady) {
        setIsAdmin(false);
        return;
      }
      try {
        const adminStatus = await checkIsAdmin(user.id);
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [user?.id, isSessionReady]);

  // loadMoreHistory is now provided by LibraryContext

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

  // Sync savedVoices from AuthContext to availableVoices format
  useEffect(() => {
    // Convert saved voice profiles to available voices format
    // Include ElevenLabs voices (primary), Fish Audio, and Chatterbox (legacy)
    const clonedVoiceProfiles = savedVoices
      .filter(v => v.elevenlabs_voice_id || v.fish_audio_model_id || v.voice_sample_url || v.provider_voice_id)
      .map(v => {
        // Determine the correct provider based on available IDs
        // Priority: elevenlabs > fish-audio > chatterbox
        let provider: 'elevenlabs' | 'fish-audio' | 'chatterbox';
        if (v.elevenlabs_voice_id) {
          provider = 'elevenlabs';
        } else if (v.fish_audio_model_id) {
          provider = 'fish-audio';
        } else {
          provider = 'chatterbox';
        }

        return {
          id: v.id,
          name: v.name,
          provider,
          voiceName: v.name,
          description: v.description || 'Your personalized voice clone',
          isCloned: true,
          elevenLabsVoiceId: v.elevenlabs_voice_id,  // ElevenLabs voice ID (primary)
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
  }, [savedVoices, selectedVoice]);

  const handleSignOut = async () => {
    try {
      await signOut();
      // Hard refresh to ensure clean state
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out. Please try again.');
    }
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
    } catch (e: unknown) {
      console.error("Microphone access denied", e);
      setMicError(e instanceof Error ? e.message : "Microphone not found. Check permissions.");
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
    } catch (e: unknown) {
      console.error("Microphone access denied", e);
      setMicError(e instanceof Error ? e.message : "Microphone not found. Check permissions.");
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
      // Dynamically import for code splitting
      const { chatterboxCloneVoice } = await import('./src/lib/edgeFunctions');
      let cloneResult: { voiceProfileId: string; voiceSampleUrl: string | null; elevenLabsVoiceId: string };
      try {
        cloneResult = await chatterboxCloneVoice(
          wavBlob,
          finalName,
          'Voice clone created with INrVO'
        );
      } catch (cloneError: unknown) {
        console.error('Chatterbox voice clone failed:', cloneError);
        setMicError(`Voice cloning failed: ${cloneError instanceof Error ? cloneError.message : 'Unknown error'}`);
        return;
      }

      // Save audio sample backup (non-critical)
      try {
        await createVoiceClone(
          finalName,
          audioData,
          'Voice sample for cloned voice',
          { providerVoiceId: cloneResult.voiceSampleUrl || undefined }
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
        provider: 'elevenlabs',
        voiceName: finalName,
        description: 'Your personalized cloned voice',
        isCloned: true,
        elevenLabsVoiceId: cloneResult.elevenLabsVoiceId,
        providerVoiceId: cloneResult.voiceSampleUrl || undefined,
      };
      setSelectedVoice(newVoice);
    } catch (error: unknown) {
      console.error('Failed to auto-save voice:', error);
      setMicError(error instanceof Error ? error.message : 'Failed to save voice. Please try again.');
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
      // Credits are disabled - allow cloning even if credit check fails
      setCreditInfo({
        canClone: true,
        creditsRemaining: 999999999,
        clonesRemaining: 999999,
        cloneCost: 0,
        reason: undefined,
      });
    }
  }, [user]);

  // Handle recording complete from SimpleVoiceClone
  // Uses ElevenLabs Instant Voice Cloning (primary provider)
  const handleCloneRecordingComplete = useCallback(async (blob: Blob, name: string, metadata?: VoiceMetadata) => {
    if (!user) {
      setCloningStatus({ state: 'error', message: 'Please sign in to clone your voice', canRetry: false });
      return;
    }

    setCloningStatus({ state: 'validating' });

    try {
      setCloningStatus({ state: 'processing_audio' });

      // Convert to WAV for ElevenLabs (required format)
      const wavBlob = await convertToWAV(blob);

      setCloningStatus({ state: 'uploading_to_elevenlabs' });

      // Clone with ElevenLabs
      // Dynamic import to avoid duplicate import warning and reduce initial bundle size
      let cloneResult: { voiceProfileId: string; elevenLabsVoiceId: string; voiceSampleUrl: string | null };
      try {
        const { elevenLabsCloneVoice } = await import('./src/lib/edgeFunctions');
        cloneResult = await elevenLabsCloneVoice(
          wavBlob,
          name,
          'Meditation voice clone created with INrVO',
          metadata,
          true // removeBackgroundNoise
        );
        console.log('Voice cloned successfully! Profile ID:', cloneResult.voiceProfileId, 'ElevenLabs Voice:', cloneResult.elevenLabsVoiceId);
      } catch (cloneError: unknown) {
        console.error('Voice cloning failed:', cloneError);
        setCloningStatus({
          state: 'error',
          message: cloneError instanceof Error ? cloneError.message : 'Voice cloning failed',
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
      } catch (dbError: unknown) {
        console.error('Failed to fetch voice profile:', dbError);
        setCloningStatus({
          state: 'error',
          message: dbError instanceof Error ? dbError.message : 'Failed to fetch voice profile',
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
        provider: 'elevenlabs',
        voiceName: savedVoice.name,
        description: savedVoice.description || 'Your personalized cloned voice',
        isCloned: true,
        elevenLabsVoiceId: cloneResult.elevenLabsVoiceId,
        voiceSampleUrl: cloneResult.voiceSampleUrl || undefined,
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
    } catch (error: unknown) {
      console.error('Voice cloning failed:', error);
      setCloningStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Failed to clone voice',
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

  // Preload background music (call when TTS generation starts for parallel loading)
  const preloadBackgroundMusic = useCallback((track: BackgroundTrack) => {
    if (track.id === 'none' || !track.audioUrl) {
      return;
    }

    // Already preloading or preloaded
    if (preloadedMusicRef.current.has(track.id)) {
      return;
    }

    console.log('[Music] Preloading track:', track.name);
    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = true;
    audio.volume = backgroundVolume;

    const cacheEntry = { audio, ready: false };
    preloadedMusicRef.current.set(track.id, cacheEntry);

    audio.oncanplaythrough = () => {
      console.log('[Music] Track preloaded and ready:', track.name);
      cacheEntry.ready = true;
    };

    audio.onerror = () => {
      console.error('[Music] Preload failed for:', track.name);
      preloadedMusicRef.current.delete(track.id);
    };

    audio.src = track.audioUrl;
    audio.load();
  }, [backgroundVolume]);

  // Start background music (uses preloaded audio if available for instant start)
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
      // Check for preloaded audio first
      const preloaded = preloadedMusicRef.current.get(track.id);
      let audio: HTMLAudioElement;

      if (preloaded?.ready) {
        // Use preloaded audio - instant start!
        console.log('[Music] Using preloaded track:', track.name);
        audio = preloaded.audio;
        audio.volume = backgroundVolume; // Update volume in case it changed
        audio.currentTime = 0; // Reset to start
        preloadedMusicRef.current.delete(track.id);
      } else if (preloaded && !preloaded.ready) {
        // Preloading in progress - wait for it
        console.log('[Music] Waiting for preload to complete:', track.name);
        audio = preloaded.audio;
        audio.volume = backgroundVolume;
        await new Promise<void>((resolve, reject) => {
          audio.oncanplaythrough = () => resolve();
          audio.onerror = () => reject(new Error('Preload failed'));
        });
        preloadedMusicRef.current.delete(track.id);
      } else {
        // No preload - create fresh (fallback behavior)
        console.log('[Music] Loading track fresh:', track.name, track.audioUrl);
        audio = new Audio();
        audio.preload = 'auto';
        audio.loop = true;
        audio.volume = backgroundVolume;
        audio.src = track.audioUrl;
      }

      // Set up event handlers
      audio.onerror = (e) => {
        console.error('[Music] Audio error:', e, audio.error);
        setIsMusicPlaying(false);
        setMusicError(`Failed to load: ${track.name}`);
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

      backgroundAudioRef.current = audio;

      // Play (may need to wait if not preloaded)
      await audio.play();
      console.log('[Music] Play called successfully');
    } catch (error: unknown) {
      console.error('[Music] Failed to play background music:', error);

      // Handle autoplay policy
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.warn('[Music] Autoplay blocked - will retry on user interaction');
        setMusicError('Tap to enable music');
      } else {
        // Fallback attempt
        try {
          console.log('[Music] Retrying with fresh audio element...');
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

  // Update background volume (wrapped in useCallback for prop stability)
  const updateBackgroundVolume = useCallback((volume: number) => {
    setBackgroundVolume(volume);
    // Update audio element volume in real-time
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.volume = volume;
    }
  }, []);

  // ========== Nature Sound Functions ==========

  // Start nature sound
  const startNatureSound = async (sound: NatureSound) => {
    stopNatureSound();
    if (sound.id === 'none' || !sound.audioUrl) return;

    try {
      const audio = new Audio(sound.audioUrl);
      audio.loop = true;
      audio.volume = natureSoundVolume;
      natureSoundAudioRef.current = audio;
      // Only play if meditation is playing
      if (isPlaying) {
        await audio.play();
      }
    } catch (error) {
      console.error('[Nature Sound] Failed to load:', error);
    }
  };

  // Stop nature sound
  const stopNatureSound = () => {
    if (natureSoundAudioRef.current) {
      natureSoundAudioRef.current.pause();
      natureSoundAudioRef.current = null;
    }
  };

  // Update nature sound volume (wrapped in useCallback for prop stability)
  const updateNatureSoundVolume = useCallback((volume: number) => {
    setNatureSoundVolume(volume);
    // Update audio element volume in real-time
    if (natureSoundAudioRef.current) {
      natureSoundAudioRef.current.volume = volume;
    }
  }, []);

  // Toggle nature sound preview
  const togglePreviewNatureSound = (sound: NatureSound) => {
    if (previewingNatureSoundId === sound.id) {
      if (previewNatureSoundAudioRef.current) {
        previewNatureSoundAudioRef.current.pause();
        previewNatureSoundAudioRef.current = null;
      }
      setPreviewingNatureSoundId(null);
      return;
    }

    if (previewNatureSoundAudioRef.current) {
      previewNatureSoundAudioRef.current.pause();
      previewNatureSoundAudioRef.current = null;
    }

    if (!sound.audioUrl) {
      setPreviewingNatureSoundId(null);
      return;
    }

    const audio = new Audio(sound.audioUrl);
    audio.volume = 0.5;
    audio.loop = true;

    audio.onerror = () => {
      console.error('[Nature Sound Preview] Failed to load:', sound.name);
      setPreviewingNatureSoundId(null);
      previewNatureSoundAudioRef.current = null;
    };

    audio.play().then(() => {
      previewNatureSoundAudioRef.current = audio;
      setPreviewingNatureSoundId(sound.id);
    }).catch((err) => {
      console.error('[Nature Sound Preview] Failed to play:', err);
      setPreviewingNatureSoundId(null);
    });
  };

  // Stop nature sound preview
  const stopNatureSoundPreview = useCallback(() => {
    if (previewNatureSoundAudioRef.current) {
      previewNatureSoundAudioRef.current.pause();
      previewNatureSoundAudioRef.current = null;
    }
    setPreviewingNatureSoundId(null);
  }, []);

  // Sync nature sound with meditation play/pause
  useEffect(() => {
    if (!natureSoundAudioRef.current) return;
    if (isPlaying) {
      natureSoundAudioRef.current.play().catch(() => { });
    } else {
      natureSoundAudioRef.current.pause();
    }
  }, [isPlaying]);

  // Start nature sound when selected (if meditation is playing)
  useEffect(() => {
    if (selectedNatureSound.id !== 'none' && selectedNatureSound.audioUrl) {
      startNatureSound(selectedNatureSound);
    } else {
      stopNatureSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNatureSound]);

  // Update playback rate (can be changed during playback)
  const updatePlaybackRate = useCallback((rate: number) => {
    const clampedRate = Math.max(0.5, Math.min(2.0, rate));
    setPlaybackRate(clampedRate);
    playbackRateRef.current = clampedRate;

    // Update the source's playback rate in real-time if playing
    if (audioSourceRef.current && isPlaying) {
      audioSourceRef.current.playbackRate.value = clampedRate;
    }
  }, [isPlaying]);

  // Update voice volume (can be changed during playback)
  const updateVoiceVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setVoiceVolume(clampedVolume);

    // Update gain node in real-time
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = clampedVolume;
    }
  }, []);

  // Progress tracking for inline player
  // Optimized: Throttle setCurrentTime to 5Hz (200ms) instead of 60Hz
  // RAF still runs for smooth animation, but React state updates are throttled
  const lastTimeUpdateRef = useRef<number>(0);
  const TIME_UPDATE_INTERVAL = 200; // Update React state every 200ms (5Hz)

  const updateProgress = useCallback(() => {
    if (!audioContextRef.current || !isPlaying) return;

    // Account for playback rate when calculating elapsed time
    const elapsed = (audioContextRef.current.currentTime - playbackStartTimeRef.current) * playbackRateRef.current;
    const newCurrentTime = Math.min(pauseOffsetRef.current + elapsed, duration);
    const now = Date.now();

    // Throttle setCurrentTime to 5Hz (every 200ms) - reduces re-renders by 92%
    if (now - lastTimeUpdateRef.current >= TIME_UPDATE_INTERVAL) {
      setCurrentTime(newCurrentTime);
      lastTimeUpdateRef.current = now;
    }

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

  // Start progress tracking when playing (inline mode or player view)
  useEffect(() => {
    if (isPlaying && (isInlineMode || currentView === View.PLAYER)) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isInlineMode, currentView, updateProgress]);

  // Pause playback for inline player
  const handleInlinePause = useCallback(() => {
    if (!audioContextRef.current || !audioSourceRef.current || !isPlaying) return;

    // Calculate current position (account for playback rate)
    const elapsed = (audioContextRef.current.currentTime - playbackStartTimeRef.current) * playbackRateRef.current;
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

    // Ensure gain node exists for volume control
    if (!gainNodeRef.current) {
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }
    gainNodeRef.current.gain.value = voiceVolume;

    // Create new source with playback rate
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.playbackRate.value = playbackRate;
    playbackRateRef.current = playbackRate;
    source.connect(gainNodeRef.current);

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
  }, [isPlaying, playbackRate, voiceVolume]);

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
      // Ensure gain node exists
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }
      gainNodeRef.current.gain.value = voiceVolume;

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.playbackRate.value = playbackRate;
      playbackRateRef.current = playbackRate;
      source.connect(gainNodeRef.current);
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
  }, [isPlaying, duration, timingMap, playbackRate, voiceVolume]);

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

    } catch (error: unknown) {
      console.error('Failed to generate script:', error);
      setMicError(error instanceof Error ? error.message : 'Failed to generate meditation.');
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

    // Show loading toast
    const toastId = toast.loading('Creating your meditation...', {
      description: 'Generating personalized script',
    });

    try {
      // Check credits FIRST (fail fast before expensive operations)
      if (selectedVoice.isCloned) {
        const estimatedCost = creditService.calculateTTSCost(script, 150);
        const credits = await creditService.getCredits(user?.id);
        if (credits < estimatedCost) {
          toast.error('Insufficient credits', {
            id: toastId,
            description: `Need ${estimatedCost} credits for TTS generation.`,
          });
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

      toast.success('Script ready!', {
        id: toastId,
        description: 'Review and customize your meditation',
      });

    } catch (error: unknown) {
      console.error('Failed to generate script:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again';
      toast.error('Generation failed', {
        id: toastId,
        description: errorMessage,
      });
      setMicError(error instanceof Error ? error.message : 'Failed to generate meditation. Please try again.');
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
    } catch (error: unknown) {
      console.error('Error extending script:', error);
      setMicError(error instanceof Error ? error.message : 'Failed to extend script. Please try again.');
    } finally {
      setIsExtending(false);
    }
  };

  const handlePlayEditedScript = async (scriptOverride?: string) => {
    const scriptToPlay = scriptOverride || editableScript;
    if (!scriptToPlay.trim() || !selectedVoice) return;

    setShowScriptPreview(false);
    setIsGenerating(true);
    setGenerationStage('voice');
    setMicError(null);

    // Preload background music in parallel with TTS generation (saves ~1-3s)
    preloadBackgroundMusic(selectedBackgroundTrack);

    // Show loading toast for audio generation
    const audioToastId = toast.loading('Generating audio...', {
      description: 'Creating natural voice narration',
    });

    try {
      // Initialize audio context
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Generate speech with the edited script
      const { audioBuffer, base64, needsReclone } = await voiceService.generateSpeech(
        scriptToPlay,
        selectedVoice,
        audioContextRef.current
      );

      // Check if voice needs to be re-cloned (legacy Fish Audio/Chatterbox voice)
      if (needsReclone) {
        throw new Error('This voice needs to be re-cloned. Please go to Voice Settings and re-clone your voice with ElevenLabs.');
      }

      if (!audioBuffer) {
        throw new Error('Failed to generate audio buffer. Please try again.');
      }

      if (!base64 || base64.trim() === '') {
        throw new Error('Failed to generate audio. Please try again.');
      }

      setGenerationStage('ready');
      toast.success('Meditation ready!', {
        id: audioToastId,
        description: 'Enjoy your personalized experience',
      });

      // Stop any existing playback
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (e) { }
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

      // Create gain node for voice volume control
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }
      gainNodeRef.current.gain.value = voiceVolume;

      // Start playback with playback rate
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackRate;
      playbackRateRef.current = playbackRate;
      source.connect(gainNodeRef.current);
      source.start();
      audioSourceRef.current = source;
      playbackStartTimeRef.current = audioContextRef.current.currentTime;

      // Update state
      setScript(scriptToPlay);
      setEnhancedScript(scriptToPlay);
      setIsPlaying(true);
      setCurrentView(View.PLAYER);  // Go directly to V0MeditationPlayer
      setIsGenerating(false);
      setGenerationStage('idle');

      // Build timing map
      const map = buildTimingMap(scriptToPlay, audioBuffer.duration);
      setTimingMap(map);

      // Start background music
      startBackgroundMusic(selectedBackgroundTrack);

      // Deduct credits
      if (selectedVoice.isCloned) {
        creditService.deductCredits(
          creditService.calculateTTSCost(scriptToPlay),
          'TTS_GENERATE',
          selectedVoice.id,
          user?.id
        ).catch(err => console.warn('Failed to deduct credits:', err));
      }

      // Save to history (include audio for cloned voices)
      saveMeditationHistory(
        originalPrompt,
        scriptToPlay,
        selectedVoice.id,
        selectedVoice.name,
        selectedBackgroundTrack?.id,
        selectedBackgroundTrack?.name,
        Math.round(audioBuffer.duration),
        audioTagsEnabled && selectedAudioTags.length > 0 ? selectedAudioTags : undefined,
        base64 // Always save audio, even for non-cloned voices
      ).catch(err => console.warn('Failed to save meditation history:', err));

      source.onended = () => {
        setIsPlaying(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } catch (error: unknown) {
      console.error('Failed to play edited script:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again';
      toast.error('Audio generation failed', {
        id: audioToastId,
        description: errorMessage,
      });
      setMicError(error instanceof Error ? error.message : 'Failed to generate audio. Please try again.');
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
    if (!script || !selectedVoice) return;
    setIsGenerating(true);
    setMicError(null);

    // Preload background music in parallel with TTS generation (saves ~1-3s)
    preloadBackgroundMusic(selectedBackgroundTrack);

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
      const { audioBuffer, base64, needsReclone } = await voiceService.generateSpeech(
        script,
        selectedVoice,
        audioContextRef.current
      );

      // Check if voice needs to be re-cloned (legacy Fish Audio/Chatterbox voice)
      if (needsReclone) {
        throw new Error('This voice needs to be re-cloned. Please go to Voice Settings and re-clone your voice with ElevenLabs.');
      }

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

      // Create gain node for voice volume control
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }
      gainNodeRef.current.gain.value = voiceVolume;

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackRate;
      playbackRateRef.current = playbackRate;
      source.connect(gainNodeRef.current);
      source.start();
      audioSourceRef.current = source;

      setIsPlaying(true);
      setCurrentView(View.PLAYER);

      source.onended = () => setIsPlaying(false);
    } catch (error: unknown) {
      console.error('Failed to start playback:', error);
      setMicError(error instanceof Error ? error.message : 'Failed to generate audio. Please try again.');
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
    <LazyMotion features={domAnimation} strict>
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
                           rounded-lg md:rounded-xl bg-sky-500/10
                           hover:bg-sky-500/20
                           text-sky-500 hover:text-sky-400 transition-all flex items-center justify-center
                           border border-sky-500/20 hover:border-sky-500/40"
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
                  className="bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-[11px] font-bold uppercase tracking-wider md:tracking-widest text-slate-300 outline-none focus:border-sky-500 transition-all cursor-pointer hover:bg-white/10 max-w-[100px] md:max-w-none truncate"
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
                  className="bg-sky-500/20 border border-sky-500/30 rounded-lg md:rounded-xl px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-sky-400 hover:bg-sky-500/30 transition-all"
                >
                  Clone Voice
                </button>
              )}
            </div>

            {/* User Menu */}
            {!user && (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 md:px-4 py-2 min-h-[40px] md:min-h-[44px] rounded-lg md:rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 hover:border-sky-500/40 text-[10px] font-bold uppercase tracking-wider md:tracking-widest text-sky-500 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)]"
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
                    {tagline.main} <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-sky-500 font-semibold">{tagline.highlight}</span>
                  </p>
                  {tagline.sub && <p className="text-base md:text-2xl text-slate-500 mt-1 md:mt-2 hidden sm:block">{tagline.sub}</p>}
                </div>
              )}

              {/* Error message - positioned at top for mobile visibility */}
              {micError && !isInlineMode && (
                <div
                  className="fixed left-0 right-0 z-[60] text-center px-4"
                  style={{ top: 'max(5rem, calc(env(safe-area-inset-top, 0px) + 4rem))' }}
                >
                  <span className="inline-block px-4 py-2 rounded-full bg-rose-500/20 text-rose-400 text-xs font-medium border border-rose-500/30 shadow-lg backdrop-blur-sm">
                    {micError}
                  </span>
                </div>
              )}

              {/* AI Agent Chat - Full screen when not in inline mode */}
              {!isInlineMode && (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-pulse text-slate-400">Loading chat...</div>
                  </div>
                }>
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
                        navigate('/your-voices');
                      }
                    }}
                    onGenerateAudio={async (meditationScript, tags) => {
                      if (!selectedVoice) {
                        navigate('/your-voices');
                        return;
                      }
                      const voice = selectedVoice;
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

                      // Preload background music in parallel with TTS generation (saves ~1-3s)
                      preloadBackgroundMusic(selectedBackgroundTrack);

                      try {
                        // Initialize audio context (check state to handle closed contexts)
                        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                        }

                        // CRITICAL: Resume suspended AudioContext (required for iOS Safari)
                        // iOS suspends AudioContext by default until user gesture activates it
                        if (audioContextRef.current.state === 'suspended') {
                          await audioContextRef.current.resume();
                        }

                        // Generate speech
                        const { audioBuffer, base64, needsReclone } = await voiceService.generateSpeech(
                          meditationScript,
                          voice,
                          audioContextRef.current
                        );

                        // Check if voice needs to be re-cloned (legacy Fish Audio/Chatterbox voice)
                        if (needsReclone) {
                          throw new Error('This voice needs to be re-cloned. Please go to Voice Settings and re-clone your voice with ElevenLabs.');
                        }

                        if (!audioBuffer) {
                          throw new Error('Failed to generate audio buffer. Please try again.');
                        }

                        if (!base64 || base64.trim() === '') {
                          throw new Error('Failed to generate audio. Please try again.');
                        }

                        setGenerationStage('ready');

                        // Stop any existing playback
                        if (audioSourceRef.current) {
                          try { audioSourceRef.current.stop(); } catch (e) { }
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

                        // Create gain node for voice volume control
                        if (!gainNodeRef.current) {
                          gainNodeRef.current = audioContextRef.current.createGain();
                          gainNodeRef.current.connect(audioContextRef.current.destination);
                        }
                        gainNodeRef.current.gain.value = voiceVolume;

                        // Start playback with playback rate
                        const source = audioContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.playbackRate.value = playbackRate;
                        playbackRateRef.current = playbackRate;
                        source.connect(gainNodeRef.current);
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
                        if (voice.isCloned) {
                          creditService.deductCredits(
                            creditService.calculateTTSCost(meditationScript),
                            'TTS_GENERATE',
                            voice.id,
                            user?.id
                          ).catch(err => console.warn('Failed to deduct credits:', err));
                        }

                        // Save to history (include audio for cloned voices)
                        saveMeditationHistory(
                          meditationScript.substring(0, 100),
                          meditationScript,
                          voice.id,
                          voice.name,
                          selectedBackgroundTrack?.id,
                          selectedBackgroundTrack?.name,
                          Math.round(audioBuffer.duration),
                          tags.length > 0 ? tags : undefined,
                          base64 // Always save audio
                        ).catch(err => console.warn('Failed to save history:', err));

                        source.onended = () => {
                          setIsPlaying(false);
                          if (animationFrameRef.current) {
                            cancelAnimationFrame(animationFrameRef.current);
                          }
                        };
                      } catch (error: unknown) {
                        console.error('Failed to generate audio:', error);
                        setMicError(error instanceof Error ? error.message : 'Failed to generate audio. Please try again.');
                        setIsGenerating(false);
                        setGenerationStage('idle');
                      }
                    }}
                    onChatStarted={() => setChatStarted(true)}
                    onMeditationPanelOpen={handleMeditationPanelOpen}
                    onRequestVoiceSelection={() => navigate('/your-voices')}
                    selectedVoice={selectedVoice}
                    selectedMusic={selectedBackgroundTrack}
                    availableMusic={BACKGROUND_TRACKS}
                    availableTags={AUDIO_TAG_CATEGORIES}
                    onMusicChange={(track) => setSelectedBackgroundTrack(track)}
                    isGenerating={isGenerating}
                    isGeneratingAudio={isGenerating && generationStage === 'voice'}
                    restoredScript={restoredScript}
                    onRestoredScriptClear={() => setRestoredScript(null)}
                    resumeConversationId={resumeConversationId}
                    onConversationResumed={() => setResumeConversationId(null)}
                  />
                </Suspense>
              )}

              {/* InlinePlayer removed - using only V0MeditationPlayer now */}

            </div>
          )}

          {/* VIEW: PLAYER (Immersive Mode) */}
          {currentView === View.PLAYER && (
            <Suspense fallback={<div className="fixed inset-0 z-[100] bg-[#0f172a] flex items-center justify-center"><div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>}>
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
                  stopNatureSound();
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
                voiceVolume={voiceVolume}
                onVoiceVolumeChange={updateVoiceVolume}
                playbackRate={playbackRate}
                onPlaybackRateChange={updatePlaybackRate}
                // Nature sound props
                natureSoundEnabled={selectedNatureSound.id !== 'none'}
                natureSoundVolume={natureSoundVolume}
                onNatureSoundVolumeChange={updateNatureSoundVolume}
                natureSoundName={selectedNatureSound.name}
                natureSoundIcon={selectedNatureSound.icon}
                onOpenNatureSoundModal={() => setShowNatureSoundModal(true)}
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
          <Suspense fallback={<div className="fixed inset-0 z-[90] bg-slate-950/90 flex items-center justify-center"><div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>}>
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
                <div className="inline-block px-4 py-1 rounded-full bg-sky-500/10 text-sky-500 text-[10px] font-bold uppercase tracking-[0.4em]">Templates</div>
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
                      className={`!p-8 !rounded-3xl cursor-pointer border border-transparent transition-all hover:scale-[1.02] ${category.id === 'meditation'
                        ? 'hover:border-sky-500/30 '
                        : 'hover:border-pink-500/30 '
                        }`}
                    >
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${category.id === 'meditation'
                        ? 'bg-gradient-to-br from-sky-500/20 to-sky-500/20'
                        : 'bg-gradient-to-br from-pink-500/20 to-rose-500/20'
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
                      className={`!p-6 !rounded-2xl cursor-pointer border border-transparent transition-all hover:scale-[1.02] ${selectedCategory === 'meditation'
                        ? 'hover:border-sky-500/30'
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
                        className={`!p-5 !rounded-2xl cursor-pointer border border-transparent transition-all ${selectedCategory === 'meditation'
                          ? 'hover:border-sky-500/30'
                          : 'hover:border-pink-500/30'
                          }`}
                      >
                        <h5 className="text-base font-bold text-white mb-1.5">{template.title}</h5>
                        <p className="text-sm text-slate-400 leading-relaxed">{template.description}</p>
                        <div className={`mt-3 text-[10px] font-bold uppercase tracking-widest ${selectedCategory === 'meditation' ? 'text-sky-500' : 'text-pink-400'
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

        {/* MODAL: Music Selector (extracted component) */}
        <MusicSelectorModal
          isOpen={showMusicModal}
          onClose={() => setShowMusicModal(false)}
          selectedTrack={selectedBackgroundTrack}
          onSelectTrack={(track) => {
            setSelectedBackgroundTrack(track);
            startBackgroundMusic(track);
          }}
          previewingTrackId={previewingTrackId}
          onTogglePreview={togglePreviewTrack}
          onStopPreview={stopPreview}
        />

        {/* MODAL: Nature Sound Selector */}
        <NatureSoundSelectorModal
          isOpen={showNatureSoundModal}
          onClose={() => setShowNatureSoundModal(false)}
          selectedSound={selectedNatureSound}
          onSelectSound={(sound) => {
            setSelectedNatureSound(sound);
          }}
          previewingSoundId={previewingNatureSoundId}
          onTogglePreview={togglePreviewNatureSound}
          onStopPreview={stopNatureSoundPreview}
        />

        {/* MODAL: Audio Tags Selector (extracted component) */}
        <AudioTagsModal
          isOpen={showAudioTagsModal}
          onClose={() => setShowAudioTagsModal(false)}
          selectedTags={selectedAudioTags}
          onSelectTags={setSelectedAudioTags}
          audioTagsEnabled={audioTagsEnabled}
          onSetEnabled={setAudioTagsEnabled}
          suggestedTags={suggestedAudioTags}
          favoriteTags={favoriteAudioTags}
        />

        {/* MODAL: Script Preview & Edit - Using unified MeditationEditor */}
        {showScriptPreview && (
          <ErrorBoundary>
            <Suspense fallback={
              <div className="fixed inset-0 z-[60] bg-[#020617] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
              </div>
            }>
              <MeditationEditor
                script={editableScript}
                selectedVoice={selectedVoice}
                selectedMusic={selectedBackgroundTrack}
                selectedTags={selectedAudioTags}
                availableMusic={BACKGROUND_TRACKS}
                availableTags={AUDIO_TAG_CATEGORIES}
                onVoiceSelect={() => navigate('/your-voices')}
                onMusicSelect={(track) => setSelectedBackgroundTrack(track)}
                onTagToggle={(tagId) => {
                  setSelectedAudioTags(prev =>
                    prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
                  );
                }}
                onGenerate={(updatedScript) => {
                  setEditableScript(updatedScript);
                  throttledPlayEditedScript(updatedScript);
                }}
                onClose={() => !(isGenerating || isExtending) && setShowScriptPreview(false)}
                isGenerating={isGenerating || isExtending}
                source="direct"
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* Auth Modal (lazy-loaded) */}
        <ErrorBoundary>
          <Suspense fallback={null}>
            <AuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
              initialMode={authModalMode}
              onSuccess={() => {
                setShowAuthModal(false);
                checkUser();
              }}
            />
          </Suspense>
        </ErrorBoundary>

        {/* ChatGPT-style Sidebar */}
        <Sidebar
          isOpen={showBurgerMenu}
          onClose={() => setShowBurgerMenu(false)}
          user={user}
          chatHistory={chatHistory}
          isLoadingChatHistory={isLoadingChatHistory}
          onLoadConversation={loadConversation}
          onStartNewConversation={async () => {
            // Close any open modals when starting a new conversation
            setShowScriptPreview(false);
            await startNewConversation();
          }}
          onConversationSelected={setResumeConversationId}
          onDeleteConversation={deleteConversation}
          onMeditationRestore={(script) => setRestoredScript(script)}
          onSignOut={handleSignOut}
          onSignIn={() => setShowAuthModal(true)}
          Logo={ICONS.Logo}
          isAdmin={isAdmin}
        />

        {/* MODAL: How It Works */}
        {showHowItWorks && (
          <div className="fixed inset-0 z-[80] bg-[#020617]/98 backdrop-blur-3xl flex flex-col p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
            <Starfield />

            <button
              onClick={() => setShowHowItWorks(false)}
              className="fixed top-6 left-6 md:top-8 md:left-8 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-[100]"
            >
              <div className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full border border-white/[0.06] bg-white/[0.02] flex items-center justify-center group-hover:bg-white/[0.08] group-hover:scale-105 group-hover:border-sky-500/20 transition-all">
                <ICONS.ArrowBack className="w-5 h-5" />
              </div>
              <span className="hidden md:inline text-[11px] font-medium uppercase tracking-[0.25em] text-slate-500 group-hover:text-white transition-colors">Back</span>
            </button>

            <div className="flex-1 flex flex-col items-center justify-center pt-16 md:pt-0 relative z-10 max-w-4xl mx-auto w-full">
              {/* Badge */}
              <div className="inline-block px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-500 text-[10px] font-semibold uppercase tracking-[0.35em] mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                Guide
              </div>

              {/* Title */}
              <h2 className="text-3xl md:text-5xl font-extralight text-center mb-3 tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms' }}>
                <span className="bg-gradient-to-r from-sky-400 via-white to-sky-400 bg-clip-text text-transparent">How INrVO Works</span>
              </h2>
              <p className="text-slate-500 text-center mb-14 max-w-md text-sm animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '150ms' }}>Create personalized meditations in seconds with AI</p>

              {/* Step Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
                {/* Step 1 */}
                <div className="step-card group">
                  <GlassCard className="!p-7 !rounded-2xl text-center h-full border-white/[0.04] hover:border-sky-500/20 transition-all duration-300" hover={false}>
                    <div className="step-number w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500/15 to-sky-500/5 border border-sky-500/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform duration-300">
                      <span className="text-2xl font-bold bg-gradient-to-br from-sky-400 to-sky-500 bg-clip-text text-transparent">1</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2.5">Write Your Intention</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">Type a short phrase like "calm my anxiety" or "help me sleep" - or use voice input</p>
                  </GlassCard>
                </div>

                {/* Step 2 */}
                <div className="step-card group">
                  <GlassCard className="!p-7 !rounded-2xl text-center h-full border-white/[0.04] hover:border-sky-500/20 transition-all duration-300" hover={false}>
                    <div className="step-number w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500/15 to-sky-500/5 border border-sky-500/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform duration-300">
                      <span className="text-2xl font-bold bg-gradient-to-br from-sky-400 to-sky-500 bg-clip-text text-transparent">2</span>
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
                    <ICONS.Sparkle className="tip-icon w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-500"><span className="text-slate-300 font-medium">Be specific:</span> "5-minute morning energy boost" works better than just "energy"</p>
                  </div>
                  <div className="pro-tip flex items-start gap-3.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <ICONS.Microphone className="tip-icon w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
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
                <span className="bg-gradient-to-r from-emerald-300 via-sky-200 to-sky-400 bg-clip-text text-transparent">My Library</span>
              </h2>
              <p className="text-slate-500 text-center mb-12 max-w-lg">Your saved meditations and audio generations</p>

              {user ? (
                <div className="w-full">
                  {/* Tab Switcher */}
                  <div className="flex justify-center gap-2 mb-8">
                    <button
                      onClick={() => setLibraryTab('all')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${libraryTab === 'all'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                    >
                      My Audios
                    </button>
                    <button
                      onClick={() => setLibraryTab('favorites')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${libraryTab === 'favorites'
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
                                        className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${libraryPlayingId === meditation.id
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
                                        <p className="text-white text-sm whitespace-pre-wrap mb-2">{meditation.enhanced_script || meditation.prompt}</p>
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                          <span>{new Date(meditation.created_at).toLocaleDateString()}</span>
                                          {meditation.duration_seconds && (
                                            <span>{Math.floor(meditation.duration_seconds / 60)}:{String(meditation.duration_seconds % 60).padStart(2, '0')}</span>
                                          )}
                                          {meditation.voice_name && (
                                            <span className="text-sky-500">{meditation.voice_name}</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Actions */}
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleToggleFavorite(meditation.id)}
                                          className={`p-2 rounded-lg transition-colors ${meditation.is_favorite
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
                                        <p className="text-slate-400 text-sm whitespace-pre-wrap">{meditation.enhanced_script || meditation.prompt}</p>
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
                                        className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-500 text-xs hover:bg-sky-500/30 transition-colors"
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
                  <div className="w-20 h-20 rounded-full bg-sky-500/10 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="px-6 py-3 rounded-full bg-gradient-to-r from-sky-500 to-sky-500 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-sky-500/25"
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
                      <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Everything in Pro
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      5 team members
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Shared library
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
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
                <span className="bg-gradient-to-r from-sky-400 via-white to-sky-400 bg-clip-text text-transparent">About INrVO</span>
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
                      <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                        <ICONS.Sparkle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">AI-Powered Personalization</h4>
                        <p className="text-sm text-slate-400">Every meditation is generated uniquely for you based on your intentions and preferences.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center flex-shrink-0">
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
              <div className="inline-block px-4 py-1 rounded-full bg-sky-500/10 text-sky-500 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Legal</div>
              <h2 className="text-3xl md:text-5xl font-extralight text-center mb-4 tracking-tight">
                <span className="bg-gradient-to-r from-sky-400 via-white to-sky-400 bg-clip-text text-transparent">Terms of Service</span>
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
                  <p className="text-slate-400">For questions about these Terms, contact us at <a href="https://qualiasolutions.net" target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:text-sky-400 transition-colors">qualiasolutions.net</a></p>
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
              <div className="inline-block px-4 py-1 rounded-full bg-sky-500/10 text-sky-500 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Legal</div>
              <h2 className="text-3xl md:text-5xl font-extralight text-center mb-4 tracking-tight">
                <span className="bg-gradient-to-r from-sky-400 via-white to-sky-400 bg-clip-text text-transparent">Privacy Policy</span>
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
                  <p className="text-slate-400">For privacy inquiries, contact us at <a href="https://qualiasolutions.net" target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:text-sky-400 transition-colors">qualiasolutions.net</a></p>
                </GlassCard>
              </div>
            </div>
          </div>
        )}

        {/* Music Debug Panel (Development Only) */}
        {import.meta.env.DEV && (
          <div className="fixed bottom-4 right-4 bg-slate-900/95 border border-slate-700 p-4 rounded-lg text-xs font-mono z-[200] max-w-xs shadow-xl">
            <h3 className="font-bold text-sky-500 mb-2 flex items-center gap-2">
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
              className="mt-3 w-full bg-blue-600 hover:bg-sky-500 text-white py-1.5 px-3 rounded text-xs transition-colors"
            >
              Test Music
            </button>
          </div>
        )}

        {/* Onboarding overlay - guides new users through the app */}
        <Suspense fallback={null}>
          <Onboarding />
        </Suspense>

      </div>
    </LazyMotion>
  );
};

export default App;
