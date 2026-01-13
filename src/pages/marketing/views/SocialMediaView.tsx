import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Instagram, Facebook, Check, X, MessageSquare } from 'lucide-react';
import GlassCard from '../../../../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import { useContentCalendar, useDeliverables } from '../../../hooks/useMarketingData';
import type { MarketingContentCalendar, Platform } from '../../../types/marketing';

const platformIcons: Record<Platform, React.ElementType> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: () => <span className="text-xs font-bold">TT</span>,
  twitter: () => <span className="text-xs font-bold">X</span>,
  linkedin: () => <span className="text-xs font-bold">in</span>,
  youtube: () => <span className="text-xs font-bold">YT</span>,
  multiple: () => <span className="text-xs font-bold">+</span>,
};

const platformColors: Record<Platform, string> = {
  instagram: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  facebook: 'bg-sky-500/20 text-sky-500 border-sky-500/30',
  tiktok: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  twitter: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  linkedin: 'bg-blue-600/20 text-sky-500 border-blue-600/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
  multiple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

interface ContentDetailModalProps {
  content: MarketingContentCalendar;
  onClose: () => void;
  onApprove: (id: string) => void;
  onRequestChanges: (id: string, feedback: string) => void;
}

const ContentDetailModal: React.FC<ContentDetailModalProps> = ({
  content,
  onClose,
  onApprove,
  onRequestChanges,
}) => {
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const Icon = platformIcons[content.platform] || Instagram;

  const handleRequestChanges = () => {
    if (feedback.trim()) {
      onRequestChanges(content.id, feedback);
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700 p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${platformColors[content.platform]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white capitalize">
                {content.platform} {content.content_type}
              </h3>
              <p className="text-sm text-slate-400">
                {new Date(content.scheduled_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {content.hook && (
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Hook</label>
              <p className="text-white mt-1">{content.hook}</p>
            </div>
          )}

          {content.caption && (
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Caption</label>
              <p className="text-slate-300 mt-1 text-sm whitespace-pre-wrap">{content.caption}</p>
            </div>
          )}

          {content.visual_concept && (
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Visual Concept</label>
              <p className="text-slate-300 mt-1 text-sm">{content.visual_concept}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <StatusBadge status={content.status} />
            {content.client_approved && (
              <span className="text-green-400 text-xs flex items-center gap-1">
                <Check className="w-3 h-3" /> Client Approved
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {content.status === 'pending_approval' && !content.client_approved && (
          <div className="mt-6 space-y-3">
            {showFeedback ? (
              <div className="space-y-3">
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Describe the changes needed..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
                  rows={3}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleRequestChanges}
                    disabled={!feedback.trim()}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                  >
                    Submit Request
                  </button>
                  <button
                    onClick={() => setShowFeedback(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    onApprove(content.id);
                    onClose();
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => setShowFeedback(true)}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Request Changes
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

const SocialMediaView: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedContent, setSelectedContent] = useState<MarketingContentCalendar | null>(null);
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');

  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const { items, isLoading, approve, requestChanges } = useContentCalendar(
    startOfMonth.toISOString().split('T')[0],
    endOfMonth.toISOString().split('T')[0]
  );
  const { deliverables: socialDeliverables } = useDeliverables('social');

  const filteredItems = useMemo(() => {
    if (platformFilter === 'all') return items;
    return items.filter(item => item.platform === platformFilter);
  }, [items, platformFilter]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days: (Date | null)[] = [];
    const firstDay = startOfMonth.getDay();

    // Add empty days for alignment
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let d = 1; d <= endOfMonth.getDate(); d++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));
    }

    return days;
  }, [currentMonth, startOfMonth, endOfMonth]);

  const getItemsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredItems.filter(item => item.scheduled_date === dateStr);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Social Media Deliverables Summary */}
      <GlassCard className="!p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Social Media Deliverables</h3>
        <div className="flex flex-wrap gap-2">
          {socialDeliverables.slice(0, 4).map(d => (
            <div
              key={d.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] rounded-lg border border-white/[0.06]"
            >
              <span className="text-sm text-white truncate max-w-[150px]">{d.title}</span>
              <StatusBadge status={d.status} size="sm" />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex items-center gap-2">
          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={e => setPlatformFilter(e.target.value as Platform | 'all')}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          >
            <option value="all">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="tiktok">TikTok</option>
          </select>
          {/* Month Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousMonth}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <GlassCard className="!p-4 overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-slate-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="min-h-[100px] bg-slate-800/30 rounded-lg" />;
              }

              const dayItems = getItemsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={date.toISOString()}
                  className={`min-h-[100px] p-2 rounded-lg border ${
                    isToday
                      ? 'bg-sky-500/10 border-sky-500/30'
                      : 'bg-slate-800/30 border-slate-700/30'
                  }`}
                >
                  <div className={`text-sm font-medium mb-2 ${isToday ? 'text-sky-500' : 'text-slate-400'}`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map(item => {
                      const Icon = platformIcons[item.platform];
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedContent(item)}
                          className={`w-full text-left p-1.5 rounded text-xs border ${platformColors[item.platform]} hover:opacity-80 transition-opacity truncate flex items-center gap-1`}
                        >
                          <Icon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{item.content_type}</span>
                        </button>
                      );
                    })}
                    {dayItems.length > 3 && (
                      <div className="text-xs text-slate-500 text-center">
                        +{dayItems.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* Content items without dates */}
      {filteredItems.length === 0 && (
        <GlassCard className="!p-8 text-center">
          <p className="text-slate-400">No content scheduled for this month</p>
          <p className="text-sm text-slate-500 mt-1">Content will appear here once added by the agency</p>
        </GlassCard>
      )}

      {/* Content Detail Modal */}
      <AnimatePresence>
        {selectedContent && (
          <ContentDetailModal
            content={selectedContent}
            onClose={() => setSelectedContent(null)}
            onApprove={approve}
            onRequestChanges={requestChanges}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SocialMediaView;
