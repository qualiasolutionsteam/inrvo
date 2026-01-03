import React, { lazy, Suspense, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { trackAudio } from '../lib/tracking';

const MeditationPlayer = lazy(() => import('../../components/V0MeditationPlayer'));

const PlayerPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const {
    user,
    selectedVoice,
    selectedBackgroundTrack,
    backgroundVolume,
    setBackgroundVolume,
    voiceVolume,
    setVoiceVolume,
    playbackRate,
    setPlaybackRate,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    audioContextRef,
    audioSourceRef,
    audioBufferRef,
    gainNodeRef,
    backgroundAudioRef,
  } = useApp();

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
    if (backgroundAudioRef.current) {
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

          // iOS-specific: load event ensures audio is ready
          backgroundAudioRef.current.addEventListener('canplaythrough', () => {
            console.log('Background music ready to play');
          }, { once: true });
        }

        backgroundAudioRef.current.src = selectedBackgroundTrack.audioUrl;
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

  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-[100] bg-[#0f172a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
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
