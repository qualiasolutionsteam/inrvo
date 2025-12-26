import React, { createContext, useContext, useReducer, useCallback, useMemo, ReactNode } from 'react';

/**
 * All modal types in the application.
 * Using a union type for type-safe modal management.
 */
export type ModalType =
  | 'clone'
  | 'templates'
  | 'music'
  | 'audioTags'
  | 'burgerMenu'
  | 'howItWorks'
  | 'library'
  | 'pricing'
  | 'aboutUs'
  | 'terms'
  | 'privacy'
  | 'promptMenu'
  | 'auth'
  | 'voiceManager'
  | 'scriptPreview';

/**
 * Modal state interface - tracks which modals are open
 */
interface ModalState {
  clone: boolean;
  templates: boolean;
  music: boolean;
  audioTags: boolean;
  burgerMenu: boolean;
  howItWorks: boolean;
  library: boolean;
  pricing: boolean;
  aboutUs: boolean;
  terms: boolean;
  privacy: boolean;
  promptMenu: boolean;
  auth: boolean;
  voiceManager: boolean;
  scriptPreview: boolean;
}

// Action types for reducer
type ModalAction =
  | { type: 'OPEN'; modal: ModalType }
  | { type: 'CLOSE'; modal: ModalType }
  | { type: 'TOGGLE'; modal: ModalType }
  | { type: 'SET'; modal: ModalType; value: boolean }
  | { type: 'CLOSE_ALL' };

// Initial state - all modals closed
const initialState: ModalState = {
  clone: false,
  templates: false,
  music: false,
  audioTags: false,
  burgerMenu: false,
  howItWorks: false,
  library: false,
  pricing: false,
  aboutUs: false,
  terms: false,
  privacy: false,
  promptMenu: false,
  auth: false,
  voiceManager: false,
  scriptPreview: false,
};

// Reducer for modal state - more efficient than useState with object
function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'OPEN':
      return state[action.modal] ? state : { ...state, [action.modal]: true };
    case 'CLOSE':
      return !state[action.modal] ? state : { ...state, [action.modal]: false };
    case 'TOGGLE':
      return { ...state, [action.modal]: !state[action.modal] };
    case 'SET':
      return state[action.modal] === action.value ? state : { ...state, [action.modal]: action.value };
    case 'CLOSE_ALL':
      return initialState;
    default:
      return state;
  }
}

/**
 * Dispatch context - stable reference, never changes
 */
type ModalDispatch = React.Dispatch<ModalAction>;
const ModalDispatchContext = createContext<ModalDispatch | undefined>(undefined);

/**
 * State context - changes when modals change
 */
const ModalStateContext = createContext<ModalState | undefined>(undefined);

/**
 * Modal Provider component - wraps the app to provide modal state
 * Uses useReducer for more efficient updates
 */
export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(modalReducer, initialState);

  return (
    <ModalDispatchContext.Provider value={dispatch}>
      <ModalStateContext.Provider value={state}>
        {children}
      </ModalStateContext.Provider>
    </ModalDispatchContext.Provider>
  );
};

/**
 * Hook to get dispatch function - stable reference
 */
function useModalDispatch(): ModalDispatch {
  const dispatch = useContext(ModalDispatchContext);
  if (dispatch === undefined) {
    throw new Error('useModalDispatch must be used within a ModalProvider');
  }
  return dispatch;
}

/**
 * Hook to get modal state
 */
function useModalState(): ModalState {
  const state = useContext(ModalStateContext);
  if (state === undefined) {
    throw new Error('useModalState must be used within a ModalProvider');
  }
  return state;
}

/**
 * Hook for a single modal - only re-renders when this specific modal changes
 * Use this for components that only care about one modal
 */
export function useModal(modal: ModalType): [boolean, (show: boolean) => void] {
  const state = useModalState();
  const dispatch = useModalDispatch();

  const isOpen = state[modal];
  const setOpen = useCallback((show: boolean) => {
    dispatch({ type: 'SET', modal, value: show });
  }, [dispatch, modal]);

  return [isOpen, setOpen];
}

/**
 * Context value interface (for backwards compatibility)
 */
interface ModalContextValue {
  // State
  modals: ModalState;

  // Actions
  openModal: (modal: ModalType) => void;
  closeModal: (modal: ModalType) => void;
  toggleModal: (modal: ModalType) => void;
  closeAllModals: () => void;

  // Convenience getters (for backwards compatibility)
  showCloneModal: boolean;
  showTemplatesModal: boolean;
  showMusicModal: boolean;
  showAudioTagsModal: boolean;
  showBurgerMenu: boolean;
  showHowItWorks: boolean;
  showLibrary: boolean;
  showPricing: boolean;
  showAboutUs: boolean;
  showTerms: boolean;
  showPrivacy: boolean;
  showPromptMenu: boolean;
  showAuthModal: boolean;
  showVoiceManager: boolean;
  showScriptPreview: boolean;

  // Convenience setters (for backwards compatibility)
  setShowCloneModal: (show: boolean) => void;
  setShowTemplatesModal: (show: boolean) => void;
  setShowMusicModal: (show: boolean) => void;
  setShowAudioTagsModal: (show: boolean) => void;
  setShowBurgerMenu: (show: boolean) => void;
  setShowHowItWorks: (show: boolean) => void;
  setShowLibrary: (show: boolean) => void;
  setShowPricing: (show: boolean) => void;
  setShowAboutUs: (show: boolean) => void;
  setShowTerms: (show: boolean) => void;
  setShowPrivacy: (show: boolean) => void;
  setShowPromptMenu: (show: boolean) => void;
  setShowAuthModal: (show: boolean) => void;
  setShowVoiceManager: (show: boolean) => void;
  setShowScriptPreview: (show: boolean) => void;
}

