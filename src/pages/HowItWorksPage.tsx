import React from 'react';
import AppLayout from '../layouts/AppLayout';
import GlassCard from '../../components/GlassCard';
import { ICONS } from '../../constants';
import { useOnboarding } from '../contexts/OnboardingContext';

const HowItWorksPage: React.FC = () => {
  const { restartOnboarding } = useOnboarding();

  return (
    <AppLayout showBackButton backTo="/" className="flex flex-col p-6 overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center pt-16 md:pt-0 max-w-4xl mx-auto w-full">
        {/* Badge with Restart Tour */}
        <div className="flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-semibold uppercase tracking-[0.35em] shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            Guide
          </div>
          <button
            onClick={restartOnboarding}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all"
            title="Restart Tour"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-5xl font-extralight text-center mb-3 tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms' }}>
          <span className="bg-gradient-to-r from-cyan-300 via-white to-teal-300 bg-clip-text text-transparent">How Innrvo Works</span>
        </h2>
        <p className="text-slate-500 text-center mb-14 max-w-md text-sm animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '150ms' }}>Create personalized meditations in seconds with AI</p>

        {/* Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
          {/* Step 1 */}
          <div className="step-card group">
            <GlassCard className="!p-7 !rounded-2xl text-center h-full border-white/[0.04] hover:border-cyan-500/20 transition-all duration-300" hover={false}>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-cyan-400/5 border border-cyan-500/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform duration-300">
                <span className="text-2xl font-bold bg-gradient-to-br from-cyan-300 to-cyan-500 bg-clip-text text-transparent">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2.5">Write Your Intention</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Type a short phrase like "calm my anxiety" or "help me sleep" - or use voice input</p>
            </GlassCard>
          </div>

          {/* Step 2 */}
          <div className="step-card group">
            <GlassCard className="!p-7 !rounded-2xl text-center h-full border-white/[0.04] hover:border-teal-500/20 transition-all duration-300" hover={false}>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/15 to-teal-400/5 border border-teal-500/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform duration-300">
                <span className="text-2xl font-bold bg-gradient-to-br from-teal-300 to-teal-500 bg-clip-text text-transparent">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2.5">Customize</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Choose a voice, select background music, or browse templates for inspiration</p>
            </GlassCard>
          </div>

          {/* Step 3 */}
          <div className="step-card group">
            <GlassCard className="!p-7 !rounded-2xl text-center h-full border-white/[0.04] hover:border-pink-500/20 transition-all duration-300" hover={false}>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/15 to-pink-400/5 border border-pink-500/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform duration-300">
                <span className="text-2xl font-bold bg-gradient-to-br from-pink-300 to-pink-500 bg-clip-text text-transparent">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2.5">Listen & Relax</h3>
              <p className="text-sm text-slate-500 leading-relaxed">AI generates a full meditation script and reads it aloud with your chosen voice</p>
            </GlassCard>
          </div>
        </div>

        {/* Pro Tips */}
        <div className="mt-14 w-full animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '600ms' }}>
          <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em] text-center mb-6">Pro Tips</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="pro-tip flex items-start gap-3.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <ICONS.Sparkle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-500"><span className="text-slate-300 font-medium">Be specific:</span> "5-minute morning energy boost" works better than just "energy"</p>
            </div>
            <div className="pro-tip flex items-start gap-3.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <ICONS.Microphone className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-500"><span className="text-slate-300 font-medium">Clone your voice:</span> Record yourself to hear meditations in your own voice</p>
            </div>
            <div className="pro-tip flex items-start gap-3.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <ICONS.Music className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-500"><span className="text-slate-300 font-medium">Add emotion:</span> Include feelings like "warm", "peaceful", or "empowering"</p>
            </div>
            <div className="pro-tip flex items-start gap-3.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <ICONS.Book className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-500"><span className="text-slate-300 font-medium">Use templates:</span> Browse pre-made prompts for quick inspiration</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default HowItWorksPage;
