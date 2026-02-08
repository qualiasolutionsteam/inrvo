// Domain-specific contexts for reduced re-renders
export { AuthProvider, useAuth } from './AuthContext';
export { ScriptProvider, useScript } from './ScriptContext';
export { LibraryProvider, useLibrary } from './LibraryContext';
export { AudioTagsProvider, useAudioTags } from './AudioTagsContext';
export { ChatHistoryProvider, useChatHistory } from './ChatHistoryContext';

// Audio playback context (separated for performance - high-frequency updates)
export {
  AudioPlaybackProvider,
  useAudioPlayback,
  useIsPlaying,
  usePlaybackTime,
  usePlaybackRate,
} from './AudioPlaybackContext';

// Streaming generation context (for early redirect to player)
export {
  StreamingGenerationProvider,
  useStreamingGeneration,
} from './StreamingGenerationContext';

// Existing contexts
export { ModalProvider, useModal } from './ModalContext';
export { AppProvider, useApp } from './AppContext';
