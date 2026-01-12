import React, { useState, useEffect } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'logo' | 'glitch' | 'exit'>('logo');
  const [showRings, setShowRings] = useState(false);

  useEffect(() => {
    // Phase timing: logo (0.8s) -> glitch (0.6s) -> exit (0.6s) = ~2s total
    const logoTimer = setTimeout(() => {
      setPhase('glitch');
      setShowRings(true);
    }, 800);

    const glitchTimer = setTimeout(() => {
      setPhase('exit');
    }, 1400);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(glitchTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`loading-container ${phase === 'exit' ? 'loading-exit' : ''}`}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-slate-900/50 via-transparent to-transparent" />

      {/* Expanding rings */}
      {showRings && (
        <>
          <div
            className="expanding-ring"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              animationDelay: '0s'
            }}
          />
          <div
            className="expanding-ring"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              animationDelay: '0.3s'
            }}
          />
          <div
            className="expanding-ring"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              animationDelay: '0.6s'
            }}
          />
        </>
      )}

      {/* Logo */}
      <div className="loading-logo relative z-10">
        <img src="/logo.png" alt="Innrvo" className="h-12 md:h-16" />
      </div>


      {/* Subtle loading indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div
            className="w-1 h-1 rounded-full bg-cyan-500/50"
            style={{ animation: 'pulse 1.2s ease-in-out infinite', animationDelay: '0s' }}
          />
          <div
            className="w-1 h-1 rounded-full bg-cyan-500/50"
            style={{ animation: 'pulse 1.2s ease-in-out infinite', animationDelay: '0.15s' }}
          />
          <div
            className="w-1 h-1 rounded-full bg-cyan-500/50"
            style={{ animation: 'pulse 1.2s ease-in-out infinite', animationDelay: '0.3s' }}
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
