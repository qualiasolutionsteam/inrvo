import React, { useEffect, useState, useCallback, useRef, memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Star, Trash2, RotateCcw } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useLibrary } from '../contexts/LibraryContext';
import { useModals } from '../contexts/ModalContext';
import AppLayout from '../layouts/AppLayout';
import GlassCard from '../../components/GlassCard';
import AudioPreview from '../../components/ui/AudioPreview';
import { getMeditationAudioSignedUrl, toggleMeditationFavorite, deleteMeditationHistory, MeditationHistory } from '../../lib/supabase';

// Animation variants for staggered meditation cards
const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 }
  }
};

const listItemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 350, damping: 28 }
  }
};

/**
 * MeditationAudioCard - Individual meditation card with audio preview
 * Responsive design: compact on mobile, expanded on desktop
 */
interface MeditationAudioCardProps {
  meditation: MeditationHistory;
  isActive: boolean;
  isExpanded: boolean;
  signedUrl?: string;
  onGetSignedUrl: () => Promise<string | null>;
  onPlay: () => void;
  onEnded: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onToggleExpand: () => void;
  stopOthers: boolean;
}

const MeditationAudioCard: React.FC<MeditationAudioCardProps> = memo(({
  meditation,
  isActive,
  isExpanded,
  signedUrl,
  onGetSignedUrl,
  onPlay,
  onEnded,
  onToggleFavorite,
  onDelete,
  onToggleExpand,
  stopOthers,
}) => {
  const [localSignedUrl, setLocalSignedUrl] = useState<string | null>(signedUrl || null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Fetch signed URL when card becomes active or on first interaction
  const ensureSignedUrl = useCallback(async () => {
    if (localSignedUrl) return localSignedUrl;
    if (isLoadingUrl) return null;

    setIsLoadingUrl(true);
    const url = await onGetSignedUrl();
    setLocalSignedUrl(url);
    setIsLoadingUrl(false);
    return url;
  }, [localSignedUrl, isLoadingUrl, onGetSignedUrl]);

  // Update local URL when prop changes
  useEffect(() => {
    if (signedUrl) setLocalSignedUrl(signedUrl);
  }, [signedUrl]);

  const scriptPreview = meditation.enhanced_script || meditation.prompt;
  const formattedDate = new Date(meditation.created_at).toLocaleDateString();
  const durationDisplay = meditation.duration_seconds
    ? `${Math.floor(meditation.duration_seconds / 60)}:${String(meditation.duration_seconds % 60).padStart(2, '0')}`
    : null;

  return (
    <GlassCard
      className={`!p-0 !rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)] ${
        isActive ? 'ring-1 ring-emerald-500/30 shadow-[0_0_24px_rgba(16,185,129,0.1)]' : 'hover:border-white/10'
      }`}
      hover={false}
    >
      {/* Main content row */}
      <div className="p-4">
        {/* Desktop layout: horizontal */}
        <div className="hidden sm:flex items-start gap-4">
          {/* Audio Preview (full width progress bar) */}
          <div className="flex-1 min-w-0">
            {/* Script preview */}
            <p className="text-white text-sm whitespace-pre-wrap mb-3 line-clamp-2">
              {scriptPreview}
            </p>

            {/* Audio player */}
            {localSignedUrl ? (
              <AudioPreview
                audioUrl={localSignedUrl}
                knownDuration={meditation.duration_seconds}
                onPlay={onPlay}
                onEnded={onEnded}
                compact
                accentColor={meditation.is_favorite ? 'amber' : 'emerald'}
                stopPlayback={stopOthers}
              />
            ) : (
              <button
                onClick={ensureSignedUrl}
                disabled={isLoadingUrl}
                className="w-full py-2 px-4 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-2"
              >
                {isLoadingUrl ? (
                  <>
                    <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Load Preview
                  </>
                )}
              </button>
            )}

            {/* Metadata row */}
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
              <span>{formattedDate}</span>
              {durationDisplay && <span>{durationDisplay}</span>}
              {meditation.voice_name && (
                <span className="text-cyan-400">{meditation.voice_name}</span>
              )}
            </div>
          </div>

          {/* Action buttons (desktop) */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onToggleFavorite}
              className={`p-2 rounded-lg transition-colors ${
                meditation.is_favorite
                  ? 'text-amber-400 bg-amber-500/20'
                  : 'text-slate-500 hover:text-amber-400 hover:bg-white/5'
              }`}
              title={meditation.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className="w-4 h-4" fill={meditation.is_favorite ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/5 transition-colors"
              title="Delete meditation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile layout: vertical with expand/collapse */}
        <div className="sm:hidden">
          {/* Header row with expand toggle */}
          <button
            onClick={onToggleExpand}
            className="w-full flex items-start justify-between gap-3 text-left"
          >
            <div className="flex-1 min-w-0">
              <p className={`text-white text-sm whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-2'}`}>
                {scriptPreview}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <span>{formattedDate}</span>
                {durationDisplay && <span>• {durationDisplay}</span>}
              </div>
            </div>
            <div className="text-slate-400 flex-shrink-0 mt-1">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </button>

          {/* Expanded content */}
          <AnimatePresence>
            {isExpanded && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-3">
                  {/* Voice name badge */}
                  {meditation.voice_name && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      {meditation.voice_name}
                    </div>
                  )}

                  {/* Audio player (full size on mobile) */}
                  {localSignedUrl ? (
                    <AudioPreview
                      audioUrl={localSignedUrl}
                      knownDuration={meditation.duration_seconds}
                      onPlay={onPlay}
                      onEnded={onEnded}
                      accentColor={meditation.is_favorite ? 'amber' : 'emerald'}
                      stopPlayback={stopOthers}
                    />
                  ) : (
                    <button
                      onClick={ensureSignedUrl}
                      disabled={isLoadingUrl}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-2"
                    >
                      {isLoadingUrl ? (
                        <>
                          <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                          Loading audio...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          Load Audio Preview
                        </>
                      )}
                    </button>
                  )}

                  {/* Action buttons (mobile - full width) */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onToggleFavorite}
                      className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors ${
                        meditation.is_favorite
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      <Star className="w-4 h-4" fill={meditation.is_favorite ? 'currentColor' : 'none'} />
                      {meditation.is_favorite ? 'Favorited' : 'Favorite'}
                    </button>
                    <button
                      onClick={onDelete}
                      className="py-2.5 px-4 rounded-xl bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </GlassCard>
  );
});

MeditationAudioCard.displayName = 'MeditationAudioCard';

const LibraryPage: React.FC = () => {
  const navigate = useNavigate();

  // Get library data from LibraryContext (not AppContext)
  const {
    meditationHistory,
    setMeditationHistory,
    isLoadingHistory,
    hasMoreHistory,
    loadMoreHistory,
    refreshHistory,
  } = useLibrary();

  // Get other app state from AppContext
  const {
    user,
    setScript,
    setEnhancedScript,
    setRestoredScript,
    savedVoices,
    setSelectedVoice,
  } = useApp();

  const { setShowAuthModal } = useModals();

  const [libraryTab, setLibraryTab] = useState<'all' | 'favorites'>('all');
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    if (user && meditationHistory.length === 0) {
      refreshHistory();
    }
  }, [user, meditationHistory.length, refreshHistory]);

  // Get signed URL for audio preview
  const getSignedUrl = useCallback(async (meditation: MeditationHistory): Promise<string | null> => {
    if (!meditation.audio_url) return null;

    // Return cached URL if available
    if (signedUrls[meditation.id]) {
      return signedUrls[meditation.id];
    }

    try {
      const signedUrl = await getMeditationAudioSignedUrl(meditation.audio_url);
      if (signedUrl) {
        setSignedUrls(prev => ({ ...prev, [meditation.id]: signedUrl }));
        return signedUrl;
      }
    } catch (error) {
      console.error('Error getting signed URL:', error);
    }
    return null;
  }, [signedUrls]);

  // Handle preview play - stops other previews
  const handlePreviewPlay = useCallback((meditationId: string) => {
    setActivePreviewId(meditationId);
  }, []);

  // Handle preview end
  const handlePreviewEnded = useCallback((meditationId: string) => {
    if (activePreviewId === meditationId) {
      setActivePreviewId(null);
    }
  }, [activePreviewId]);

  // Toggle expanded card (for mobile view)
  const toggleExpandedCard = useCallback((meditationId: string) => {
    setExpandedCardId(prev => prev === meditationId ? null : meditationId);
  }, []);

  const handleToggleFavorite = async (id: string) => {
    const success = await toggleMeditationFavorite(id);
    if (success) {
      setMeditationHistory(
        meditationHistory.map(m => m.id === id ? { ...m, is_favorite: !m.is_favorite } : m)
      );
    }
  };

  const handleDeleteMeditation = async (id: string) => {
    // Stop preview if playing
    if (activePreviewId === id) {
      setActivePreviewId(null);
    }
    // Remove signed URL cache
    setSignedUrls(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    const success = await deleteMeditationHistory(id);
    if (success) {
      setMeditationHistory(meditationHistory.filter(m => m.id !== id));
    }
  };

  const handleRestore = (meditation: MeditationHistory) => {
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
          provider: 'chatterbox',
          voiceName: matchingVoice.name,
          description: 'Cloned voice',
          isCloned: true,
          providerVoiceId: matchingVoice.provider_voice_id,
        });
      }
    }

    navigate('/');
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await loadMoreHistory();
    setIsLoadingMore(false);
  };

  // Cleanup on unmount - reset active preview
  useEffect(() => {
    return () => {
      setActivePreviewId(null);
    };
  }, []);

  const filteredMeditations = libraryTab === 'favorites'
    ? meditationHistory.filter(m => m.is_favorite)
    : meditationHistory;

  const meditationsWithAudio = filteredMeditations.filter(m => m.audio_url);
  const meditationsWithoutAudio = filteredMeditations.filter(m => !m.audio_url);

  return (
    <AppLayout showBackButton backTo="/" className="flex flex-col p-6 overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center pt-16 md:pt-0 max-w-4xl mx-auto w-full">
        <div className="inline-block px-4 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Library</div>
        <h2 className="text-3xl md:text-5xl font-extralight text-center mb-4 tracking-tight">
          <span className="bg-gradient-to-r from-emerald-300 via-cyan-200 to-teal-300 bg-clip-text text-transparent">My Library</span>
        </h2>
        <p className="text-slate-500 text-center mb-12 max-w-lg">Your saved meditations and audio generations</p>

        {user ? (
          <div className="w-full">
            {/* Tab Switcher */}
            <div className="flex justify-center gap-2 mb-8">
              <button
                onClick={() => setLibraryTab('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  libraryTab === 'all'
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                My Audios
              </button>
              <button
                onClick={() => setLibraryTab('favorites')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  libraryTab === 'favorites'
                    ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                Favorites
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : filteredMeditations.length === 0 ? (
              <GlassCard className="!p-8 !rounded-2xl text-center">
                <div className="w-16 h-16 rounded-full bg-slate-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {libraryTab === 'favorites' ? 'No favorites yet' : 'No meditations yet'}
                </h3>
                <p className="text-slate-400 text-sm">
                  {libraryTab === 'favorites'
                    ? 'Mark meditations as favorites to see them here'
                    : 'Generate a meditation with a cloned voice to save it here'}
                </p>
              </GlassCard>
            ) : (
              <div data-onboarding="library-list" className="space-y-6">
                {/* With Audio */}
                {meditationsWithAudio.length > 0 && (
                  <div>
                    <m.h3
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      Saved with Audio ({meditationsWithAudio.length})
                    </m.h3>
                    <m.div
                      className="grid gap-4"
                      variants={listContainerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {meditationsWithAudio.map((meditation) => (
                        <m.div key={meditation.id} variants={listItemVariants}>
                          <MeditationAudioCard
                            meditation={meditation}
                            isActive={activePreviewId === meditation.id}
                            isExpanded={expandedCardId === meditation.id}
                            signedUrl={signedUrls[meditation.id]}
                            onGetSignedUrl={() => getSignedUrl(meditation)}
                            onPlay={() => handlePreviewPlay(meditation.id)}
                            onEnded={() => handlePreviewEnded(meditation.id)}
                            onToggleFavorite={() => handleToggleFavorite(meditation.id)}
                            onDelete={() => handleDeleteMeditation(meditation.id)}
                            onToggleExpand={() => toggleExpandedCard(meditation.id)}
                            stopOthers={activePreviewId !== null && activePreviewId !== meditation.id}
                          />
                        </m.div>
                      ))}
                    </m.div>
                  </div>
                )}

                {/* Without Audio */}
                {meditationsWithoutAudio.length > 0 && libraryTab === 'all' && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      History ({meditationsWithoutAudio.length})
                    </h3>
                    <div className="grid gap-3">
                      {meditationsWithoutAudio.slice(0, 10).map((meditation) => (
                        <div key={meditation.id} className="p-3 rounded-xl bg-white/5 border border-white/5">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-500/20 flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-400 text-sm whitespace-pre-wrap line-clamp-2">{meditation.enhanced_script || meditation.prompt}</p>
                              <p className="text-xs text-slate-600 mt-1">{new Date(meditation.created_at).toLocaleDateString()}</p>
                            </div>
                            <button
                              onClick={() => handleRestore(meditation)}
                              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs hover:bg-cyan-500/30 transition-colors"
                            >
                              Restore
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Load More */}
                {hasMoreHistory && libraryTab === 'all' && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isLoadingMore ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          Load More
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <GlassCard className="!p-8 !rounded-2xl text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Sign in to access your library</h3>
            <p className="text-slate-400 mb-6">Create an account to save and revisit your meditations</p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-all"
            >
              Sign In
            </button>
          </GlassCard>
        )}
      </div>
    </AppLayout>
  );
};

export default LibraryPage;
