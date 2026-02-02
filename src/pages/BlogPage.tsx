import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  ArrowLeft,
  Clock,
  Calendar,
  Tag,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { checkIsAdmin } from '../lib/adminSupabase';
import {
  getBlogPosts,
  getBlogPost,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getBlogCategories,
  type BlogPost,
  type BlogCategory,
  type CreateBlogPostInput,
} from '../../lib/supabase';
import AppLayout from '../layouts/AppLayout';

type ViewMode = 'list' | 'edit' | 'create';

const CATEGORY_COLORS: Record<string, string> = {
  wellness: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  meditation: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  mindfulness: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  sleep: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  stress: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  guides: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  news: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  archived: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const BlogPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Admin check
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  // Data state
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState<CreateBlogPostInput>({
    title: '',
    content: '',
    excerpt: '',
    category: 'wellness',
    tags: [],
    status: 'draft',
    meta_title: '',
    meta_description: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Check admin access
  useEffect(() => {
    if (authLoading) return;

    const verifyAdmin = async () => {
      if (!user) {
        navigate('/', { replace: true });
        return;
      }

      try {
        const adminStatus = await checkIsAdmin(user.id);
        if (!adminStatus) {
          navigate('/', { replace: true });
          return;
        }
        setIsAdmin(true);
      } catch (err) {
        console.error('[BlogPage] Admin check failed:', err);
        setError('Failed to verify admin access');
      } finally {
        setIsCheckingAdmin(false);
      }
    };

    verifyAdmin();
  }, [user, authLoading, navigate]);

  // Load data
  const loadData = useCallback(async () => {
    if (!isAdmin) return;

    setIsLoading(true);
    setError(null);

    try {
      const [postsData, categoriesData] = await Promise.all([
        getBlogPosts(true), // Include all posts for admin
        getBlogCategories(),
      ]);
      setPosts(postsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('[BlogPage] Failed to load data:', err);
      setError('Failed to load blog posts');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, loadData]);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Filter posts
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || post.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || post.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Handlers
  const handleCreate = () => {
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      category: 'wellness',
      tags: [],
      status: 'draft',
      meta_title: '',
      meta_description: '',
    });
    setEditingPost(null);
    setViewMode('create');
  };

  const handleEdit = async (post: BlogPost) => {
    setFormData({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || '',
      category: post.category,
      tags: post.tags || [],
      status: post.status,
      meta_title: post.meta_title || '',
      meta_description: post.meta_description || '',
    });
    setEditingPost(post);
    setViewMode('edit');
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (viewMode === 'edit' && editingPost) {
        await updateBlogPost(editingPost.id, formData);
        setSuccessMessage('Post updated successfully');
      } else {
        await createBlogPost(formData);
        setSuccessMessage('Post created successfully');
      }
      await loadData();
      setViewMode('list');
    } catch (err) {
      console.error('[BlogPage] Save failed:', err);
      setError('Failed to save post');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await deleteBlogPost(id);
      setSuccessMessage('Post deleted successfully');
      await loadData();
    } catch (err) {
      console.error('[BlogPage] Delete failed:', err);
      setError('Failed to delete post');
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || [],
    }));
  };

  // Loading state
  if (authLoading || isCheckingAdmin) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) return null;

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#020617] pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {viewMode !== 'list' && (
                  <button
                    onClick={() => setViewMode('list')}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <FileText className="w-6 h-6 text-sky-500" />
                  <h1 className="text-xl font-semibold text-white">
                    {viewMode === 'list' ? 'Blog Manager' : viewMode === 'create' ? 'New Post' : 'Edit Post'}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {viewMode === 'list' ? (
                  <>
                    <button
                      onClick={loadData}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={handleCreate}
                      className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      New Post
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {viewMode === 'create' ? 'Create' : 'Save'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <AnimatePresence>
          {(error || successMessage) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto px-4 pt-4"
            >
              <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
                error ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                <span className="text-sm">{error || successMessage}</span>
                <button
                  onClick={() => { setError(null); setSuccessMessage(null); }}
                  className="ml-auto p-1 hover:bg-white/5 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {viewMode === 'list' ? (
            <>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                  />
                </div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 focus:outline-none focus:border-sky-500/50"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 focus:outline-none focus:border-sky-500/50"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Posts List */}
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-4">No blog posts found</p>
                  <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-lg hover:bg-sky-500/20 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create your first post
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPosts.map((post) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:bg-white/[0.04] hover:border-white/10 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${CATEGORY_COLORS[post.category]}`}>
                              {post.category}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${STATUS_STYLES[post.status]}`}>
                              {post.status}
                            </span>
                          </div>
                          <h3 className="text-white font-medium truncate mb-1">{post.title}</h3>
                          {post.excerpt && (
                            <p className="text-slate-400 text-sm line-clamp-2">{post.excerpt}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {post.reading_time_minutes} min read
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {post.view_count} views
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(post)}
                            className="p-2 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Editor View */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Editor */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter post title..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Excerpt</label>
                  <textarea
                    value={formData.excerpt}
                    onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                    placeholder="Brief description for previews..."
                    rows={2}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Content</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Write your blog post content here... (Markdown supported)"
                    rows={20}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 resize-none font-mono text-sm"
                  />
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Status */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  <label className="block text-sm font-medium text-slate-400 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as BlogPost['status'] }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-sky-500/50"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                {/* Category */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  <label className="block text-sm font-medium text-slate-400 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as BlogPost['category'] }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-sky-500/50"
                  >
                    {categories.map(cat => (
                      <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  <label className="block text-sm font-medium text-slate-400 mb-2">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      placeholder="Add tag..."
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 text-sm"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-3 py-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-lg hover:bg-sky-500/20 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.tags?.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-500/10 border border-slate-500/20 rounded-full text-xs text-slate-300"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-rose-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* SEO */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-white mb-3">SEO Settings</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Meta Title</label>
                      <input
                        type="text"
                        value={formData.meta_title}
                        onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                        placeholder={formData.title || 'Page title...'}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Meta Description</label>
                      <textarea
                        value={formData.meta_description}
                        onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                        placeholder={formData.excerpt || 'Brief description for search engines...'}
                        rows={3}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default BlogPage;
