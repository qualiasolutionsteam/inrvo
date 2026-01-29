import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Instagram, Check, X, MessageSquare, Sparkles, Calendar, FileText } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { useContentCalendar, useDeliverables } from '../../../hooks/useMarketingData';
import type { MarketingContentCalendar, Platform } from '../../../types/marketing';

const platformIcons: Record<Platform, React.ElementType> = {
  instagram: Instagram,
  facebook: () => <span className="text-xs font-bold">FB</span>,
  tiktok: () => <span className="text-xs font-bold">TT</span>,
  twitter: () => <span className="text-xs font-bold">X</span>,
  linkedin: () => <span className="text-xs font-bold">in</span>,
  youtube: () => <span className="text-xs font-bold">YT</span>,
  multiple: () => <span className="text-xs font-bold">+</span>,
};

const platformColors: Record<Platform, { bg: string; text: string; border: string }> = {
  instagram: { bg: 'bg-gradient-to-r from-pink-500 to-purple-500', text: 'text-white', border: 'border-pink-300' },
  facebook: { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-300' },
  tiktok: { bg: 'bg-slate-800', text: 'text-white', border: 'border-slate-400' },
  twitter: { bg: 'bg-slate-700', text: 'text-white', border: 'border-slate-400' },
  linkedin: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-400' },
  youtube: { bg: 'bg-red-500', text: 'text-white', border: 'border-red-300' },
  multiple: { bg: 'bg-violet-500', text: 'text-white', border: 'border-violet-300' },
};

// Card component for bright theme
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow ${className}`}>
    {children}
  </div>
);

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
  const colors = platformColors[content.platform];

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with platform color */}
        <div className={`${colors.bg} p-6`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white capitalize">
                  {content.platform} {content.content_type}
                </h3>
                <p className="text-sm text-white/80">
                  {new Date(content.scheduled_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {content.hook && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hook</label>
              <p className="text-slate-800 mt-1 font-medium">{content.hook}</p>
            </div>
          )}

          {content.caption && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Caption</label>
              <p className="text-slate-600 mt-1 text-sm whitespace-pre-wrap leading-relaxed">{content.caption}</p>
            </div>
          )}

          {content.visual_concept && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visual Concept</label>
              <p className="text-slate-600 mt-1 text-sm">{content.visual_concept}</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <StatusBadge status={content.status} />
            {content.client_approved && (
              <span className="text-emerald-600 text-xs flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full">
                <Check className="w-3 h-3" /> Client Approved
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {content.status === 'pending_approval' && !content.client_approved && (
          <div className="p-6 pt-0 space-y-3">
            {showFeedback ? (
              <div className="space-y-3">
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Describe the changes needed..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-300 resize-none"
                  rows={3}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleRequestChanges}
                    disabled={!feedback.trim()}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white py-2.5 px-4 rounded-xl text-sm font-medium transition-colors"
                  >
                    Submit Request
                  </button>
                  <button
                    onClick={() => setShowFeedback(false)}
                    className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium"
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
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white py-2.5 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => setShowFeedback(true)}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-white py-2.5 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
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
  // Start with February 2026
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 1, 1));
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
      <div className="flex flex-col items-center justify-center py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-200">
            <Calendar className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-slate-500 font-medium">Loading content calendar...</p>
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-500 border-t-transparent" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Social Media Deliverables Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-amber-50">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Social Media Deliverables</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {socialDeliverables.slice(0, 4).map(d => (
              <div
                key={d.id}
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200"
              >
                <span className="text-sm text-slate-700 truncate max-w-[150px]">{d.title}</span>
                <StatusBadge status={d.status} size="sm" />
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Calendar Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full bg-gradient-to-b from-amber-500 to-orange-500" />
          <h2 className="text-xl font-bold text-slate-800">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={e => setPlatformFilter(e.target.value as Platform | 'all')}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-300"
          >
            <option value="all">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="linkedin">LinkedIn</option>
          </select>
          {/* Month Navigation */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
            <button
              onClick={goToPreviousMonth}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Calendar Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-4 overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider py-3">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="min-h-[110px] bg-slate-50/50 rounded-xl" />;
                }

                const dayItems = getItemsForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();
                const hasContent = dayItems.length > 0;

                return (
                  <div
                    key={date.toISOString()}
                    className={`min-h-[110px] p-2 rounded-xl border transition-all ${
                      isToday
                        ? 'bg-violet-50 border-violet-200 ring-2 ring-violet-500/20'
                        : hasContent
                        ? 'bg-white border-slate-200 hover:shadow-md hover:border-slate-300'
                        : 'bg-slate-50/50 border-slate-100'
                    }`}
                  >
                    <div className={`text-sm font-semibold mb-2 ${
                      isToday ? 'text-violet-600' : hasContent ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayItems.slice(0, 2).map(item => {
                        const Icon = platformIcons[item.platform];
                        const colors = platformColors[item.platform];
                        return (
                          <button
                            key={item.id}
                            onClick={() => setSelectedContent(item)}
                            className={`w-full text-left p-1.5 rounded-lg text-xs ${colors.bg} ${colors.text} hover:opacity-90 transition-opacity truncate flex items-center gap-1.5 shadow-sm`}
                          >
                            <Icon className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate font-medium">{item.content_type}</span>
                          </button>
                        );
                      })}
                      {dayItems.length > 2 && (
                        <div className="text-xs text-slate-500 text-center font-medium">
                          +{dayItems.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16"
        >
          <div className="max-w-md text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-amber-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">No Content Scheduled</h3>
            <p className="text-slate-500">
              No content is scheduled for this month yet. Content will appear here once added by the agency.
            </p>
          </div>
        </motion.div>
      )}

      {/* Upcoming Posts List */}
      {filteredItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-violet-50">
                <Sparkles className="w-5 h-5 text-violet-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Upcoming Posts</h3>
              <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                {filteredItems.length} scheduled
              </span>
            </div>
            <div className="space-y-3">
              {filteredItems.slice(0, 5).map(item => {
                const Icon = platformIcons[item.platform];
                const colors = platformColors[item.platform];
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedContent(item)}
                    className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-violet-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-xl ${colors.bg} shadow-sm`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-800 capitalize">{item.content_type}</span>
                          <StatusBadge status={item.status} size="sm" />
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2">{item.hook || item.caption}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          {new Date(item.scheduled_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </motion.div>
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
