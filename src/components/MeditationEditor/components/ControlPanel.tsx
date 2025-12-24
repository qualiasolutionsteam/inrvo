/**
 * ControlPanel Component
 *
 * Bottom sheet controls with Voice/Music/Tags tabs.
 */

import React, { memo, useState, useCallback } from 'react';
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

export const ControlPanel = memo<ControlPanelProps>(
  ({
    selectedVoice,
    selectedMusic,
    availableMusic,
    availableTags,
    onVoiceSelect,
    onMusicSelect,
    onTagInsert,
  }) => {
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<ControlTab>('voice');

    const toggleExpanded = useCallback(() => {
      setExpanded((prev) => !prev);
    }, []);

    return (
      <div className="flex-shrink-0 bg-black/60 backdrop-blur-xl border-t border-white/10">
        {/* Status Row */}
        <div className="flex items-center gap-2 px-4 py-3">
          {/* Options Toggle */}
          <button
            onClick={toggleExpanded}
            className={`flex-shrink-0 h-9 px-3 rounded-full flex items-center justify-center gap-1.5 text-xs font-medium border transition-all
              ${
                expanded
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : 'bg-white/10 text-white/50 border-white/10 hover:bg-white/15 hover:text-white/70 hover:border-white/20'
              }`}
            aria-expanded={expanded}
            aria-label={expanded ? 'Close options' : 'Open options'}
          >
            <PlusIcon
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                expanded ? 'rotate-45' : ''
              }`}
            />
            <span className="hidden sm:inline">
              {expanded ? 'Close' : 'Options'}
            </span>
          </button>

          {/* Status Chips */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {/* Voice Chip */}
            <button
              onClick={onVoiceSelect}
              className={`flex-shrink-0 h-9 px-3 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-all
                ${
                  selectedVoice
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : 'bg-white/10 text-amber-400 border-amber-500/30 animate-pulse'
                }`}
            >
              <VoiceIcon className="w-3.5 h-3.5" />
              <span className="truncate max-w-[120px]">
                {selectedVoice ? selectedVoice.name : 'Select Voice'}
              </span>
            </button>

            {/* Music Chip */}
            {selectedMusic && selectedMusic.id !== 'none' && (
              <span className="flex-shrink-0 h-9 px-3 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30 flex items-center gap-1.5">
                <MusicIcon className="w-3.5 h-3.5" />
                <span className="truncate max-w-[100px]">
                  {selectedMusic.name}
                </span>
              </span>
            )}
          </div>
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
                    {availableMusic.slice(0, 8).map((track) => (
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
