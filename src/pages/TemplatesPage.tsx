import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { useApp } from '../contexts/AppContext';
import GlassCard from '../../components/GlassCard';
import { TEMPLATE_CATEGORIES, ICONS } from '../../constants';

const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { setScript, setEnhancedScript, setRestoredScript } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState<string | null>(null);

  const handleSelectTemplate = (prompt: string) => {
    setScript(prompt);
    setRestoredScript(prompt);
    navigate('/');
  };

  return (
    <AppLayout showBackButton backTo="/" className="flex flex-col p-6 overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto space-y-8 py-16 md:py-20">
        <div className="text-center space-y-4">
          <div className="inline-block px-4 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-[0.4em]">Templates</div>
          <h3 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-tight">
            {selectedSubgroup
              ? TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.subgroups.find(s => s.id === selectedSubgroup)?.name
              : selectedCategory
                ? TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.name
                : 'Choose a Category'}
          </h3>
          <p className="text-slate-500 text-sm md:text-base max-w-lg mx-auto">
            {selectedSubgroup
              ? TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.subgroups.find(s => s.id === selectedSubgroup)?.description
              : selectedCategory
                ? TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.description
                : 'Select from meditation or immersive stories.'}
          </p>
        </div>

        {/* Breadcrumb */}
        {(selectedCategory || selectedSubgroup) && (
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => { setSelectedCategory(null); setSelectedSubgroup(null); }}
              className="text-slate-400 hover:text-white transition-colors"
            >
              All
            </button>
            {selectedCategory && (
              <>
                <span className="text-slate-600">/</span>
                <button
                  onClick={() => setSelectedSubgroup(null)}
                  className={`transition-colors ${selectedSubgroup ? 'text-slate-400 hover:text-white' : 'text-white'}`}
                >
                  {TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.name}
                </button>
              </>
            )}
            {selectedSubgroup && (
              <>
                <span className="text-slate-600">/</span>
                <span className="text-white">
                  {TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.subgroups.find(s => s.id === selectedSubgroup)?.name}
                </span>
              </>
            )}
          </div>
        )}

        {/* Level 1: Categories */}
        {!selectedCategory && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TEMPLATE_CATEGORIES.map(category => (
              <GlassCard
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`!p-8 !rounded-3xl cursor-pointer border border-transparent transition-all hover:scale-[1.02] ${
                  category.id === 'meditation'
                    ? 'hover:border-cyan-500/30'
                    : 'hover:border-pink-500/30'
                }`}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                  category.id === 'meditation'
                    ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20'
                    : 'bg-gradient-to-br from-pink-500/20 to-purple-500/20'
                }`}>
                  {category.icon === 'sparkle' ? <ICONS.Sparkle className="w-8 h-8" /> : <ICONS.Book className="w-8 h-8" />}
                </div>
                <h4 className="text-2xl font-bold text-white mb-2">{category.name}</h4>
                <p className="text-slate-400 mb-4">{category.description}</p>
                <div className="text-xs text-slate-500">{category.subgroups.length} subcategories</div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Level 2: Subgroups */}
        {selectedCategory && !selectedSubgroup && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.subgroups.map(subgroup => (
              <GlassCard
                key={subgroup.id}
                onClick={() => setSelectedSubgroup(subgroup.id)}
                className={`!p-6 !rounded-2xl cursor-pointer border border-transparent transition-all hover:scale-[1.02] ${
                  selectedCategory === 'meditation'
                    ? 'hover:border-cyan-500/30'
                    : 'hover:border-pink-500/30'
                }`}
              >
                <h5 className="text-lg font-bold text-white mb-1">{subgroup.name}</h5>
                <p className="text-sm text-slate-400 mb-3">{subgroup.description}</p>
                <div className="text-xs text-slate-500">{subgroup.templates.length} templates</div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Level 3: Templates */}
        {selectedSubgroup && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.subgroups
              .find(s => s.id === selectedSubgroup)?.templates.map((template, idx) => (
                <GlassCard
                  key={idx}
                  onClick={() => handleSelectTemplate(template.prompt)}
                  className="!p-5 !rounded-xl cursor-pointer border border-transparent hover:border-cyan-500/30 transition-all hover:scale-[1.01]"
                >
                  <h6 className="text-base font-semibold text-white mb-2">{template.title}</h6>
                  <p className="text-sm text-slate-400 mb-3">{template.description}</p>
                  <div className="flex items-center gap-2 text-xs text-cyan-400">
                    <span>Use template</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </GlassCard>
              ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default TemplatesPage;
