import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Play, Pause } from 'lucide-react';
import {
  CloningStatus,
  CreditInfo,
  VoiceMetadata,
} from '../types';
import { AIVoiceInput } from './ui/ai-voice-input';
import { VolumeBadge } from './ui/volume-meter';
import { useAudioAnalyzer, type AudioLevelData } from '@/src/lib/audioAnalyzer';
import { trackVoice } from '@/src/lib/tracking';

interface SimpleVoiceCloneProps {
  onClose: () => void;
  onRecordingComplete: (blob: Blob, name: string, metadata: VoiceMetadata) => Promise<void>;
  cloningStatus: CloningStatus;
  creditInfo: CreditInfo;
}

// Recording settings - aligned with ElevenLabs IVC recommendations
// Source: https://elevenlabs.io/docs/creative-platform/voices/voice-cloning/instant-voice-cloning
const MIN_RECORDING_SECONDS = 60;  // ElevenLabs: "at least 1 minute of audio"
const RECOMMENDED_SECONDS = 90;    // Optimal: 1-2 minutes
const MAX_RECORDING_SECONDS = 120; // ElevenLabs: "avoid exceeding 3 minutes"

type Step = 'record' | 'describe' | 'processing';

// Sample script for consistent, natural recording
const SAMPLE_SCRIPT = `Welcome to this moment of calm. Take a slow, deep breath in... and gently release.
Feel the tension melting away from your shoulders. With each breath, you become more relaxed, more at peace.
Allow your thoughts to drift like clouds across a clear blue sky. There is nowhere else you need to be.
Nothing else you need to do. Just breathe, relax, and be present in this peaceful moment.`;

// Tips for recording - based on ElevenLabs best practices
const TIPS = [
  'Read the script naturally, like telling a story',
  'Keep your volume and pace consistent',
  'Stay close to your microphone in a quiet space',
  'Vary your tone slightly for expressiveness',
] as const;

// Processing steps for enhanced progress feedback
const CLONING_STEPS = [
  { state: 'validating', label: 'Analyzing audio quality' },
  { state: 'processing_audio', label: 'Optimizing for voice cloning' },
  { state: 'uploading_to_elevenlabs', label: 'Creating voice clone' },
  { state: 'saving_to_database', label: 'Saving your voice' },
] as const;

