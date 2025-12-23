import React, { ReactNode } from 'react';
import { CloneModalProvider, useCloneModals } from './CloneModalContext';
import { SettingsModalProvider, useSettingsModals } from './SettingsModalContext';
import { NavigationModalProvider, useNavigationModals } from './NavigationModalContext';
import { LegalModalProvider, useLegalModals } from './LegalModalContext';
import { AuthModalProvider, useAuthModal } from './AuthModalContext';

// Re-export all hooks
export { useCloneModals } from './CloneModalContext';
export { useSettingsModals } from './SettingsModalContext';
export { useNavigationModals } from './NavigationModalContext';
export { useLegalModals } from './LegalModalContext';
export { useAuthModal } from './AuthModalContext';

// Re-export providers for direct use if needed
export { CloneModalProvider } from './CloneModalContext';
export { SettingsModalProvider } from './SettingsModalContext';
export { NavigationModalProvider } from './NavigationModalContext';
export { LegalModalProvider } from './LegalModalContext';
export { AuthModalProvider } from './AuthModalContext';

interface CombinedModalProviderProps {
  children: ReactNode;
}

/**
 * Combined provider that wraps all modal providers.
 * This replaces the old ModalProvider with granular contexts.
 */
export function CombinedModalProvider({ children }: CombinedModalProviderProps) {
  return (
    <CloneModalProvider>
      <SettingsModalProvider>
        <NavigationModalProvider>
          <LegalModalProvider>
            <AuthModalProvider>
              {children}
            </AuthModalProvider>
          </LegalModalProvider>
        </NavigationModalProvider>
      </SettingsModalProvider>
    </CloneModalProvider>
  );
}

/**
 * Hook to check if any modal is currently open.
 * Useful for preventing background interactions.
 */
export function useIsAnyModalOpen(): boolean {
  const { showCloneModal, showVoiceManager } = useCloneModals();
  const { showMusicModal, showAudioTagsModal, showTemplatesModal } = useSettingsModals();
  const { showBurgerMenu, showHowItWorks, showLibrary, showPromptMenu } = useNavigationModals();
  const { showPricing, showAboutUs, showTerms, showPrivacy } = useLegalModals();
  const { showAuthModal } = useAuthModal();

  return (
    showCloneModal ||
    showVoiceManager ||
    showMusicModal ||
    showAudioTagsModal ||
    showTemplatesModal ||
    showBurgerMenu ||
    showHowItWorks ||
    showLibrary ||
    showPromptMenu ||
    showPricing ||
    showAboutUs ||
    showTerms ||
    showPrivacy ||
    showAuthModal
  );
}

/**
 * Hook to close all modals at once.
 */
export function useCloseAllModals() {
  const { closeCloneModal, closeVoiceManager } = useCloneModals();
  const { closeMusicModal, closeAudioTagsModal, closeTemplatesModal } = useSettingsModals();
  const { closeBurgerMenu, closeHowItWorks, closeLibrary, closePromptMenu } = useNavigationModals();
  const { closePricing, closeAboutUs, closeTerms, closePrivacy } = useLegalModals();
  const { closeAuthModal } = useAuthModal();

  return () => {
    closeCloneModal();
    closeVoiceManager();
    closeMusicModal();
    closeAudioTagsModal();
    closeTemplatesModal();
    closeBurgerMenu();
    closeHowItWorks();
    closeLibrary();
    closePromptMenu();
    closePricing();
    closeAboutUs();
    closeTerms();
    closePrivacy();
    closeAuthModal();
  };
}
