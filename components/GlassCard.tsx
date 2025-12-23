import React, { memo } from 'react';

type GlassCardVariant = 'default' | 'elevated' | 'bordered' | 'magic';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  variant?: GlassCardVariant;
  animate?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = memo(({
  children,
  className = "",
  onClick,
  hover = true,
  variant = 'default',
  animate = false
}) => {
  const variantStyles: Record<GlassCardVariant, string> = {
    default: 'glass',
    elevated: 'glass-elevated',
    bordered: 'bg-transparent border border-white/10 backdrop-blur-xl',
    magic: 'glass-elevated border-gradient-animated'
  };

  return (
    <div
      onClick={onClick}
      className={`
        ${variantStyles[variant]}
        rounded-3xl p-6
        transition-all duration-200 ease-out
        ${hover ? 'hover:scale-[1.01] hover:bg-white/[0.04] cursor-pointer hover:border-cyan-500/20 btn-press' : ''}
        ${animate ? 'animate-in fade-in slide-in-from-bottom-2' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
});

GlassCard.displayName = 'GlassCard';

export default GlassCard;
