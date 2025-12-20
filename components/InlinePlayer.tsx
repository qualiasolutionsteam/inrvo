import React, { memo, useCallback } from 'react';
import { ICONS } from '../constants';
import MiniVisualizer from './MiniVisualizer';

interface InlinePlayerProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onExpand: () => void;
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
  voiceName: string;
  backgroundTrackName?: string;
  backgroundVolume: number;
  onBackgroundVolumeChange: (volume: number) => void;
}

const InlinePlayer: React.FC<InlinePlayerProps> = memo(({
  isPlaying,
  onPlayPause,
  onStop,
  onExpand,
  currentTime,
  duration,
  onSeek,
  voiceName,
  backgroundTrackName,
  backgroundVolume,
  onBackgroundVolumeChange,
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    onSeek(percent * duration);
  };

  return (
    <div className="glass glass-prompt rounded-2xl md:rounded-[32px] p-3 md:p-4 shadow-2xl shadow-indigo-900/20 border border-white/30 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Main controls row */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mini visualizer */}
        <MiniVisualizer isActive={isPlaying} size={36} />

        {/* Play/Pause button - larger touch target on mobile */}
        <button
          onClick={onPlayPause}
          className={`
            w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center
            transition-all duration-300 btn-press focus-ring flex-shrink-0
            ${isPlaying
              ? 'bg-white text-slate-900 shadow-white/20'
              : 'bg-indigo-500 text-white shadow-indigo-500/30'}
            shadow-lg hover:scale-105 active:scale-95
          `}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <ICONS.Pause className="w-6 h-6" />
          ) : (
            <ICONS.Player className="w-6 h-6 ml-0.5" />
          )}
        </button>

        {/* Progress section */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          {/* Progress bar */}
          <div
            className="relative h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group"
            onClick={handleProgressClick}
          >
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
            {/* Hover indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 5px)` }}
            />
          </div>

          {/* Time display */}
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Expand button */}
        <button
          onClick={onExpand}
          className="p-2 md:p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all btn-press focus-ring flex-shrink-0"
          title="Expand to full screen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 md:w-5 md:h-5" fill="currentColor">
            <path fillRule="evenodd" d="M15 3.75a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0V5.56l-3.97 3.97a.75.75 0 11-1.06-1.06l3.97-3.97h-2.69a.75.75 0 01-.75-.75zm-12 0A.75.75 0 013.75 3h4.5a.75.75 0 010 1.5H5.56l3.97 3.97a.75.75 0 01-1.06 1.06L4.5 5.56v2.69a.75.75 0 01-1.5 0v-4.5zm11.47 11.78a.75.75 0 111.06-1.06l3.97 3.97v-2.69a.75.75 0 011.5 0v4.5a.75.75 0 01-.75.75h-4.5a.75.75 0 010-1.5h2.69l-3.97-3.97zm-4.94-1.06a.75.75 0 010 1.06L5.56 19.5h2.69a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75v-4.5a.75.75 0 011.5 0v2.69l3.97-3.97a.75.75 0 011.06 0z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Stop button */}
        <button
          onClick={onStop}
          className="p-2 md:p-2.5 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all btn-press focus-ring flex-shrink-0"
          title="Stop and return"
        >
          <ICONS.Close className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>

      {/* Secondary row: music volume + voice name */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
        {/* Background music volume */}
        {backgroundTrackName && backgroundTrackName !== 'None' ? (
          <div className="flex items-center gap-2">
            <ICONS.Music className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={backgroundVolume}
              onChange={(e) => onBackgroundVolumeChange(parseFloat(e.target.value))}
              className="w-16 md:w-20 h-1 bg-white/10 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-2.5
                [&::-webkit-slider-thumb]:h-2.5
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:hover:scale-110
                [&::-webkit-slider-thumb]:transition-transform"
            />
            <span className="text-[10px] text-slate-500 w-6">{Math.round(backgroundVolume * 100)}%</span>
          </div>
        ) : (
          <div /> // Empty div to maintain flex spacing
        )}

        {/* Voice name indicator */}
        <span className="text-[10px] md:text-[11px] uppercase tracking-widest text-slate-500 font-bold truncate max-w-[120px]">
          {voiceName}
        </span>
      </div>
    </div>
  );
});

// Display name for React DevTools
InlinePlayer.displayName = 'InlinePlayer';

export default InlinePlayer;
