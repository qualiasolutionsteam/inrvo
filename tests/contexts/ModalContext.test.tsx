import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';

// Import after mocking
import { ModalProvider, useModal, useModals, useIsAnyModalOpen, ModalType } from '../../src/contexts/ModalContext';

// Helper wrapper for renderHook
function createWrapper() {
  return ({ children }: { children: ReactNode }) => (
    <ModalProvider>{children}</ModalProvider>
  );
}

describe('ModalContext', () => {
  describe('hooks outside provider', () => {
    it('useModals should throw error when used outside ModalProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useModals());
      }).toThrow('useModalState must be used within a ModalProvider');

      consoleSpy.mockRestore();
    });

    it('useModal should throw error when used outside ModalProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useModal('clone'));
      }).toThrow('useModalState must be used within a ModalProvider');

      consoleSpy.mockRestore();
    });

    it('useIsAnyModalOpen should throw error when used outside ModalProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useIsAnyModalOpen());
      }).toThrow('useModalState must be used within a ModalProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('initial state', () => {
    it('should have all modals closed initially', () => {
      const { result } = renderHook(() => useModals(), {
        wrapper: createWrapper(),
      });

      expect(result.current.showCloneModal).toBe(false);
      expect(result.current.showTemplatesModal).toBe(false);
      expect(result.current.showMusicModal).toBe(false);
      expect(result.current.showAudioTagsModal).toBe(false);
      expect(result.current.showBurgerMenu).toBe(false);
      expect(result.current.showHowItWorks).toBe(false);
      expect(result.current.showLibrary).toBe(false);
      expect(result.current.showPricing).toBe(false);
      expect(result.current.showAboutUs).toBe(false);
      expect(result.current.showTerms).toBe(false);
      expect(result.current.showPrivacy).toBe(false);
      expect(result.current.showPromptMenu).toBe(false);
      expect(result.current.showAuthModal).toBe(false);
      expect(result.current.showVoiceManager).toBe(false);
      expect(result.current.showScriptPreview).toBe(false);
    });

    it('should have modals object with all false values', () => {
      const { result } = renderHook(() => useModals(), {
        wrapper: createWrapper(),
      });

      const allClosed = Object.values(result.current.modals).every(v => v === false);
      expect(allClosed).toBe(true);
    });
  });

  describe('useModal hook', () => {
    it('should return current state and setter', () => {
      const { result } = renderHook(() => useModal('clone'), {
        wrapper: createWrapper(),
      });

      const [isOpen, setOpen] = result.current;
      expect(isOpen).toBe(false);
      expect(typeof setOpen).toBe('function');
    });

    it('should open modal', () => {
      const { result } = renderHook(() => useModal('clone'), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current[1](true);
      });

      expect(result.current[0]).toBe(true);
    });

    it('should close modal', () => {
      const { result } = renderHook(() => useModal('clone'), {
        wrapper: createWrapper(),
      });

      // Open first
      act(() => {
        result.current[1](true);
      });

      // Then close
      act(() => {
        result.current[1](false);
      });

      expect(result.current[0]).toBe(false);
    });
  });

  describe('useModals hook - openModal', () => {
    it('should open clone modal', () => {
      const { result } = renderHook(() => useModals(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openModal('clone');
      });

      expect(result.current.showCloneModal).toBe(true);
      expect(result.current.modals.clone).toBe(true);
    });

    it('should open templates modal', () => {
      const { result } = renderHook(() => useModals(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openModal('templates');
      });

      expect(result.current.showTemplatesModal).toBe(true);
    });

    it('should open auth modal', () => {
      const { result } = renderHook(() => useModals(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openModal('auth');
      });

      expect(result.current.showAuthModal).toBe(true);
    });

    it('should not create new state if modal already open', () => {
      const { result } = renderHook(() => useModals(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openModal('clone');
      });

      const stateAfterFirstOpen = result.current.modals;

      act(() => {
        result.current.openModal('clone');
      });

      // State reference should be the same if nothing changed
      expect(result.current.modals).toBe(stateAfterFirstOpen);
    });
  });

  describe('useModals hook - closeModal', () => {
    it('should close an open modal', () => {
      const { result } = renderHook(() => useModals(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openModal('clone');
      });

      expect(result.current.showCloneModal).toBe(true);

      act(() => {
        result.current.closeModal('clone');
      });

      expect(result.current.showCloneModal).toBe(false);
    });

    it('should not create new state if modal already closed', () => {
      const { result } = renderHook(() => useModals(), {
        wrapper: createWrapper(),
      });

      const initialState = result.current.modals;

      act(() => {
        result.current.closeModal('clone');
      });

      // State reference should be the same if nothing changed
      expect(result.current.modals).toBe(initialState);
    });
  });

  describe('useModals hook - toggleModal', () => {
    it('should toggle modal from closed to open', () => {
      const { result } = renderHook(() => useModals(), {
        wrapper: createWrapper(),
      });

      expect(result.current.showCloneModal).toBe(false);

      act(() => {
        result.current.toggleModal('clone');
      });

      expect(result.current.showCloneModal).toBe(true);
    });

    it('should toggle modal from open to closed', () => {
      const { result } = renderHook(() => useModals(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openModal('clone');
      });

      expect(result.current.showCloneModal).toBe(true);

      act(() => {
        result.current.toggleModal('clone');
      });

      expect(result.current.showCloneModal).toBe(false);
    });
  });

  describe('useModals hook - closeAllModals', () => {
    it('should close all open modals', () => {
      const { result } = renderHook(() => useModals(), {
        wrapper: createWrapper(),
      });

      // Open multiple modals
      act(() => {
        result.current.openModal('clone');
        result.current.openModal('templates');
        result.current.openModal('auth');
        result.current.openModal('burgerMenu');
      });

      expect(result.current.showCloneModal).toBe(true);
      expect(result.current.showTemplatesModal).toBe(true);
      expect(result.current.showAuthModal).toBe(true);
      expect(result.current.showBurgerMenu).toBe(true);

      act(() => {
        result.current.closeAllModals();
      });

      const allClosed = Object.values(result.current.modals).every(v => v === false);
      expect(allClosed).toBe(true);
    });
  });

  describe('convenience setters', () => {
    const modalSetterPairs: Array<{
      modal: ModalType;
      getter: keyof ReturnType<typeof useModals>;
      setter: keyof ReturnType<typeof useModals>;
    }> = [
      { modal: 'clone', getter: 'showCloneModal', setter: 'setShowCloneModal' },
      { modal: 'templates', getter: 'showTemplatesModal', setter: 'setShowTemplatesModal' },
      { modal: 'music', getter: 'showMusicModal', setter: 'setShowMusicModal' },
      { modal: 'audioTags', getter: 'showAudioTagsModal', setter: 'setShowAudioTagsModal' },
      { modal: 'burgerMenu', getter: 'showBurgerMenu', setter: 'setShowBurgerMenu' },
      { modal: 'howItWorks', getter: 'showHowItWorks', setter: 'setShowHowItWorks' },
      { modal: 'library', getter: 'showLibrary', setter: 'setShowLibrary' },
      { modal: 'pricing', getter: 'showPricing', setter: 'setShowPricing' },
      { modal: 'aboutUs', getter: 'showAboutUs', setter: 'setShowAboutUs' },
      { modal: 'terms', getter: 'showTerms', setter: 'setShowTerms' },
      { modal: 'privacy', getter: 'showPrivacy', setter: 'setShowPrivacy' },
      { modal: 'promptMenu', getter: 'showPromptMenu', setter: 'setShowPromptMenu' },
      { modal: 'auth', getter: 'showAuthModal', setter: 'setShowAuthModal' },
      { modal: 'voiceManager', getter: 'showVoiceManager', setter: 'setShowVoiceManager' },
      { modal: 'scriptPreview', getter: 'showScriptPreview', setter: 'setShowScriptPreview' },
    ];

    modalSetterPairs.forEach(({ modal, getter, setter }) => {
      it(`should open ${modal} modal via ${setter}`, () => {
        const { result } = renderHook(() => useModals(), {
          wrapper: createWrapper(),
        });

        expect(result.current[getter]).toBe(false);

        act(() => {
          (result.current[setter] as (show: boolean) => void)(true);
        });

        expect(result.current[getter]).toBe(true);
      });

      it(`should close ${modal} modal via ${setter}`, () => {
        const { result } = renderHook(() => useModals(), {
          wrapper: createWrapper(),
        });

        act(() => {
          (result.current[setter] as (show: boolean) => void)(true);
        });

        expect(result.current[getter]).toBe(true);

        act(() => {
          (result.current[setter] as (show: boolean) => void)(false);
        });

        expect(result.current[getter]).toBe(false);
      });
    });
  });

  describe('useIsAnyModalOpen hook', () => {
    it('should return false when no modals are open', () => {
      const { result } = renderHook(() => useIsAnyModalOpen(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe(false);
    });

    it('should return true when one modal is open', () => {
      // Test both hooks together in a single render
      const { result } = renderHook(
        () => ({
          modals: useModals(),
          anyOpen: useIsAnyModalOpen(),
        }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.modals.openModal('clone');
      });

      expect(result.current.anyOpen).toBe(true);
    });

    it('should return true when multiple modals are open', () => {
      const { result } = renderHook(
        () => ({
          modals: useModals(),
          anyOpen: useIsAnyModalOpen(),
        }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.modals.openModal('clone');
        result.current.modals.openModal('auth');
      });

      expect(result.current.anyOpen).toBe(true);
    });

    it('should return false after all modals are closed', () => {
      const { result } = renderHook(
        () => ({
          modals: useModals(),
          anyOpen: useIsAnyModalOpen(),
        }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.modals.openModal('clone');
        result.current.modals.openModal('auth');
      });

      expect(result.current.anyOpen).toBe(true);

      act(() => {
        result.current.modals.closeAllModals();
      });

      expect(result.current.anyOpen).toBe(false);
    });
  });

  describe('multiple modals interaction', () => {
    it('should allow multiple modals to be open simultaneously', () => {
      const { result } = renderHook(() => useModals(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openModal('clone');
        result.current.openModal('templates');
      });

      expect(result.current.showCloneModal).toBe(true);
      expect(result.current.showTemplatesModal).toBe(true);
      expect(result.current.showAuthModal).toBe(false);
    });

    it('should close specific modal without affecting others', () => {
      const { result } = renderHook(() => useModals(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openModal('clone');
        result.current.openModal('templates');
        result.current.openModal('auth');
      });

      act(() => {
        result.current.closeModal('templates');
      });

      expect(result.current.showCloneModal).toBe(true);
      expect(result.current.showTemplatesModal).toBe(false);
      expect(result.current.showAuthModal).toBe(true);
    });
  });

  describe('reducer optimization', () => {
    it('SET action should not change state if value is same', () => {
      const { result } = renderHook(() => useModals(), {
        wrapper: createWrapper(),
      });

      const initialState = result.current.modals;

      // Set to same value (false when already false)
      act(() => {
        result.current.setShowCloneModal(false);
      });

      expect(result.current.modals).toBe(initialState);
    });
  });
});
