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
    <div className="fixed inset-0 z-[110] bg-[#020617]/95 backdrop-blur-3xl flex flex-col p-4 md:p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
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

      <div className="flex-1 flex flex-col items-center pt-16 md:pt-12 relative z-10 max-w-7xl mx-auto w-full">
        <div className="inline-block px-4 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-4 md:mb-6">Ambient</div>
        <h2 className="text-2xl md:text-4xl font-extralight text-center mb-2 tracking-tight">
          <span className="bg-gradient-to-r from-emerald-300 via-sky-200 to-sky-400 bg-clip-text text-transparent">Nature Sounds</span>
        </h2>
        <p className="text-slate-500 text-center mb-6 md:mb-8 text-sm">Add ambient sounds to your meditation</p>

        <div className="w-full space-y-4 xl:space-y-3">
          {/* No Sound Option */}
          {noneOption && (
            <div className="mb-4">
              <div
                className={`p-3 md:p-4 rounded-xl text-left transition-all relative group max-w-xs mx-auto ${
                  selectedSound.id === 'none'
                    ? 'bg-slate-500/10 border-2 border-slate-400 text-slate-300'
                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-slate-400">{renderIcon(noneOption.icon, "w-6 h-6")}</span>
                  <div className="flex-1">
                    <span className={`font-medium ${selectedSound.id === 'none' ? 'text-white' : 'text-slate-300'}`}>
                      {noneOption.name}
                    </span>
                    <p className="text-xs text-slate-500">{noneOption.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSelectSound(noneOption)}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                    selectedSound.id === 'none'
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {selectedSound.id === 'none' ? '✓ Selected' : 'Select'}
                </button>
              </div>
            </div>
          )}

          {/* Sound Categories */}
          {Object.entries(NATURE_SOUNDS_BY_CATEGORY).map(([category, sounds]) => {
            const config = NATURE_SOUND_CATEGORIES[category];
            if (!config) return null;
            return (
              <div key={category}>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${config.color}`}>
                  {config.label}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2 md:gap-3">
                  {sounds.map((sound) => (
                    <div
                      key={sound.id}
                      className={`p-3 md:p-4 rounded-xl text-left transition-all relative group ${
                        selectedSound.id === sound.id
                          ? `${config.bgColor} border-2 border-current ${config.color}`
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`flex-shrink-0 ${selectedSound.id === sound.id ? config.color : 'text-slate-400'}`}>{renderIcon(sound.icon, "w-5 h-5")}</span>
                          <span className={`font-medium text-sm truncate ${selectedSound.id === sound.id ? 'text-white' : 'text-slate-300'}`}>
                            {sound.name}
                          </span>
                        </div>
                        {sound.audioUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePreview(sound);
                            }}
                            className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                              previewingSoundId === sound.id
                                ? 'bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/30'
                                : 'bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white hover:scale-105'
                            }`}
                            title={previewingSoundId === sound.id ? 'Stop preview' : 'Preview sound'}
                          >
                            {previewingSoundId === sound.id ? (
                              <ICONS.Pause className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            ) : (
                              <ICONS.Player className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2">{sound.description}</p>
                      <button
                        onClick={() => handleSelectSound(sound)}
                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                          selectedSound.id === sound.id
                            ? 'bg-white/20 text-white'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {selectedSound.id === sound.id ? '✓ Selected' : 'Select'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom padding for safe area */}
        <div className="h-8 md:h-12" />
      </div>
    </div>
  );
};

export default NatureSoundSelectorModal;
