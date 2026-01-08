import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VoiceProfile } from '../../types';

// Mock dependencies before importing voiceService
vi.mock('../../src/lib/webSpeechService', () => ({
  webSpeechService: {
    speak: vi.fn().mockResolvedValue(undefined),
  },
  isWebSpeechAvailable: vi.fn().mockReturnValue(true),
}));

vi.mock('../../src/lib/edgeFunctions', () => ({
  generateSpeech: vi.fn().mockResolvedValue('base64audiodata'),
}));

// Import after mocking
import { voiceService, needsReclone } from '../../src/lib/voiceService';
import { isWebSpeechAvailable } from '../../src/lib/webSpeechService';

// Helper to create mock voice profiles
function createVoiceProfile(overrides: Partial<VoiceProfile> = {}): VoiceProfile {
  return {
    id: 'test-voice-id',
    name: 'Test Voice',
    voiceName: 'Test Voice',
    description: 'Test voice description',
    provider: 'elevenlabs',
    isCloned: false,
    ...overrides,
  } as VoiceProfile;
}

describe('voiceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectProvider', () => {
    it('should detect browser voices by id prefix', () => {
      const voice = createVoiceProfile({ id: 'browser-english-us' });
      expect(voiceService.detectProvider(voice)).toBe('browser');
    });

    it('should detect elevenlabs preset voices by id prefix', () => {
      const voice = createVoiceProfile({ id: 'elevenlabs-rachel' });
      expect(voiceService.detectProvider(voice)).toBe('elevenlabs');
    });

    it('should detect elevenlabs voices with elevenLabsVoiceId', () => {
      const voice = createVoiceProfile({
        id: 'custom-voice-id',
        elevenLabsVoiceId: 'xi-voice-123',
      });
      expect(voiceService.detectProvider(voice)).toBe('elevenlabs');
    });

    it('should fallback to browser for legacy fish-audio voices', () => {
      const voice = createVoiceProfile({
        provider: 'fish-audio' as any,
        elevenLabsVoiceId: undefined,
      });
      expect(voiceService.detectProvider(voice)).toBe('browser');
    });

    it('should fallback to browser for legacy chatterbox voices', () => {
      const voice = createVoiceProfile({
        provider: 'chatterbox' as any,
        elevenLabsVoiceId: undefined,
      });
      expect(voiceService.detectProvider(voice)).toBe('browser');
    });

    it('should detect elevenlabs for cloned voices with elevenLabsVoiceId', () => {
      const voice = createVoiceProfile({
        isCloned: true,
        elevenLabsVoiceId: 'xi-cloned-voice-123',
      });
      expect(voiceService.detectProvider(voice)).toBe('elevenlabs');
    });

    it('should fallback to browser for voices without proper setup', () => {
      const voice = createVoiceProfile({
        id: 'some-voice',
        provider: undefined,
        elevenLabsVoiceId: undefined,
        isCloned: false,
      });
      expect(voiceService.detectProvider(voice)).toBe('browser');
    });
  });

  describe('needsReclone', () => {
    it('should return true for fish-audio voices without elevenLabsVoiceId', () => {
      const voice = createVoiceProfile({
        provider: 'fish-audio' as any,
        elevenLabsVoiceId: undefined,
      });
      expect(needsReclone(voice)).toBe(true);
    });

    it('should return true for chatterbox voices without elevenLabsVoiceId', () => {
      const voice = createVoiceProfile({
        provider: 'chatterbox' as any,
        elevenLabsVoiceId: undefined,
      });
      expect(needsReclone(voice)).toBe(true);
    });

    it('should return true for voices with NEEDS_RECLONE status', () => {
      const voice = createVoiceProfile({
        cloningStatus: 'NEEDS_RECLONE',
      });
      expect(needsReclone(voice)).toBe(true);
    });

    it('should return true for cloned voices without elevenLabsVoiceId', () => {
      const voice = createVoiceProfile({
        isCloned: true,
        elevenLabsVoiceId: undefined,
      });
      expect(needsReclone(voice)).toBe(true);
    });

    it('should return false for fish-audio voices with elevenLabsVoiceId', () => {
      const voice = createVoiceProfile({
        provider: 'fish-audio' as any,
        elevenLabsVoiceId: 'xi-migrated-voice',
      });
      expect(needsReclone(voice)).toBe(false);
    });

    it('should return false for elevenlabs voices', () => {
      const voice = createVoiceProfile({
        provider: 'elevenlabs',
        elevenLabsVoiceId: 'xi-voice-123',
      });
      expect(needsReclone(voice)).toBe(false);
    });

    it('should return false for browser voices', () => {
      const voice = createVoiceProfile({
        id: 'browser-english-us',
        provider: 'browser',
      });
      expect(needsReclone(voice)).toBe(false);
    });
  });

  describe('isVoiceReady', () => {
    it('should check Web Speech availability for browser voices', async () => {
      const voice = createVoiceProfile({ id: 'browser-english-us' });
      const ready = await voiceService.isVoiceReady(voice);
      expect(typeof ready).toBe('boolean');
    });

    it('should return false for browser voices when Web Speech is unavailable', async () => {
      vi.mocked(isWebSpeechAvailable).mockReturnValue(false);
      const voice = createVoiceProfile({ id: 'browser-english-us' });
      const ready = await voiceService.isVoiceReady(voice);
      expect(ready).toBe(false);
    });

    it('should return true for elevenlabs voices with elevenLabsVoiceId', async () => {
      const voice = createVoiceProfile({
        provider: 'elevenlabs',
        elevenLabsVoiceId: 'xi-voice-123',
      });
      const ready = await voiceService.isVoiceReady(voice);
      expect(ready).toBe(true);
    });

    it('should return false for elevenlabs voices without elevenLabsVoiceId', async () => {
      const voice = createVoiceProfile({
        provider: 'elevenlabs',
        elevenLabsVoiceId: undefined,
      });
      const ready = await voiceService.isVoiceReady(voice);
      expect(ready).toBe(false);
    });

    it('should return false for voices that need recloning', async () => {
      const voice = createVoiceProfile({
        provider: 'fish-audio' as any,
        cloningStatus: 'NEEDS_RECLONE',
      });
      const ready = await voiceService.isVoiceReady(voice);
      expect(ready).toBe(false);
    });
  });

  describe('getEstimatedCost', () => {
    it('should return clone cost for cloning operations', () => {
      const cost = voiceService.getEstimatedCost('', true);
      expect(cost).toBe(5000);
    });

    it('should calculate TTS cost based on character count', () => {
      const text = 'a'.repeat(1000);
      const cost = voiceService.getEstimatedCost(text, false);
      expect(cost).toBe(300); // 300 per 1K chars for ElevenLabs
    });

    it('should round up for partial thousands', () => {
      const text = 'a'.repeat(1001);
      const cost = voiceService.getEstimatedCost(text, false);
      expect(cost).toBe(301); // Rounds up
    });

    it('should return 0 for empty text', () => {
      const cost = voiceService.getEstimatedCost('', false);
      expect(cost).toBe(0);
    });

    it('should calculate cost for typical meditation (2000 chars)', () => {
      const text = 'a'.repeat(2000);
      const cost = voiceService.getEstimatedCost(text, false);
      expect(cost).toBe(600);
    });
  });

  describe('decodeAudio', () => {
    it('should decode base64 audio to AudioBuffer', async () => {
      const audioContext = new AudioContext();
      // Simple base64 encoded data
      const base64 = btoa('test audio data');

      const buffer = await voiceService.decodeAudio(base64, audioContext);

      expect(buffer).toBeDefined();
      expect(buffer.duration).toBeGreaterThan(0);
    });

    it('should throw on invalid base64 data', async () => {
      const audioContext = new AudioContext();
      // Invalid base64 will fail during decoding
      await expect(voiceService.decodeAudio('not-valid-base64!!!', audioContext))
        .rejects.toThrow();
    });
  });
});

