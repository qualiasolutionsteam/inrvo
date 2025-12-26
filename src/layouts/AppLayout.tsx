import React, { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Starfield from '../../components/Starfield';
import { ICONS } from '../../constants';

interface AppLayoutProps {
  children: ReactNode;
  showBackButton?: boolean;
  backTo?: string;
  className?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  showBackButton = false,
  backTo = '/',
  className = '',
}) => {
  const navigate = useNavigate();

  return (
    <div className={`min-h-screen bg-[#020617] ${className}`}>
      <Starfield />

      {showBackButton && (
        <button
          onClick={() => navigate(backTo)}
          className="fixed top-6 left-6 md:top-8 md:left-8 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-[100]"
        >
          <div className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full border border-white/[0.06] bg-white/[0.02] flex items-center justify-center group-hover:bg-white/[0.08] group-hover:scale-105 group-hover:border-cyan-500/20 transition-all">
            <ICONS.ArrowBack className="w-5 h-5" />
          </div>
          <span className="hidden md:inline text-[11px] font-medium uppercase tracking-[0.25em] text-slate-500 group-hover:text-white transition-colors">Back</span>
        </button>
      )}

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default AppLayout;
