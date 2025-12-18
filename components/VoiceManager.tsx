import React, { useState, useEffect } from 'react';
import { getUserVoiceProfiles, deleteVoiceProfile, updateVoiceProfile, VoiceProfile } from '../lib/supabase';
import { ICONS } from '../constants';
import GlassCard from './GlassCard';

interface VoiceManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVoice: (voice: VoiceProfile) => void;
  currentVoiceId?: string;
}

const VoiceManager: React.FC<VoiceManagerProps> = ({
  isOpen,
  onClose,
  onSelectVoice,
  currentVoiceId
}) => {
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadVoices();
    }
  }, [isOpen]);

  const loadVoices = async () => {
    setLoading(true);
    try {
      const data = await getUserVoiceProfiles();
      setVoices(data);
    } catch (error) {
      console.error('Failed to load voices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voice?')) return;

    try {
      await deleteVoiceProfile(id);
      setVoices(voices.filter(v => v.id !== id));
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
      {/* Back Button */}
      <button
        onClick={onClose}
        className="fixed top-6 left-6 md:top-8 md:left-8 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-10"
      >
        <div className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
          <ICONS.ArrowBack className="w-5 h-5" />
        </div>
        <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.3em]">Back</span>
      </button>

      <div className="w-full max-w-4xl mx-auto py-16 md:py-20 space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-block px-4 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.4em]">
            Voice Library
          </div>
          <h3 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-tight">
            Your Saved Voices
          </h3>
          <p className="text-slate-500 text-sm md:text-base max-w-lg mx-auto">
            Manage your cloned voices and select which one to use
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500/20 border-t-indigo-500"></div>
          </div>
        ) : voices.length === 0 ? (
          <GlassCard className="text-center py-16">
            <ICONS.Waveform className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 mb-2">No saved voices yet</p>
            <p className="text-sm text-slate-600">Clone your voice to get started</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {voices.map((voice) => (
              <GlassCard
                key={voice.id}
                className={`!p-6 border ${
                  currentVoiceId === voice.id
                    ? 'border-indigo-500/30 bg-indigo-500/5'
                    : 'border-transparent'
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
                          className="flex-1 px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-indigo-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRename(voice.id)}
                          className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditName('');
                          }}
                          className="p-2 rounded-lg bg-white/10 text-slate-400 hover:bg-white/20"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        {voice.name}
                        {voice.status === 'READY' && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        )}
                      </h4>
                    )}
                  </div>
                  {currentVoiceId === voice.id && (
                    <span className="px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest">
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
                      className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      Use
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(voice.id);
                        setEditName(voice.name);
                      }}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 transition-all"
                      title="Rename"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(voice.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceManager;