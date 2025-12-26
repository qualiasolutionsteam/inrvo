import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useModals } from '../contexts/ModalContext';
import AppLayout from '../layouts/AppLayout';
import GlassCard from '../../components/GlassCard';
import { getMeditationAudioSignedUrl, toggleMeditationFavorite, deleteMeditationHistory, MeditationHistory } from '../../lib/supabase';

const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    meditationHistory,
    setMeditationHistory,
    isLoadingHistory,
    hasMoreHistory,
    loadMoreHistory,
    refreshHistory,
    setScript,
    setEnhancedScript,
    setRestoredScript,
    savedVoices,
    setSelectedVoice,
  } = useApp();

  const { setShowAuthModal } = useModals();

  const [libraryTab, setLibraryTab] = useState<'all' | 'favorites'>('all');
  const [libraryPlayingId, setLibraryPlayingId] = useState<string | null>(null);
  const [libraryAudioRef, setLibraryAudioRef] = useState<HTMLAudioElement | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Load history on mount
  useEffect(() => {
    if (user && meditationHistory.length === 0) {
      refreshHistory();
    }
  }, [user, meditationHistory.length, refreshHistory]);

  // Play meditation
  const playLibraryMeditation = async (meditation: MeditationHistory) => {
    if (!meditation.audio_url) return;

    if (libraryAudioRef) {
      libraryAudioRef.pause();
      libraryAudioRef.currentTime = 0;
    }

    try {
      const signedUrl = await getMeditationAudioSignedUrl(meditation.audio_url);
      if (!signedUrl) {
        console.error('Failed to get signed URL');
        return;
      }

      const audio = new Audio(signedUrl);
      audio.onended = () => {
        setLibraryPlayingId(null);
        setLibraryAudioRef(null);
      };
      audio.onerror = () => {
        setLibraryPlayingId(null);
        setLibraryAudioRef(null);
      };

      setLibraryAudioRef(audio);
      setLibraryPlayingId(meditation.id);
      await audio.play();
    } catch (error) {
      console.error('Error playing meditation:', error);
      setLibraryPlayingId(null);
      setLibraryAudioRef(null);
    }
  };

  const stopLibraryPlayback = () => {
    if (libraryAudioRef) {
      libraryAudioRef.pause();
      libraryAudioRef.currentTime = 0;
    }
    setLibraryPlayingId(null);
    setLibraryAudioRef(null);
  };

  const handleToggleFavorite = async (id: string) => {
    const success = await toggleMeditationFavorite(id);
    if (success) {
      setMeditationHistory(
        meditationHistory.map(m => m.id === id ? { ...m, is_favorite: !m.is_favorite } : m)
      );
    }
  };

  const handleDeleteMeditation = async (id: string) => {
    if (libraryPlayingId === id) {
      stopLibraryPlayback();
    }
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (libraryAudioRef) {
        libraryAudioRef.pause();
      }
    };
  }, [libraryAudioRef]);

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
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  libraryTab === 'all'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                All Meditations
              </button>
              <button
                onClick={() => setLibraryTab('favorites')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  libraryTab === 'favorites'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-white/5 text-slate-400 hover:text-white'
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
              <div className="space-y-6">
                {/* With Audio */}
                {meditationsWithAudio.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      Saved with Audio ({meditationsWithAudio.length})
                    </h3>
                    <div className="grid gap-4">
                      {meditationsWithAudio.map((meditation) => (
                        <GlassCard key={meditation.id} className="!p-4 !rounded-xl">
                          <div className="flex items-start gap-4">
                            <button
                              onClick={() => {
                                if (libraryPlayingId === meditation.id) {
                                  stopLibraryPlayback();
                                } else {
                                  playLibraryMeditation(meditation);
                                }
                              }}
                              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                                libraryPlayingId === meditation.id
                                  ? 'bg-emerald-500 text-white animate-pulse'
                                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                              }`}
                            >
                              {libraryPlayingId === meditation.id ? (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <rect x="6" y="4" width="4" height="16" rx="1" />
                                  <rect x="14" y="4" width="4" height="16" rx="1" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm whitespace-pre-wrap mb-2 line-clamp-3">{meditation.enhanced_script || meditation.prompt}</p>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span>{new Date(meditation.created_at).toLocaleDateString()}</span>
                                {meditation.duration_seconds && (
                                  <span>{Math.floor(meditation.duration_seconds / 60)}:{String(meditation.duration_seconds % 60).padStart(2, '0')}</span>
                                )}
                                {meditation.voice_name && (
                                  <span className="text-cyan-400">{meditation.voice_name}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleFavorite(meditation.id)}
                                className={`p-2 rounded-lg transition-colors ${
                                  meditation.is_favorite
                                    ? 'text-amber-400 bg-amber-500/20'
                                    : 'text-slate-500 hover:text-amber-400 hover:bg-white/5'
                                }`}
                              >
                                <svg className="w-4 h-4" fill={meditation.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteMeditation(meditation.id)}
                                className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/5 transition-colors"
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
