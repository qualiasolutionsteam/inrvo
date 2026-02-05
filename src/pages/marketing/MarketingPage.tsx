import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Target,
  Calendar,
  Users,
  BarChart3,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  X,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { checkIsAdmin } from '../../lib/adminSupabase';
import type { MarketingTab } from '../../types/marketing';

// View imports
import OverviewDashboard from './views/OverviewDashboard';
import StrategyFoundation from './views/StrategyFoundation';
import SocialMediaView from './views/SocialMediaView';
import InfluencersView from './views/InfluencersView';
import AnalyticsReports from './views/AnalyticsReports';
import CommunicationView from './views/CommunicationView';

const MarketingPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<MarketingTab>('overview');
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  // Check admin access on mount
  useEffect(() => {
    if (authLoading) return;

    let isMounted = true;

    const verifyAdmin = async () => {
      if (!user) {
        navigate('/', { replace: true });
        return;
      }

      try {
        const adminStatus = await Promise.race([
          checkIsAdmin(user.id),
          new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error('Admin check timed out')), 10000)
          ),
        ]);

        if (!isMounted) return;

        if (!adminStatus) {
          console.warn('[MarketingPage] Access denied: User is not an admin');
          navigate('/', { replace: true });
          return;
        }

        setIsAdmin(true);
      } catch (err) {
        console.error('[MarketingPage] Admin check failed:', err);
        if (isMounted) {
          setError('Failed to verify admin access. Please refresh the page.');
        }
      } finally {
        if (isMounted) {
          setIsCheckingAdmin(false);
        }
      }
    };

    verifyAdmin();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading, navigate]);

  // Refresh current tab data by forcing remount
  const handleRefreshData = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  }, []);

  if (authLoading || isCheckingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-sky-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Verifying access...</p>
        </motion.div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const tabs: Array<{ id: MarketingTab; label: string; icon: React.ElementType; gradient: string }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, gradient: 'from-sky-500 to-cyan-400' },
    { id: 'strategy', label: 'Strategy', icon: Target, gradient: 'from-rose-500 to-pink-400' },
    { id: 'social', label: 'Social', icon: Calendar, gradient: 'from-amber-500 to-orange-400' },
    { id: 'influencers', label: 'Influencers', icon: Users, gradient: 'from-emerald-500 to-teal-400' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, gradient: 'from-violet-500 to-purple-400' },
    { id: 'communication', label: 'Messages', icon: MessageSquare, gradient: 'from-fuchsia-500 to-pink-400' },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen relative">
      {/* Subtle background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-sky-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-violet-500/[0.04] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Back button and refresh */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to App</span>
            </button>
            <button
              onClick={handleRefreshData}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 glass text-slate-400 rounded-xl hover:text-white hover:border-sky-500/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline text-sm font-medium">Refresh</span>
            </button>
          </div>

          {/* Title area */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-3"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Marketing Hub
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="text-3xl sm:text-4xl font-bold text-white"
              >
                Innrvo Marketing Portal
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-slate-400 mt-1"
              >
                Q1 2026 Campaign Dashboard
              </motion.p>
            </div>
          </div>
        </motion.div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3"
            >
              <div className="p-2 rounded-xl bg-red-500/10">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-red-300 text-sm flex-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar"
        >
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 sm:px-5 py-3 rounded-xl font-medium transition-all whitespace-nowrap text-sm
                  ${isActive
                    ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg`
                    : 'glass text-slate-400 hover:text-white hover:border-sky-500/20'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Active Tab Indicator */}
        {activeTabData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 flex items-center gap-3"
          >
            <div className={`w-1 h-8 rounded-full bg-gradient-to-b ${activeTabData.gradient}`} />
            <h2 className="text-xl font-semibold text-white">{activeTabData.label}</h2>
          </motion.div>
        )}

        {/* Tab Content */}
        <motion.div
          key={`${activeTab}-${refreshKey}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && <OverviewDashboard />}
          {activeTab === 'strategy' && <StrategyFoundation />}
          {activeTab === 'social' && <SocialMediaView />}
          {activeTab === 'influencers' && <InfluencersView />}
          {activeTab === 'analytics' && <AnalyticsReports />}
          {activeTab === 'communication' && <CommunicationView />}
        </motion.div>
      </div>
    </div>
  );
};

export default MarketingPage;
