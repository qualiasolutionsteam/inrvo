import React, { useEffect, useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Trash2, Music, Clock, Mic, RotateCcw, Pencil, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useModals } from '../contexts/ModalContext';
import { useApp } from '../contexts/AppContext';
import { useScript } from '../contexts/ScriptContext';
import AppLayout from '../layouts/AppLayout';
import GlassCard from '../../components/GlassCard';
import { getMeditationHistoryPaginated, deleteMeditationHistory, updateMeditationTitle, MeditationHistory } from '../../lib/supabase';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 350, damping: 28 }
  }
};

// Meditation Card Component
interface MeditationCardProps {
  meditation: MeditationHistory;
  onNavigateToPlayer: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onRename: (id: string, newTitle: string) => Promise<void>;
}

const MeditationCard: React.FC<MeditationCardProps> = memo(({
  meditation,
  onNavigateToPlayer,
  onDelete,
  onRestore,
  onRename,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const scriptPreview = meditation.title || meditation.enhanced_script || meditation.prompt || 'Untitled meditation';
  const formattedDate = new Date(meditation.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const durationDisplay = meditation.duration_seconds
    ? `${Math.floor(meditation.duration_seconds / 60)}:${String(meditation.duration_seconds % 60).padStart(2, '0')}`
    : meditation.audio_duration
      ? `${Math.floor(meditation.audio_duration / 60)}:${String(meditation.audio_duration % 60).padStart(2, '0')}`
      : null;

  const hasAudio = !!meditation.audio_url;

  // Handle play button click - navigate to player
  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasAudio) {
      onNavigateToPlayer();
    }
  };

  // Start editing
  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(meditation.title || scriptPreview.slice(0, 100));
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Save title
  const handleSave = async () => {
    if (!editTitle.trim() || isSaving) return;
    setIsSaving(true);
    await onRename(meditation.id, editTitle.trim());
    setIsEditing(false);
    setIsSaving(false);
  };

  // Cancel editing
  const handleCancel = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsEditing(false);
    setEditTitle('');
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <motion.div variants={cardVariants}>
      <GlassCard
        className="!p-4 border transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)] border-white/5 hover:border-white/15 cursor-pointer"
        hover={false}
        onClick={hasAudio && !isEditing ? onNavigateToPlayer : undefined}
      >
        <div className="flex items-start gap-4">
          {/* Play Button */}
          <button
            onClick={handlePlay}
            disabled={!hasAudio}
            className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              !hasAudio
                ? 'bg-slate-500/10 text-slate-600 cursor-not-allowed'
                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            <Play className="w-5 h-5 ml-0.5" />
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={inputRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSave}
                  className="flex-1 bg-white/10 text-white text-sm font-medium px-2 py-1 rounded-lg border border-white/20 focus:border-emerald-500/50 focus:outline-none"
                  placeholder="Enter title..."
                  disabled={isSaving}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); handleSave(); }}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                  title="Save"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-1.5 rounded-lg bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 transition-colors"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2 mb-2 group/title">
                <p className="text-white text-sm font-medium line-clamp-2 flex-1">
                  {scriptPreview}
                </p>
                <button
                  onClick={handleStartEdit}
                  className="p-1 rounded opacity-0 group-hover/title:opacity-100 text-slate-500 hover:text-white hover:bg-white/10 transition-all shrink-0"
                  title="Edit title"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formattedDate}
              </span>
              {durationDisplay && (
                <span>{durationDisplay}</span>
              )}
              {meditation.voice_name && (
                <span className="flex items-center gap-1 text-sky-500">
                  <Mic className="w-3 h-3" />
                  {meditation.voice_name}
                </span>
              )}
              {meditation.content_category && meditation.content_category !== 'meditation' && (
                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  {meditation.content_category}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {!hasAudio && (
              <button
                onClick={(e) => { e.stopPropagation(); onRestore(); }}
                className="p-2 rounded-lg bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 transition-colors"
                title="Restore script"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this meditation?')) {
                  onDelete();
                }
              }}
              className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
});

MeditationCard.displayName = 'MeditationCard';

// Loading Skeleton
const MeditationSkeleton = () => (
  <motion.div variants={cardVariants}>
    <GlassCard className="!p-4 relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/10 animate-pulse" />
        <div className="flex-1">
          <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse mb-2" />
          <div className="h-3 w-1/2 rounded bg-white/10 animate-pulse" />
        </div>
        <div className="flex gap-1">
          <div className="w-8 h-8 rounded-lg bg-white/10 animate-pulse" />
          <div className="w-8 h-8 rounded-lg bg-white/10 animate-pulse" />
        </div>
      </div>
    </GlassCard>
  </motion.div>
);

// Empty State
const EmptyState: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-16"
  >
    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-sky-500/20 flex items-center justify-center">
      <Music className="w-10 h-10 text-emerald-400" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">
      No meditations yet
    </h3>
    <p className="text-slate-400 max-w-sm mx-auto">
      Generate a meditation to see it in your library
    </p>
  </motion.div>
);

