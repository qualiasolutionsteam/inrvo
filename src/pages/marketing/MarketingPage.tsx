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
    // Small delay for visual feedback
    setTimeout(() => setIsRefreshing(false), 500);
  }, []);

  if (authLoading || isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-500 border-t-transparent" />
          <p className="text-sm text-slate-500">Verifying access...</p>
        </motion.div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const tabs: Array<{ id: MarketingTab; label: string; icon: React.ElementType; color: string }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: 'from-violet-500 to-indigo-500' },
    { id: 'strategy', label: 'Strategy', icon: Target, color: 'from-rose-500 to-pink-500' },
    { id: 'social', label: 'Social', icon: Calendar, color: 'from-amber-500 to-orange-500' },
    { id: 'influencers', label: 'Influencers', icon: Users, color: 'from-emerald-500 to-teal-500' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'from-blue-500 to-cyan-500' },
    { id: 'communication', label: 'Messages', icon: MessageSquare, color: 'from-fuchsia-500 to-purple-500' },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-violet-200/40 to-indigo-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-cyan-200/40 to-teal-200/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-violet-100/20 to-transparent rounded-full" />
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
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to App</span>
            </button>
            <button
              onClick={handleRefreshData}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm text-slate-600 rounded-xl hover:bg-white hover:shadow-md border border-slate-200/60 transition-all disabled:opacity-50"
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
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-100 to-indigo-100 text-violet-700 text-xs font-semibold uppercase tracking-wider mb-3"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Marketing Hub
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 via-violet-900 to-slate-900 bg-clip-text text-transparent"
              >
                INrVO Marketing Portal
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-slate-500 mt-1"
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
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3"
            >
              <div className="p-2 rounded-xl bg-red-100">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-red-700 text-sm flex-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors"
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
          className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide"
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
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg shadow-${tab.color.split('-')[1]}-200/50`
                    : 'bg-white/80 backdrop-blur-sm text-slate-600 hover:bg-white hover:shadow-md border border-slate-200/60'
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
            <div className={`w-1 h-8 rounded-full bg-gradient-to-b ${activeTabData.color}`} />
            <h2 className="text-xl font-semibold text-slate-800">{activeTabData.label}</h2>
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
