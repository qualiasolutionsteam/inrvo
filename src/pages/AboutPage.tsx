import React from 'react';
import AppLayout from '../layouts/AppLayout';
import GlassCard from '../../components/GlassCard';

const AboutPage: React.FC = () => {
  return (
    <AppLayout showBackButton backTo="/" className="flex flex-col p-6 overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center pt-16 md:pt-0 max-w-2xl mx-auto w-full">
        <div className="inline-block px-4 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">About</div>
        <h2 className="text-3xl md:text-5xl font-extralight text-center mb-4 tracking-tight">
          <span className="bg-gradient-to-r from-blue-300 via-white to-teal-300 bg-clip-text text-transparent">About Innrvo</span>
        </h2>

        <GlassCard className="!p-8 !rounded-2xl mt-8">
          <div className="prose prose-invert prose-sm max-w-none">
            <p className="text-slate-400 leading-relaxed mb-6">
              Innrvo is a personalized meditation app that uses AI to create custom meditation experiences tailored to your emotional state and needs.
            </p>

            <h3 className="text-lg font-semibold text-white mb-3">Our Mission</h3>
            <p className="text-slate-400 leading-relaxed mb-6">
              We believe that meditation should be accessible, personalized, and deeply meaningful. By combining cutting-edge AI technology with ancient wisdom traditions, we create meditation experiences that truly resonate with you.
            </p>

            <h3 className="text-lg font-semibold text-white mb-3">How It Works</h3>
            <p className="text-slate-400 leading-relaxed mb-6">
              Simply describe how you're feeling, and our AI agent will generate a custom meditation script tailored to your needs. Choose from premium AI voices or clone your own voice for a truly personal experience.
            </p>

            <h3 className="text-lg font-semibold text-white mb-3">Technology</h3>
            <p className="text-slate-400 leading-relaxed">
              Built with React, Supabase, and advanced AI models including Gemini for script generation and Fish Audio for voice synthesis. We prioritize privacy, security, and a seamless user experience.
            </p>
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
};

export default AboutPage;
