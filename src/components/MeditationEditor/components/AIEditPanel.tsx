/**
 * AIEditPanel Component
 *
 * AI-powered inline editing for meditation scripts.
 * Users can describe edits via text or voice, and AI will
 * rewrite selected portions or make changes across the script.
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { geminiChat } from '../../../lib/edgeFunctions';

// ============================================================================
// ICONS
// ============================================================================

const SendIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

const MicIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
    <path d="M19 10v2a7 7 0 01-14 0v-2" />
    <path d="M12 19v4M8 23h8" />
  </svg>
);

const StopIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const SparkleIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 3v1m0 16v1m-9-9h1m16 0h1m-2.636-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);

// ============================================================================
// TYPES
// ============================================================================

interface AIEditPanelProps {
  /** Current script content */
  script: string;
  /** Currently selected text (if any) */
  selectedText?: string;
  /** Callback when AI suggests an edit */
  onApplyEdit: (newScript: string) => void;
  /** Whether panel is visible */
  isVisible: boolean;
}

interface EditMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
  suggestedScript?: string;
}

// System prompt for the AI editor
const EDIT_SYSTEM_PROMPT = `You are an AI assistant helping users edit their meditation scripts. Your role is to:

1. Understand what changes the user wants to make
2. Apply those changes to the script while maintaining flow and quality
3. Return ONLY the modified script, wrapped in <script> tags

When the user describes a change:
- If they selected specific text, focus changes on that portion
- Maintain the meditation's tone, pacing, and audio tags like [pause], [deep breath]
- Keep the overall structure and timing intact
- Preserve all existing audio tags unless asked to remove them

Response format:
<script>
[The complete edited meditation script goes here]
</script>

If you need clarification, ask a brief question. Otherwise, return the edited script.`;

// ============================================================================
// COMPONENT
// ============================================================================

