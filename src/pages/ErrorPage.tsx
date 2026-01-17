import { Link, useSearchParams } from 'react-router-dom';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';
import { useEffect, useRef, useMemo } from 'react';

// Whitelist of valid HTTP error codes
const VALID_ERROR_CODES = ['400', '401', '403', '404', '500', '502', '503', '504'] as const;
type ValidErrorCode = typeof VALID_ERROR_CODES[number];

// Sanitize and validate URL params to prevent XSS
function sanitizeErrorCode(code: string | null): ValidErrorCode {
  if (code && VALID_ERROR_CODES.includes(code as ValidErrorCode)) {
    return code as ValidErrorCode;
  }
  return '500';
}

function sanitizeMessage(message: string | null): string | null {
  if (!message) return null;
  // Strip HTML tags and limit length
  return message
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'&]/g, '') // Remove potential HTML entities
    .slice(0, 200);
}

export default function ErrorPage() {
  const starsRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();

  // Sanitize URL params to prevent XSS attacks
  const errorCode = useMemo(() => sanitizeErrorCode(searchParams.get('code')), [searchParams]);
  const errorMessage = useMemo(() => sanitizeMessage(searchParams.get('message')), [searchParams]);

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

  const handleRefresh = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-center px-8 relative overflow-hidden">
      {/* Stars background */}
      <div ref={starsRef} className="fixed inset-0 z-0 overflow-hidden" />

      {/* Content */}
      <div className="relative z-10 max-w-[480px]">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-rose-400" />
          </div>
        </div>

        <div
          className="text-[clamp(4rem,15vw,6rem)] font-bold leading-none mb-4"
          style={{
            background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {errorCode}
        </div>

        <h1 className="text-[clamp(1.5rem,4vw,2rem)] font-semibold mb-4 text-slate-200">
          Something went wrong
        </h1>

        <p className="text-slate-400 text-base leading-relaxed mb-8">
          {errorMessage || "Innrvo is experiencing some technical difficulties. Please try again in a moment."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-medium text-[0.9375rem] text-white transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
              boxShadow: '0 4px 20px -5px rgba(20, 184, 166, 0.3)',
            }}
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>

          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-medium text-[0.9375rem] text-slate-300 transition-all duration-200 hover:-translate-y-0.5 border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50"
          >
            <Home className="w-5 h-5" />
            Return Home
          </Link>
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
