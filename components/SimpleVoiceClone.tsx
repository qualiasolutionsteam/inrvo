import React, { useState, useRef, useCallback } from 'react';
import { GlassCard } from './GlassCard';
import { VoiceProfile } from '../types';
import { AIVoiceInput } from './ui/ai-voice-input';
import { supabase, createVoiceProfile, getCurrentUser } from '../lib/supabase';

interface SimpleVoiceCloneProps {
  onClose: () => void;
  onVoiceCreated: (voice: VoiceProfile) => void;
  currentUserId?: string;
}

export const SimpleVoiceClone: React.FC<SimpleVoiceCloneProps> = ({
  onClose,
  onVoiceCreated,
  currentUserId
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRecordingComplete = useCallback(async (audioBase64: string) => {
    setRecordedAudio(audioBase64);
    setIsRecording(false);
  }, []);

  const handleSaveVoice = async () => {
    if (!recordedAudio || !currentUserId) {
      setError('Please record your voice and ensure you are signed in');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Create a unique name if not provided
      const voiceName = profileName.trim() || `Custom Voice ${Date.now()}`;

      // Save to Supabase
      const voiceProfile = await createVoiceProfile(
        voiceName,
        'Custom voice profile',
        'en-US',
        undefined, // No Gemini voice for custom voice
        undefined // No ElevenLabs voice ID
      );

      // Create new voice profile
      const newVoice: VoiceProfile = {
        id: `custom-${voiceProfile.id}`,
        name: voiceName,
        provider: 'Custom',
        voiceName: voiceName,
        description: 'Your custom voice profile',
        isCloned: true
      };

      onVoiceCreated(newVoice);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save voice profile');
    } finally {
      setIsSaving(false);
    }
  };

  const resetRecording = () => {
    setRecordedAudio(null);
    setIsRecording(false);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-lg p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Voice Profile</h2>
            <p className="text-slate-400 text-sm">Record your voice for personalized meditations</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-rose-400 text-sm font-medium bg-rose-500/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Profile name input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Voice Name
            </label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Custom Voice (optional)"
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Voice recording or playback */}
          <div className="space-y-4">
            {!recordedAudio ? (
              <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                <p className="text-center text-slate-400 text-sm mb-4">
                  Click to record your voice (max 30 seconds)
                </p>
                <div className="flex justify-center">
                  <AIVoiceInput
                    isRecording={isRecording}
                    onToggle={(recording) => {
                      if (recording) {
                        setIsRecording(true);
                      } else {
                        setIsRecording(false);
                      }
                    }}
                    onComplete={handleRecordingComplete}
                    visualizerBars={24}
                    className="[&_button]:!bg-white/10 [&_button]:!hover:bg-white/20"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-400">Recording complete</p>
                      <p className="text-xs text-slate-500">Ready to save</p>
                    </div>
                  </div>
                  <button
                    onClick={resetRecording}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 text-xs font-medium transition-all"
                  >
                    Re-record
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveVoice}
              disabled={!recordedAudio || isSaving || !currentUserId}
              className="flex-1 px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                  Saving...
                </>
              ) : (
                'Save Voice'
              )}
            </button>
          </div>

          {/* User info warning */}
          {!currentUserId && (
            <p className="text-xs text-slate-500 text-center">
              Please sign in to save voice profiles
            </p>
          )}
        </div>
      </GlassCard>
    </div>
  );
};