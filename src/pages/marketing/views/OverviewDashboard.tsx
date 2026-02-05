import React from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  Calendar,
  Users,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MessageSquare,
  Sparkles,
  FileText,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { useMarketingDashboard, useDeliverables } from '../../../hooks/useMarketingData';

const categoryConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  strategy: { icon: Target, color: 'text-rose-400', bgColor: 'bg-rose-500/10', label: 'Strategy & Brand' },
  social: { icon: Calendar, color: 'text-amber-400', bgColor: 'bg-amber-500/10', label: 'Social Media' },
  influencer: { icon: Users, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', label: 'Influencers' },
  analytics: { icon: BarChart3, color: 'text-sky-400', bgColor: 'bg-sky-500/10', label: 'Analytics' },
};

const OverviewDashboard: React.FC = () => {
  const { stats, categoryProgress, isLoading: statsLoading } = useMarketingDashboard();
  const { deliverables, isLoading: deliverablesLoading } = useDeliverables();

  const isLoading = statsLoading || deliverablesLoading;
  const hasNoData = !isLoading && (!stats || stats.totalDeliverables === 0);

  // Calculate overall progress
  const overallProgress = categoryProgress.length > 0
    ? Math.round(categoryProgress.reduce((sum, c) => sum + c.progress, 0) / categoryProgress.length)
    : 0;

  // Get upcoming deadlines (next 5)
  const upcomingDeadlines = deliverables
    .filter(d => d.due_date && d.status !== 'completed')
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  // Get items pending client action
  const pendingApproval = deliverables.filter(d => d.status === 'pending_review');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-slate-400 font-medium">Loading dashboard...</p>
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-sky-500 border-t-transparent" />
        </motion.div>
      </div>
    );
  }

  // Empty state with setup guidance
  if (hasNoData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16"
      >
        <div className="max-w-md text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-sky-500/20 flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-sky-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Welcome to Your Marketing Hub</h3>
          <p className="text-slate-400 mb-6">
            Your marketing dashboard is ready! Once the database is set up with your campaign data, you'll see all your deliverables, content calendar, and analytics here.
          </p>
          <div className="glass rounded-xl p-4">
            <div className="flex items-start gap-3 text-left">
              <Zap className="w-5 h-5 text-sky-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Quick Setup</p>
                <p className="text-sm text-slate-400 mt-1">
                  Run the migration file to create the marketing tables:
                </p>
                <code className="block text-xs bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 mt-2 text-sky-400 font-mono">
                  npx supabase db push
                </code>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Stats Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="glass-elevated rounded-2xl p-6 sm:p-8 overflow-hidden relative">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/[0.05] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />

          <div className="relative flex flex-col lg:flex-row items-center gap-8">
            {/* Progress Ring */}
            <div className="relative">
              <svg className="w-36 h-36 sm:w-44 sm:h-44" viewBox="0 0 180 180">
                <circle
                  cx="90"
                  cy="90"
                  r="80"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="12"
                />
                <motion.circle
                  cx="90"
                  cy="90"
                  r="80"
                  fill="none"
                  stroke="url(#progressGradientDark)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 80}`}
                  strokeDashoffset={2 * Math.PI * 80 * (1 - overallProgress / 100)}
                  transform="rotate(-90 90 90)"
                  initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 80 * (1 - overallProgress / 100) }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
                <defs>
                  <linearGradient id="progressGradientDark" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl sm:text-5xl font-bold text-white">{overallProgress}%</span>
                <span className="text-sm text-slate-400 font-medium">Complete</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-2xl font-bold text-white mb-2">Campaign Progress</h2>
              <p className="text-slate-400 mb-6">
                {stats?.completedDeliverables || 0} of {stats?.totalDeliverables || 0} deliverables completed
              </p>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm text-slate-300">{stats?.completedDeliverables || 0} Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-sky-500" />
                  <span className="text-sm text-slate-300">{stats?.inProgressDeliverables || 0} In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm text-slate-300">{stats?.pendingReviewDeliverables || 0} Pending Review</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Category Progress Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {categoryProgress.map((cat, index) => {
          const config = categoryConfig[cat.category];
          const Icon = config?.icon || Target;

          return (
            <motion.div
              key={cat.category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass rounded-2xl p-4 sm:p-5 hover:border-sky-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <div className={`p-2 sm:p-2.5 rounded-xl ${config?.bgColor || 'bg-white/[0.05]'}`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config?.color || 'text-slate-400'}`} />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-white truncate">{config?.label || cat.category}</span>
              </div>

              <div className="relative h-2 bg-white/[0.06] rounded-full overflow-hidden mb-3">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500 to-violet-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${cat.progress}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">{cat.completed} of {cat.total}</span>
                <span className="text-sm font-bold text-sky-400">{cat.progress}%</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Upcoming Deadlines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-500/10">
                <Clock className="w-5 h-5 text-sky-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Upcoming Deadlines</h3>
            </div>
            <span className="text-xs font-medium text-slate-500 bg-white/[0.05] px-2.5 py-1 rounded-full">
              {upcomingDeadlines.length} items
            </span>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-white font-medium">All caught up!</p>
              <p className="text-sm text-slate-500">No upcoming deadlines</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.map((item) => {
                const dueDate = new Date(item.due_date!);
                const today = new Date();
                const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysUntil < 0;
                const isUrgent = daysUntil <= 3 && daysUntil >= 0;

                return (
                  <div
                    key={item.id}
                    className={`p-3 sm:p-4 rounded-xl border transition-colors ${
                      isOverdue
                        ? 'bg-red-500/10 border-red-500/20'
                        : isUrgent
                        ? 'bg-amber-500/10 border-amber-500/20'
                        : 'bg-white/[0.02] border-white/[0.06] hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate text-sm sm:text-base">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {categoryConfig[item.category]?.label || item.category}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-semibold ${
                          isOverdue ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-slate-300'
                        }`}>
                          {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        <p className={`text-xs ${
                          isOverdue ? 'text-red-400/70' : isUrgent ? 'text-amber-400/70' : 'text-slate-500'
                        }`}>
                          {isOverdue ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d left`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Action Required */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-2xl p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Action Required</h3>
            </div>
            {pendingApproval.length > 0 && (
              <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                {pendingApproval.length} pending
              </span>
            )}
          </div>

          {pendingApproval.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-white font-medium">All caught up!</p>
              <p className="text-sm text-slate-500">No items pending your review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApproval.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="p-3 sm:p-4 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 hover:border-amber-500/30 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate text-sm sm:text-base">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {categoryConfig[item.category]?.label || item.category}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-amber-400/50 group-hover:text-amber-400 group-hover:translate-x-1 transition-all flex-shrink-0 ml-3" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
      >
        <div className="glass rounded-2xl p-4 sm:p-5 text-center group hover:border-sky-500/20 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
            <Calendar className="w-5 h-5 text-sky-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">{stats?.upcomingContent || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Upcoming Posts</p>
        </div>

        <div className="glass rounded-2xl p-4 sm:p-5 text-center group hover:border-emerald-500/20 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">{stats?.activeInfluencers || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Active Influencers</p>
        </div>

        <div className="glass rounded-2xl p-4 sm:p-5 text-center group hover:border-violet-500/20 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-5 h-5 text-violet-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">{stats?.activePartnerships || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Partnerships</p>
        </div>

        <div className="glass rounded-2xl p-4 sm:p-5 text-center group hover:border-fuchsia-500/20 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
            <MessageSquare className="w-5 h-5 text-fuchsia-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">{stats?.unreadMessages || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Open Messages</p>
        </div>
      </motion.div>
    </div>
  );
};

export default OverviewDashboard;
