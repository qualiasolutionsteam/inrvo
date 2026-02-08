import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Users, FileText, BarChart3, Tag, Trash2, Plus, X, Check, AlertCircle, Activity, ScrollText, LayoutTemplate, Edit2, ChevronDown, ChevronRight, RefreshCw, Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useScript } from '../contexts/ScriptContext';
import AppLayout from '../layouts/AppLayout';
import GlassCard from '../../components/GlassCard';
import { ChronosLoader } from '@/components/ui/chronos-engine';
import {
  getAllUsers,
  deleteUserAdmin,
  getAllMeditations,
  deleteMeditationAdmin,
  getAllVoiceProfiles,
  deleteVoiceProfileAdmin,
  getAdminAnalytics,
  getAllAudioTags,
  createAudioTag,
  updateAudioTag,
  deleteAudioTag,
  checkIsAdmin,
  getAuditLogs,
  getUserActivityStats,
  getUserActivitySummary,
  getTemplateCategories,
  getTemplateSubgroups,
  getAllTemplatesAdmin,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createTemplateCategory,
  updateTemplateCategory,
  createTemplateSubgroup,
  getRecentSignups,
  getRecentMeditations,
  getTemplateStats,
  type AdminAnalytics,
  type AudioTagPreset,
  type AuditLogEntry,
  type UserActivityStats,
  type UserActivitySummary,
  type TemplateCategory,
  type TemplateSubgroup,
  type TemplateWithDetails,
  type RecentSignup,
  type RecentMeditation,
  type TemplateStats,
} from '../lib/adminSupabase';
import { clearAllAdminCache } from '../lib/adminDataCache';
import type { User, MeditationHistory, VoiceProfile } from '../../lib/supabase';

type AdminTab = 'analytics' | 'users' | 'activity' | 'content' | 'templates' | 'tags' | 'audit';

// Extend types to include joined user data
interface MeditationWithUser extends MeditationHistory {
  users?: { email: string } | null;
}

interface VoiceProfileWithUser extends VoiceProfile {
  users?: { email: string } | null;
}

const AdminPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { setScript, setRestoredScript } = useScript();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersHasMore, setUsersHasMore] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [meditations, setMeditations] = useState<MeditationWithUser[]>([]);
  const [voices, setVoices] = useState<VoiceProfileWithUser[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [audioTags, setAudioTags] = useState<AudioTagPreset[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivityStats[]>([]);
  const [activitySummary, setActivitySummary] = useState<UserActivitySummary | null>(null);
  const [templateCategories, setTemplateCategories] = useState<TemplateCategory[]>([]);
  const [templateSubgroups, setTemplateSubgroups] = useState<TemplateSubgroup[]>([]);
  const [templates, setTemplates] = useState<TemplateWithDetails[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Rich dashboard data
  const [recentSignups, setRecentSignups] = useState<RecentSignup[]>([]);
  const [recentMeditations, setRecentMeditations] = useState<RecentMeditation[]>([]);
  const [templateStats, setTemplateStats] = useState<TemplateStats | null>(null);

  // UI state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'user' | 'meditation' | 'voice' | 'tag' | 'template';
    id: string;
    name: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTag, setNewTag] = useState({
    tag_key: '',
    tag_label: '',
    tag_description: '',
    category: 'pauses',
    sort_order: 0,
  });
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithDetails | null>(null);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    title: '',
    description: '',
    prompt: '',
    category_id: '',
    subgroup_id: '',
    display_order: 1,
    is_active: true,
    legacy_id: null as string | null,
  });

  // Check admin access on mount
  useEffect(() => {
    console.log('[AdminPage] Auth state:', { authLoading, hasUser: !!user, userId: user?.id });
    if (authLoading) {
      console.log('[AdminPage] Still loading auth, waiting...');
      return;
    }

    let isMounted = true;

    const verifyAdmin = async () => {
      if (!user) {
        console.log('[AdminPage] No user, redirecting to home');
        navigate('/', { replace: true });
        return;
      }

      console.log('[AdminPage] Checking admin status for user:', user.id);

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('Admin check timed out after 10s')), 10000)
      );

      try {
        const adminStatus = await Promise.race([checkIsAdmin(user.id), timeoutPromise]);
        console.log('[AdminPage] Admin status result:', adminStatus);

        if (!isMounted) return;

        if (!adminStatus) {
          console.warn('[AdminPage] Access denied: User is not an admin');
          navigate('/', { replace: true });
          return;
        }

        console.log('[AdminPage] Admin verified, showing panel');
        setIsAdmin(true);
        setIsLoading(false);
      } catch (err) {
        console.error('[AdminPage] Admin check failed:', err);
        if (isMounted) {
          setError('Failed to verify admin access. Please refresh the page.');
          setIsLoading(false);
        }
      }
    };

    verifyAdmin();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading, navigate]);

  // Load data based on active tab
  useEffect(() => {
    if (!isAdmin || isLoading) return;

    const loadData = async () => {
      setError(null);
      try {
        switch (activeTab) {
          case 'users':
            const { users: usersData, total, hasMore } = await getAllUsers(100, 0);
            setUsers(usersData);
            setUsersTotal(total);
            setUsersHasMore(hasMore);
            break;
          case 'content':
            const [meditationsData, voicesData] = await Promise.all([
              getAllMeditations(50),
              getAllVoiceProfiles(50),
            ]);
            setMeditations(meditationsData);
            setVoices(voicesData);
            break;
          case 'analytics':
            const [dashboardAnalytics, dashboardSignups, dashboardMeditations, dashboardTemplateStats, dashboardSummary] = await Promise.all([
              getAdminAnalytics(user?.id),
              getRecentSignups(5),
              getRecentMeditations(5),
              getTemplateStats(),
              getUserActivitySummary(),
            ]);
            setAnalytics(dashboardAnalytics);
            setRecentSignups(dashboardSignups);
            setRecentMeditations(dashboardMeditations);
            setTemplateStats(dashboardTemplateStats);
            setActivitySummary(dashboardSummary);
            break;
          case 'tags':
            const tagsData = await getAllAudioTags();
            setAudioTags(tagsData);
            break;
          case 'audit':
            const logsData = await getAuditLogs(50, 0);
            setAuditLogs(logsData);
            break;
          case 'activity':
            const [activityData, summaryData] = await Promise.all([
              getUserActivityStats(50, 0, 'last_activity', 'desc'),
              getUserActivitySummary(),
            ]);
            setUserActivity(activityData);
            setActivitySummary(summaryData);
            break;
          case 'templates':
            const [categoriesData, subgroupsData, templatesData] = await Promise.all([
              getTemplateCategories(),
              getTemplateSubgroups(),
              getAllTemplatesAdmin(),
            ]);
            setTemplateCategories(categoriesData);
            setTemplateSubgroups(subgroupsData);
            setTemplates(templatesData);
            break;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load data';
        console.error('[AdminPage] Load error:', message);
        setError(message);
      }
    };

    loadData();
  }, [activeTab, isAdmin, isLoading]);

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!deleteConfirm || isDeleting) return;

    setError(null);
    setIsDeleting(true);

    const itemName = deleteConfirm.name || deleteConfirm.type;

    try {
      switch (deleteConfirm.type) {
        case 'user':
          await deleteUserAdmin(deleteConfirm.id);
          setUsers(prev => prev.filter(u => u.id !== deleteConfirm.id));
          break;
        case 'meditation':
          await deleteMeditationAdmin(deleteConfirm.id);
          setMeditations(prev => prev.filter(m => m.id !== deleteConfirm.id));
          break;
        case 'voice':
          await deleteVoiceProfileAdmin(deleteConfirm.id);
          setVoices(prev => prev.filter(v => v.id !== deleteConfirm.id));
          break;
        case 'tag':
          await deleteAudioTag(deleteConfirm.id);
          setAudioTags(prev => prev.filter(t => t.id !== deleteConfirm.id));
          break;
        case 'template':
          await deleteTemplate(deleteConfirm.id);
          setTemplates(prev => prev.filter(t => t.id !== deleteConfirm.id));
          break;
      }
      toast.success(`${deleteConfirm.type.charAt(0).toUpperCase() + deleteConfirm.type.slice(1)} deleted`, {
        description: `"${itemName}" has been removed`,
      });
      setDeleteConfirm(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      console.error('[AdminPage] Delete error:', message);
      setError(message);
      toast.error(`Failed to delete ${deleteConfirm.type}`, {
        description: message,
      });
      setDeleteConfirm(null); // Close modal so user sees error banner
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConfirm, isDeleting]);

  // Template handlers
  const handleAddTemplate = async () => {
    if (!newTemplate.title || !newTemplate.prompt || !newTemplate.category_id || !newTemplate.subgroup_id) {
      setError('Title, prompt, category, and subgroup are required');
      return;
    }

    try {
      const created = await createTemplate({
        title: newTemplate.title,
        description: newTemplate.description || null,
        prompt: newTemplate.prompt,
        category_id: newTemplate.category_id,
        subgroup_id: newTemplate.subgroup_id,
        display_order: newTemplate.display_order,
        is_active: newTemplate.is_active,
        legacy_id: newTemplate.legacy_id,
      });

      // Find category and subgroup names
      const category = templateCategories.find(c => c.id === created.category_id);
      const subgroup = templateSubgroups.find(s => s.id === created.subgroup_id);

      setTemplates(prev => [...prev, {
        ...created,
        category_name: category?.name,
        subgroup_name: subgroup?.name,
      }]);
      setShowAddTemplate(false);
      setNewTemplate({
        title: '',
        description: '',
        prompt: '',
        category_id: '',
        subgroup_id: '',
        display_order: 1,
        is_active: true,
        legacy_id: null,
      });
      toast.success('Template created', {
        description: `"${created.title}" has been added successfully`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create template';
      setError(message);
      toast.error('Failed to create template', {
        description: message,
      });
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      await updateTemplate(editingTemplate.id, {
        title: editingTemplate.title,
        description: editingTemplate.description,
        prompt: editingTemplate.prompt,
        is_active: editingTemplate.is_active,
      });
      setTemplates(prev =>
        prev.map(t => t.id === editingTemplate.id ? editingTemplate : t)
      );
      toast.success('Template updated', {
        description: `"${editingTemplate.title}" has been saved`,
      });
      setEditingTemplate(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update template';
      setError(message);
      toast.error('Failed to update template', {
        description: message,
      });
    }
  };

  // Use template: set script and navigate to editor
  const handleUseTemplate = (template: TemplateWithDetails) => {
    if (!template.prompt) return;
    setScript(template.prompt);
    setRestoredScript(template.prompt);
    navigate('/');
  };

  const toggleCategoryExpanded = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Load more users (pagination)
  const handleLoadMoreUsers = async () => {
    if (usersLoading || !usersHasMore) return;

    setUsersLoading(true);
    try {
      const { users: moreUsers, hasMore } = await getAllUsers(100, users.length, false);
      setUsers(prev => [...prev, ...moreUsers]);
      setUsersHasMore(hasMore);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load more users';
      setError(message);
    } finally {
      setUsersLoading(false);
    }
  };

  // Refresh current tab data (bypass cache)
  const handleRefreshData = async () => {
    // Clear all admin caches and reload current tab
    clearAllAdminCache();
    // Trigger reload by changing activeTab temporarily (this triggers the useEffect)
    const currentTab = activeTab;
    setActiveTab('analytics'); // Dummy switch
    setTimeout(() => setActiveTab(currentTab), 0);
  };

  // Add tag handler
  const handleAddTag = async () => {
    if (!newTag.tag_key || !newTag.tag_label) {
      setError('Tag key and label are required');
      return;
    }

    try {
      const created = await createAudioTag({
        tag_key: newTag.tag_key,
        tag_label: newTag.tag_label,
        tag_description: newTag.tag_description || null,
        category: newTag.category,
        sort_order: newTag.sort_order,
        is_active: true,
      });
      setAudioTags(prev => [...prev, created]);
      setShowAddTag(false);
      setNewTag({
        tag_key: '',
        tag_label: '',
        tag_description: '',
        category: 'pauses',
        sort_order: 0,
      });
      toast.success('Audio tag created', {
        description: `"${created.tag_label}" has been added`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create tag';
      console.error('[AdminPage] Create tag error:', message);
      setError(message);
      toast.error('Failed to create audio tag', {
        description: message,
      });
    }
  };

  // Toggle tag active status
  const handleToggleTagActive = async (tag: AudioTagPreset) => {
    try {
      await updateAudioTag(tag.id, { is_active: !tag.is_active });
      setAudioTags(prev =>
        prev.map(t => t.id === tag.id ? { ...t, is_active: !t.is_active } : t)
      );
      toast.success(`Tag ${!tag.is_active ? 'enabled' : 'disabled'}`, {
        description: `"${tag.tag_label}" is now ${!tag.is_active ? 'active' : 'inactive'}`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update tag';
      setError(message);
      toast.error('Failed to update tag', {
        description: message,
      });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#020617] flex items-center justify-center">
        <ChronosLoader message="Verifying admin access..." />
      </div>
    );
  }

  // Show error if verification failed
  if (!isAdmin && error) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-600 rounded-lg text-white"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }

  const tabs = [
    { id: 'analytics' as AdminTab, label: 'Analytics', icon: BarChart3 },
    { id: 'users' as AdminTab, label: 'Users', icon: Users },
    { id: 'activity' as AdminTab, label: 'Activity', icon: Activity },
    { id: 'content' as AdminTab, label: 'Content', icon: FileText },
    { id: 'templates' as AdminTab, label: 'Templates', icon: LayoutTemplate },
    { id: 'tags' as AdminTab, label: 'Tags', icon: Tag },
    { id: 'audit' as AdminTab, label: 'Audit', icon: ScrollText },
  ];

  return (
    <AppLayout showBackButton backTo="/">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-16 sm:pt-20 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex items-start justify-between">
          <div>
            <div className="inline-block px-3 sm:px-4 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-3 sm:mb-4">
              Admin Panel
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 sm:mb-2">System Management</h1>
            <p className="text-slate-400 text-sm sm:text-base">Manage users, content, and system settings</p>
          </div>
          <button
            onClick={handleRefreshData}
            className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] text-slate-400 rounded-lg hover:bg-white/[0.04] hover:text-white border border-white/[0.06] transition-colors"
            title="Refresh data (bypass cache)"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Refresh</span>
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-all whitespace-nowrap text-sm sm:text-base
                  ${activeTab === tab.id
                    ? 'bg-sky-500/20 text-sky-500 border border-sky-500/30'
                    : 'bg-white/[0.02] text-slate-400 hover:bg-white/[0.04] hover:text-white border border-white/[0.06]'
                  }
                `}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'analytics' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Section 1: Key Metrics */}
            <GlassCard className="!p-4 sm:!p-6 md:!p-8 !rounded-xl sm:!rounded-2xl">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Key Metrics</h2>
              {analytics ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                  <StatCard
                    label="Total Users"
                    value={analytics.totalUsers}
                    subtext={`+${analytics.newUsers7d} this week`}
                    color="cyan"
                  />
                  <StatCard
                    label="Total Meditations"
                    value={analytics.totalMeditations}
                    subtext={`+${analytics.newMeditations7d} this week`}
                    color="emerald"
                  />
                  <StatCard
                    label="Voice Profiles"
                    value={analytics.totalVoiceProfiles}
                    color="purple"
                  />
                  <StatCard
                    label="Audio Tags"
                    value={analytics.totalAudioTags}
                    color="amber"
                  />
                </div>
              ) : (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
                </div>
              )}
            </GlassCard>

            {/* Section 2: Engagement Overview */}
            {activitySummary && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <StatCard
                  label="Active (7d)"
                  value={activitySummary.total_active_7d}
                  color="emerald"
                />
                <StatCard
                  label="Active (30d)"
                  value={activitySummary.total_active_30d}
                  color="cyan"
                />
                <StatCard
                  label="Avg/User"
                  value={Math.round(activitySummary.avg_meditations_per_user * 10) / 10}
                  color="purple"
                />
              </div>
            )}

            {/* Section 3: Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Recent Signups */}
              <GlassCard className="!p-4 sm:!p-6 !rounded-xl sm:!rounded-2xl">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-sky-500" />
                  Recent Signups
                </h3>
                {recentSignups.length > 0 ? (
                  <div className="space-y-3">
                    {recentSignups.map(signup => (
                      <div
                        key={signup.id}
                        className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-medium truncate">{signup.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-slate-500 text-xs">
                              {new Date(signup.created_at).toLocaleDateString()}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-500">
                              {signup.tier}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm text-center py-4">No recent signups</p>
                )}
              </GlassCard>

              {/* Recent Meditations */}
              <GlassCard className="!p-4 sm:!p-6 !rounded-xl sm:!rounded-2xl">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  Recent Meditations
                </h3>
                {recentMeditations.length > 0 ? (
                  <div className="space-y-3">
                    {recentMeditations.map(med => (
                      <div
                        key={med.id}
                        className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]"
                      >
                        <p className="text-white text-sm line-clamp-2">{med.prompt}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-slate-500 text-xs">
                            {new Date(med.created_at).toLocaleDateString()}
                          </span>
                          {med.user_email && (
                            <span className="text-sky-500/70 text-xs truncate max-w-[150px]">
                              {med.user_email}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm text-center py-4">No recent meditations</p>
                )}
              </GlassCard>
            </div>

            {/* Section 4: Quick Insights */}
            {templateStats && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <StatCard
                  label="Templates"
                  value={templateStats.activeTemplates}
                  subtext={`${templateStats.totalCategories} categories`}
                  color="amber"
                />
                <StatCard
                  label="Top Category"
                  value={templateStats.mostUsedCategoryCount}
                  subtext={templateStats.mostUsedCategory || 'None'}
                  color="purple"
                />
                <StatCard
                  label="Template Usage"
                  value={templateStats.totalTemplates}
                  subtext="total created"
                  color="cyan"
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <GlassCard className="!p-4 sm:!p-6 md:!p-8 !rounded-xl sm:!rounded-2xl">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Users ({users.length}{usersTotal > users.length ? ` of ${usersTotal}` : ''})
              </h2>
              {usersTotal > users.length && (
                <span className="text-slate-500 text-sm">
                  Showing first {users.length}
                </span>
              )}
            </div>
            {users.length > 0 ? (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-white/10">
                      <tr className="text-slate-400 text-sm">
                        <th className="pb-3 pr-4">Email</th>
                        <th className="pb-3 pr-4">Role</th>
                        <th className="pb-3 pr-4">Tier</th>
                        <th className="pb-3 pr-4">Created</th>
                        <th className="pb-3 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="py-3 pr-4 text-white">{u.email}</td>
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-slate-500/20 text-slate-400'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-slate-300">{u.tier}</td>
                          <td className="py-3 pr-4 text-slate-400 text-sm">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => setDeleteConfirm({ type: 'user', id: u.id, name: u.email })}
                              className="text-slate-500 hover:text-red-400 p-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              disabled={u.role === 'ADMIN'}
                              title={u.role === 'ADMIN' ? 'Cannot delete admin users' : 'Delete user'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {users.map(u => (
                    <div
                      key={u.id}
                      className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{u.email}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-slate-500/20 text-slate-400'
                            }`}>
                              {u.role}
                            </span>
                            <span className="text-slate-400 text-xs">{u.tier}</span>
                            <span className="text-slate-500 text-xs">
                              {new Date(u.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'user', id: u.id, name: u.email })}
                          className="text-slate-500 hover:text-red-400 p-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                          disabled={u.role === 'ADMIN'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load More Button */}
                {usersHasMore && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={handleLoadMoreUsers}
                      disabled={usersLoading}
                      className="flex items-center gap-2 px-6 py-2 bg-sky-500/20 text-sky-500 rounded-lg hover:bg-sky-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {usersLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>Load More</>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState message="No users found" />
            )}
          </GlassCard>
        )}

        {activeTab === 'content' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Meditations */}
            <GlassCard className="!p-4 sm:!p-6 md:!p-8 !rounded-xl sm:!rounded-2xl">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
                Recent Meditations ({meditations.length})
              </h2>
              {meditations.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {meditations.map(m => (
                    <div
                      key={m.id}
                      className="flex items-start justify-between p-3 sm:p-4 bg-white/[0.02] rounded-lg sm:rounded-xl border border-white/[0.06]"
                    >
                      <div className="flex-1 min-w-0 pr-2 sm:pr-4">
                        <p className="text-white text-xs sm:text-sm line-clamp-2">{m.prompt}</p>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                          <p className="text-slate-500 text-[10px] sm:text-xs">
                            {new Date(m.created_at).toLocaleString()}
                          </p>
                          {m.users?.email && (
                            <span className="text-sky-500/70 text-[10px] sm:text-xs truncate max-w-[120px] sm:max-w-none">
                              by {m.users.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setDeleteConfirm({
                          type: 'meditation',
                          id: m.id,
                          name: m.prompt.slice(0, 50) + (m.prompt.length > 50 ? '...' : '')
                        })}
                        className="text-slate-500 hover:text-red-400 p-1.5 sm:p-2 flex-shrink-0 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No meditations found" />
              )}
            </GlassCard>

            {/* Voice Profiles */}
            <GlassCard className="!p-4 sm:!p-6 md:!p-8 !rounded-xl sm:!rounded-2xl">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
                Voice Profiles ({voices.length})
              </h2>
              {voices.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {voices.map(v => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-3 sm:p-4 bg-white/[0.02] rounded-lg sm:rounded-xl border border-white/[0.06]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium text-sm sm:text-base truncate">{v.name}</p>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm mt-0.5">
                          <span className="text-slate-400">{v.language}</span>
                          <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs ${
                            v.status === 'READY'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {v.status}
                          </span>
                        </div>
                        {v.users?.email && (
                          <p className="text-sky-500/70 text-[10px] sm:text-xs mt-1 truncate">{v.users.email}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'voice', id: v.id, name: v.name })}
                        className="text-slate-500 hover:text-red-400 p-1.5 sm:p-2 flex-shrink-0 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No voice profiles found" />
              )}
            </GlassCard>
          </div>
        )}

        {activeTab === 'tags' && (
          <GlassCard className="!p-4 sm:!p-6 md:!p-8 !rounded-xl sm:!rounded-2xl">
            <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Audio Tags ({audioTags.length})</h2>
              <button
                onClick={() => setShowAddTag(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-sky-500/20 text-sky-500 rounded-lg hover:bg-sky-500/30 transition-colors text-sm sm:text-base"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden xs:inline">Add Tag</span>
              </button>
            </div>

            {/* Add Tag Form */}
            {showAddTag && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white/[0.02] rounded-lg sm:rounded-xl border border-white/[0.06]">
                <h3 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">New Audio Tag</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div>
                    <label className="block text-slate-400 text-xs sm:text-sm mb-1">Tag Key *</label>
                    <input
                      type="text"
                      value={newTag.tag_key}
                      onChange={e => setNewTag(prev => ({ ...prev, tag_key: e.target.value }))}
                      placeholder="e.g., deep_sigh"
                      className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-white text-sm placeholder-slate-500 focus:border-sky-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs sm:text-sm mb-1">Label *</label>
                    <input
                      type="text"
                      value={newTag.tag_label}
                      onChange={e => setNewTag(prev => ({ ...prev, tag_label: e.target.value }))}
                      placeholder="e.g., [deep sigh]"
                      className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-white text-sm placeholder-slate-500 focus:border-sky-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs sm:text-sm mb-1">Category</label>
                    <select
                      value={newTag.category}
                      onChange={e => setNewTag(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-white text-sm focus:border-sky-500/50 focus:outline-none"
                    >
                      <option value="pauses">Pauses</option>
                      <option value="breathing">Breathing</option>
                      <option value="voice">Voice</option>
                      <option value="sounds">Sounds</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs sm:text-sm mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={newTag.sort_order}
                      onChange={e => setNewTag(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-white text-sm focus:border-sky-500/50 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 text-xs sm:text-sm mb-1">Description</label>
                    <input
                      type="text"
                      value={newTag.tag_description}
                      onChange={e => setNewTag(prev => ({ ...prev, tag_description: e.target.value }))}
                      placeholder="A brief description of the tag"
                      className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-white text-sm placeholder-slate-500 focus:border-sky-500/50 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddTag}
                    className="px-3 sm:px-4 py-2 bg-sky-500/20 text-sky-500 rounded-lg hover:bg-sky-500/30 transition-colors text-sm"
                  >
                    Create Tag
                  </button>
                  <button
                    onClick={() => setShowAddTag(false)}
                    className="px-3 sm:px-4 py-2 bg-white/[0.06] text-slate-300 rounded-lg hover:bg-white/[0.08] transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Tags by category */}
            {['pauses', 'breathing', 'voice', 'sounds'].map(category => {
              const categoryTags = audioTags.filter(t => t.category === category);
              if (categoryTags.length === 0) return null;

              return (
                <div key={category} className="mb-4 sm:mb-6 last:mb-0">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-300 mb-2 sm:mb-3 capitalize">{category}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {categoryTags.map(tag => (
                      <div
                        key={tag.id}
                        className={`flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-colors ${
                          tag.is_active
                            ? 'bg-white/[0.02] border-white/[0.06]'
                            : 'bg-white/[0.01] border-white/[0.03] opacity-60'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <p className="text-white font-medium text-sm sm:text-base">{tag.tag_label}</p>
                            {!tag.is_active && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] bg-slate-500/20 text-slate-400">
                                Inactive
                              </span>
                            )}
                          </div>
                          {tag.tag_description && (
                            <p className="text-slate-400 text-xs sm:text-sm line-clamp-1">{tag.tag_description}</p>
                          )}
                          <p className="text-slate-600 text-[10px] sm:text-xs mt-0.5 sm:mt-1">Key: {tag.tag_key}</p>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleToggleTagActive(tag)}
                            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                              tag.is_active
                                ? 'text-emerald-400 hover:bg-emerald-500/20'
                                : 'text-slate-500 hover:bg-white/5'
                            }`}
                            title={tag.is_active ? 'Deactivate' : 'Activate'}
                          >
                            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'tag', id: tag.id, name: tag.tag_label })}
                            className="text-slate-500 hover:text-red-400 p-1.5 sm:p-2 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {audioTags.length === 0 && <EmptyState message="No audio tags found" />}
          </GlassCard>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Summary Cards */}
            {activitySummary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                  label="Active (7d)"
                  value={activitySummary.total_active_7d}
                  color="emerald"
                />
                <StatCard
                  label="Active (30d)"
                  value={activitySummary.total_active_30d}
                  color="cyan"
                />
                <StatCard
                  label="Meditations (7d)"
                  value={activitySummary.total_meditations_7d}
                  color="purple"
                />
                <StatCard
                  label="Avg/User"
                  value={Math.round(activitySummary.avg_meditations_per_user * 10) / 10}
                  color="amber"
                />
              </div>
            )}

            {/* User Activity Table */}
            <GlassCard className="!p-4 sm:!p-6 md:!p-8 !rounded-xl sm:!rounded-2xl">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
                User Activity ({userActivity.length})
              </h2>
              {userActivity.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-white/10">
                      <tr className="text-slate-400 text-xs sm:text-sm">
                        <th className="pb-3 pr-4">Email</th>
                        <th className="pb-3 pr-4 text-center">Meditations</th>
                        <th className="pb-3 pr-4 text-center">Voices</th>
                        <th className="pb-3 pr-4">Last Activity</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userActivity.map(u => (
                        <tr key={u.user_id} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="py-3 pr-4 text-white text-sm truncate max-w-[200px]">{u.email}</td>
                          <td className="py-3 pr-4 text-center text-slate-300">{u.meditation_count}</td>
                          <td className="py-3 pr-4 text-center text-slate-300">{u.voice_count}</td>
                          <td className="py-3 pr-4 text-slate-400 text-xs sm:text-sm">
                            {u.last_activity ? new Date(u.last_activity).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="py-3">
                            {u.is_active_7d ? (
                              <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">
                                Active
                              </span>
                            ) : u.is_active_30d ? (
                              <span className="px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-400">
                                30d
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs bg-slate-500/20 text-slate-400">
                                Inactive
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState message="No user activity data" />
              )}
            </GlassCard>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <GlassCard className="!p-4 sm:!p-6 md:!p-8 !rounded-xl sm:!rounded-2xl">
            <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Templates ({templates.length})
              </h2>
              <button
                onClick={() => setShowAddTemplate(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-sky-500/20 text-sky-500 rounded-lg hover:bg-sky-500/30 transition-colors text-sm sm:text-base"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden xs:inline">Add Template</span>
              </button>
            </div>

            {/* Add Template Form */}
            {showAddTemplate && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white/[0.02] rounded-lg sm:rounded-xl border border-white/[0.06]">
                <h3 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">New Template</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div>
                    <label className="block text-slate-400 text-xs sm:text-sm mb-1">Title *</label>
                    <input
                      type="text"
                      value={newTemplate.title}
                      onChange={e => setNewTemplate(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Template title"
                      className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-white text-sm placeholder-slate-500 focus:border-sky-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs sm:text-sm mb-1">Description</label>
                    <input
                      type="text"
                      value={newTemplate.description}
                      onChange={e => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description"
                      className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-white text-sm placeholder-slate-500 focus:border-sky-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs sm:text-sm mb-1">Category *</label>
                    <select
                      value={newTemplate.category_id}
                      onChange={e => {
                        setNewTemplate(prev => ({ ...prev, category_id: e.target.value, subgroup_id: '' }));
                      }}
                      className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-white text-sm focus:border-sky-500/50 focus:outline-none"
                    >
                      <option value="">Select category</option>
                      {templateCategories.filter(c => c.is_active).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs sm:text-sm mb-1">Subgroup *</label>
                    <select
                      value={newTemplate.subgroup_id}
                      onChange={e => setNewTemplate(prev => ({ ...prev, subgroup_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-white text-sm focus:border-sky-500/50 focus:outline-none"
                      disabled={!newTemplate.category_id}
                    >
                      <option value="">Select subgroup</option>
                      {templateSubgroups
                        .filter(s => s.category_id === newTemplate.category_id && s.is_active)
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 text-xs sm:text-sm mb-1">Prompt *</label>
                    <textarea
                      value={newTemplate.prompt}
                      onChange={e => setNewTemplate(prev => ({ ...prev, prompt: e.target.value }))}
                      placeholder="The prompt text that generates the meditation"
                      rows={4}
                      className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-white text-sm placeholder-slate-500 focus:border-sky-500/50 focus:outline-none resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddTemplate}
                    className="px-3 sm:px-4 py-2 bg-sky-500/20 text-sky-500 rounded-lg hover:bg-sky-500/30 transition-colors text-sm"
                  >
                    Create Template
                  </button>
                  <button
                    onClick={() => setShowAddTemplate(false)}
                    className="px-3 sm:px-4 py-2 bg-white/[0.06] text-slate-300 rounded-lg hover:bg-white/[0.08] transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Templates by Category (Collapsible) */}
            {templateCategories.filter(c => c.is_active).map(category => {
              const categoryTemplates = templates.filter(t => t.category_id === category.id);
              const isExpanded = expandedCategories.has(category.id);

              return (
                <div key={category.id} className="mb-3 sm:mb-4 last:mb-0">
                  <button
                    onClick={() => toggleCategoryExpanded(category.id)}
                    className="w-full flex items-center justify-between p-3 sm:p-4 bg-white/[0.02] rounded-lg sm:rounded-xl border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                      )}
                      <span className="text-white font-medium text-sm sm:text-base">{category.name}</span>
                      <span className="text-slate-500 text-xs sm:text-sm">({categoryTemplates.length})</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      category.color === 'cyan' ? 'bg-sky-500/20 text-sky-500' :
                      category.color === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                      category.color === 'violet' ? 'bg-violet-500/20 text-violet-400' :
                      category.color === 'pink' ? 'bg-pink-500/20 text-pink-400' :
                      category.color === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {category.icon || 'template'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3 pl-4 sm:pl-6">
                      {categoryTemplates.map(template => (
                        <div
                          key={template.id}
                          className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-colors ${
                            template.is_active
                              ? 'bg-white/[0.02] border-white/[0.06]'
                              : 'bg-white/[0.01] border-white/[0.03] opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-white font-medium text-sm sm:text-base">{template.title}</p>
                                <span className="text-slate-500 text-xs">{template.subgroup_name}</span>
                                {!template.is_active && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-500/20 text-slate-400">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              {template.description && (
                                <p className="text-slate-400 text-xs sm:text-sm mt-1 line-clamp-1">
                                  {template.description}
                                </p>
                              )}
                              <p className="text-slate-600 text-[10px] sm:text-xs mt-1">
                                Uses: {template.usage_count}
                              </p>
                            </div>
                            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                              {template.prompt && (
                                <button
                                  onClick={() => handleUseTemplate(template)}
                                  className="text-slate-500 hover:text-emerald-400 p-1.5 sm:p-2 transition-colors"
                                  title="Use this template in editor"
                                >
                                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => setEditingTemplate(template)}
                                className="text-slate-500 hover:text-sky-500 p-1.5 sm:p-2 transition-colors"
                                title="Edit template"
                              >
                                <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({
                                  type: 'template',
                                  id: template.id,
                                  name: template.title
                                })}
                                className="text-slate-500 hover:text-red-400 p-1.5 sm:p-2 transition-colors"
                                title="Delete template"
                              >
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {categoryTemplates.length === 0 && (
                        <p className="text-slate-500 text-sm py-4 text-center">No templates in this category</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {templates.length === 0 && <EmptyState message="No templates found" />}
          </GlassCard>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit' && (
          <GlassCard className="!p-4 sm:!p-6 md:!p-8 !rounded-xl sm:!rounded-2xl">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
              Audit Log ({auditLogs.length})
            </h2>
            {auditLogs.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {auditLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-3 sm:p-4 bg-white/[0.02] rounded-lg sm:rounded-xl border border-white/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            log.operation === 'DELETE' || log.operation === 'ADMIN_DELETE'
                              ? 'bg-red-500/20 text-red-400'
                              : log.operation === 'INSERT'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : log.operation === 'UPDATE'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}>
                            {log.operation}
                          </span>
                          <span className="text-white text-sm">{log.table_name}</span>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1">
                          by {log.admin_email || 'Unknown'}
                        </p>
                        {log.record_id && (
                          <p className="text-slate-600 text-[10px] sm:text-xs mt-0.5">
                            Record: {log.record_id.slice(0, 8)}...
                          </p>
                        )}
                      </div>
                      <span className="text-slate-500 text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No audit logs found" />
            )}
          </GlassCard>
        )}

        {/* Edit Template Modal */}
        {editingTemplate && (
          <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-3 sm:p-4">
            <GlassCard className="max-w-2xl w-full !p-4 sm:!p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Edit Template</h3>
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div>
                  <label className="block text-slate-400 text-xs sm:text-sm mb-1">Title</label>
                  <input
                    type="text"
                    value={editingTemplate.title}
                    onChange={e => setEditingTemplate(prev => prev ? { ...prev, title: e.target.value } : null)}
                    className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-white text-sm focus:border-sky-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs sm:text-sm mb-1">Description</label>
                  <input
                    type="text"
                    value={editingTemplate.description || ''}
                    onChange={e => setEditingTemplate(prev => prev ? { ...prev, description: e.target.value } : null)}
                    className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-white text-sm focus:border-sky-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs sm:text-sm mb-1">Prompt</label>
                  <textarea
                    value={editingTemplate.prompt}
                    onChange={e => setEditingTemplate(prev => prev ? { ...prev, prompt: e.target.value } : null)}
                    rows={6}
                    className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-white text-sm focus:border-sky-500/50 focus:outline-none resize-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-active"
                    checked={editingTemplate.is_active}
                    onChange={e => setEditingTemplate(prev => prev ? { ...prev, is_active: e.target.checked } : null)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-sky-500 focus:ring-sky-500/30"
                  />
                  <label htmlFor="edit-active" className="text-slate-300 text-sm">Active</label>
                </div>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="flex-1 px-3 sm:px-4 py-2 bg-white/[0.06] text-white rounded-lg hover:bg-white/[0.08] transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTemplate}
                  className="flex-1 px-3 sm:px-4 py-2 bg-sky-500/20 text-sky-500 rounded-lg hover:bg-sky-500/30 transition-colors text-sm sm:text-base"
                >
                  Save Changes
                </button>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-3 sm:p-4">
            <GlassCard className="max-w-md w-full !p-4 sm:!p-6">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Confirm Delete</h3>
              <p className="text-slate-300 text-sm sm:text-base mb-4 sm:mb-6">
                Are you sure you want to delete{' '}
                <span className="text-white font-medium break-all">"{deleteConfirm.name}"</span>?
                {deleteConfirm.type === 'user' && (
                  <span className="block mt-2 text-amber-400 text-xs sm:text-sm">
                    This will also delete all their meditations and voice profiles.
                  </span>
                )}
              </p>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-3 sm:px-4 py-2 bg-white/[0.06] text-white rounded-lg hover:bg-white/[0.08] transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-3 sm:px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

// Helper component for analytics stat cards - memoized to prevent unnecessary re-renders
interface StatCardProps {
  label: string;
  value: number;
  subtext?: string;
  color?: 'cyan' | 'emerald' | 'purple' | 'amber';
}

const StatCard = memo<StatCardProps>(({ label, value, subtext, color = 'cyan' }) => {
  const colorClasses = {
    cyan: 'text-sky-500',
    emerald: 'text-emerald-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-white/[0.02] rounded-lg sm:rounded-xl border border-white/[0.06]">
      <p className="text-slate-400 text-xs sm:text-sm mb-0.5 sm:mb-1">{label}</p>
      <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${colorClasses[color]}`}>
        {value.toLocaleString()}
      </p>
      {subtext && <p className="text-emerald-400 text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-1">{subtext}</p>}
    </div>
  );
});

StatCard.displayName = 'StatCard';

// Helper component for empty states - memoized
const EmptyState = memo<{ message: string }>(({ message }) => (
  <div className="text-center py-12">
    <p className="text-slate-500">{message}</p>
  </div>
));

EmptyState.displayName = 'EmptyState';

export default AdminPage;
