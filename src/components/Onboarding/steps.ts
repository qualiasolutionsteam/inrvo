/**
 * Onboarding step definitions
 * Each step defines a spotlight target and tooltip content
 */

export interface OnboardingStep {
  id: string;
  targetSelector: string;
  fallbackSelector?: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  route?: string;
  waitForElement?: boolean;
  highlightPadding?: number;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  // Step 0: Welcome (centered modal, no target)
  {
    id: 'welcome',
    targetSelector: '',
    title: 'Welcome to Innrvo',
    description: 'Your personal meditation companion. Let me show you around in 30 seconds.',
    position: 'auto',
    route: '/',
  },

  // Step 1: Voice Agent (main feature)
  {
    id: 'voice-agent',
    targetSelector: '[data-onboarding="agent-chat"]',
    fallbackSelector: '.agent-chat-container',
    title: 'Meet Your Meditation Guide',
    description: 'Describe how you feel, and I\'ll create a personalized meditation just for you.',
    position: 'top',
    route: '/',
    highlightPadding: 12,
  },

  // Step 2: Voice Input Toggle
  {
    id: 'voice-toggle',
    targetSelector: '[data-onboarding="voice-toggle"]',
    fallbackSelector: 'button[aria-label*="voice"]',
    title: 'Speak Your Mind',
    description: 'Tap here to talk to me directly. I\'ll listen and understand your emotional state.',
    position: 'top',
    route: '/',
    highlightPadding: 8,
  },

  // Step 3: Clone Voice Button (MOST IMPORTANT)
  {
    id: 'clone-voice',
    targetSelector: '[data-onboarding="clone-voice"]',
    fallbackSelector: 'a[href="/clone"]',
    title: 'Clone Your Voice',
    description: 'The magic feature! Record 30 seconds of your voice, and meditations will sound like YOU.',
    position: 'bottom',
    route: '/voices',
    waitForElement: true,
    highlightPadding: 16,
  },

  // Step 4: My Voices
  {
    id: 'my-voices',
    targetSelector: '[data-onboarding="voice-list"]',
    fallbackSelector: '.voice-profile-list',
    title: 'Your Voice Collection',
    description: 'All your cloned voices appear here. Select one before generating a meditation.',
    position: 'left',
    route: '/voices',
    highlightPadding: 12,
  },

  // Step 5: Templates
  {
    id: 'templates',
    targetSelector: '[data-onboarding="templates-grid"]',
    fallbackSelector: '.templates-container',
    title: 'Quick Start Templates',
    description: 'Choose from 50+ meditation templates: stress relief, sleep, affirmations, and more.',
    position: 'top',
    route: '/templates',
    waitForElement: true,
    highlightPadding: 16,
  },

  // Step 6: Library
  {
    id: 'library',
    targetSelector: '[data-onboarding="library-list"]',
    fallbackSelector: '.meditation-history-list',
    title: 'Your Meditation Library',
    description: 'All your generated meditations are saved here. Listen anytime, even offline!',
    position: 'top',
    route: '/library',
    waitForElement: true,
    highlightPadding: 12,
  },

  // Step 7: Complete (centered modal)
  {
    id: 'complete',
    targetSelector: '',
    title: 'You\'re All Set!',
    description: 'Ready to create your first meditation? Start by describing how you feel today.',
    position: 'auto',
    route: '/',
  },
];
