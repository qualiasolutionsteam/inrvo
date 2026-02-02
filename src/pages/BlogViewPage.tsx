import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Clock,
  Calendar,
  Tag,
  ArrowLeft,
  Search,
  ChevronRight,
  Sparkles,
  Heart,
  Moon,
  Brain,
  Zap,
  BookOpen,
  Newspaper,
} from 'lucide-react';
import AppLayout from '../layouts/AppLayout';
import {
  getBlogPosts,
  getBlogPost,
  getBlogCategories,
  type BlogPost,
  type BlogCategory,
} from '../../lib/supabase';

// Category icons mapping
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  wellness: <Heart className="w-5 h-5" />,
  meditation: <Sparkles className="w-5 h-5" />,
  mindfulness: <Brain className="w-5 h-5" />,
  sleep: <Moon className="w-5 h-5" />,
  stress: <Zap className="w-5 h-5" />,
  guides: <BookOpen className="w-5 h-5" />,
  news: <Newspaper className="w-5 h-5" />,
};

// Category gradient colors
const CATEGORY_STYLES: Record<string, { gradient: string; border: string; text: string; bg: string }> = {
  wellness: {
    gradient: 'from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-500/30 hover:border-emerald-400/50',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  meditation: {
    gradient: 'from-violet-500/20 to-purple-500/20',
    border: 'border-violet-500/30 hover:border-violet-400/50',
    text: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  mindfulness: {
    gradient: 'from-cyan-500/20 to-sky-500/20',
    border: 'border-cyan-500/30 hover:border-cyan-400/50',
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  sleep: {
    gradient: 'from-indigo-500/20 to-blue-500/20',
    border: 'border-indigo-500/30 hover:border-indigo-400/50',
    text: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
  },
  stress: {
    gradient: 'from-amber-500/20 to-orange-500/20',
    border: 'border-amber-500/30 hover:border-amber-400/50',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  guides: {
    gradient: 'from-pink-500/20 to-rose-500/20',
    border: 'border-pink-500/30 hover:border-pink-400/50',
    text: 'text-pink-400',
    bg: 'bg-pink-500/10',
  },
  news: {
    gradient: 'from-sky-500/20 to-blue-500/20',
    border: 'border-sky-500/30 hover:border-sky-400/50',
    text: 'text-sky-400',
    bg: 'bg-sky-500/10',
  },
};

const BlogViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();

  // Data state
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [postsData, categoriesData] = await Promise.all([
          getBlogPosts(false), // Only published posts
          getBlogCategories(),
        ]);
        setPosts(postsData);
        setCategories(categoriesData);

        // If slug provided, load that post
        if (slug) {
          const post = await getBlogPost(slug);
          setSelectedPost(post);
        }
      } catch (err) {
        console.error('[BlogViewPage] Failed to load data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [slug]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesSearch = !searchQuery ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || post.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [posts, searchQuery, selectedCategory]);

  // Handle post click
  const handlePostClick = (post: BlogPost) => {
    setSelectedPost(post);
    navigate(`/blog/${post.slug}`);
  };

  // Handle back to list
  const handleBackToList = () => {
    setSelectedPost(null);
    navigate('/blog');
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Render post content (simple markdown-like rendering)
  const renderContent = (content: string) => {
    return content.split('\n').map((paragraph, index) => {
      if (!paragraph.trim()) return <br key={index} />;

      // Headers
      if (paragraph.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-semibold text-white mt-6 mb-3">{paragraph.slice(4)}</h3>;
      }
      if (paragraph.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold text-white mt-8 mb-4">{paragraph.slice(3)}</h2>;
      }
      if (paragraph.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold text-white mt-8 mb-4">{paragraph.slice(2)}</h1>;
      }

      // List items
      if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
        return (
          <li key={index} className="text-slate-300 ml-4 mb-2 list-disc">
            {paragraph.slice(2)}
          </li>
        );
      }

      // Regular paragraph
      return <p key={index} className="text-slate-300 leading-relaxed mb-4">{paragraph}</p>;
    });
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#020617] pb-20">
        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="sticky top-0 z-40 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
            <div className="max-w-5xl mx-auto px-4 py-4">
              <div className="flex items-center gap-3">
                {selectedPost && (
                  <button
                    onClick={handleBackToList}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-sky-500/20">
                    <FileText className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-white">
                      {selectedPost ? selectedPost.title : 'Wellness Blog'}
                    </h1>
                    {!selectedPost && (
                      <p className="text-sm text-slate-400">Discover mindfulness, meditation & wellness tips</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 py-6">
            <AnimatePresence mode="wait">
              {selectedPost ? (
                /* Single Post View */
                <motion.article
                  key="post"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-3xl mx-auto"
                >
                  {/* Post header */}
                  <div className="mb-8">
                    {/* Category badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${CATEGORY_STYLES[selectedPost.category]?.bg} ${CATEGORY_STYLES[selectedPost.category]?.text} border ${CATEGORY_STYLES[selectedPost.category]?.border.split(' ')[0]}`}>
                        {CATEGORY_ICONS[selectedPost.category]}
                        {selectedPost.category.charAt(0).toUpperCase() + selectedPost.category.slice(1)}
                      </span>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                      {selectedPost.title}
                    </h1>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {formatDate(selectedPost.published_at || selectedPost.created_at)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {selectedPost.reading_time_minutes} min read
                      </span>
                    </div>

                    {/* Tags */}
                    {selectedPost.tags && selectedPost.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {selectedPost.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-400"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Featured image */}
                  {selectedPost.featured_image_url && (
                    <div className="mb-8 rounded-2xl overflow-hidden border border-white/10">
                      <img
                        src={selectedPost.featured_image_url}
                        alt={selectedPost.title}
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  {/* Excerpt */}
                  {selectedPost.excerpt && (
                    <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-sky-500/10 to-violet-500/10 border border-sky-500/20">
                      <p className="text-lg text-slate-200 italic">{selectedPost.excerpt}</p>
                    </div>
                  )}

                  {/* Content */}
                  <div className="prose prose-invert max-w-none">
                    {renderContent(selectedPost.content)}
                  </div>

                  {/* Back button */}
                  <div className="mt-12 pt-8 border-t border-white/10">
                    <button
                      onClick={handleBackToList}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to all posts
                    </button>
                  </div>
                </motion.article>
              ) : (
                /* Posts List View */
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Search and filters */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    {/* Search */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search articles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Category filters */}
                  <div className="flex flex-wrap gap-2 mb-8">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        !selectedCategory
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    {categories.map(category => {
                      const styles = CATEGORY_STYLES[category.slug] || CATEGORY_STYLES.wellness;
                      const isSelected = selectedCategory === category.slug;
                      return (
                        <button
                          key={category.slug}
                          onClick={() => setSelectedCategory(category.slug)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                            isSelected
                              ? `${styles.bg} ${styles.text} ${styles.border.split(' ')[0]}`
                              : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {CATEGORY_ICONS[category.slug]}
                          {category.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Posts grid */}
                  {isLoading ? (
                    <div className="flex justify-center py-20">
                      <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
                    </div>
                  ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-slate-500" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">No articles found</h3>
                      <p className="text-slate-400">
                        {searchQuery || selectedCategory
                          ? 'Try adjusting your search or filters'
                          : 'Check back soon for new wellness content'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredPosts.map((post, index) => {
                        const styles = CATEGORY_STYLES[post.category] || CATEGORY_STYLES.wellness;
                        return (
                          <motion.article
                            key={post.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handlePostClick(post)}
                            className={`group cursor-pointer rounded-2xl border ${styles.border} bg-gradient-to-br ${styles.gradient} backdrop-blur-sm overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-sky-500/10`}
                          >
                            {/* Featured image or gradient placeholder */}
                            <div className="relative h-40 overflow-hidden">
                              {post.featured_image_url ? (
                                <img
                                  src={post.featured_image_url}
                                  alt={post.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className={`w-full h-full bg-gradient-to-br ${styles.gradient} flex items-center justify-center`}>
                                  <div className={`p-4 rounded-2xl bg-white/10 ${styles.text}`}>
                                    {CATEGORY_ICONS[post.category]}
                                  </div>
                                </div>
                              )}
                              {/* Category badge overlay */}
                              <div className="absolute top-3 left-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles.bg} ${styles.text} backdrop-blur-sm border ${styles.border.split(' ')[0]}`}>
                                  {CATEGORY_ICONS[post.category]}
                                  {post.category}
                                </span>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                              <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-sky-300 transition-colors">
                                {post.title}
                              </h3>
                              {post.excerpt && (
                                <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                                  {post.excerpt}
                                </p>
                              )}
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {post.reading_time_minutes} min
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(post.published_at || post.created_at)}
                                </span>
                              </div>
                            </div>

                            {/* Read more indicator */}
                            <div className="px-4 pb-4">
                              <div className={`flex items-center gap-1 text-sm ${styles.text} group-hover:gap-2 transition-all`}>
                                Read more
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            </div>
                          </motion.article>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default BlogViewPage;
