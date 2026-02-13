/**
 * Innrvo Agent Utilities
 *
 * Greeting messages, quick prompts, and other utility functions
 * used by the MeditationAgent and UI components.
 */

// ============================================================================
// GREETING MESSAGES
// ============================================================================

export const GREETING_MESSAGES = [
  "Hey there.",
  "Hi.",
  "Hello.",
  "Hey.",
  "Good to see you.",
  "Welcome back.",
  "I'm here.",
  "Ready when you are.",
  "Take your time.",
  "Breathe. I'm listening.",
];

export function getRandomGreeting(): string {
  return GREETING_MESSAGES[Math.floor(Math.random() * GREETING_MESSAGES.length)]!;
}

// ============================================================================
// QUICK PROMPTS FOR UI
// ============================================================================

export const QUICK_PROMPTS = [
  { label: "I'm feeling anxious", icon: "waves" },
  { label: "I can't sleep", icon: "moon" },
  { label: "I'm stressed", icon: "cloud" },
  { label: "Just want to talk", icon: "heart" },
  { label: "Need some calm", icon: "lotus" },
  { label: "Create a meditation", icon: "sparkle" },
];

// ============================================================================
// DEBUG LOGGING
// ============================================================================

// Debug logging - only enabled in development
export const DEBUG = import.meta.env?.DEV ?? false;

export function debugLog(message: string, data?: Record<string, unknown>): void {
  if (DEBUG) {
    console.log(`[MeditationAgent] ${message}`, data || '');
  }
}

export function debugWarn(message: string, data?: Record<string, unknown>): void {
  if (DEBUG) {
    console.warn(`[MeditationAgent] ${message}`, data || '');
  }
}
