/**
 * ControlPanel Component
 *
 * Bottom sheet controls with Voice/Music/Tags tabs.
 * Includes voice preview functionality for testing voices before generation.
 */

import React, { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import AudioPreview from '../../../../components/ui/AudioPreview';
import type { VoiceProfile } from '../../../../types';
import type { BackgroundTrack } from '../../../../constants';
import type { AudioTagCategory, ControlTab } from '../types';

// ============================================================================
// ICONS
// ============================================================================

const PlusIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const VoiceIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
    <path d="M19 10v2a7 7 0 01-14 0v-2" />
    <path d="M12 19v4M8 23h8" />
  </svg>
);

const MusicIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const TagIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <circle cx="7" cy="7" r="1" fill="currentColor" />
  </svg>
);

// ============================================================================
// TYPES
// ============================================================================

interface ControlPanelProps {
  selectedVoice: VoiceProfile | null;
  selectedMusic: BackgroundTrack | null;
  availableMusic: BackgroundTrack[];
  availableTags: AudioTagCategory[];
  onVoiceSelect: () => void;
  onMusicSelect: (track: BackgroundTrack) => void;
  onTagInsert: (tagLabel: string) => void;
  onHarmonize?: () => void;
  isHarmonizing?: boolean;
  // Voice preview
  voicePreviewUrl?: string | null;
  isGeneratingPreview?: boolean;
  onGenerateVoicePreview?: () => void;
  onStopVoicePreview?: () => void;
  // Music preview
  previewingMusicId?: string | null;
  onMusicPreviewToggle?: (track: BackgroundTrack) => void;
  onStopMusicPreview?: () => void;
}

// Quick tags for easy insertion
const QUICK_TAGS = [
  { label: '[pause]', description: '2-3 second pause' },
  { label: '[long pause]', description: '5-6 second pause' },
  { label: '[deep breath]', description: 'Breathing cue' },
  { label: '[exhale slowly]', description: 'Slow exhale cue' },
  { label: '[silence]', description: '4-5 seconds silence' },
];

// ============================================================================
// COMPONENT
// ============================================================================

// Harmonize icon - magic wand with sparkles (colored)
const HarmonizeIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
  >
    {/* Magic wand body */}
    <rect x="1" y="14" width="16" height="2.5" rx="0.5" transform="rotate(-45 1 14)" fill="url(#wandGradient)" />
    {/* Wand tip band */}
    <rect x="11.2" y="3.8" width="1.5" height="0.6" rx="0.2" transform="rotate(-45 12 4.1)" fill="#ffffff" />
    {/* Large 4-point sparkles */}
    <path d="M16 5l.7 1.4 1.4.7-1.4.7-.7 1.4-.7-1.4-1.4-.7 1.4-.7z" fill="#22d3ee" />
    <path d="M20 11l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z" fill="#22d3ee" />
    <path d="M12 2l.4.8.8.4-.8.4-.4.8-.4-.8-.8-.4.8-.4z" fill="#a78bfa" />
    <path d="M18 16l.35.7.7.35-.7.35-.35.7-.35-.7-.7-.35.7-.35z" fill="#a78bfa" />
    {/* Small sparkles */}
    <path d="M8 4l.25.5.5.25-.5.25-.25.5-.25-.5-.5-.25.5-.25z" fill="#67e8f9" />
    <path d="M14 9l.25.5.5.25-.5.25-.25.5-.25-.5-.5-.25.5-.25z" fill="#67e8f9" />
    <path d="M10 7l.2.4.4.2-.4.2-.2.4-.2-.4-.4-.2.4-.2z" fill="#c4b5fd" />
    {/* Dots */}
    <circle cx="9" cy="2.5" r="0.5" fill="#c4b5fd" />
    <circle cx="19" cy="8" r="0.5" fill="#67e8f9" />
    <circle cx="21" cy="14" r="0.4" fill="#22d3ee" />
    <circle cx="15" cy="12" r="0.4" fill="#a78bfa" />
    <circle cx="17" cy="3" r="0.4" fill="#67e8f9" />
    <circle cx="11" cy="5" r="0.3" fill="#c4b5fd" />
    {/* Gradient definition */}
    <defs>
      <linearGradient id="wandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
  </svg>
);

