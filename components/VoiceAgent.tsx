/**
 * VoiceAgent Component
 *
 * Minimalist voice conversation interface for INrVO Meditation.
 * Zen-like aesthetic with breathing animations and calming visuals.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  getVoiceSession,
  isVoiceSessionSupported,
  type VoiceSessionState,
  type TranscriptEntry,
} from '../src/lib/voiceSession';

// ============================================================================
// MINIMAL ICONS
// ============================================================================

const PhoneIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const EndCallIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
  </svg>
);

const MicIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const MicOffIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const CloseIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ============================================================================
// SHOOTING STARS - Central Visual Element
// ============================================================================

interface ShootingStarProps {
  delay: number;
  duration: number;
  startX: number;
  startY: number;
  isActive: boolean;
}

const ShootingStar: React.FC<ShootingStarProps> = ({
  delay,
  duration,
  startX,
  startY,
  isActive,
}) => {
  const angle = -30 + Math.random() * 20; // Slightly varied angles
  const length = 60 + Math.random() * 40;

  return (
    <m.div
      className="absolute"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        width: `${length}px`,
        height: '2px',
        background: `linear-gradient(90deg, transparent, rgba(34,211,238,${isActive ? 0.8 : 0.4}), rgba(255,255,255,${isActive ? 0.9 : 0.5}))`,
        borderRadius: '2px',
        transform: `rotate(${angle}deg)`,
        boxShadow: isActive
          ? '0 0 6px rgba(34,211,238,0.6), 0 0 12px rgba(34,211,238,0.3)'
          : '0 0 4px rgba(255,255,255,0.3)',
      }}
      initial={{ opacity: 0, x: 0, y: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        x: [0, length * 2],
        y: [0, length * 0.8],
      }}
      transition={{
        duration: duration,
        delay: delay,
        repeat: Infinity,
        repeatDelay: Math.random() * 3 + 2,
        ease: 'easeOut',
      }}
    />
  );
};

interface ShootingStarsFieldProps {
  isActive: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  volume: number;
}

const ShootingStarsField: React.FC<ShootingStarsFieldProps> = ({
  isActive,
  isSpeaking,
  isListening,
  volume,
}) => {
  // Generate stars with varied positions and timings
  const stars = [
    { delay: 0, duration: 1.2, startX: 10, startY: 20 },
    { delay: 0.8, duration: 1.0, startX: 70, startY: 10 },
    { delay: 1.5, duration: 1.4, startX: 30, startY: 5 },
    { delay: 2.2, duration: 1.1, startX: 85, startY: 30 },
    { delay: 3.0, duration: 1.3, startX: 50, startY: 15 },
    { delay: 3.8, duration: 1.0, startX: 15, startY: 35 },
    { delay: 4.5, duration: 1.2, startX: 60, startY: 25 },
    { delay: 5.2, duration: 1.1, startX: 40, startY: 8 },
  ];

  // Add more stars when active
  const activeStars = isActive ? [
    { delay: 0.3, duration: 0.8, startX: 25, startY: 12 },
    { delay: 1.0, duration: 0.9, startX: 75, startY: 22 },
    { delay: 1.8, duration: 0.7, startX: 45, startY: 18 },
    { delay: 2.5, duration: 0.85, startX: 90, startY: 15 },
    { delay: 3.3, duration: 0.75, startX: 20, startY: 28 },
    { delay: 4.0, duration: 0.9, startX: 55, startY: 5 },
  ] : [];

  return (
    <div className="relative w-80 h-48 flex items-center justify-center overflow-hidden">
      {/* Shooting stars */}
      {[...stars, ...activeStars].map((star, i) => (
        <ShootingStar
          key={i}
          delay={star.delay}
          duration={isSpeaking ? star.duration * 0.7 : star.duration}
          startX={star.startX}
          startY={star.startY}
          isActive={isActive}
        />
      ))}

      {/* Central voice indicator */}
      <m.div
        className="relative z-10 flex items-center justify-center gap-1"
        animate={{
          scale: isListening ? 1 + volume * 0.2 : 1,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Subtle voice bars */}
        {[...Array(5)].map((_, i) => (
          <m.div
            key={i}
            className="w-0.5 rounded-full"
            style={{
              background: isActive
                ? 'linear-gradient(to top, rgba(34,211,238,0.3), rgba(34,211,238,0.8))'
                : 'rgba(255,255,255,0.2)',
            }}
            animate={{
              height: isListening
                ? `${8 + volume * 24}px`
                : isSpeaking
                  ? `${6 + Math.sin(Date.now() / 150 + i * 0.8) * 10}px`
                  : '3px',
              opacity: isActive ? [0.5, 1, 0.5] : 0.3,
            }}
            transition={{
              height: { duration: 0.1 },
              opacity: { duration: 1.5, repeat: Infinity },
            }}
          />
        ))}
      </m.div>

    </div>
  );
};

