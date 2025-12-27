import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

/**
 * Script context - manages meditation script generation state
 * Separated from AppContext to reduce re-renders for components
 * that don't need script-related state.
 */
interface ScriptContextValue {
  // Script content
  script: string;
  setScript: (script: string) => void;
  enhancedScript: string;
  setEnhancedScript: (script: string) => void;
  editableScript: string;
  setEditableScript: (script: string) => void;

  // Generation state
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  generationStage: 'idle' | 'script' | 'voice' | 'ready';
  setGenerationStage: (stage: 'idle' | 'script' | 'voice' | 'ready') => void;

  // Chat state
  chatStarted: boolean;
  setChatStarted: (started: boolean) => void;
  restoredScript: string | null;
  setRestoredScript: (script: string | null) => void;

  // Helper
  resetScript: () => void;
}

const ScriptContext = createContext<ScriptContextValue | undefined>(undefined);

export const ScriptProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Script content
  const [script, setScript] = useState('');
  const [enhancedScript, setEnhancedScript] = useState('');
  const [editableScript, setEditableScript] = useState('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<'idle' | 'script' | 'voice' | 'ready'>('idle');

  // Chat state
  const [chatStarted, setChatStarted] = useState(false);
  const [restoredScript, setRestoredScript] = useState<string | null>(null);

  // Reset helper
  const resetScript = () => {
    setScript('');
    setEnhancedScript('');
    setEditableScript('');
    setIsGenerating(false);
    setGenerationStage('idle');
  };

  // Memoize to prevent unnecessary re-renders
  const value = useMemo<ScriptContextValue>(() => ({
    script,
    setScript,
    enhancedScript,
    setEnhancedScript,
    editableScript,
    setEditableScript,
    isGenerating,
    setIsGenerating,
    generationStage,
    setGenerationStage,
    chatStarted,
    setChatStarted,
    restoredScript,
    setRestoredScript,
    resetScript,
  }), [
    script,
    enhancedScript,
    editableScript,
    isGenerating,
    generationStage,
    chatStarted,
    restoredScript,
  ]);

  return (
    <ScriptContext.Provider value={value}>
      {children}
    </ScriptContext.Provider>
  );
};

/**
 * Hook to access script context
 */
export const useScript = (): ScriptContextValue => {
  const context = useContext(ScriptContext);
  if (context === undefined) {
    throw new Error('useScript must be used within a ScriptProvider');
  }
  return context;
};

export default ScriptContext;