export const AIEditPanel = memo<AIEditPanelProps>(
  ({ script, selectedText, onApplyEdit, isVisible }) => {
    const [messages, setMessages] = useState<EditMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when panel becomes visible
    useEffect(() => {
      if (isVisible && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isVisible]);

    // Initialize speech recognition
    useEffect(() => {
      if (typeof window !== 'undefined') {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = 'en-US';

          recognition.onresult = (event) => {
            const transcript = event.results[0]?.[0]?.transcript ?? '';
            setInput(prev => prev + (prev ? ' ' : '') + transcript);
            setIsRecording(false);
          };

          recognition.onerror = () => {
            setIsRecording(false);
          };

          recognition.onend = () => {
            setIsRecording(false);
          };

          recognitionRef.current = recognition;
        }
      }

      return () => {
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }
      };
    }, []);

    // Toggle voice recording
    const toggleRecording = useCallback(() => {
      if (!recognitionRef.current) return;

      if (isRecording) {
        recognitionRef.current.stop();
        setIsRecording(false);
      } else {
        recognitionRef.current.start();
        setIsRecording(true);
      }
    }, [isRecording]);

    // Parse AI response for script content
    const parseScriptFromResponse = useCallback((response: string): string | null => {
      const scriptMatch = response.match(/<script>([\s\S]*?)<\/script>/);
      if (scriptMatch?.[1]) {
        return scriptMatch[1].trim();
      }
      return null;
    }, []);

    // Send message to AI
    const sendMessage = useCallback(async () => {
      if (!input.trim() || isLoading) return;

      const userMessage: EditMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: input,
      };

      const loadingMessage: EditMessage = {
        id: `msg_${Date.now()}_loading`,
        role: 'assistant',
        content: '',
        isLoading: true,
      };

      setMessages(prev => [...prev, userMessage, loadingMessage]);
      setInput('');
      setIsLoading(true);

      try {
        // Build the prompt with context
        let prompt = input;

        if (selectedText) {
          prompt = `The user has selected this portion of the script:\n"${selectedText}"\n\nTheir request: ${input}`;
        }

        prompt += `\n\nCurrent full script:\n${script}`;

        const response = await geminiChat(prompt, {
          systemPrompt: EDIT_SYSTEM_PROMPT,
          maxTokens: 2000,
          temperature: 0.7,
        });

        // Check if response contains a script
        const suggestedScript = parseScriptFromResponse(response);

        const assistantMessage: EditMessage = {
          id: `msg_${Date.now()}_response`,
          role: 'assistant',
          content: suggestedScript
            ? 'I\'ve updated the script based on your request. Click "Apply" to use this version.'
            : response,
          suggestedScript: suggestedScript || undefined,
        };

        setMessages(prev => prev.filter(m => !m.isLoading).concat(assistantMessage));

      } catch (error) {
        console.error('AI edit error:', error);
        const errorMessage: EditMessage = {
          id: `msg_${Date.now()}_error`,
          role: 'assistant',
          content: 'Sorry, I had trouble processing that. Could you try rephrasing your request?',
        };
        setMessages(prev => prev.filter(m => !m.isLoading).concat(errorMessage));
      } finally {
        setIsLoading(false);
      }
    }, [input, script, selectedText, isLoading, parseScriptFromResponse]);

    // Handle keyboard submit
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    }, [sendMessage]);

    // Apply suggested edit
    const handleApplyEdit = useCallback((suggestedScript: string) => {
      onApplyEdit(suggestedScript);

      // Add confirmation message
      const confirmMessage: EditMessage = {
        id: `msg_${Date.now()}_confirm`,
        role: 'assistant',
        content: 'Changes applied! Feel free to ask for more edits.',
      };
      setMessages(prev => [...prev, confirmMessage]);
    }, [onApplyEdit]);

    if (!isVisible) return null;

    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <SparkleIcon className="w-4 h-4 text-sky-400" />
          <p className="text-xs font-medium text-white/70">AI Edit Assistant</p>
        </div>

        {/* Selected text indicator */}
        {selectedText && (
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20">
            <p className="text-[10px] text-sky-400/70 mb-1">Selected text:</p>
            <p className="text-xs text-white/60 line-clamp-2 italic">
              "{selectedText}"
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-white/10">
          <AnimatePresence>
            {messages.map((message) => (
              <m.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-2.5 rounded-xl text-xs ${
                  message.role === 'user'
                    ? 'bg-white/10 text-white/80 ml-8'
                    : 'bg-gradient-to-r from-sky-500/15 to-purple-500/15 text-white/70 mr-8'
                }`}
              >
                {message.isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
                    <span className="text-white/50">Thinking...</span>
                  </div>
                ) : (
                  <>
                    <p>{message.content}</p>
                    {message.suggestedScript && (
                      <button
                        onClick={() => handleApplyEdit(message.suggestedScript!)}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30
                          text-sky-400 text-xs font-medium transition-all active:scale-95"
                      >
                        Apply Changes
                      </button>
                    )}
                  </>
                )}
              </m.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Quick suggestions */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[
              'Make it more calming',
              'Add more pauses',
              'Shorten it',
              'Make it warmer',
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInput(suggestion)}
                className="px-2.5 py-1 rounded-md text-[10px] transition-all
                  bg-white/5 hover:bg-white/10
                  border border-white/10 hover:border-white/20
                  text-white/50 hover:text-white/70 active:scale-95"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedText ? 'Describe changes for selection...' : 'Describe what you want to change...'}
            className="flex-1 h-10 px-3 rounded-xl bg-white/5 border border-white/10
              text-sm text-white placeholder-white/30
              focus:outline-none focus:border-sky-500/30 focus:bg-white/10
              transition-all"
          />

          {/* Voice input button */}
          {recognitionRef.current && (
            <button
              onClick={toggleRecording}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
                ${isRecording
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70'
                }`}
              title={isRecording ? 'Stop recording' : 'Voice input'}
            >
              {isRecording ? (
                <StopIcon className="w-4 h-4" />
              ) : (
                <MicIcon className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
              ${input.trim() && !isLoading
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30'
                : 'bg-white/5 text-white/20 border border-white/10 cursor-not-allowed'
              }`}
          >
            <SendIcon className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[10px] text-white/30 text-center">
          Select text in the editor, then describe changes
        </p>
      </div>
    );
  }
);

AIEditPanel.displayName = 'AIEditPanel';
