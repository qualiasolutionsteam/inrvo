import React, { useState, useMemo } from 'react';
import { signIn, signUp, resetPasswordForEmail } from '../lib/supabase';
import { ICONS } from '../constants';
import { CheckCircle, Mail } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'forgot';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMode?: AuthMode;
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
  if (score <= 3) return { score, label: 'Good', color: 'bg-sky-500' };
  return { score, label: 'Strong', color: 'bg-emerald-500' };
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, initialMode = 'signin' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Reset mode when modal opens with a specific initialMode
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [emailSent, setEmailSent] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);

  // Validation states
  const isEmailValid = EMAIL_REGEX.test(email);
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const isPasswordValid = password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!isEmailValid) {
      setError('Please enter a valid email address');
      return;
    }

    // Password validation only for signin/signup
    if (mode !== 'forgot' && !isPasswordValid) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'forgot') {
        await resetPasswordForEmail(email);
        setEmailSent(true);
      } else if (mode === 'signup') {
        await signUp(email, password, firstName, lastName);
        setSignupComplete(true);
      } else {
        await signIn(email, password);
        onSuccess();
        resetForm();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
    setEmailSent(false);
    setSignupComplete(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-[#0a0a12] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-950/30 via-transparent to-slate-950/20" />

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
          <div className="text-center mb-8">
            {/* Logo or status icon */}
            <div className="mb-5">
              {emailSent || signupComplete ? (
                <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-sky-600/20 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-emerald-400" />
                </div>
              ) : mode === 'forgot' ? (
                <div className="w-14 h-14 mx-auto rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center">
                  <Mail className="h-7 w-7 text-sky-400" />
                </div>
              ) : (
                <ICONS.Logo className="h-12 w-auto mx-auto" />
              )}
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {signupComplete
                ? 'Thanks for signing up!'
                : emailSent
                  ? 'Check your email'
                  : mode === 'signin'
                    ? 'Welcome back'
                    : mode === 'signup'
                      ? 'Create account'
                      : 'Reset password'}
            </h2>
            <p className="text-sm text-white/50 leading-relaxed">
              {signupComplete
                ? `We've sent a verification link to ${email}`
                : emailSent
                  ? `We've sent a reset link to ${email}`
                  : mode === 'signin'
                    ? 'Sign in to continue your journey'
                    : mode === 'signup'
                      ? 'Start your meditation journey'
                      : 'Enter your email to receive a reset link'}
            </p>
          </div>

          {/* Signup Complete View */}
          {signupComplete ? (
            <>
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm text-emerald-400 mb-2">
                  Please check your email and click the verification link to activate your account.
                </p>
                <p className="text-xs text-white/40">
                  Didn't receive the email? Check your spam folder.
                </p>
              </div>
              <button
                onClick={() => {
                  setSignupComplete(false);
                  setMode('signin');
                  resetForm();
                }}
                className="w-full py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm active:scale-[0.98] transition-all"
              >
                Back to Sign In
              </button>
            </>
          ) : emailSent ? (
            <>
              <p className="text-sm text-white/50 text-center mb-6">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <button
                onClick={() => {
                  setEmailSent(false);
                  setMode('signin');
                  setError(null);
                }}
                className="w-full py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm active:scale-[0.98] transition-all"
              >
                Back to Sign In
              </button>
            </>
          ) : (
            <>
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
                      aria-label="First name"
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-sky-500/40 focus:bg-white/[0.06] transition-all"
                      placeholder="First name"
                    />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      aria-label="Last name"
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-sky-500/40 focus:bg-white/[0.06] transition-all"
                      placeholder="Last name"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, email: true }))}
                    required
                    aria-label="Email address"
                    className={`w-full px-4 py-3 rounded-xl bg-white/[0.04] border text-white text-sm placeholder:text-white/40 focus:outline-none focus:bg-white/[0.06] transition-all ${
                      touched.email && !isEmailValid
                        ? 'border-rose-500/40 focus:border-rose-500/40'
                        : 'border-white/[0.08] focus:border-sky-500/40'
                    }`}
                    placeholder="Email address"
                  />
                  {touched.email && !isEmailValid && email && (
                    <p className="text-xs text-rose-400 pl-1">Please enter a valid email</p>
                  )}
                </div>

                {/* Password field - only for signin/signup */}
                {mode !== 'forgot' && (
                  <div className="space-y-1.5">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, password: true }))}
                      required
                      minLength={8}
                      aria-label="Password"
                      className={`w-full px-4 py-3 rounded-xl bg-white/[0.04] border text-white text-sm placeholder:text-white/40 focus:outline-none focus:bg-white/[0.06] transition-all ${
                        touched.password && !isPasswordValid
                          ? 'border-rose-500/40 focus:border-rose-500/40'
                          : 'border-white/[0.08] focus:border-sky-500/40'
                      }`}
                      placeholder="Password"
                    />
                    {mode === 'signup' && password && (
                      <div className="flex items-center gap-2 pt-1">
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
                          passwordStrength.score <= 3 ? 'text-sky-400' :
                          'text-emerald-400'
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                    )}
                    {touched.password && !isPasswordValid && password && (
                      <p className="text-xs text-rose-400 pl-1">Password must be at least 8 characters</p>
                    )}
                  </div>
                )}

                {/* Forgot password link - only in signin mode */}
                {mode === 'signin' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setTouched({ email: false, password: false });
                      }}
                      className="text-xs text-white/40 hover:text-sky-400 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                      <span>Please wait...</span>
                    </div>
                  ) : (
                    <span>
                      {mode === 'signin'
                        ? 'Sign In'
                        : mode === 'signup'
                          ? 'Create Account'
                          : 'Send Reset Link'}
                    </span>
                  )}
                </button>
              </form>

              {/* Toggle mode */}
              <p className="mt-5 text-center text-sm text-white/40">
                {mode === 'forgot' ? (
                  <>
                    Remember your password?{' '}
                    <button
                      onClick={() => {
                        setMode('signin');
                        setError(null);
                      }}
                      className="text-sky-500 hover:text-sky-400 transition-colors"
                    >
                      Sign in
                    </button>
                  </>
                ) : mode === 'signin' ? (
                  <>
                    Don't have an account?{' '}
                    <button
                      onClick={() => {
                        setMode('signup');
                        setError(null);
                      }}
                      className="text-sky-500 hover:text-sky-400 transition-colors"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      onClick={() => {
                        setMode('signin');
                        setError(null);
                      }}
                      className="text-sky-500 hover:text-sky-400 transition-colors"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default AuthModal;