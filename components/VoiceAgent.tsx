/**
 * VoiceAgent Component
 *
 * Real-time voice conversation interface using:
 * - Web Speech API for speech recognition (free, built into browsers)
 * - Browser TTS for speaking responses (free)
 * - React Portal for reliable z-index stacking
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import { useMeditationAgent } from '../src/hooks/useMeditationAgent';

// ============================================================================
// TYPES
// ============================================================================

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

interface Transcript {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isFinal: boolean;
}

interface VoiceAgentProps {
  onClose?: () => void;
}

// ============================================================================
// ICONS (inline SVG components)
// ============================================================================

const PhoneIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const EndCallIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
  </svg>
);

const MicIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const MicOffIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ============================================================================
// WAVE VISUALIZER
// ============================================================================

const WaveVisualizer: React.FC<{ isActive: boolean; isSpeaking: boolean; volume: number }> = ({
  isActive,
  isSpeaking,
  volume,
}) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => setFrame(f => f + 1), 100);
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {[0, 1, 2, 3, 4].map((i) => {
        const centerDistance = Math.abs(i - 2);
        const baseHeight = 32 - centerDistance * 6;
        let height = 6;

        if (isActive) {
          if (isSpeaking) {
            const phase = ((frame * 0.15) + i * 0.6) % (Math.PI * 2);
            height = baseHeight * (0.5 + Math.sin(phase) * 0.4);
          } else {
            height = baseHeight * (0.3 + volume * 0.7);
          }
        }

        return (
          <div
            key={i}
            className="w-1 rounded-full transition-all duration-100"
            style={{
              height: `${Math.max(6, height)}px`,
              background: isActive
                ? 'linear-gradient(to top, rgba(34,211,238,0.5), rgba(34,211,238,1))'
                : 'rgba(255,255,255,0.15)',
              opacity: isActive ? 1 : 0.4,
            }}
          />
        );
      })}
    </div>
  );
};

// ============================================================================
// VOICE ORB
// ============================================================================

const VoiceOrb: React.FC<{ state: VoiceState; volume: number }> = ({ state, volume }) => {
  const isActive = state === 'listening' || state === 'speaking';
  const isProcessing = state === 'processing';

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow */}
      <m.div
        className="absolute w-52 h-52 rounded-full"
        style={{
          background: isActive
            ? 'radial-gradient(circle, rgba(34,211,238,0.2) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
        }}
        animate={{
          scale: state === 'listening' ? [1, 1.1 + volume * 0.15, 1] : state === 'speaking' ? [1, 1.12, 1] : 1,
          opacity: isActive ? [0.6, 1, 0.6] : 0.3,
        }}
        transition={{ duration: state === 'speaking' ? 1.2 : 1.8, repeat: Infinity }}
      />

      {/* Middle ring */}
      <m.div
        className="absolute w-36 h-36 rounded-full border-2"
        style={{ borderColor: isActive ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.08)' }}
        animate={{
          scale: isProcessing ? [1, 1.08, 1] : 1,
          opacity: isProcessing ? [0.4, 0.7, 0.4] : 0.6,
        }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />

      {/* Inner orb */}
      <m.div
        className="relative w-28 h-28 rounded-full flex items-center justify-center"
        style={{
          background: isActive
            ? 'radial-gradient(circle at 35% 35%, rgba(34,211,238,0.5), rgba(34,211,238,0.15))'
            : 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.12), rgba(255,255,255,0.03))',
          boxShadow: isActive
            ? '0 0 50px rgba(34,211,238,0.35), inset 0 0 35px rgba(34,211,238,0.15)'
            : 'inset 0 0 25px rgba(255,255,255,0.05)',
        }}
        animate={{ scale: state === 'listening' ? 1 + volume * 0.12 : 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      >
        {isProcessing ? (
          <m.div
            className="w-8 h-8 border-3 border-white/30 border-t-sky-500 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
        ) : (
          <WaveVisualizer isActive={isActive} isSpeaking={state === 'speaking'} volume={volume} />
        )}
      </m.div>
    </div>
  );
};

// ============================================================================
// TRANSCRIPT BUBBLE
// ============================================================================