// Test the internal text processing functions
// ElevenLabs uses ellipses for pauses, not Fish Audio effects
describe('Text Processing (via generateSpeech)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should convert pause tags to ellipses for ElevenLabs', async () => {
    const { generateSpeech } = await import('../../src/lib/edgeFunctions');
    const voice = createVoiceProfile({
      provider: 'elevenlabs',
      elevenLabsVoiceId: 'xi-voice-123',
    });

    await voiceService.generateSpeech('[pause] Hello [long pause] world', voice);

    // Check that generateSpeech was called with converted tags
    expect(generateSpeech).toHaveBeenCalled();
    const callArg = vi.mocked(generateSpeech).mock.calls[0][1];
    expect(callArg).toContain('...'); // [pause] -> ...
    expect(callArg).not.toContain('[pause]');
    expect(callArg).not.toContain('[long pause]');
  });

  it('should convert deep breath tags to descriptive text', async () => {
    const { generateSpeech } = await import('../../src/lib/edgeFunctions');
    const voice = createVoiceProfile({
      provider: 'elevenlabs',
      elevenLabsVoiceId: 'xi-voice-123',
    });

    await voiceService.generateSpeech('[deep breath] Relax.', voice);

    const callArg = vi.mocked(generateSpeech).mock.calls[0][1];
    // V3 format: '[sighs] Take a deep breath... [sighs]' (with capital T)
    expect(callArg.toLowerCase()).toContain('take a deep breath');
    expect(callArg).not.toContain('[deep breath]');
  });

  it('should convert exhale tags to descriptive text', async () => {
    const { generateSpeech } = await import('../../src/lib/edgeFunctions');
    const voice = createVoiceProfile({
      provider: 'elevenlabs',
      elevenLabsVoiceId: 'xi-voice-123',
    });

    await voiceService.generateSpeech('[exhale slowly] Now rest.', voice);

    const callArg = vi.mocked(generateSpeech).mock.calls[0][1];
    expect(callArg).toContain('exhale slowly');
    expect(callArg).not.toContain('[exhale slowly]');
  });

  it('should strip unknown audio tags', async () => {
    const { generateSpeech } = await import('../../src/lib/edgeFunctions');
    const voice = createVoiceProfile({
      provider: 'elevenlabs',
      elevenLabsVoiceId: 'xi-voice-123',
    });

    await voiceService.generateSpeech('[unknown tag] Hello [another one]', voice);

    const callArg = vi.mocked(generateSpeech).mock.calls[0][1];
    expect(callArg).not.toContain('[unknown tag]');
    expect(callArg).not.toContain('[another one]');
    expect(callArg).toContain('Hello');
  });

  it('should return needsReclone flag for legacy voices', async () => {
    const voice = createVoiceProfile({
      provider: 'fish-audio' as any,
      elevenLabsVoiceId: undefined,
    });

    const result = await voiceService.generateSpeech('Hello world', voice);

    expect(result.needsReclone).toBe(true);
    expect(result.audioBuffer).toBeNull();
    expect(result.base64).toBe('');
  });
});
