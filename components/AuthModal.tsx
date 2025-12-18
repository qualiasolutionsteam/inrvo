import React, { useState } from 'react';
import { signIn, signUp } from '../lib/supabase';
import { ICONS } from '../constants';
import GlassCard from './GlassCard';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        await signUp(email, password, firstName, lastName);
      } else {
        await signIn(email, password);
      }
      onSuccess();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-[#020617]/95 backdrop-blur-3xl flex flex-col items-center justify-center p-4 md:p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
      {/* Back Button */}
      <button
        onClick={() => {
          onClose();
          resetForm();
        }}
        className="absolute top-4 left-4 md:top-8 md:left-8 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-10"
      >
        <div className="w-10 h-10 md:w-12 md:h-12 min-w-[40px] min-h-[40px] md:min-w-[44px] md:min-h-[44px] rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
          <ICONS.ArrowBack className="w-4 h-4 md:w-5 md:h-5" />
        </div>
        <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.3em]">Back</span>
      </button>

      <div className="w-full max-w-md my-auto">
        <GlassCard className="!p-5 md:!p-8">
          <div className="text-center mb-6 md:mb-8">
            <ICONS.Logo className="h-8 md:h-10 mx-auto mb-4 md:mb-6 text-white" />
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
              {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-xs md:text-sm text-slate-400">
              {mode === 'signin'
                ? 'Sign in to access your saved voices'
                : 'Start saving your personalized voices'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <p className="text-sm text-rose-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div>
                  <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 md:mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
                    placeholder="First"
                  />
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 md:mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
                    placeholder="Last"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 md:mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 md:mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 md:py-4 rounded-lg md:rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs md:text-sm uppercase tracking-widest hover:shadow-2xl hover:shadow-indigo-500/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2 md:gap-3">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 md:h-4 md:w-4 border-2 border-white/30 border-t-white"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>

          <div className="mt-4 md:mt-6 text-center">
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              className="text-xs md:text-sm text-slate-400 hover:text-white transition-colors min-h-[40px] px-2"
            >
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>

          {/* Guest Mode */}
          <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="w-full py-2.5 md:py-3 rounded-lg md:rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold text-[10px] md:text-xs uppercase tracking-widest transition-all min-h-[40px]"
            >
              Continue as Guest
            </button>
            <p className="text-[9px] md:text-[10px] text-slate-600 text-center mt-1.5 md:mt-2">
              Voice profiles won't be saved
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default AuthModal;