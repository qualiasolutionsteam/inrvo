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

const PlusIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const CloseIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
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
// INLINE MEDITATION PANEL - Mobile-optimized full-screen experience
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
  onGenerate: (editedScript: string) => void;
  isGenerating: boolean;
  onClose: () => void;
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
  onClose,
}) => {
  const [showControls, setShowControls] = useState(false);
  const [activeTab, setActiveTab] = useState<'voice' | 'music' | 'tags'>('voice');
  const [editedScript, setEditedScript] = useState(script);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number>(script.length);

  // Insert audio tag at cursor position
  const insertTagAtCursor = useCallback((tagLabel: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? cursorPosition;
    const end = textarea.selectionEnd ?? cursorPosition;
    const text = editedScript;

    // Add space before tag if needed (not at start, not after space/newline)
    const needSpaceBefore = start > 0 && !/[\s\n]$/.test(text.substring(0, start));
    // Add space after tag if needed (not at end, not before space/newline)
    const needSpaceAfter = end < text.length && !/^[\s\n]/.test(text.substring(end));

    const tagWithSpacing = (needSpaceBefore ? ' ' : '') + tagLabel + (needSpaceAfter ? ' ' : '');
    const newText = text.substring(0, start) + tagWithSpacing + text.substring(end);
    const newCursorPos = start + tagWithSpacing.length;

    setEditedScript(newText);
    setCursorPosition(newCursorPos);

    // Restore focus and cursor position after state update
    requestAnimationFrame(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  }, [editedScript, cursorPosition]);

  // Track cursor position when user types or clicks in textarea
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedScript(e.target.value);
    setCursorPosition(e.target.selectionStart ?? e.target.value.length);
  }, []);

  const handleTextareaSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    setCursorPosition(textarea.selectionStart ?? textarea.value.length);
  }, []);

  // Calculate stats
  const wordCount = editedScript.replace(/\[.*?\]/g, '').split(/\s+/).filter(Boolean).length;
  const estimatedDuration = Math.ceil(wordCount / 100);

  return (
    <div className="fixed inset-0 z-[75] bg-[#020617] animate-in fade-in duration-300">
      {/* Full screen meditation editor */}
      <div className="h-full flex flex-col">

        {/* Header - frosted glass effect */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
              <SparkleIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Your Meditation</p>
              <p className="text-white/50 text-xs">{wordCount} words · ~{estimatedDuration} min read</p>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="z-[100] w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95 cursor-pointer"
            aria-label="Close"
            type="button"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Script Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <textarea
            ref={textareaRef}
            value={editedScript}
            onChange={handleTextareaChange}
            onSelect={handleTextareaSelect}
            onClick={handleTextareaSelect}
            onKeyUp={handleTextareaSelect}
            className="w-full h-full bg-transparent text-white leading-relaxed
                       resize-none outline-none p-4 md:p-6
                       placeholder:text-white/30"
            style={{ fontSize: '16px', minHeight: '200px' }}
            placeholder="Your meditation script..."
          />
        </div>

        {/* Bottom Bar - part of flex layout, not fixed */}
        <div className="flex-shrink-0 bg-black/60 backdrop-blur-xl border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">

          {/* Options Row */}
          <div className="flex items-center gap-2">
            {/* + Button to expand controls - matches voice chip height */}
            <button
              onClick={() => setShowControls(!showControls)}
              className={`flex-shrink-0 h-8 px-3 rounded-full flex items-center justify-center gap-1.5 text-xs font-medium border transition-all
                ${showControls
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : 'bg-white/10 text-white/50 border-white/10 hover:bg-white/15 hover:text-white/70 hover:border-white/20'
                }`}
            >
              <PlusIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${showControls ? 'rotate-45' : ''}`} />
              <span className="hidden sm:inline">{showControls ? 'Close' : 'Options'}</span>
            </button>

            {/* Status chips */}
            <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={onVoiceSelect}
                className={`flex-shrink-0 h-8 px-3 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-all
                  ${selectedVoice
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : 'bg-white/10 text-white/50 border-white/10 animate-pulse'
                  }`}
              >
                <VoiceIcon className="w-3.5 h-3.5" />
                {selectedVoice ? selectedVoice.name : 'Select Voice'}
              </button>

              {selectedMusic && selectedMusic.id !== 'none' && (
                <span className="flex-shrink-0 h-8 px-3 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30 flex items-center">
                  🎵 {selectedMusic.name}
                </span>
              )}
            </div>
          </div>

          {/* Expandable Controls */}
          {showControls && (
            <div className="animate-in slide-in-from-bottom-2 duration-200 bg-white/10 backdrop-blur-sm rounded-xl p-3">
              {/* Tab Buttons */}
              <div className="flex gap-1 mb-3">
                <button
                  onClick={() => setActiveTab('voice')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
                    ${activeTab === 'voice' ? 'bg-cyan-500/30 text-cyan-300' : 'text-white/50'}`}
                >
                  Voice
                </button>
                <button
                  onClick={() => setActiveTab('music')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
                    ${activeTab === 'music' ? 'bg-emerald-500/30 text-emerald-300' : 'text-white/50'}`}
                >
                  Music
                </button>
                <button
                  onClick={() => setActiveTab('tags')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
                    ${activeTab === 'tags' ? 'bg-violet-500/30 text-violet-300' : 'text-white/50'}`}
                >
                  Tags
                </button>
              </div>

              {/* Tab Content */}
              <div className="max-h-32 overflow-y-auto">
                {activeTab === 'voice' && (
                  <button
                    onClick={onVoiceSelect}
                    className="w-full p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all flex items-center gap-3"
                  >
                    <VoiceIcon className={`w-5 h-5 ${selectedVoice ? 'text-cyan-400' : 'text-white/40'}`} />
                    <span className="text-white/80 text-sm">
                      {selectedVoice ? `Change from ${selectedVoice.name}` : 'Tap to select a voice'}
                    </span>
                  </button>
                )}

                {activeTab === 'music' && (
                  <div className="grid grid-cols-2 gap-2">
                    {availableMusic.slice(0, 6).map((track) => (
                      <button
                        key={track.id}
                        onClick={() => onMusicSelect(track)}
                        className={`p-2 rounded-lg text-xs transition-all ${
                          selectedMusic?.id === track.id
                            ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {track.name}
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'tags' && (
                  <div className="flex flex-wrap gap-1.5">
                    {availableTags.flatMap(cat => cat.tags).slice(0, 10).map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => insertTagAtCursor(tag.label)}
                        className="px-2.5 py-1 rounded-md text-xs transition-all
                          bg-gradient-to-r from-violet-500/20 to-purple-500/20
                          hover:from-violet-500/30 hover:to-purple-500/30
                          border border-violet-500/30 hover:border-violet-400/50
                          text-violet-200 font-medium
                          active:scale-95"
                        title={`Insert ${tag.label} at cursor`}
                      >
                        <span className="text-violet-400 mr-1">+</span>
                        {tag.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Big Generate Button */}
          <button
            onClick={() => onGenerate(editedScript)}
            disabled={!selectedVoice || isGenerating}
            className={`w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-3 transition-all
              ${!selectedVoice
                ? 'bg-white/10 text-white/40'
                : isGenerating
                  ? 'bg-cyan-500/60 text-white'
                  : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-cyan-500/30 active:scale-[0.98]'
              }`}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                Generating Audio...
              </>
            ) : !selectedVoice ? (
              <>
                <VoiceIcon className="w-5 h-5" />
                Select a Voice First
              </>
            ) : (
              <>
                <PlayIcon className="w-5 h-5" />
                Generate & Play
              </>
            )}
          </button>
        </div>
      </div>
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

  const handleGenerate = useCallback((editedScript: string) => {
    if (editedScript && onGenerateAudio) {
      onGenerateAudio(editedScript, selectedTags);
      // Don't close the panel here - let it show the loading state
      // Panel will be replaced by InlinePlayer when audio is ready
    }
  }, [onGenerateAudio, selectedTags]);

  const handleCloseMeditationPanel = useCallback(() => {
    setShowMeditationPanel(false);
  }, []);

  return (
    <div className={`flex flex-col ${hasMessages ? 'h-full' : 'min-h-[100dvh]'} ${className}`}>
      {/* Messages Area - only shown when there are messages and meditation panel is closed */}
      {!showMeditationPanel && hasMessages && (
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
          <div className="max-w-xl mx-auto">
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

      {/* Input Area - Fixed at bottom, hidden when meditation panel is open */}
      {!showMeditationPanel && (
        <div className={`flex-shrink-0 px-4 pb-6 ${hasMessages ? 'pt-2' : 'mt-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]'}`}>
        <div className="max-w-3xl mx-auto">
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

      {/* Meditation Panel - Full screen on mobile, inline on desktop */}
      {showMeditationPanel && currentMeditation?.script && (
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
          onClose={handleCloseMeditationPanel}
          isGenerating={isGeneratingAudio}
        />
      )}
    </div>
  );
};

export default AgentChat;
