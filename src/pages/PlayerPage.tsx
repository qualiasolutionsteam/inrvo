import React, { lazy, Suspense, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useAudioPlayback } from '../contexts/AudioPlaybackContext';
import { trackAudio } from '../lib/tracking';

const MeditationPlayer = lazy(() => import('../../components/V0MeditationPlayer'));

const PlayerPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  // App state (low-frequency updates)
  const { user, selectedVoice, selectedBackgroundTrack } = useApp();

  // Audio playback state (high-frequency updates during playback)
  const {
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    backgroundVolume,
    setBackgroundVolume,
    voiceVolume,
    setVoiceVolume,
    playbackRate,
    setPlaybackRate,
    audioContextRef,
    audioSourceRef,
    audioBufferRef,
    gainNodeRef,
    backgroundAudioRef,
  } = useAudioPlayback();

  const playbackStartTimeRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const playbackRateRef = useRef(playbackRate);
  const animationFrameRef = useRef<number | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = React.useState(false);

  // Update time tracking
  const updatePlaybackTime = useCallback(() => {
    if (!audioContextRef.current || !isPlaying) return;

    const elapsed = (audioContextRef.current.currentTime - playbackStartTimeRef.current) * playbackRateRef.current;
    const newTime = pauseOffsetRef.current + elapsed;

    if (newTime <= duration) {
      setCurrentTime(newTime);
      animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);
    }
  }, [isPlaying, duration, audioContextRef, setCurrentTime]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updatePlaybackTime]);

  // Handle play/pause toggle
  const handleTogglePlayback = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current) return;

    if (isPlaying) {
      // Pause
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch {
          // AudioBufferSourceNode.stop() throws if already stopped - safe to ignore
        }
      }
      pauseOffsetRef.current = currentTime;
      setIsPlaying(false);
      trackAudio.playbackStopped(currentTime * 1000, duration * 1000);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    } else {
      // Resume
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.playbackRate.value = playbackRate;
      playbackRateRef.current = playbackRate;

      if (gainNodeRef.current) {
        source.connect(gainNodeRef.current);
      } else {
        source.connect(audioContextRef.current.destination);
      }

      source.start(0, pauseOffsetRef.current);
      audioSourceRef.current = source;
      playbackStartTimeRef.current = audioContextRef.current.currentTime;
      setIsPlaying(true);
      trackAudio.playbackStarted();

      source.onended = () => {
        if (pauseOffsetRef.current + 0.1 >= duration) {
          setIsPlaying(false);
          pauseOffsetRef.current = 0;
          setCurrentTime(0);
          trackAudio.playbackCompleted(duration * 1000);
        }
      };
    }
  }, [isPlaying, currentTime, duration, playbackRate, audioContextRef, audioSourceRef, audioBufferRef, gainNodeRef, setIsPlaying, setCurrentTime]);

  // Handle seek
  const handleSeek = useCallback((time: number) => {
    if (!audioContextRef.current || !audioBufferRef.current) return;

    const clampedTime = Math.max(0, Math.min(duration, time));

    // Stop current source
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch {
        // AudioBufferSourceNode.stop() throws if already stopped - safe to ignore
      }
    }

    pauseOffsetRef.current = clampedTime;
    setCurrentTime(clampedTime);

    if (isPlaying) {
      // Create new source at new position
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.playbackRate.value = playbackRate;
      playbackRateRef.current = playbackRate;

      if (gainNodeRef.current) {
        source.connect(gainNodeRef.current);
      } else {
        source.connect(audioContextRef.current.destination);
      }

      source.start(0, clampedTime);
      audioSourceRef.current = source;
      playbackStartTimeRef.current = audioContextRef.current.currentTime;

      source.onended = () => {
        if (pauseOffsetRef.current + 0.1 >= duration) {
          setIsPlaying(false);
          pauseOffsetRef.current = 0;
          setCurrentTime(0);
        }
      };
    }
  }, [duration, isPlaying, playbackRate, audioContextRef, audioSourceRef, audioBufferRef, gainNodeRef, setIsPlaying, setCurrentTime]);

  // Handle skip
  const handleSkip = useCallback((seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    handleSeek(newTime);
  }, [currentTime, duration, handleSeek]);

  // Handle close
  const handleClose = useCallback(() => {
    // Stop playback
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch {
        // AudioBufferSourceNode.stop() throws if already stopped - safe to ignore
      }
    }
    setIsPlaying(false);

    // Stop background music
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.pause();
      backgroundAudioRef.current.currentTime = 0;
    }
    setIsMusicPlaying(false);

    // Navigate back home
    navigate('/');
  }, [navigate, audioSourceRef, backgroundAudioRef, setIsPlaying]);

  // Update voice volume
  const updateVoiceVolume = useCallback((volume: number) => {
    setVoiceVolume(volume);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [setVoiceVolume, gainNodeRef]);

  // Update background volume
  const updateBackgroundVolume = useCallback((volume: number) => {
    setBackgroundVolume(volume);
    // Only set volume if audio element exists and is in a playable state
    // readyState >= 2 means HAVE_CURRENT_DATA or better
    if (backgroundAudioRef.current && backgroundAudioRef.current.readyState >= 2) {
      backgroundAudioRef.current.volume = volume;
    }
  }, [setBackgroundVolume, backgroundAudioRef]);

  // Update playback rate
  const updatePlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    playbackRateRef.current = rate;
    if (audioSourceRef.current) {
      audioSourceRef.current.playbackRate.value = rate;
    }
  }, [setPlaybackRate, audioSourceRef]);

  // Toggle background music
  const handleBackgroundMusicToggle = useCallback(async () => {
    try {
      if (isMusicPlaying) {
        // Pause music
        if (backgroundAudioRef.current) {
          backgroundAudioRef.current.pause();
        }
        setIsMusicPlaying(false);
      } else if (selectedBackgroundTrack.id !== 'none' && selectedBackgroundTrack.audioUrl) {
        // Resume AudioContext if suspended (iOS requirement)
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        // Create or reuse audio element
        if (!backgroundAudioRef.current) {
          backgroundAudioRef.current = new Audio();
          backgroundAudioRef.current.loop = true;
        }

        // Set src and prepare to play
        backgroundAudioRef.current.src = selectedBackgroundTrack.audioUrl;

        // Ensure volume is applied after audio is ready (iOS requirement)
        backgroundAudioRef.current.addEventListener('canplaythrough', () => {
          if (backgroundAudioRef.current) {
            backgroundAudioRef.current.volume = backgroundVolume;
          }
        }, { once: true });

        // Also set volume immediately in case it's already loaded
        backgroundAudioRef.current.volume = backgroundVolume;

        // Play and handle iOS autoplay rejection
        try {
          await backgroundAudioRef.current.play();
          setIsMusicPlaying(true);
        } catch (playError) {
          console.error('Music playback failed:', playError);
          // Show user-friendly error (you can add toast notification here)
          throw playError;
        }
      }
    } catch (err) {
      console.warn('Failed to toggle background music:', err);
      setIsMusicPlaying(false);
    }
  }, [isMusicPlaying, selectedBackgroundTrack, backgroundVolume, audioContextRef, backgroundAudioRef]);

  // If no audio buffer, redirect home
  useEffect(() => {
    if (!audioBufferRef.current && !id) {
      navigate('/');
    }
  }, [audioBufferRef, id, navigate]);

  // Handle visibility change (iOS suspends audio when tab/app backgrounded)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page hidden - pause might happen automatically on iOS
      } else {
        // Page visible again - resume AudioContext if needed
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }

        // Resume background music if it was playing
        if (isMusicPlaying && backgroundAudioRef.current?.paused) {
          backgroundAudioRef.current.play().catch(err => {
            console.warn('Could not resume music after visibility change:', err);
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isMusicPlaying, audioContextRef, backgroundAudioRef]);

  // Silent audio element to keep AudioContext alive on iOS
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize silent audio keeper for iOS background playback
  useEffect(() => {
    // Create a silent audio element that loops to prevent iOS from suspending AudioContext
    // This is a well-known workaround for iOS audio limitations
    const silentAudio = new Audio();
    // Minimal silent MP3 (1 second of silence, ~1KB)
    silentAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwmHAAAAAAD/+9DEAAAIAANIAAAAgAAA0gAAABEAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tQxBkAAADSAAAAAAAAANIAAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';
    silentAudio.loop = true;
    silentAudio.volume = 0.01; // Nearly silent
    silentAudioRef.current = silentAudio;

    return () => {
      silentAudio.pause();
      silentAudio.src = '';
    };
  }, []);

  // Start/stop silent audio with playback
  useEffect(() => {
    if (isPlaying && silentAudioRef.current) {
      silentAudioRef.current.play().catch(() => {
        // Ignore autoplay failures - user will interact to play
      });
    } else if (!isPlaying && silentAudioRef.current) {
      silentAudioRef.current.pause();
    }
  }, [isPlaying]);

  // Setup MediaSession API for lock screen controls (iOS/Android)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    // Set metadata for lock screen display
    navigator.mediaSession.metadata = new MediaMetadata({
      title: selectedVoice?.name ? `Meditation with ${selectedVoice.name}` : 'Guided Meditation',
      artist: 'Innrvo',
      album: 'Meditation',
    });

    // Play action
    navigator.mediaSession.setActionHandler('play', () => {
      if (!isPlaying) {
        handleTogglePlayback();
      }
    });

    // Pause action
    navigator.mediaSession.setActionHandler('pause', () => {
      if (isPlaying) {
        handleTogglePlayback();
      }
    });

    // Stop action
    navigator.mediaSession.setActionHandler('stop', () => {
      handleClose();
    });

    // Seek backward (skip -15s)
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      handleSkip(-15);
    });

    // Seek forward (skip +15s)
    navigator.mediaSession.setActionHandler('seekforward', () => {
      handleSkip(15);
    });

    // Update playback state
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    // Update position state
    if (duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          position: currentTime,
          playbackRate: playbackRate,
        });
      } catch {
        // Some browsers don't support setPositionState
      }
    }

    return () => {
      // Clear action handlers on unmount
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('stop', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
    };
  }, [isPlaying, currentTime, duration, playbackRate, selectedVoice, handleTogglePlayback, handleClose, handleSkip]);

  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-[100] bg-[#0f172a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MeditationPlayer
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onPlayPause={handleTogglePlayback}
        onSeek={handleSeek}
        onSkip={handleSkip}
        onClose={handleClose}
        backgroundMusicEnabled={selectedBackgroundTrack.id !== 'none' && isMusicPlaying}
        backgroundVolume={backgroundVolume}
        onBackgroundVolumeChange={updateBackgroundVolume}
        onBackgroundMusicToggle={handleBackgroundMusicToggle}
        backgroundTrackName={selectedBackgroundTrack.name}
        voiceVolume={voiceVolume}
        onVoiceVolumeChange={updateVoiceVolume}
        playbackRate={playbackRate}
        onPlaybackRateChange={updatePlaybackRate}
        userId={user?.id}
        voiceId={selectedVoice?.id}
        voiceName={selectedVoice?.name}
        meditationType="custom"
      />
    </Suspense>
  );
};

export default PlayerPage;
