import React, { useState, useEffect, lazy, Suspense, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useModals } from '../contexts/ModalContext';
import Starfield from '../../components/Starfield';
import Background from '../../components/Background';
import { ICONS, BACKGROUND_TRACKS, AUDIO_TAG_CATEGORIES } from '../../constants';
import { voiceService } from '../lib/voiceService';
import { buildTimingMap } from '../lib/textSync';
import { saveMeditationHistory } from '../../lib/supabase';
import { creditService } from '../lib/credits';

// Lazy-loaded components
const AgentChat = lazy(() => import('../../components/AgentChat').then(m => ({ default: m.AgentChat })));
const AuthModal = lazy(() => import('../../components/AuthModal'));
const VoiceManager = lazy(() => import('../../components/VoiceManager'));
const SimpleVoiceClone = lazy(() => import('../../components/SimpleVoiceClone').then(m => ({ default: m.SimpleVoiceClone })));
const MeditationEditor = lazy(() => import('../components/MeditationEditor'));

// Rotating taglines
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

const SpinnerDiv = () => (
  <div className="fixed inset-0 z-[90] bg-slate-950/90 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    checkUser,
    availableVoices,
    setAvailableVoices,
    selectedVoice,
    setSelectedVoice,
    savedVoices,
    cloningStatus,
    setCloningStatus,
    creditInfo,
    selectedBackgroundTrack,
    setSelectedBackgroundTrack,
    selectedAudioTags,
    setSelectedAudioTags,
    script,
    setScript,
    enhancedScript,
    setEnhancedScript,
    editableScript,
    setEditableScript,
    isGenerating,
    setIsGenerating,
    generationStage,
    setGenerationStage,
    chatStarted,
    setChatStarted,
    restoredScript,
    setRestoredScript,
    micError,
    setMicError,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    currentWordIndex,
    setCurrentWordIndex,
    timingMap,
    setTimingMap,
    audioContextRef,
    audioSourceRef,
    audioBufferRef,
    gainNodeRef,
    backgroundAudioRef,
    backgroundVolume,
    voiceVolume,
    playbackRate,
  } = useApp();

  const {
    showCloneModal, setShowCloneModal,
    showAuthModal, setShowAuthModal,
    showVoiceManager, setShowVoiceManager,
    showBurgerMenu, setShowBurgerMenu,
    showScriptPreview, setShowScriptPreview,
  } = useModals();

  const [tagline] = useState(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const playbackStartTimeRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const playbackRateRef = useRef(0.9);
  const lastWordIndexRef = useRef(-1);

  // Initial loading effect
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Background music functions
  const startBackgroundMusic = useCallback((track: typeof selectedBackgroundTrack) => {
    if (track.id === 'none' || !track.url) {
      setIsMusicPlaying(false);
      return;
    }

    try {
      if (!backgroundAudioRef.current) {
        backgroundAudioRef.current = new Audio();
        backgroundAudioRef.current.loop = true;
      }

      backgroundAudioRef.current.src = track.url;
      backgroundAudioRef.current.volume = backgroundVolume;
      backgroundAudioRef.current.play()
        .then(() => setIsMusicPlaying(true))
        .catch(err => console.warn('Failed to play background music:', err));
    } catch (err) {
      console.warn('Failed to start background music:', err);
    }
  }, [backgroundVolume, backgroundAudioRef]);

  const stopBackgroundMusic = useCallback(() => {
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.pause();
      backgroundAudioRef.current.currentTime = 0;
    }
    setIsMusicPlaying(false);
  }, [backgroundAudioRef]);

  // Handle meditation panel open
  const handleMeditationPanelOpen = useCallback(() => {
    // Auto-select first voice if none selected
    if (!selectedVoice && availableVoices.length > 0) {
      setSelectedVoice(availableVoices[0]);
    }
  }, [selectedVoice, availableVoices, setSelectedVoice]);

  // Handle generate and play
  const handleGenerateAndPlay = useCallback(async () => {
    if (!selectedVoice || !enhancedScript) return;

    setIsGenerating(true);
    setGenerationStage('voice');
    setMicError(null);

    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const { audioBuffer, base64 } = await voiceService.generateSpeech(
        enhancedScript,
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

      audioBufferRef.current = audioBuffer;
      setDuration(audioBuffer.duration);
      setCurrentTime(0);
      lastWordIndexRef.current = 0;
      setCurrentWordIndex(0);
      pauseOffsetRef.current = 0;

      // Create gain node
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }
      gainNodeRef.current.gain.value = voiceVolume;

      // Start playback
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackRate;
      playbackRateRef.current = playbackRate;
      source.connect(gainNodeRef.current);
      source.start();
      audioSourceRef.current = source;
      playbackStartTimeRef.current = audioContextRef.current.currentTime;

      setIsPlaying(true);
      setIsGenerating(false);
      setGenerationStage('idle');

      // Build timing map
      const map = buildTimingMap(enhancedScript, audioBuffer.duration);
      setTimingMap(map);

      // Start background music
      startBackgroundMusic(selectedBackgroundTrack);

      // Save to history
      saveMeditationHistory(
        enhancedScript.substring(0, 100),
        enhancedScript,
        selectedVoice.id,
        selectedVoice.name,
        selectedBackgroundTrack?.id,
        selectedBackgroundTrack?.name,
        Math.round(audioBuffer.duration),
        selectedAudioTags.length > 0 ? selectedAudioTags : undefined,
        selectedVoice.isCloned ? base64 : undefined
      ).catch(err => console.warn('Failed to save history:', err));

      // Navigate to player
      navigate('/play');

      source.onended = () => {
        setIsPlaying(false);
      };
    } catch (error: any) {
      console.error('Failed to generate audio:', error);
      setMicError(error?.message || 'Failed to generate audio. Please try again.');
      setIsGenerating(false);
      setGenerationStage('idle');
    }
  }, [
    selectedVoice,
    enhancedScript,
    selectedBackgroundTrack,
    selectedAudioTags,
    voiceVolume,
    playbackRate,
    navigate,
    startBackgroundMusic,
    audioContextRef,
    audioSourceRef,
    audioBufferRef,
    gainNodeRef,
    setIsGenerating,
    setGenerationStage,
    setMicError,
    setDuration,
    setCurrentTime,
    setCurrentWordIndex,
    setIsPlaying,
    setTimingMap,
  ]);

  // Handle clone recording complete
  const handleCloneRecordingComplete = useCallback(async (audioBlob: Blob) => {
    // This will be handled by SimpleVoiceClone component
    console.log('Clone recording complete');
  }, []);

  // Sign out
  const handleSignOut = async () => {
    const { signOut } = await import('../../lib/supabase');
    await signOut();
    checkUser();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <ICONS.Logo className="h-8 text-white mx-auto mb-4 animate-pulse" />
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full overflow-hidden bg-[#020617]">
      <Starfield />
      <Background isActive={isPlaying} />

      {/* Navigation */}
      <nav className="sticky top-0 w-full flex items-center justify-between gap-2 p-4 md:p-5 border-b border-white/[0.03] z-50">
        {/* Left: Menu Button (mobile) + Logo */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setShowBurgerMenu(true)}
            className="w-10 h-10 min-w-[40px] md:w-11 md:h-11 md:min-w-[44px] flex items-center justify-center rounded-lg md:rounded-xl text-white hover:bg-white/5 transition-all"
            aria-label="Open menu"
          >
            <ICONS.Menu className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <Link to="/" className="cursor-pointer flex-shrink-0">
            <ICONS.Logo className="h-4 md:h-5 text-white" />
          </Link>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Voice selector */}
          <div className="flex items-center gap-2">
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
                    {v.name} {v.isCloned ? '★' : ''}
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

          {/* Sign In */}
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-between p-4 md:p-6 w-full relative">
        <div className="w-full h-full animate-in fade-in duration-1000">
          {/* Tagline */}
          {!chatStarted && (
            <div className="fixed top-24 md:top-32 left-0 right-0 text-center z-10 px-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <p className="text-2xl md:text-4xl font-light tracking-wide text-white/70">
                {tagline.main} <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-cyan-500 font-semibold">{tagline.highlight}</span>
              </p>
              <p className="text-base md:text-2xl text-slate-500 mt-1 md:mt-2 hidden sm:block">{tagline.sub}</p>
            </div>
          )}

          {/* Error message */}
          {micError && (
            <div className="fixed bottom-24 left-0 right-0 z-50 text-center">
              <span className="px-4 py-1.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold uppercase tracking-widest border border-rose-500/20">
                {micError}
              </span>
            </div>
          )}

          {/* Agent Chat */}
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-slate-400">Loading chat...</div>
            </div>
          }>
            <AgentChat
              onMeditationReady={(generatedScript, meditationType, userPrompt) => {
                setScript(userPrompt);
                setEnhancedScript(generatedScript);
                if (selectedVoice) {
                  handleGenerateAndPlay();
                } else {
                  setShowVoiceManager(true);
                }
              }}
              onGenerateAudio={async (meditationScript, tags) => {
                if (!selectedVoice) {
                  setShowVoiceManager(true);
                  return;
                }
                setEditableScript(meditationScript);
                setSelectedAudioTags(tags);
                setScript(meditationScript);
                setEnhancedScript(meditationScript);

                // Generate and navigate to player
                setIsGenerating(true);
                setGenerationStage('voice');
                setMicError(null);

                try {
                  if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                  }

                  const { audioBuffer, base64 } = await voiceService.generateSpeech(
                    meditationScript,
                    selectedVoice,
                    audioContextRef.current
                  );

                  if (!base64 || base64.trim() === '') {
                    throw new Error('Failed to generate audio. Please try again.');
                  }

                  audioBufferRef.current = audioBuffer;
                  setDuration(audioBuffer.duration);
                  setCurrentTime(0);

                  // Create gain node
                  if (!gainNodeRef.current) {
                    gainNodeRef.current = audioContextRef.current.createGain();
                    gainNodeRef.current.connect(audioContextRef.current.destination);
                  }
                  gainNodeRef.current.gain.value = voiceVolume;

                  // Start playback
                  const source = audioContextRef.current.createBufferSource();
                  source.buffer = audioBuffer;
                  source.playbackRate.value = playbackRate;
                  source.connect(gainNodeRef.current);
                  source.start();
                  audioSourceRef.current = source;

                  setIsPlaying(true);
                  setIsGenerating(false);
                  setGenerationStage('idle');

                  // Build timing map
                  const map = buildTimingMap(meditationScript, audioBuffer.duration);
                  setTimingMap(map);

                  // Start background music
                  startBackgroundMusic(selectedBackgroundTrack);

                  // Save to history
                  saveMeditationHistory(
                    meditationScript.substring(0, 100),
                    meditationScript,
                    selectedVoice.id,
                    selectedVoice.name,
                    selectedBackgroundTrack?.id,
                    selectedBackgroundTrack?.name,
                    Math.round(audioBuffer.duration),
                    tags.length > 0 ? tags : undefined,
                    selectedVoice.isCloned ? base64 : undefined
                  ).catch(err => console.warn('Failed to save history:', err));

                  // Navigate to player
                  navigate('/play');

                  source.onended = () => {
                    setIsPlaying(false);
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
          </Suspense>
        </div>
      </main>

      {/* Modals */}
      {showCloneModal && (
        <Suspense fallback={<SpinnerDiv />}>
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

      <Suspense fallback={null}>
        <VoiceManager
          isOpen={showVoiceManager}
          onClose={() => setShowVoiceManager(false)}
          onSelectVoice={(voice) => {
            const provider = voice.fish_audio_model_id ? 'fish-audio' as const : 'chatterbox' as const;
            setSelectedVoice({
              id: voice.id,
              name: voice.name,
              provider,
              voiceName: voice.name,
              description: voice.description || 'Your personalized voice clone',
              isCloned: true,
              providerVoiceId: voice.provider_voice_id,
              fishAudioModelId: voice.fish_audio_model_id,
              voiceSampleUrl: voice.voice_sample_url,
            });
            setShowVoiceManager(false);
          }}
          onCloneVoice={() => {
            setShowCloneModal(true);
            setMicError(null);
          }}
          onVoiceDeleted={(deletedVoiceId) => {
            if (selectedVoice?.id === deletedVoiceId) {
              setSelectedVoice(null);
            }
            setAvailableVoices(availableVoices.filter(v => v.id !== deletedVoiceId));
          }}
          currentVoiceId={selectedVoice?.id}
        />
      </Suspense>

      {/* Sidebar */}
      <Sidebar
        isOpen={showBurgerMenu}
        onClose={() => setShowBurgerMenu(false)}
        user={user}
        onSignOut={handleSignOut}
      />
    </div>
  );
};

// Sidebar component
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSignOut: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, user, onSignOut }) => {
  const navigate = useNavigate();
  const { setShowAuthModal } = useModals();

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/70"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-72 z-[95] flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#030712' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <Link to="/" className="cursor-pointer" onClick={onClose}>
            <ICONS.Logo className="h-5 text-white" />
          </Link>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <div className="p-4 space-y-1">
          <button
            onClick={() => { onClose(); navigate('/how-it-works'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white hover:bg-white/10 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
            How It Works
          </button>
          <button
            onClick={() => { onClose(); navigate('/library'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white hover:bg-white/10 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            Library
          </button>
          <button
            onClick={() => { onClose(); navigate('/templates'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white hover:bg-white/10 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            Templates
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/5" />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <div className="p-4 border-t border-white/5 space-y-3">
          {user ? (
            <button
              onClick={() => { onClose(); onSignOut(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white hover:text-rose-400 hover:bg-white/5 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => { onClose(); setShowAuthModal(true); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Sign In
            </button>
          )}
          <div className="flex items-center justify-center gap-3 text-[10px] text-white/70">
            <Link to="/about" onClick={onClose} className="hover:text-white transition-colors">About</Link>
            <span>·</span>
            <Link to="/terms" onClick={onClose} className="hover:text-white transition-colors">Terms</Link>
            <span>·</span>
            <Link to="/privacy" onClick={onClose} className="hover:text-white transition-colors">Privacy</Link>
          </div>
          <p className="text-[9px] text-white/50 text-center">&copy; {new Date().getFullYear()} INrVO</p>
        </div>
      </div>
    </>
  );
};

export default HomePage;