const TranscriptBubble: React.FC<{ transcript: Transcript }> = ({ transcript }) => (
  <m.div
    initial={{ opacity: 0, y: 15, scale: 0.96 }}
    animate={{ opacity: transcript.isFinal ? 1 : 0.75, y: 0, scale: 1 }}
    exit={{ opacity: 0, scale: 0.96 }}
    className={`flex ${transcript.role === 'user' ? 'justify-end' : 'justify-start'}`}
  >
    <div
      className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
        transcript.role === 'user'
          ? 'bg-gradient-to-br from-sky-500/25 to-sky-600/20 text-white border border-sky-500/30 rounded-br-md'
          : 'bg-white/[0.08] text-white/90 border border-white/10 rounded-bl-md'
      }`}
    >
      {transcript.text}
    </div>
  </m.div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const VoiceAgent: React.FC<VoiceAgentProps> = ({ onClose }) => {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');

  const transcriptsEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const volumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { sendMessage, messages, isLoading } = useMeditationAgent({});

  // Check browser support
  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) &&
    'speechSynthesis' in window;

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Simulate volume for visual feedback
  useEffect(() => {
    if (state === 'listening' && !isMuted) {
      volumeIntervalRef.current = setInterval(() => {
        setVolume(Math.random() * 0.6 + 0.2);
      }, 100);
    } else {
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = null;
      }
      setVolume(0);
    }
    return () => {
      if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
    };
  }, [state, isMuted]);

  // Watch for AI responses and speak them
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.content && !lastMessage.isLoading && state !== 'idle') {
      speakResponse(lastMessage.content);
    }
  }, [messages]);

  // Update state when loading
  useEffect(() => {
    if (isLoading && state === 'listening') {
      setState('processing');
    }
  }, [isLoading, state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
    };
  }, []);

  const addTranscript = useCallback((role: 'user' | 'assistant', text: string, isFinal: boolean) => {
    const id = `${role}-${Date.now()}`;
    setTranscripts(prev => {
      const existingIdx = prev.findIndex(t => t.role === role && !t.isFinal);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { id, role, text, isFinal };
        return updated;
      }
      return [...prev, { id, role, text, isFinal }];
    });
  }, []);

  const speakResponse = useCallback((text: string) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    setState('speaking');
    addTranscript('assistant', text, true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
      v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Karen') || v.lang.startsWith('en')
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onend = () => {
      setState('listening');
      startListening();
    };
    utterance.onerror = () => {
      setState('listening');
      startListening();
    };

    window.speechSynthesis.speak(utterance);
  }, [addTranscript]);

  const startListening = useCallback(() => {
    if (isMuted) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let accumulatedTranscript = '';
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;

    const clearSilenceTimer = () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    };

    recognition.onstart = () => {
      setState('listening');
      setCurrentTranscript('');
      accumulatedTranscript = '';
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';

      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript + ' ';
        } else {
          interimText += transcript;
        }
      }

      accumulatedTranscript = finalText.trim();
      const displayText = (finalText + interimText).trim();
      setCurrentTranscript(displayText);

      if (displayText) {
        addTranscript('user', displayText, false);
      }

      if (accumulatedTranscript) {
        clearSilenceTimer();
        silenceTimer = setTimeout(() => recognition.stop(), 1800);
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(`Voice error: ${event.error}`);
        setState('error');
      }
      clearSilenceTimer();
    };

    recognition.onend = () => {
      clearSilenceTimer();
      if (accumulatedTranscript.trim()) {
        addTranscript('user', accumulatedTranscript.trim(), true);
        setState('processing');
        sendMessage(accumulatedTranscript.trim());
      } else {
        setTimeout(() => {
          setState(currentState => {
            if (currentState === 'listening') {
              requestAnimationFrame(() => startListening());
            }
            return currentState;
          });
        }, 500);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isMuted, sendMessage, addTranscript]);

  const stopSession = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setState('idle');
    setVolume(0);
  }, []);

  const startSession = useCallback(() => {
    setError(null);
    setTranscripts([]);
    startListening();
  }, [startListening]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (newMuted && recognitionRef.current) {
        recognitionRef.current.stop();
      } else if (!newMuted && state === 'listening') {
        startListening();
      }
      return newMuted;
    });
  }, [state, startListening]);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    stopSession();
    onClose?.();
  }, [stopSession, onClose]);

  const isActive = state === 'listening' || state === 'speaking' || state === 'processing';

  const getStatusText = () => {
    switch (state) {
      case 'idle': return 'Tap to start';
      case 'listening': return isMuted ? 'Muted' : 'Listening...';
      case 'processing': return 'Thinking...';
      case 'speaking': return 'Speaking...';
      case 'error': return 'Something went wrong';
      default: return '';
    }
  };

  // Modal content
  const modalContent = (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: 'linear-gradient(to bottom, #0f172a 0%, #020617 50%, #0f172a 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <m.div
            className={`w-2.5 h-2.5 rounded-full ${
              isActive ? 'bg-emerald-400' : state === 'error' ? 'bg-rose-400' : 'bg-white/30'
            }`}
            animate={state === 'processing' ? { opacity: [0.5, 1, 0.5] } : {}}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          <span className="text-sm font-medium text-white/70">{getStatusText()}</span>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors active:scale-95"
          aria-label="Close voice chat"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 overflow-hidden relative min-h-0">
        {/* Transcripts */}
        {transcripts.length > 0 && (
          <div className="absolute top-0 left-0 right-0 bottom-56 overflow-y-auto px-4 pt-2 pb-4">
            <div className="max-w-md mx-auto space-y-3">
              <AnimatePresence mode="popLayout">
                {transcripts.slice(-6).map((t) => (
                  <TranscriptBubble key={t.id} transcript={t} />
                ))}
              </AnimatePresence>
              <div ref={transcriptsEndRef} />
            </div>
          </div>
        )}

        {/* Orb visualization */}
        <m.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className={transcripts.length > 0 ? 'mt-auto mb-6' : ''}
        >
          <VoiceOrb state={state} volume={volume} />
        </m.div>

        {/* Prompt text */}
        <AnimatePresence>
          {!isActive && transcripts.length === 0 && !error && (
            <m.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 text-white/40 text-sm text-center"
            >
              Talk with your meditation guide
            </m.p>
          )}
        </AnimatePresence>

        {/* Current transcript preview */}
        {state === 'listening' && currentTranscript && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 px-4 py-2 bg-white/5 rounded-xl max-w-xs text-center"
          >
            <p className="text-white/60 text-sm italic">{currentTranscript}</p>
          </m.div>
        )}

        {/* Error display */}
        <AnimatePresence>
          {error && (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 px-5 py-3 bg-rose-500/10 border border-rose-500/25 rounded-xl max-w-sm"
            >
              <p className="text-rose-300 text-sm text-center">{error}</p>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="shrink-0 pb-12 pt-6">
        <div className="flex items-center justify-center gap-6">
          {/* Mute button */}
          <AnimatePresence>
            {isActive && (
              <m.button
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isMuted
                    ? 'bg-rose-500/20 text-rose-400 border-2 border-rose-500/40'
                    : 'bg-white/5 text-white/60 hover:text-white border-2 border-white/10 hover:border-white/20'
                }`}
              >
                {isMuted ? <MicOffIcon /> : <MicIcon />}
              </m.button>
            )}
          </AnimatePresence>

          {/* Main call button */}
          <m.button
            type="button"
            onClick={isActive ? stopSession : startSession}
            disabled={state === 'processing'}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="relative"
          >
            {state === 'processing' && (
              <m.div
                className="absolute inset-0 rounded-full border-2 border-sky-500/50"
                animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.3, repeat: Infinity }}
              />
            )}
            <div
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
                state === 'processing'
                  ? 'bg-sky-500/20 border-2 border-sky-500/50'
                  : isActive
                    ? 'bg-rose-500 border-2 border-rose-400 shadow-lg shadow-rose-500/35'
                    : 'bg-sky-500 border-2 border-sky-500 shadow-lg shadow-sky-500/35 hover:shadow-sky-500/50'
              }`}
            >
              {state === 'processing' ? (
                <m.div
                  className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                />
              ) : isActive ? (
                <EndCallIcon />
              ) : (
                <PhoneIcon />
              )}
            </div>
          </m.button>

          {/* Spacer for symmetry */}
          {isActive && <div className="w-14" />}
        </div>

        {/* Helper text */}
        <p className="text-center text-white/30 text-xs mt-5">
          {isActive
            ? isMuted
              ? 'Microphone muted'
              : state === 'listening'
                ? 'Listening to you...'
                : state === 'speaking'
                  ? 'Guide is speaking'
                  : 'Thinking...'
            : 'Free voice conversation'}
        </p>
      </div>
    </m.div>
  );

  // Not supported view
  if (!isSupported) {
    const notSupportedContent = (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-8"
        style={{ background: 'linear-gradient(to bottom, #0f172a 0%, #020617 50%, #0f172a 100%)' }}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors active:scale-95"
          aria-label="Close"
        >
          <CloseIcon />
        </button>

        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
            <MicOffIcon />
          </div>
          <h2 className="text-xl font-medium text-white mb-3">Voice Not Available</h2>
          <p className="text-sm text-white/50 mb-8 leading-relaxed">
            Your browser doesn't support voice features. Please try Chrome, Firefox, or Safari.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="px-8 py-3 text-sm font-medium text-white bg-white/10 hover:bg-white/15 rounded-full transition-colors border border-white/10"
          >
            Go Back
          </button>
        </div>
      </m.div>
    );

    return typeof document !== 'undefined'
      ? createPortal(notSupportedContent, document.body)
      : null;
  }

  // Render via portal to ensure proper z-index stacking
  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
};

export default VoiceAgent;
