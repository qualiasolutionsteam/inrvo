/**
 * ControlPanel Component
 *
 * Bottom sheet controls with Voice/Music/Tags tabs.
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
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

// Harmonize icon - magic wand with sparkles
const HarmonizeIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Magic wand */}
    <path d="M3 21L15 9" />
    <rect x="13.5" y="5.5" width="2" height="8" rx="1" transform="rotate(45 14.5 9.5)" />
    {/* Sparkles */}
    <path d="M10 4c0 .5-.2 1-.5 1.3-.3.3-.8.5-1.3.5.5 0 1 .2 1.3.5.3.3.5.8.5 1.3 0-.5.2-1 .5-1.3.3-.3.8-.5 1.3-.5-.5 0-1-.2-1.3-.5-.3-.3-.5-.8-.5-1.3z" fill="currentColor" />
    <path d="M17 2c0 .4-.15.75-.4 1-.25.25-.6.4-1 .4.4 0 .75.15 1 .4.25.25.4.6.4 1 0-.4.15-.75.4-1 .25-.25.6-.4 1-.4-.4 0-.75-.15-1-.4-.25-.25-.4-.6-.4-1z" fill="currentColor" />
    <path d="M20 8c0 .4-.15.75-.4 1-.25.25-.6.4-1 .4.4 0 .75.15 1 .4.25.25.4.6.4 1 0-.4.15-.75.4-1 .25-.25.6-.4 1-.4-.4 0-.75-.15-1-.4-.25-.25-.4-.6-.4-1z" fill="currentColor" />
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
  }) => {
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<ControlTab>('voice');

    const toggleExpanded = useCallback(() => {
      setExpanded((prev) => !prev);
    }, []);

    // Memoize music slice to prevent array recreation on each render
    const visibleMusic = useMemo(() => availableMusic.slice(0, 8), [availableMusic]);

    return (
      <div className="flex-shrink-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent backdrop-blur-xl">
        {/* Status Row */}
        <div className="flex items-center gap-2 px-4 py-3">
          {/* Options Toggle */}
          <button
            onClick={toggleExpanded}
            className={`flex-shrink-0 h-10 w-10 sm:w-auto sm:px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-medium border transition-all duration-200
              ${
                expanded
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 shadow-lg shadow-cyan-500/10'
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
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25'
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
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 cursor-wait'
                  : 'bg-gradient-to-r from-cyan-500/15 to-teal-500/15 hover:from-cyan-500/25 hover:to-teal-500/25 text-cyan-300 border-cyan-500/30 hover:border-cyan-400/50'
                }`}
              title="AI-powered: Automatically add pauses and breathing cues"
            >
              {isHarmonizing ? (
                <>
                  <div className="w-4 h-4 border-2 border-cyan-300/30 border-t-cyan-300 rounded-full animate-spin" />
                  <span className="hidden sm:inline">Harmonizing...</span>
                </>
              ) : (
                <>
                  <HarmonizeIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">Harmonize</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Expanded Controls */}
        {expanded && (
          <div className="animate-in slide-in-from-bottom-2 duration-200 px-4 pb-4">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5">
              {/* Tab Buttons */}
              <div className="flex gap-1 mb-3">
                <button
                  onClick={() => setActiveTab('voice')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5
                    ${
                      activeTab === 'voice'
                        ? 'bg-cyan-500/30 text-cyan-300'
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

              {/* Tab Content */}
              <div className="max-h-40 overflow-y-auto">
                {/* Voice Tab */}
                {activeTab === 'voice' && (
                  <button
                    onClick={onVoiceSelect}
                    className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all flex items-center gap-3 border border-white/5"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedVoice
                          ? 'bg-cyan-500/20'
                          : 'bg-white/10'
                      }`}
                    >
                      <VoiceIcon
                        className={`w-5 h-5 ${
                          selectedVoice ? 'text-cyan-400' : 'text-white/40'
                        }`}
                      />
                    </div>
                    <div className="text-left">
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
                  </button>
                )}

                {/* Music Tab */}
                {activeTab === 'music' && (
                  <div className="grid grid-cols-2 gap-2">
                    {visibleMusic.map((track) => (
                      <button
                        key={track.id}
                        onClick={() => onMusicSelect(track)}
                        className={`p-3 rounded-xl text-xs font-medium transition-all text-left
                          ${
                            selectedMusic?.id === track.id
                              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                              : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 border border-transparent'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <MusicIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{track.name}</span>
                        </div>
                      </button>
                    ))}
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
