import { useState, useCallback } from 'react';
import { VoiceProfile, CloningStatus, CreditInfo, VoiceMetadata, DEFAULT_VOICE_METADATA, VoiceProvider } from '../../types';
import { creditService } from '../lib/credits';
import { fishAudioCloneVoice, chatterboxCloneVoice } from '../lib/edgeFunctions';
import {
  createVoiceClone,
  getUserVoiceProfiles,
  VoiceProfile as DBVoiceProfile
} from '../../lib/supabase';
import { blobToBase64 } from '../../geminiService';
import { convertToWAV, validateAudioForCloning } from '../lib/audioConverter';

// Fish Audio is the primary provider (best quality, real-time API)
// Chatterbox/Replicate is the fallback
const DEFAULT_CLONE_PROVIDER: VoiceProvider = 'fish-audio';

/**
 * Convert base64 audio to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

interface UseVoiceCloningOptions {
  userId?: string;
  onError?: (error: string) => void;
  onVoiceCreated?: (voice: VoiceProfile) => void;
  onCreditInfoUpdated?: (info: CreditInfo) => void;
}

interface UseVoiceCloningReturn {
  // State
  cloningStatus: CloningStatus;
  creditInfo: CreditInfo;
  savedVoices: DBVoiceProfile[];
  selectedVoice: VoiceProfile | null;
  isSavingVoice: boolean;
  voiceSaved: boolean;
  savedVoiceId: string | null;
  newProfileName: string;
  nameError: string | null;
  isRecordingClone: boolean;
  recordingProgressClone: number;

  // Setters
  setSelectedVoice: (voice: VoiceProfile | null) => void;
  setNewProfileName: (name: string) => void;
  setCloningStatus: (status: CloningStatus) => void;
  setIsRecordingClone: (recording: boolean) => void;
  setRecordingProgressClone: (progress: number) => void;

  // Actions
  fetchCreditInfo: () => Promise<void>;
  handleCloneRecordingComplete: (blob: Blob, name: string, metadata?: VoiceMetadata) => Promise<void>;
  autoSaveVoiceRecording: (audioData: string, metadata?: VoiceMetadata) => Promise<void>;
  loadUserVoices: () => Promise<void>;
  resetCloningState: () => void;
}

const DEFAULT_CREDIT_INFO: CreditInfo = {
  canClone: false,
  creditsRemaining: 0,
  clonesRemaining: 0,
  cloneCost: 5000,
};

export function useVoiceCloning(
  options: UseVoiceCloningOptions = {}
): UseVoiceCloningReturn {
  const { userId, onError, onVoiceCreated, onCreditInfoUpdated } = options;

  // Cloning state
  const [cloningStatus, setCloningStatus] = useState<CloningStatus>({ state: 'idle' });
  const [creditInfo, setCreditInfo] = useState<CreditInfo>(DEFAULT_CREDIT_INFO);

  // Voice profile state
  const [savedVoices, setSavedVoices] = useState<DBVoiceProfile[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile | null>(null);

  // Recording state
  const [isRecordingClone, setIsRecordingClone] = useState(false);
  const [recordingProgressClone, setRecordingProgressClone] = useState(0);

  // Save state
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  const [voiceSaved, setVoiceSaved] = useState(false);
  const [savedVoiceId, setSavedVoiceId] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  // Load user voices
  const loadUserVoices = useCallback(async () => {
    try {
      const profiles = await getUserVoiceProfiles();
      setSavedVoices(profiles);
    } catch (error) {
      console.error('Failed to load user voices:', error);
    }
  }, []);

  // Fetch credit info
  const fetchCreditInfo = useCallback(async () => {
    if (!userId) {
      const info: CreditInfo = {
        canClone: false,
        creditsRemaining: 0,
        clonesRemaining: 0,
        cloneCost: 5000,
        reason: 'Please sign in to clone your voice',
      };
      setCreditInfo(info);
      onCreditInfoUpdated?.(info);
      return;
    }

    try {
      const [canCloneResult, credits, clonesRemaining] = await Promise.all([
        creditService.canClone(userId),
        creditService.getCredits(userId),
        creditService.getClonesRemaining(userId),
      ]);

      const costConfig = creditService.getCostConfig();

      const info: CreditInfo = {
        canClone: canCloneResult.can,
        creditsRemaining: credits,
        clonesRemaining: clonesRemaining,
        cloneCost: costConfig.VOICE_CLONE,
        reason: canCloneResult.reason,
      };
      setCreditInfo(info);
      onCreditInfoUpdated?.(info);
    } catch (error) {
      console.error('Failed to fetch credit info:', error);
      const info: CreditInfo = {
        canClone: false,
        creditsRemaining: 0,
        clonesRemaining: 0,
        cloneCost: 5000,
        reason: 'Failed to check credits',
      };
      setCreditInfo(info);
    }
  }, [userId, onCreditInfoUpdated]);

  // Handle recording complete from SimpleVoiceClone
  // Uses Fish Audio as primary (best quality), Chatterbox as fallback
  const handleCloneRecordingComplete = useCallback(async (
    blob: Blob,
    name: string,
    metadata?: VoiceMetadata,
    _provider: VoiceProvider = DEFAULT_CLONE_PROVIDER
  ) => {
    if (!userId) {
      setCloningStatus({ state: 'error', message: 'Please sign in to clone your voice', canRetry: false });
      return;
    }

    setCloningStatus({ state: 'validating' });

    const voiceMetadata = metadata || DEFAULT_VOICE_METADATA;

    try {
      // Validate audio quality
      const validation = await validateAudioForCloning(blob);
      if (!validation.valid) {
        setCloningStatus({
          state: 'error',
          message: validation.message || 'Audio validation failed',
          canRetry: true
        });
        return;
      }

      // Convert WebM/MP4 to high-quality WAV for better voice cloning
      setCloningStatus({ state: 'processing_audio' });
      const wavBlob = await convertToWAV(blob);

      // Try Fish Audio first (primary, best quality)
      setCloningStatus({ state: 'uploading_to_fish_audio' });

      let cloneResult: { voiceProfileId: string; fishAudioModelId?: string | null; voiceSampleUrl?: string | null };

      try {
        // Fish Audio cloning (stores audio in both Fish Audio and Supabase for fallback)
        cloneResult = await fishAudioCloneVoice(
          wavBlob,
          name,
          'Meditation voice clone created with INrVO',
          voiceMetadata
        );
      } catch (fishError: any) {
        console.warn('Fish Audio cloning failed, trying Chatterbox fallback:', fishError.message);

        // Fallback to Chatterbox
        setCloningStatus({ state: 'uploading_to_chatterbox' });
        try {
          const chatterboxResult = await chatterboxCloneVoice(
            wavBlob,
            name,
            'Meditation voice clone created with INrVO',
            voiceMetadata
          );
          cloneResult = {
            voiceProfileId: chatterboxResult.voiceProfileId,
            voiceSampleUrl: chatterboxResult.voiceSampleUrl,
          };
        } catch (chatterboxError: any) {
          console.error('Both Fish Audio and Chatterbox failed:', chatterboxError);
          setCloningStatus({
            state: 'error',
            message: chatterboxError.message || 'Voice cloning failed',
            canRetry: true,
          });
          return;
        }
      }

      // Create voice profile for UI
      const newVoice: VoiceProfile = {
        id: cloneResult.voiceProfileId,
        name: name,
        provider: cloneResult.fishAudioModelId ? 'fish-audio' : 'chatterbox',
        voiceName: name,
        description: 'Your personalized cloned voice',
        isCloned: true,
        providerVoiceId: cloneResult.voiceSampleUrl || undefined,
      };

      // Update state - add to local cache instead of re-fetching (saves 50-100ms)
      setSelectedVoice(newVoice);
      const now = new Date().toISOString();
      setSavedVoices(prev => [
        {
          id: cloneResult.voiceProfileId,
          user_id: userId,
          name: name,
          description: 'Your personalized cloned voice',
          language: 'en',
          status: 'READY',
          provider: cloneResult.fishAudioModelId ? 'fish-audio' : 'chatterbox',
          fish_audio_model_id: cloneResult.fishAudioModelId || undefined,
          voice_sample_url: cloneResult.voiceSampleUrl || undefined,
          created_at: now,
          updated_at: now,
        } as DBVoiceProfile,
        ...prev,
      ]);
      onVoiceCreated?.(newVoice);

      setCloningStatus({
        state: 'success',
        voiceId: cloneResult.voiceProfileId,
        voiceName: name,
      });
    } catch (error: any) {
      console.error('Voice cloning failed:', error);
      setCloningStatus({
        state: 'error',
        message: error.message || 'Failed to clone voice',
        canRetry: true,
      });
    }
  }, [userId, onVoiceCreated]);

  // Auto-save voice recording (from voice input)
  // Uses Fish Audio (primary) with Chatterbox fallback
  const autoSaveVoiceRecording = useCallback(async (audioData: string) => {
    if (!userId) {
      onError?.('Please sign in to save your voice');
      return;
    }

    // Generate a default name if not provided
    let profileName = newProfileName.trim();

    if (!profileName) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const dateStr = now.toLocaleDateString();
      const ms = now.getMilliseconds().toString().padStart(3, '0');
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      profileName = `My Voice ${dateStr} ${timeStr}.${ms}.${randomSuffix}`;
    }

    // Check for existing names using local state instead of re-fetching (saves 50-100ms)
    const existingNames = new Set(savedVoices.map(p => p.name.toLowerCase()));
    let finalName = profileName;
    let counter = 1;

    while (existingNames.has(finalName.toLowerCase())) {
      if (counter === 1) {
        finalName = `${profileName} (copy)`;
      } else if (counter === 2) {
        finalName = `${profileName} (2)`;
      } else {
        finalName = `${profileName} (${counter})`;
      }
      counter++;

      if (counter > 100) {
        const uuid = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        finalName = `${profileName}-${uuid}`;
        break;
      }
    }

    setIsSavingVoice(true);
    setNameError(null);
    setVoiceSaved(false);

    try {
      // Convert base64 to blob for Chatterbox
      const audioBlob = base64ToBlob(audioData, 'audio/webm');

      // Validate audio quality
      const validation = await validateAudioForCloning(audioBlob);
      if (!validation.valid) {
        onError?.(validation.message || 'Audio validation failed');
        setIsSavingVoice(false);
        return;
      }

      // Convert WebM to high-quality WAV for better voice cloning
      const wavBlob = await convertToWAV(audioBlob);

      // Clone voice with Fish Audio (primary) or Chatterbox (fallback)
      let cloneResult: { voiceProfileId: string; fishAudioModelId?: string | null; voiceSampleUrl?: string | null };
      try {
        cloneResult = await fishAudioCloneVoice(
          wavBlob,
          finalName,
          'Voice clone created with INrVO'
        );
      } catch (fishError: any) {
        console.warn('Fish Audio failed, trying Chatterbox:', fishError.message);
        try {
          const chatterboxResult = await chatterboxCloneVoice(
            wavBlob,
            finalName,
            'Voice clone created with INrVO'
          );
          cloneResult = {
            voiceProfileId: chatterboxResult.voiceProfileId,
            voiceSampleUrl: chatterboxResult.voiceSampleUrl,
          };
        } catch (cloneError: any) {
          console.error('Both Fish Audio and Chatterbox failed:', cloneError);
          onError?.(`Voice cloning failed: ${cloneError.message}`);
          setIsSavingVoice(false);
          return;
        }
      }

      // Save audio sample backup (non-critical)
      try {
        await createVoiceClone(
          finalName,
          audioData,
          'Voice sample for cloned voice',
          { providerVoiceId: cloneResult.voiceSampleUrl }
        );
      } catch (e) {
        console.warn('Failed to save voice sample:', e);
      }

      if (!newProfileName.trim()) {
        setNewProfileName(finalName);
      }

      setSavedVoiceId(cloneResult.voiceProfileId);
      setVoiceSaved(true);

      // Create and select new voice
      const newVoice: VoiceProfile = {
        id: cloneResult.voiceProfileId,
        name: finalName,
        provider: cloneResult.fishAudioModelId ? 'fish-audio' : 'chatterbox',
        voiceName: finalName,
        description: 'Your personalized cloned voice',
        isCloned: true,
        providerVoiceId: cloneResult.voiceSampleUrl || undefined,
      };

      // Update local state instead of re-fetching (saves 50-100ms)
      const now = new Date().toISOString();
      setSavedVoices(prev => [
        {
          id: cloneResult.voiceProfileId,
          user_id: userId,
          name: finalName,
          description: 'Your personalized cloned voice',
          language: 'en',
          status: 'READY',
          provider: cloneResult.fishAudioModelId ? 'fish-audio' : 'chatterbox',
          fish_audio_model_id: cloneResult.fishAudioModelId || undefined,
          voice_sample_url: cloneResult.voiceSampleUrl || undefined,
          created_at: now,
          updated_at: now,
        } as DBVoiceProfile,
        ...prev,
      ]);

      setSelectedVoice(newVoice);
      onVoiceCreated?.(newVoice);
    } catch (error: any) {
      console.error('Failed to auto-save voice:', error);
      onError?.(error?.message || 'Failed to save voice. Please try again.');
    } finally {
      setIsSavingVoice(false);
    }
  }, [userId, newProfileName, savedVoices, onError, onVoiceCreated]);

  // Reset cloning state
  const resetCloningState = useCallback(() => {
    setCloningStatus({ state: 'idle' });
    setNewProfileName('');
    setVoiceSaved(false);
    setSavedVoiceId(null);
    setNameError(null);
    setIsRecordingClone(false);
    setRecordingProgressClone(0);
  }, []);

  return {
    // State
    cloningStatus,
    creditInfo,
    savedVoices,
    selectedVoice,
    isSavingVoice,
    voiceSaved,
    savedVoiceId,
    newProfileName,
    nameError,
    isRecordingClone,
    recordingProgressClone,

    // Setters
    setSelectedVoice,
    setNewProfileName,
    setCloningStatus,
    setIsRecordingClone,
    setRecordingProgressClone,

    // Actions
    fetchCreditInfo,
    handleCloneRecordingComplete,
    autoSaveVoiceRecording,
    loadUserVoices,
    resetCloningState,
  };
}
