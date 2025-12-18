
import React, { useState, useRef, useEffect } from 'react';
import { View, VoiceProfile } from './types';
import { TEMPLATE_CATEGORIES, VOICE_PROFILES, ICONS, BACKGROUND_TRACKS, BackgroundTrack } from './constants';
import GlassCard from './components/GlassCard';
import Visualizer from './components/Visualizer';
import Starfield from './components/Starfield';
import LoadingScreen from './components/LoadingScreen';
import AuthModal from './components/AuthModal';
import VoiceManager from './components/VoiceManager';
import { AIVoiceInput } from './components/ui/ai-voice-input';
import { geminiService, decodeAudioBuffer, blobToBase64 } from './geminiService';
import { supabase, getCurrentUser, signOut, createVoiceProfile, getUserVoiceProfiles, VoiceProfile as DBVoiceProfile, createVoiceClone } from './lib/supabase';

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

  // Voice profile creation
  const [newProfileName, setNewProfileName] = useState('');
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null); // Base64 audio for voice clone
  const [isRecordingClone, setIsRecordingClone] = useState(false);
  const [recordingProgressClone, setRecordingProgressClone] = useState(0);
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  const [voiceSaved, setVoiceSaved] = useState(false);
  const [savedVoiceId, setSavedVoiceId] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cloneMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const cloneChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Auth states
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showVoiceManager, setShowVoiceManager] = useState(false);
  const [savedVoices, setSavedVoices] = useState<DBVoiceProfile[]>([]);
  const [currentClonedVoice, setCurrentClonedVoice] = useState<DBVoiceProfile | null>(null);

  // Check auth state on mount
  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserVoices();
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

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
      // The 'accent' field stores the preferred Gemini voice name
      const clonedVoiceProfiles = voices.map(v => ({
        id: v.id,
        name: v.name,
        provider: 'Custom' as const,
        voiceName: v.accent || 'Kore', // Use saved Gemini voice or default to Kore
        description: v.description || 'Your personalized voice profile',
        isCloned: true
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
    const profileName = newProfileName.trim() || `My Voice ${new Date().toLocaleDateString()}`;
    
    setIsSavingVoice(true);
    setMicError(null);
    setVoiceSaved(false);

    try {
      // Create voice clone
      let voiceClone = null;
      try {
        voiceClone = await createVoiceClone(
          profileName,
          audioData,
          'Cloned voice profile',
          {}
        );
      } catch (cloneError: any) {
        console.warn('Voice clone creation failed:', cloneError);
      }

      // Create voice profile entry
      const savedVoice = await createVoiceProfile(
        profileName,
        'Cloned voice profile',
        'en-US',
        'Kore' // Default voice for TTS (Gemini TTS doesn't support custom voices yet)
      );

      if (savedVoice) {
        // Update the profile name if it was auto-generated
        if (!newProfileName.trim()) {
          setNewProfileName(profileName);
        }
        
        setSavedVoiceId(savedVoice.id);
        setVoiceSaved(true);
        
        // Reload voices to include the new one
        await loadUserVoices();

        // Auto-select the new voice
        const newVoice: VoiceProfile = {
          id: savedVoice.id,
          name: savedVoice.name,
          provider: 'Custom',
          voiceName: 'Kore', // Will use cloned voice when available
          description: savedVoice.description || 'Your personalized cloned voice profile',
          isCloned: true
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
      await autoSaveVoiceRecording(recordedAudio);
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

  const handleGenerateAndPlay = async () => {
    if (!script.trim()) {
      setMicError('Please enter some text to generate a meditation');
      return;
    }
    
    setIsGenerating(true);
    setMicError(null);
    
    try {
      // Generate enhanced meditation from short prompt
      const enhanced = await geminiService.enhanceScript(script);
      
      if (!enhanced || !enhanced.trim()) {
        throw new Error('Failed to generate meditation script. Please try again.');
      }

      // Initialize audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Generate speech with selected voice
      const audioBase64 = await geminiService.generateSpeech(enhanced, selectedVoice.voiceName);
      
      if (!audioBase64 || audioBase64.trim() === '') {
        throw new Error('Failed to generate audio. Please check your API key and try again.');
      }
      
      const buffer = await decodeAudioBuffer(audioBase64, audioContextRef.current);
      
      if (!buffer) {
        throw new Error('Failed to decode audio. Please try again.');
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
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      audioSourceRef.current = source;

      // Update state and switch to player view
      setScript(enhanced);
      setIsPlaying(true);
      setCurrentView(View.PLAYER);

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

      const audioBase64 = await geminiService.generateSpeech(script, selectedVoice.voiceName);
      
      if (!audioBase64 || audioBase64.trim() === '') {
        throw new Error('Failed to generate audio. Please check your API key and try again.');
      }
      
      const buffer = await decodeAudioBuffer(audioBase64, audioContextRef.current);
      
      if (!buffer) {
        throw new Error('Failed to decode audio. Please try again.');
      }

      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }

      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
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

      <div className={`relative min-h-[100dvh] w-full flex flex-col overflow-hidden transition-opacity duration-700 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        <Starfield />

        {/* Simple Navigation - Mobile Optimized */}
        <nav className="fixed top-0 left-0 right-0 z-50 p-3 md:p-6 flex justify-between items-center bg-gradient-to-b from-[#020617]/80 to-transparent">
          <div
            className="flex items-center gap-2 cursor-pointer group opacity-80 hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={() => setCurrentView(View.HOME)}
          >
            <ICONS.Logo className="h-5 md:h-7 text-white" />
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

        <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 w-full relative">

          {/* VIEW: HOME */}
          {currentView === View.HOME && (
            <div className="w-full flex flex-col items-center justify-center animate-in fade-in duration-1000">
              {/* Tagline at top - responsive positioning */}
              <div className="fixed top-14 md:top-24 left-0 right-0 text-center px-4 z-40">
                <p className="text-base md:text-2xl font-light tracking-wide text-white/70">
                  Instant meditation, <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-500 font-semibold">personalized voice</span>
                </p>
                <p className="text-xs md:text-base text-slate-500 mt-1 md:mt-2 hidden sm:block">Write a short idea, generate a meditation, and listen with your chosen voice</p>
              </div>

              {/* Prompt Box - ABSOLUTE BOTTOM on mobile */}
              <div className="w-full max-w-4xl fixed left-0 right-0 bottom-0 mx-auto px-2 md:px-6 pb-0 md:pb-6 z-50">
                {micError && (
                  <div className="mb-4 text-center">
                    <span className="px-4 py-1.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold uppercase tracking-widest border border-rose-500/20">
                      {micError}
                    </span>
                  </div>
                )}

                <div className="glass glass-prompt rounded-t-2xl rounded-b-none md:rounded-[40px] p-1 md:p-3 flex flex-col shadow-2xl shadow-indigo-900/20 border border-white/10 border-b-0 md:border-b">
                  <div className="relative">
                    <textarea
                      placeholder="e.g., 'calm my anxiety', 'help me sleep'..."
                      className="w-full bg-transparent p-3 md:p-8 text-sm md:text-base text-slate-200 placeholder:text-slate-600 resize-none outline-none min-h-[60px] md:min-h-[120px] leading-relaxed"
                      value={script}
                      onChange={(e) => setScript(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleGenerateAndPlay();
                        }
                      }}
                    />

                    <div className="flex items-center justify-between px-2 md:px-6 pb-2 md:pb-6">
                      <div className="flex items-center gap-1.5 md:gap-3">
                        {/* Clone Voice Button */}
                        <button
                          onClick={() => {
                            setShowCloneModal(true);
                            setRecordingProgress(0);
                            setMicError(null);
                          }}
                          className="p-2.5 md:p-4 min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] rounded-xl md:rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-indigo-400 transition-all btn-press focus-ring flex items-center justify-center"
                          title="Clone your voice"
                        >
                          <ICONS.Waveform className="w-4 h-4 md:w-6 md:h-6" />
                        </button>
                        {/* Templates Button */}
                        <button
                          onClick={() => setShowTemplatesModal(true)}
                          className="p-2.5 md:p-4 min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] rounded-xl md:rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-purple-400 transition-all btn-press focus-ring flex items-center justify-center"
                          title="Browse templates"
                        >
                          <ICONS.Sparkle className="w-4 h-4 md:w-6 md:h-6" />
                        </button>
                        {/* Music Button */}
                        <button
                          onClick={() => setShowMusicModal(true)}
                          className={`p-2.5 md:p-4 min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] rounded-xl md:rounded-2xl transition-all btn-press focus-ring flex items-center justify-center ${selectedBackgroundTrack.id !== 'none' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-emerald-400'}`}
                          title={`Background: ${selectedBackgroundTrack.name}`}
                        >
                          <ICONS.Music className="w-4 h-4 md:w-6 md:h-6" />
                        </button>
                        {/* Mic Button */}
                        <button
                          onMouseDown={startRecording}
                          onMouseUp={stopRecording}
                          onTouchStart={startRecording}
                          onTouchEnd={stopRecording}
                          className={`p-2.5 md:p-4 min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] rounded-xl md:rounded-2xl transition-all shadow-xl btn-press focus-ring flex items-center justify-center ${isRecording ? 'bg-rose-500 text-white scale-110 shadow-rose-500/40' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                          title="Hold to speak"
                        >
                          <ICONS.Microphone className="w-4 h-4 md:w-6 md:h-6" />
                        </button>
                      </div>

                      <button
                        onClick={handleGenerateAndPlay}
                        disabled={isGenerating || !script.trim()}
                        className={`
                          px-4 md:px-10 py-2.5 md:py-4 rounded-xl md:rounded-3xl font-bold text-[10px] md:text-sm flex items-center gap-2 md:gap-3 transition-all min-h-[40px] md:min-h-[44px]
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

                  {/* Status bar - simplified on mobile */}
                  <div className="px-3 md:px-8 py-2 md:py-4 flex justify-between items-center text-[9px] md:text-[12px] uppercase tracking-wider md:tracking-widest font-bold text-slate-500 border-t border-white/5 bg-white/[0.01]">
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0 ${isRecording ? 'bg-rose-500 animate-ping' : isGenerating ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                      <span className="text-slate-400 truncate">{isRecording ? 'Capturing...' : isGenerating ? 'Generating...' : 'Ready'}</span>
                    </div>
                    <div className="text-slate-600 truncate max-w-[80px] md:max-w-none text-right">{selectedVoice.name}</div>
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
            </div>
          )}

        </main>

        {/* MODAL: Voice Clone */}
        {showCloneModal && (
          <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
            <Starfield />

            {/* Back Button */}
            <button
              onClick={() => {
                setShowCloneModal(false);
                setIsRecording(false);
                setRecordingProgress(0);
                setIsRecordingClone(false);
                setRecordingProgressClone(0);
                setRecordedAudio(null);
                setVoiceSaved(false);
                setSavedVoiceId(null);
                setIsSavingVoice(false);
                if (recordingIntervalRef.current) {
                  clearInterval(recordingIntervalRef.current);
                  recordingIntervalRef.current = null;
                }
                if (cloneMediaRecorderRef.current && isRecordingClone) {
                  cloneMediaRecorderRef.current.stop();
                  setIsRecordingClone(false);
                }
              }}
              className="absolute top-6 left-6 md:top-8 md:left-8 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-10"
            >
              <div className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
                <ICONS.ArrowBack className="w-5 h-5" />
              </div>
              <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.3em]">Back</span>
            </button>

            <div className="w-full max-w-md space-y-8 md:space-y-10 relative">

              <div className="space-y-4">
                <div className="inline-block px-4 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-4">Voice Profile</div>
                <h3 className="text-3xl md:text-5xl font-serif font-bold text-white tracking-tight">Clone Your Voice</h3>
                <p className="text-slate-500 text-sm md:text-base px-4 md:px-16 leading-relaxed font-light">
                  Record your voice to create a personalized voice profile for meditations.
                </p>
              </div>

              {micError && (
                <div className="text-rose-400 text-sm font-bold bg-rose-500/10 border border-rose-500/20 px-6 py-3 rounded-2xl">
                  {micError}
                </div>
              )}

              <div className="space-y-6 bg-white/5 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/10">
                {/* Profile Name Input */}
                <div className="space-y-2">
                  <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">
                    Profile Name
                  </label>
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="e.g., Morning Meditation Voice"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
                    disabled={isGenerating || isRecordingClone}
                  />
                </div>

                {/* Voice Cloning Section */}
                <div className="space-y-3">
                  <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">
                    Clone Your Voice
                  </label>
                  <div className="space-y-3">
                    {!recordedAudio && !voiceSaved ? (
                      <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-sm text-slate-400 text-center mb-2">
                          Record your voice to create a personalized voice profile
                        </p>
                        <div className="w-full">
                          <AIVoiceInput
                            isRecording={isRecordingClone}
                            onToggle={async (recording) => {
                              if (recording) {
                                await startRecordingClone();
                              } else {
                                stopRecordingClone();
                              }
                            }}
                            onStart={() => {
                              // Recording started
                            }}
                            onStop={(duration) => {
                              // Recording stopped, audio is captured in stopRecordingClone
                            }}
                            visualizerBars={48}
                            className="[&_button]:!bg-transparent [&_button]:!hover:bg-white/10"
                          />
                        </div>
                        <p className="text-[10px] text-slate-600 text-center">
                          Record for up to 30 seconds. Speak clearly and naturally.
                        </p>
                      </div>
                    ) : isSavingVoice ? (
                      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500/20 border-t-indigo-500"></div>
                        <div>
                          <p className="text-sm font-bold text-indigo-400">Saving your voice...</p>
                          <p className="text-xs text-slate-500">Please wait</p>
                        </div>
                      </div>
                    ) : voiceSaved ? (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-emerald-400">Saved!</p>
                            <p className="text-xs text-slate-500">Your voice is ready to use</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setRecordedAudio(null);
                            setRecordingProgressClone(0);
                            setVoiceSaved(false);
                            setSavedVoiceId(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 text-xs font-bold uppercase tracking-widest transition-all"
                        >
                          Record New
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-emerald-400">Voice recorded</p>
                            <p className="text-xs text-slate-500">Ready to save</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setRecordedAudio(null);
                            setRecordingProgressClone(0);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 text-xs font-bold uppercase tracking-widest transition-all"
                        >
                          Re-record
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {voiceSaved ? (
                  <button
                    onClick={handleCreateVoiceProfile}
                    className="group px-12 py-4 rounded-full bg-emerald-500 text-white font-bold text-base hover:scale-105 active:scale-95 transition-all shadow-[0_20px_60px_-15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3 mx-auto"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Done
                  </button>
                ) : isSavingVoice ? (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500/20 border-t-indigo-500"></div>
                    <span className="text-[12px] font-bold uppercase tracking-[0.5em] text-indigo-400">Saving...</span>
                  </div>
                ) : (
                  <button
                    onClick={handleCreateVoiceProfile}
                    disabled={!recordedAudio}
                    className="group px-12 py-4 rounded-full bg-white text-slate-950 font-bold text-base hover:scale-105 active:scale-95 transition-all shadow-[0_20px_60px_-15px_rgba(255,255,255,0.3)] flex items-center justify-center gap-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-500 group-hover:animate-ping"></span>
                    {recordedAudio ? 'Save Voice' : 'Record First'}
                  </button>
                )}
              </div>

              {!user && (
                <p className="text-xs text-slate-600 text-center">
                  You'll need to sign in to save voice profiles.
                </p>
              )}
            </div>
          </div>
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
              className="fixed top-6 left-6 md:top-8 md:left-8 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-10"
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
          <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex flex-col p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
            <Starfield />

            {/* Back Button */}
            <button
              onClick={() => setShowMusicModal(false)}
              className="fixed top-6 left-6 md:top-8 md:left-8 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-10"
            >
              <div className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
                <ICONS.ArrowBack className="w-5 h-5" />
              </div>
              <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.3em]">Back</span>
            </button>

            {/* Modal Content */}
            <div className="flex-1 flex flex-col items-center justify-center pt-16 md:pt-0 relative z-10">
              <h2 className="text-3xl md:text-5xl font-extralight text-center mb-3 tracking-tight">
                <span className="bg-gradient-to-r from-emerald-300 via-cyan-200 to-teal-300 bg-clip-text text-transparent">Background Music</span>
              </h2>
              <p className="text-slate-500 text-center mb-12 max-w-md">Choose ambient sounds to enhance your meditation experience</p>

              {/* Music Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                {/* Nature Sounds */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 px-2">Nature</h3>
                  {BACKGROUND_TRACKS.filter(t => t.category === 'nature').map(track => (
                    <GlassCard
                      key={track.id}
                      onClick={() => {
                        setSelectedBackgroundTrack(track);
                        setShowMusicModal(false);
                      }}
                      className={`!p-4 !rounded-xl cursor-pointer border transition-all ${
                        selectedBackgroundTrack.id === track.id
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-transparent hover:border-emerald-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          selectedBackgroundTrack.id === track.id ? 'bg-emerald-500/30' : 'bg-white/5'
                        }`}>
                          <ICONS.Music className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <h5 className="text-sm font-bold text-white">{track.name}</h5>
                          <p className="text-xs text-slate-400">{track.description}</p>
                        </div>
                        {selectedBackgroundTrack.id === track.id && (
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </div>
                    </GlassCard>
                  ))}
                </div>

                {/* Ambient & Binaural */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 px-2">Ambient & Binaural</h3>
                  {BACKGROUND_TRACKS.filter(t => t.category === 'ambient' || t.category === 'binaural').map(track => (
                    <GlassCard
                      key={track.id}
                      onClick={() => {
                        setSelectedBackgroundTrack(track);
                        setShowMusicModal(false);
                      }}
                      className={`!p-4 !rounded-xl cursor-pointer border transition-all ${
                        selectedBackgroundTrack.id === track.id
                          ? 'border-cyan-500/50 bg-cyan-500/10'
                          : 'border-transparent hover:border-cyan-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          selectedBackgroundTrack.id === track.id ? 'bg-cyan-500/30' : 'bg-white/5'
                        }`}>
                          <ICONS.Music className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div className="flex-1">
                          <h5 className="text-sm font-bold text-white">{track.name}</h5>
                          <p className="text-xs text-slate-400">{track.description}</p>
                        </div>
                        {selectedBackgroundTrack.id === track.id && (
                          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        )}
                      </div>
                    </GlassCard>
                  ))}

                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 px-2 pt-4">Instrumental</h3>
                  {BACKGROUND_TRACKS.filter(t => t.category === 'instrumental').map(track => (
                    <GlassCard
                      key={track.id}
                      onClick={() => {
                        setSelectedBackgroundTrack(track);
                        setShowMusicModal(false);
                      }}
                      className={`!p-4 !rounded-xl cursor-pointer border transition-all ${
                        selectedBackgroundTrack.id === track.id
                          ? 'border-purple-500/50 bg-purple-500/10'
                          : 'border-transparent hover:border-purple-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          selectedBackgroundTrack.id === track.id ? 'bg-purple-500/30' : 'bg-white/5'
                        }`}>
                          <ICONS.Music className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h5 className="text-sm font-bold text-white">{track.name}</h5>
                          <p className="text-xs text-slate-400">{track.description}</p>
                        </div>
                        {selectedBackgroundTrack.id === track.id && (
                          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                        )}
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            </div>
          </div>
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

      </div>
    </>
  );
};

export default App;
