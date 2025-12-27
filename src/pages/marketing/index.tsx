import React, { useState, useCallback, useEffect } from 'react';
import { MarketingNav } from './components/MarketingNav';
import { useMarketingData } from './hooks/useMarketingData';
import { MarketingTab, MarketingHubData } from './types';
import { downloadMarkdown, downloadJSON } from './utils/export';
import { Lock, ArrowRight } from 'lucide-react';

// Lazy load phase components
import { Phase1Foundation } from './phases/Phase1Foundation';
import { Phase2Validation } from './phases/Phase2Validation';
import { Phase3Scale } from './phases/Phase3Scale';
import { Overview } from './sections/Overview';
import { Resources } from './sections/Resources';
import { Notes } from './sections/Notes';

const ACCESS_CODE = '516278';
const STORAGE_KEY = 'marketing-hub-access';

function AccessCodeGate({ onAccessGranted }: { onAccessGranted: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === ACCESS_CODE) {
      localStorage.setItem(STORAGE_KEY, 'granted');
      onAccessGranted();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setCode('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-xl p-8 w-full max-w-md ${shake ? 'animate-shake' : ''}`}>
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-teal-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
          Marketing Hub
        </h1>
        <p className="text-slate-500 text-center mb-6">
          Enter the access code to continue
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(false);
              }}
              placeholder="Enter access code"
              className={`w-full px-4 py-3 text-center text-2xl tracking-widest font-mono rounded-xl border-2 transition-colors ${
                error
                  ? 'border-red-300 bg-red-50 text-red-900'
                  : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-teal-500 focus:bg-white'
              } outline-none`}
              autoFocus
              maxLength={6}
            />
            {error && (
              <p className="text-red-500 text-sm text-center mt-2">
                Invalid code. Please try again.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Access Hub
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default function MarketingPage() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<MarketingTab>('overview');
  const { data, updateData, resetData, isSaving, lastSaved, progress } = useMarketingData();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setHasAccess(stored === 'granted');
  }, []);

  // Create phase-specific update handlers - must be before early returns
  const updatePhase1 = useCallback(
    (updates: Partial<MarketingHubData['phase1']>) => {
      updateData('phase1', { ...data.phase1, ...updates });
    },
    [data.phase1, updateData]
  );

  const updatePhase2 = useCallback(
    (updates: Partial<MarketingHubData['phase2']>) => {
      updateData('phase2', { ...data.phase2, ...updates });
    },
    [data.phase2, updateData]
  );

  const updatePhase3 = useCallback(
    (updates: Partial<MarketingHubData['phase3']>) => {
      updateData('phase3', { ...data.phase3, ...updates });
    },
    [data.phase3, updateData]
  );

  const updateResources = useCallback(
    (updates: Partial<MarketingHubData['resources']>) => {
      updateData('resources', { ...data.resources, ...updates });
    },
    [data.resources, updateData]
  );

  const updateNotes = useCallback(
    (updates: Partial<MarketingHubData['notes']>) => {
      updateData('notes', { ...data.notes, ...updates });
    },
    [data.notes, updateData]
  );

  // Show nothing while checking access
  if (hasAccess === null) {
    return null;
  }

  // Show access code gate if not authorized
  if (!hasAccess) {
    return <AccessCodeGate onAccessGranted={() => setHasAccess(true)} />;
  }

  const handleExport = (format: 'markdown' | 'pdf') => {
    if (format === 'markdown') {
      downloadMarkdown(data);
    } else {
      // PDF export - for now just export as JSON
      downloadJSON(data);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all marketing data? This cannot be undone.')) {
      resetData();
    }
  };

  const handleNavigate = (tab: MarketingTab) => {
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Overview
            data={data}
            progress={progress}
            onNavigate={handleNavigate}
          />
        );
      case 'phase1':
        return (
          <Phase1Foundation
            data={data.phase1}
            onUpdate={updatePhase1}
          />
        );
      case 'phase2':
        return (
          <Phase2Validation
            data={data.phase2}
            onUpdate={updatePhase2}
          />
        );
      case 'phase3':
        return (
          <Phase3Scale
            data={data.phase3}
            onUpdate={updatePhase3}
          />
        );
      case 'resources':
        return (
          <Resources
            data={data.resources}
            onUpdate={updateResources}
          />
        );
      case 'notes':
        return (
          <Notes
            data={data.notes}
            onUpdate={updateNotes}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        progress={progress}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onExport={handleExport}
        onReset={handleReset}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {renderContent()}
      </main>
    </div>
  );
}
