import React, { useState, useCallback } from 'react';
import { MarketingNav } from './components/MarketingNav';
import { MarketingAuthGate } from './components/MarketingAuthGate';
import { MarketingUserProvider } from './contexts/MarketingUserContext';
import { useMarketingData } from './hooks/useMarketingData';
import { MarketingTab, MarketingHubData } from './types';
import { downloadMarkdown, downloadJSON } from './utils/export';

// Lazy load phase components
import { Phase1Foundation } from './phases/Phase1Foundation';
import { Phase2Validation } from './phases/Phase2Validation';
import { Phase3Scale } from './phases/Phase3Scale';
import { Overview } from './sections/Overview';
import { Resources } from './sections/Resources';
import { Notes } from './sections/Notes';

export default function MarketingPage() {
  return (
    <MarketingAuthGate>
      <MarketingUserProvider>
        <MarketingPageContent />
      </MarketingUserProvider>
    </MarketingAuthGate>
  );
}

function MarketingPageContent() {
  const [activeTab, setActiveTab] = useState<MarketingTab>('overview');
  const { data, updateData, resetData, isSaving, lastSaved, progress } = useMarketingData();

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
