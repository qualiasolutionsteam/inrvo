import React, { memo } from 'react';

type GlassCardVariant = 'default' | 'elevated' | 'bordered';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  glow?: boolean;
  variant?: GlassCardVariant;
}

const GlassCard: React.FC<GlassCardProps> = memo(({
  children,
  className = "",
  onClick,
  hover = true,
  glow = false,
  variant = 'default'
}) => {
  const variantStyles: Record<GlassCardVariant, string> = {
    default: 'glass',
    elevated: 'glass-elevated',
    bordered: 'bg-transparent border border-white/10 backdrop-blur-xl'
  };

  return (
    <div
      onClick={onClick}
      className={`
        ${variantStyles[variant]}
        rounded-3xl p-6 transition-all duration-500 ease-out
        ${hover ? 'hover:scale-[1.02] hover:bg-white/5 cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/10 hover-lift btn-press' : ''}
        ${glow ? 'border-gradient-animated' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
});

GlassCard.displayName = 'GlassCard';

export default GlassCard;
