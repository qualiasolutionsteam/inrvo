/**
 * Conversation Store for INrVO Meditation Agent
 *
 * Manages conversation history with:
 * - Local session storage for current conversation
 * - Supabase persistence for conversation history
 * - Context window management for token limits
 * - Quota protection for localStorage limits
 */

import { supabase, getCurrentUser } from '../../../lib/supabase';
import type { ConversationMessage, UserPreferences, SessionState } from './MeditationAgent';

// ============================================================================
// LOCALSTORAGE QUOTA HELPERS
// ============================================================================

/**
 * Safely set localStorage item with quota protection
 * Returns true if successful, false if quota exceeded
 */
function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (error instanceof DOMException &&
      (error.code === 22 || // QuotaExceededError
        error.code === 1014 || // Firefox NS_ERROR_DOM_QUOTA_REACHED
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn('localStorage quota exceeded, attempting cleanup...');
      return false;
    }
    console.error('Error setting localStorage:', error);
    return false;
  }
}

/**
 * Get approximate localStorage usage in bytes
 */
function getLocalStorageUsage(): number {
  let total = 0;
  for (const key in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
      total += (localStorage[key].length + key.length) * 2; // UTF-16
    }
  }
  return total;
}

/**
 * Prune old conversation history to free up space
 */
function pruneConversationHistory(maxItems: number = 5): void {
  try {
    const historyKey = 'inrvo_conversation_history';
    const stored = localStorage.getItem(historyKey);
    if (stored) {
      const history = JSON.parse(stored);
      if (Array.isArray(history) && history.length > maxItems) {
        const pruned = history.slice(-maxItems);
        localStorage.setItem(historyKey, JSON.stringify(pruned));
        console.info(`Pruned conversation history from ${history.length} to ${pruned.length} items`);
      }
    }
  } catch (error) {
    console.error('Error pruning conversation history:', error);
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface StoredConversation {
  id: string;
  userId: string;
  messages: ConversationMessage[];
  preferences: UserPreferences;
  sessionState: SessionState;
  createdAt: Date;
  updatedAt: Date;
  summary?: string;
}

export interface ConversationSummary {
  id: string;
  preview: string;
  messageCount: number;
  createdAt: Date;
  mood?: string;
  hasScript?: boolean; // True if conversation generated a meditation script
}

// ============================================================================
// LOCAL STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  CURRENT_CONVERSATION: 'inrvo_current_conversation',
  USER_PREFERENCES: 'inrvo_user_preferences',
  CONVERSATION_HISTORY: 'inrvo_conversation_history',
};

// ============================================================================
// CONVERSATION STORE CLASS
// ============================================================================

export class ConversationStore {
  private currentConversation: StoredConversation | null = null;
  private maxMessagesInContext = 20; // Keep last 20 messages for context

  constructor() {
    this.loadFromLocalStorage();
  }

  /**
   * Load current conversation from local storage
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_CONVERSATION);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.currentConversation = {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          updatedAt: new Date(parsed.updatedAt),
          messages: parsed.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        };
      }
    } catch (error) {
      console.error('Error loading conversation from local storage:', error);
    }
  }

  /**
   * Save current conversation to local storage with quota protection
   */
  private saveToLocalStorage(): void {
    if (!this.currentConversation) return;

    const data = JSON.stringify(this.currentConversation);

    // First attempt
    if (safeLocalStorageSet(STORAGE_KEYS.CURRENT_CONVERSATION, data)) {
      return;
    }

    // Quota exceeded - try pruning history and retry
    pruneConversationHistory(3);

    if (safeLocalStorageSet(STORAGE_KEYS.CURRENT_CONVERSATION, data)) {
      return;
    }

    // Still failing - trim messages in current conversation
    if (this.currentConversation.messages.length > 10) {
      const trimmedConversation = {
        ...this.currentConversation,
        messages: this.currentConversation.messages.slice(-10),
      };
      const trimmedData = JSON.stringify(trimmedConversation);

      if (safeLocalStorageSet(STORAGE_KEYS.CURRENT_CONVERSATION, trimmedData)) {
        console.warn('Saved trimmed conversation (last 10 messages) due to quota limits');
        return;
      }
    }

    // Last resort - log usage for debugging
    console.error(
      'Failed to save conversation to localStorage. Usage:',
      Math.round(getLocalStorageUsage() / 1024) + 'KB'
    );
  }

  /**
   * Start a new conversation
   */
  async startNewConversation(): Promise<StoredConversation> {
    // Save previous conversation if exists
    if (this.currentConversation && this.currentConversation.messages.length > 0) {
      await this.saveConversationToDatabase(this.currentConversation);
    }

    const user = await getCurrentUser();
    const now = new Date();

    this.currentConversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user?.id || 'anonymous',
      messages: [],
      preferences: this.loadPreferences(),
      sessionState: {
        conversationStarted: now,
        messageCount: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.saveToLocalStorage();
    return this.currentConversation;
  }

  /**
   * Get current conversation
   */
  getCurrentConversation(): StoredConversation | null {
    return this.currentConversation;
  }

  /**
   * Add a message to the current conversation
   */
  addMessage(message: ConversationMessage): void {
    if (!this.currentConversation) {
      // Start a new conversation if none exists
      this.currentConversation = {
        id: `conv_${Date.now()}`,
        userId: 'anonymous',
        messages: [],
        preferences: {},
        sessionState: {
          conversationStarted: new Date(),
          messageCount: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    this.currentConversation.messages.push(message);
    this.currentConversation.sessionState.messageCount++;
    this.currentConversation.updatedAt = new Date();

    // Update session state based on message metadata
    if (message.metadata?.emotionalState) {
      this.currentConversation.sessionState.currentMood = message.metadata.emotionalState;
    }
    if (message.metadata?.suggestedMeditation) {
      this.currentConversation.sessionState.selectedMeditation = message.metadata.suggestedMeditation;
    }

    this.saveToLocalStorage();
  }

  /**
   * Get messages for context (last N messages)
   */
  getContextMessages(): ConversationMessage[] {
    if (!this.currentConversation) return [];

    const messages = this.currentConversation.messages;
    if (messages.length <= this.maxMessagesInContext) {
      return messages;
    }

    return messages.slice(-this.maxMessagesInContext);
  }

  /**
   * Update user preferences with quota protection
   */
  updatePreferences(preferences: Partial<UserPreferences>): void {
    const currentPrefs = this.loadPreferences();
    const updatedPrefs = { ...currentPrefs, ...preferences };

    if (!safeLocalStorageSet(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updatedPrefs))) {
      console.warn('Failed to save preferences to localStorage due to quota limits');
    }

    if (this.currentConversation) {
      this.currentConversation.preferences = updatedPrefs;
      this.saveToLocalStorage();
    }
  }

  /**
   * Load user preferences from local storage
   */
  loadPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
    return {};
  }

  /**
   * Save conversation to Supabase database
   */
  async saveConversationToDatabase(conversation: StoredConversation): Promise<boolean> {
    if (!supabase) return false;

    try {
      const user = await getCurrentUser();
      if (!user) return false;

      // Create a summary of the conversation
      const summary = this.generateConversationSummary(conversation);

      const { error } = await supabase
        .from('agent_conversations')
        .upsert({
          id: conversation.id,
          user_id: user.id,
          messages: conversation.messages,
          preferences: conversation.preferences,
          session_state: conversation.sessionState,
          summary,
          created_at: conversation.createdAt.toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving conversation to database:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving conversation:', error);
      return false;
    }
  }

  /**
   * Load conversation history from Supabase
   * @param limit - Number of conversations to load
   * @param userId - Optional user ID to use directly (avoids re-fetching auth)
   */
  async loadConversationHistory(limit: number = 10, userId?: string): Promise<ConversationSummary[]> {
    console.log('[conversationStore] loadConversationHistory called, limit:', limit, 'userId:', userId, 'supabase:', !!supabase);
    if (!supabase) {
      console.log('[conversationStore] No supabase, returning empty');
      return [];
    }

    try {
      // Use provided userId or fallback to getCurrentUser
      let resolvedUserId = userId;
      if (!resolvedUserId) {
        console.log('[conversationStore] No userId provided, getting current user...');
        const user = await getCurrentUser();
        console.log('[conversationStore] Got user:', user?.id);
        resolvedUserId = user?.id;
      }

      if (!resolvedUserId) {
        console.log('[conversationStore] No user, returning empty');
        return [];
      }

      console.log('[conversationStore] Making Supabase query for user:', resolvedUserId);

      // Create a timeout promise
      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        setTimeout(() => {
          resolve({ data: null, error: { message: 'Query timed out after 10s' } });
        }, 10000);
      });

      // Race the query against the timeout
      const queryPromise = supabase
        .from('agent_conversations')
        .select('id, summary, messages, session_state, created_at')
        .eq('user_id', resolvedUserId)
        .order('created_at', { ascending: false })
        .limit(limit);

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      console.log('[conversationStore] Query complete, error:', error?.message, 'data length:', data?.length);

      if (error) {
        console.error('[conversationStore] Error loading conversation history:', error);
        return [];
      }

      const result = (data || []).map(item => ({
        id: item.id,
        preview: item.summary || this.extractPreview(item.messages),
        messageCount: item.messages?.length || 0,
        createdAt: new Date(item.created_at),
        mood: item.session_state?.currentMood,
        hasScript: !!item.session_state?.lastMeditationScript,
      }));
      console.log('[conversationStore] Returning', result.length, 'conversations');
      return result;
    } catch (error) {
      console.error('[conversationStore] Error loading conversation history:', error);
      return [];
    }
  }

  /**
   * Load a specific conversation by ID
   */
  async loadConversation(conversationId: string): Promise<StoredConversation | null> {
    if (!supabase) return null;

    try {
      const user = await getCurrentUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        console.error('Error loading conversation:', error);
        return null;
      }

      const conversation: StoredConversation = {
        id: data.id,
        userId: data.user_id,
        messages: (data.messages || []).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
        preferences: data.preferences || {},
        sessionState: data.session_state || { conversationStarted: new Date(), messageCount: 0 },
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        summary: data.summary,
      };

      // Set as current conversation
      this.currentConversation = conversation;
      this.saveToLocalStorage();

      return conversation;
    } catch (error) {
      console.error('Error loading conversation:', error);
      return null;
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const user = await getCurrentUser();
      if (!user) return false;

      const { error } = await supabase
        .from('agent_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting conversation:', error);
        return false;
      }

      // Clear from local storage if it's the current conversation
      if (this.currentConversation?.id === conversationId) {
        this.currentConversation = null;
        localStorage.removeItem(STORAGE_KEYS.CURRENT_CONVERSATION);
      }

      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return false;
    }
  }

  /**
   * Generate a summary of the conversation
   */
  private generateConversationSummary(conversation: StoredConversation): string {
    const userMessages = conversation.messages
      .filter(m => m.role === 'user')
      .map(m => m.content);

    if (userMessages.length === 0) return 'Empty conversation';

    // Use the first user message as the main topic
    const firstMessage = userMessages[0].slice(0, 100);
    const mood = conversation.sessionState.currentMood;

    let summary = firstMessage;
    if (mood) {
      summary = `[${mood}] ${summary}`;
    }

    return summary + (firstMessage.length < userMessages[0].length ? '...' : '');
  }

  /**
   * Extract a preview from messages
   */
  private extractPreview(messages: any[]): string {
    if (!messages || messages.length === 0) return 'Empty conversation';

    const firstUserMessage = messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.slice(0, 80) + '...';
    }

    return 'Conversation';
  }

  /**
   * Clear current conversation
   */
  clearCurrentConversation(): void {
    this.currentConversation = null;
    localStorage.removeItem(STORAGE_KEYS.CURRENT_CONVERSATION);
  }

  /**
   * Export conversation for sharing or backup
   */
  exportConversation(): string {
    if (!this.currentConversation) return '';

    return JSON.stringify({
      messages: this.currentConversation.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      })),
      sessionState: this.currentConversation.sessionState,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const conversationStore = new ConversationStore();
