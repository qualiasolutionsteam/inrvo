import React, { useEffect, useState, useCallback, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { Play, Pause, Trash2, Music, Clock, Mic, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useModals } from '../contexts/ModalContext';
import { useApp } from '../contexts/AppContext';
import AppLayout from '../layouts/AppLayout';
import GlassCard from '../../components/GlassCard';
import { getMeditationHistoryPaginated, getMeditationAudioSignedUrl, deleteMeditationHistory, MeditationHistory } from '../../lib/supabase';

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
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onDelete: () => void;
  onRestore: () => void;
}

const MeditationCard: React.FC<MeditationCardProps> = memo(({
  meditation,
  isPlaying,
  onPlay,
  onStop,
  onDelete,
  onRestore,
}) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Load audio URL
  const loadAudio = useCallback(async () => {
    if (!meditation.audio_url || audioUrl) return;

    setIsLoadingAudio(true);
    try {
      const url = await getMeditationAudioSignedUrl(meditation.audio_url);
      if (url) {
        setAudioUrl(url);
      }
    } catch (error) {
      console.error('[MeditationCard] Failed to load audio:', error);
    } finally {
      setIsLoadingAudio(false);
    }
  }, [meditation.audio_url, audioUrl]);

  // Handle play/pause
  const handlePlayPause = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPlaying) {
      audioRef.current?.pause();
      onStop();
      return;
    }

    if (!audioUrl) {
      await loadAudio();
    }

    // Will trigger play once audioUrl is set via useEffect below
    onPlay();
  };

  // Start playback when audioUrl is loaded and we're supposed to be playing
  useEffect(() => {
    if (audioUrl && isPlaying && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  }, [audioUrl, isPlaying]);

  // Stop when no longer the active player
  useEffect(() => {
    if (!isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const hasAudio = !!meditation.audio_url;

  return (
    <m.div variants={cardVariants}>
      <GlassCard
        className={`!p-4 border transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)] ${
          isPlaying
            ? 'border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
            : 'border-white/5 hover:border-white/15'
        }`}
        hover={false}
      >
        {/* Hidden audio element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={onStop}
            onError={() => {
              console.error('[MeditationCard] Audio playback error');
              onStop();
            }}
          />
        )}

        <div className="flex items-start gap-4">
          {/* Play Button */}
          <button
            onClick={handlePlayPause}
            disabled={!hasAudio || isLoadingAudio}
            className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              !hasAudio
                ? 'bg-slate-500/10 text-slate-600 cursor-not-allowed'
                : isPlaying
                  ? 'bg-emerald-500/30 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {isLoadingAudio ? (
              <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium line-clamp-2 mb-2">
              {scriptPreview}
            </p>

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
                <span className="flex items-center gap-1 text-cyan-400">
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
                className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                title="Restore script"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
{/* Favorites button hidden */}
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
    </m.div>
  );
});

MeditationCard.displayName = 'MeditationCard';

// Loading Skeleton
const MeditationSkeleton = () => (
  <m.div variants={cardVariants}>
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
  </m.div>
);

// Empty State
const EmptyState: React.FC = () => (
  <m.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-16"
  >
    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
      <Music className="w-10 h-10 text-emerald-400" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">
      No meditations yet
    </h3>
    <p className="text-slate-400 max-w-sm mx-auto">
      Generate a meditation to see it in your library
    </p>
  </m.div>
);

// Main Component
const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSessionReady } = useAuth();
  const { setShowAuthModal } = useModals();
  const { setScript, setEnhancedScript, setRestoredScript, savedVoices, setSelectedVoice } = useApp();

  const [meditations, setMeditations] = useState<MeditationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab] = useState<'all' | 'favorites'>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch meditations directly from Supabase
  const loadMeditations = useCallback(async (pageNum = 0, append = false) => {
    if (!user || !isSessionReady) {
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
      setError('Failed to load your library. Please try again.');
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
    if (playingId === id) {
      setPlayingId(null);
    }
    const success = await deleteMeditationHistory(id);
    if (success) {
      setMeditations(prev => prev.filter(m => m.id !== id));
    }
  }, [playingId]);

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

  // Load more
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadMeditations(page + 1, true);
    }
  };

  // Filter meditations
  const filteredMeditations = activeTab === 'favorites'
    ? meditations.filter(m => m.is_favorite)
    : meditations;

  const meditationsWithAudio = filteredMeditations.filter(m => m.audio_url);
  const meditationsWithoutAudio = filteredMeditations.filter(m => !m.audio_url);

  return (
    <AppLayout className="flex flex-col">
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1 mb-4 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.4em] border border-emerald-500/20"
          >
            Library
          </m.div>
          <m.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-serif font-bold text-white mb-3"
          >
            Your Meditations
          </m.h1>
          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 max-w-md mx-auto"
          >
            Listen to your saved meditations and audio generations
          </m.p>
        </div>

        {/* Not Logged In */}
        {!user && !loading && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
              <Music className="w-10 h-10 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Sign in to access your library</h3>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto">
              Create an account to save and listen to your meditations
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95"
            >
              Sign In
            </button>
          </m.div>
        )}

        {/* Error State */}
        {error && (
          <m.div
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
          </m.div>
        )}

        {user && (
          <>
{/* Tab Switcher - Hidden for now */}

            {/* Loading State */}
            {loading && (
              <m.div
                className="space-y-3"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <MeditationSkeleton key={i} />
                ))}
              </m.div>
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
                    <m.h3
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2"
                    >
                      <Music className="w-4 h-4" />
                      Saved with Audio ({meditationsWithAudio.length})
                    </m.h3>
                    <m.div
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
                            isPlaying={playingId === meditation.id}
                            onPlay={() => setPlayingId(meditation.id)}
                            onStop={() => setPlayingId(null)}
                            onDelete={() => handleDelete(meditation.id)}
                            onRestore={() => handleRestore(meditation)}
                          />
                        ))}
                      </AnimatePresence>
                    </m.div>
                  </div>
                )}

                {/* Without Audio (Scripts only) */}
                {meditationsWithoutAudio.length > 0 && activeTab === 'all' && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Script History ({meditationsWithoutAudio.length})
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
                            className="shrink-0 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/30 transition-colors"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Load More */}
                {hasMore && activeTab === 'all' && (
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
