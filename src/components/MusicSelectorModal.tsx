import React from 'react';
import { ICONS, MUSIC_CATEGORY_CONFIG, TRACKS_BY_CATEGORY, BackgroundTrack } from '../../constants';
import Starfield from '../../components/Starfield';

interface MusicSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTrack: BackgroundTrack;
  onSelectTrack: (track: BackgroundTrack) => void;
  previewingTrackId: string | null;
  onTogglePreview: (track: BackgroundTrack) => void;
  onStopPreview: () => void;
}

export const MusicSelectorModal: React.FC<MusicSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedTrack,
  onSelectTrack,
  previewingTrackId,
  onTogglePreview,
  onStopPreview,
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    onStopPreview();
    onClose();
  };

  const handleSelectTrack = (track: BackgroundTrack) => {
    onStopPreview();
    onSelectTrack(track);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex flex-col p-4 md:p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
      <Starfield />

      <button
        onClick={handleClose}
        className="fixed top-4 left-4 md:top-6 md:left-6 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-[100]"
      >
        <div className="w-10 h-10 md:w-12 md:h-12 min-w-[40px] min-h-[40px] rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
          <ICONS.ArrowBack className="w-4 h-4 md:w-5 md:h-5" />
        </div>
        <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.3em]">Back</span>
      </button>

      <div className="flex-1 flex flex-col items-center pt-16 md:pt-12 relative z-10 max-w-5xl mx-auto w-full">
        <div className="inline-block px-4 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-4 md:mb-6">Background</div>
        <h2 className="text-2xl md:text-4xl font-extralight text-center mb-2 tracking-tight">
          <span className="bg-gradient-to-r from-emerald-300 via-sky-200 to-sky-400 bg-clip-text text-transparent">Choose Music</span>
        </h2>
        <p className="text-slate-500 text-center mb-6 md:mb-8 text-sm">Select background audio for your meditation</p>

        <div className="w-full space-y-6">
          {Object.entries(TRACKS_BY_CATEGORY).map(([category, tracks]) => {
            const config = MUSIC_CATEGORY_CONFIG[category];
            if (!config) return null;
            return (
              <div key={category}>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${config.color}`}>
                  {config.label}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                  {tracks.map((track) => (
                    <div
                      key={track.id}
                      className={`p-3 md:p-4 rounded-xl text-left transition-all relative group ${
                        selectedTrack.id === track.id
                          ? `${config.bgColor} border-2 border-current ${config.color}`
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <ICONS.Music className={`w-4 h-4 flex-shrink-0 ${selectedTrack.id === track.id ? config.color : 'text-slate-500'}`} />
                          <span className={`font-medium text-sm truncate ${selectedTrack.id === track.id ? 'text-white' : 'text-slate-300'}`}>
                            {track.name}
                          </span>
                        </div>
                        {track.audioUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePreview(track);
                            }}
                            className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                              previewingTrackId === track.id
                                ? 'bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/30'
                                : 'bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white hover:scale-105'
                            }`}
                            title={previewingTrackId === track.id ? 'Stop preview' : 'Preview track'}
                          >
                            {previewingTrackId === track.id ? (
                              <ICONS.Pause className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            ) : (
                              <ICONS.Player className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2">{track.description}</p>
                      <button
                        onClick={() => handleSelectTrack(track)}
                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                          selectedTrack.id === track.id
                            ? 'bg-white/20 text-white'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {selectedTrack.id === track.id ? '✓ Selected' : 'Select'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MusicSelectorModal;
