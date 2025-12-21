/**
 * AgentChat Component
 *
 * A dedicated conversational chat interface for the INrVO Meditation Agent.
 * Always-visible chat with fresh conversations on each visit.
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useMeditationAgent, type ChatMessage, type AgentAction } from '../src/hooks/useMeditationAgent';
import type { VoiceProfile } from '../types';
import type { MeditationType } from '../src/lib/agent/knowledgeBase';
import { ScriptEditor } from './ScriptEditor';

// ============================================================================
// ICONS
// ============================================================================

const SendIcon = () => (
  <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

const SparkleIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
  </svg>
);

// Quick prompt icons - elegant minimal SVGs
const QuickPromptIcons: Record<string, React.FC<{ className?: string }>> = {
  waves: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 12c1.5-2 3.5-2 5 0s3.5 2 5 0 3.5-2 5 0 3.5 2 5 0" />
      <path d="M2 17c1.5-2 3.5-2 5 0s3.5 2 5 0 3.5-2 5 0 3.5 2 5 0" opacity="0.5" />
    </svg>
  ),
  moon: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  ),
  lotus: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 21c-4-3-7-7-7-11a7 7 0 0114 0c0 4-3 8-7 11z" />
      <path d="M12 21c2-2 3-4 3-6a3 3 0 00-6 0c0 2 1 4 3 6z" opacity="0.6" />
    </svg>
  ),
  heart: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  ),
  cloud: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
    </svg>
  ),
  target: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" opacity="0.6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  sparkle: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2z" />
      <path d="M18 14l.75 2.25L21 17l-2.25.75L18 20l-.75-2.25L15 17l2.25-.75L18 14z" opacity="0.6" />
    </svg>
  ),
  star: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
};

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
      {/* Agent avatar for non-user messages */}
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
          ${message.isLoading ? 'animate-pulse' : ''}
          ${isLast ? 'animate-in fade-in slide-in-from-bottom-2 duration-300' : ''}
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

        {/* Quote Card */}
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

interface QuickPromptChipProps {
  label: string;
  icon: string;
  onClick: () => void;
}

const QuickPromptChip = memo<QuickPromptChipProps>(({ label, icon, onClick }) => {
  const IconComponent = QuickPromptIcons[icon];

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                 bg-white/[0.05] hover:bg-white/[0.10]
                 border border-white/10 hover:border-indigo-500/30
                 text-white/60 hover:text-white transition-all duration-200
                 text-xs group whitespace-nowrap
                 active:scale-[0.97]"
    >
      {IconComponent && (
        <IconComponent className="w-3 h-3 text-indigo-400/70 group-hover:text-indigo-300 transition-colors" />
      )}
      <span>{label}</span>
    </button>
  );
});

QuickPromptChip.displayName = 'QuickPromptChip';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface AgentChatProps {
  onMeditationReady?: (script: string, type: MeditationType, prompt: string) => void;
  onGenerateAudio?: (script: string, selectedTags: string[]) => void;
  onRequestVoiceSelection?: () => void;
  onChatStarted?: () => void;
  selectedVoice?: VoiceProfile | null;
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
    quickPrompts,
  } = useMeditationAgent();

  const [inputValue, setInputValue] = useState('');
  const [showScriptEditor, setShowScriptEditor] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isProcessing = isLoading || isGeneratingMeditation || externalIsGenerating;
  const hasMessages = messages.length > 0;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Notify parent when chat has started
  useEffect(() => {
    if (hasMessages && onChatStarted) {
      onChatStarted();
    }
  }, [hasMessages, onChatStarted]);

  // Show ScriptEditor when meditation is ready for review
  useEffect(() => {
    if (currentMeditation?.readyForReview && currentMeditation?.script) {
      setShowScriptEditor(true);
    }
  }, [currentMeditation?.readyForReview, currentMeditation?.script]);

  // Handle generating audio from the script editor
  const handleGenerateFromEditor = useCallback((script: string, selectedTags: string[]) => {
    setShowScriptEditor(false);
    if (onGenerateAudio) {
      onGenerateAudio(script, selectedTags);
    } else if (onMeditationReady && currentMeditation) {
      const recentUserMessage = messages.filter(m => m.role === 'user').pop();
      onMeditationReady(script, currentMeditation.meditationType, recentUserMessage?.content || '');
    }
  }, [onGenerateAudio, onMeditationReady, currentMeditation, messages]);

  const handleCloseEditor = useCallback(() => {
    setShowScriptEditor(false);
  }, []);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    sendMessage(inputValue.trim());
    setInputValue('');

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [inputValue, isProcessing, sendMessage]);

  const handleQuickPrompt = useCallback((prompt: string) => {
    sendMessage(prompt);
  }, [sendMessage]);

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

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Script Editor Modal */}
      {showScriptEditor && currentMeditation?.script && (
        <ScriptEditor
          script={currentMeditation.script}
          meditationType={currentMeditation.meditationType}
          onClose={handleCloseEditor}
          onGenerate={handleGenerateFromEditor}
          selectedVoice={selectedVoice || null}
          onRequestVoiceSelection={onRequestVoiceSelection || (() => {})}
          isGenerating={isGeneratingAudio}
        />
      )}

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
                  isLast={index === messages.length - 1}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 px-4 pb-6 pt-2">
        <div className="max-w-xl mx-auto">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            {/* Input Field */}
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={hasMessages ? "Share more..." : "How are you feeling?"}
                rows={1}
                className="w-full px-4 py-3 rounded-2xl
                         bg-white/[0.06] border border-white/10
                         focus:border-indigo-500/50 focus:bg-white/[0.08]
                         text-white text-sm
                         placeholder:text-white/30
                         outline-none resize-none transition-all duration-200"
                style={{ maxHeight: '120px' }}
                disabled={isProcessing}
              />
            </div>

            {/* Send Button - matches input height */}
            <button
              type="submit"
              disabled={isProcessing || !inputValue.trim()}
              className={`
                flex-shrink-0 h-[46px] w-[46px] rounded-2xl
                flex items-center justify-center transition-all duration-200
                ${isProcessing
                  ? 'bg-indigo-500/50 cursor-not-allowed'
                  : inputValue.trim()
                    ? 'bg-indigo-500 hover:bg-indigo-400 active:scale-95'
                    : 'bg-white/[0.06] text-white/30 border border-white/10'
                }
              `}
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              ) : (
                <SendIcon />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AgentChat;
