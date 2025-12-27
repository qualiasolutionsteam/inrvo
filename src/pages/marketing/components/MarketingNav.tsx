import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Target, TestTube, Rocket, FolderOpen, MessageSquare, Download, RotateCcw, Check, Loader2, ArrowLeft } from 'lucide-react';
import { MarketingTab } from '../types';
import { CircularProgress } from './ProgressIndicator';

interface MarketingNavProps {
  activeTab: MarketingTab;
  onTabChange: (tab: MarketingTab) => void;
  progress: {
    overall: number;
    phase1: number;
    phase2: number;
    phase3: number;
  };
  isSaving: boolean;
  lastSaved: Date | null;
  onExport: (format: 'markdown' | 'pdf') => void;
  onReset: () => void;
}

const tabs: { id: MarketingTab; label: string; icon: React.ReactNode; phaseKey?: 'phase1' | 'phase2' | 'phase3' }[] = [
  { id: 'overview', label: 'Overview', icon: <Home size={18} /> },
  { id: 'phase1', label: 'Phase 1: Foundation', icon: <Target size={18} />, phaseKey: 'phase1' },
  { id: 'phase2', label: 'Phase 2: Validation', icon: <TestTube size={18} />, phaseKey: 'phase2' },
  { id: 'phase3', label: 'Phase 3: Scale', icon: <Rocket size={18} />, phaseKey: 'phase3' },
  { id: 'resources', label: 'Resources', icon: <FolderOpen size={18} /> },
  { id: 'notes', label: 'Notes', icon: <MessageSquare size={18} /> },
];

export function MarketingNav({
  activeTab,
  onTabChange,
  progress,
  isSaving,
  lastSaved,
  onExport,
  onReset,
}: MarketingNavProps) {
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
        {/* Top bar - stacks on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-2 sm:mb-3">
          {/* Left side: Back + Title */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/"
              className="flex items-center gap-1.5 sm:gap-2 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="text-xs sm:text-sm">Back</span>
            </Link>
            <div className="h-4 sm:h-6 w-px bg-slate-200" />
            <h1 className="text-base sm:text-xl font-bold text-slate-900">Marketing Hub</h1>
          </div>

          {/* Right side: Status + Actions */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
            {/* Save status - hidden on very small screens */}
            <div className="hidden xs:flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              {isSaving ? (
                <>
                  <Loader2 size={12} className="sm:w-[14px] sm:h-[14px] animate-spin text-teal-500" />
                  <span className="text-slate-500">Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Check size={12} className="sm:w-[14px] sm:h-[14px] text-teal-500" />
                  <span className="text-slate-500 hidden sm:inline">
                    Saved {lastSaved.toLocaleTimeString()}
                  </span>
                  <span className="text-slate-500 sm:hidden">Saved</span>
                </>
              ) : null}
            </div>

            {/* Overall progress */}
            <CircularProgress value={progress.overall} size={36} strokeWidth={3} />

            {/* Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => onExport('markdown')}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs sm:text-sm transition-colors"
              >
                <Download size={12} className="sm:w-[14px] sm:h-[14px]" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={onReset}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-colors"
                title="Reset all data"
              >
                <RotateCcw size={14} className="sm:w-[16px] sm:h-[16px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab navigation - horizontal scroll on mobile */}
        <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const phaseProgress = tab.phaseKey ? progress[tab.phaseKey] : null;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-500/10 text-teal-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="[&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-[18px] sm:[&>svg]:h-[18px]">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.replace('Phase ', 'P').replace(': ', ': ')}</span>
                {phaseProgress !== null && (
                  <span
                    className={`ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-xs ${
                      phaseProgress === 100
                        ? 'bg-teal-500/10 text-teal-600'
                        : phaseProgress > 0
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {phaseProgress}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
