import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase, updatePassword, signOut } from '@/lib/supabase';
import { CheckCircle, AlertCircle, KeyRound, LogIn } from 'lucide-react';

// Password strength calculation (same as AuthModal)
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

type PageState = 'loading' | 'form' | 'success' | 'error';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ password: false, confirm: false });
  const starsRef = useRef<HTMLDivElement>(null);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const isPasswordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword;

  // Check for valid session on mount
  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) {
        setPageState('error');
        setError('Unable to connect to authentication service');
        return;
      }

      // Supabase automatically handles the token exchange from the URL
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setPageState('error');
        setError('This password reset link has expired or is invalid. Please request a new one.');
        return;
      }

      setPageState('form');
    };

    checkSession();
  }, []);

  // Generate stars background
  useEffect(() => {
    const container = starsRef.current;
    if (!container) return;

    for (let i = 0; i < 50; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.cssText = `
        position: absolute;
        width: 2px;
        height: 2px;
        background: white;
        border-radius: 50%;
        opacity: 0.4;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: twinkle 3s ease-in-out infinite;
        animation-delay: ${Math.random() * 3}s;
      `;
      container.appendChild(star);
    }

    return () => {
      container.innerHTML = '';
    };
  }, []);

  // Auto-redirect after success
  useEffect(() => {
    if (pageState === 'success') {
      const timer = setTimeout(() => {
        const message = encodeURIComponent('Password updated successfully! Please sign in with your new password.');
        navigate(`/?auth=signin&message=${message}`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [pageState, navigate]);

  const handleSignIn = () => {
    const message = encodeURIComponent('Password updated successfully! Please sign in with your new password.');
    navigate(`/?auth=signin&message=${message}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      toast.success('Password updated successfully!');
      setPageState('success');
      // Sign out so user needs to sign in with new password
      await signOut();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
      {/* Stars background */}
      <div ref={starsRef} className="fixed inset-0 z-0 overflow-hidden" />

      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/30 via-transparent to-slate-950/20 z-0" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Card */}
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8">
          {/* Loading State */}
          {pageState === 'loading' && (
            <div className="py-8">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white" />
              </div>
              <p className="text-white/60 text-sm">Verifying reset link...</p>
            </div>
          )}

          {/* Error State */}
          {pageState === 'error' && (
            <div className="py-4">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Link Expired</h2>
              <p className="text-sm text-white/50 mb-6">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-teal-500 text-white font-medium text-sm hover:from-blue-400 hover:to-teal-400 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20"
              >
                Request New Link
              </button>
            </div>
          )}

          {/* Success State */}
          {pageState === 'success' && (
            <div className="py-4">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Password Updated!</h2>
              <p className="text-sm text-white/50 mb-6">
                Your password has been successfully changed. Please sign in with your new password to continue.
              </p>
              <button
                onClick={handleSignIn}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-teal-500 text-white font-medium text-sm hover:from-blue-400 hover:to-teal-400 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
              <p className="mt-4 text-xs text-white/30">
                Redirecting to sign in in 3 seconds...
              </p>
            </div>
          )}

          {/* Form State */}
          {pageState === 'form' && (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                  <KeyRound className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-1">Set new password</h2>
                <p className="text-sm text-white/50">
                  Enter your new password below
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
                <div className="space-y-1">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, password: true }))}
                    required
                    minLength={8}
                    className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-white text-sm placeholder:text-white/30 focus:outline-none focus:bg-white/[0.08] transition-all ${
                      touched.password && !isPasswordValid
                        ? 'border-rose-500/50 focus:border-rose-500/50'
                        : 'border-white/10 focus:border-blue-500/50'
                    }`}
                    placeholder="New password (min 8 characters)"
                  />
                  {password && (
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
                    <p className="text-xs text-rose-400 pl-1">Password must be at least 8 characters</p>
                  )}
                </div>

                <div className="space-y-1">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, confirm: true }))}
                    required
                    className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-white text-sm placeholder:text-white/30 focus:outline-none focus:bg-white/[0.08] transition-all ${
                      touched.confirm && !passwordsMatch && confirmPassword
                        ? 'border-rose-500/50 focus:border-rose-500/50'
                        : 'border-white/10 focus:border-blue-500/50'
                    }`}
                    placeholder="Confirm new password"
                  />
                  {touched.confirm && !passwordsMatch && confirmPassword && (
                    <p className="text-xs text-rose-400 pl-1">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-teal-500 text-white font-medium text-sm hover:from-blue-400 hover:to-teal-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                      <span>Updating...</span>
                    </div>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Keyframes for star animation */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