// Main Component
const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSessionReady } = useAuth();
  const { setShowAuthModal } = useModals();
  const { savedVoices, setSelectedVoice } = useApp();
  const { setScript, setEnhancedScript, setRestoredScript } = useScript();

  const [meditations, setMeditations] = useState<MeditationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch meditations directly from Supabase
  const loadMeditations = useCallback(async (pageNum = 0, append = false) => {
    console.log('[LibraryPage] loadMeditations called, user:', !!user, 'isSessionReady:', isSessionReady);
    if (!user || !isSessionReady) {
      console.log('[LibraryPage] Skipping load - user:', !!user, 'isSessionReady:', isSessionReady);
      setLoading(false);
      return;
    }

    if (pageNum === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      console.log('[LibraryPage] Fetching meditations, page:', pageNum);
      const result = await getMeditationHistoryPaginated(pageNum, 20);
      console.log('[LibraryPage] Got', result.data.length, 'meditations');

      if (append) {
        setMeditations(prev => [...prev, ...result.data]);
      } else {
        setMeditations(result.data);
      }
      setHasMore(result.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error('[LibraryPage] Failed to load meditations:', err);
      // Provide specific error messages based on error type
      const error = err as { message?: string; status?: number; code?: string };
      if (error.status === 401 || error.code === 'PGRST301') {
        setError('Session expired. Please sign in again.');
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to load your library. Please try again.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, isSessionReady]);

  useEffect(() => {
    loadMeditations();
  }, [loadMeditations]);

  // Handle delete
  const handleDelete = useCallback(async (id: string) => {
    const success = await deleteMeditationHistory(id);
    if (success) {
      setMeditations(prev => prev.filter(m => m.id !== id));
    }
  }, []);

  // Handle restore script
  const handleRestore = useCallback((meditation: MeditationHistory) => {
    const scriptToRestore = meditation.enhanced_script || meditation.prompt;
    setScript(meditation.prompt);
    setEnhancedScript(scriptToRestore);
    setRestoredScript(scriptToRestore);

    if (meditation.voice_id && savedVoices.length > 0) {
      const matchingVoice = savedVoices.find(v => v.id === meditation.voice_id);
      if (matchingVoice) {
        setSelectedVoice({
          id: matchingVoice.id,
          name: matchingVoice.name,
          provider: matchingVoice.elevenlabs_voice_id ? 'elevenlabs' : 'browser',
          voiceName: matchingVoice.name,
          description: matchingVoice.description || 'Your voice',
          isCloned: true,
          elevenLabsVoiceId: matchingVoice.elevenlabs_voice_id,
        });
      }
    }

    navigate('/');
  }, [setScript, setEnhancedScript, setRestoredScript, savedVoices, setSelectedVoice, navigate]);

  // Handle rename
  const handleRename = useCallback(async (id: string, newTitle: string) => {
    const success = await updateMeditationTitle(id, newTitle);
    if (success) {
      setMeditations(prev => prev.map(m =>
        m.id === id ? { ...m, title: newTitle } : m
      ));
    }
  }, []);

  // Load more
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadMeditations(page + 1, true);
    }
  };

  // Filter meditations (favorites tab hidden for now)
  const filteredMeditations = meditations;

  const meditationsWithAudio = filteredMeditations.filter(m => m.audio_url);
  const meditationsWithoutAudio = filteredMeditations.filter(m => !m.audio_url);

  return (
    <AppLayout showBackButton backTo="/" className="flex flex-col">
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1 mb-4 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.4em] border border-emerald-500/20"
          >
            My Audios
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-serif font-bold text-white mb-3"
          >
            Your Audio Library
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 max-w-md mx-auto"
          >
            Listen to your saved meditations and audio generations
          </motion.p>
        </div>

        {/* Not Logged In */}
        {!user && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-sky-500/20 to-sky-500/20 flex items-center justify-center">
              <Music className="w-10 h-10 text-sky-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Sign in to access your library</h3>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto">
              Create an account to save and listen to your meditations
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-sky-500 text-white font-medium hover:shadow-lg hover:shadow-sky-500/25 transition-all hover:scale-105 active:scale-95"
            >
              Sign In
            </button>
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center"
          >
            {error}
            <button
              onClick={() => loadMeditations()}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
          </motion.div>
        )}

        {user && (
          <>
{/* Tab Switcher - Hidden for now */}

            {/* Loading State */}
            {loading && (
              <motion.div
                className="space-y-3"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <MeditationSkeleton key={i} />
                ))}
              </motion.div>
            )}

            {/* Empty State */}
            {!loading && filteredMeditations.length === 0 && (
              <EmptyState />
            )}

            {/* Meditation List */}
            {!loading && filteredMeditations.length > 0 && (
              <div className="space-y-6" data-onboarding="library-list">
                {/* With Audio */}
                {meditationsWithAudio.length > 0 && (
                  <div>
                    <motion.h3
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2"
                    >
                      <Music className="w-4 h-4" />
                      Saved with Audio ({meditationsWithAudio.length})
                    </motion.h3>
                    <motion.div
                      className="space-y-3"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <AnimatePresence mode="popLayout">
                        {meditationsWithAudio.map((meditation) => (
                          <MeditationCard
                            key={meditation.id}
                            meditation={meditation}
                            onNavigateToPlayer={() => navigate(`/play/${meditation.id}`)}
                            onDelete={() => handleDelete(meditation.id)}
                            onRestore={() => handleRestore(meditation)}
                            onRename={handleRename}
                          />
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                )}

                {/* Without Audio (Scripts only) */}
                {meditationsWithoutAudio.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Script History ({meditationsWithoutAudio.length > 10 ? `10 of ${meditationsWithoutAudio.length}` : meditationsWithoutAudio.length})
                    </h3>
                    <div className="space-y-2">
                      {meditationsWithoutAudio.slice(0, 10).map((meditation) => (
                        <div
                          key={meditation.id}
                          className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-400 line-clamp-2">
                              {meditation.enhanced_script || meditation.prompt}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                              {new Date(meditation.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRestore(meditation)}
                            className="shrink-0 px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-500 text-xs font-medium hover:bg-sky-500/30 transition-colors"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Load More */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {loadingMore ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default LibraryPage;
