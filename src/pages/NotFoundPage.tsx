import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function NotFoundPage() {
  const starsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = starsRef.current;
    if (!container) return;

    // Generate stars
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

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-center px-8 relative overflow-hidden">
      {/* Stars background */}
      <div ref={starsRef} className="fixed inset-0 z-0 overflow-hidden" />

      {/* Content */}
      <div className="relative z-10 max-w-[480px]">
        <div
          className="text-[clamp(6rem,20vw,10rem)] font-bold leading-none mb-4"
          style={{
            background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          404
        </div>

        <h1 className="text-[clamp(1.5rem,4vw,2rem)] font-semibold mb-4 text-slate-200">
          Page not found
        </h1>

        <p className="text-slate-400 text-base leading-relaxed mb-8">
          The page you're looking for doesn't exist or has been moved.
          Let's get you back to your meditation practice.
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-medium text-[0.9375rem] text-white transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
            boxShadow: '0 4px 20px -5px rgba(20, 184, 166, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(20, 184, 166, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 20px -5px rgba(20, 184, 166, 0.3)';
          }}
        >
          <Home className="w-5 h-5" />
          Return Home
        </Link>
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
