import React from 'react';
import { ICONS, NATURE_SOUND_CATEGORIES, NATURE_SOUNDS_BY_CATEGORY, NATURE_SOUNDS, NatureSound } from '../../constants';
import Starfield from '../../components/Starfield';

// Helper to render icon from icon name
const renderIcon = (iconName: string, className: string = "w-5 h-5") => {
  const IconComponent = ICONS[iconName as keyof typeof ICONS];
  if (IconComponent) {
    return <IconComponent className={className} />;
  }
  return <ICONS.Leaf className={className} />; // Fallback
};

interface NatureSoundSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSound: NatureSound;
  onSelectSound: (sound: NatureSound) => void;
  previewingSoundId: string | null;
  onTogglePreview: (sound: NatureSound) => void;
  onStopPreview: () => void;
}

export const NatureSoundSelectorModal: React.FC<NatureSoundSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedSound,
  onSelectSound,
  previewingSoundId,
  onTogglePreview,
  onStopPreview,
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    onStopPreview();
    onClose();
  };

  const handleSelectSound = (sound: NatureSound) => {
    onStopPreview();
    onSelectSound(sound);
    onClose();
  };

  // Get the "none" option
  const noneOption = NATURE_SOUNDS.find(s => s.id === 'none');

  return (
    <div className="fixed inset-0 z-[110] bg-[#020617]/98 backdrop-blur-3xl flex flex-col animate-in fade-in duration-300 overflow-hidden">
      <Starfield />

      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 md:px-6 md:pt-6 relative z-10">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-all flex items-center gap-2 group btn-press focus-ring rounded-full"
          >
            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all">
              <ICONS.ArrowBack className="w-4 h-4" />
            </div>
            <span className="hidden sm:inline text-sm font-medium">Back</span>
          </button>

          <div className="text-center">
            <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-1">
              Ambient
            </div>
            <h2 className="text-xl md:text-2xl font-light tracking-tight">
              <span className="bg-gradient-to-r from-emerald-300 to-sky-400 bg-clip-text text-transparent">
                Nature Sounds
              </span>
            </h2>
          </div>

          {/* Spacer for centering */}
          <div className="w-10 h-10 sm:w-24" />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-safe">
        <div className="max-w-5xl mx-auto py-4 md:py-6">

          {/* No Sound Option */}
          {noneOption && (
            <div className="mb-6">
              <button
                onClick={() => handleSelectSound(noneOption)}
                className={`w-full max-w-sm mx-auto flex items-center gap-4 p-4 rounded-2xl transition-all ${
                  selectedSound.id === 'none'
                    ? 'bg-slate-500/20 border-2 border-slate-400 shadow-lg shadow-slate-500/10'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  selectedSound.id === 'none' ? 'bg-slate-500/30' : 'bg-white/10'
                }`}>
                  {renderIcon(noneOption.icon, "w-6 h-6 text-slate-400")}
                </div>
                <div className="flex-1 text-left">
                  <div className={`font-medium ${selectedSound.id === 'none' ? 'text-white' : 'text-slate-300'}`}>
                    {noneOption.name}
                  </div>
                  <div className="text-sm text-slate-500">{noneOption.description}</div>
                </div>
                {selectedSound.id === 'none' && (
                  <div className="w-6 h-6 rounded-full bg-slate-400 flex items-center justify-center flex-shrink-0 text-slate-900 text-sm font-bold">
                    ✓
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Sound Categories */}
          <div className="space-y-6">
            {Object.entries(NATURE_SOUNDS_BY_CATEGORY).map(([category, sounds]) => {
              const config = NATURE_SOUND_CATEGORIES[category];
              if (!config) return null;

              return (
                <div key={category}>
                  <h3 className={`text-xs font-bold uppercase tracking-[0.2em] mb-3 px-1 ${config.color}`}>
                    {config.label}
                  </h3>

                  {/* Grid: 1 col on small mobile, 2 cols on mobile+, 3 cols on tablet, 4 cols on desktop */}
                  <div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {sounds.map((sound) => {
                      const isSelected = selectedSound.id === sound.id;
                      const isPreviewing = previewingSoundId === sound.id;

                      return (
                        <div
                          key={sound.id}
                          className={`relative rounded-2xl transition-all ${
                            isSelected
                              ? `${config.bgColor} border-2 border-current ${config.color} shadow-lg`
                              : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                          }`}
                        >
                          {/* Card Content */}
                          <div className="p-4">
                            {/* Top Row: Icon, Name, Preview */}
                            <div className="flex items-start gap-3 mb-2">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'bg-white/20' : 'bg-white/10'
                              }`}>
                                {renderIcon(sound.icon, `w-5 h-5 ${isSelected ? config.color : 'text-slate-400'}`)}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className={`font-medium text-sm truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                  {sound.name}
                                </div>
                                <div className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                                  {sound.description}
                                </div>
                              </div>

                              {/* Preview Button */}
                              {sound.audioUrl && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTogglePreview(sound);
                                  }}
                                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                                    isPreviewing
                                      ? 'bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/40'
                                      : 'bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white hover:scale-105'
                                  }`}
                                  title={isPreviewing ? 'Stop preview' : 'Preview sound'}
                                >
                                  {isPreviewing ? (
                                    <ICONS.Pause className="w-3.5 h-3.5" />
                                  ) : (
                                    <ICONS.Player className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Select Button */}
                            <button
                              onClick={() => handleSelectSound(sound)}
                              className={`w-full py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              {isSelected ? (
                                <span className="flex items-center justify-center gap-2">
                                  <span>✓</span>
                                  Selected
                                </span>
                              ) : (
                                'Select'
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Safe Area */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
};

export default NatureSoundSelectorModal;
