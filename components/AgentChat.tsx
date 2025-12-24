/**
 * AgentChat Component
 *
 * A dedicated conversational chat interface for the INrVO Meditation Agent.
 * Includes inline meditation panel with music, voice, and audio tag controls.
 */

import React, { useState, useRef, useEffect, useCallback, memo, lazy, Suspense } from 'react';
import { useMeditationAgent, type ChatMessage, type AgentAction } from '../src/hooks/useMeditationAgent';
import type { VoiceProfile } from '../types';
import type { BackgroundTrack } from '../constants';
import type { MeditationType } from '../src/lib/agent/knowledgeBase';

// Lazy load MeditationEditor for bundle optimization
const MeditationEditor = lazy(() => import('../src/components/MeditationEditor'));

// ============================================================================
// ICONS
// ============================================================================

const SendIcon = () => (
  <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
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

const SparkleIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
  </svg>
);

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface MessageBubbleProps {
  message: ChatMessage;
  isLast: boolean;
}

const MessageBubble = memo<MessageBubbleProps>(({ message, isLast }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="flex-shrink-0 mr-3 mt-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600
                        flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <SparkleIcon className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      <div
        className={`
          max-w-[85%] rounded-2xl px-4 py-3
          ${isUser
            ? 'bg-gradient-to-br from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/20'
            : 'bg-white/[0.08] text-white/90 border border-white/10'
          }
        `}
      >
        {message.isLoading ? (
          <div className="flex items-center gap-3 py-1">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-cyan-400/70 rounded-full animate-pulse" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
              <span className="w-1.5 h-1.5 bg-cyan-400/70 rounded-full animate-pulse" style={{ animationDelay: '200ms', animationDuration: '1s' }} />
              <span className="w-1.5 h-1.5 bg-cyan-400/70 rounded-full animate-pulse" style={{ animationDelay: '400ms', animationDuration: '1s' }} />
            </div>
            <span className="text-white/40 text-sm">Thinking...</span>
          </div>
        ) : (
          <div className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</div>
        )}

        {message.quote && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="italic text-white/60 text-sm">"{message.quote.quote}"</p>
            <p className="text-cyan-400 text-xs mt-1.5">— {message.quote.teacher}</p>
          </div>
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
}

export const AgentChat: React.FC<AgentChatProps> = ({
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
}) => {
  const {
    messages,
    isLoading,
    isGeneratingMeditation,
    currentMeditation,
    sendMessage,
  } = useMeditationAgent();

  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showMeditationPanel, setShowMeditationPanel] = useState(false);
  const [restoredMeditationScript, setRestoredMeditationScript] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isProcessing = isLoading || isGeneratingMeditation || externalIsGenerating;
  const hasMessages = messages.length > 0;
  const showMicButton = !inputValue.trim() && !isRecording;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showMeditationPanel]);

  // Notify parent when chat has started
  useEffect(() => {
    if (hasMessages && onChatStarted) {
      onChatStarted();
    }
  }, [hasMessages, onChatStarted]);

  // Show meditation panel when meditation is ready
  useEffect(() => {
    if (currentMeditation?.readyForReview && currentMeditation?.script) {
      setShowMeditationPanel(true);
    }
  }, [currentMeditation]);

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
        console.log('Silence detected, auto-stopping recognition');
        recognition.stop();
      }, SILENCE_TIMEOUT);
    };

    recognition.onstart = () => {
      console.log('Speech recognition started');
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
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
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
      console.log('Speech ended (speechend event)');
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
      console.log('Speech recognition ended. Transcript:', accumulatedTranscript);
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
    console.log('Manually stopping voice recording');
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

  return (
    <div className={`flex flex-col h-full min-h-[100dvh] ${className}`}>
      {/* Messages Area - grows from bottom up, above the input */}
      {!showMeditationPanel && hasMessages && (
        <div className="fixed left-0 right-0 bottom-32 top-20 overflow-y-auto px-4 md:px-6 z-40">
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

      {/* Input Area - Always fixed at bottom */}
      {!showMeditationPanel && (
        <div className={`fixed left-0 right-0 bottom-0 px-4 z-50 pb-14 ${hasMessages
          ? 'bg-gradient-to-t from-[#020617] via-[#020617]/95 to-transparent'
          : ''}`}>
        <div className="max-w-3xl mx-auto w-full">
          <form onSubmit={handleSubmit}>
            <div className={`relative flex items-center bg-white/[0.06] border
                          rounded-full px-4 md:px-6 py-2.5
                          transition-all duration-200 shadow-lg shadow-black/10
                          ${isRecording
                            ? 'border-rose-500/50 bg-rose-500/10'
                            : 'border-white/10 focus-within:border-cyan-500/40 focus-within:bg-white/[0.08]'
                          }`}>
              <textarea
                ref={inputRef}
                value={isRecording ? transcribedText : inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isRecording ? "Listening..." : (hasMessages ? "Share more..." : "How are you feeling?")}
                rows={1}
                className={`flex-1 bg-transparent text-base
                         outline-none resize-none py-2
                         ${isRecording ? 'text-white/70 italic' : 'text-white placeholder:text-white/30'}`}
                style={{ maxHeight: '120px', fontSize: '16px' }}
                disabled={isProcessing || isRecording}
                readOnly={isRecording}
              />

              <button
                type={showMicButton || isRecording ? 'button' : 'submit'}
                onClick={showMicButton || isRecording ? handleMicClick : undefined}
                disabled={isProcessing && !isRecording}
                className={`
                  flex-shrink-0 ml-2
                  flex items-center justify-center transition-all duration-200
                  ${isProcessing && !isRecording
                    ? 'h-10 w-10 rounded-full bg-cyan-500/50 cursor-not-allowed'
                    : isRecording
                      ? 'h-10 w-10 rounded-full bg-rose-500 hover:bg-rose-400 active:scale-95 text-white animate-pulse'
                      : inputValue.trim()
                        ? 'h-10 w-10 rounded-full bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-white'
                        : 'p-2 hover:opacity-80 active:scale-95'
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
        <Suspense fallback={
          <div className="fixed inset-0 z-[60] bg-[#020617] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
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
      )}
    </div>
  );
};

export default AgentChat;
