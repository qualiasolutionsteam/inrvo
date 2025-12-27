import React from 'react';
import { Target, TestTube, Rocket, TrendingUp, Users, DollarSign, FileText, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { CircularProgress, ProgressIndicator } from '../components/ProgressIndicator';
import { MarketingHubData } from '../types';

interface OverviewProps {
  data: MarketingHubData;
  progress: {
    overall: number;
    phase1: number;
    phase2: number;
    phase3: number;
  };
  onNavigate: (tab: 'phase1' | 'phase2' | 'phase3') => void;
}

const phaseCards = [
  {
    id: 'phase1' as const,
    title: 'Phase 1: Foundation',
    subtitle: 'Build your marketing base',
    icon: Target,
    color: 'from-teal-500 to-cyan-500',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500/30',
    items: [
      'Define positioning & messaging',
      'Build conversion infrastructure',
      'Create foundational content',
    ],
  },
  {
    id: 'phase2' as const,
    title: 'Phase 2: Validation',
    subtitle: 'Test and learn',
    icon: TestTube,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    items: [
      'Run paid acquisition tests',
      'Build organic content calendar',
      'Explore influencer partnerships',
    ],
  },
  {
    id: 'phase3' as const,
    title: 'Phase 3: Scale',
    subtitle: 'Double down on winners',
    icon: Rocket,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    items: [
      'Document winning playbook',
      'Plan budget allocation',
      'Set up recurring tasks',
    ],
  },
];

export function Overview({ data, progress, onNavigate }: OverviewProps) {
  // Calculate key metrics
  const totalCampaigns = data.phase2.paidAcquisition.campaigns.length;
  const activeCampaigns = data.phase2.paidAcquisition.campaigns.filter(
    (c) => c.status === 'active'
  ).length;
  const totalInfluencers = data.phase2.influencers.length;
  const totalContent = data.phase2.organicContent.calendar.length + data.phase2.organicContent.backlog.length;
  const approvedPersonas = data.phase1.positioning.personas.filter(
    (p) => p.status === 'approved'
  ).length;
  const publishedArticles = data.phase1.content.seoArticles.filter(
    (a) => a.status === 'published' || a.status === 'ranking'
  ).length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200/50 rounded-xl p-4 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">INrVO Marketing Hub</h2>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">
              Track your marketing progress from foundation to scale
            </p>
          </div>
          <CircularProgress value={progress.overall} size={64} strokeWidth={5} />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
          <QuickStat
            icon={Users}
            label="Approved Personas"
            value={approvedPersonas}
            total={data.phase1.positioning.personas.length}
            color="text-teal-600"
          />
          <QuickStat
            icon={DollarSign}
            label="Active Campaigns"
            value={activeCampaigns}
            total={totalCampaigns}
            color="text-amber-600"
          />
          <QuickStat
            icon={FileText}
            label="Published Articles"
            value={publishedArticles}
            total={data.phase1.content.seoArticles.length}
            color="text-cyan-600"
          />
          <QuickStat
            icon={TrendingUp}
            label="Influencer Contacts"
            value={totalInfluencers}
            color="text-purple-600"
          />
        </div>
      </motion.div>

      {/* Phase Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {phaseCards.map((phase, index) => {
          const phaseProgress = progress[phase.id];
          const Icon = phase.icon;

          return (
            <motion.button
              key={phase.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onNavigate(phase.id)}
              className={`text-left p-4 sm:p-6 rounded-xl border ${phase.borderColor} ${phase.bgColor} hover:bg-opacity-20 transition-all group`}
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${phase.color} flex items-center justify-center`}>
                  <Icon size={20} className="sm:w-6 sm:h-6 text-white" />
                </div>
                <CircularProgress value={phaseProgress} size={40} strokeWidth={3} />
              </div>

              <h3 className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors text-sm sm:text-base">
                {phase.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">{phase.subtitle}</p>

              <ul className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
                {phase.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
                    <CheckCircle size={12} className="sm:w-[14px] sm:h-[14px] text-teal-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200">
                <ProgressIndicator value={phaseProgress} showLabel />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Recent Activity / Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Positioning Summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
          <h3 className="font-semibold text-slate-900 mb-3 sm:mb-4">Positioning Summary</h3>

          {data.phase1.positioning.primaryValueProp ? (
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider">Primary Value Prop</label>
                <p className="text-slate-900 mt-1 text-sm sm:text-base">{data.phase1.positioning.primaryValueProp}</p>
              </div>

              {data.phase3.winningPlaybook.bestMessage && (
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Best Performing Message</label>
                  <p className="text-teal-600 mt-1 text-sm sm:text-base">{data.phase3.winningPlaybook.bestMessage}</p>
                </div>
              )}

              {data.phase3.winningPlaybook.bestAudience && (
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Best Audience</label>
                  <p className="text-slate-700 mt-1 text-sm sm:text-base">{data.phase3.winningPlaybook.bestAudience}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-600 text-sm">
              Start by defining your primary value proposition in Phase 1.
            </p>
          )}
        </div>

        {/* Unit Economics */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
          <h3 className="font-semibold text-slate-900 mb-3 sm:mb-4">Unit Economics</h3>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
              <label className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">Current CAC</label>
              <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-1">
                ${data.phase3.winningPlaybook.currentCAC || '—'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
              <label className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">Target CAC</label>
              <p className="text-lg sm:text-2xl font-bold text-teal-600 mt-1">
                ${data.phase3.winningPlaybook.targetCAC || '—'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
              <label className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">Customer LTV</label>
              <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-1">
                ${data.phase3.winningPlaybook.ltv || '—'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
              <label className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">LTV:CAC Ratio</label>
              <p className={`text-lg sm:text-2xl font-bold mt-1 ${
                data.phase3.winningPlaybook.currentCAC > 0
                  ? (data.phase3.winningPlaybook.ltv / data.phase3.winningPlaybook.currentCAC) >= 3
                    ? 'text-teal-600'
                    : (data.phase3.winningPlaybook.ltv / data.phase3.winningPlaybook.currentCAC) >= 2
                    ? 'text-amber-600'
                    : 'text-red-500'
                  : 'text-slate-500'
              }`}>
                {data.phase3.winningPlaybook.currentCAC > 0
                  ? `${(data.phase3.winningPlaybook.ltv / data.phase3.winningPlaybook.currentCAC).toFixed(1)}x`
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Budget Summary */}
      {data.phase3.scalePlan.monthlyBudget > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base">Monthly Budget: ${data.phase3.scalePlan.monthlyBudget}</h3>
          </div>

          <div className="flex h-6 sm:h-8 rounded-lg overflow-hidden">
            {Object.entries(data.phase3.scalePlan.channelAllocation).map(([channel, value]) => {
              const colors: Record<string, string> = {
                meta: 'bg-blue-500',
                google: 'bg-red-500',
                tiktok: 'bg-pink-500',
                influencer: 'bg-purple-500',
                content: 'bg-teal-500',
              };
              if (value === 0) return null;
              return (
                <div
                  key={channel}
                  className={`${colors[channel]} flex items-center justify-center text-[10px] sm:text-xs font-medium text-white`}
                  style={{ width: `${value}%` }}
                  title={`${channel}: ${value}%`}
                >
                  {value >= 15 && <span className="hidden sm:inline">{channel} {value}%</span>}
                  {value >= 15 && <span className="sm:hidden">{value}%</span>}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-4 mt-3">
            {Object.entries(data.phase3.scalePlan.channelAllocation).map(([channel, value]) => {
              const colors: Record<string, string> = {
                meta: 'bg-blue-500',
                google: 'bg-red-500',
                tiktok: 'bg-pink-500',
                influencer: 'bg-purple-500',
                content: 'bg-teal-500',
              };
              const amount = Math.round((value / 100) * data.phase3.scalePlan.monthlyBudget);
              return (
                <div key={channel} className="flex items-center gap-1.5 sm:gap-2">
                  <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded ${colors[channel]}`} />
                  <span className="text-xs sm:text-sm text-slate-600 capitalize">
                    {channel}: ${amount}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Quick Stat Component
interface QuickStatProps {
  icon: React.ElementType;
  label: string;
  value: number;
  total?: number;
  color: string;
}

function QuickStat({ icon: Icon, label, value, total, color }: QuickStatProps) {
  return (
    <div className="bg-white/60 rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
        <Icon size={14} className={`sm:w-4 sm:h-4 ${color}`} />
        <span className="text-xs sm:text-sm text-slate-600 truncate">{label}</span>
      </div>
      <div className="text-xl sm:text-2xl font-bold text-slate-900">
        {value}
        {total !== undefined && <span className="text-slate-500 text-base sm:text-lg">/{total}</span>}
      </div>
    </div>
  );
}
