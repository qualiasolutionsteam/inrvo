import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { useApp } from '../contexts/AppContext';
import GlassCard from '../../components/GlassCard';
import { ICONS, TemplateCategory } from '../../constants';
import { useTemplatesByCategory } from '../hooks/useTemplates';
import { incrementTemplateUsage } from '../lib/adminSupabase';

// Color configuration for each category
const CATEGORY_COLORS: Record<string, {
  border: string;
  bg: string;
  text: string;
  hoverBorder: string;
}> = {
  emerald: {
    border: 'border-emerald-500/30',
    bg: 'bg-gradient-to-br from-emerald-500/20 to-sky-500/20',
    text: 'text-emerald-400',
    hoverBorder: 'hover:border-emerald-500/30',
  },
  cyan: {
    border: 'border-sky-500/30',
    bg: 'bg-gradient-to-br from-sky-500/20 to-purple-500/20',
    text: 'text-sky-500',
    hoverBorder: 'hover:border-sky-500/30',
  },
  violet: {
    border: 'border-violet-500/30',
    bg: 'bg-gradient-to-br from-violet-500/20 to-purple-500/20',
    text: 'text-violet-400',
    hoverBorder: 'hover:border-violet-500/30',
  },
  pink: {
    border: 'border-pink-500/30',
    bg: 'bg-gradient-to-br from-pink-500/20 to-purple-500/20',
    text: 'text-pink-400',
    hoverBorder: 'hover:border-pink-500/30',
  },
  orange: {
    border: 'border-orange-500/30',
    bg: 'bg-gradient-to-br from-orange-500/20 to-red-500/20',
    text: 'text-orange-400',
    hoverBorder: 'hover:border-orange-500/30',
  },
  amber: {
    border: 'border-amber-500/30',
    bg: 'bg-gradient-to-br from-amber-500/20 to-yellow-500/20',
    text: 'text-amber-400',
    hoverBorder: 'hover:border-amber-500/30',
  },
};

// Get the appropriate icon component for a category
const getCategoryIcon = (icon: TemplateCategory['icon'], className: string) => {
  switch (icon) {
    case 'leaf':
      return <ICONS.Leaf className={className} />;
    case 'moon':
      return <ICONS.Moon className={className} />;
    case 'sparkle':
      return <ICONS.Sparkle className={className} />;
    case 'book':
      return <ICONS.Book className={className} />;
    case 'fire':
      return <ICONS.Flame className={className} />;
    case 'pray':
      return <ICONS.Pray className={className} />;
    default:
      return <ICONS.Sparkle className={className} />;
  }
};

