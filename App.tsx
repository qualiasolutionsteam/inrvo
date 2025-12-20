
import React, { useState, useRef, useEffect } from 'react';
import { View, VoiceProfile } from './types';
import { TEMPLATE_CATEGORIES, VOICE_PROFILES, ICONS, BACKGROUND_TRACKS, BackgroundTrack, AUDIO_TAG_CATEGORIES } from './constants';
import GlassCard from './components/GlassCard';
import Visualizer from './components/Visualizer';
import Starfield from './components/Starfield';
import LoadingScreen from './components/LoadingScreen';
import AuthModal from './components/AuthModal';
import VoiceManager from './components/VoiceManager';
import { SimpleVoiceClone } from './components/SimpleVoiceClone';
import { AIVoiceInput } from './components/ui/ai-voice-input';
import { geminiService, decodeAudioBuffer, blobToBase64 } from './geminiService';
import { voiceService } from './src/lib/voiceService';
import { elevenlabsService, base64ToBlob } from './src/lib/elevenlabs';
import { creditService } from './src/lib/credits';
import { supabase, getCurrentUser, signOut, createVoiceProfile, getUserVoiceProfiles, VoiceProfile as DBVoiceProfile, createVoiceClone, saveMeditationHistory, getMeditationHistory, deleteMeditationHistory, MeditationHistory, getAudioTagPreferences, updateAudioTagPreferences, AudioTagPreference } from './lib/supabase';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [script, setScript] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<VoiceProfile[]>(VOICE_PROFILES);
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile>(VOICE_PROFILES[1]);

  // Modal states
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState<string | null>(null);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [selectedBackgroundTrack, setSelectedBackgroundTrack] = useState<BackgroundTrack>(BACKGROUND_TRACKS[0]);

  // Audio tags states
  const [showAudioTagsModal, setShowAudioTagsModal] = useState(false);
  const [selectedAudioTags, setSelectedAudioTags] = useState<string[]>([]);
  const [audioTagsEnabled, setAudioTagsEnabled] = useState(false);
  const [favoriteAudioTags, setFavoriteAudioTags] = useState<string[]>([]);
  const [suggestedAudioTags, setSuggestedAudioTags] = useState<string[]>([]);

  // Smart tag suggestions based on prompt content
  const getSuggestedTags = (prompt: string): string[] => {
    const lowerPrompt = prompt.toLowerCase();
    const suggestions: string[] = [];

    // Keyword to tag mapping
    const keywordMap: Record<string, string[]> = {
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
    };

    // Check each keyword
    Object.entries(keywordMap).forEach(([keyword, tags]) => {
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
  };

  // Group tracks by category for music modal
  const tracksByCategory = BACKGROUND_TRACKS.reduce((acc, track) => {
    if (!acc[track.category]) acc[track.category] = [];
    acc[track.category].push(track);
    return acc;
  }, {} as Record<string, BackgroundTrack[]>);

  const categoryConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    'ambient': { label: 'Ambient', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
    'nature': { label: 'Nature', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
    'binaural': { label: 'Binaural', color: 'text-violet-400', bgColor: 'bg-violet-500/10' },
    'instrumental': { label: 'Instrumental', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    'lofi': { label: 'Lo-Fi', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
    'classical': { label: 'Classical', color: 'text-rose-400', bgColor: 'bg-rose-500/10' },
  };

  // Burger menu states
  const [showBurgerMenu, setShowBurgerMenu] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Prompt menu state
  const [showPromptMenu, setShowPromptMenu] = useState(false);

  // Library state
  const [libraryTab, setLibraryTab] = useState<'history' | 'saved'>('history');
  const [meditationHistory, setMeditationHistory] = useState<MeditationHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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
  const [isPlaying, setIsPlaying] = useState(false);

  // Background music refs
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const [backgroundVolume, setBackgroundVolume] = useState(0.3); // 30% default

  // Auth states
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showVoiceManager, setShowVoiceManager] = useState(false);
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
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserVoices();
        loadAudioTagPrefs();
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Fetch meditation history when library opens
  useEffect(() => {
    if (showLibrary && user) {
      setIsLoadingHistory(true);
      getMeditationHistory(50)
        .then(history => setMeditationHistory(history))
        .catch(err => console.error('Failed to load history:', err))
        .finally(() => setIsLoadingHistory(false));
    }
  }, [showLibrary, user]);

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

      // Add saved voices to available voices
      const clonedVoiceProfiles = voices.map(v => ({
        id: v.id,
        name: v.name,
        provider: v.provider || (v.elevenlabs_voice_id ? 'ElevenLabs' : 'Gemini'),
        voiceName: v.accent || 'Kore', // Use saved Gemini voice or default to Kore
        description: v.description || 'Your personalized voice profile',
        isCloned: !!v.elevenlabs_voice_id,
        elevenlabsVoiceId: v.elevenlabs_voice_id
      }));

      setAvailableVoices([...clonedVoiceProfiles, ...VOICE_PROFILES]);
    } catch (error) {
      console.error('Failed to load voices:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setSavedVoices([]);
    setAvailableVoices(VOICE_PROFILES);
    setSelectedVoice(VOICE_PROFILES[1]);
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


  // Home Transcription Logic
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
        try {
          const text = await geminiService.transcribeAudio(base64);
          if (text) setScript(prev => prev ? `${prev} ${text}` : text);
        } catch (e) {
          console.error("Transcription failed", e);
        } finally {
          setIsGenerating(false);
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

      // Get cost for user information
      const costConfig = creditService.getCostConfig();

      // Convert base64 to blob for ElevenLabs
      const audioBlob = base64ToBlob(audioData, 'audio/webm');

      // Clone voice with ElevenLabs
      let elevenlabsVoiceId: string | null = null;
      try {
        elevenlabsVoiceId = await elevenlabsService.cloneVoice(audioBlob, {
          name: finalName,
          description: 'Voice clone created with INrVO'
        });

        // Deduct credits for successful cloning
        await creditService.deductCredits(
          costConfig.VOICE_CLONE,
          'CLONE_CREATE',
          undefined,
          user.id
        );
      } catch (cloneError: any) {
        console.error('ElevenLabs voice clone failed:', cloneError);
        setMicError(`Voice cloning failed: ${cloneError.message}`);
        return;
      }

      // Create voice profile entry with ElevenLabs ID
      // Handle potential race conditions with duplicate names
      let savedVoice = null;
      let retryCount = 0;
      const maxRetries = 5;
      let currentName = finalName;

      while (!savedVoice && retryCount < maxRetries) {
        try {
          savedVoice = await createVoiceProfile(
            currentName,
            'Cloned voice profile',
            'en-US',
            undefined, // No Gemini voice for clones
            elevenlabsVoiceId // Store ElevenLabs voice ID
          );
        } catch (error: any) {
          if (error.message?.includes('already exists') && retryCount < maxRetries - 1) {
            // Generate a new unique name and retry
            const uuid = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            currentName = `${profileName}-${uuid}`;
            retryCount++;
            continue;
          }
          throw error;
        }
      }

      if (savedVoice) {
        // Also save the audio sample to voice_clones table for backup
        try {
          await createVoiceClone(
            savedVoice.name, // Use the actual saved name
            audioData,
            'Voice sample for cloned voice',
            { elevenlabsVoiceId }
          );
        } catch (e) {
          console.warn('Failed to save voice sample:', e);
        }

        // Update the profile name if it was auto-generated
        if (!newProfileName.trim()) {
          setNewProfileName(savedVoice.name);
        }

        setSavedVoiceId(savedVoice.id);
        setVoiceSaved(true);

        // Reload voices to include the new one
        await loadUserVoices();

        // Auto-select the new voice
        const newVoice: VoiceProfile = {
          id: savedVoice.id,
          name: savedVoice.name,
          provider: 'ElevenLabs',
          voiceName: savedVoice.name, // Use actual saved name
          description: savedVoice.description || 'Your personalized cloned voice',
          isCloned: true,
          elevenlabsVoiceId: elevenlabsVoiceId
        };
        setSelectedVoice(newVoice);
      }
    } catch (error: any) {
      console.error('Failed to auto-save voice:', error);
      setMicError(error?.message || 'Failed to save voice. Please try again.');
    } finally {
      setIsSavingVoice(false);
    }
  };

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

    if (track.id === 'none' || !track.audioUrl) return;

    try {
      const audio = new Audio(track.audioUrl);
      audio.loop = true;
      audio.volume = backgroundVolume;
      backgroundAudioRef.current = audio;

      await audio.play();
    } catch (error) {
      console.error('Failed to play background music:', error);
    }
  };

  // Stop background music
  const stopBackgroundMusic = () => {
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.pause();
      backgroundAudioRef.current.currentTime = 0;
      backgroundAudioRef.current = null;
    }
  };

  // Update background volume
  const updateBackgroundVolume = (volume: number) => {
    setBackgroundVolume(volume);
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.volume = volume;
    }
  };

  const handleGenerateAndPlay = async () => {
    if (!script.trim()) {
      setMicError('Please enter some text to generate a meditation');
      return;
    }

    setIsGenerating(true);
    setMicError(null);

    try {
      // Get audio tag labels from selected tag IDs (only if audio tags are enabled)
      const audioTagLabels = audioTagsEnabled && selectedAudioTags.length > 0
        ? AUDIO_TAG_CATEGORIES.flatMap(cat => cat.tags)
            .filter(tag => selectedAudioTags.includes(tag.id))
            .map(tag => tag.label)
        : undefined;

      // Generate enhanced meditation from short prompt (with optional audio tags)
      const enhanced = await geminiService.enhanceScript(script, audioTagLabels);

      if (!enhanced || !enhanced.trim()) {
        throw new Error('Failed to generate meditation script. Please try again.');
      }

      // Initialize audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Check for credits if this is a paid user
      if (selectedVoice.isCloned) {
        const ttSCost = creditService.calculateTTSCost(enhanced);
        const credits = await creditService.getCredits(user?.id);

        if (credits < ttSCost) {
          setMicError(`Insufficient credits for TTS generation. Need ${ttSCost} credits.`);
          setIsGenerating(false);
          return;
        }
      }

      // Generate speech with unified voice service (handles both Gemini and ElevenLabs)
      const { audioBuffer, base64 } = await voiceService.generateSpeech(
        enhanced,
        selectedVoice,
        audioContextRef.current
      );

      if (!base64 || base64.trim() === '') {
        throw new Error('Failed to generate audio. Please check your API key and try again.');
      }

      // Deduct credits for TTS generation if cloned voice
      if (selectedVoice.isCloned) {
        await creditService.deductCredits(
          creditService.calculateTTSCost(enhanced),
          'TTS_GENERATE',
          selectedVoice.id,
          user?.id
        );
      }

      // Stop any existing playback
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }

      // Start new playback
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      audioSourceRef.current = source;

      // Update state and switch to player view
      setScript(enhanced);
      setIsPlaying(true);
      setCurrentView(View.PLAYER);

      // Start background music if selected
      startBackgroundMusic(selectedBackgroundTrack);

      // Auto-save to meditation history (fire and forget, don't block playback)
      saveMeditationHistory(
        script, // original prompt
        enhanced, // enhanced script
        selectedVoice.id,
        selectedVoice.name,
        selectedBackgroundTrack?.id,
        selectedBackgroundTrack?.name,
        Math.round(audioBuffer.duration),
        audioTagsEnabled && selectedAudioTags.length > 0 ? selectedAudioTags : undefined
      ).catch(err => console.warn('Failed to save meditation history:', err));

      source.onended = () => setIsPlaying(false);
    } catch (error: any) {
      console.error('Failed to generate and play meditation:', error);
      setMicError(error?.message || 'Failed to generate meditation. Please check your API key and try again.');
      // Reset generating state on error
      setIsGenerating(false);
    }
  };

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
      if (!audioContextRef.current) {
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
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}

      <div className={`relative h-[100dvh] w-full flex flex-col overflow-hidden transition-opacity duration-700 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        <Starfield />

        {/* Simple Navigation - Mobile Optimized */}
        <nav className="fixed top-0 left-0 right-0 z-50 p-3 md:p-6 flex justify-between items-center bg-gradient-to-b from-[#020617]/80 to-transparent">
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            {/* Burger Menu Button */}
            <button
              onClick={() => setShowBurgerMenu(true)}
              className="p-2 md:p-2.5 min-w-[40px] min-h-[40px] md:min-w-[44px] md:min-h-[44px] rounded-lg md:rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all flex items-center justify-center"
              title="Menu"
            >
              <ICONS.Menu className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            {/* Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer group opacity-80 hover:opacity-100 transition-opacity"
              onClick={() => setCurrentView(View.HOME)}
            >
              <ICONS.Logo className="h-5 md:h-7 text-white" />
            </div>

            {/* Desktop Navigation Links - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-1 ml-6">
              <button
                onClick={() => setShowHowItWorks(true)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                How It Works
              </button>
              <button
                onClick={() => setShowLibrary(true)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                Library
              </button>
              <button
                onClick={() => setShowPricing(true)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                Pricing
              </button>
              <button
                onClick={() => setShowAboutUs(true)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                About Us
              </button>
            </div>
          </div>

          {/* Voice selector and user menu - compact on mobile */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Voice selector - hidden on very small screens, compact on mobile */}
            <div className="hidden xs:flex items-center gap-2">
              <select
                value={selectedVoice.id}
                onChange={(e) => {
                  const voice = availableVoices.find(v => v.id === e.target.value);
                  if (voice) setSelectedVoice(voice);
                }}
                className="bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-[11px] font-bold uppercase tracking-wider md:tracking-widest text-slate-300 outline-none focus:border-indigo-500 transition-all cursor-pointer hover:bg-white/10 max-w-[100px] md:max-w-none truncate"
              >
                {availableVoices.map(v => (
                  <option key={v.id} value={v.id} className="bg-slate-900">
                    {v.name} {v.isCloned ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* User Menu - icons only on mobile */}
            {user ? (
              <div className="flex items-center gap-1.5 md:gap-2">
                <button
                  onClick={() => setShowVoiceManager(true)}
                  className="p-2 md:p-2.5 min-w-[40px] min-h-[40px] md:min-w-[44px] md:min-h-[44px] rounded-lg md:rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all flex items-center justify-center"
                  title="Manage voices"
                >
                  <ICONS.Waveform className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <button
                  onClick={handleSignOut}
                  className="p-2 md:px-3 md:py-2 min-w-[40px] min-h-[40px] md:min-w-0 md:min-h-0 rounded-lg md:rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center justify-center"
                  title="Sign Out"
                >
                  <span className="hidden md:inline">Sign Out</span>
                  <svg className="w-4 h-4 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 md:px-4 py-2 min-h-[40px] md:min-h-[44px] rounded-lg md:rounded-xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 hover:from-indigo-600/30 hover:to-purple-600/30 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider md:tracking-widest text-indigo-400 transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </nav>

        <main className="flex-1 flex flex-col items-center justify-between p-4 md:p-6 w-full relative">

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
                        className="w-full bg-transparent p-3 md:p-4 text-sm md:text-base text-slate-200 placeholder:text-slate-600 resize-none outline-none min-h-[48px] md:min-h-[64px] max-h-[100px] md:max-h-[140px] leading-relaxed"
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
                        {/* Plus Menu Button */}
                        <div className="relative">
                          <button
                            onClick={() => setShowPromptMenu(!showPromptMenu)}
                            className={`p-2.5 md:p-3 min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] rounded-xl md:rounded-2xl transition-all btn-press focus-ring flex items-center justify-center ${
                              showPromptMenu
                                ? 'bg-indigo-500/20 text-indigo-400'
                                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                            }`}
                            title="Open menu"
                          >
                            <ICONS.Plus className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-200 ${showPromptMenu ? 'rotate-45' : ''}`} />
                          </button>

                          {/* Popup Menu */}
                          {showPromptMenu && (
                            <>
                              {/* Backdrop to close menu */}
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowPromptMenu(false)}
                              />

                              {/* Menu Container */}
                              <div className="absolute bottom-full left-0 mb-3 z-50 glass rounded-2xl p-2 border border-white/10 shadow-xl shadow-black/20 animate-in fade-in slide-in-from-bottom-2 min-w-[160px]">
                                <div className="grid grid-cols-2 gap-2 w-full">
                                  {/* Clone Voice */}
                                  <button
                                    onClick={() => {
                                      setShowCloneModal(true);
                                      setMicError(null);
                                      setShowPromptMenu(false);
                                    }}
                                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-indigo-400 transition-all btn-press focus-ring flex flex-col items-center gap-1.5"
                                    title="Clone your voice"
                                  >
                                    <ICONS.Waveform className="w-5 h-5" />
                                    <span className="text-[10px] font-medium">Clone</span>
                                  </button>

                                  {/* Templates */}
                                  <button
                                    onClick={() => {
                                      setShowTemplatesModal(true);
                                      setShowPromptMenu(false);
                                    }}
                                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-purple-400 transition-all btn-press focus-ring flex flex-col items-center gap-1.5"
                                    title="Browse templates"
                                  >
                                    <ICONS.Sparkle className="w-5 h-5" />
                                    <span className="text-[10px] font-medium">Templates</span>
                                  </button>

                                  {/* Music */}
                                  <button
                                    onClick={() => {
                                      setShowMusicModal(true);
                                      setShowPromptMenu(false);
                                    }}
                                    className={`p-3 rounded-xl transition-all btn-press focus-ring flex flex-col items-center gap-1.5 ${
                                      selectedBackgroundTrack.id !== 'none'
                                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                        : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-emerald-400'
                                    }`}
                                    title={`Background: ${selectedBackgroundTrack.name}`}
                                  >
                                    <ICONS.Music className="w-5 h-5" />
                                    <span className="text-[10px] font-medium">Music</span>
                                  </button>

                                  {/* Audio Tags */}
                                  <button
                                    onClick={() => {
                                      // Calculate smart suggestions based on current prompt
                                      setSuggestedAudioTags(getSuggestedTags(script));
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

                                  {/* Microphone */}
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      startRecording();
                                      setShowPromptMenu(false);
                                    }}
                                    onMouseUp={stopRecording}
                                    onTouchStart={(e) => {
                                      e.preventDefault();
                                      startRecording();
                                      setShowPromptMenu(false);
                                    }}
                                    onTouchEnd={stopRecording}
                                    className={`p-3 rounded-xl transition-all btn-press focus-ring flex flex-col items-center gap-1.5 ${
                                      isRecording
                                        ? 'bg-rose-500 text-white scale-105 shadow-rose-500/40'
                                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                    }`}
                                    title="Hold to speak"
                                  >
                                    <ICONS.Microphone className="w-5 h-5" />
                                    <span className="text-[10px] font-medium">Speak</span>
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        <button
                          onClick={handleGenerateAndPlay}
                          disabled={isGenerating || !script.trim()}
                          className={`
                            p-2.5 md:p-3 rounded-xl md:rounded-2xl transition-all min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] flex items-center justify-center
                            ${isGenerating ? 'bg-indigo-600/50 cursor-not-allowed' : script.trim() ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-2xl hover:shadow-indigo-500/30 active:scale-95 text-white' : 'bg-white/10 text-slate-500'}
                          `}
                        >
                          {isGenerating ? (
                            <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-2 border-white/30 border-t-white"></div>
                          ) : (
                            <ICONS.Send className="w-4 h-4 md:w-5 md:h-5" />
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
                      {/* Audio Tags Indicator */}
                      {audioTagsEnabled && selectedAudioTags.length > 0 && (
                        <button
                          onClick={() => {
                            setSuggestedAudioTags(getSuggestedTags(script));
                            setShowAudioTagsModal(true);
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors normal-case tracking-normal"
                        >
                          <ICONS.Tags className="w-3 h-3" />
                          <span className="text-[9px] md:text-[10px]">{selectedAudioTags.length} tags</span>
                        </button>
                      )}
                      <div className="text-slate-600 truncate max-w-[80px] md:max-w-none text-right">{selectedVoice.name}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: PLAYER (Immersive Mode) */}
          {currentView === View.PLAYER && (
            <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col items-center justify-center p-6 space-y-12 md:space-y-20 animate-in fade-in duration-1000">
              <Starfield />

              <button
                onClick={() => {
                  stopBackgroundMusic();
                  audioSourceRef.current?.stop();
                  setIsPlaying(false);
                  setCurrentView(View.HOME);
                }}
                className="absolute top-6 left-6 md:top-8 md:left-8 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full"
              >
                <div className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
                  <ICONS.ArrowBack className="w-5 h-5" />
                </div>
                <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.3em]">Back</span>
              </button>

              <div className="w-full max-w-2xl text-center space-y-6 md:space-y-8">
                <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.5em] animate-pulse">Neural Streaming</div>
                <p className="text-xl md:text-3xl text-slate-200 font-serif italic font-light leading-relaxed px-4 md:px-12 opacity-80 select-none">
                  "{script.substring(0, 180)}{script.length > 180 ? '...' : ''}"
                </p>
              </div>

              <div className="relative w-full aspect-square max-w-[280px] md:max-w-[360px] flex items-center justify-center">
                <div className={`absolute inset-0 bg-indigo-600/10 rounded-full blur-[100px] transition-all duration-1000 ${isPlaying ? 'scale-150 opacity-100' : 'scale-100 opacity-40'}`}></div>
                <Visualizer isActive={isPlaying} />
              </div>

              <div className="flex items-center gap-10 md:gap-16">
                <button className="p-3 min-w-[44px] min-h-[44px] text-slate-700 hover:text-white transition-all hover:scale-110 btn-press focus-ring rounded-full flex items-center justify-center">
                  <ICONS.SkipPrev className="w-7 h-7 md:w-8 md:h-8" />
                </button>

                <button
                  onClick={togglePlayback}
                  className={`w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl btn-press focus-ring ${isPlaying ? 'bg-white text-slate-950 shadow-white/20' : 'bg-indigo-600 text-white shadow-indigo-600/40'}`}
                >
                  {isPlaying ? (
                    <ICONS.Pause className="w-8 h-8 md:w-10 md:h-10" />
                  ) : (
                    <ICONS.Player className="w-8 h-8 md:w-10 md:h-10 ml-1" />
                  )}
                </button>

                <button className="p-3 min-w-[44px] min-h-[44px] text-slate-700 hover:text-white transition-all hover:scale-110 btn-press focus-ring rounded-full flex items-center justify-center">
                  <ICONS.SkipNext className="w-7 h-7 md:w-8 md:h-8" />
                </button>
              </div>

              {/* Background Music Volume Control */}
              {selectedBackgroundTrack.id !== 'none' && (
                <div className="flex items-center gap-3 mt-4">
                  <ICONS.Music className="w-4 h-4 text-slate-500" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={backgroundVolume}
                    onChange={(e) => updateBackgroundVolume(parseFloat(e.target.value))}
                    className="w-32 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  />
                  <span className="text-xs text-slate-500 w-8">{Math.round(backgroundVolume * 100)}%</span>
                </div>
              )}
            </div>
          )}

        </main>

        {/* MODAL: Voice Clone */}
        {showCloneModal && (
          <SimpleVoiceClone
            onClose={() => setShowCloneModal(false)}
            onVoiceCreated={(voice) => {
              setAvailableVoices(prev => [...prev, voice]);
              setSelectedVoice(voice);
              setShowCloneModal(false);
            }}
            currentUserId={user?.id}
          />
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
          </div>
        )}

        {/* MODAL: Music Selector */}
        {showMusicModal && (
          <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex flex-col p-4 md:p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
            <Starfield />

            <button
              onClick={() => setShowMusicModal(false)}
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
                          <button
                            key={track.id}
                            onClick={() => {
                              setSelectedBackgroundTrack(track);
                              setShowMusicModal(false);
                            }}
                            className={`p-3 md:p-4 rounded-xl text-left transition-all ${
                              selectedBackgroundTrack.id === track.id
                                ? `${config.bgColor} border-2 border-current ${config.color}`
                                : 'bg-white/5 hover:bg-white/10 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <ICONS.Music className={`w-4 h-4 ${selectedBackgroundTrack.id === track.id ? config.color : 'text-slate-500'}`} />
                              <span className={`font-medium text-sm truncate ${selectedBackgroundTrack.id === track.id ? 'text-white' : 'text-slate-300'}`}>
                                {track.name}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2">{track.description}</p>
                          </button>
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

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            checkUser();
          }}
        />

        {/* Voice Manager Modal */}
        <VoiceManager
          isOpen={showVoiceManager}
          onClose={() => setShowVoiceManager(false)}
          onSelectVoice={(voice) => {
            const voiceProfile: VoiceProfile = {
              id: voice.id,
              name: voice.name,
              provider: 'Custom',
              voiceName: 'Kore',
              description: voice.description || 'Your personalized voice clone',
              isCloned: true
            };
            setSelectedVoice(voiceProfile);
            setShowVoiceManager(false);
          }}
          currentVoiceId={selectedVoice.id}
        />

        {/* Burger Menu Drawer */}
        {showBurgerMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setShowBurgerMenu(false)}
            />
            {/* Drawer */}
            <div className="fixed top-0 left-0 bottom-0 z-[95] w-[280px] md:w-[320px] bg-[#0a0f1a]/95 backdrop-blur-xl border-r border-white/10 animate-in slide-in-from-left duration-300 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="font-semibold text-white">History</span>
                </div>
                <button
                  onClick={() => setShowBurgerMenu(false)}
                  className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                >
                  <ICONS.Close className="w-5 h-5" />
                </button>
              </div>

              {/* History Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white mb-1">Meditation History</h3>
                  <p className="text-xs text-slate-500">Your recent meditations</p>
                </div>

                {user ? (
                  <>
                    {isLoadingHistory ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500/30 border-t-indigo-500"></div>
                      </div>
                    ) : meditationHistory.length > 0 ? (
                      <div className="space-y-2">
                        {meditationHistory.slice(0, 10).map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setScript(item.prompt);
                              setShowBurgerMenu(false);
                            }}
                            className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
                          >
                            <p className="text-sm text-white truncate mb-1">{item.prompt}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              {item.voice_name && <span>{item.voice_name}</span>}
                              <span>•</span>
                              <span>{new Date(item.created_at).toLocaleDateString()}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-slate-500 text-sm">No history yet</p>
                        <p className="text-slate-600 text-xs mt-1">Create your first meditation</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm mb-3">Sign in to view history</p>
                    <button
                      onClick={() => {
                        setShowBurgerMenu(false);
                        setShowAuthModal(true);
                      }}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Navigation Links */}
              <div className="p-3 border-t border-white/5 md:hidden">
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={() => { setShowBurgerMenu(false); setShowHowItWorks(true); }}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                    <span className="text-[9px]">How</span>
                  </button>
                  <button
                    onClick={() => { setShowBurgerMenu(false); setShowLibrary(true); }}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                    </svg>
                    <span className="text-[9px]">Library</span>
                  </button>
                  <button
                    onClick={() => { setShowBurgerMenu(false); setShowPricing(true); }}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                    <span className="text-[9px]">Pricing</span>
                  </button>
                  <button
                    onClick={() => { setShowBurgerMenu(false); setShowAboutUs(true); }}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                    <span className="text-[9px]">About</span>
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-center gap-4 text-[10px] text-slate-600 uppercase tracking-widest">
                  <button
                    onClick={() => { setShowBurgerMenu(false); setShowTerms(true); }}
                    className="hover:text-slate-400 transition-colors"
                  >
                    Terms
                  </button>
                  <span className="text-slate-700">•</span>
                  <button
                    onClick={() => { setShowBurgerMenu(false); setShowPrivacy(true); }}
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
                <p className="text-[9px] text-slate-700 text-center">
                  © {new Date().getFullYear()} INrVO. All rights reserved.
                </p>
              </div>
            </div>
          </>
        )}

        {/* MODAL: How It Works */}
        {showHowItWorks && (
          <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex flex-col p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
            <Starfield />

            <button
              onClick={() => setShowHowItWorks(false)}
              className="fixed top-6 left-6 md:top-8 md:left-8 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-[100]"
            >
              <div className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
                <ICONS.ArrowBack className="w-5 h-5" />
              </div>
              <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.3em]">Back</span>
            </button>

            <div className="flex-1 flex flex-col items-center justify-center pt-16 md:pt-0 relative z-10 max-w-4xl mx-auto">
              <div className="inline-block px-4 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Guide</div>
              <h2 className="text-3xl md:text-5xl font-extralight text-center mb-4 tracking-tight">
                <span className="bg-gradient-to-r from-indigo-300 via-purple-200 to-pink-300 bg-clip-text text-transparent">How INrVO Works</span>
              </h2>
              <p className="text-slate-500 text-center mb-12 max-w-lg">Create personalized meditations in seconds with AI</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                <GlassCard className="!p-6 !rounded-2xl text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-indigo-400">1</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Write Your Intention</h3>
                  <p className="text-sm text-slate-400">Type a short phrase like "calm my anxiety" or "help me sleep" - or use voice input</p>
                </GlassCard>

                <GlassCard className="!p-6 !rounded-2xl text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-purple-400">2</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Customize</h3>
                  <p className="text-sm text-slate-400">Choose a voice, select background music, or browse templates for inspiration</p>
                </GlassCard>

                <GlassCard className="!p-6 !rounded-2xl text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-pink-400">3</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Listen & Relax</h3>
                  <p className="text-sm text-slate-400">AI generates a full meditation script and reads it aloud with your chosen voice</p>
                </GlassCard>
              </div>

              <div className="mt-12 text-center">
                <h4 className="text-lg font-semibold text-white mb-4">Pro Tips</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5">
                    <ICONS.Sparkle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-400"><span className="text-white font-medium">Be specific:</span> "5-minute morning energy boost" works better than just "energy"</p>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5">
                    <ICONS.Microphone className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-400"><span className="text-white font-medium">Clone your voice:</span> Record yourself to hear meditations in your own voice</p>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5">
                    <ICONS.Music className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-400"><span className="text-white font-medium">Add emotion:</span> Include feelings like "warm", "peaceful", or "empowering"</p>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5">
                    <ICONS.Book className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-400"><span className="text-white font-medium">Use templates:</span> Browse pre-made prompts for quick inspiration</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Library */}
        {showLibrary && (
          <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex flex-col p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
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
                  {/* Tabs */}
                  <div className="flex justify-center gap-2 mb-8">
                    <button
                      onClick={() => setLibraryTab('history')}
                      className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                        libraryTab === 'history'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      History
                    </button>
                    <button
                      onClick={() => setLibraryTab('saved')}
                      className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                        libraryTab === 'saved'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      Saved
                    </button>
                  </div>

                  {/* History Tab Content */}
                  {libraryTab === 'history' && (
                    <div className="space-y-4">
                      {isLoadingHistory ? (
                        <div className="flex justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500/30 border-t-emerald-400"></div>
                        </div>
                      ) : meditationHistory.length === 0 ? (
                        <GlassCard className="!p-8 !rounded-2xl text-center">
                          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2">No history yet</h3>
                          <p className="text-slate-400 text-sm mb-4">Your meditation history will appear here</p>
                          <button
                            onClick={() => {
                              setShowLibrary(false);
                              setCurrentView(View.HOME);
                            }}
                            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-medium text-sm hover:scale-105 active:scale-95 transition-all"
                          >
                            Create Meditation
                          </button>
                        </GlassCard>
                      ) : (
                        <div className="grid gap-3">
                          {meditationHistory.map((item) => (
                            <GlassCard key={item.id} className="!p-4 !rounded-xl hover:bg-white/10 transition-all group">
                              <div className="flex items-start gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-medium text-sm line-clamp-2 mb-1">{item.prompt}</p>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                    {item.voice_name && (
                                      <>
                                        <span className="text-slate-700">•</span>
                                        <span>{item.voice_name}</span>
                                      </>
                                    )}
                                    {item.duration_seconds && (
                                      <>
                                        <span className="text-slate-700">•</span>
                                        <span>{Math.floor(item.duration_seconds / 60)}:{(item.duration_seconds % 60).toString().padStart(2, '0')}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleReplayHistory(item)}
                                    className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all"
                                    title="Use this prompt"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteHistory(item.id)}
                                    className="p-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all"
                                    title="Delete"
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
                      )}
                    </div>
                  )}

                  {/* Saved Tab Content (placeholder for future) */}
                  {libraryTab === 'saved' && (
                    <GlassCard className="!p-8 !rounded-2xl text-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">Coming Soon</h3>
                      <p className="text-slate-400 text-sm">Save your favorite meditations for quick access</p>
                    </GlassCard>
                  )}
                </div>
              ) : (
                <GlassCard className="!p-8 !rounded-2xl text-center max-w-md">
                  <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="px-6 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-all"
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
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
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
              <div className="inline-block px-4 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Legal</div>
              <h2 className="text-3xl md:text-5xl font-extralight text-center mb-4 tracking-tight">
                <span className="bg-gradient-to-r from-indigo-300 via-purple-200 to-pink-300 bg-clip-text text-transparent">Terms of Service</span>
              </h2>
              <p className="text-slate-500 text-center mb-8">Last updated: December 2024</p>

              <div className="w-full space-y-6 text-slate-300 text-sm md:text-base leading-relaxed pb-8">
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
                  <p className="text-slate-400">For questions about these Terms, contact us at <a href="https://qualiasolutions.net" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">qualiasolutions.net</a></p>
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
                  <p className="text-slate-400">For privacy inquiries, contact us at <a href="https://qualiasolutions.net" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">qualiasolutions.net</a></p>
                </GlassCard>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default App;
