import { useState, useCallback } from 'react';
import { VoiceProfile, CloningStatus, CreditInfo, VoiceMetadata, DEFAULT_VOICE_METADATA } from '../../types';
import { creditService } from '../lib/credits';
import { elevenlabsService, base64ToBlob } from '../lib/elevenlabs';
import {
  createVoiceProfile,
  createVoiceClone,
  getUserVoiceProfiles,
  VoiceProfile as DBVoiceProfile
} from '../../lib/supabase';
import { blobToBase64 } from '../../geminiService';

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
  const handleCloneRecordingComplete = useCallback(async (blob: Blob, name: string, metadata?: VoiceMetadata) => {
    if (!userId) {
      setCloningStatus({ state: 'error', message: 'Please sign in to clone your voice', canRetry: false });
      return;
    }

    setCloningStatus({ state: 'validating' });

    let elevenlabsVoiceId: string | null = null;
    let creditsDeducted = false;
    const voiceMetadata = metadata || DEFAULT_VOICE_METADATA;

    try {
      // Check credits
      const { can: canClone, reason } = await creditService.canClone(userId);
      if (!canClone) {
        setCloningStatus({ state: 'error', message: reason || 'Cannot clone voice', canRetry: false });
        return;
      }

      setCloningStatus({ state: 'uploading_to_elevenlabs' });

      // Clone with ElevenLabs - now includes metadata
      try {
        elevenlabsVoiceId = await elevenlabsService.cloneVoice(blob, {
          name,
          description: 'Meditation voice clone created with INrVO',
          metadata: voiceMetadata,
        });
      } catch (cloneError: any) {
        console.error('ElevenLabs cloning failed:', cloneError);
        setCloningStatus({
          state: 'error',
          message: cloneError.message || 'Voice cloning failed',
          canRetry: true,
        });
        return;
      }

      // Deduct credits after successful clone
      try {
        const costConfig = creditService.getCostConfig();
        await creditService.deductCredits(
          costConfig.VOICE_CLONE,
          'CLONE_CREATE',
          undefined,
          userId
        );
        creditsDeducted = true;
      } catch (creditError: any) {
        console.error('Failed to deduct credits:', creditError);
        // Continue even if credit deduction fails
      }

      setCloningStatus({ state: 'saving_to_database' });

      // Save to database with rollback on failure
      let savedVoice;
      try {
        savedVoice = await createVoiceProfile(
          name,
          'Cloned voice profile',
          'en-US',
          undefined,
          elevenlabsVoiceId
        );
      } catch (dbError: any) {
        console.error('Database save failed, rolling back:', dbError);

        // Rollback: Delete voice from ElevenLabs
        if (elevenlabsVoiceId) {
          try {
            await elevenlabsService.deleteVoice(elevenlabsVoiceId);
          } catch (rollbackError) {
            console.error('Failed to rollback ElevenLabs voice:', rollbackError);
          }
        }

        if (creditsDeducted) {
          console.warn('Credits were deducted but voice save failed. Manual refund may be needed.');
        }

        setCloningStatus({
          state: 'error',
          message: dbError.message || 'Failed to save voice profile',
          canRetry: true,
        });
        return;
      }

      // Save audio sample as backup (non-critical)
      try {
        const base64 = await blobToBase64(blob);
        await createVoiceClone(
          savedVoice.name,
          base64,
          'Voice sample for cloned voice',
          { elevenlabsVoiceId }
        );
      } catch (e) {
        console.warn('Failed to save voice sample backup:', e);
      }

      // Create voice profile for UI
      const newVoice: VoiceProfile = {
        id: savedVoice.id,
        name: savedVoice.name,
        provider: 'ElevenLabs',
        voiceName: savedVoice.name,
        description: 'Your personalized cloned voice',
        isCloned: true,
        elevenlabsVoiceId,
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
        voiceId: savedVoice.id,
        voiceName: savedVoice.name,
      });
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
      let elevenlabsVoiceId: string | null = null;
      try {
        elevenlabsVoiceId = await elevenlabsService.cloneVoice(audioBlob, {
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
