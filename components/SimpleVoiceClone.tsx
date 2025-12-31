import React, { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import { toast } from 'sonner';
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

// Recording settings
const MIN_RECORDING_SECONDS = 30;
const RECOMMENDED_SECONDS = 45;
const MAX_RECORDING_SECONDS = 90;

type Step = 'record' | 'describe' | 'processing';

// Move constant arrays outside component to prevent recreation
const VOICE_QUALITIES = ['calm', 'warm', 'soothing', 'gentle', 'deep', 'soft'] as const;
const GENDERS = ['female', 'male'] as const;
const TIPS = [
  'Speak slowly at a calm pace',
  'Stay consistent with your tone',
  'Use a quiet environment',
] as const;

// Memoized select dropdown style (prevents object recreation)
const SELECT_STYLE = {
  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.5rem center',
  backgroundSize: '1rem',
} as const;

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

  // Voice characteristics
  const [gender, setGender] = useState<VoiceMetadata['gender']>(DEFAULT_VOICE_METADATA.gender);
  const [ageRange, setAgeRange] = useState<VoiceMetadata['ageRange']>(DEFAULT_VOICE_METADATA.ageRange);
  const [language, setLanguage] = useState(DEFAULT_VOICE_METADATA.language);
  const [accent, setAccent] = useState(DEFAULT_VOICE_METADATA.accent);
  const [descriptive, setDescriptive] = useState(DEFAULT_VOICE_METADATA.descriptive || 'calm');

  // Memoize accent list to prevent recalculation
  const availableAccents = useMemo(() => getAccentsForLanguage(language), [language]);

  useEffect(() => {
    if (!availableAccents.find(a => a.value === accent)) {
      setAccent(availableAccents[0]?.value || 'native');
    }
  }, [language, availableAccents, accent]);

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
    } else if (cloningStatus.state === 'error') {
      toast.error('Voice cloning failed', {
        id: 'voice-clone',
        description: cloningStatus.message || 'Please try again',
      });
      setStep('describe');
    }
  }, [cloningStatus.state, cloningStatus.voiceName, cloningStatus.message]);

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
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
          channelCount: 1,
        }
      });
      streamRef.current = stream;

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

    } catch (e: any) {
      console.error('Recording error:', e);
      if (e.name === 'NotAllowedError') {
        setLocalError('Microphone access denied. Please allow microphone access.');
      } else if (e.name === 'NotFoundError') {
        setLocalError('No microphone found. Please connect a microphone.');
      } else {
        setLocalError(e.message || 'Failed to start recording');
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

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

    if (!creditInfo.canClone) {
      setLocalError(creditInfo.reason || 'Cannot clone voice at this time');
      return;
    }

    const voiceName = profileName.trim() || `My Voice ${new Date().toLocaleDateString()}`;

    const metadata: VoiceMetadata = {
      language,
      accent,
      gender,
      ageRange,
      hasBackgroundNoise: false,
      useCase: 'meditation',
      descriptive,
    };

    setStep('processing');
    await onRecordingComplete(recordedBlob, voiceName, metadata);
  };

  const resetRecording = () => {
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
  }, [cloningStatus.state, cloningStatus.progress, cloningStatus.voiceName]);

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

        {/* Processing State */}
        {step === 'processing' && !isSuccess && (
          <div className="flex flex-col items-center justify-center min-h-full px-6 py-12">
            <div className="relative w-24 h-24 mb-8" style={{ contain: 'layout paint' }}>
              {/* Spinning ring - use GPU-accelerated transform */}
              <div
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-500"
                style={{ animation: 'spin 1s linear infinite', willChange: 'transform' }}
              />
              {/* Inner glow - static, no animation */}
              <div className="absolute inset-3 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>
            <p className="text-lg font-medium text-white mb-2">{statusMessage}</p>
            <p className="text-slate-500 text-sm">This usually takes about 30 seconds</p>

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

                    {/* Main recorder button */}
                    <div className="relative z-10">
                      <AIVoiceInput
                        isRecording={isRecording}
                        onToggle={handleToggleRecording}
                        visualizerBars={16}
                        className="scale-125"
                      />
                    </div>
                  </div>

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
                        : `Record at least ${MIN_RECORDING_SECONDS}s of calm speech`}
                    </p>
                  </div>

                  {/* Tips - only show when not recording */}
                  {!isRecording && (
                    <div className="mt-8 w-full max-w-sm space-y-2">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Quick Tips</p>
                      {TIPS.map((tip, i) => (
                        <div key={i} className="flex items-center gap-2 text-slate-500 text-sm">
                          <svg className="w-4 h-4 text-cyan-500/70 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {tip}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Recording Complete */
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
                  <p className="text-slate-400 text-sm mb-6">
                    {formatDuration(recordingDuration)} recorded
                    {!canProceed && ` - need ${MIN_RECORDING_SECONDS}s minimum`}
                  </p>

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
            </div>

            {/* Voice Characteristics - Compact Grid */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-300">Voice Characteristics</p>

              <div className="grid grid-cols-2 gap-3">
                {/* Gender */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500">Gender</label>
                  <div className="flex gap-1.5">
                    {(['female', 'male'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGender(g)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                          gender === g
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {g === 'female' ? 'Female' : 'Male'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Age */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500">Age Range</label>
                  <select
                    value={ageRange}
                    onChange={(e) => setAgeRange(e.target.value as VoiceMetadata['ageRange'])}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer"
                    style={SELECT_STYLE}
                  >
                    <option value="young" className="bg-slate-900">Young</option>
                    <option value="middle-aged" className="bg-slate-900">Middle</option>
                    <option value="mature" className="bg-slate-900">Mature</option>
                  </select>
                </div>

                {/* Language */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer"
                    style={SELECT_STYLE}
                  >
                    {VOICE_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code} className="bg-slate-900">
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Accent */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500">Accent</label>
                  <select
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer"
                    style={SELECT_STYLE}
                  >
                    {availableAccents.map((acc) => (
                      <option key={acc.value} value={acc.value} className="bg-slate-900">
                        {acc.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Voice Quality Pills */}
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Voice Quality</label>
                <div className="flex flex-wrap gap-2">
                  {VOICE_QUALITIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => setDescriptive(q)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        descriptive === q
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {q.charAt(0).toUpperCase() + q.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recording info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Recording ready</p>
                <p className="text-xs text-slate-500">{formatDuration(recordingDuration)} · {fileSizeDisplay}</p>
              </div>
              <button
                onClick={resetRecording}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-medium transition-all"
              >
                Re-record
              </button>
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
