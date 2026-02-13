/**
 * AgentChat Component
 *
 * A dedicated conversational chat interface for the Innrvo Meditation Agent.
 * Includes inline meditation panel with music, voice, and audio tag controls.
 * Now supports real-time voice conversation via VoiceAgent component.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo, memo, lazy, Suspense } from 'react';
import { useMeditationAgent, type ChatMessage, type AgentAction } from '../src/hooks/useMeditationAgent';
import type { VoiceProfile } from '../types';
import type { BackgroundTrack } from '../constants';
import type { MeditationType } from '../src/lib/agent/knowledgeBase';

// Rotating placeholders for variety
const PLACEHOLDERS = [
  "How are you feeling?",
  "What's on your mind?",
  "What do you need right now?",
  "How can I help today?",
  "What would feel good?",
];

// Get a placeholder based on the current session (changes daily)
const getSessionPlaceholder = (): string => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return PLACEHOLDERS[dayOfYear % PLACEHOLDERS.length]!;
};

// Lazy load MeditationEditor and VoiceAgent for bundle optimization
const MeditationEditor = lazy(() => import('../src/components/MeditationEditor'));
const VoiceAgent = lazy(() => import('./VoiceAgent'));

// Error boundary for handling chunk load failures
import ErrorBoundary from './ErrorBoundary';

// ============================================================================
// ICONS
// ============================================================================

const SendIcon = () => (
  <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const WavesIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
    <path d="M6 9v6" stroke="#38bdf8" strokeWidth="3" strokeOpacity="0.8" />
    <path d="M12 4v16" stroke="#3b82f6" strokeWidth="3" />
    <path d="M18 8v8" stroke="#38bdf8" strokeWidth="3" strokeOpacity="0.8" />
  </svg>
);

const WaveIcon = () => (
  <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5">
    <path d="M6 9v6M12 5v14M18 8v8" strokeLinecap="round" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

// Chronos Engine import for agent avatar
import { ChronosEngine } from '@/components/ui/chronos-engine';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface MessageBubbleProps {
  message: ChatMessage;
  isLast: boolean;
}

const MessageBubble = memo<MessageBubbleProps>(({ message, isLast }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!message.content || message.isLoading) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [message.content, message.isLoading]);

  return (
    <div className={`group flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="flex-shrink-0 mr-3 mt-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500/20 to-sky-500/20
                        flex items-center justify-center shadow-lg shadow-sky-500/20 overflow-hidden">
            <ChronosEngine variant="avatar" showSparks={false} />
          </div>
        </div>
      )}

      <div className="relative max-w-[85%]">
        <div
          className={`
            rounded-2xl px-4 py-3
            ${isUser
              ? 'bg-gradient-to-br from-blue-600 to-sky-600 text-white shadow-lg shadow-sky-500/20'
              : 'bg-white/[0.08] text-white/90 border border-white/10'
            }
          `}
        >
          {message.isLoading ? (
            <span className="text-amber-400/60 text-sm">Thinking...</span>
          ) : (
            <div className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</div>
          )}

          {message.quote && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="italic text-white/60 text-sm">"{message.quote.quote}"</p>
              <p className="text-sky-500 text-xs mt-1.5">— {message.quote.teacher}</p>
            </div>
          )}
        </div>

        {/* Copy button - appears on hover */}
        {!message.isLoading && message.content && (
          <button
            onClick={handleCopy}
            className={`
              absolute -bottom-1 ${isUser ? 'left-0 -translate-x-full -ml-1' : 'right-0 translate-x-full ml-1'}
              opacity-0 group-hover:opacity-100 focus:opacity-100
              p-1.5 rounded-lg transition-all duration-200
              ${copied
                ? 'bg-green-500/20 text-green-400'
                : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70'
              }
            `}
            title={copied ? 'Copied!' : 'Copy message'}
            aria-label={copied ? 'Copied!' : 'Copy message'}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        )}
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface AgentChatProps {
  onMeditationReady?: (script: string, type: MeditationType, prompt: string) => void;
  onGenerateAudio?: (script: string, selectedTags: string[]) => void;
  onRequestVoiceSelection?: () => void;
  onRequestMusicSelection?: () => void;
  onChatStarted?: () => void;
  onMeditationPanelOpen?: () => void;
  selectedVoice?: VoiceProfile | null;
  selectedMusic?: BackgroundTrack | null;
  availableMusic?: BackgroundTrack[];
  availableTags?: { id: string; name: string; color: string; tags: { id: string; label: string }[] }[];
  onMusicChange?: (track: BackgroundTrack) => void;
  isGenerating?: boolean;
  isGeneratingAudio?: boolean;
  className?: string;
  // Restored meditation from history
  restoredScript?: string | null;
  onRestoredScriptClear?: () => void;
  // Resume a previous conversation
  resumeConversationId?: string | null;
  onConversationResumed?: () => void;
}