const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { setScript, setRestoredScript } = useApp();
  const { categories: dbCategories, isLoading } = useTemplatesByCategory();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState<string | null>(null);

  // Get current category object
  const currentCategory = useMemo(() =>
    dbCategories.find(c => c.id === selectedCategory),
    [dbCategories, selectedCategory]
  );

  // Get current subgroup object
  const currentSubgroup = useMemo(() =>
    currentCategory?.subgroups.find(s => s.id === selectedSubgroup),
    [currentCategory, selectedSubgroup]
  );

  // Get color config for current category
  const currentColors = useMemo(() =>
    currentCategory ? CATEGORY_COLORS[currentCategory.color || 'cyan'] || CATEGORY_COLORS.cyan : null,
    [currentCategory]
  );

  const handleSelectTemplate = (templateId: string, prompt: string) => {
    // Track usage (fire and forget)
    incrementTemplateUsage(templateId);
    setScript(prompt);
    setRestoredScript(prompt);
    navigate('/');
  };

  // Calculate total templates across all categories
  const totalTemplates = useMemo(() =>
    dbCategories.reduce((sum, cat) =>
      sum + cat.subgroups.reduce((subSum, sub) => subSum + sub.templates.length, 0), 0
    ),
    [dbCategories]
  );

  return (
    <AppLayout showBackButton backTo="/" className="flex flex-col p-6 overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto space-y-8 py-16 md:py-20">
        <div className="text-center space-y-4">
          <div className={`inline-block px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.4em] ${
            currentColors
              ? `bg-${currentCategory?.color}-500/10 ${currentColors.text}`
              : 'bg-purple-500/10 text-purple-400'
          }`}>
            Templates
          </div>
          <h3 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-tight">
            {currentSubgroup?.name || currentCategory?.name || 'Choose a Category'}
          </h3>
          <p className="text-slate-500 text-sm md:text-base max-w-lg mx-auto">
            {currentSubgroup?.description
              || currentCategory?.description
              || `Explore ${totalTemplates}+ ready-to-use templates for meditations, affirmations, hypnosis, and stories.`}
          </p>
        </div>

        {/* Breadcrumb */}
        {(selectedCategory || selectedSubgroup) && (
          <div className="flex items-center justify-center gap-2 text-sm">
            <button
              onClick={() => { setSelectedCategory(null); setSelectedSubgroup(null); }}
              className="text-slate-400 hover:text-white transition-colors"
            >
              All Categories
            </button>
            {currentCategory && (
              <>
                <span className="text-slate-600">/</span>
                <button
                  onClick={() => setSelectedSubgroup(null)}
                  className={`transition-colors ${selectedSubgroup ? 'text-slate-400 hover:text-white' : currentColors?.text || 'text-white'}`}
                >
                  {currentCategory.name}
                </button>
              </>
            )}
            {currentSubgroup && (
              <>
                <span className="text-slate-600">/</span>
                <span className={currentColors?.text || 'text-white'}>
                  {currentSubgroup.name}
                </span>
              </>
            )}
          </div>
        )}

        {/* Level 1: Categories */}
        {!selectedCategory && (
          <div data-onboarding="templates-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoading ? (
              <div className="col-span-2 flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
              </div>
            ) : (
              dbCategories.map(category => {
                const colors = CATEGORY_COLORS[category.color || 'cyan'] || CATEGORY_COLORS.cyan;
                const templateCount = category.subgroups.reduce((sum, sub) => sum + sub.templates.length, 0);

                return (
                  <GlassCard
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`!p-8 !rounded-3xl cursor-pointer border border-transparent transition-all hover:scale-[1.02] ${colors.hoverBorder}`}
                  >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${colors.bg}`}>
                      {getCategoryIcon(category.icon as TemplateCategory['icon'], 'w-8 h-8')}
                    </div>
                    <h4 className="text-2xl font-bold text-white mb-2">{category.name}</h4>
                    <p className="text-slate-400 mb-4">{category.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{category.subgroups.length} subcategories</span>
                      <span>•</span>
                      <span className={colors.text}>{templateCount} templates</span>
                    </div>
                  </GlassCard>
                );
              })
            )}
          </div>
        )}

        {/* Level 2: Subgroups */}
        {selectedCategory && !selectedSubgroup && currentCategory && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentCategory.subgroups.map(subgroup => {
              const colors = CATEGORY_COLORS[currentCategory.color || 'cyan'] || CATEGORY_COLORS.cyan;

              return (
                <GlassCard
                  key={subgroup.id}
                  onClick={() => setSelectedSubgroup(subgroup.id)}
                  className={`!p-6 !rounded-2xl cursor-pointer border border-transparent transition-all hover:scale-[1.02] ${colors.hoverBorder}`}
                >
                  <h5 className="text-lg font-bold text-white mb-1">{subgroup.name}</h5>
                  <p className="text-sm text-slate-400 mb-3">{subgroup.description}</p>
                  <div className={`text-xs ${colors.text}`}>
                    {subgroup.templates.length} template{subgroup.templates.length !== 1 ? 's' : ''}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Level 3: Templates */}
        {selectedSubgroup && currentSubgroup && currentColors && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentSubgroup.templates.map((template) => (
              <GlassCard
                key={template.id}
                onClick={() => handleSelectTemplate(template.id, template.prompt)}
                className={`!p-5 !rounded-xl cursor-pointer border border-transparent transition-all hover:scale-[1.01] ${currentColors.hoverBorder}`}
              >
                <h6 className="text-base font-semibold text-white mb-2">{template.title}</h6>
                <p className="text-sm text-slate-400 mb-3">{template.description}</p>
                <div className={`flex items-center gap-2 text-xs ${currentColors.text}`}>
                  <span>Use template</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Quick stats when no category selected */}
        {!selectedCategory && !isLoading && (
          <div className="flex justify-center gap-8 pt-4 text-center">
            {dbCategories.map(cat => {
              const colors = CATEGORY_COLORS[cat.color || 'cyan'] || CATEGORY_COLORS.cyan;
              const templateCount = cat.subgroups.reduce((sum, sub) => sum + sub.templates.length, 0);
              return (
                <div key={cat.id} className="text-xs">
                  <div className={`font-bold ${colors.text}`}>{templateCount}</div>
                  <div className="text-slate-500">{cat.name}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default TemplatesPage;
