import React, { useMemo, useState, useEffect, memo } from 'react';

type StarType = 'normal' | 'glitcher' | 'artifact' | 'pulsar';

interface Star {
  id: number;
  type: StarType;
  top: string;
  left: string;
  size: string;
  duration: string;
  delay: string;
  color: string;
  glowColor: string;
  glowRadius: string;
  glowSpread: string;
  animClass: string;
  baseOpacity: number;
}

interface NeuralPulse {
  id: number;
  x: number;
  y: number;
}

// Memoized star component to prevent unnecessary re-renders
const Star = memo<{ star: Star }>(({ star }) => (
  <div
    className={`star ${star.animClass}`}
    style={{
      top: star.top,
      left: star.left,
      width: star.size,
      height: star.size,
      backgroundColor: star.color,
      '--duration': star.duration,
      '--glow-color': star.glowColor,
      '--glow-radius': star.glowRadius,
      '--glow-spread': star.glowSpread,
      '--base-opacity': star.baseOpacity,
      animationDelay: star.delay,
      opacity: star.baseOpacity,
      // Only use will-change for special stars, reduces GPU memory
      willChange: star.type !== 'normal' ? 'transform, opacity' : 'auto',
      // Use transform3d for GPU acceleration
      transform: 'translateZ(0)',
    } as React.CSSProperties}
  />
));

Star.displayName = 'Star';

const Starfield: React.FC = () => {
  const [pulses, setPulses] = useState<NeuralPulse[]>([]);

  // Detect mobile for performance optimization - memoized
  const isMobile = useMemo(() =>
    typeof window !== 'undefined' && window.innerWidth < 768,
  []);

  // Reduce star count significantly on mobile for better performance
  const starCount = isMobile ? 100 : 200;

  const stars = useMemo(() => {
    return Array.from({ length: starCount }).map((_, i): Star => {
      const rand = Math.random();

      // Star type distribution (Moderate intensity)
      // 70% normal, 15% glitcher, 8% artifact, 7% pulsar
      let type: StarType = 'normal';
      if (rand > 0.93) type = 'artifact';      // 7%
      else if (rand > 0.85) type = 'glitcher'; // 8%
      else if (rand > 0.78) type = 'pulsar';   // 7%
      // remaining 78% split between normal animations

      const isLarge = rand > 0.92;
      const hasExtraGlow = isLarge && Math.random() > 0.4;

      // Color palette
      const colorType = Math.random();
      let color = 'white';
      let glowColor = 'rgba(255, 255, 255, 0.3)';

      if (colorType > 0.85) {
        color = '#bae6fd'; // sky-200 - cyan tint
        glowColor = 'rgba(186, 230, 253, 0.4)';
      } else if (colorType > 0.7) {
        color = '#c4b5fd'; // violet-300 - purple tint
        glowColor = 'rgba(196, 181, 253, 0.4)';
      } else if (colorType < 0.1) {
        color = '#f5f3ff'; // violet-50 - light lavender
        glowColor = 'rgba(245, 243, 255, 0.4)';
      }

      // Animation class based on type
      let animClass = 'animate-shine';
      let duration = `${Math.random() * 7 + 4}s`;

      switch (type) {
        case 'glitcher':
          animClass = 'animate-glitch';
          duration = `${Math.random() * 4 + 4}s`; // 4-8s cycle
          break;
        case 'artifact':
          animClass = 'animate-artifact';
          duration = `${Math.random() * 4 + 6}s`; // 6-10s cycle
          break;
        case 'pulsar':
          animClass = 'animate-pulsar';
          duration = `${Math.random() * 3 + 2}s`; // 2-5s cycle
          break;
        default:
          // Normal stars: 30% twinkle (fast), 70% shine (slow)
          if (Math.random() < 0.3) {
            animClass = 'animate-twinkle';
            duration = `${Math.random() * 2 + 1}s`;
          }
      }

      return {
        id: i,
        type,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size: isLarge ? `${Math.random() * 2 + 1.8}px` : `${Math.random() * 1.5 + 0.5}px`,
        duration,
        delay: `${Math.random() * 10}s`,
        color,
        glowColor,
        glowRadius: hasExtraGlow ? '18px' : '10px',
        glowSpread: hasExtraGlow ? '5px' : '2px',
        animClass,
        baseOpacity: type === 'pulsar' ? Math.random() * 0.3 + 0.3 : Math.random() * 0.4 + 0.1
      };
    });
  }, [starCount]);

  // Neural pulse wave effect - triggers every 8-12 seconds
  useEffect(() => {
    if (isMobile) return; // Disable on mobile for performance

    const triggerPulse = () => {
      const newPulse: NeuralPulse = {
        id: Date.now(),
        x: Math.random() * 100,
        y: Math.random() * 100
      };
      setPulses(prev => [...prev, newPulse]);

      // Remove pulse after animation completes
      setTimeout(() => {
        setPulses(prev => prev.filter(p => p.id !== newPulse.id));
      }, 2500);
    };

    // Initial delay before first pulse
    const initialDelay = setTimeout(triggerPulse, 3000);

    // Recurring pulses
    const interval = setInterval(() => {
      triggerPulse();
    }, 8000 + Math.random() * 4000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [isMobile]);

  return (
    <div className={`stars-container ${!isMobile ? 'starfield-scanlines' : ''}`}>
      {/* Stars - using memoized Star component */}
      {stars.map((star) => (
        <Star key={star.id} star={star} />
      ))}

      {/* Neural pulse waves */}
      {pulses.map((pulse) => (
        <div
          key={pulse.id}
          className="neural-wave"
          style={{
            top: `${pulse.y}%`,
            left: `${pulse.x}%`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}

      {/* Dark overlay for the background image */}
      <div className="absolute inset-0 bg-slate-950/60 pointer-events-none" />
      
      {/* Gradient overlays - reduced opacity to show background image */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-slate-950/10 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.04) 0%, transparent 60%)'
        }}
      />
    </div>
  );
};

export default memo(Starfield);
