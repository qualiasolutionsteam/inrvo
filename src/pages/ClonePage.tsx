import React, { lazy, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../layouts/AppLayout';
import { VoiceMetadata } from '../../types';
import { convertToWAV } from '../lib/audioConverter';
import { getVoiceProfileById } from '../../lib/supabase';

const SimpleVoiceClone = lazy(() => import('../../components/SimpleVoiceClone').then(m => ({ default: m.SimpleVoiceClone })));

const ClonePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    cloningStatus,
    setCloningStatus,
    creditInfo,
    setSelectedVoice,
    loadUserVoices,
  } = useApp();

  const handleRecordingComplete = useCallback(async (blob: Blob, name: string, metadata: VoiceMetadata) => {
    if (!user) {
      setCloningStatus({ state: 'error', message: 'Please sign in to clone your voice', canRetry: false });
      return;
    }

    setCloningStatus({ state: 'validating' });

    try {
      setCloningStatus({ state: 'processing_audio' });

      // Convert to WAV for ElevenLabs (required format)
      const wavBlob = await convertToWAV(blob);

      setCloningStatus({ state: 'uploading_to_elevenlabs' });

      // Clone with ElevenLabs
      let cloneResult: { voiceProfileId: string; elevenLabsVoiceId: string; voiceSampleUrl: string | null };
      try {
        const { elevenLabsCloneVoice } = await import('../lib/edgeFunctions');
        cloneResult = await elevenLabsCloneVoice(
          wavBlob,
          name,
          'Meditation voice clone created with INrVO',
          metadata,
          true // removeBackgroundNoise
        );
        console.log('Voice cloned successfully! Profile ID:', cloneResult.voiceProfileId, 'ElevenLabs Voice:', cloneResult.elevenLabsVoiceId);
      } catch (cloneError: unknown) {
        console.error('Voice cloning failed:', cloneError);
        setCloningStatus({
          state: 'error',
          message: cloneError instanceof Error ? cloneError.message : 'Voice cloning failed',
          canRetry: true,
        });
        return;
      }

      setCloningStatus({ state: 'saving_to_database' });

      // Voice profile already created by Edge Function - fetch it
      let savedVoice;
      try {
        if (!cloneResult.voiceProfileId) {
          throw new Error('No voice profile ID returned from server');
        }
        savedVoice = await getVoiceProfileById(cloneResult.voiceProfileId);
        if (!savedVoice) {
          throw new Error('Voice profile not found after cloning');
        }
      } catch (dbError: unknown) {
        console.error('Failed to fetch voice profile:', dbError);
        setCloningStatus({
          state: 'error',
          message: dbError instanceof Error ? dbError.message : 'Failed to save voice profile',
          canRetry: true,
        });
        return;
      }

      // Update selected voice
      setSelectedVoice({
        id: savedVoice.id,
        name: savedVoice.name,
        provider: 'elevenlabs',
        voiceName: savedVoice.name,
        description: savedVoice.description || 'Your personalized voice clone',
        isCloned: true,
        elevenLabsVoiceId: savedVoice.elevenlabs_voice_id,
        voiceSampleUrl: savedVoice.voice_sample_url,
      });

      // Reload user voices
      await loadUserVoices();

      setCloningStatus({ state: 'success', voiceId: savedVoice.id, voiceName: savedVoice.name });
    } catch (error: unknown) {
      console.error('Voice cloning error:', error);
      setCloningStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        canRetry: true,
      });
    }
  }, [user, setCloningStatus, setSelectedVoice, loadUserVoices]);

  return (
    <AppLayout className="flex flex-col">
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <SimpleVoiceClone
          onClose={() => {
            setCloningStatus({ state: 'idle' });
            navigate('/');
          }}
          onRecordingComplete={handleRecordingComplete}
          cloningStatus={cloningStatus}
          creditInfo={creditInfo}
        />
      </Suspense>
    </AppLayout>
  );
};

export default ClonePage;