// Helper function to format duration
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const SimpleVoiceClone: React.FC<SimpleVoiceCloneProps> = ({
  onClose,
  onRecordingComplete,
  cloningStatus,
  creditInfo
}) => {
  const [step, setStep] = useState<Step>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [profileName, setProfileName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Audio preview state
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Audio analyzer for real-time level feedback
  const { levelData, start: startAnalyzer, stop: stopAnalyzer } = useAudioAnalyzer();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isProcessing = cloningStatus.state === 'validating' ||
                       cloningStatus.state === 'processing_audio' ||
                       cloningStatus.state === 'uploading' ||
                       cloningStatus.state === 'uploading_to_elevenlabs' ||
                       cloningStatus.state === 'saving_to_database';

  const error = cloningStatus.state === 'error' ? cloningStatus.message : localError;
  const isSuccess = cloningStatus.state === 'success';

  // Update step based on cloning status
  useEffect(() => {
    if (isProcessing) {
      setStep('processing');
    }
  }, [isProcessing]);

  useEffect(() => {
    if (cloningStatus.state === 'uploading' || cloningStatus.state === 'uploading_to_elevenlabs') {
      toast.loading('Creating your voice clone...', {
        id: 'voice-clone',
        description: 'This may take up to 30 seconds',
      });
    } else if (cloningStatus.state === 'success') {
      toast.success('Voice clone created!', {
        id: 'voice-clone',
        description: `"${cloningStatus.voiceName}" is ready to use`,
      });
      trackVoice.cloneCompleted(cloningStatus.voiceName || 'Unknown', cloningStatus.voiceId || '');
    } else if (cloningStatus.state === 'error') {
      toast.error('Voice cloning failed', {
        id: 'voice-clone',
        description: cloningStatus.message || 'Please try again',
      });
      trackVoice.cloneFailed(profileName || 'Unknown', cloningStatus.message || 'Unknown error');
      setStep('describe');
    }
  }, [cloningStatus, profileName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      stopAnalyzer();
      // Cleanup audio preview
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [stopAnalyzer]);

  const startRecording = useCallback(async () => {
    try {
      setLocalError(null);
      setRecordingDuration(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
          channelCount: 1,
        }
      });
      streamRef.current = stream;

      // Start audio analyzer for real-time level feedback
      await startAnalyzer(stream);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        stopAnalyzer();

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      recorder.start(1000);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      autoStopRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, MAX_RECORDING_SECONDS * 1000);

    } catch (e: unknown) {
      console.error('Recording error:', e);
      const error = e as Error & { name?: string };
      if (error.name === 'NotAllowedError') {
        setLocalError('Microphone access denied. Please allow microphone access.');
      } else if (error.name === 'NotFoundError') {
        setLocalError('No microphone found. Please connect a microphone.');
      } else {
        setLocalError(error.message || 'Failed to start recording');
      }
    }
  }, [startAnalyzer, stopAnalyzer]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopAnalyzer();

      if (autoStopRef.current) {
        clearTimeout(autoStopRef.current);
        autoStopRef.current = null;
      }
    }
  }, [stopAnalyzer]);

  const handleToggleRecording = useCallback((recording: boolean) => {
    if (recording) {
      startRecording();
    } else {
      stopRecording();
    }
  }, [startRecording, stopRecording]);

  // Audio preview controls
  const togglePreview = useCallback(() => {
    if (!recordedBlob) return;

    if (isPlayingPreview) {
      audioPreviewRef.current?.pause();
      setIsPlayingPreview(false);
    } else {
      if (!audioPreviewRef.current) {
        // Create new audio element
        previewUrlRef.current = URL.createObjectURL(recordedBlob);
        audioPreviewRef.current = new Audio(previewUrlRef.current);

        audioPreviewRef.current.onended = () => {
          setIsPlayingPreview(false);
          setPreviewProgress(0);
        };

        audioPreviewRef.current.ontimeupdate = () => {
          if (audioPreviewRef.current) {
            const progress = (audioPreviewRef.current.currentTime / audioPreviewRef.current.duration) * 100;
            setPreviewProgress(isNaN(progress) ? 0 : progress);
          }
        };
      }
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  }, [recordedBlob, isPlayingPreview]);

  const handleCloneVoice = async () => {
    if (!recordedBlob) {
      setLocalError('Please record your voice first');
      return;
    }

    if (!creditInfo.canClone) {
      setLocalError(creditInfo.reason || 'Cannot clone voice at this time');
      return;
    }

    // Stop preview if playing
    if (isPlayingPreview) {
      audioPreviewRef.current?.pause();
      setIsPlayingPreview(false);
    }

    const voiceName = profileName.trim() || `My Voice ${new Date().toLocaleDateString()}`;

    // Simplified metadata - let ElevenLabs auto-detect voice characteristics
    const metadata: VoiceMetadata = {
      language: 'en',
      accent: 'native',
      gender: 'other',  // ElevenLabs will auto-detect
      ageRange: 'middle-aged',  // Default, not used
      hasBackgroundNoise: false,
      useCase: 'meditation',
    };

    setStep('processing');
    trackVoice.cloneStarted(voiceName);
    await onRecordingComplete(recordedBlob, voiceName, metadata);
  };

  const resetRecording = () => {
    // Stop and cleanup preview
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setIsPlayingPreview(false);
    setPreviewProgress(0);

    setRecordedBlob(null);
    setIsRecording(false);
    setRecordingDuration(0);
    setLocalError(null);
    setStep('record');
  };

  // Memoize status message
  const statusMessage = useMemo(() => {
    switch (cloningStatus.state) {
      case 'validating': return 'Analyzing your voice...';
      case 'processing_audio': return 'Preparing your recording...';
      case 'uploading':
      case 'uploading_to_elevenlabs':
        return cloningStatus.progress
          ? `Creating voice clone... ${cloningStatus.progress}%`
          : 'Creating voice clone...';
      case 'saving_to_database': return 'Saving your voice...';
      case 'success': return `Voice "${cloningStatus.voiceName}" created!`;
      default: return null;
    }
  }, [cloningStatus]);

  // Memoize formatted duration
  const formattedDuration = useMemo(() => {
    const mins = Math.floor(recordingDuration / 60);
    const secs = recordingDuration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [recordingDuration]);

  // Memoize recording quality
  const quality = useMemo(() => {
    if (recordingDuration < MIN_RECORDING_SECONDS) {
      return { label: 'Keep going', color: 'text-rose-400', bgColor: 'bg-rose-400' };
    } else if (recordingDuration < RECOMMENDED_SECONDS) {
      return { label: 'Good', color: 'text-amber-400', bgColor: 'bg-amber-400' };
    } else {
      return { label: 'Excellent', color: 'text-emerald-400', bgColor: 'bg-emerald-400' };
    }
  }, [recordingDuration]);

  // Memoize canProceed
  const canProceed = useMemo(
    () => recordedBlob !== null && recordingDuration >= MIN_RECORDING_SECONDS,
    [recordedBlob, recordingDuration]
  );

  // Memoize file size display
  const fileSizeDisplay = useMemo(
    () => recordedBlob ? `${(recordedBlob.size / 1024).toFixed(0)} KB` : '',
    [recordedBlob]
  );

  // Get current step index for progress display
  const currentStepIndex = useMemo(() => {
    return CLONING_STEPS.findIndex(s => s.state === cloningStatus.state);
  }, [cloningStatus.state]);

  return (
    <div className="fixed inset-0 z-[80] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Header - Use less expensive blur */}
      <header className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between bg-slate-900/95 border-b border-white/5">
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="p-2 -ml-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-white">Clone Your Voice</h1>
        <div className="w-9" /> {/* Spacer for centering */}
      </header>

      {/* Main Content */}
      <main className="h-[calc(100vh-60px)] overflow-y-auto">
        {/* Success State */}
        {isSuccess && (
          <div className="flex flex-col items-center justify-center min-h-full px-6 py-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center mb-6 ring-2 ring-emerald-500/30">
              <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Voice Created!</h2>
            <p className="text-slate-400 text-center mb-8">
              "{cloningStatus.voiceName}" is ready to use for your meditations.
            </p>
            <button
              onClick={onClose}
              className="w-full max-w-xs px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
            >
              Start Creating
            </button>
          </div>
        )}

        {/* Processing State - Enhanced with step progress */}
        {step === 'processing' && !isSuccess && (
          <div className="flex flex-col items-center justify-center min-h-full px-6 py-12">
            {/* Progress Steps */}
            <div className="w-full max-w-xs mb-8">
              {CLONING_STEPS.map((stepItem, i) => {
                const isActive = stepItem.state === cloningStatus.state;
                const isPast = currentStepIndex > i;

                return (
                  <div key={stepItem.state} className="flex items-center gap-3 mb-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${isActive ? 'bg-cyan-500/20 text-cyan-400' : ''}
                      ${isPast ? 'bg-emerald-500/20 text-emerald-400' : ''}
                      ${!isActive && !isPast ? 'bg-white/5 text-slate-500' : ''}
                    `}>
                      {isPast ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : isActive ? (
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </div>
                    <span className={`
                      text-sm
                      ${isActive ? 'text-white font-medium' : ''}
                      ${isPast ? 'text-slate-400' : ''}
                      ${!isActive && !isPast ? 'text-slate-600' : ''}
                    `}>
                      {stepItem.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Current status */}
            <p className="text-sm text-slate-500">
              This usually takes about 30 seconds
            </p>

            {/* Error in processing */}
            {error && (
              <div className="mt-6 w-full max-w-sm p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <p className="text-rose-400 text-sm text-center">{error}</p>
                <button
                  onClick={() => { setStep('describe'); setLocalError(null); }}
                  className="mt-3 w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Record */}
        {step === 'record' && !isSuccess && (
          <div className="flex flex-col min-h-full px-6 py-8">
            {/* Recording UI */}
            <div className="flex-1 flex flex-col items-center justify-center">
              {/* Error message */}
              {localError && (
                <div className="w-full max-w-sm mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <p className="text-rose-400 text-sm text-center">{localError}</p>
                </div>
              )}

              {!recordedBlob ? (
                <>
                  {/* Recording visualization - simplified animations */}
                  <div
                    className="relative mb-6 transition-transform duration-300"
                    style={{ transform: isRecording ? 'scale(1.1)' : 'scale(1)', contain: 'layout' }}
                  >
                    {/* Simple glow ring when recording - no expensive animations */}
                    {isRecording && (
                      <div
                        className="absolute -inset-4 rounded-full bg-cyan-500/10"
                        style={{ animation: 'pulse 2s ease-in-out infinite', willChange: 'opacity' }}
                      />
                    )}

                    {/* Main recorder button with real audio data */}
                    <div className="relative z-10">
                      <AIVoiceInput
                        isRecording={isRecording}
                        onToggle={handleToggleRecording}
                        visualizerBars={16}
                        audioLevelData={levelData}
                        hideTimer
                        hideInstructions
                        className="scale-125"
                      />
                    </div>
                  </div>

                  {/* Volume level badge - shows real-time feedback */}
                  {isRecording && (
                    <div className="mb-4">
                      <VolumeBadge levelData={levelData} />
                    </div>
                  )}

                  {/* Timer & Quality */}
                  {isRecording && (
                    <div className="text-center mb-4">
                      <div className="text-4xl font-mono font-bold text-white mb-2 tabular-nums">
                        {formattedDuration}
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${quality.color} bg-white/5`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${quality.bgColor}`} />
                        {quality.label}
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="text-center max-w-xs">
                    <p className="text-white font-medium mb-1">
                      {isRecording ? 'Recording...' : 'Tap to Start Recording'}
                    </p>
                    <p className="text-slate-500 text-sm">
                      {isRecording
                        ? recordingDuration < MIN_RECORDING_SECONDS
                          ? `${MIN_RECORDING_SECONDS - recordingDuration}s more needed`
                          : 'Tap again to stop'
                        : `Record 1-2 minutes for best quality`}
                    </p>
                  </div>

                  {/* Sample Script & Tips - only show when not recording */}
                  {!isRecording && (
                    <div className="mt-6 w-full max-w-sm space-y-4">
                      {/* Sample Script */}
                      <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                        <p className="text-xs font-medium text-cyan-400 uppercase tracking-wider mb-2">Read This Script</p>
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                          {SAMPLE_SCRIPT}
                        </p>
                      </div>

                      {/* Tips */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Quick Tips</p>
                        {TIPS.map((tip, i) => (
                          <div key={i} className="flex items-center gap-2 text-slate-500 text-sm">
                            <svg className="w-4 h-4 text-cyan-500/70 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {tip}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Recording Complete - with Preview */
                <div className="w-full max-w-sm text-center">
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${canProceed ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                    {canProceed ? (
                      <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                      </svg>
                    )}
                  </div>
                  <h3 className={`text-lg font-semibold mb-1 ${canProceed ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {canProceed ? 'Recording Complete!' : 'Recording Too Short'}
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    {formatDuration(recordingDuration)} recorded
                    {!canProceed && ` - need ${MIN_RECORDING_SECONDS}s minimum`}
                  </p>

                  {/* Audio Preview */}
                  {canProceed && (
                    <div className="mb-6 p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={togglePreview}
                          className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                        >
                          {isPlayingPreview ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <Play className="w-5 h-5 ml-0.5" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyan-400 transition-all duration-100"
                              style={{ width: `${previewProgress}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-slate-500 tabular-nums w-10 text-right">
                          {formatDuration(Math.floor(recordingDuration * (previewProgress / 100)))}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Listen to verify audio quality before cloning
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={resetRecording}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium border border-white/10 transition-all"
                    >
                      Re-record
                    </button>
                    {canProceed && (
                      <button
                        onClick={() => setStep('describe')}
                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-medium shadow-lg shadow-cyan-500/25 transition-all"
                      >
                        Continue
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Describe */}
        {step === 'describe' && !isSuccess && (
          <div className="px-6 py-6 space-y-5">
            {/* Voice Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Voice Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="My Meditation Voice"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
              <p className="text-xs text-slate-500">
                Voice characteristics will be auto-detected from your recording
              </p>
            </div>

            {/* Recording info with preview */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePreview}
                  className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                >
                  {isPlayingPreview ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-white truncate">Recording ready</p>
                    <p className="text-xs text-slate-500">{formatDuration(recordingDuration)} · {fileSizeDisplay}</p>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-100"
                      style={{ width: `${previewProgress}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={resetRecording}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-medium transition-all"
                >
                  Re-record
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <p className="text-rose-400 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Cannot clone warning */}
            {!creditInfo.canClone && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-amber-400 text-sm text-center">{creditInfo.reason || 'Cannot clone voice'}</p>
              </div>
            )}

            {/* Clone Button */}
            <button
              onClick={handleCloneVoice}
              disabled={!canProceed || isProcessing || !creditInfo.canClone}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              Create Voice Clone
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
