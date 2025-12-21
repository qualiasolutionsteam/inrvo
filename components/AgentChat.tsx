/**
 * AgentChat Component
 *
 * A dedicated conversational chat interface for the INrVO Meditation Agent.
 * Includes inline meditation panel with music, voice, and audio tag controls.
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useMeditationAgent, type ChatMessage, type AgentAction } from '../src/hooks/useMeditationAgent';
import type { VoiceProfile, BackgroundTrack } from '../types';
import type { MeditationType } from '../src/lib/agent/knowledgeBase';

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
    <path d="M2 12h0" stroke="#818cf8" strokeWidth="2.5" strokeOpacity="0.5" />
    <path d="M5 9v6" stroke="#818cf8" strokeWidth="2.5" strokeOpacity="0.6" />
    <path d="M8 7v10" stroke="#818cf8" strokeWidth="2.5" strokeOpacity="0.8" />
    <path d="M11 4v16" stroke="#9333ea" strokeWidth="2.5" />
    <path d="M14 6v12" stroke="#a855f7" strokeWidth="2.5" strokeOpacity="0.9" />
    <path d="M17 8v8" stroke="#c084fc" strokeWidth="2.5" strokeOpacity="0.7" />
    <path d="M20 10v4" stroke="#c084fc" strokeWidth="2.5" strokeOpacity="0.5" />
    <path d="M23 12h0" stroke="#c084fc" strokeWidth="2.5" strokeOpacity="0.4" />
  </svg>
);

const WaveIcon = () => (
  <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 12h2M6 8v8M10 5v14M14 8v8M18 10v4M22 12h0" strokeLinecap="round" />
  </svg>
);

const SparkleIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
  </svg>
);

const MusicIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const VoiceIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
    <path d="M19 10v2a7 7 0 01-14 0v-2" />
    <path d="M12 19v4M8 23h8" />
  </svg>
);

const TagIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <circle cx="7" cy="7" r="1" fill="currentColor" />
  </svg>
);

const PlayIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const ChevronIcon = ({ className = "w-4 h-4", direction = "down" }: { className?: string; direction?: "up" | "down" }) => (
  <svg className={`${className} transition-transform ${direction === "up" ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const CheckIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5" />
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
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600
                        flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <SparkleIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
        </div>
      )}

      <div
        className={`
          max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3
          ${isUser
            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/20'
            : 'bg-white/[0.06] backdrop-blur-sm text-white/90 border border-white/10'
          }
          ${isLast && !message.isLoading ? 'animate-in fade-in slide-in-from-bottom-2 duration-300' : ''}
        `}
      >
        {message.isLoading ? (
          <div className="flex items-center gap-3 py-1">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-white/50 text-sm">Contemplating...</span>
          </div>
        ) : (
          <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{message.content}</div>
        )}

        {message.quote && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="italic text-white/60 text-sm">"{message.quote.quote}"</p>
            <p className="text-indigo-400 text-xs mt-1.5">— {message.quote.teacher}</p>
          </div>
        )}
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

// ============================================================================
// INLINE MEDITATION PANEL
// ============================================================================

interface MeditationPanelProps {
  script: string;
  meditationType: MeditationType;
  selectedVoice: VoiceProfile | null;
  selectedMusic: BackgroundTrack | null;
  selectedTags: string[];
  availableMusic: BackgroundTrack[];
  availableTags: { id: string; name: string; color: string; tags: { id: string; label: string }[] }[];
  onVoiceSelect: () => void;
  onMusicSelect: (track: BackgroundTrack) => void;
  onTagToggle: (tagId: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

const MeditationPanel = memo<MeditationPanelProps>(({
  script,
  meditationType,
  selectedVoice,
  selectedMusic,
  selectedTags,
  availableMusic,
  availableTags,
  onVoiceSelect,
  onMusicSelect,
  onTagToggle,
  onGenerate,
  isGenerating,
}) => {
  const [showMusic, setShowMusic] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [editedScript, setEditedScript] = useState(script);

  // Calculate stats
  const wordCount = editedScript.replace(/\[.*?\]/g, '').split(/\s+/).filter(Boolean).length;
  const estimatedDuration = Math.ceil(wordCount / 100); // ~100 words per minute for meditation

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <CheckIcon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-white font-medium text-sm">Your meditation is ready</h3>
          <p className="text-white/50 text-xs">{wordCount} words · ~{estimatedDuration} min</p>
        </div>
      </div>

      {/* Script Preview */}
      <div className="bg-white/[0.03] rounded-2xl border border-white/10 p-4 mb-4 max-h-48 overflow-y-auto">
        <textarea
          value={editedScript}
          onChange={(e) => setEditedScript(e.target.value)}
          className="w-full bg-transparent text-white/80 text-sm leading-relaxed resize-none outline-none min-h-[120px]"
          placeholder="Your meditation script..."
        />
      </div>

      {/* Smart Controls */}
      <div className="space-y-2 mb-4">
        {/* Voice Selection */}
        <button
          onClick={onVoiceSelect}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedVoice ? 'bg-indigo-500/20' : 'bg-white/10'}`}>
              <VoiceIcon className={`w-4 h-4 ${selectedVoice ? 'text-indigo-400' : 'text-white/50'}`} />
            </div>
            <div className="text-left">
              <p className="text-white/90 text-sm font-medium">
                {selectedVoice ? selectedVoice.name : 'Select Voice'}
              </p>
              {!selectedVoice && <p className="text-white/40 text-xs">Required to generate</p>}
            </div>
          </div>
          <ChevronIcon className="w-4 h-4 text-white/40 group-hover:text-white/60 -rotate-90" />
        </button>

        {/* Music Selection */}
        <div className="rounded-xl bg-white/[0.04] border border-white/10 overflow-hidden">
          <button
            onClick={() => setShowMusic(!showMusic)}
            className="w-full flex items-center justify-between p-3 hover:bg-white/[0.04] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedMusic && selectedMusic.id !== 'none' ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
                <MusicIcon className={`w-4 h-4 ${selectedMusic && selectedMusic.id !== 'none' ? 'text-emerald-400' : 'text-white/50'}`} />
              </div>
              <div className="text-left">
                <p className="text-white/90 text-sm font-medium">
                  {selectedMusic ? selectedMusic.name : 'No Music'}
                </p>
                <p className="text-white/40 text-xs">Background ambience</p>
              </div>
            </div>
            <ChevronIcon className="w-4 h-4 text-white/40" direction={showMusic ? "up" : "down"} />
          </button>

          {showMusic && (
            <div className="p-3 pt-0 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {availableMusic.slice(0, 8).map((track) => (
                <button
                  key={track.id}
                  onClick={() => onMusicSelect(track)}
                  className={`p-2 rounded-lg text-left text-xs transition-all ${
                    selectedMusic?.id === track.id
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/70 border border-transparent'
                  }`}
                >
                  {track.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Audio Tags */}
        <div className="rounded-xl bg-white/[0.04] border border-white/10 overflow-hidden">
          <button
            onClick={() => setShowTags(!showTags)}
            className="w-full flex items-center justify-between p-3 hover:bg-white/[0.04] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedTags.length > 0 ? 'bg-violet-500/20' : 'bg-white/10'}`}>
                <TagIcon className={`w-4 h-4 ${selectedTags.length > 0 ? 'text-violet-400' : 'text-white/50'}`} />
              </div>
              <div className="text-left">
                <p className="text-white/90 text-sm font-medium">
                  {selectedTags.length > 0 ? `${selectedTags.length} tags selected` : 'Audio Tags'}
                </p>
                <p className="text-white/40 text-xs">Pauses, breathing cues</p>
              </div>
            </div>
            <ChevronIcon className="w-4 h-4 text-white/40" direction={showTags ? "up" : "down"} />
          </button>

          {showTags && (
            <div className="p-3 pt-0 space-y-3 max-h-48 overflow-y-auto">
              {availableTags.map((category) => (
                <div key={category.id}>
                  <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">{category.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {category.tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => onTagToggle(tag.id)}
                        className={`px-2 py-1 rounded-md text-xs transition-all ${
                          selectedTags.includes(tag.id)
                            ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40'
                            : 'bg-white/[0.06] text-white/60 hover:text-white/80 border border-transparent'
                        }`}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={!selectedVoice || isGenerating}
        className={`w-full py-4 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
          !selectedVoice
            ? 'bg-white/10 text-white/40 cursor-not-allowed'
            : isGenerating
              ? 'bg-indigo-500/50 text-white cursor-wait'
              : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 active:scale-[0.98] shadow-lg shadow-indigo-500/25'
        }`}
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
            Generating...
          </>
        ) : !selectedVoice ? (
          'Select a voice first'
        ) : (
          <>
            <PlayIcon className="w-5 h-5" />
            Generate Meditation
          </>
        )}
      </button>
    </div>
  );
});

