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
  Quote,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  Share2,
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

// Process inline formatting: bold, links, italic
const processInlineFormatting = (text: string, keyPrefix: string = ''): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  // Order matters: bold (**) before italic (*) to avoid conflicts
  const regex = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)|\*([^*]+)\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // Bold **text**
      parts.push(
        <strong key={`${keyPrefix}b-${match.index}`} className="font-semibold text-white">
          {match[1]}
        </strong>
      );
    } else if (match[2] !== undefined) {
      // Link [text](url)
      const url = match[3] ?? '';
      const isInternal = url.startsWith('/') || url.includes('innrvo.com');
      parts.push(
        <a
          key={`${keyPrefix}l-${match.index}`}
          href={url}
          className="text-sky-400 hover:text-sky-300 underline underline-offset-2 decoration-sky-400/30 hover:decoration-sky-300/50 transition-colors"
          {...(isInternal ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
        >
          {match[2]}
        </a>
      );
    } else if (match[4] !== undefined) {
      // Italic *text*
      parts.push(
        <em key={`${keyPrefix}i-${match.index}`} className="italic text-slate-400">
          {match[4]}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};

// Enhanced markdown content renderer
const ContentRenderer: React.FC<{ content: string }> = ({ content }) => {
  const elements: React.ReactNode[] = [];
  const lines = content.split('\n');
  let listItems: string[] = [];
  let inList = false;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="my-6 space-y-3">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3 text-slate-300">
              <span className="flex-shrink-0 w-1.5 h-1.5 mt-2.5 rounded-full bg-sky-500" />
              <span className="leading-relaxed">{processInlineFormatting(item, `li-${idx}-`)}</span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Empty line - flush list if any
    if (!trimmedLine) {
      flushList();
      return;
    }

    // Headers
    if (trimmedLine.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={index} className="text-xl font-semibold text-white mt-10 mb-4 flex items-center gap-2">
          <span className="w-1 h-6 bg-gradient-to-b from-sky-500 to-violet-500 rounded-full" />
          {trimmedLine.slice(4)}
        </h3>
      );
      return;
    }

    if (trimmedLine.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={index} className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6 pb-3 border-b border-white/10">
          {trimmedLine.slice(3)}
        </h2>
      );
      return;
    }

    if (trimmedLine.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={index} className="text-3xl md:text-4xl font-bold text-white mt-12 mb-6">
          {trimmedLine.slice(2)}
        </h1>
      );
      return;
    }

    // Bold text sections (like **Traditional app experience:**)
    if (trimmedLine.startsWith('**') && trimmedLine.includes(':**')) {
      flushList();
      const match = trimmedLine.match(/^\*\*(.+?):\*\*\s*(.*)$/);
      if (match) {
        const [, label, rest] = match;
        elements.push(
          <div key={index} className="my-6 p-5 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 p-2 rounded-lg bg-sky-500/10 text-sky-400">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">{label}</h4>
                <p className="text-slate-300 leading-relaxed">{rest}</p>
              </div>
            </div>
          </div>
        );
        return;
      }
    }

    // Inline bold text
    if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && !trimmedLine.includes(':**')) {
      flushList();
      const boldText = trimmedLine.slice(2, -2);
      elements.push(
        <p key={index} className="text-lg font-semibold text-white my-4">{boldText}</p>
      );
      return;
    }

    // List items
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      inList = true;
      listItems.push(trimmedLine.slice(2));
      return;
    }

    // Quote blocks (lines starting with >)
    if (trimmedLine.startsWith('>')) {
      flushList();
      elements.push(
        <blockquote key={index} className="my-6 pl-4 border-l-4 border-sky-500/50 bg-sky-500/5 py-4 pr-4 rounded-r-xl">
          <div className="flex items-start gap-3">
            <Quote className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
            <p className="text-slate-200 italic leading-relaxed">{processInlineFormatting(trimmedLine.slice(1).trim(), `q-${index}-`)}</p>
          </div>
        </blockquote>
      );
      return;
    }

    // Regular paragraph with inline formatting
    flushList();
    elements.push(
      <p key={index} className="text-slate-300 leading-relaxed mb-4 text-base md:text-lg">
        {processInlineFormatting(trimmedLine, `p-${index}-`)}
      </p>
    );
  });

  // Flush any remaining list
  flushList();

  return <div className="blog-content">{elements}</div>;
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

  // SEO: Update document meta tags for blog posts
  useEffect(() => {
    if (!selectedPost) return;

    const title = selectedPost.meta_title || `${selectedPost.title} | Innrvo`;
    const description = selectedPost.meta_description || selectedPost.excerpt || '';
    const url = `https://innrvo.com/blog/${selectedPost.slug}`;

    document.title = title;

    const setMeta = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', content);
    };

    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:url"]', url);
    setMeta('meta[property="og:type"]', 'article');
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);
    setMeta('meta[name="twitter:url"]', url);
    if (selectedPost.featured_image_url) {
      setMeta('meta[property="og:image"]', selectedPost.featured_image_url);
      setMeta('meta[name="twitter:image"]', selectedPost.featured_image_url);
    }

    // Article JSON-LD
    let articleLd = document.getElementById('blog-article-ld');
    if (!articleLd) {
      articleLd = document.createElement('script');
      articleLd.id = 'blog-article-ld';
      articleLd.setAttribute('type', 'application/ld+json');
      document.head.appendChild(articleLd);
    }
    articleLd.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: selectedPost.title,
      description,
      author: { '@type': 'Organization', name: 'Innrvo' },
      publisher: { '@type': 'Organization', name: 'Innrvo', url: 'https://innrvo.com' },
      datePublished: selectedPost.published_at || selectedPost.created_at,
      dateModified: selectedPost.updated_at,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      ...(selectedPost.featured_image_url ? { image: selectedPost.featured_image_url } : {}),
    });

    // FAQPage JSON-LD: extract FAQ Q&A from content if present
    const faqLdId = 'blog-faq-ld';
    const existingFaqLd = document.getElementById(faqLdId);
    const lines = selectedPost.content.split('\n');
    const faqs: { question: string; answer: string }[] = [];
    let inFAQ = false;
    let curQ = '';
    let curA = '';

    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('## ') && t.toLowerCase().includes('faq')) { inFAQ = true; continue; }
      if (inFAQ && t.startsWith('## ') && !t.toLowerCase().includes('faq')) {
        if (curQ) faqs.push({ question: curQ, answer: curA.trim() });
        curQ = '';
        break;
      }
      if (inFAQ && t.startsWith('### ')) {
        if (curQ) faqs.push({ question: curQ, answer: curA.trim() });
        curQ = t.slice(4);
        curA = '';
      } else if (inFAQ && curQ && t) {
        // Strip markdown for plain text answer
        const plain = t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*([^*]+)\*/g, '$1');
        curA += (curA ? ' ' : '') + plain;
      }
    }
    if (curQ) faqs.push({ question: curQ, answer: curA.trim() });

    if (faqs.length > 0) {
      let faqLd = existingFaqLd;
      if (!faqLd) {
        faqLd = document.createElement('script');
        faqLd.id = faqLdId;
        faqLd.setAttribute('type', 'application/ld+json');
        document.head.appendChild(faqLd);
      }
      faqLd.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      });
    }

    return () => {
      document.title = 'Innrvo | AI-Powered Personalized Meditation';
      setMeta('meta[name="description"]', 'Generate personalized meditation scripts with AI and listen in your own cloned voice. Innrvo creates intimate, tailored meditation experiences just for you.');
      setMeta('meta[property="og:title"]', 'Innrvo | AI-Powered Personalized Meditation');
      setMeta('meta[property="og:description"]', 'Generate personalized meditation scripts with AI and listen in your own cloned voice. Create intimate, tailored meditation experiences.');
      setMeta('meta[property="og:url"]', 'https://innrvo.com/');
      setMeta('meta[property="og:type"]', 'website');
      setMeta('meta[property="og:image"]', 'https://innrvo.com/og-image.png');
      setMeta('meta[name="twitter:title"]', 'Innrvo | AI-Powered Personalized Meditation');
      setMeta('meta[name="twitter:description"]', 'Generate personalized meditation scripts with AI and listen in your own cloned voice.');
      setMeta('meta[name="twitter:url"]', 'https://innrvo.com/');
      setMeta('meta[name="twitter:image"]', 'https://innrvo.com/og-image.png');
      const artEl = document.getElementById('blog-article-ld');
      if (artEl) artEl.remove();
      const faqEl = document.getElementById(faqLdId);
      if (faqEl) faqEl.remove();
    };
  }, [selectedPost]);

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

  // Share post
  const handleShare = async () => {
    if (!selectedPost) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: selectedPost.title, url });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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
            <div className="px-4 sm:px-6 lg:px-10 xl:px-16 py-4">
              <div className="flex items-center justify-between">
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
                      <h1 className="text-lg md:text-xl font-semibold text-white line-clamp-1">
                        {selectedPost ? 'Wellness Blog' : 'Wellness Blog'}
                      </h1>
                      {!selectedPost && (
                        <p className="text-xs md:text-sm text-slate-400 hidden sm:block">Discover mindfulness, meditation & wellness tips</p>
                      )}
                    </div>
                  </div>
                </div>
                {selectedPost && (
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Share"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 lg:px-10 xl:px-16 py-6">
            <AnimatePresence mode="wait">
              {selectedPost ? (
                /* Single Post View */
                <motion.article
                  key="post"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="w-full"
                >
                  {/* Post header */}
                  <header className="mb-8 md:mb-12">
                    {/* Category badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${CATEGORY_STYLES[selectedPost.category]?.bg} ${CATEGORY_STYLES[selectedPost.category]?.text} border ${CATEGORY_STYLES[selectedPost.category]?.border.split(' ')[0]}`}>
                        {CATEGORY_ICONS[selectedPost.category]}
                        {selectedPost.category.charAt(0).toUpperCase() + selectedPost.category.slice(1)}
                      </span>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                      {selectedPost.title}
                    </h1>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-slate-400 mb-6">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(selectedPost.published_at || selectedPost.created_at)}
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {selectedPost.reading_time_minutes} min read
                      </span>
                    </div>

                    {/* Tags */}
                    {selectedPost.tags && selectedPost.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedPost.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-400 hover:bg-white/10 transition-colors"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </header>

                  {/* Featured image */}
                  {selectedPost.featured_image_url && (
                    <div className="mb-10 rounded-2xl overflow-hidden border border-white/10">
                      <img
                        src={selectedPost.featured_image_url}
                        alt={selectedPost.title}
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  {/* Excerpt */}
                  {selectedPost.excerpt && (
                    <div className="mb-10 p-5 md:p-6 rounded-2xl bg-gradient-to-r from-sky-500/10 to-violet-500/10 border border-sky-500/20">
                      <p className="text-lg md:text-xl text-slate-200 italic leading-relaxed">{selectedPost.excerpt}</p>
                    </div>
                  )}

                  {/* Content */}
                  <div className="prose prose-lg prose-invert max-w-none">
                    <ContentRenderer content={selectedPost.content} />
                  </div>

                  {/* Footer */}
                  <footer className="mt-12 pt-8 border-t border-white/10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <button
                        onClick={handleBackToList}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sky-400 hover:text-sky-300 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back to all posts
                      </button>
                      <button
                        onClick={handleShare}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:bg-white/10 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        Share article
                      </button>
                    </div>
                  </footer>
                </motion.article>
              ) : (
                /* Posts List View */
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Hero section */}
                  <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                      Wellness Insights
                    </h1>
                    <p className="text-slate-400 lg:max-w-3xl xl:max-w-4xl mx-auto">
                      Expert guidance on meditation, mindfulness, and mental wellness to support your journey to inner peace.
                    </p>
                  </div>

                  {/* Search and filters */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    {/* Search */}
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search articles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Category filters */}
                  <div className="flex flex-wrap gap-2 mb-8 pb-6 border-b border-white/5">
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
                      const styles = CATEGORY_STYLES[category.slug] ?? CATEGORY_STYLES.wellness!;
                      const isSelected = selectedCategory === category.slug;
                      return (
                        <button
                          key={category.slug}
                          onClick={() => setSelectedCategory(category.slug)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                            isSelected
                              ? `${styles.bg} ${styles.text} ${styles.border.split(' ')[0] ?? ''}`
                              : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {CATEGORY_ICONS[category.slug]}
                          <span className="hidden sm:inline">{category.name}</span>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                      {filteredPosts.map((post, index) => {
                        const styles = CATEGORY_STYLES[post.category] ?? CATEGORY_STYLES.wellness!;
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
                            <div className="relative h-44 overflow-hidden">
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
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles.bg} ${styles.text} backdrop-blur-sm border ${styles.border.split(' ')[0] ?? ''}`}>
                                  {CATEGORY_ICONS[post.category]}
                                  {post.category}
                                </span>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="p-5">
                              <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-sky-300 transition-colors leading-snug">
                                {post.title}
                              </h3>
                              {post.excerpt && (
                                <p className="text-sm text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                                  {post.excerpt}
                                </p>
                              )}
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  {post.reading_time_minutes} min
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {formatDate(post.published_at || post.created_at)}
                                </span>
                              </div>
                            </div>

                            {/* Read more indicator */}
                            <div className="px-5 pb-5">
                              <div className={`flex items-center gap-1 text-sm font-medium ${styles.text} group-hover:gap-2 transition-all`}>
                                Read article
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
