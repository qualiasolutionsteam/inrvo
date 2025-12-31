/**
 * Gemini Multimodal Live API Client
 *
 * Provides real-time bidirectional voice communication with Gemini.
 * Handles WebSocket connection, audio streaming, and message parsing.
 *
 * Protocol: Gemini Multimodal Live API v1alpha
 * Audio Format:
 * - Input: PCM16, 16kHz, mono
 * - Output: PCM16, 24kHz, mono (configurable)
 */

// Debug logging - only enabled in development
const DEBUG = import.meta.env?.DEV ?? false;

// ============================================================================
// Types
// ============================================================================

export interface GeminiLiveConfig {
  wsUrl: string;
  apiKey: string;
  model: string;
  voiceName: string;
  systemPrompt: string;
}

export interface GeminiLiveCallbacks {
  onConnected?: () => void;
  onDisconnected?: (reason?: string) => void;
  onError?: (error: Error) => void;
  onTranscript?: (text: string, isFinal: boolean, isUser: boolean) => void;
  onAudioResponse?: (audioData: ArrayBuffer) => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// Gemini Live API message types
interface SetupMessage {
  setup: {
    model: string;
    generation_config: {
      response_modalities: ('AUDIO' | 'TEXT')[];
      speech_config?: {
        voice_config?: {
          prebuilt_voice_config?: {
            voice_name: string;
          };
        };
      };
    };
    system_instruction?: {
      parts: { text: string }[];
    };
  };
}

interface RealtimeInputMessage {
  realtime_input: {
    media_chunks: {
      mime_type: string;
      data: string; // base64 encoded audio
    }[];
  };
}

interface ClientContentMessage {
  client_content: {
    turns: {
      role: 'user';
      parts: { text: string }[];
    }[];
    turn_complete: boolean;
  };
}

// Server response types
interface ServerSetupComplete {
  setupComplete: Record<string, unknown>;
}

interface ServerContentPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string; // base64 encoded audio
  };
}

interface ServerContent {
  serverContent: {
    model_turn?: {
      parts: ServerContentPart[];
    };
    turn_complete?: boolean;
    interrupted?: boolean;
  };
}

interface ToolCall {
  toolCall: {
    function_calls: {
      name: string;
      args: Record<string, unknown>;
    }[];
  };
}

// Error response from Gemini API
interface ServerError {
  error: {
    code?: number;
    message?: string;
    status?: string;
  };
}

type ServerMessage = ServerSetupComplete | ServerContent | ToolCall | ServerError;

