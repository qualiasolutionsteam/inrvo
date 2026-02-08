import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode, Dispatch, SetStateAction } from 'react';

/**
 * Script context - manages meditation script generation state
 * Separated from AppContext to reduce re-renders for components
 * that don't need script-related state.
 */
interface ScriptContextValue {
  // Script content
  script: string;
  setScript: Dispatch<SetStateAction<string>>;
  enhancedScript: string;
  setEnhancedScript: Dispatch<SetStateAction<string>>;
  editableScript: string;
  setEditableScript: Dispatch<SetStateAction<string>>;

  // Generation state
  isGenerating: boolean;
  setIsGenerating: Dispatch<SetStateAction<boolean>>;
  generationStage: 'idle' | 'script' | 'voice' | 'ready';
  setGenerationStage: Dispatch<SetStateAction<'idle' | 'script' | 'voice' | 'ready'>>;

  // Chat state
  chatStarted: boolean;
  setChatStarted: Dispatch<SetStateAction<boolean>>;
  restoredScript: string | null;
  setRestoredScript: Dispatch<SetStateAction<string | null>>;

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

  // Reset helper - memoized to prevent unnecessary re-renders
  const resetScript = useCallback(() => {
    setScript('');
    setEnhancedScript('');
    setEditableScript('');
    setIsGenerating(false);
    setGenerationStage('idle');
  }, []);

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
    resetScript,
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
