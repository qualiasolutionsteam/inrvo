/**
 * iOS Audio Utilities
 *
 * Handles iOS Safari and Chrome-specific audio quirks:
 * - AudioContext starts suspended and requires user gesture to resume
 * - First audio playback has extra latency (~100-500ms) as hardware spins up
 * - AudioContext can be suspended when app is backgrounded
 * - Missing await on resume() causes race conditions
 *
 * Usage:
 * 1. Call ensureAudioContextResumed() before any source.start()
 * 2. Call warmupAudioContext() after creating AudioContext to reduce first-play latency
 */

/**
 * Ensures AudioContext is resumed and ready for playback.
 * MUST be called before source.start() on iOS.
 *
 * @param audioContext - The AudioContext to resume
 * @returns Promise that resolves when AudioContext is ready
 */
export async function ensureAudioContextResumed(
  audioContext: AudioContext | null
): Promise<boolean> {
  if (!audioContext) return false;

  // If closed, can't resume - caller needs to create a new one
  if (audioContext.state === 'closed') {
    console.warn('[iosAudioUtils] AudioContext is closed, cannot resume');
    return false;
  }

  // If suspended, resume it
  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
      // Small delay to ensure iOS has fully resumed
      await new Promise(resolve => setTimeout(resolve, 10));
    } catch (error) {
      console.warn('[iosAudioUtils] Failed to resume AudioContext:', error);
      return false;
    }
  }

  return audioContext.state === 'running';
}

/**
 * Warms up the AudioContext by playing a silent buffer.
 * This reduces the latency of the first actual audio playback on iOS.
 *
 * Call this immediately after creating an AudioContext from a user gesture.
 *
 * @param audioContext - The AudioContext to warm up
 */
export async function warmupAudioContext(audioContext: AudioContext): Promise<void> {
  if (!audioContext || audioContext.state === 'closed') return;

  try {
    // Ensure context is running
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // Create a tiny silent buffer (1 sample at minimum sample rate)
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
    source.stop(audioContext.currentTime + 0.001);
  } catch (error) {
    // Warmup failure is not critical - just log it
    console.debug('[iosAudioUtils] Warmup failed (non-critical):', error);
  }
}

/**
 * Creates and initializes an AudioContext with iOS optimizations.
 * Should be called from a user gesture handler (click/tap).
 *
 * @returns Initialized AudioContext ready for playback
 */
export async function createOptimizedAudioContext(): Promise<AudioContext> {
  const AudioContextClass = window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  const context = new AudioContextClass();

  // Resume immediately (iOS requirement)
  if (context.state === 'suspended') {
    await context.resume();
  }

  // Warm up to reduce first-play latency
  await warmupAudioContext(context);

  return context;
}

/**
 * Helper to safely start an AudioBufferSourceNode on iOS.
 * Handles resume and provides consistent behavior across browsers.
 *
 * @param audioContext - The AudioContext
 * @param source - The AudioBufferSourceNode to start
 * @param when - Start time (default: 0 = immediately)
 * @param offset - Offset into the buffer (default: 0)
 */
export async function safeSourceStart(
  audioContext: AudioContext,
  source: AudioBufferSourceNode,
  when: number = 0,
  offset: number = 0
): Promise<void> {
  // Ensure context is resumed before starting
  await ensureAudioContextResumed(audioContext);

  // Start the source
  source.start(when, offset);
}

/**
 * Detects if the current browser is iOS Safari or Chrome.
 */
export function isIOSBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  // Check for iOS/iPadOS - use userAgent and maxTouchPoints for iPad detection
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Mac') && navigator.maxTouchPoints > 1);

  return isIOS;
}

/**
 * Detects if the browser requires user gesture for audio playback.
 * Modern iOS Safari/Chrome and some Android browsers have this restriction.
 */
export function requiresUserGestureForAudio(): boolean {
  if (typeof navigator === 'undefined') return true;

  // iOS always requires user gesture
  if (isIOSBrowser()) return true;

  // Chrome on Android may also require it
  const ua = navigator.userAgent;
  if (/Android/.test(ua) && /Chrome/.test(ua)) return true;

  return false;
}
