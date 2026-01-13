import React from 'react';
import AppLayout from '../layouts/AppLayout';
import GlassCard from '../../components/GlassCard';

const PricingPage: React.FC = () => {
  return (
    <AppLayout showBackButton backTo="/" className="flex flex-col p-6 overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center pt-16 md:pt-0 max-w-5xl mx-auto w-full">
        <div className="inline-block px-4 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Pricing</div>
        <h2 className="text-3xl md:text-5xl font-extralight text-center mb-4 tracking-tight">
          <span className="bg-gradient-to-r from-amber-300 via-orange-200 to-yellow-300 bg-clip-text text-transparent">Simple Pricing</span>
        </h2>
        <p className="text-slate-500 text-center mb-12 max-w-lg">Choose the plan that works for you</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {/* Free Tier */}
          <GlassCard className="!p-6 !rounded-2xl">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-white mb-1">Free</h3>
              <div className="text-3xl font-bold text-white">$0</div>
              <div className="text-sm text-slate-500">Forever free</div>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm text-slate-300">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                5 meditations per day
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-300">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                4 AI voices
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-300">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Basic templates
              </li>
            </ul>
            <button className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all">
              Current Plan
            </button>
          </GlassCard>

          {/* Pro Tier */}
          <GlassCard className="!p-6 !rounded-2xl border-2 border-amber-500/30 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider">
              Most Popular
            </div>
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-white mb-1">Pro</h3>
              <div className="text-3xl font-bold text-white">$9.99</div>
              <div className="text-sm text-slate-500">per month</div>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm text-slate-300">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Unlimited meditations
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-300">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Voice cloning
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-300">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                All background music
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-300">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Download audio files
              </li>
            </ul>
            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-all">
              Upgrade to Pro
            </button>
          </GlassCard>

          {/* Team Tier */}
          <GlassCard className="!p-6 !rounded-2xl">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-white mb-1">Team</h3>
              <div className="text-3xl font-bold text-white">$29.99</div>
              <div className="text-sm text-slate-500">per month</div>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm text-slate-300">
                <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Everything in Pro
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-300">
                <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                5 team members
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-300">
                <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Shared library
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-300">
                <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Priority support
              </li>
            </ul>
            <button className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all">
              Contact Sales
            </button>
          </GlassCard>
        </div>
      </div>
    </AppLayout>
  );
};

export default PricingPage;
