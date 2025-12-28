import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useAuthModal } from '../../../contexts/modals/AuthModalContext';
import { isMarketingAuthorized } from '../constants/auth';
import { Lock, LogIn, ShieldX, Loader2 } from 'lucide-react';

interface MarketingAuthGateProps {
  children: React.ReactNode;
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-slate-500">Loading...</p>
      </div>
    </div>
  );
}

function LoginPrompt({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-teal-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Marketing Hub
        </h1>
        <p className="text-slate-500 mb-6">
          Please sign in to access the Marketing Hub
        </p>

        <button
          onClick={onLogin}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          Sign In
        </button>

        <a
          href="/"
          className="mt-4 inline-block text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          &larr; Back to Home
        </a>
      </div>
    </div>
  );
}

function UnauthorizedMessage({ email }: { email?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Access Denied
        </h1>
        <p className="text-slate-500 mb-4">
          Sorry, you don't have access to the Marketing Hub.
        </p>
        {email && (
          <p className="text-sm text-slate-400 mb-6">
            Signed in as: {email}
          </p>
        )}

        <a
          href="/"
          className="inline-block w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-xl transition-colors"
        >
          &larr; Back to Home
        </a>
      </div>
    </div>
  );
}

export function MarketingAuthGate({ children }: MarketingAuthGateProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();

  // Loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Not logged in - show login prompt
  if (!isAuthenticated) {
    return <LoginPrompt onLogin={openAuthModal} />;
  }

  // Logged in but not authorized
  if (!isMarketingAuthorized(user?.email)) {
    return <UnauthorizedMessage email={user?.email} />;
  }

  // Authorized - render children
  return <>{children}</>;
}
