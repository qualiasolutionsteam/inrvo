import React, { lazy, Suspense, useRef, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useAudioPlayback, usePlaybackTime } from '../contexts/AudioPlaybackContext';
import { trackAudio } from '../lib/tracking';
import { getMeditationById, getMeditationAudioSignedUrl, MeditationHistory, saveMeditationHistory } from '../../lib/supabase';
import { BACKGROUND_TRACKS, NATURE_SOUNDS } from '../../constants';
import SaveMeditationDialog from '../../components/SaveMeditationDialog';
import { ensureAudioContextResumed } from '../lib/iosAudioUtils';

const MeditationPlayer = lazy(() => import('../../components/V0MeditationPlayer'));

const PlayerPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  // App state (low-frequency updates)
  const { user, selectedVoice, selectedBackgroundTrack, setSelectedBackgroundTrack, selectedNatureSound, setSelectedNatureSound } = useApp();

  // Audio playback state (low-frequency - stable during playback)
  const {
    isPlaying,
    setIsPlaying,
    duration,
    setDuration,
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
    natureSoundAudioRef,
    // iOS volume fix: Use GainNodes instead of HTMLAudioElement.volume
    backgroundGainNodeRef,
    natureSoundGainNodeRef,
    // Pending meditation for save-on-exit flow
    pendingMeditation,
    clearPendingMeditation,
  } = useAudioPlayback();

  // High-frequency time state (updates at 60fps during playback)
  const { currentTime, setCurrentTime } = usePlaybackTime();

  // Nature sound volume state (separate from background music)
  const [natureSoundVolume, setNatureSoundVolume] = useState(0.4);
  const [isNatureSoundPlaying, setIsNatureSoundPlaying] = useState(false);

  const playbackStartTimeRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const playbackRateRef = useRef(playbackRate);
  const animationFrameRef = useRef<number | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isLoadingMeditation, setIsLoadingMeditation] = useState(false);
  const [loadedMeditation, setLoadedMeditation] = useState<MeditationHistory | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Save dialog state (for new meditations only)
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
  const handleTogglePlayback = useCallback(async () => {
    if (!audioContextRef.current || !audioBufferRef.current) return;

    if (isPlaying) {
      // Pause voice - disconnect and stop to ensure audio stops on all browsers including iOS
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.disconnect();
          audioSourceRef.current.stop();
        } catch {
          // AudioBufferSourceNode.stop() throws if already stopped - safe to ignore
        }
        audioSourceRef.current = null;
      }
      pauseOffsetRef.current = currentTime;
      setIsPlaying(false);
      trackAudio.playbackStopped(currentTime * 1000, duration * 1000);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Also pause background music
      if (backgroundAudioRef.current && isMusicPlaying) {
        backgroundAudioRef.current.pause();
      }

      // Also pause nature sound
      if (natureSoundAudioRef.current && isNatureSoundPlaying) {
        natureSoundAudioRef.current.pause();
      }
    } else {
      // iOS Safari/Chrome: Must await resume before playback
      await ensureAudioContextResumed(audioContextRef.current);

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

      // Resume background music if it was playing
      if (backgroundAudioRef.current && isMusicPlaying) {
        backgroundAudioRef.current.play().catch(() => {
          // Ignore autoplay failures
        });
      }

      // Resume nature sound if it was playing
      if (natureSoundAudioRef.current && isNatureSoundPlaying) {
        natureSoundAudioRef.current.play().catch(() => {
          // Ignore autoplay failures
        });
      }

      source.onended = () => {
        if (pauseOffsetRef.current + 0.1 >= duration) {
          setIsPlaying(false);
          pauseOffsetRef.current = 0;
          setCurrentTime(0);
          trackAudio.playbackCompleted(duration * 1000);
        }
      };
    }
  }, [isPlaying, currentTime, duration, playbackRate, audioContextRef, audioSourceRef, audioBufferRef, gainNodeRef, setIsPlaying, setCurrentTime, backgroundAudioRef, isMusicPlaying, natureSoundAudioRef, isNatureSoundPlaying]);

  // Handle seek
  const handleSeek = useCallback(async (time: number) => {
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
      // iOS Safari/Chrome: Must await resume before playback
      await ensureAudioContextResumed(audioContextRef.current);

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

  // Stop all audio playback (shared by close, save, and discard)
  const stopAllAudio = useCallback(() => {
    // Stop voice playback - disconnect and stop for robust stopping on all browsers
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.disconnect();
        audioSourceRef.current.stop();
      } catch {
        // AudioBufferSourceNode.stop() throws if already stopped - safe to ignore
      }
      audioSourceRef.current = null;
    }
    setIsPlaying(false);

    // Stop background music
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.pause();
      backgroundAudioRef.current.currentTime = 0;
    }
    setIsMusicPlaying(false);

    // Stop nature sound
    if (natureSoundAudioRef.current) {
      natureSoundAudioRef.current.pause();
      natureSoundAudioRef.current.currentTime = 0;
    }
    setIsNatureSoundPlaying(false);
  }, [audioSourceRef, backgroundAudioRef, natureSoundAudioRef, setIsPlaying]);

  // Handle close - shows save dialog for new meditations
  const handleClose = useCallback(() => {
    stopAllAudio();

    // If this is a new meditation (not loaded from library), show save dialog
    if (pendingMeditation && !id) {
      setShowSaveDialog(true);
    } else {
      // Already saved meditation or no pending data - just navigate
      navigate('/');
    }
  }, [navigate, pendingMeditation, id, stopAllAudio]);

  // Handle save meditation with custom title
  const handleSaveMeditation = useCallback(async (title: string) => {
    if (!pendingMeditation) {
      navigate('/');
      return;
    }

    setIsSaving(true);
    try {
      await saveMeditationHistory(
        pendingMeditation.prompt,
        pendingMeditation.script,
        pendingMeditation.voiceId,
        pendingMeditation.voiceName,
        pendingMeditation.backgroundTrackId,
        pendingMeditation.backgroundTrackName,
        pendingMeditation.durationSeconds,
        pendingMeditation.audioTags,
        pendingMeditation.base64Audio,
        title, // Use the custom title
        pendingMeditation.natureSoundId,
        pendingMeditation.natureSoundName
      );
      clearPendingMeditation();
      setShowSaveDialog(false);
      navigate('/');
    } catch (err) {
      console.error('Failed to save meditation:', err);
      // Still navigate away even if save fails
      clearPendingMeditation();
      setShowSaveDialog(false);
      navigate('/');
    } finally {
      setIsSaving(false);
    }
  }, [pendingMeditation, clearPendingMeditation, navigate]);

  // Handle discard meditation (don't save)
  const handleDiscardMeditation = useCallback(() => {
    clearPendingMeditation();
    setShowSaveDialog(false);
    navigate('/');
  }, [clearPendingMeditation, navigate]);

  // Handle cancel (go back to player)
  const handleCancelSave = useCallback(() => {
    setShowSaveDialog(false);
  }, []);

  // Update voice volume - uses GainNode for proper Web Audio API control
  const updateVoiceVolume = useCallback((volume: number) => {
    setVoiceVolume(volume);
    if (gainNodeRef.current) {
      // Direct assignment for immediate effect (required for iOS Safari/Chrome)
      gainNodeRef.current.gain.value = volume;
      // Also use setTargetAtTime for smooth transitions on desktop
      if (audioContextRef.current) {
        gainNodeRef.current.gain.setTargetAtTime(volume, audioContextRef.current.currentTime, 0.01);
      }
    }
  }, [setVoiceVolume, gainNodeRef, audioContextRef]);

  // Update background volume - uses GainNode for iOS compatibility
  // (HTMLAudioElement.volume is read-only on iOS)
  const updateBackgroundVolume = useCallback((volume: number) => {
    setBackgroundVolume(volume);
    // Use GainNode for volume control (works on iOS unlike HTMLAudioElement.volume)
    if (backgroundGainNodeRef.current) {
      // Direct assignment for immediate effect (required for iOS Safari/Chrome)
      backgroundGainNodeRef.current.gain.value = volume;
      // Also use setTargetAtTime for smooth transitions on desktop
      if (audioContextRef.current) {
        backgroundGainNodeRef.current.gain.setTargetAtTime(volume, audioContextRef.current.currentTime, 0.01);
      }
    }
    // Fallback for desktop browsers - also set on audio element
    if (backgroundAudioRef.current) {
      try {
        backgroundAudioRef.current.volume = volume;
      } catch {
        // iOS throws on volume assignment - silently ignore
      }
    }
  }, [setBackgroundVolume, backgroundGainNodeRef, audioContextRef, backgroundAudioRef]);

  // Update playback rate
  const updatePlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    playbackRateRef.current = rate;
    if (audioSourceRef.current) {
      audioSourceRef.current.playbackRate.value = rate;
    }
  }, [setPlaybackRate, audioSourceRef]);

  // Toggle background music - routes through GainNode for iOS volume control
  const handleBackgroundMusicToggle = useCallback(async () => {
    try {
      if (isMusicPlaying) {
        // Pause music
        if (backgroundAudioRef.current) {
          backgroundAudioRef.current.pause();
        }
        setIsMusicPlaying(false);
      } else {
        // Auto-select first actual track if "none" is selected
        let trackToPlay = selectedBackgroundTrack;
        if (selectedBackgroundTrack.id === 'none') {
          const firstRealTrack = BACKGROUND_TRACKS.find(t => t.id !== 'none' && t.audioUrl);
          if (firstRealTrack) {
            trackToPlay = firstRealTrack;
            setSelectedBackgroundTrack(firstRealTrack);
          }
        }

        if (trackToPlay.id !== 'none' && trackToPlay.audioUrl) {
          // Initialize AudioContext if needed
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          }

          // Resume AudioContext if suspended (iOS requirement)
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
          }

          // Create GainNode for volume control if needed
          if (!backgroundGainNodeRef.current) {
            backgroundGainNodeRef.current = audioContextRef.current.createGain();
            backgroundGainNodeRef.current.connect(audioContextRef.current.destination);
          }
          // Set initial volume
          backgroundGainNodeRef.current.gain.value = backgroundVolume;

          // Create or reuse audio element
          if (!backgroundAudioRef.current) {
            backgroundAudioRef.current = new Audio();
            backgroundAudioRef.current.loop = true;
            backgroundAudioRef.current.crossOrigin = 'anonymous';

            // Route audio through Web Audio API for volume control
            const source = audioContextRef.current.createMediaElementSource(backgroundAudioRef.current);
            source.connect(backgroundGainNodeRef.current);
          }

          // Set src and prepare to play
          backgroundAudioRef.current.src = trackToPlay.audioUrl;

          // Play and handle iOS autoplay rejection
          try {
            await backgroundAudioRef.current.play();
            setIsMusicPlaying(true);
          } catch (playError) {
            // AbortError means a new load interrupted this play - not a real error
            if (playError instanceof Error && playError.name === 'AbortError') {
              console.debug('Music play() interrupted by new load - this is expected');
              return;
            }
            console.error('Music playback failed:', playError);
            throw playError;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to toggle background music:', err);
      setIsMusicPlaying(false);
    }
  }, [isMusicPlaying, selectedBackgroundTrack, setSelectedBackgroundTrack, backgroundVolume, audioContextRef, backgroundAudioRef, backgroundGainNodeRef]);

  // Update nature sound volume - uses GainNode for iOS compatibility
  const updateNatureSoundVolume = useCallback((volume: number) => {
    setNatureSoundVolume(volume);
    // Use GainNode for volume control (works on iOS unlike HTMLAudioElement.volume)
    if (natureSoundGainNodeRef.current) {
      // Direct assignment for immediate effect (required for iOS Safari/Chrome)
      natureSoundGainNodeRef.current.gain.value = volume;
      // Also use setTargetAtTime for smooth transitions on desktop
      if (audioContextRef.current) {
        natureSoundGainNodeRef.current.gain.setTargetAtTime(volume, audioContextRef.current.currentTime, 0.01);
      }
    }
    // Fallback for desktop browsers - also set on audio element
    if (natureSoundAudioRef.current) {
      try {
        natureSoundAudioRef.current.volume = volume;
      } catch {
        // iOS throws on volume assignment - silently ignore
      }
    }
  }, [natureSoundGainNodeRef, audioContextRef, natureSoundAudioRef]);

  // Toggle nature sound - routes through GainNode for iOS volume control
  const handleNatureSoundToggle = useCallback(async () => {
    try {
      if (isNatureSoundPlaying) {
        // Pause nature sound
        if (natureSoundAudioRef.current) {
          natureSoundAudioRef.current.pause();
        }
        setIsNatureSoundPlaying(false);
      } else {
        // Auto-select first actual sound if "none" is selected
        let soundToPlay = selectedNatureSound;
        if (!selectedNatureSound || selectedNatureSound.id === 'none') {
          const firstRealSound = NATURE_SOUNDS.find(s => s.id !== 'none' && s.audioUrl);
          if (firstRealSound) {
            soundToPlay = firstRealSound;
            setSelectedNatureSound(firstRealSound);
          }
        }

        if (soundToPlay && soundToPlay.id !== 'none' && soundToPlay.audioUrl) {
          // Initialize AudioContext if needed
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          }

          // Resume AudioContext if suspended (iOS requirement)
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
          }

          // Create GainNode for volume control if needed
          if (!natureSoundGainNodeRef.current) {
            natureSoundGainNodeRef.current = audioContextRef.current.createGain();
            natureSoundGainNodeRef.current.connect(audioContextRef.current.destination);
          }
          // Set initial volume
          natureSoundGainNodeRef.current.gain.value = natureSoundVolume;

          // Create or reuse audio element
          if (!natureSoundAudioRef.current) {
            natureSoundAudioRef.current = new Audio();
            natureSoundAudioRef.current.loop = true;
            natureSoundAudioRef.current.crossOrigin = 'anonymous';

            // Route audio through Web Audio API for volume control
            const source = audioContextRef.current.createMediaElementSource(natureSoundAudioRef.current);
            source.connect(natureSoundGainNodeRef.current);
          }

          // Set src and prepare to play
          natureSoundAudioRef.current.src = soundToPlay.audioUrl;

          // Play and handle iOS autoplay rejection
          try {
            await natureSoundAudioRef.current.play();
            setIsNatureSoundPlaying(true);
          } catch (playError) {
            // AbortError means a new load interrupted this play - not a real error
            if (playError instanceof Error && playError.name === 'AbortError') {
              console.debug('Nature sound play() interrupted by new load - this is expected');
              return;
            }
            console.error('Nature sound playback failed:', playError);
            throw playError;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to toggle nature sound:', err);
      setIsNatureSoundPlaying(false);
    }
  }, [isNatureSoundPlaying, selectedNatureSound, setSelectedNatureSound, natureSoundVolume, audioContextRef, natureSoundAudioRef, natureSoundGainNodeRef]);

  // Load saved meditation by ID
  const loadSavedMeditation = useCallback(async (meditationId: string) => {
    setIsLoadingMeditation(true);
    setLoadError(null);

    try {
      // Fetch meditation metadata
      const meditation = await getMeditationById(meditationId);
      if (!meditation) {
        setLoadError('Meditation not found');
        navigate('/library');
        return;
      }

      setLoadedMeditation(meditation);

      // Get signed audio URL
      if (!meditation.audio_url) {
        setLoadError('No audio available for this meditation');
        navigate('/library');
        return;
      }

      const audioUrl = await getMeditationAudioSignedUrl(meditation.audio_url);
      if (!audioUrl) {
        setLoadError('Failed to load audio');
        navigate('/library');
        return;
      }

      // Initialize AudioContext if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      // Create gain node for volume control if needed
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }

      // Fetch and decode audio
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch audio file');
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      // Store in ref
      audioBufferRef.current = audioBuffer;
      setDuration(audioBuffer.duration);

      // Restore background track if saved
      if (meditation.background_track_id) {
        const savedTrack = BACKGROUND_TRACKS.find(t => t.id === meditation.background_track_id);
        if (savedTrack) {
          setSelectedBackgroundTrack(savedTrack);
        }
      }

      // Restore nature sound if saved
      if (meditation.nature_sound_id) {
        const savedNatureSound = NATURE_SOUNDS.find(s => s.id === meditation.nature_sound_id);
        if (savedNatureSound) {
          setSelectedNatureSound(savedNatureSound);
        }
      }

    } catch (err) {
      console.error('Failed to load meditation:', err);
      setLoadError('Failed to load meditation audio');
    } finally {
      setIsLoadingMeditation(false);
    }
  }, [navigate, audioContextRef, audioBufferRef, gainNodeRef, setDuration, setSelectedBackgroundTrack, setSelectedNatureSound]);

  // Load meditation when ID is present and no audio buffer exists
  useEffect(() => {
    if (id && !audioBufferRef.current && !isLoadingMeditation) {
      loadSavedMeditation(id);
    }
  }, [id, audioBufferRef, isLoadingMeditation, loadSavedMeditation]);

  // If no audio buffer and no ID, redirect home
  useEffect(() => {
    // Only redirect if not loading and no ID to load
    if (!audioBufferRef.current && !id && !isLoadingMeditation) {
      navigate('/');
    }
  }, [audioBufferRef, id, isLoadingMeditation, navigate]);

  // Handle visibility change (iOS suspends audio when tab/app backgrounded)
  // Track if voice was playing when page was hidden
  const wasPlayingBeforeHiddenRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Page hidden - store playback state for restoration
        wasPlayingBeforeHiddenRef.current = isPlaying;
      } else {
        // Page visible again - resume AudioContext if needed
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        // Resume background music if it was playing
        if (isMusicPlaying && backgroundAudioRef.current?.paused) {
          backgroundAudioRef.current.play().catch(err => {
            console.warn('Could not resume music after visibility change:', err);
          });
        }

        // iOS: Restart voice playback if it was playing before backgrounding
        // AudioBufferSourceNode may have been invalidated by iOS
        if (wasPlayingBeforeHiddenRef.current && audioContextRef.current && audioBufferRef.current && !isPlaying) {
          try {
            await ensureAudioContextResumed(audioContextRef.current);

            // Recreate the audio source
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

            source.onended = () => {
              if (pauseOffsetRef.current + 0.1 >= duration) {
                setIsPlaying(false);
                pauseOffsetRef.current = 0;
                setCurrentTime(0);
              }
            };
          } catch (err) {
            console.warn('Could not resume voice playback after visibility change:', err);
          }
        }

        wasPlayingBeforeHiddenRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isMusicPlaying, isPlaying, playbackRate, duration, audioContextRef, backgroundAudioRef, audioBufferRef, audioSourceRef, gainNodeRef, setIsPlaying, setCurrentTime]);

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

  // Show loading state while fetching meditation
  if (isLoadingMeditation) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading meditation...</p>
      </div>
    );
  }

  // Show error state
  if (loadError) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center gap-4">
        <p className="text-rose-400">{loadError}</p>
        <button
          onClick={() => navigate('/library')}
          className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          Back to Library
        </button>
      </div>
    );
  }

  // Use voice info from loaded meditation if available, otherwise from selected voice
  const displayVoiceId = loadedMeditation?.voice_id || selectedVoice?.id;
  const displayVoiceName = loadedMeditation?.voice_name || selectedVoice?.name;

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
        natureSoundEnabled={selectedNatureSound?.id !== 'none' && isNatureSoundPlaying}
        natureSoundVolume={natureSoundVolume}
        onNatureSoundVolumeChange={updateNatureSoundVolume}
        natureSoundName={selectedNatureSound?.name}
        natureSoundIcon={selectedNatureSound?.icon}
        onOpenNatureSoundModal={handleNatureSoundToggle}
        voiceVolume={voiceVolume}
        onVoiceVolumeChange={updateVoiceVolume}
        playbackRate={playbackRate}
        onPlaybackRateChange={updatePlaybackRate}
        userId={user?.id}
        voiceId={displayVoiceId}
        voiceName={displayVoiceName}
        meditationType={loadedMeditation?.content_category || "custom"}
      />

      {/* Save meditation dialog - shown when closing a new meditation */}
      <SaveMeditationDialog
        isOpen={showSaveDialog}
        defaultTitle={pendingMeditation?.prompt.substring(0, 50) || 'My Meditation'}
        onSave={handleSaveMeditation}
        onDiscard={handleDiscardMeditation}
        onCancel={handleCancelSave}
        isSaving={isSaving}
      />
    </Suspense>
  );
};

export default PlayerPage;
