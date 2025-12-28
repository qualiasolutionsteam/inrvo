import React from 'react';
import { User } from 'lucide-react';
import { Attribution } from '../types';
import { formatAttributionDisplay, getDisplayName } from '../utils/attribution';

interface AttributionBadgeProps {
  attribution?: Attribution;
  compact?: boolean;
  className?: string;
}

export function AttributionBadge({
  attribution,
  compact = false,
  className = '',
}: AttributionBadgeProps) {
  if (!attribution) return null;

  const displayText = formatAttributionDisplay(attribution);
  const fullTimestamp = new Date(attribution.last_edited_at).toLocaleString();

  if (compact) {
    return (
      <span
        className={`text-xs text-slate-400 flex items-center gap-1 ${className}`}
        title={`Last edited by ${attribution.last_edited_by} at ${fullTimestamp}`}
      >
        <User size={10} className="flex-shrink-0" />
        <span className="truncate max-w-[80px]">
          {getDisplayName(attribution.last_edited_by)}
        </span>
      </span>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 text-xs text-slate-400 ${className}`}
      title={`Last edited by ${attribution.last_edited_by} at ${fullTimestamp}`}
    >
      <User size={12} className="flex-shrink-0" />
      <span>{displayText}</span>
    </div>
  );
}
