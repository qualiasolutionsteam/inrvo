import React, { useState, useRef, useCallback, useEffect } from 'react';
import GlassCard from './GlassCard';
import { CloningStatus, CreditInfo } from '../types';
import { AIVoiceInput } from './ui/ai-voice-input';
import { isElevenLabsConfigured } from '../src/lib/elevenlabs';

interface SimpleVoiceCloneProps {
  onClose: () => void;
  onRecordingComplete: (blob: Blob, name: string) => Promise<void>;
  cloningStatus: CloningStatus;
  creditInfo: CreditInfo;
}

// Recording settings
const MIN_RECORDING_SECONDS = 10; // Minimum for basic quality
const RECOMMENDED_SECONDS = 30;   // Recommended for best quality
const MAX_RECORDING_SECONDS = 60; // Maximum allowed

export const SimpleVoiceClone: React.FC<SimpleVoiceCloneProps> = ({
  onClose,
  onRecordingComplete,
  cloningStatus,
  creditInfo
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [profileName, setProfileName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if ElevenLabs is configured
  const isConfigured = isElevenLabsConfigured();

  // Derive state from cloningStatus
  const isProcessing = cloningStatus.state === 'validating' ||
                       cloningStatus.state === 'uploading_to_elevenlabs' ||
                       cloningStatus.state === 'saving_to_database';

  const error = cloningStatus.state === 'error' ? cloningStatus.message : localError;
  const isSuccess = cloningStatus.state === 'success';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setLocalError(null);
      setRecordingDuration(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });
      streamRef.current = stream;

      // Use a supported MIME type
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

        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      // Request data every second for smoother recording
      recorder.start(1000);
      setIsRecording(true);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Auto-stop after MAX_RECORDING_SECONDS
      autoStopRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, MAX_RECORDING_SECONDS * 1000);

    } catch (e: any) {
      console.error('Recording error:', e);
      if (e.name === 'NotAllowedError') {
        setLocalError('Microphone access denied. Please allow microphone access and try again.');
      } else if (e.name === 'NotFoundError') {
        setLocalError('No microphone found. Please connect a microphone and try again.');
      } else {
        setLocalError(e.message || 'Failed to start recording');
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Clear auto-stop timer
      if (autoStopRef.current) {
        clearTimeout(autoStopRef.current);
        autoStopRef.current = null;
      }
    }
  }, []);

  const handleToggleRecording = useCallback((recording: boolean) => {
    if (recording) {
      startRecording();
    } else {
      stopRecording();
    }
  }, [startRecording, stopRecording]);

  const handleCloneVoice = async () => {
    if (!recordedBlob) {
      setLocalError('Please record your voice first');
      return;
    }

    if (!isConfigured) {
      setLocalError('ElevenLabs API key not configured. Please add VITE_ELEVENLABS_API_KEY to your .env.local file.');
      return;
    }

    if (!creditInfo.canClone) {
      setLocalError(creditInfo.reason || 'Cannot clone voice at this time');
      return;
    }

    const voiceName = profileName.trim() || `My Voice ${new Date().toLocaleDateString()}`;
    await onRecordingComplete(recordedBlob, voiceName);
  };

  const resetRecording = () => {
    setRecordedBlob(null);
    setIsRecording(false);
    setRecordingDuration(0);
    setLocalError(null);
  };

  // Get status message for upload progress
  const getStatusMessage = () => {
    switch (cloningStatus.state) {
      case 'validating':
        return 'Validating audio...';
      case 'uploading_to_elevenlabs':
        return cloningStatus.progress
          ? `Creating voice clone... ${cloningStatus.progress}%`
          : 'Creating voice clone (this may take a moment)...';
      case 'saving_to_database':
        return 'Saving profile...';
      case 'success':
        return `Voice "${cloningStatus.voiceName}" created!`;
      default:
        return null;
    }
  };

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get recording quality indicator
  const getRecordingQuality = () => {
    if (recordingDuration < MIN_RECORDING_SECONDS) {
      return { label: 'Too short', color: 'text-rose-400', bg: 'bg-rose-500/20' };
    } else if (recordingDuration < RECOMMENDED_SECONDS) {
      return { label: 'Basic quality', color: 'text-amber-400', bg: 'bg-amber-500/20' };
    } else {
      return { label: 'Excellent quality', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
    }
  };

  const quality = getRecordingQuality();
  const canSubmit = recordedBlob && recordingDuration >= MIN_RECORDING_SECONDS;

  return (
    <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-lg p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Clone Your Voice</h2>
            <p className="text-slate-400 text-sm">Record your voice to create a personalized meditation voice</p>
          </div>

          {/* API Key Warning */}
          {!isConfigured && (
            <div className="text-amber-400 text-sm font-medium bg-amber-500/10 p-3 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>ElevenLabs API key not configured. Voice cloning will not work.</span>
            </div>
          )}

          {/* Credit info */}
          <div className="flex items-center justify-center gap-4 text-xs flex-wrap">
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className="text-slate-500">Credits: </span>
              <span className="text-white font-medium">{creditInfo.creditsRemaining.toLocaleString()}</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className="text-slate-500">Clones left: </span>
              <span className="text-white font-medium">{creditInfo.clonesRemaining}</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <span className="text-indigo-400">Cost: {creditInfo.cloneCost.toLocaleString()}</span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-rose-400 text-sm font-medium bg-rose-500/10 p-3 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="flex-1">{error}</span>
              {cloningStatus.state === 'error' && cloningStatus.canRetry && (
                <button
                  onClick={handleCloneVoice}
                  className="ml-auto px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium transition-all"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Success message */}
          {isSuccess && (
            <div className="text-emerald-400 text-sm font-medium bg-emerald-500/10 p-3 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Voice "{cloningStatus.voiceName}" created successfully!</span>
            </div>
          )}

          {/* Profile name input */}
          {!isSuccess && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Voice Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="My Voice (optional)"
                disabled={isProcessing}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all disabled:opacity-50"
              />
            </div>
          )}

          {/* Voice recording or playback */}
          {!isSuccess && (
            <div className="space-y-4">
              {!recordedBlob ? (
                <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                  {/* Recording instructions */}
                  <div className="text-center mb-4">
                    <p className="text-slate-300 text-sm font-medium mb-1">
                      {isRecording ? 'Recording...' : 'Click to record your voice'}
                    </p>
                    <p className="text-slate-500 text-xs">
                      Record at least {MIN_RECORDING_SECONDS} seconds, {RECOMMENDED_SECONDS}+ seconds recommended for best quality
                    </p>
                  </div>

                  {/* Recording timer */}
                  {isRecording && (
                    <div className="mb-4 text-center">
                      <div className="text-3xl font-mono font-bold text-white mb-2">
                        {formatDuration(recordingDuration)}
                      </div>
                      <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${quality.bg} ${quality.color}`}>
                        {quality.label}
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${
                            recordingDuration >= RECOMMENDED_SECONDS
                              ? 'bg-emerald-500'
                              : recordingDuration >= MIN_RECORDING_SECONDS
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min((recordingDuration / RECOMMENDED_SECONDS) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {recordingDuration < MIN_RECORDING_SECONDS
                          ? `${MIN_RECORDING_SECONDS - recordingDuration}s more needed`
                          : recordingDuration < RECOMMENDED_SECONDS
                          ? `${RECOMMENDED_SECONDS - recordingDuration}s more for best quality`
                          : 'Great! You can stop recording now'}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-center">
                    <AIVoiceInput
                      isRecording={isRecording}
                      onToggle={handleToggleRecording}
                      visualizerBars={24}
                      className="[&_button]:!bg-white/10 [&_button]:!hover:bg-white/20"
                    />
                  </div>
                </div>
              ) : (
                <div className={`p-4 rounded-xl border ${canSubmit ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${canSubmit ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                        {canSubmit ? (
                          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${canSubmit ? 'text-emerald-400' : 'text-amber-400'}`}>
                          Recording complete - {formatDuration(recordingDuration)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(recordedBlob.size / 1024).toFixed(1)} KB
                          {!canSubmit && ` - Too short, need ${MIN_RECORDING_SECONDS}s minimum`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={resetRecording}
                      disabled={isProcessing}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 text-xs font-medium transition-all disabled:opacity-50"
                    >
                      Re-record
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status message */}
          {isProcessing && (
            <div className="flex items-center justify-center gap-3 py-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-400/30 border-t-indigo-400"></div>
              <span className="text-indigo-400 text-sm font-medium">{getStatusMessage()}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 font-medium transition-all disabled:opacity-50"
            >
              {isSuccess ? 'Close' : 'Cancel'}
            </button>
            {!isSuccess && (
              <button
                onClick={handleCloneVoice}
                disabled={!canSubmit || isProcessing || !creditInfo.canClone || !isConfigured}
                className="flex-1 px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                    Processing...
                  </>
                ) : (
                  'Clone Voice'
                )}
              </button>
            )}
          </div>

          {/* Cannot clone warning */}
          {!creditInfo.canClone && !isSuccess && (
            <p className="text-xs text-rose-400 text-center">
              {creditInfo.reason || 'Cannot clone voice at this time'}
            </p>
          )}
        </div>
      </GlassCard>
    </div>
  );
};
