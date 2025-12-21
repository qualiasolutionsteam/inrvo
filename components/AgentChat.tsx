/**
 * AgentChat Component
 *
 * A conversational chat interface for the INrVO Meditation Agent.
 * Replaces the simple prompt input with an intelligent conversational experience.
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useMeditationAgent, type ChatMessage, type AgentAction } from '../src/hooks/useMeditationAgent';
import type { VoiceProfile } from '../types';
import type { MeditationType } from '../src/lib/agent/knowledgeBase';

// ============================================================================
// ICONS
// ============================================================================

const SendIcon = () => (
  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

const SparkleIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 15l-6-6-6 6" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
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
  onActionClick: (action: AgentAction) => void;
  isLast: boolean;
}

const MessageBubble = memo<MessageBubbleProps>(({ message, onActionClick, isLast }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`
          max-w-[90%] rounded-2xl px-4 py-2.5
          ${isUser
            ? 'bg-indigo-600/80 text-white'
            : 'bg-white/10 backdrop-blur-sm text-white/90 border border-white/10'
          }
          ${message.isLoading ? 'animate-pulse' : ''}
          ${isLast ? 'animate-in fade-in slide-in-from-bottom-2 duration-300' : ''}
        `}
      >
        {message.isLoading ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-white/50 text-xs">Contemplating...</span>
          </div>
        ) : (
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        )}

        {/* Quote Card */}
        {message.quote && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <p className="italic text-white/60 text-xs">"{message.quote.quote}"</p>
            <p className="text-indigo-400 text-[10px] mt-1">— {message.quote.teacher}</p>
          </div>
        )}

        {/* Action Buttons */}
        {message.actions && message.actions.length > 0 && !message.isLoading && (
          <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
            {message.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => onActionClick(action)}
                className="px-2.5 py-1 text-[10px] rounded-full bg-indigo-500/30 hover:bg-indigo-500/50
                           text-indigo-200 transition-colors flex items-center gap-1"
              >
                <SparkleIcon className="w-2.5 h-2.5" />
                {action.label}
              </button>
            ))}
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
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10
                 border border-white/10 text-white/60 hover:text-white transition-all
                 text-xs whitespace-nowrap group"
    >
      {IconComponent && (
        <IconComponent className="w-3.5 h-3.5 text-indigo-400/70 group-hover:text-indigo-300 transition-colors" />
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
  // Callbacks
  onMeditationReady?: (script: string, type: MeditationType, prompt: string) => void;
  onRequestVoiceSelection?: () => void;
  onOpenTemplates?: () => void;
  onOpenMusic?: () => void;
  onOpenTags?: () => void;
  onChatStarted?: () => void; // Called when user sends first message

  // State from parent
  selectedVoice?: VoiceProfile | null;
  isGenerating?: boolean;

  // Styling
  className?: string;
}

export const AgentChat: React.FC<AgentChatProps> = ({
  onMeditationReady,
  onRequestVoiceSelection,
  onOpenTemplates,
  onOpenMusic,
  onOpenTags,
  onChatStarted,
  selectedVoice,
  isGenerating: externalIsGenerating,
  className = '',
}) => {
  const {
    messages,
    isLoading,
    isGeneratingMeditation,
    currentMeditation,
    sendMessage,
    clearConversation,
    executeAction,
    greeting,
    quickPrompts,
  } = useMeditationAgent();

  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isProcessing = isLoading || isGeneratingMeditation || externalIsGenerating;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Notify parent when chat has started (first message sent)
  useEffect(() => {
    if (messages.length > 0 && onChatStarted) {
      onChatStarted();
    }
  }, [messages.length > 0, onChatStarted]);

  // Notify parent when meditation is ready
  useEffect(() => {
    if (currentMeditation?.script && onMeditationReady) {
      // Extract prompt from recent messages
      const recentUserMessage = messages.filter(m => m.role === 'user').pop();
      onMeditationReady(
        currentMeditation.script,
        currentMeditation.meditationType,
        recentUserMessage?.content || ''
      );
    }
  }, [currentMeditation, onMeditationReady, messages]);

  // Handle form submission
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    sendMessage(inputValue.trim());
    setInputValue('');
    setIsExpanded(true); // Expand to show conversation

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [inputValue, isProcessing, sendMessage]);

  // Handle quick prompt click
  const handleQuickPrompt = useCallback((prompt: string) => {
    sendMessage(prompt);
    setIsExpanded(true);
  }, [sendMessage]);

  // Handle action button click
  const handleActionClick = useCallback((action: AgentAction) => {
    if (action.type === 'play_audio') {
      if (!selectedVoice && onRequestVoiceSelection) {
        onRequestVoiceSelection();
      }
    } else {
      executeAction(action);
    }
  }, [selectedVoice, onRequestVoiceSelection, executeAction]);

  // Handle textarea auto-resize
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 80) + 'px';
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const hasMessages = messages.length > 0;

  return (
    <div className={`w-full ${className}`}>
      {/* Expandable Chat Area - shows above input when there are messages */}
      {hasMessages && isExpanded && (
        <div className="mb-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="glass rounded-2xl border border-white/20 overflow-hidden max-w-4xl mx-auto">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <SparkleIcon className="w-3 h-3 text-white" />
                </div>
                <span className="text-white/80 text-xs font-medium">Meditation Guide</span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                title="Minimize"
              >
                <ChevronDownIcon />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="max-h-[40vh] overflow-y-auto px-4 py-3 scroll-smooth"
            >
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onActionClick={handleActionClick}
                  isLast={index === messages.length - 1}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Collapsed indicator when there are messages */}
      {hasMessages && !isExpanded && (
        <div className="mb-2 max-w-4xl mx-auto">
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full glass rounded-xl px-4 py-2 flex items-center justify-between
                       border border-white/20 hover:border-white/30 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <SparkleIcon className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="text-white/60 text-xs">
                {messages.length} message{messages.length !== 1 ? 's' : ''} • Click to expand
              </span>
            </div>
            <ChevronUpIcon />
          </button>
        </div>
      )}

      {/* Quick Prompts - show when no messages */}
      {!hasMessages && (
        <div className="mb-3 max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-2 justify-center px-2">
            {quickPrompts.slice(0, 4).map((prompt, index) => (
              <QuickPromptChip
                key={index}
                label={prompt.label}
                icon={prompt.icon}
                onClick={() => handleQuickPrompt(prompt.label)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Input Area - Glass Card Style matching the original */}
      <div className="glass glass-prompt rounded-2xl md:rounded-[32px] p-1.5 md:p-2 shadow-2xl shadow-indigo-900/20 border border-white/30 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 md:gap-3 px-1 md:px-2">
          {/* Plus Menu Button */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={onOpenTemplates}
              className="p-1.5 md:p-2 rounded-full transition-all flex items-center justify-center border
                         text-slate-300 hover:text-white border-white/40 hover:border-white/60 hover:bg-white/5"
              title="Templates & Options"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          {/* Input Field */}
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={hasMessages ? "Continue the conversation..." : "How are you feeling today?"}
            rows={1}
            className="flex-1 bg-transparent py-2.5 md:py-3 text-sm md:text-base text-slate-200
                       placeholder:text-slate-500 outline-none min-w-0 w-0 resize-none"
            style={{ maxHeight: '80px' }}
            disabled={isProcessing}
          />

          {/* Voice Selection Indicator */}
          {selectedVoice && (
            <button
              type="button"
              onClick={onRequestVoiceSelection}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/20
                         text-cyan-400 text-[10px] font-medium border border-cyan-500/30
                         hover:bg-cyan-500/30 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              {selectedVoice.name}
            </button>
          )}

          {/* Send Button */}
          <button
            type="submit"
            disabled={isProcessing || !inputValue.trim()}
            className={`
              flex-shrink-0 p-1.5 md:p-2 rounded-full transition-all flex items-center justify-center border
              ${isProcessing
                ? 'bg-indigo-500/50 border-indigo-400/60 cursor-not-allowed text-white/70'
                : inputValue.trim()
                  ? 'bg-indigo-500 border-indigo-300 hover:bg-indigo-400 active:scale-95 text-white'
                  : 'text-slate-300 border-white/40'
              }
            `}
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-3.5 w-3.5 md:h-4 md:w-4 border-2 border-white/30 border-t-white" />
            ) : (
              <SendIcon />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AgentChat;
