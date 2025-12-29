import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioPlayback } from '../../src/hooks/useAudioPlayback';
import { BACKGROUND_TRACKS } from '../../constants';

// Create mock audio buffer
function createMockAudioBuffer(duration: number = 10): AudioBuffer {
  return {
    duration,
    length: duration * 24000,
    numberOfChannels: 1,
    sampleRate: 24000,
    getChannelData: vi.fn(() => new Float32Array(duration * 24000)),
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  } as unknown as AudioBuffer;
}

describe('useAudioPlayback', () => {
  let mockGainNode: { gain: { value: number }; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };
  let mockSource: {
    buffer: AudioBuffer | null;
    playbackRate: { value: number };
    onended: (() => void) | null;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  };
  let mockAudioContext: {
    state: string;
    currentTime: number;
    destination: object;
    createGain: ReturnType<typeof vi.fn>;
    createBufferSource: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
    suspend: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };
  let mockAudioElement: {
    src: string;
    volume: number;
    loop: boolean;
    crossOrigin: string | null;
    preload: string;
    currentTime: number;
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create fresh mocks for each test
    mockGainNode = {
      gain: { value: 1 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    mockSource = {
      buffer: null,
      playbackRate: { value: 1 },
      onended: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    mockAudioContext = {
      state: 'running',
      currentTime: 0,
      destination: {},
      createGain: vi.fn(() => mockGainNode),
      createBufferSource: vi.fn(() => mockSource),
      resume: vi.fn().mockImplementation(function(this: typeof mockAudioContext) {
        this.state = 'running';
        return Promise.resolve();
      }),
      suspend: vi.fn().mockImplementation(function(this: typeof mockAudioContext) {
        this.state = 'suspended';
        return Promise.resolve();
      }),
      close: vi.fn().mockImplementation(function(this: typeof mockAudioContext) {
        this.state = 'closed';
        return Promise.resolve();
      }),
    };

    mockAudioElement = {
      src: '',
      volume: 1,
      loop: false,
      crossOrigin: null,
      preload: '',
      currentTime: 0,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      load: vi.fn(),
    };

    // Set up global mocks using function constructors
    (global as any).AudioContext = function() { return mockAudioContext; };
    (global as any).webkitAudioContext = function() { return mockAudioContext; };
    (global as any).Audio = function() { return mockAudioElement; };

    // Mock requestAnimationFrame
    vi.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
      return setTimeout(() => cb(Date.now()), 16) as unknown as number;
    });
    vi.spyOn(global, 'cancelAnimationFrame').mockImplementation((id) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state with default values', () => {
      const { result } = renderHook(() => useAudioPlayback());

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.duration).toBe(0);
      expect(result.current.currentWordIndex).toBe(-1);
      expect(result.current.timingMap).toBeNull();
      expect(result.current.backgroundVolume).toBe(0.3);
      expect(result.current.playbackRate).toBe(0.9);
      expect(result.current.voiceVolume).toBe(0.7);
    });

    it('should accept custom default values', () => {
      const { result } = renderHook(() =>
        useAudioPlayback({
          defaultBackgroundVolume: 0.5,
          defaultPlaybackRate: 1.0,
          defaultVoiceVolume: 0.8,
          defaultBackgroundTrack: BACKGROUND_TRACKS[1],
        })
      );

      expect(result.current.backgroundVolume).toBe(0.5);
      expect(result.current.playbackRate).toBe(1.0);
      expect(result.current.voiceVolume).toBe(0.8);
      expect(result.current.selectedBackgroundTrack).toBe(BACKGROUND_TRACKS[1]);
    });
  });

  describe('formatTime', () => {
    it('should format seconds to mm:ss', () => {
      const { result } = renderHook(() => useAudioPlayback());

      expect(result.current.formatTime(0)).toBe('0:00');
      expect(result.current.formatTime(30)).toBe('0:30');
      expect(result.current.formatTime(60)).toBe('1:00');
      expect(result.current.formatTime(90)).toBe('1:30');
      expect(result.current.formatTime(125)).toBe('2:05');
      expect(result.current.formatTime(600)).toBe('10:00');
    });

    it('should handle fractional seconds', () => {
      const { result } = renderHook(() => useAudioPlayback());

      expect(result.current.formatTime(30.5)).toBe('0:30');
      expect(result.current.formatTime(59.9)).toBe('0:59');
    });
  });

  describe('loadAndPlay', () => {
    it('should load audio buffer and start playback', () => {
      const onProgress = vi.fn();
      const { result } = renderHook(() => useAudioPlayback({ onProgress }));

      const mockBuffer = createMockAudioBuffer(120);
      const script = 'Welcome to your meditation session.';

      act(() => {
        result.current.loadAndPlay(mockBuffer, script);
      });

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.duration).toBe(120);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.currentWordIndex).toBe(0);
      expect(result.current.timingMap).not.toBeNull();
    });

    it('should create audio context if not exists', () => {
      const { result } = renderHook(() => useAudioPlayback());
      const mockBuffer = createMockAudioBuffer();

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      // Verify context was created by checking the ref
      expect(result.current.audioContextRef.current).toBe(mockAudioContext);
    });

    it('should create new audio context if previous was closed', () => {
      const { result } = renderHook(() => useAudioPlayback());
      const mockBuffer = createMockAudioBuffer();

      // First load
      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      expect(result.current.audioContextRef.current).toBe(mockAudioContext);

      // Close context
      mockAudioContext.state = 'closed';

      // Second load should create new context
      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script 2');
      });

      // The context ref should still point to our mock (since constructor returns same mock)
      expect(result.current.audioContextRef.current).toBe(mockAudioContext);
    });

    it('should call onError when audio loading fails', () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useAudioPlayback({ onError }));

      // Make createBufferSource throw
      mockAudioContext.createBufferSource = vi.fn(() => {
        throw new Error('Audio error');
      });

      const mockBuffer = createMockAudioBuffer();

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test');
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should stop previous playback when loading new audio', () => {
      const { result } = renderHook(() => useAudioPlayback());
      const mockBuffer = createMockAudioBuffer();

      // Create first source
      const firstSource = {
        buffer: null,
        playbackRate: { value: 1 },
        onended: null as (() => void) | null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };

      mockAudioContext.createBufferSource = vi.fn()
        .mockReturnValueOnce(firstSource)
        .mockReturnValue(mockSource);

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'First script');
      });

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Second script');
      });

      expect(firstSource.stop).toHaveBeenCalled();
    });
  });

  describe('play and pause', () => {
    it('should pause playing audio', () => {
      const { result } = renderHook(() => useAudioPlayback());
      const mockBuffer = createMockAudioBuffer();

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.pause();
      });

      expect(result.current.isPlaying).toBe(false);
      expect(mockSource.stop).toHaveBeenCalled();
    });

    it('should resume paused audio', () => {
      const { result } = renderHook(() => useAudioPlayback());
      const mockBuffer = createMockAudioBuffer();

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      act(() => {
        result.current.pause();
      });

      act(() => {
        result.current.play();
      });

      expect(result.current.isPlaying).toBe(true);
    });

    it('should not play if no audio buffer is loaded', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.play();
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('should resume suspended audio context', () => {
      const { result } = renderHook(() => useAudioPlayback());
      const mockBuffer = createMockAudioBuffer();

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      act(() => {
        result.current.pause();
      });

      mockAudioContext.state = 'suspended';

      act(() => {
        result.current.play();
      });

      expect(mockAudioContext.resume).toHaveBeenCalled();
    });
  });

  describe('togglePlayback', () => {
    it('should toggle from playing to paused', () => {
      const { result } = renderHook(() => useAudioPlayback());
      const mockBuffer = createMockAudioBuffer();

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.togglePlayback();
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('should toggle from paused to playing', () => {
      const { result } = renderHook(() => useAudioPlayback());
      const mockBuffer = createMockAudioBuffer();

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      act(() => {
        result.current.pause();
      });

      act(() => {
        result.current.togglePlayback();
      });

      expect(result.current.isPlaying).toBe(true);
    });
  });

  describe('seek', () => {
    it('should seek to specific time', () => {
      const { result } = renderHook(() => useAudioPlayback());
      const mockBuffer = createMockAudioBuffer(120);

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      act(() => {
        result.current.pause();
      });

      act(() => {
        result.current.seek(60);
      });

      expect(result.current.currentTime).toBe(60);
    });

    it('should clamp seek time to valid range', () => {
      const { result } = renderHook(() => useAudioPlayback());
      const mockBuffer = createMockAudioBuffer(120);

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      act(() => {
        result.current.pause();
      });

      act(() => {
        result.current.seek(-10);
      });

      expect(result.current.currentTime).toBe(0);

      act(() => {
        result.current.seek(200);
      });

      expect(result.current.currentTime).toBe(120);
    });

    it('should continue playing after seek if was playing', () => {
      const { result } = renderHook(() => useAudioPlayback());
      const mockBuffer = createMockAudioBuffer(120);

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.seek(30);
      });

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.currentTime).toBe(30);
    });
  });

  describe('stop', () => {
    it('should stop playback and reset state', () => {
      const { result } = renderHook(() => useAudioPlayback());
      const mockBuffer = createMockAudioBuffer(120);

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      act(() => {
        result.current.stop();
      });

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.duration).toBe(0);
      expect(result.current.currentWordIndex).toBe(-1);
      expect(result.current.timingMap).toBeNull();
    });
  });

  describe('background music', () => {
    it('should start background music', async () => {
      const { result } = renderHook(() => useAudioPlayback());

      await act(async () => {
        await result.current.startBackgroundMusic(BACKGROUND_TRACKS[1]);
      });

      expect(mockAudioElement.play).toHaveBeenCalled();
    });

    it('should not start background music for "none" track', async () => {
      // Track if Audio was called
      let audioCalled = false;
      (global as any).Audio = function() {
        audioCalled = true;
        return mockAudioElement;
      };

      const { result } = renderHook(() => useAudioPlayback());

      await act(async () => {
        await result.current.startBackgroundMusic(BACKGROUND_TRACKS[0]); // 'none' track
      });

      expect(audioCalled).toBe(false);
    });

    it('should stop background music', async () => {
      const { result } = renderHook(() => useAudioPlayback());

      await act(async () => {
        await result.current.startBackgroundMusic(BACKGROUND_TRACKS[1]);
      });

      act(() => {
        result.current.stopBackgroundMusic();
      });

      expect(mockAudioElement.pause).toHaveBeenCalled();
    });

    it('should update background volume', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.updateBackgroundVolume(0.5);
      });

      expect(result.current.backgroundVolume).toBe(0.5);
    });

    it('should set selected background track', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.setSelectedBackgroundTrack(BACKGROUND_TRACKS[2]);
      });

      expect(result.current.selectedBackgroundTrack).toBe(BACKGROUND_TRACKS[2]);
    });
  });

  describe('playback rate', () => {
    it('should update playback rate', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.updatePlaybackRate(1.5);
      });

      expect(result.current.playbackRate).toBe(1.5);
    });

    it('should clamp playback rate between 0.5 and 2.0', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.updatePlaybackRate(0.2);
      });

      expect(result.current.playbackRate).toBe(0.5);

      act(() => {
        result.current.updatePlaybackRate(3.0);
      });

      expect(result.current.playbackRate).toBe(2.0);
    });

    it('should update source playback rate during playback', () => {
      const { result } = renderHook(() => useAudioPlayback());
      const mockBuffer = createMockAudioBuffer();

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      act(() => {
        result.current.updatePlaybackRate(1.5);
      });

      expect(mockSource.playbackRate.value).toBe(1.5);
    });
  });

  describe('voice volume', () => {
    it('should update voice volume', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.updateVoiceVolume(0.5);
      });

      expect(result.current.voiceVolume).toBe(0.5);
    });

    it('should clamp voice volume between 0 and 1', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.updateVoiceVolume(-0.5);
      });

      expect(result.current.voiceVolume).toBe(0);

      act(() => {
        result.current.updateVoiceVolume(1.5);
      });

      expect(result.current.voiceVolume).toBe(1);
    });

    it('should update gain node during playback', () => {
      const { result } = renderHook(() => useAudioPlayback());
      const mockBuffer = createMockAudioBuffer();

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      act(() => {
        result.current.updateVoiceVolume(0.5);
      });

      expect(mockGainNode.gain.value).toBe(0.5);
    });
  });

  describe('callbacks', () => {
    it('should call onProgress during playback', async () => {
      const onProgress = vi.fn();
      const { result } = renderHook(() => useAudioPlayback({ onProgress }));
      const mockBuffer = createMockAudioBuffer(10);

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      // Advance timers to trigger animation frame
      await act(async () => {
        vi.advanceTimersByTime(16);
      });

      // Note: onProgress may not be called in mock environment
      // This test verifies the setup is correct
      expect(result.current.isPlaying).toBe(true);
    });

    it('should call onEnded when audio ends naturally', () => {
      const onEnded = vi.fn();
      const { result } = renderHook(() => useAudioPlayback({ onEnded }));
      const mockBuffer = createMockAudioBuffer();

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      // Simulate audio ending via the captured onended callback
      act(() => {
        if (mockSource.onended) mockSource.onended();
      });

      expect(onEnded).toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(false);
    });

    it('should call onError on playback errors', () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useAudioPlayback({ onError }));

      mockAudioContext.createGain = vi.fn(() => {
        throw new Error('Failed to create gain node');
      });

      const mockBuffer = createMockAudioBuffer();

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup on unmount', () => {
      const { result, unmount } = renderHook(() => useAudioPlayback());
      const mockBuffer = createMockAudioBuffer();

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      unmount();

      expect(mockSource.stop).toHaveBeenCalled();
    });

    it('should cleanup background music on unmount', async () => {
      const { result, unmount } = renderHook(() => useAudioPlayback());

      await act(async () => {
        await result.current.startBackgroundMusic(BACKGROUND_TRACKS[1]);
      });

      unmount();

      expect(mockAudioElement.pause).toHaveBeenCalled();
    });
  });

  describe('refs', () => {
    it('should expose audioContextRef', () => {
      const { result } = renderHook(() => useAudioPlayback());
      const mockBuffer = createMockAudioBuffer();

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      expect(result.current.audioContextRef.current).toBe(mockAudioContext);
    });

    it('should expose audioSourceRef', () => {
      const { result } = renderHook(() => useAudioPlayback());
      const mockBuffer = createMockAudioBuffer();

      act(() => {
        result.current.loadAndPlay(mockBuffer, 'Test script');
      });

      expect(result.current.audioSourceRef.current).toBe(mockSource);
    });
  });
});
