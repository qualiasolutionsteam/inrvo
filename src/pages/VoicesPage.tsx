import React, { useEffect, useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { Mic, Play, Pause, Trash2, Edit3, Check, X, Plus, Volume2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../layouts/AppLayout';
import GlassCard from '../../components/GlassCard';
import { getUserVoiceProfiles, deleteVoiceProfile, updateVoiceProfile, VoiceProfile } from '../../lib/supabase';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
  }
};

// Voice Card Component with Preview
interface VoiceCardProps {
  voice: VoiceProfile;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
}

const VoiceCard: React.FC<VoiceCardProps> = memo(({
  voice,
  isSelected,
  onSelect,
  onDelete,
  onRename,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(voice.name);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Preview voice sample
  const handlePreview = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    if (!voice.voice_sample_url) return;

    if (isPlaying && audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    const audio = new Audio(voice.voice_sample_url);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
    audio.play();
    setAudioElement(audio);
    setIsPlaying(true);
  }, [voice.voice_sample_url, isPlaying, audioElement]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
    };
  }, [audioElement]);

  const handleSaveRename = () => {
    if (editName.trim() && editName !== voice.name) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelRename = () => {
    setEditName(voice.name);
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = () => {
    if (voice.status === 'READY' && voice.cloning_status !== 'NEEDS_RECLONE') {
      return 'bg-emerald-500';
    }
    if (voice.cloning_status === 'NEEDS_RECLONE') {
      return 'bg-amber-500';
    }
    if (voice.status === 'PROCESSING') {
      return 'bg-cyan-500 animate-pulse';
    }
    return 'bg-slate-500';
  };

  const needsReclone = voice.cloning_status === 'NEEDS_RECLONE' ||
    (!voice.elevenlabs_voice_id && (voice.provider === 'fish-audio' || voice.provider === 'chatterbox'));

  return (
    <m.div
      variants={cardVariants}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="cursor-pointer"
    >
      <GlassCard
        className={`!p-5 border transition-all duration-300 ${
          isSelected
            ? 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_40px_rgba(34,211,238,0.15)]'
            : 'border-white/5 hover:border-white/15 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]'
        }`}
        hover={false}
      >
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename();
                    if (e.key === 'Escape') handleCancelRename();
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                  autoFocus
                />
                <button
                  onClick={handleSaveRename}
                  className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelRename}
                  className="p-1.5 rounded-lg bg-white/10 text-slate-400 hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-semibold text-white truncate">{voice.name}</h4>
                <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
              </div>
            )}
          </div>

          {/* Status Badge */}
          {isSelected && (
            <span className="shrink-0 px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest border border-cyan-500/30">
              Selected
            </span>
          )}
          {needsReclone && !isSelected && (
            <span className="shrink-0 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-widest border border-amber-500/30">
              Re-clone
            </span>
          )}
        </div>

        {/* Description */}
        {voice.description && (
          <p className="text-sm text-slate-400 mb-3 line-clamp-2">{voice.description}</p>
        )}

        {/* Provider & Language */}
        <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
          <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
            {voice.provider === 'elevenlabs' ? 'ElevenLabs' : voice.provider || 'AI Voice'}
          </span>
          {voice.language && (
            <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
              {voice.language}
            </span>
          )}
        </div>

        {/* Footer Row */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <span className="text-xs text-slate-600">
            Created {formatDate(voice.created_at)}
          </span>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Preview Button */}
            {voice.voice_sample_url && (
              <button
                onClick={handlePreview}
                className={`p-2 rounded-lg transition-all ${
                  isPlaying
                    ? 'bg-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                    : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                }`}
                title={isPlaying ? 'Stop preview' : 'Preview voice'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            )}

            {/* Rename Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
              title="Rename"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            {/* Delete Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this voice? This cannot be undone.')) {
                  onDelete();
                }
              }}
              className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:shadow-[0_0_12px_rgba(244,63,94,0.2)] transition-all"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </GlassCard>
    </m.div>
  );
});

VoiceCard.displayName = 'VoiceCard';

// Loading Skeleton
const VoiceCardSkeleton = () => (
  <m.div variants={cardVariants}>
    <GlassCard className="!p-5 relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="flex items-start justify-between mb-3">
        <div className="h-6 w-32 rounded-lg bg-white/10 animate-pulse" />
        <div className="h-5 w-16 rounded-full bg-white/10 animate-pulse" />
      </div>
      <div className="h-4 w-48 rounded bg-white/10 animate-pulse mb-3" />
      <div className="flex gap-2 mb-4">
        <div className="h-5 w-20 rounded-full bg-white/10 animate-pulse" />
        <div className="h-5 w-12 rounded-full bg-white/10 animate-pulse" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-lg bg-white/10 animate-pulse" />
          <div className="h-8 w-8 rounded-lg bg-white/10 animate-pulse" />
        </div>
      </div>
    </GlassCard>
  </m.div>
);

// Empty State
const EmptyState: React.FC<{ onClone: () => void }> = ({ onClone }) => (
  <m.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-16"
  >
    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
      <Mic className="w-10 h-10 text-cyan-400" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">No voices yet</h3>
    <p className="text-slate-400 mb-8 max-w-sm mx-auto">
      Clone your voice to create personalized meditations that sound like you
    </p>
    <button
      onClick={onClone}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95"
    >
      <Plus className="w-5 h-5" />
      Clone Your Voice
    </button>
  </m.div>
);

// Main Component
const VoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSessionReady } = useAuth();
  const { selectedVoice, setSelectedVoice, savedVoices, setSavedVoices } = useApp();

  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch voices from Supabase
  const loadVoices = useCallback(async () => {
    if (!user || !isSessionReady) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getUserVoiceProfiles();
      setVoices(data);
      setSavedVoices(data);
    } catch (err) {
      console.error('[VoicesPage] Failed to load voices:', err);
      setError('Failed to load voices. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, isSessionReady, setSavedVoices]);

  useEffect(() => {
    loadVoices();
  }, [loadVoices]);

  // Handle voice selection
  const handleSelectVoice = useCallback((voice: VoiceProfile) => {
    const provider = voice.elevenlabs_voice_id
      ? 'elevenlabs' as const
      : (voice.provider === 'fish-audio' || voice.provider === 'chatterbox')
        ? voice.provider as 'fish-audio' | 'chatterbox'
        : 'browser' as const;

    setSelectedVoice({
      id: voice.id,
      name: voice.name,
      provider,
      voiceName: voice.name,
      description: voice.description || 'Your personalized voice clone',
      isCloned: true,
      elevenLabsVoiceId: voice.elevenlabs_voice_id,
      voiceSampleUrl: voice.voice_sample_url,
      cloningStatus: voice.cloning_status,
    });
  }, [setSelectedVoice]);

  // Handle delete
  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteVoiceProfile(id);
      const updated = voices.filter(v => v.id !== id);
      setVoices(updated);
      setSavedVoices(updated);

      if (selectedVoice?.id === id) {
        setSelectedVoice(null);
      }
    } catch (err) {
      console.error('[VoicesPage] Failed to delete voice:', err);
    }
  }, [voices, selectedVoice, setSelectedVoice, setSavedVoices]);

  // Handle rename
  const handleRename = useCallback(async (id: string, newName: string) => {
    try {
      const updated = await updateVoiceProfile(id, { name: newName });
      if (updated) {
        const newVoices = voices.map(v => v.id === id ? updated : v);
        setVoices(newVoices);
        setSavedVoices(newVoices);

        if (selectedVoice?.id === id) {
          setSelectedVoice({
            ...selectedVoice,
            name: newName,
            voiceName: newName,
          });
        }
      }
    } catch (err) {
      console.error('[VoicesPage] Failed to rename voice:', err);
    }
  }, [voices, selectedVoice, setSelectedVoice, setSavedVoices]);

  const handleClone = () => navigate('/clone');

  return (
    <AppLayout className="flex flex-col">
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1 mb-4 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase tracking-[0.4em] border border-cyan-500/20"
          >
            Voice Library
          </m.div>
          <m.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-serif font-bold text-white mb-3"
          >
            Your Voices
          </m.h1>
          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 max-w-md mx-auto mb-6"
          >
            Select a voice for your meditations or clone a new one
          </m.p>

          {/* Clone Button */}
          <m.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            onClick={handleClone}
            data-onboarding="clone-voice"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Clone New Voice
          </m.button>
        </div>

        {/* Error State */}
        {error && (
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center"
          >
            {error}
            <button
              onClick={loadVoices}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
          </m.div>
        )}

        {/* Not Logged In State */}
        {!user && !loading && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-500/20 to-slate-600/20 flex items-center justify-center">
              <Volume2 className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Sign in to manage voices</h3>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto">
              Create an account to clone and save your personalized voices
            </p>
          </m.div>
        )}

        {/* Loading State */}
        {loading && (
          <m.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <VoiceCardSkeleton key={i} />
            ))}
          </m.div>
        )}

        {/* Empty State */}
        {!loading && user && voices.length === 0 && (
          <EmptyState onClone={handleClone} />
        )}

        {/* Voice Grid */}
        {!loading && voices.length > 0 && (
          <m.div
            data-onboarding="voice-list"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="popLayout">
              {voices.map((voice) => (
                <VoiceCard
                  key={voice.id}
                  voice={voice}
                  isSelected={selectedVoice?.id === voice.id}
                  onSelect={() => handleSelectVoice(voice)}
                  onDelete={() => handleDelete(voice.id)}
                  onRename={(newName) => handleRename(voice.id, newName)}
                />
              ))}
            </AnimatePresence>
          </m.div>
        )}

        {/* Selected Voice Indicator */}
        {selectedVoice && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-sm text-slate-300">
                Using: <span className="text-cyan-400 font-medium">{selectedVoice.name}</span>
              </span>
              <button
                onClick={() => navigate('/')}
                className="ml-2 px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/30 transition-colors"
              >
                Create Meditation
              </button>
            </div>
          </m.div>
        )}
      </div>
    </AppLayout>
  );
};

export default VoicesPage;
