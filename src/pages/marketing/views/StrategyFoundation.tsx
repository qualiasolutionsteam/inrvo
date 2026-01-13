import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, FileText, MessageSquare, Check, Clock } from 'lucide-react';
import GlassCard from '../../../../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import { useDeliverables, useClientInputs, useDocuments } from '../../../hooks/useMarketingData';
import type { MarketingDeliverable, DeliverableStatus } from '../../../types/marketing';

interface DeliverableCardProps {
  deliverable: MarketingDeliverable;
  onStatusChange: (id: string, status: DeliverableStatus) => void;
  onFeedbackSubmit: (id: string, feedback: string) => void;
}

const DeliverableCard: React.FC<DeliverableCardProps> = ({
  deliverable,
  onStatusChange,
  onFeedbackSubmit,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState(deliverable.client_feedback || '');
  const [isSaving, setIsSaving] = useState(false);

  const isOverdue = deliverable.due_date
    ? new Date(deliverable.due_date) < new Date() && deliverable.status !== 'completed'
    : false;

  const handleFeedbackBlur = async () => {
    if (feedback !== deliverable.client_feedback) {
      setIsSaving(true);
      await onFeedbackSubmit(deliverable.id, feedback);
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      className={`bg-slate-800/50 rounded-xl p-4 sm:p-6 border ${
        isOverdue ? 'border-red-500/50' : 'border-slate-700/50'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-white truncate">{deliverable.title}</h3>
          <p className="text-slate-400 text-sm mt-1 line-clamp-2">{deliverable.description}</p>
        </div>
        <StatusBadge status={deliverable.status} />
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-400">Progress</span>
          <span className="text-sky-500">{deliverable.progress}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-sky-500 to-sky-500"
            initial={{ width: 0 }}
            animate={{ width: `${deliverable.progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Due Date */}
      {deliverable.due_date && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className={isOverdue ? 'text-red-400' : 'text-slate-400'}>
            Due: {new Date(deliverable.due_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          {isOverdue && <span className="text-red-400 text-xs">(Overdue)</span>}
        </div>
      )}

      {/* Expandable Section */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-4 text-sky-500 text-sm flex items-center gap-1 hover:text-sky-400"
      >
        {expanded ? 'Hide Details' : 'Show Details'}
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-4">
              {/* Agency Notes */}
              {deliverable.agency_notes && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Agency Notes</h4>
                  <p className="text-sm text-slate-400 bg-slate-900/50 rounded-lg p-3">
                    {deliverable.agency_notes}
                  </p>
                </div>
              )}

              {/* Client Feedback */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Your Feedback</h4>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  onBlur={handleFeedbackBlur}
                  placeholder="Add your notes or feedback here..."
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
                  rows={3}
                />
                {isSaving && <p className="text-xs text-sky-500 mt-1">Saving...</p>}
              </div>

              {/* Approval Actions */}
              {deliverable.status === 'pending_review' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => onStatusChange(deliverable.id, 'approved')}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => onStatusChange(deliverable.id, 'in_progress')}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                  >
                    Request Changes
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const StrategyFoundation: React.FC = () => {
  const { deliverables, isLoading, updateStatus, updateFeedback } = useDeliverables('strategy');
  const { inputs, isLoading: inputsLoading, updateInput } = useClientInputs();
  const { documents, isLoading: docsLoading, approve: approveDoc } = useDocuments();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Strategy Deliverables */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-sky-500" />
          Strategy Deliverables
        </h2>
        <div className="space-y-4">
          {deliverables.map((d) => (
            <DeliverableCard
              key={d.id}
              deliverable={d}
              onStatusChange={updateStatus}
              onFeedbackSubmit={updateFeedback}
            />
          ))}
        </div>
      </section>

      {/* Client Inputs */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-sky-500" />
          Your Brand Inputs
        </h2>
        <p className="text-slate-400 text-sm mb-4">
          Help us understand your brand better by answering these questions:
        </p>
        {inputsLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-slate-800/50 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {inputs.map((input) => (
              <GlassCard key={input.id} className="!p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white">{input.title}</h3>
                  <StatusBadge status={input.status} size="sm" />
                </div>
                <textarea
                  defaultValue={input.content}
                  onBlur={(e) => updateInput(input.id, e.target.value)}
                  placeholder="Enter your response..."
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none mt-2"
                  rows={3}
                />
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      {/* Strategy Documents */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-sky-500" />
          Strategy Documents
        </h2>
        {docsLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-slate-800/50 rounded-xl" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <GlassCard className="!p-6 text-center">
            <p className="text-slate-400">No documents uploaded yet</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <GlassCard key={doc.id} className="!p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-sky-500" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">{doc.title}</h3>
                      <p className="text-xs text-slate-400">
                        v{doc.version} • {doc.document_type.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={doc.status} size="sm" />
                    {doc.status === 'pending_review' && !doc.client_approved && (
                      <button
                        onClick={() => approveDoc(doc.id)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {doc.client_approved && (
                      <span className="text-green-400 text-xs flex items-center gap-1">
                        <Check className="w-3 h-3" /> Approved
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default StrategyFoundation;
