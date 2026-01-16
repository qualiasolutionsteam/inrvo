import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X, Trash2 } from 'lucide-react';

interface SaveMeditationDialogProps {
  isOpen: boolean;
  defaultTitle: string;
  onSave: (title: string) => void;
  onDiscard: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const SaveMeditationDialog: React.FC<SaveMeditationDialogProps> = ({
  isOpen,
  defaultTitle,
  onSave,
  onDiscard,
  onCancel,
  isSaving = false,
}) => {
  const [title, setTitle] = useState(defaultTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset title when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle);
      // Focus input after animation
      setTimeout(() => inputRef.current?.select(), 100);
    }
  }, [isOpen, defaultTitle]);

  const handleSave = () => {
    const trimmedTitle = title.trim() || defaultTitle;
    onSave(trimmedTitle);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSaving) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-[201] -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md"
          >
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Save to My Audios?</h2>
                <button
                  onClick={onCancel}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <p className="text-slate-400 text-sm mb-4">
                Would you like to save this to My Audios?
              </p>

              {/* Title Input */}
              <div className="mb-6">
                <label htmlFor="meditation-title" className="block text-sm font-medium text-slate-300 mb-2">
                  Name your meditation
                </label>
                <input
                  ref={inputRef}
                  id="meditation-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter a title..."
                  className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all"
                  disabled={isSaving}
                  autoFocus
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-600/50 text-white font-medium rounded-xl transition-colors"
                >
                  {isSaving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save
                    </>
                  )}
                </button>

                {/* Don't Save Button */}
                <button
                  onClick={onDiscard}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white font-medium rounded-xl transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  Don't Save
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SaveMeditationDialog;
