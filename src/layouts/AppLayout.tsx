import React, { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Starfield from '../../components/Starfield';
import { ICONS } from '../../constants';

interface AppLayoutProps {
  children: ReactNode;
  showBackButton?: boolean;
  backTo?: string;
  className?: string;
}

// Navigation icons
const NavIcons = {
  Menu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Close: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  Home: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  ),
  Library: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  ),
  Templates: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  Voice: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
  HowItWorks: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v.01M12 8a2 2 0 012 2c0 1-1 1.5-1.5 2s-.5 1-.5 1.5" />
    </svg>
  ),
};

// Navigation items
const navItems = [
  { path: '/', label: 'Home', icon: NavIcons.Home },
  { path: '/my-audios', label: 'My Audios', icon: NavIcons.Library },
  { path: '/templates', label: 'Templates', icon: NavIcons.Templates },
  { path: '/your-voices', label: 'Your Voices', icon: NavIcons.Voice },
  { path: '/how-it-works', label: 'How it works', icon: NavIcons.HowItWorks },
];

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  showBackButton = false,
  backTo = '/',
  className = '',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavOpen, setIsNavOpen] = useState(false);

  const handleNavigation = (path: string) => {
    setIsNavOpen(false);
    navigate(path);
  };

  return (
    <div className={`min-h-screen bg-[#020617] ${className}`}>
      <Starfield />

      {/* Hamburger Menu Button - hidden when sidebar is open */}
      {!isNavOpen && (
        <button
          onClick={() => setIsNavOpen(true)}
          className="fixed top-6 left-6 md:top-8 md:left-8 z-[100] w-12 h-12 min-w-[44px] min-h-[44px] rounded-full border border-white/[0.06] bg-white/[0.02] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] hover:border-sky-500/20 transition-all"
          aria-label="Open navigation"
        >
          <NavIcons.Menu />
        </button>
      )}

      {/* Back Button (shown alongside menu if needed) */}
      {showBackButton && (
        <button
          onClick={() => navigate(backTo)}
          className="fixed top-6 left-20 md:top-8 md:left-24 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-[100]"
        >
          <div className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full border border-white/[0.06] bg-white/[0.02] flex items-center justify-center group-hover:bg-white/[0.08] group-hover:scale-105 group-hover:border-sky-500/20 transition-all">
            <ICONS.ArrowBack className="w-5 h-5" />
          </div>
          <span className="hidden md:inline text-[11px] font-medium uppercase tracking-[0.25em] text-slate-500 group-hover:text-white transition-colors">Back</span>
        </button>
      )}

      {/* Navigation Drawer */}
      <AnimatePresence mode="wait">
        {isNavOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNavOpen(false)}
              className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
            />

            {/* Sidebar Panel */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0, transition: { type: 'spring', damping: 30, stiffness: 300 } }}
              exit={{ x: '-100%', transition: { type: 'spring', damping: 30, stiffness: 300 } }}
              className="fixed top-0 left-0 h-full w-[280px] z-[95] flex flex-col bg-[#0a0f1a] border-r border-white/[0.04]"
            >
              {/* Header */}
              <div className="flex items-center justify-between h-14 px-4 border-b border-white/[0.04]">
                <button
                  onClick={() => handleNavigation('/')}
                  className="text-white font-semibold text-lg hover:opacity-80 transition-opacity"
                >
                  Innrvo
                </button>
                <button
                  onClick={() => setIsNavOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  <NavIcons.Close />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 hover:translate-x-0.5 ${
                        isActive
                          ? 'bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                          : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Footer */}
              <div className="px-4 py-4 border-t border-white/[0.04]">
                <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500">
                  <button onClick={() => handleNavigation('/about')} className="hover:text-slate-300 transition-colors">
                    About
                  </button>
                  <span className="text-slate-700">·</span>
                  <button onClick={() => handleNavigation('/terms')} className="hover:text-slate-300 transition-colors">
                    Terms
                  </button>
                  <span className="text-slate-700">·</span>
                  <button onClick={() => handleNavigation('/privacy')} className="hover:text-slate-300 transition-colors">
                    Privacy
                  </button>
                </div>
                <p className="text-[9px] text-slate-600 text-center pt-2">© {new Date().getFullYear()} Innrvo</p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default AppLayout;