// Wrap AgentChat with memo for performance - prevents unnecessary re-renders
// when parent state changes but AgentChat props haven't changed
const AgentChatComponent: React.FC<AgentChatProps> = ({
  onMeditationReady,
  onGenerateAudio,
  onRequestVoiceSelection,
  onChatStarted,
  onMeditationPanelOpen,
  selectedVoice,
  selectedMusic,
  availableMusic = [],
  availableTags = [],
  onMusicChange,
  isGenerating: externalIsGenerating,
  isGeneratingAudio = false,
  className = '',
  restoredScript,
  onRestoredScriptClear,
  resumeConversationId,
  onConversationResumed,
}) => {
  const {
    messages,
    isLoading,
    isGeneratingMeditation,
    currentMeditation,
    sendMessage,
  } = useMeditationAgent({ resumeConversationId });

  // Get placeholder - rotates daily for variety
  const placeholder = useMemo(() => getSessionPlaceholder(), []);

  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showMeditationPanel, setShowMeditationPanel] = useState(false);
  const [restoredMeditationScript, setRestoredMeditationScript] = useState<string | null>(null);
  const [showVoiceAgent, setShowVoiceAgent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Memoize derived state to prevent recalculation on every render
  const { isProcessing, hasMessages, showMicButton } = useMemo(() => ({
    isProcessing: isLoading || isGeneratingMeditation || externalIsGenerating,
    hasMessages: messages.length > 0,
    showMicButton: !inputValue.trim() && !isRecording,
  }), [isLoading, isGeneratingMeditation, externalIsGenerating, messages.length, inputValue, isRecording]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showMeditationPanel]);

  // Notify parent when chat has started (includes resumed conversations)
  useEffect(() => {
    if (hasMessages && onChatStarted) {
      onChatStarted();
    }
  }, [hasMessages, onChatStarted]);

  // Notify parent when conversation is resumed
  useEffect(() => {
    if (resumeConversationId && hasMessages && onConversationResumed) {
      onConversationResumed();
    }
  }, [resumeConversationId, hasMessages, onConversationResumed]);

  // Show meditation panel when meditation is ready
  // Mobile Safari fix: Use explicit checks and logging to ensure panel opens
  useEffect(() => {
    const hasScript = currentMeditation?.script && currentMeditation.script.length > 0;
    const isReady = currentMeditation?.readyForReview === true;

    if (hasScript && isReady) {
      // Use setTimeout to ensure state update isn't batched away on mobile
      setTimeout(() => {
        setShowMeditationPanel(true);
      }, 0);
    }
  }, [currentMeditation?.readyForReview, currentMeditation?.script]);

  // Notify parent when meditation panel opens (for sidebar auto-close)
  useEffect(() => {
    if (showMeditationPanel && onMeditationPanelOpen) {
      onMeditationPanelOpen();
    }
  }, [showMeditationPanel, onMeditationPanelOpen]);

  // Handle restored meditation from history
  useEffect(() => {
    if (restoredScript) {
      setRestoredMeditationScript(restoredScript);
      setShowMeditationPanel(true);
      // Clear the prop after processing
      onRestoredScriptClear?.();
    }
  }, [restoredScript, onRestoredScriptClear]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  // Voice recording handlers
  // Web Speech API with continuous:true doesn't auto-stop after silence.
  // We implement our own silence detection by starting a 1.5s timeout
  // after each final transcript. If the user continues speaking, the
  // timeout resets. When the timeout expires, we auto-stop recognition
  // and send the message. Users can also manually stop at any time.
  const SILENCE_TIMEOUT = 1500; // 1.5 seconds after last final transcript

  const startVoiceRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    let accumulatedTranscript = '';
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;

    // Helper to clear and reset silence timer
    const resetSilenceTimer = () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    };

    // Helper to start auto-stop countdown after silence
    const startSilenceTimer = () => {
      resetSilenceTimer();
      silenceTimer = setTimeout(() => {
        recognition.stop();
      }, SILENCE_TIMEOUT);
    };

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscribedText('');
      accumulatedTranscript = '';
      resetSilenceTimer();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      // Build transcript from ALL results (not just new ones)
      // The results array contains the complete history
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i]![0]!.transcript;
        if (event.results[i]!.isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript + ' ';
        }
      }

      finalTranscript = finalTranscript.trim();
      interimTranscript = interimTranscript.trim();

      // Update accumulated transcript to be the complete final transcript
      accumulatedTranscript = finalTranscript;

      // Display final + interim together for real-time feedback
      const displayText = (finalTranscript + ' ' + interimTranscript).trim();
      setTranscribedText(displayText);

      // Start silence timer when we have final content
      if (finalTranscript) {
        startSilenceTimer();
      }
    };

    // Additional signal for speech ending
    recognition.onspeechend = () => {
      // Start timer if we have accumulated content
      if (accumulatedTranscript.trim()) {
        startSilenceTimer();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error, event.message);

      // Handle specific errors with appropriate user feedback
      switch (event.error) {
        case 'no-speech':
          console.warn('No speech detected');
          break;
        case 'audio-capture':
          console.error('Microphone not accessible - check permissions');
          break;
        case 'not-allowed':
          console.error('Microphone permission denied');
          break;
        case 'network':
          console.error('Network error during speech recognition');
          break;
        case 'aborted':
          console.warn('Speech recognition aborted');
          break;
        default:
          console.error('Unknown speech recognition error');
      }

      resetSilenceTimer();
      setIsRecording(false);
    };

    recognition.onend = () => {
      resetSilenceTimer();
      setIsRecording(false);

      if (accumulatedTranscript.trim()) {
        sendMessage(accumulatedTranscript.trim());
        setTranscribedText('');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [sendMessage]);

  const stopVoiceRecording = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const handleMicClick = useCallback(() => {
    isRecording ? stopVoiceRecording() : startVoiceRecording();
  }, [isRecording, startVoiceRecording, stopVoiceRecording]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    // Hide meditation panel when starting new conversation
    setShowMeditationPanel(false);
    sendMessage(inputValue.trim());
    setInputValue('');

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [inputValue, isProcessing, sendMessage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleTagToggle = useCallback((tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  }, []);

  const handleGenerate = useCallback((editedScript: string) => {
    if (editedScript && onGenerateAudio) {
      onGenerateAudio(editedScript, selectedTags);
      // Don't close the panel here - let it show the loading state
      // Panel will be replaced by InlinePlayer when audio is ready
    }
  }, [onGenerateAudio, selectedTags]);

  const handleCloseMeditationPanel = useCallback(() => {
    setShowMeditationPanel(false);
    setRestoredMeditationScript(null);
  }, []);

  const handleOpenVoiceAgent = useCallback(() => {
    setShowVoiceAgent(true);
  }, []);

  const handleCloseVoiceAgent = useCallback(() => {
    setShowVoiceAgent(false);
  }, []);

  return (
    <div data-onboarding="agent-chat" className={`flex flex-col h-full min-h-[100dvh] ${className}`}>
      {/* Messages Area - grows from bottom up, above the input */}
      {!showMeditationPanel && hasMessages && (
        <div className="fixed left-0 right-0 bottom-[4.5rem] top-16 md:bottom-32 md:top-20 overflow-y-auto px-4 md:px-6 z-40">
          <div className="max-w-xl mx-auto h-full flex flex-col justify-end">
            {/* Message List */}
            <div className="space-y-1">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isLast={index === messages.length - 1 && !showMeditationPanel}
                />
              ))}
            </div>

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}


      {/* Input Area - Always fixed at bottom with safe-area support */}
      {!showMeditationPanel && (
        <div
          className={`fixed left-0 right-0 bottom-0 px-4 z-50 ${hasMessages
            ? 'bg-gradient-to-t from-[#020617] via-[#020617]/95 to-transparent'
            : ''}`}
          style={{ paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))' }}
        >
        <div className="max-w-3xl mx-auto w-full">
          <form onSubmit={handleSubmit}>
            <div
              className={`relative flex items-center bg-white/[0.03] border
                          rounded-full px-4 md:px-6 py-2.5
                          transition-all duration-300
                          ${isRecording
                            ? 'border-sky-500/60 bg-sky-500/5'
                            : 'border-sky-500/30 focus-within:border-sky-500/50 focus-within:bg-white/[0.05]'
                          }`}
              style={{
                boxShadow: isRecording
                  ? '0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.15), 0 0 60px rgba(59, 130, 246, 0.1)'
                  : '0 0 20px rgba(59, 130, 246, 0.15), 0 0 40px rgba(59, 130, 246, 0.08), 0 0 2px rgba(96, 165, 250, 0.3)'
              }}
            >
              {/* Voice Call Button - 44px touch target for mobile */}
              <button
                type="button"
                data-onboarding="voice-toggle"
                onClick={handleOpenVoiceAgent}
                disabled={isProcessing || isRecording}
                className="flex-shrink-0 w-11 h-11 mr-1 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-sky-500/70 hover:text-sky-500 disabled:opacity-50 touch-manipulation"
                title="Start voice chat"
                aria-label="Start voice conversation"
              >
                <PhoneIcon />
              </button>

              <textarea
                ref={inputRef}
                value={isRecording ? transcribedText : inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isRecording ? "Listening..." : (hasMessages ? "Share more..." : placeholder)}
                rows={1}
                className={`flex-1 bg-transparent text-base
                         outline-none resize-none py-2
                         ${isRecording ? 'text-white/70 italic' : 'text-white placeholder:text-white/30'}`}
                style={{ maxHeight: '120px', fontSize: '16px' }}
                disabled={isProcessing || isRecording}
                readOnly={isRecording}
              />

              <button
                type="button"
                onClick={() => {
                  // Direct action based on current state - no preventDefault needed for type="button"
                  if (showMicButton || isRecording) {
                    handleMicClick();
                  } else {
                    handleSubmit();
                  }
                }}
                // Explicit touch handler for mobile - ensures tap is captured even when keyboard dismisses
                onTouchEnd={(e) => {
                  // Only handle if this is a tap (not a scroll/swipe)
                  if (e.cancelable) {
                    e.preventDefault(); // Prevent ghost click
                    if (showMicButton || isRecording) {
                      handleMicClick();
                    } else {
                      handleSubmit();
                    }
                  }
                }}
                disabled={isProcessing && !isRecording}
                className={`
                  flex-shrink-0 ml-2 touch-manipulation
                  flex items-center justify-center transition-all duration-200
                  h-11 w-11 min-w-[44px] min-h-[44px] rounded-full
                  ${isProcessing && !isRecording
                    ? 'bg-sky-500/50 cursor-not-allowed'
                    : isRecording
                      ? 'bg-sky-500/90 hover:bg-sky-500 active:scale-95 text-white'
                      : inputValue.trim()
                        ? 'bg-sky-500 hover:bg-sky-500 active:scale-95 text-white'
                        : 'bg-transparent hover:bg-white/10 active:scale-95 text-sky-500/70 hover:text-sky-500'
                  }
                `}
              >
                {isProcessing && !isRecording ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                ) : isRecording ? (
                  <WaveIcon />
                ) : inputValue.trim() ? (
                  <SendIcon />
                ) : (
                  <WavesIcon />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

      {/* Meditation Editor - Unified editing experience */}
      {showMeditationPanel && (currentMeditation?.script || restoredMeditationScript) && (
        <ErrorBoundary>
          <Suspense fallback={
            <div className="fixed inset-0 z-[60] bg-[#020617] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
            </div>
          }>
            <MeditationEditor
              script={currentMeditation?.script || restoredMeditationScript || ''}
              meditationType={currentMeditation?.meditationType || 'general'}
              selectedVoice={selectedVoice || null}
              selectedMusic={selectedMusic || null}
              selectedTags={selectedTags}
              availableMusic={availableMusic}
              availableTags={availableTags}
              onVoiceSelect={onRequestVoiceSelection || (() => {})}
              onMusicSelect={onMusicChange || (() => {})}
              onTagToggle={handleTagToggle}
              onGenerate={handleGenerate}
              onClose={handleCloseMeditationPanel}
              isGenerating={isGeneratingAudio}
              source="agent"
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Voice Agent - Full-screen real-time voice conversation */}
      {showVoiceAgent && (
        <ErrorBoundary>
          <Suspense fallback={
            <div className="fixed inset-0 z-[70] bg-[#020617] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
            </div>
          }>
            <VoiceAgent onClose={handleCloseVoiceAgent} />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const AgentChat = memo(AgentChatComponent);
AgentChat.displayName = 'AgentChat';

export default AgentChat;
