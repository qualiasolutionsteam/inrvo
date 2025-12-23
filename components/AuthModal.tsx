import React, { useState, useMemo } from 'react';
import { signIn, signUp } from '../lib/supabase';
import { ICONS } from '../constants';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password strength calculation
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-rose-500' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-amber-500' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-teal-500' };
  return { score, label: 'Strong', color: 'bg-emerald-500' };
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false });

  // Validation states
  const isEmailValid = EMAIL_REGEX.test(email);
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const isPasswordValid = password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!isEmailValid) {
      setError('Please enter a valid email address');
      return;
    }
    if (!isPasswordValid) {
      setError('Password must be at least 6 characters');
      return;
    }

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
    setTouched({ email: false, password: false });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-[#0a0a12] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/30 via-transparent to-purple-950/20" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Close button */}
        <button
          onClick={() => {
            onClose();
            resetForm();
          }}
          className="absolute -top-12 left-0 text-white/40 hover:text-white transition-colors flex items-center gap-2 text-sm"
        >
          <ICONS.ArrowBack className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Card */}
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
              <ICONS.Logo className="h-6 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-1">
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-sm text-white/50">
              {mode === 'signin'
                ? 'Sign in to access your voices'
                : 'Save your personalized voices'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <p className="text-sm text-rose-400">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all"
                  placeholder="First name"
                />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all"
                  placeholder="Last name"
                />
              </div>
            )}

            <div className="space-y-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, email: true }))}
                required
                className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-white text-sm placeholder:text-white/30 focus:outline-none focus:bg-white/[0.08] transition-all ${
                  touched.email && !isEmailValid
                    ? 'border-rose-500/50 focus:border-rose-500/50'
                    : 'border-white/10 focus:border-cyan-500/50'
                }`}
                placeholder="Email"
              />
              {touched.email && !isEmailValid && email && (
                <p className="text-xs text-rose-400 pl-1">Please enter a valid email</p>
              )}
            </div>

            <div className="space-y-1">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, password: true }))}
                required
                minLength={6}
                className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-white text-sm placeholder:text-white/30 focus:outline-none focus:bg-white/[0.08] transition-all ${
                  touched.password && !isPasswordValid
                    ? 'border-rose-500/50 focus:border-rose-500/50'
                    : 'border-white/10 focus:border-cyan-500/50'
                }`}
                placeholder="Password (min 6 characters)"
              />
              {mode === 'signup' && password && (
                <div className="flex items-center gap-2 pl-1">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= passwordStrength.score
                            ? passwordStrength.color
                            : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs ${
                    passwordStrength.score <= 1 ? 'text-rose-400' :
                    passwordStrength.score <= 2 ? 'text-amber-400' :
                    'text-teal-400'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
              {touched.password && !isPasswordValid && password && (
                <p className="text-xs text-rose-400 pl-1">Password must be at least 6 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium text-sm hover:from-cyan-400 hover:to-purple-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  <span>Please wait...</span>
                </div>
              ) : (
                <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="mt-5 text-center text-sm text-white/40">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Guest mode */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-all"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;