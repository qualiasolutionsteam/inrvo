import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'outline';
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  // Deliverable statuses
  not_started: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Not Started' },
  in_progress: { bg: 'bg-sky-500/20', text: 'text-sky-500', label: 'In Progress' },
  pending_review: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Pending Review' },
  approved: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Approved' },
  completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' },

  // Content calendar statuses
  planned: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Planned' },
  created: { bg: 'bg-sky-500/20', text: 'text-sky-500', label: 'Created' },
  pending_approval: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Pending Approval' },
  published: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Published' },

  // Influencer statuses
  researching: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Researching' },
  contacted: { bg: 'bg-sky-500/20', text: 'text-sky-500', label: 'Contacted' },
  negotiating: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Negotiating' },
  agreed: { bg: 'bg-sky-500/20', text: 'text-sky-500', label: 'Agreed' },
  content_live: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Content Live' },
  declined: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Declined' },

  // Partnership statuses
  identified: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Identified' },
  outreach: { bg: 'bg-sky-500/20', text: 'text-sky-500', label: 'Outreach' },
  discussing: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Discussing' },
  active: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Active' },

  // Client input statuses
  submitted: { bg: 'bg-sky-500/20', text: 'text-sky-500', label: 'Submitted' },
  reviewed: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Reviewed' },
  incorporated: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Incorporated' },

  // Document statuses
  draft: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Draft' },
  final: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Final' },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'default',
  size = 'sm',
}) => {
  const config = statusConfig[status] || {
    bg: 'bg-slate-500/20',
    text: 'text-slate-400',
    label: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  if (variant === 'outline') {
    return (
      <span className={`inline-flex items-center rounded-full border ${config.text} border-current/30 ${sizeClasses} font-medium`}>
        {config.label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-full ${config.bg} ${config.text} ${sizeClasses} font-medium`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
