import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import GlassCard from './GlassCard';
import {
  CloningStatus,
  CreditInfo,
  VoiceMetadata,
  DEFAULT_VOICE_METADATA,
  VOICE_LANGUAGES,
  getAccentsForLanguage
} from '../types';
import { AIVoiceInput } from './ui/ai-voice-input';

interface SimpleVoiceCloneProps {
  onClose: () => void;
  onRecordingComplete: (blob: Blob, name: string, metadata: VoiceMetadata) => Promise<void>;
  cloningStatus: CloningStatus;
  creditInfo: CreditInfo;
}

// Recording settings - 30+ seconds recommended for best quality
const MIN_RECORDING_SECONDS = 30; // Minimum for acceptable quality
const RECOMMENDED_SECONDS = 45;   // Recommended for best quality
const MAX_RECORDING_SECONDS = 90; // Maximum allowed

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

  // Voice characteristics state
  const [gender, setGender] = useState<VoiceMetadata['gender']>(DEFAULT_VOICE_METADATA.gender);
  const [ageRange, setAgeRange] = useState<VoiceMetadata['ageRange']>(DEFAULT_VOICE_METADATA.ageRange);
  const [language, setLanguage] = useState(DEFAULT_VOICE_METADATA.language);
  const [accent, setAccent] = useState(DEFAULT_VOICE_METADATA.accent);
  const [descriptive, setDescriptive] = useState(DEFAULT_VOICE_METADATA.descriptive || 'calm');

  // Get available accents based on selected language
  const availableAccents = getAccentsForLanguage(language);

  // Reset accent when language changes
  useEffect(() => {
    const accents = getAccentsForLanguage(language);
    if (!accents.find(a => a.value === accent)) {
      setAccent(accents[0]?.value || 'native');
    }
  }, [language, accent]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Voice cloning is always configured
  const isConfigured = true;

  // Derive state from cloningStatus
  const isProcessing = cloningStatus.state === 'validating' ||
                       cloningStatus.state === 'processing_audio' ||
                       cloningStatus.state === 'uploading' ||
                       cloningStatus.state === 'uploading_to_elevenlabs' ||
                       cloningStatus.state === 'saving_to_database';

  const error = cloningStatus.state === 'error' ? cloningStatus.message : localError;
  const isSuccess = cloningStatus.state === 'success';

  // Show toast notifications for cloning status changes
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
    } else if (cloningStatus.state === 'error') {
      toast.error('Voice cloning failed', {
        id: 'voice-clone',
        description: cloningStatus.message || 'Please try again',
      });
    }
  }, [cloningStatus.state, cloningStatus.voiceName, cloningStatus.message]);

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
          echoCancellation: false,     // Preserve natural voice characteristics
          noiseSuppression: false,     // Keep voice qualities for better cloning
          autoGainControl: false,      // Preserve natural volume dynamics
          sampleRate: 44100,           // Matches ElevenLabs expected rate (eliminates server resampling)
          channelCount: 1,             // Mono for voice clarity
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
      setLocalError('Voice cloning service not configured. Please check your settings.');
      return;
    }

    if (!creditInfo.canClone) {
      setLocalError(creditInfo.reason || 'Cannot clone voice at this time');
      return;
    }

    const voiceName = profileName.trim() || `My Voice ${new Date().toLocaleDateString()}`;

    // Build metadata from user selections
    const metadata: VoiceMetadata = {
      language,
      accent,
      gender,
      ageRange,
      hasBackgroundNoise: false, // Recording tips should minimize this
      useCase: 'meditation',
      descriptive,
    };

    await onRecordingComplete(recordedBlob, voiceName, metadata);
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
        return 'Analyzing your voice...';
      case 'processing_audio':
        return 'Preparing your recording...';
      case 'uploading':
      case 'uploading_to_elevenlabs':
        return cloningStatus.progress
          ? `Capturing your inner voice... ${cloningStatus.progress}%`
          : 'Capturing your inner voice...';
      case 'saving_to_database':
        return 'Saving your voice profile...';
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
      <GlassCard className="w-full max-w-lg relative max-h-[90vh] flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Clone Your Voice</h2>
            <p className="text-slate-400 text-sm">
              Record your voice for a personalized meditation experience
            </p>
          </div>

          {/* Service Warning */}
          {!isConfigured && (
            <div className="text-amber-400 text-sm font-medium bg-amber-500/10 p-3 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Voice cloning service not configured. Please check your settings.</span>
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
            <div className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <span className="text-cyan-400">Cost: {creditInfo.cloneCost.toLocaleString()}</span>
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

          {/* Voice Name Input */}
          {!isSuccess && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Voice Name (optional)
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="My Meditation Voice"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-all"
              />
            </div>
          )}

          {/* Voice Characteristics Form */}
          {!isSuccess && (
            <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Voice Characteristics
                </span>
              </div>
              <p className="text-xs text-slate-500 -mt-2">
                Help us create a better voice clone by describing your voice
              </p>

              {/* Gender & Age Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as VoiceMetadata['gender'])}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500 transition-all appearance-none cursor-pointer"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem' }}
                  >
                    <option value="female" className="bg-slate-800">Female</option>
                    <option value="male" className="bg-slate-800">Male</option>
                    <option value="other" className="bg-slate-800">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Age Range</label>
                  <select
                    value={ageRange}
                    onChange={(e) => setAgeRange(e.target.value as VoiceMetadata['ageRange'])}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500 transition-all appearance-none cursor-pointer"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem' }}
                  >
                    <option value="young" className="bg-slate-800">Young (18-30)</option>
                    <option value="middle-aged" className="bg-slate-800">Middle-aged (30-50)</option>
                    <option value="mature" className="bg-slate-800">Mature (50+)</option>
                  </select>
                </div>
              </div>

              {/* Language & Accent Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500 transition-all appearance-none cursor-pointer"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem' }}
                  >
                    {VOICE_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code} className="bg-slate-800">
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Accent</label>
                  <select
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500 transition-all appearance-none cursor-pointer"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem' }}
                  >
                    {availableAccents.map((acc) => (
                      <option key={acc.value} value={acc.value} className="bg-slate-800">
                        {acc.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Voice Quality */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Voice Quality</label>
                <div className="flex flex-wrap gap-2">
                  {['calm', 'warm', 'soothing', 'gentle', 'deep', 'soft'].map((quality) => (
                    <button
                      key={quality}
                      type="button"
                      onClick={() => setDescriptive(quality)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        descriptive === quality
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {quality.charAt(0).toUpperCase() + quality.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recording */}
          {!isSuccess && (
            <div className="space-y-4">
              {/* Recording tips */}
              {!recordedBlob && !isRecording && (
                <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-cyan-400 text-sm font-medium mb-2">Recording Tips for Best Quality:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• Speak calmly at a meditation pace</li>
                    <li>• Stay 6-12 inches from your microphone</li>
                    <li>• Keep the same energy level throughout</li>
                    <li>• Record at least {MIN_RECORDING_SECONDS} seconds (longer is better)</li>
                  </ul>
                </div>
              )}

              {/* Voice recording or playback */}
              {!recordedBlob ? (
                <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                  {/* Recording instructions */}
                  <div className="text-center mb-4">
                    <p className="text-slate-300 text-sm font-medium mb-1">
                      {isRecording ? 'Recording...' : 'Click to start recording'}
                    </p>
                    <p className="text-slate-500 text-xs">
                      Minimum {MIN_RECORDING_SECONDS} seconds, {RECOMMENDED_SECONDS}+ recommended
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

              {/* Status message */}
              {isProcessing && (
                <div className="flex items-center justify-center gap-3 py-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-400/30 border-t-cyan-400"></div>
                  <span className="text-cyan-400 text-sm font-medium">{getStatusMessage()}</span>
                </div>
              )}
            </div>
          )}

          {/* Cannot clone warning */}
          {!creditInfo.canClone && !isSuccess && (
            <p className="text-xs text-rose-400 text-center">
              {creditInfo.reason || 'Cannot clone voice at this time'}
            </p>
          )}
        </div>

        {/* Sticky footer with action buttons */}
        <div className="flex-shrink-0 p-6 pt-4 border-t border-white/10 bg-slate-900/50">
          {/* Clone button */}
          {!isSuccess && (
            <button
              onClick={handleCloneVoice}
              disabled={!canSubmit || isProcessing || !creditInfo.canClone || !isConfigured}
              className="w-full px-4 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

          {/* Success state - Done button */}
          {isSuccess && (
            <button
              onClick={onClose}
              className="w-full px-4 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-all"
            >
              Done
            </button>
          )}
        </div>
      </GlassCard>
    </div>
  );
};
