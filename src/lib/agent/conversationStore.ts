/**
 * Conversation Store for INrVO Meditation Agent
 *
 * Manages conversation history using Supabase for persistence.
 * Replaces LocalStorage with database-first approach for cross-device sync.
 *
 * Architecture:
 * - In-memory state for immediate UI updates (Optimistic UI)
 * - Async debounced saves to Supabase for persistence
 * - Syncs across sessions via DB loading
 */

import { supabase, getCurrentUser, withRetry } from '../../../lib/supabase';
import type { ConversationMessage, UserPreferences, SessionState } from './MeditationAgent';

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
// CONVERSATION STORE CLASS
// ============================================================================

export class ConversationStore {
  private currentConversation: StoredConversation | null = null;
  private maxMessagesInContext = 20; // Keep last 20 messages for context
  private saveDebounceTimer: any = null;
  private readonly DEBOUNCE_MS = 2000; // Save to DB after 2s of inactivity

  constructor() {
    // No synchronous loading from LS anymore.
    // Consumers must call loadCurrentConversation() or startNewConversation()
  }

  /**
   * Save current conversation to Supabase with debouncing
   * This prevents DB spam on every keystroke/token
   */
  private scheduleSave(): void {
    if (!this.currentConversation) return;

    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    // Clone data to avoid race conditions with updates during wait
    const conversationToSave = { ...this.currentConversation };

    this.saveDebounceTimer = setTimeout(() => {
      this.saveConversationToDatabase(conversationToSave).catch(err => {
        console.warn('Background save failed:', err);
      });
    }, this.DEBOUNCE_MS);
  }

  /**
   * Start a new conversation
   * Creates a new conversation in memory and immediately syncs to DB (without debounce)
   */
  async startNewConversation(): Promise<StoredConversation> {
    // Save previous conversation immediately if exists (flush)
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      if (this.currentConversation) {
        await this.saveConversationToDatabase(this.currentConversation);
      }
    }

    const user = await getCurrentUser();
    const now = new Date();

    this.currentConversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user?.id || 'anonymous',
      messages: [],
      preferences: await this.loadPreferences(), // Load prefs from DB/memory
      sessionState: {
        conversationStarted: now,
        messageCount: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    // Initial save to establish row in DB
    await this.saveConversationToDatabase(this.currentConversation);
    return this.currentConversation;
  }

  /**
   * Get current conversation (Sync access to memory)
   */
  getCurrentConversation(): StoredConversation | null {
    return this.currentConversation;
  }

  /**
   * Add a message to the current conversation
   * Updates memory immediately, schedules DB save
   */
  addMessage(message: ConversationMessage): void {
    if (!this.currentConversation) {
      // Must start conversation first. But for safety, init one temporarily.
      console.warn('[ConversationStore] addMessage called without active conversation. Starting new one (sync fallback).');
      this.currentConversation = {
        id: `conv_${Date.now()}`,
        userId: 'anonymous',
        messages: [],
        preferences: {},
        sessionState: { conversationStarted: new Date(), messageCount: 0 },
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

    this.scheduleSave();
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
   * Update user preferences
   */
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    const currentPrefs = await this.loadPreferences();
    const updatedPrefs = { ...currentPrefs, ...preferences };

    // We still save prefs to DB? Or just keep in conversation?
    // The original code saved to LocalStorage 'inrvo_user_preferences'.
    // We should probably save these to 'user_profiles' table or just keep in conversation scope.
    // For now, attaching to conversation is the pattern here.

    if (this.currentConversation) {
      this.currentConversation.preferences = updatedPrefs;
      this.scheduleSave();
    }
  }

  /**
   * Load user preferences
   * Now fetches from latest conversation or defaults
   */
  async loadPreferences(): Promise<UserPreferences> {
    if (this.currentConversation?.preferences) {
      return this.currentConversation.preferences;
    }

    // If starting fresh, maybe try to fetch last conversation's prefs?
    // For now return empty to keep it simple and stateless
    return {};
  }

  /**
   * Save conversation to Supabase database
   */
  async saveConversationToDatabase(conversation: StoredConversation): Promise<boolean> {
    if (!supabase) return false;

    try {
      // If anonymous, don't save to DB (or save with null user if schema allows, but usually we require user)
      if (conversation.userId === 'anonymous') return false;

      // Create a summary of the conversation
      const summary = this.generateConversationSummary(conversation);

      await withRetry(async () => {
        const { error } = await supabase!
          .from('agent_conversations')
          .upsert({
            id: conversation.id,
            user_id: conversation.userId,
            messages: conversation.messages,
            preferences: conversation.preferences,
            session_state: conversation.sessionState,
            summary,
            created_at: conversation.createdAt.toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      });

      return true;
    } catch (error) {
      console.error('Error saving conversation:', error);
      return false;
    }
  }

  /**
   * Load conversation history from Supabase
   */
  async loadConversationHistory(limit: number = 10, userId?: string): Promise<ConversationSummary[]> {
    if (!supabase) return [];

    try {
      let resolvedUserId = userId;
      if (!resolvedUserId) {
        const user = await getCurrentUser();
        resolvedUserId = user?.id;
      }

      if (!resolvedUserId) return [];

      console.log('[conversationStore] Executing query for user:', resolvedUserId);
      const startTime = Date.now();
      const data = await withRetry(async () => {
        console.log('[conversationStore] withRetry attempt started...');
        const query = supabase!
          .from('agent_conversations')
          .select('id, summary, messages, session_state, created_at')
          .eq('user_id', resolvedUserId)
          .order('updated_at', { ascending: false }) // Use updated_at for history sorting
          .limit(limit);

        const { data, error } = await query;
        console.log('[conversationStore] Query returned in', Date.now() - startTime, 'ms');

        if (error) {
          console.error('[conversationStore] Query error:', error);
          throw error;
        }
        return data;
      });
      console.log('[conversationStore] withRetry finished, data length:', data?.length);

      return (data || []).map(item => ({
        id: item.id,
        preview: item.summary || this.extractPreview(item.messages),
        messageCount: item.messages?.length || 0,
        createdAt: new Date(item.created_at),
        mood: item.session_state?.currentMood,
        hasScript: !!item.session_state?.lastMeditationScript,
      }));
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

      const data = await withRetry(async () => {
        const { data, error } = await supabase!
          .from('agent_conversations')
          .select('*')
          .eq('id', conversationId)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        return data;
      });

      if (!data) return null;

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

      await withRetry(async () => {
        const { error } = await supabase!
          .from('agent_conversations')
          .delete()
          .eq('id', conversationId)
          .eq('user_id', user.id);

        if (error) throw error;
      });

      // Clear from memory if it's the current conversation
      if (this.currentConversation?.id === conversationId) {
        this.currentConversation = null;
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

    const firstUserMessage = messages.find((m: any) => m.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.slice(0, 80) + '...';
    }

    return 'Conversation';
  }

  /**
   * Update session state with the last generated meditation script
   * This enables the history sidebar to restore scripts when loading conversations
   */
  updateLastMeditationScript(script: string): void {
    if (!this.currentConversation) return;
    this.currentConversation.sessionState.lastMeditationScript = script;
    this.scheduleSave();
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    if (!this.userId) return;

    // Delete from Supabase
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', this.userId);

    if (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }

    // If the deleted conversation is the current one, clear it
    if (this.currentConversation?.id === conversationId) {
      this.clearCurrentConversation();
    }
  }

  /**
   * Clear current conversation
   */
  clearCurrentConversation(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.currentConversation = null;
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