export const ControlPanel = memo<ControlPanelProps>(
  ({
    selectedVoice,
    selectedMusic,
    availableMusic,
    availableTags,
    onVoiceSelect,
    onMusicSelect,
    onTagInsert,
    onHarmonize,
    isHarmonizing = false,
    voicePreviewUrl,
    isGeneratingPreview = false,
    onGenerateVoicePreview,
    onStopVoicePreview,
    previewingMusicId,
    onMusicPreviewToggle,
    onStopMusicPreview,
  }) => {
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<ControlTab>('voice');

    const toggleExpanded = useCallback(() => {
      setExpanded((prev) => !prev);
    }, []);

    // Stop music preview when panel collapses or tab changes away from music
    useEffect(() => {
      if (!expanded || activeTab !== 'music') {
        onStopMusicPreview?.();
      }
    }, [expanded, activeTab, onStopMusicPreview]);

    // Memoize music slice to prevent array recreation on each render
    const visibleMusic = useMemo(() => availableMusic.slice(0, 8), [availableMusic]);

    return (
      <div className="flex-shrink-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent backdrop-blur-xl">
        {/* Glowing separator line */}
        <div className="relative h-px mx-4">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/40 to-transparent blur-sm" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-400/30 to-transparent blur-md" />
        </div>

        {/* Status Row */}
        <div className="flex items-center gap-2 px-4 py-3">
          {/* Options Toggle */}
          <button
            onClick={toggleExpanded}
            className={`flex-shrink-0 h-10 w-10 sm:w-auto sm:px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-medium border transition-all duration-200
              ${
                expanded
                  ? 'bg-blue-500/20 text-cyan-300 border-blue-500/30 shadow-lg shadow-blue-500/10'
                  : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
              }`}
            aria-expanded={expanded}
            aria-label={expanded ? 'Close options' : 'Open options'}
          >
            <PlusIcon
              className={`w-4 h-4 transition-transform duration-300 ${
                expanded ? 'rotate-45' : ''
              }`}
            />
            <span className="hidden sm:inline font-medium">
              {expanded ? 'Close' : 'Options'}
            </span>
          </button>

          {/* Status Chips */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {/* Voice Chip */}
            <button
              onClick={onVoiceSelect}
              className={`flex-shrink-0 h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all duration-200
                ${
                  selectedVoice
                    ? 'bg-blue-500/15 text-cyan-300 border-blue-500/30 hover:bg-blue-500/25'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25 animate-pulse'
                }`}
            >
              <VoiceIcon className="w-4 h-4" />
              <span className="truncate max-w-[100px] sm:max-w-[140px]">
                {selectedVoice ? selectedVoice.name : 'Select Voice'}
              </span>
            </button>

            {/* Music Chip */}
            {selectedMusic && selectedMusic.id !== 'none' && (
              <button
                onClick={toggleExpanded}
                className="flex-shrink-0 h-10 px-4 rounded-xl bg-emerald-500/15 text-emerald-300 text-xs font-semibold border border-emerald-500/30 flex items-center gap-2 hover:bg-emerald-500/25 transition-all duration-200"
              >
                <MusicIcon className="w-4 h-4" />
                <span className="truncate max-w-[80px] sm:max-w-[120px]">
                  {selectedMusic.name}
                </span>
              </button>
            )}
          </div>

          {/* Harmonize Button - Always visible */}
          {onHarmonize && (
            <button
              onClick={onHarmonize}
              disabled={isHarmonizing}
              className={`flex-shrink-0 h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all duration-200
                ${isHarmonizing
                  ? 'bg-blue-500/20 text-cyan-300 border-blue-500/30 cursor-wait'
                  : 'bg-gradient-to-r from-blue-500/15 to-teal-500/15 hover:from-blue-500/25 hover:to-teal-500/25 text-cyan-300 border-blue-500/30 hover:border-blue-400/50'
                }`}
              title="AI-powered: Automatically add pauses and breathing cues"
            >
              {isHarmonizing ? (
                <>
                  <div className="w-5 h-5 sm:w-4 sm:h-4 border-2 border-cyan-300/30 border-t-cyan-300 rounded-full animate-spin" />
                  <span className="hidden sm:inline">Harmonizing...</span>
                </>
              ) : (
                <>
                  <HarmonizeIcon className="w-7 h-7 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Harmonize</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Expanded Controls */}
        {expanded && (
          <div className="animate-in slide-in-from-bottom-2 duration-200 px-4 pb-4">
            <div
              className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-blue-500/30"
              style={{
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.15), 0 0 40px rgba(59, 130, 246, 0.08), 0 0 2px rgba(96, 165, 250, 0.3)'
              }}
            >
              {/* Tab Buttons */}
              <div className="flex gap-1 mb-3">
                <button
                  onClick={() => setActiveTab('voice')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5
                    ${
                      activeTab === 'voice'
                        ? 'bg-blue-500/30 text-cyan-300'
                        : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                    }`}
                  aria-selected={activeTab === 'voice'}
                >
                  <VoiceIcon className="w-3.5 h-3.5" />
                  Voice
                </button>
                <button
                  onClick={() => setActiveTab('music')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5
                    ${
                      activeTab === 'music'
                        ? 'bg-emerald-500/30 text-emerald-300'
                        : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                    }`}
                  aria-selected={activeTab === 'music'}
                >
                  <MusicIcon className="w-3.5 h-3.5" />
                  Music
                </button>
                <button
                  onClick={() => setActiveTab('tags')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5
                    ${
                      activeTab === 'tags'
                        ? 'bg-violet-500/30 text-violet-300'
                        : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                    }`}
                  aria-selected={activeTab === 'tags'}
                >
                  <TagIcon className="w-3.5 h-3.5" />
                  Tags
                </button>
              </div>

              {/* Tab Content - taller on mobile for better visibility */}
              <div className="max-h-64 sm:max-h-40 overflow-y-auto">
                {/* Voice Tab */}
                {activeTab === 'voice' && (
                  <div className="space-y-3">
                    {/* Voice Selection Button */}
                    <button
                      onClick={onVoiceSelect}
                      className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all flex items-center gap-3 border border-white/5"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          selectedVoice
                            ? 'bg-blue-500/20'
                            : 'bg-white/10'
                        }`}
                      >
                        <VoiceIcon
                          className={`w-5 h-5 ${
                            selectedVoice ? 'text-blue-400' : 'text-white/40'
                          }`}
                        />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-white/80 text-sm font-medium">
                          {selectedVoice
                            ? selectedVoice.name
                            : 'No voice selected'}
                        </p>
                        <p className="text-white/40 text-xs">
                          {selectedVoice
                            ? 'Tap to change voice'
                            : 'Tap to select a voice'}
                        </p>
                      </div>
                      {selectedVoice && (
                        <div className="text-xs text-blue-400/60">
                          {selectedVoice.isCloned ? 'Cloned' : 'Preset'}
                        </div>
                      )}
                    </button>

                    {/* Voice Preview Section */}
                    {selectedVoice && onGenerateVoicePreview && (
                      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-white/70 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m0-9.9a5 5 0 011.414-1.414" />
                            </svg>
                            Voice Preview
                          </p>
                        </div>

                        <AnimatePresence mode="wait">
                          {voicePreviewUrl ? (
                            <m.div
                              key="preview"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                            >
                              <AudioPreview
                                audioUrl={voicePreviewUrl}
                                compact
                                accentColor="cyan"
                                onEnded={onStopVoicePreview}
                              />
                            </m.div>
                          ) : (
                            <m.button
                              key="generate"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              onClick={onGenerateVoicePreview}
                              disabled={isGeneratingPreview}
                              className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2
                                ${isGeneratingPreview
                                  ? 'bg-blue-500/20 text-cyan-300 cursor-wait'
                                  : 'bg-blue-500/20 hover:bg-blue-500/30 text-cyan-300 active:scale-[0.98]'
                                }`}
                            >
                              {isGeneratingPreview ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-cyan-300/30 border-t-cyan-300 rounded-full animate-spin" />
                                  <span>Generating preview...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                  <span>Preview "{selectedVoice.name}"</span>
                                </>
                              )}
                            </m.button>
                          )}
                        </AnimatePresence>

                        <p className="text-[10px] text-white/40 mt-2 text-center">
                          Hear a sample before generating your full audio
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Music Tab */}
                {activeTab === 'music' && (
                  <div className="space-y-3">
                    {/* Currently previewing track */}
                    {previewingMusicId && onMusicPreviewToggle && (
                      <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-white/70 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                            Now Playing
                          </p>
                          <span className="text-xs text-emerald-400">
                            {availableMusic.find(t => t.id === previewingMusicId)?.name}
                          </span>
                        </div>
                        <AudioPreview
                          audioUrl={availableMusic.find(t => t.id === previewingMusicId)?.audioUrl || ''}
                          compact
                          accentColor="emerald"
                          onEnded={() => {
                            const track = availableMusic.find(t => t.id === previewingMusicId);
                            if (track) onMusicPreviewToggle(track);
                          }}
                        />
                      </div>
                    )}

                    {/* Music grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {visibleMusic.map((track) => {
                        const isSelected = selectedMusic?.id === track.id;
                        const isPreviewing = previewingMusicId === track.id;
                        const hasAudio = !!track.audioUrl && track.id !== 'none';

                        return (
                          <div
                            key={track.id}
                            className={`p-3 rounded-xl text-xs font-medium transition-all
                              ${isSelected
                                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 border border-transparent'
                              }`}
                          >
                            <div className="flex items-center gap-2">
                              {/* Play/Pause button for tracks with audio */}
                              {hasAudio && onMusicPreviewToggle ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onMusicPreviewToggle(track);
                                  }}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                                    ${isPreviewing
                                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                      : 'bg-white/10 text-white/60 hover:bg-emerald-500/30 hover:text-emerald-300'
                                    }`}
                                  title={isPreviewing ? 'Stop preview' : 'Preview track'}
                                >
                                  {isPreviewing ? (
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                      <rect x="6" y="4" width="4" height="16" rx="1" />
                                      <rect x="14" y="4" width="4" height="16" rx="1" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  )}
                                </button>
                              ) : (
                                <MusicIcon className="w-4 h-4 flex-shrink-0" />
                              )}

                              {/* Track name - clickable to select */}
                              <button
                                onClick={() => onMusicSelect(track)}
                                className="flex-1 text-left truncate hover:text-white transition-colors"
                              >
                                {track.name}
                              </button>

                              {/* Selected indicator */}
                              {isSelected && (
                                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[10px] text-white/40 text-center">
                      Tap play to preview • Tap name to select
                    </p>
                  </div>
                )}

                {/* Tags Tab */}
                {activeTab === 'tags' && (
                  <div className="space-y-3">
                    {/* Quick Tags */}
                    <div>
                      <p className="text-xs text-white/40 mb-2">Quick Insert</p>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_TAGS.map((tag) => (
                          <button
                            key={tag.label}
                            onClick={() => onTagInsert(tag.label)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                              bg-gradient-to-r from-violet-500/20 to-purple-500/20
                              hover:from-violet-500/30 hover:to-purple-500/30
                              border border-violet-500/30 hover:border-violet-400/50
                              text-violet-200 active:scale-95"
                            title={tag.description}
                          >
                            <span className="text-violet-400 mr-1">+</span>
                            {tag.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* All Tags by Category */}
                    {availableTags.map((category) => (
                      <div key={category.id}>
                        <p className="text-xs text-white/40 mb-2">
                          {category.name}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {category.tags.map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => onTagInsert(tag.label)}
                              className="px-2.5 py-1 rounded-md text-xs transition-all
                                bg-white/5 hover:bg-white/10
                                border border-white/10 hover:border-white/20
                                text-white/60 hover:text-white/80 active:scale-95"
                            >
                              {tag.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

ControlPanel.displayName = 'ControlPanel';