/**
 * Custom hook to access modal context (backwards compatible)
 * For new code, prefer useModal() for single modals to avoid unnecessary re-renders
 */
export const useModals = (): ModalContextValue => {
  const modals = useModalState();
  const dispatch = useModalDispatch();

  // Memoize action creators - these never change
  const openModal = useCallback((modal: ModalType) => {
    dispatch({ type: 'OPEN', modal });
  }, [dispatch]);

  const closeModal = useCallback((modal: ModalType) => {
    dispatch({ type: 'CLOSE', modal });
  }, [dispatch]);

  const toggleModal = useCallback((modal: ModalType) => {
    dispatch({ type: 'TOGGLE', modal });
  }, [dispatch]);

  const closeAllModals = useCallback(() => {
    dispatch({ type: 'CLOSE_ALL' });
  }, [dispatch]);

  // Memoize individual setters - stable references
  const setShowCloneModal = useCallback((show: boolean) => dispatch({ type: 'SET', modal: 'clone', value: show }), [dispatch]);
  const setShowTemplatesModal = useCallback((show: boolean) => dispatch({ type: 'SET', modal: 'templates', value: show }), [dispatch]);
  const setShowMusicModal = useCallback((show: boolean) => dispatch({ type: 'SET', modal: 'music', value: show }), [dispatch]);
  const setShowAudioTagsModal = useCallback((show: boolean) => dispatch({ type: 'SET', modal: 'audioTags', value: show }), [dispatch]);
  const setShowBurgerMenu = useCallback((show: boolean) => dispatch({ type: 'SET', modal: 'burgerMenu', value: show }), [dispatch]);
  const setShowHowItWorks = useCallback((show: boolean) => dispatch({ type: 'SET', modal: 'howItWorks', value: show }), [dispatch]);
  const setShowLibrary = useCallback((show: boolean) => dispatch({ type: 'SET', modal: 'library', value: show }), [dispatch]);
  const setShowPricing = useCallback((show: boolean) => dispatch({ type: 'SET', modal: 'pricing', value: show }), [dispatch]);
  const setShowAboutUs = useCallback((show: boolean) => dispatch({ type: 'SET', modal: 'aboutUs', value: show }), [dispatch]);
  const setShowTerms = useCallback((show: boolean) => dispatch({ type: 'SET', modal: 'terms', value: show }), [dispatch]);
  const setShowPrivacy = useCallback((show: boolean) => dispatch({ type: 'SET', modal: 'privacy', value: show }), [dispatch]);
  const setShowPromptMenu = useCallback((show: boolean) => dispatch({ type: 'SET', modal: 'promptMenu', value: show }), [dispatch]);
  const setShowAuthModal = useCallback((show: boolean) => dispatch({ type: 'SET', modal: 'auth', value: show }), [dispatch]);
  const setShowVoiceManager = useCallback((show: boolean) => dispatch({ type: 'SET', modal: 'voiceManager', value: show }), [dispatch]);
  const setShowScriptPreview = useCallback((show: boolean) => dispatch({ type: 'SET', modal: 'scriptPreview', value: show }), [dispatch]);

  // Memoize the full value object
  return useMemo(() => ({
    modals,
    openModal,
    closeModal,
    toggleModal,
    closeAllModals,

    // Convenience getters
    showCloneModal: modals.clone,
    showTemplatesModal: modals.templates,
    showMusicModal: modals.music,
    showAudioTagsModal: modals.audioTags,
    showBurgerMenu: modals.burgerMenu,
    showHowItWorks: modals.howItWorks,
    showLibrary: modals.library,
    showPricing: modals.pricing,
    showAboutUs: modals.aboutUs,
    showTerms: modals.terms,
    showPrivacy: modals.privacy,
    showPromptMenu: modals.promptMenu,
    showAuthModal: modals.auth,
    showVoiceManager: modals.voiceManager,
    showScriptPreview: modals.scriptPreview,

    // Convenience setters (stable references)
    setShowCloneModal,
    setShowTemplatesModal,
    setShowMusicModal,
    setShowAudioTagsModal,
    setShowBurgerMenu,
    setShowHowItWorks,
    setShowLibrary,
    setShowPricing,
    setShowAboutUs,
    setShowTerms,
    setShowPrivacy,
    setShowPromptMenu,
    setShowAuthModal,
    setShowVoiceManager,
    setShowScriptPreview,
  }), [
    modals,
    openModal,
    closeModal,
    toggleModal,
    closeAllModals,
    setShowCloneModal,
    setShowTemplatesModal,
    setShowMusicModal,
    setShowAudioTagsModal,
    setShowBurgerMenu,
    setShowHowItWorks,
    setShowLibrary,
    setShowPricing,
    setShowAboutUs,
    setShowTerms,
    setShowPrivacy,
    setShowPromptMenu,
    setShowAuthModal,
    setShowVoiceManager,
    setShowScriptPreview,
  ]);
};

/**
 * Hook for checking if any modal is open
 * Useful for preventing background interactions
 */
export const useIsAnyModalOpen = (): boolean => {
  const modals = useModalState();
  return Object.values(modals).some(Boolean);
};

export default ModalStateContext;
