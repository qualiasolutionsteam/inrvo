import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, FileText, Check, CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import GlassCard from '../../../../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import { useReports, useDeliverables } from '../../../hooks/useMarketingData';
import type { MarketingReport } from '../../../types/marketing';

const setupChecklist = [
  { id: 'ga4', label: 'Google Analytics 4 installed', description: 'Track website visitors and behavior' },
  { id: 'events', label: 'Event tracking configured', description: 'Custom events for key actions' },
  { id: 'social', label: 'Social accounts connected', description: 'Link Instagram and Facebook' },
  { id: 'kpis', label: 'KPI dashboard created', description: 'Visualize key metrics' },
  { id: 'goals', label: 'Conversion goals set', description: 'Track signups and conversions' },
];

interface ReportCardProps {
  report: MarketingReport;
  onAcknowledge: (id: string) => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, onAcknowledge }) => {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <GlassCard className="!p-4 sm:!p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-sky-500/10">
                <FileText className="w-5 h-5 text-sky-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{report.report_period}</h3>
                <p className="text-xs text-slate-400">{formatDate(report.report_date)}</p>
              </div>
            </div>

            {report.summary && (
              <p className="text-sm text-slate-400 mt-3">{report.summary}</p>
            )}

            {/* Insights */}
            {report.insights && report.insights.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">Key Insights</h4>
                <ul className="space-y-1">
                  {report.insights.slice(0, 3).map((insight, index) => (
                    <li key={index} className="text-sm text-slate-400 flex items-start gap-2">
                      <span className="text-sky-500 mt-1">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {report.recommendations && report.recommendations.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {report.recommendations.slice(0, 3).map((rec, index) => (
                    <li key={index} className="text-sm text-slate-400 flex items-start gap-2">
                      <span className="text-green-400 mt-1">→</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-row sm:flex-col items-center gap-3">
            {report.client_acknowledged ? (
              <span className="text-green-400 text-xs flex items-center gap-1">
                <Check className="w-4 h-4" />
                Acknowledged
              </span>
            ) : (
              <button
                onClick={() => onAcknowledge(report.id)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Acknowledge
              </button>
            )}

            {report.report_url && (
              <a
                href={report.report_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sky-500 hover:text-sky-400 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Full Report
              </a>
            )}
          </div>
        </div>

        {/* Metrics Summary */}
        {Object.keys(report.metrics).length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <h4 className="text-xs font-medium text-slate-300 uppercase tracking-wider mb-3">Key Metrics</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(report.metrics).slice(0, 4).map(([key, value]) => (
                <div key={key} className="text-center p-2 bg-slate-800/50 rounded-lg">
                  <p className="text-lg font-bold text-sky-500">
                    {typeof value === 'number' ? value.toLocaleString() : String(value)}
                  </p>
                  <p className="text-xs text-slate-400 capitalize">{key.replace(/_/g, ' ')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
};

const AnalyticsReports: React.FC = () => {
  const { reports, isLoading: reportsLoading, acknowledge } = useReports();
  const { deliverables: analyticsDeliverables, isLoading: deliverablesLoading } = useDeliverables('analytics');

  const isLoading = reportsLoading || deliverablesLoading;

  // Calculate which checklist items are "complete" based on deliverables
  const completedSetup = analyticsDeliverables
    .filter(d => d.status === 'completed' || d.status === 'approved')
    .map(d => d.title.toLowerCase());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Analytics Setup Checklist */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-sky-500" />
          Analytics Setup
        </h2>
        <GlassCard className="!p-6">
          <div className="space-y-4">
            {setupChecklist.map((item, index) => {
              // Check if this item's deliverable is complete
              const isComplete = completedSetup.some(d =>
                d.includes(item.label.toLowerCase().split(' ')[0]!)
              );

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    isComplete ? 'bg-green-500/10' : 'bg-slate-800/50'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${isComplete ? 'text-green-400' : 'text-white'}`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-400">{item.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </GlassCard>
      </section>

      {/* Analytics Deliverables */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">Analytics Deliverables</h2>
        <div className="grid gap-3">
          {analyticsDeliverables.map(d => (
            <GlassCard key={d.id} className="!p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">{d.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{d.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-sky-500">{d.progress}%</p>
                    {d.due_date && (
                      <p className="text-xs text-slate-500">
                        Due {new Date(d.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={d.status} size="sm" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Performance Reports */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-sky-500" />
          Performance Reports
        </h2>

        {reports.length === 0 ? (
          <GlassCard className="!p-8 text-center">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No reports available yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Bi-weekly reports will appear here once analytics setup is complete
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <ReportCard key={report.id} report={report} onAcknowledge={acknowledge} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AnalyticsReports;
