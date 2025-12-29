import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, BarChart3, Tag, Trash2, Plus, X, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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
  type AdminAnalytics,
  type AudioTagPreset,
} from '../lib/adminSupabase';
import type { User, MeditationHistory, VoiceProfile } from '../../lib/supabase';

type AdminTab = 'analytics' | 'users' | 'content' | 'tags';

// Extend types to include joined user data
interface MeditationWithUser extends MeditationHistory {
  users?: { email: string } | null;
}

interface VoiceProfileWithUser extends VoiceProfile {
  users?: { email: string } | null;
}

const AdminPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [meditations, setMeditations] = useState<MeditationWithUser[]>([]);
  const [voices, setVoices] = useState<VoiceProfileWithUser[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [audioTags, setAudioTags] = useState<AudioTagPreset[]>([]);

  // UI state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'user' | 'meditation' | 'voice' | 'tag';
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

  // Check admin access on mount
  useEffect(() => {
    if (authLoading) return;

    let isMounted = true;

    const verifyAdmin = async () => {
      if (!user) {
        navigate('/', { replace: true });
        return;
      }

      const adminStatus = await checkIsAdmin();

      // Don't update state if component unmounted during async check
      if (!isMounted) return;

      if (!adminStatus) {
        console.warn('[AdminPage] Access denied: User is not an admin');
        navigate('/', { replace: true });
        return;
      }

      setIsAdmin(true);
      setIsLoading(false);
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
            const usersData = await getAllUsers();
            setUsers(usersData);
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
            const analyticsData = await getAdminAnalytics();
            setAnalytics(analyticsData);
            break;
          case 'tags':
            const tagsData = await getAllAudioTags();
            setAudioTags(tagsData);
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
      }
      setDeleteConfirm(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      console.error('[AdminPage] Delete error:', message);
      setError(message);
      setDeleteConfirm(null); // Close modal so user sees error banner
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConfirm, isDeleting]);

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create tag';
      console.error('[AdminPage] Create tag error:', message);
      setError(message);
    }
  };

  // Toggle tag active status
  const handleToggleTagActive = async (tag: AudioTagPreset) => {
    try {
      await updateAudioTag(tag.id, { is_active: !tag.is_active });
      setAudioTags(prev =>
        prev.map(t => t.id === tag.id ? { ...t, is_active: !t.is_active } : t)
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update tag';
      setError(message);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#020617] flex items-center justify-center">
        <ChronosLoader message="Verifying admin access..." />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }

  const tabs = [
    { id: 'analytics' as AdminTab, label: 'Analytics', icon: BarChart3 },
    { id: 'users' as AdminTab, label: 'Users', icon: Users },
    { id: 'content' as AdminTab, label: 'Content', icon: FileText },
    { id: 'tags' as AdminTab, label: 'Audio Tags', icon: Tag },
  ];

  return (
    <AppLayout showBackButton backTo="/">
      <div className="container mx-auto px-4 py-8 pt-20 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-block px-4 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-4">
            Admin Panel
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">System Management</h1>
          <p className="text-slate-400">Manage users, content, and system settings</p>
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
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-white/[0.02] text-slate-400 hover:bg-white/[0.04] hover:text-white border border-white/[0.06]'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'analytics' && (
          <GlassCard className="!p-8 !rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">System Analytics</h2>
            {analytics ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
              </div>
            )}
          </GlassCard>
        )}

        {activeTab === 'users' && (
          <GlassCard className="!p-8 !rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Users ({users.length})</h2>
            {users.length > 0 ? (
              <div className="overflow-x-auto">
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
            ) : (
              <EmptyState message="No users found" />
            )}
          </GlassCard>
        )}

        {activeTab === 'content' && (
          <div className="space-y-6">
            {/* Meditations */}
            <GlassCard className="!p-8 !rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">
                Recent Meditations ({meditations.length})
              </h2>
              {meditations.length > 0 ? (
                <div className="space-y-3">
                  {meditations.map(m => (
                    <div
                      key={m.id}
                      className="flex items-start justify-between p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-white text-sm line-clamp-2">{m.prompt}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-slate-500 text-xs">
                            {new Date(m.created_at).toLocaleString()}
                          </p>
                          {m.users?.email && (
                            <span className="text-cyan-400/70 text-xs">
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
                        className="text-slate-500 hover:text-red-400 p-2 flex-shrink-0 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No meditations found" />
              )}
            </GlassCard>

            {/* Voice Profiles */}
            <GlassCard className="!p-8 !rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">
                Voice Profiles ({voices.length})
              </h2>
              {voices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {voices.map(v => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]"
                    >
                      <div>
                        <p className="text-white font-medium">{v.name}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-400">{v.language}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            v.status === 'READY'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {v.status}
                          </span>
                        </div>
                        {v.users?.email && (
                          <p className="text-cyan-400/70 text-xs mt-1">by {v.users.email}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'voice', id: v.id, name: v.name })}
                        className="text-slate-500 hover:text-red-400 p-2 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
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
          <GlassCard className="!p-8 !rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Audio Tags ({audioTags.length})</h2>
              <button
                onClick={() => setShowAddTag(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Tag
              </button>
            </div>

            {/* Add Tag Form */}
            {showAddTag && (
              <div className="mb-6 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                <h3 className="text-lg font-medium text-white mb-4">New Audio Tag</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Tag Key *</label>
                    <input
                      type="text"
                      value={newTag.tag_key}
                      onChange={e => setNewTag(prev => ({ ...prev, tag_key: e.target.value }))}
                      placeholder="e.g., deep_sigh"
                      className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Label *</label>
                    <input
                      type="text"
                      value={newTag.tag_label}
                      onChange={e => setNewTag(prev => ({ ...prev, tag_label: e.target.value }))}
                      placeholder="e.g., [deep sigh]"
                      className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Category</label>
                    <select
                      value={newTag.category}
                      onChange={e => setNewTag(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-white focus:border-cyan-500/50 focus:outline-none"
                    >
                      <option value="pauses">Pauses</option>
                      <option value="breathing">Breathing</option>
                      <option value="voice">Voice</option>
                      <option value="sounds">Sounds</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={newTag.sort_order}
                      onChange={e => setNewTag(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-white focus:border-cyan-500/50 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-slate-400 text-sm mb-1">Description</label>
                    <input
                      type="text"
                      value={newTag.tag_description}
                      onChange={e => setNewTag(prev => ({ ...prev, tag_description: e.target.value }))}
                      placeholder="A brief description of the tag"
                      className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
                  >
                    Create Tag
                  </button>
                  <button
                    onClick={() => setShowAddTag(false)}
                    className="px-4 py-2 bg-white/[0.06] text-slate-300 rounded-lg hover:bg-white/[0.08] transition-colors"
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
                <div key={category} className="mb-6 last:mb-0">
                  <h3 className="text-lg font-semibold text-slate-300 mb-3 capitalize">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryTags.map(tag => (
                      <div
                        key={tag.id}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                          tag.is_active
                            ? 'bg-white/[0.02] border-white/[0.06]'
                            : 'bg-white/[0.01] border-white/[0.03] opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">{tag.tag_label}</p>
                            {!tag.is_active && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-500/20 text-slate-400">
                                Inactive
                              </span>
                            )}
                          </div>
                          {tag.tag_description && (
                            <p className="text-slate-400 text-sm">{tag.tag_description}</p>
                          )}
                          <p className="text-slate-600 text-xs mt-1">Key: {tag.tag_key}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleTagActive(tag)}
                            className={`p-2 rounded-lg transition-colors ${
                              tag.is_active
                                ? 'text-emerald-400 hover:bg-emerald-500/20'
                                : 'text-slate-500 hover:bg-white/5'
                            }`}
                            title={tag.is_active ? 'Deactivate' : 'Activate'}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'tag', id: tag.id, name: tag.tag_label })}
                            className="text-slate-500 hover:text-red-400 p-2 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
            <GlassCard className="max-w-md w-full !p-6">
              <h3 className="text-xl font-bold text-white mb-4">Confirm Delete</h3>
              <p className="text-slate-300 mb-6">
                Are you sure you want to delete{' '}
                <span className="text-white font-medium">"{deleteConfirm.name}"</span>?
                {deleteConfirm.type === 'user' && (
                  <span className="block mt-2 text-amber-400 text-sm">
                    This will also delete all their meditations and voice profiles.
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-white/[0.06] text-white rounded-lg hover:bg-white/[0.08] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

// Helper component for analytics stat cards
interface StatCardProps {
  label: string;
  value: number;
  subtext?: string;
  color?: 'cyan' | 'emerald' | 'purple' | 'amber';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subtext, color = 'cyan' }) => {
  const colorClasses = {
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
  };

  return (
    <div className="p-6 bg-white/[0.02] rounded-xl border border-white/[0.06]">
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colorClasses[color]}`}>
        {value.toLocaleString()}
      </p>
      {subtext && <p className="text-emerald-400 text-sm mt-1">{subtext}</p>}
    </div>
  );
};

// Helper component for empty states
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-12">
    <p className="text-slate-500">{message}</p>
  </div>
);

export default AdminPage;