// ============================================================================
// Gemini Live Client Class
// ============================================================================

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private config: GeminiLiveConfig | null = null;
  private callbacks: GeminiLiveCallbacks = {};
  private state: ConnectionState = 'disconnected';
  private setupComplete = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;

  // Connection promise handlers for proper async flow
  private connectionResolve: (() => void) | null = null;
  private connectionReject: ((error: Error) => void) | null = null;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;

  // Audio state
  private isReceivingAudio = false;
  private audioQueue: ArrayBuffer[] = [];

  constructor() {
    if (DEBUG) console.log('[GeminiLive] Client initialized');
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if client is connected and ready
   */
  isConnected(): boolean {
    return this.state === 'connected' && this.setupComplete;
  }

  /**
   * Connect to Gemini Live API
   */
  async connect(config: GeminiLiveConfig, callbacks: GeminiLiveCallbacks = {}): Promise<void> {
    if (this.state === 'connecting' || this.state === 'connected') {
      if (DEBUG) console.log('[GeminiLive] Already connecting/connected');
      return;
    }

    this.config = config;
    this.callbacks = callbacks;
    this.state = 'connecting';
    this.setupComplete = false;

    try {
      // Connect to WebSocket with API key
      const wsUrlWithKey = `${config.wsUrl}?key=${config.apiKey}`;

      if (DEBUG) console.log('[GeminiLive] Connecting to WebSocket...');

      this.ws = new WebSocket(wsUrlWithKey);
      this.ws.binaryType = 'arraybuffer';

      // Set up event handlers
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);

      // Wait for connection with timeout using proper promise handling
      await new Promise<void>((resolve, reject) => {
        this.connectionResolve = resolve;
        this.connectionReject = reject;
        
        this.connectionTimeout = setTimeout(() => {
          this.cleanupConnectionHandlers();
          reject(new Error('Connection timeout - server did not respond within 10 seconds'));
        }, 10000);
      });

    } catch (error) {
      this.state = 'error';
      if (DEBUG) console.error('[GeminiLive] Connection error:', error);

      // Provide user-friendly error messages
      let userMessage = 'Failed to connect to voice service';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          userMessage = 'Connection timed out. Please check your internet connection and try again.';
        } else if (error.message.includes('SecurityError') || error.message.includes('insecure')) {
          userMessage = 'Connection blocked for security reasons. Voice chat requires HTTPS.';
        } else if (error.message.includes('WebSocket')) {
          userMessage = 'Could not establish voice connection. The service may be temporarily unavailable.';
        } else if (error.message.includes('Invalid model') || error.message.includes('not found')) {
          userMessage = 'Voice service configuration error. Please try again later.';
        } else {
          userMessage = `Voice connection error: ${error.message}`;
        }
      }

      throw new Error(userMessage);
    }
  }

  /**
   * Disconnect from Gemini Live API
   */
  disconnect(): void {
    if (DEBUG) console.log('[GeminiLive] Disconnecting...');

    this.cleanupConnectionHandlers();
    this.state = 'disconnected';
    this.setupComplete = false;
    this.reconnectAttempts = 0;

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;

      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Client disconnect');
      }
      this.ws = null;
    }

    this.callbacks.onDisconnected?.('Client initiated');
  }

  /**
   * Send audio data to Gemini
   * @param audioData PCM16 audio data at 16kHz, mono
   */
  sendAudio(audioData: ArrayBuffer): void {
    if (!this.isConnected() || !this.ws) {
      if (DEBUG) console.warn('[GeminiLive] Cannot send audio: not connected');
      return;
    }

    // Convert to base64
    const base64Audio = this.arrayBufferToBase64(audioData);

    const message: RealtimeInputMessage = {
      realtime_input: {
        media_chunks: [{
          mime_type: 'audio/pcm;rate=16000',
          data: base64Audio,
        }],
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send text message to Gemini
   */
  sendText(text: string): void {
    if (!this.isConnected() || !this.ws) {
      if (DEBUG) console.warn('[GeminiLive] Cannot send text: not connected');
      return;
    }

    const message: ClientContentMessage = {
      client_content: {
        turns: [{
          role: 'user',
          parts: [{ text }],
        }],
        turn_complete: true,
      },
    };

    this.ws.send(JSON.stringify(message));

    // Notify about user transcript
    this.callbacks.onTranscript?.(text, true, true);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private cleanupConnectionHandlers(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    this.connectionResolve = null;
    this.connectionReject = null;
  }

  private handleOpen(): void {
    if (DEBUG) console.log('[GeminiLive] WebSocket connected, sending setup...');

    if (!this.config || !this.ws) return;

    // Send setup message
    // NOTE: Gemini Live API only supports ['AUDIO'] - TEXT causes "invalid argument" error
    const setupMessage: SetupMessage = {
      setup: {
        model: this.config.model,
        generation_config: {
          response_modalities: ['AUDIO'],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: this.config.voiceName,
              },
            },
          },
        },
        system_instruction: {
          parts: [{ text: this.config.systemPrompt }],
        },
      },
    };

    if (DEBUG) console.log('[GeminiLive] Setup message:', { model: this.config.model, voice: this.config.voiceName });
    this.ws.send(JSON.stringify(setupMessage));
  }

  private handleMessage(event: MessageEvent): void {
    try {
      if (DEBUG) console.log('[GeminiLive] Message received:', typeof event.data === 'string' ? event.data.substring(0, 200) : 'binary');

      const message = JSON.parse(event.data as string);

      // Handle error responses from Gemini API
      if ('error' in message) {
        const errorMsg = message.error?.message || message.error?.status || 'Unknown API error';
        console.error('[GeminiLive] API error:', message.error);
        
        // Reject connection promise if still connecting
        if (this.connectionReject) {
          this.cleanupConnectionHandlers();
          this.connectionReject(new Error(errorMsg));
        }
        
        this.state = 'error';
        this.callbacks.onError?.(new Error(errorMsg));
        return;
      }

      // Handle setup complete
      if ('setupComplete' in message) {
        if (DEBUG) console.log('[GeminiLive] ✅ Setup complete!');
        this.setupComplete = true;
        this.state = 'connected';
        this.reconnectAttempts = 0;
        
        // Resolve connection promise
        if (this.connectionResolve) {
          this.cleanupConnectionHandlers();
          this.connectionResolve();
        }
        
        this.callbacks.onConnected?.();
        return;
      }

      // Handle server content (audio and text responses)
      if ('serverContent' in message) {
        const content = message.serverContent;

        // Handle interruption
        if (content.interrupted) {
          if (DEBUG) console.log('[GeminiLive] Response interrupted');
          this.isReceivingAudio = false;
          this.callbacks.onInterrupted?.();
          return;
        }

        // Handle turn complete
        if (content.turn_complete) {
          if (DEBUG) console.log('[GeminiLive] Turn complete');
          this.isReceivingAudio = false;
          this.callbacks.onTurnComplete?.();
          return;
        }

        // Process content parts
        if (content.model_turn?.parts) {
          for (const part of content.model_turn.parts) {
            // Handle text response
            if (part.text) {
              if (DEBUG) console.log('[GeminiLive] Text response:', part.text.substring(0, 50));
              this.callbacks.onTranscript?.(part.text, true, false);
            }

            // Handle audio response
            if (part.inline_data?.data) {
              this.isReceivingAudio = true;
              const audioData = this.base64ToArrayBuffer(part.inline_data.data);
              this.callbacks.onAudioResponse?.(audioData);
            }
          }
        }
        return;
      }

      // Handle tool calls (if needed in future)
      if ('toolCall' in message) {
        if (DEBUG) console.log('[GeminiLive] Tool call received (not implemented)');
        return;
      }

      // Log unknown message types for debugging
      if (DEBUG) console.log('[GeminiLive] Unknown message type:', Object.keys(message));

    } catch (error) {
      if (DEBUG) console.error('[GeminiLive] Error parsing message:', error);
    }
  }

  private handleError(event: Event): void {
    console.error('[GeminiLive] WebSocket error:', event.type);
    
    this.state = 'error';
    
    // Reject connection promise if still connecting
    if (this.connectionReject) {
      this.cleanupConnectionHandlers();
      this.connectionReject(new Error('WebSocket connection failed'));
    }
    
    this.callbacks.onError?.(new Error('WebSocket error'));
  }

  private handleClose(event: CloseEvent): void {
    if (DEBUG) console.log('[GeminiLive] WebSocket closed:', { code: event.code, reason: event.reason });

    const wasConnected = this.state === 'connected';
    const wasConnecting = this.state === 'connecting';
    this.state = 'disconnected';
    this.setupComplete = false;

    // Reject connection promise if still connecting (connection failed during setup)
    if (wasConnecting && this.connectionReject) {
      const reason = event.reason || `Connection closed during setup (code: ${event.code})`;
      this.cleanupConnectionHandlers();
      this.connectionReject(new Error(reason));
      return;
    }

    // Attempt reconnection if unexpectedly disconnected
    if (wasConnected && event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      if (DEBUG) console.log(`[GeminiLive] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);

      setTimeout(async () => {
        if (this.config) {
          try {
            await this.connect(this.config, this.callbacks);
          } catch (error) {
            if (DEBUG) console.error('[GeminiLive] Reconnection failed:', error);
          }
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      this.callbacks.onDisconnected?.(event.reason || 'Connection closed');
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clientInstance: GeminiLiveClient | null = null;

/**
 * Get the Gemini Live client singleton
 */
export function getGeminiLiveClient(): GeminiLiveClient {
  if (!clientInstance) {
    clientInstance = new GeminiLiveClient();
  }
  return clientInstance;
}

/**
 * Fetch Gemini Live configuration from edge function
 */
export async function fetchGeminiLiveConfig(voiceName?: string): Promise<GeminiLiveConfig> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/gemini-live-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ voiceName }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}