// ============================================================================
// TRANSCRIPT DISPLAY
// ============================================================================

interface TranscriptDisplayProps {
  transcripts: TranscriptEntry[];
  transcriptsEndRef: React.RefObject<HTMLDivElement>;
}

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  transcripts,
  transcriptsEndRef,
}) => {
  if (transcripts.length === 0) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto space-y-3"
    >
      <AnimatePresence mode="popLayout">
        {transcripts.slice(-4).map((entry) => (
          <m.div
            key={entry.id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: entry.isFinal ? 1 : 0.6, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                ${entry.role === 'user'
                  ? 'bg-cyan-500/10 text-cyan-50 border border-cyan-500/20'
                  : 'bg-white/[0.03] text-white/80 border border-white/[0.06]'
                }
              `}
            >
              {entry.text}
            </div>
          </m.div>
        ))}
      </AnimatePresence>
      <div ref={transcriptsEndRef} />
    </m.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface VoiceAgentProps {
  onClose?: () => void;
  className?: string;
}

export const VoiceAgent: React.FC<VoiceAgentProps> = ({
  onClose,
  className = '',
}) => {
  const [sessionState, setSessionState] = useState<VoiceSessionState>('idle');
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const transcriptsEndRef = useRef<HTMLDivElement>(null);
  const voiceSession = useRef(getVoiceSession());

  // Check browser support
  useEffect(() => {
    setIsSupported(isVoiceSessionSupported());
  }, []);

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Handlers
  const handleStateChange = useCallback((state: VoiceSessionState) => {
    setSessionState(state);
  }, []);

  const handleTranscript = useCallback((entry: TranscriptEntry) => {
    setTranscripts(prev => {
      const existingIndex = prev.findIndex(t => t.role === entry.role && !t.isFinal);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = entry;
        return updated;
      }
      return [...prev, entry];
    });
  }, []);

  const handleVolumeChange = useCallback((vol: number) => {
    setVolume(vol);
  }, []);

  const handleError = useCallback((err: Error) => {
    console.error('[VoiceAgent] Error:', err);
    setError(err.message);
  }, []);

  const startSession = useCallback(async () => {
    setError(null);
    setTranscripts([]);
    try {
      await voiceSession.current.start({
        onStateChange: handleStateChange,
        onTranscript: handleTranscript,
        onVolumeChange: handleVolumeChange,
        onError: handleError,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start voice session');
    }
  }, [handleStateChange, handleTranscript, handleVolumeChange, handleError]);

  const stopSession = useCallback(() => {
    voiceSession.current.stop();
    setVolume(0);
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = voiceSession.current.toggleMute();
    setIsMuted(newMuted);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      voiceSession.current.stop();
    };
  }, []);

  // State helpers
  const isConnected = sessionState === 'connected' || sessionState === 'listening' || sessionState === 'agent-speaking';
  const isConnecting = sessionState === 'connecting' || sessionState === 'requesting-mic';
  const isListening = sessionState === 'listening';
  const isSpeaking = sessionState === 'agent-speaking';

  // Status text
  const getStatusText = () => {
    switch (sessionState) {
      case 'idle': return 'Tap to begin';
      case 'requesting-mic': return 'Allowing microphone...';
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Connected';
      case 'listening': return 'Listening...';
      case 'agent-speaking': return 'Speaking...';
      case 'error': return 'Connection error';
      case 'disconnected': return 'Ended';
      default: return '';
    }
  };

  // Not supported view
  if (!isSupported) {
    return (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-[70] bg-[#030712] flex flex-col items-center justify-center p-8 ${className}`}
      >
        <m.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
            <MicOffIcon className="w-7 h-7 text-white/40" />
          </div>
          <h2 className="text-lg font-light text-white/90 mb-2">Voice Not Available</h2>
          <p className="text-sm text-white/40 mb-8 leading-relaxed">
            Your browser doesn't support voice features. Please try Chrome, Firefox, or Safari.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all duration-300"
          >
            Go Back
          </button>
        </m.div>
      </m.div>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[70] bg-[#030712] flex flex-col ${className}`}
    >
      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(34,211,238,0.03) 0%, transparent 50%)',
        }}
      />

      {/* Close button - minimal */}
      <m.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full text-white/30 hover:text-white/60 hover:bg-white/5 transition-all duration-300 z-10"
      >
        <CloseIcon className="w-5 h-5" />
      </m.button>

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
        {/* Status indicator */}
        <m.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute top-8 left-1/2 -translate-x-1/2"
        >
          <div className="flex items-center gap-2">
            <m.div
              className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-cyan-400' : 'bg-white/20'}`}
              animate={isConnected ? { scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-xs text-white/40 tracking-wide">{getStatusText()}</span>
          </div>
        </m.div>

        {/* Transcripts - above the orb when active */}
        {transcripts.length > 0 && (
          <div className="absolute top-24 left-0 right-0 bottom-48 overflow-y-auto px-6 py-4">
            <TranscriptDisplay
              transcripts={transcripts}
              transcriptsEndRef={transcriptsEndRef as React.RefObject<HTMLDivElement>}
            />
          </div>
        )}

        {/* Shooting stars field */}
        <m.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className={transcripts.length > 0 ? 'mt-auto mb-8' : ''}
        >
          <ShootingStarsField
            isActive={isConnected}
            isSpeaking={isSpeaking}
            isListening={isListening && !isMuted}
            volume={volume}
          />
        </m.div>

        {/* Idle state message */}
        <AnimatePresence>
          {!isConnected && !isConnecting && transcripts.length === 0 && (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-8 text-center"
            >
              <p className="text-white/40 text-sm font-light">
                Speak with your meditation guide
              </p>
            </m.div>
          )}
        </AnimatePresence>

        {/* Error display */}
        <AnimatePresence>
          {error && (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl max-w-sm"
            >
              <p className="text-rose-300/80 text-sm text-center">{error}</p>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex-shrink-0 pb-12 pt-6"
      >
        <div className="flex items-center justify-center gap-6">
          {/* Mute button - only when connected */}
          <AnimatePresence>
            {isConnected && (
              <m.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={toggleMute}
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                  ${isMuted
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-white/5 text-white/50 hover:text-white/70 border border-white/10 hover:border-white/20'
                  }
                `}
              >
                {isMuted ? (
                  <MicOffIcon className="w-5 h-5" />
                ) : (
                  <MicIcon className="w-5 h-5" />
                )}
              </m.button>
            )}
          </AnimatePresence>

          {/* Main call button */}
          <m.button
            onClick={isConnected ? stopSession : startSession}
            disabled={isConnecting}
            className="relative"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
  
            {/* Button */}
            <div
              className={`
                relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500
                ${isConnecting
                  ? 'bg-cyan-500/20 border border-cyan-500/30'
                  : isConnected
                    ? 'bg-rose-500/90 border border-rose-400/50 shadow-lg shadow-rose-500/20'
                    : 'bg-cyan-500/90 border border-cyan-400/50 shadow-lg shadow-cyan-500/20'
                }
              `}
            >
              {isConnecting ? (
                <m.div
                  className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              ) : isConnected ? (
                <EndCallIcon className="w-6 h-6 text-white" />
              ) : (
                <PhoneIcon className="w-6 h-6 text-white" />
              )}
            </div>
          </m.button>

          {/* Spacer for symmetry when mute is visible */}
          {isConnected && <div className="w-12" />}
        </div>

        {/* Subtle hint text */}
        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-white/20 text-xs mt-6 font-light"
        >
          {isConnected
            ? isMuted
              ? 'Tap mic to unmute'
              : 'Speak naturally'
            : 'Voice conversation'}
        </m.p>
      </m.div>
    </m.div>
  );
};

export default VoiceAgent;
