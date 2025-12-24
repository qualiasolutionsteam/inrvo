import { useState, useCallback } from 'react';
import { VoiceProfile, CloningStatus, CreditInfo, VoiceMetadata, DEFAULT_VOICE_METADATA, VoiceProvider } from '../../types';
import { creditService } from '../lib/credits';
import { elevenlabsService, base64ToBlob } from '../lib/elevenlabs';
import { chatterboxCloneVoice } from '../lib/edgeFunctions';
import {
  createVoiceProfile,
  createVoiceClone,
  getUserVoiceProfiles,
  VoiceProfile as DBVoiceProfile
} from '../../lib/supabase';
import { blobToBase64 } from '../../geminiService';

// Default to Chatterbox for new clones (10x cheaper than ElevenLabs)
const DEFAULT_CLONE_PROVIDER: VoiceProvider = 'chatterbox';

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
  // Now defaults to Chatterbox (10x cheaper than ElevenLabs)
  const handleCloneRecordingComplete = useCallback(async (
    blob: Blob,
    name: string,
    metadata?: VoiceMetadata,
    provider: VoiceProvider = DEFAULT_CLONE_PROVIDER
  ) => {
    if (!userId) {
      setCloningStatus({ state: 'error', message: 'Please sign in to clone your voice', canRetry: false });
      return;
    }

    setCloningStatus({ state: 'validating' });

    const voiceMetadata = metadata || DEFAULT_VOICE_METADATA;

    try {
      // Skip credit check for Chatterbox (much cheaper, pay-per-use via Replicate)
      if (provider !== 'chatterbox') {
        const { can: canClone, reason } = await creditService.canClone(userId);
        if (!canClone) {
          setCloningStatus({ state: 'error', message: reason || 'Cannot clone voice', canRetry: false });
          return;
        }
      }

      // Route to appropriate provider
      if (provider === 'chatterbox') {
        setCloningStatus({ state: 'uploading_to_chatterbox' });

        // Clone with Chatterbox via Replicate
        // Zero-shot cloning - just uploads audio sample, used at TTS time
        let cloneResult: { voiceProfileId: string; voiceSampleUrl: string };
        try {
          cloneResult = await chatterboxCloneVoice(
            blob,
            name,
            'Meditation voice clone created with INrVO',
            voiceMetadata
          );
        } catch (cloneError: any) {
          console.error('Chatterbox voice cloning failed:', cloneError);
          setCloningStatus({
            state: 'error',
            message: cloneError.message || 'Voice cloning failed',
            canRetry: true,
          });
          return;
        }

        // Create voice profile for UI
        const newVoice: VoiceProfile = {
          id: cloneResult.voiceProfileId,
          name: name,
          provider: 'chatterbox',
          voiceName: name,
          description: 'Your personalized cloned voice (Chatterbox)',
          isCloned: true,
          providerVoiceId: cloneResult.voiceSampleUrl,
        };

        // Update state
        setSelectedVoice(newVoice);
        onVoiceCreated?.(newVoice);

        // Reload voices
        await loadUserVoices();

        setCloningStatus({
          state: 'success',
          voiceId: cloneResult.voiceProfileId,
          voiceName: name,
        });
      } else {
        // Legacy ElevenLabs path
        setCloningStatus({ state: 'uploading_to_elevenlabs' });

        // Clone with ElevenLabs - this creates BOTH the ElevenLabs voice AND the database profile
        let cloneResult: { elevenlabsVoiceId: string; voiceProfileId: string };
        try {
          cloneResult = await elevenlabsService.cloneVoice(blob, {
            name,
            description: 'Meditation voice clone created with INrVO',
            metadata: voiceMetadata,
          });
        } catch (cloneError: any) {
          console.error('Voice cloning failed:', cloneError);
          setCloningStatus({
            state: 'error',
            message: cloneError.message || 'Voice cloning failed',
            canRetry: true,
          });
          return;
        }

        setCloningStatus({ state: 'saving_to_database' });

        // Save audio sample as backup (non-critical)
        try {
          const base64 = await blobToBase64(blob);
          await createVoiceClone(
            name,
            base64,
            'Voice sample for cloned voice',
            { elevenlabsVoiceId: cloneResult.elevenlabsVoiceId }
          );
        } catch (e) {
          console.warn('Failed to save voice sample backup:', e);
        }

        // Create voice profile for UI
        const newVoice: VoiceProfile = {
          id: cloneResult.voiceProfileId,
          name: name,
          provider: 'elevenlabs',
          voiceName: name,
          description: 'Your personalized cloned voice',
          isCloned: true,
          elevenlabsVoiceId: cloneResult.elevenlabsVoiceId,
        };

        // Update state
        setSelectedVoice(newVoice);
        onVoiceCreated?.(newVoice);

        // Reload voices
        await loadUserVoices();

        // Update credit info
        await fetchCreditInfo();

        setCloningStatus({
          state: 'success',
          voiceId: cloneResult.voiceProfileId,
          voiceName: name,
        });
      }
    } catch (error: any) {
      console.error('Voice cloning failed:', error);
      setCloningStatus({
        state: 'error',
        message: error.message || 'Failed to clone voice',
        canRetry: true,
      });
    }
  }, [userId, loadUserVoices, fetchCreditInfo, onVoiceCreated]);

  // Auto-save voice recording (from voice input)
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

    // Check for existing names and add suffix if needed
    const existingProfiles = await getUserVoiceProfiles();
    const existingNames = new Set(existingProfiles.map(p => p.name.toLowerCase()));
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
      // Check if user can clone voice
      const { can: canClone, reason } = await creditService.canClone(userId);
      if (!canClone) {
        onError?.(reason || 'Cannot clone voice at this time');
        setIsSavingVoice(false);
        return;
      }

      const costConfig = creditService.getCostConfig();

      // Convert base64 to blob for ElevenLabs
      const audioBlob = base64ToBlob(audioData, 'audio/webm');

      // Clone voice with ElevenLabs
      let cloneResult: { elevenlabsVoiceId: string; voiceProfileId: string } | null = null;
      try {
        cloneResult = await elevenlabsService.cloneVoice(audioBlob, {
          name: finalName,
          description: 'Voice clone created with INrVO'
        });

        // Deduct credits for successful cloning
        await creditService.deductCredits(
          costConfig.VOICE_CLONE,
          'CLONE_CREATE',
          undefined,
          userId
        );
      } catch (cloneError: any) {
        console.error('ElevenLabs voice clone failed:', cloneError);
        onError?.(`Voice cloning failed: ${cloneError.message}`);
        setIsSavingVoice(false);
        return;
      }

      const elevenlabsVoiceId = cloneResult?.elevenlabsVoiceId;

      // Create voice profile entry with ElevenLabs ID
      let savedVoice = null;
      let retryCount = 0;
      const maxRetries = 5;
      let currentName = finalName;

      while (!savedVoice && retryCount < maxRetries) {
        try {
          savedVoice = await createVoiceProfile(
            currentName,
            'Cloned voice profile',
            'en-US',
            undefined,
            elevenlabsVoiceId
          );
        } catch (error: any) {
          if (error.message?.includes('already exists') && retryCount < maxRetries - 1) {
            const uuid = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            currentName = `${profileName}-${uuid}`;
            retryCount++;
            continue;
          }
          throw error;
        }
      }

      if (savedVoice) {
        // Save audio sample backup
        try {
          await createVoiceClone(
            savedVoice.name,
            audioData,
            'Voice sample for cloned voice',
            { elevenlabsVoiceId }
          );
        } catch (e) {
          console.warn('Failed to save voice sample:', e);
        }

        if (!newProfileName.trim()) {
          setNewProfileName(savedVoice.name);
        }

        setSavedVoiceId(savedVoice.id);
        setVoiceSaved(true);

        await loadUserVoices();

        // Create and select new voice
        const newVoice: VoiceProfile = {
          id: savedVoice.id,
          name: savedVoice.name,
          provider: 'ElevenLabs',
          voiceName: savedVoice.name,
          description: savedVoice.description || 'Your personalized cloned voice',
          isCloned: true,
          elevenlabsVoiceId: elevenlabsVoiceId
        };
        setSelectedVoice(newVoice);
        onVoiceCreated?.(newVoice);
      }
    } catch (error: any) {
      console.error('Failed to auto-save voice:', error);
      onError?.(error?.message || 'Failed to save voice. Please try again.');
    } finally {
      setIsSavingVoice(false);
    }
  }, [userId, newProfileName, loadUserVoices, onError, onVoiceCreated]);

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
