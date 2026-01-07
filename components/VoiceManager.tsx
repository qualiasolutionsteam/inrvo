import React, { useState, useEffect, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { getUserVoiceProfiles, deleteVoiceProfile, updateVoiceProfile, VoiceProfile } from '../lib/supabase';
import { ICONS } from '../constants';
import GlassCard from './GlassCard';
import Starfield from './Starfield';

// Animation variants for staggered voice cards
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
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  }
};

interface VoiceManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVoice: (voice: VoiceProfile) => void;
  onCloneVoice: () => void;
  onVoiceDeleted?: (deletedVoiceId: string) => void;  // Callback when a voice is deleted
  currentVoiceId?: string;
}

const VoiceManager: React.FC<VoiceManagerProps> = ({
  isOpen,
  onClose,
  onSelectVoice,
  onCloneVoice,
  onVoiceDeleted,
  currentVoiceId
}) => {
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    console.log('[VoiceManager] useEffect triggered, isOpen:', isOpen);
    if (isOpen) {
      loadVoices();
    }
  }, [isOpen]);

  const loadVoices = async () => {
    console.log('[VoiceManager] loadVoices called, setting loading=true');
    setLoading(true);
    try {
      console.log('[VoiceManager] Calling getUserVoiceProfiles...');
      const data = await getUserVoiceProfiles();
      console.log('[VoiceManager] Got voice profiles:', data?.length, 'items', data);
      setVoices(data);
    } catch (error) {
      console.error('[VoiceManager] Failed to load voices:', error);
    } finally {
      console.log('[VoiceManager] Setting loading=false');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voice?')) return;

    try {
      await deleteVoiceProfile(id);
      setVoices(voices.filter(v => v.id !== id));
      // Notify parent that a voice was deleted (so it can reload voices and clear selection if needed)
      onVoiceDeleted?.(id);
    } catch (error) {
      console.error('Failed to delete voice:', error);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;

    try {
      const updated = await updateVoiceProfile(id, { name: editName });
      if (updated) {
        setVoices(voices.map(v => v.id === id ? updated : v));
      }
      setEditingId(null);
      setEditName('');
    } catch (error) {
      console.error('Failed to rename voice:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex flex-col p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
      <Starfield />
      <div className="relative z-10">
        {/* Back Button */}
      <button
        onClick={onClose}
        className="fixed top-6 left-6 md:top-8 md:left-8 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-[100]"
      >
        <div className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
          <ICONS.ArrowBack className="w-5 h-5" />
        </div>
        <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.3em]">Back</span>
      </button>

      <div className="w-full max-w-4xl mx-auto py-16 md:py-20 space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-block px-4 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase tracking-[0.4em]">
            Voice Library
          </div>
          <h3 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-tight">
            Your Voices
          </h3>
          <p className="text-slate-500 text-sm md:text-base max-w-lg mx-auto">
            Select a voice or clone a new one
          </p>

          {/* Clone Voice Button */}
          <button
            data-onboarding="clone-voice"
            onClick={() => {
              onClose();
              onCloneVoice();
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all hover:scale-105"
          >
            <ICONS.Waveform className="w-5 h-5" />
            Clone New Voice
          </button>
        </div>

        {loading ? (
          <m.div
            className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {[1, 2, 3, 4].map((i) => (
              <m.div
                key={i}
                variants={cardVariants}
                className="glass rounded-3xl p-6 overflow-hidden relative"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                <div className="flex items-start justify-between mb-4">
                  <div className="h-6 w-32 rounded-lg bg-white/10 animate-pulse" />
                  <div className="h-5 w-16 rounded-full bg-white/10 animate-pulse" />
                </div>
                <div className="h-4 w-48 rounded bg-white/10 animate-pulse mb-3" />
                <div className="flex items-center justify-between">
                  <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-8 w-12 rounded-lg bg-white/10 animate-pulse" />
                    <div className="h-8 w-8 rounded-lg bg-white/10 animate-pulse" />
                  </div>
                </div>
              </m.div>
            ))}
          </m.div>
        ) : voices.length === 0 ? (
          <GlassCard className="text-center py-16">
            <ICONS.Waveform className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 mb-2">No saved voices yet</p>
            <p className="text-sm text-slate-600 mb-6">Clone your voice to get started</p>
            <button
              onClick={() => {
                onClose();
                onCloneVoice();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
            >
              <ICONS.Waveform className="w-4 h-4" />
              Clone Your Voice
            </button>
          </GlassCard>
        ) : (
          <m.div
            data-onboarding="voice-list"
            className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {voices.map((voice) => (
              <m.div
                key={voice.id}
                variants={cardVariants}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <GlassCard
                  className={`!p-6 border transition-all duration-300 ${
                    currentVoiceId === voice.id
                      ? 'border-cyan-500/40 bg-cyan-500/5 shadow-[0_0_30px_rgba(34,211,238,0.1)]'
                      : 'border-transparent hover:border-white/10 hover:shadow-[0_8px_32px_rgba(0,0,0,0.2)]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      {editingId === voice.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(voice.id);
                              if (e.key === 'Escape') {
                                setEditingId(null);
                                setEditName('');
                              }
                            }}
                            className="flex-1 px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                            autoFocus
                          />
                          <button
                            onClick={() => handleRename(voice.id)}
                            className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditName('');
                            }}
                            className="p-2 rounded-lg bg-white/10 text-slate-400 hover:bg-white/20 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                          {voice.name}
                          {voice.status === 'READY' && voice.cloning_status !== 'NEEDS_RECLONE' && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          )}
                          {/* Legacy voice indicator - needs re-clone */}
                          {(voice.cloning_status === 'NEEDS_RECLONE' ||
                            (!voice.elevenlabs_voice_id && (voice.provider === 'fish-audio' || voice.provider === 'chatterbox'))) && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold uppercase tracking-widest border border-amber-500/20">
                              Re-clone needed
                            </span>
                          )}
                        </h4>
                      )}
                    </div>
                    {currentVoiceId === voice.id && (
                      <span className="px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest border border-cyan-500/20">
                        Active
                      </span>
                    )}
                  </div>

                  {voice.description && (
                    <p className="text-sm text-slate-400 mb-3">{voice.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">
                      Created {formatDate(voice.created_at)}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectVoice(voice)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 hover:shadow-[0_0_12px_rgba(34,211,238,0.3)] text-cyan-400 text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
                      >
                        Use
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(voice.id);
                          setEditName(voice.name);
                        }}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all active:scale-95"
                        title="Rename"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(voice.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 hover:shadow-[0_0_12px_rgba(244,63,94,0.2)] text-rose-400 transition-all active:scale-95"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </GlassCard>
              </m.div>
            ))}
          </m.div>
        )}
      </div>
      </div>
    </div>
  );
};

export default VoiceManager;