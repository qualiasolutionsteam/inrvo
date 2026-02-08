import React, { lazy, Suspense, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Starfield from '../../components/Starfield';
import { useAuthModal } from '../contexts/modals/AuthModalContext';

const AuthModal = lazy(() => import('../../components/AuthModal'));

interface MarketingLayoutProps {
  children: ReactNode;
  className?: string;
}

const MarketingLayout: React.FC<MarketingLayoutProps> = ({ children, className = '' }) => {
  const { showAuthModal, authModalMode, openAuthModal, closeAuthModal } = useAuthModal();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <Starfield />
      </div>

      {/* Auth Modal - lazy loaded, only fetched when opened */}
      {showAuthModal && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={showAuthModal}
            onClose={closeAuthModal}
            onSuccess={closeAuthModal}
            initialMode={authModalMode}
          />
        </Suspense>
      )}

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-4"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Innrvo" className="h-8 w-auto" />
          </Link>

          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8">
            <Link to="/#features" className="text-sm text-slate-400 hover:text-white transition-colors">Features</Link>
            <Link to="/#how-it-works" className="text-sm text-slate-400 hover:text-white transition-colors">How It Works</Link>
            <Link to="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</Link>
            <Link to="/about" className="text-sm text-slate-400 hover:text-white transition-colors">About</Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openAuthModal('signin')}
              className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2"
            >
              Sign In
            </button>
            <button
              onClick={() => openAuthModal('signup')}
              className="text-sm text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] hover:border-white/[0.2] px-5 py-2 rounded-full transition-all duration-300"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </motion.div>

      {/* Page Content */}
      <div className={`relative z-10 ${className}`}>
        {children}
      </div>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 border-t border-white/[0.05]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <img src="/logo.png" alt="Innrvo" className="h-6 w-auto opacity-60" loading="lazy" />
            <span className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Innrvo. All rights reserved.</span>
          </div>
          <nav aria-label="Footer navigation" className="flex items-center gap-6">
            <Link to="/about" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">About</Link>
            <Link to="/how-it-works" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">How It Works</Link>
            <Link to="/pricing" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Pricing</Link>
            <Link to="/blog" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Blog</Link>
            <Link to="/terms" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Terms</Link>
            <Link to="/privacy" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default MarketingLayout;