MeditationPanel.displayName = 'MeditationPanel';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface AgentChatProps {
  onMeditationReady?: (script: string, type: MeditationType, prompt: string) => void;
  onGenerateAudio?: (script: string, selectedTags: string[]) => void;
  onRequestVoiceSelection?: () => void;
  onRequestMusicSelection?: () => void;
  onChatStarted?: () => void;
  selectedVoice?: VoiceProfile | null;
  selectedMusic?: BackgroundTrack | null;
  availableMusic?: BackgroundTrack[];
  availableTags?: { id: string; name: string; color: string; tags: { id: string; label: string }[] }[];
  onMusicChange?: (track: BackgroundTrack) => void;
  isGenerating?: boolean;
  isGeneratingAudio?: boolean;
  className?: string;
}

export const AgentChat: React.FC<AgentChatProps> = ({
  onMeditationReady,
  onGenerateAudio,
  onRequestVoiceSelection,
  onChatStarted,
  selectedVoice,
  selectedMusic,
  availableMusic = [],
  availableTags = [],
  onMusicChange,
  isGenerating: externalIsGenerating,
  isGeneratingAudio = false,
  className = '',
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
  const startVoiceRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let accumulatedTranscript = '';

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscribedText('');
      accumulatedTranscript = '';
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        accumulatedTranscript = (accumulatedTranscript + ' ' + finalTranscript).trim();
        setTranscribedText(accumulatedTranscript);
      } else if (interimTranscript) {
        setTranscribedText((accumulatedTranscript + ' ' + interimTranscript).trim());
      }
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => {
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

  const handleGenerate = useCallback(() => {
    if (currentMeditation?.script && onGenerateAudio) {
      onGenerateAudio(currentMeditation.script, selectedTags);
      setShowMeditationPanel(false);
    }
  }, [currentMeditation, onGenerateAudio, selectedTags]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        <div className="max-w-xl mx-auto">
          {/* Message List */}
          {hasMessages && (
            <div className="space-y-1">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isLast={index === messages.length - 1 && !showMeditationPanel}
                />
              ))}
            </div>
          )}

          {/* Inline Meditation Panel */}
          {showMeditationPanel && currentMeditation?.script && (
            <div className="mt-4">
              <MeditationPanel
                script={currentMeditation.script}
                meditationType={currentMeditation.meditationType}
                selectedVoice={selectedVoice || null}
                selectedMusic={selectedMusic || null}
                selectedTags={selectedTags}
                availableMusic={availableMusic}
                availableTags={availableTags}
                onVoiceSelect={onRequestVoiceSelection || (() => {})}
                onMusicSelect={onMusicChange || (() => {})}
                onTagToggle={handleTagToggle}
                onGenerate={handleGenerate}
                isGenerating={isGeneratingAudio}
              />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 px-4 pb-6 pt-2">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className={`relative flex items-center bg-white/[0.06] border
                          rounded-full px-4 md:px-6 py-2.5
                          transition-all duration-200 shadow-lg shadow-black/10
                          ${isRecording
                            ? 'border-rose-500/50 bg-rose-500/10'
                            : 'border-white/10 focus-within:border-indigo-500/40 focus-within:bg-white/[0.08]'
                          }`}>
              <textarea
                ref={inputRef}
                value={isRecording ? transcribedText : inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isRecording ? "Listening..." : (hasMessages ? "Share more..." : "How are you feeling?")}
                rows={1}
                className={`flex-1 bg-transparent text-sm md:text-base
                         outline-none resize-none py-2
                         ${isRecording ? 'text-white/70 italic' : 'text-white placeholder:text-white/30'}`}
                style={{ maxHeight: '120px' }}
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
                    ? 'h-10 w-10 rounded-full bg-indigo-500/50 cursor-not-allowed'
                    : isRecording
                      ? 'h-10 w-10 rounded-full bg-rose-500 hover:bg-rose-400 active:scale-95 text-white animate-pulse'
                      : inputValue.trim()
                        ? 'h-10 w-10 rounded-full bg-indigo-500 hover:bg-indigo-400 active:scale-95 text-white'
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
    </div>
  );
};

export default AgentChat;
