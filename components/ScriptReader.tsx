import React, { useRef, useEffect, useMemo, memo, useState, useCallback } from 'react';

interface ScriptReaderProps {
  script: string;
  currentWordIndex: number;
  isPlaying: boolean;
}

const ScriptReader: React.FC<ScriptReaderProps> = memo(({
  script,
  currentWordIndex,
  isPlaying,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentWordRef = useRef<HTMLSpanElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const userScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse script into paragraphs
  const paragraphs = useMemo(() => {
    return script.split(/\n\n+/).filter(p => p.trim());
  }, [script]);

  // Track user scroll - disable auto-scroll for 3 seconds after user scrolls
  const handleScroll = useCallback(() => {
    setUserScrolled(true);
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    userScrollTimeoutRef.current = setTimeout(() => {
      setUserScrolled(false);
    }, 3000);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, []);

  // Auto-scroll to keep current word in view (only if user hasn't recently scrolled)
  useEffect(() => {
    if (currentWordRef.current && isPlaying && !userScrolled) {
      currentWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentWordIndex, isPlaying, userScrolled]);

  // Track global word index across paragraphs
  let globalWordIndex = 0;

  // Check if a token is an audio tag
  const isAudioTag = (token: string): boolean => {
    return /^\[.+\]$/.test(token.trim());
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      onTouchMove={handleScroll}
      className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-10 relative script-reader touch-pan-y"
    >
      {/* Top gradient mask */}
      <div className="fixed top-[60px] md:top-[80px] left-0 right-0 h-16 bg-gradient-to-b from-[#020617] via-[#020617]/80 to-transparent pointer-events-none z-10" />

      {/* Script content */}
      <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 pb-[calc(180px+env(safe-area-inset-bottom,0px))] md:pb-[calc(200px+env(safe-area-inset-bottom,0px))] pt-8">
        {paragraphs.map((paragraph, pIndex) => {
          // Split into tokens (words and audio tags)
          const tokens = paragraph.split(/(\s+|\[.+?\])/).filter(t => t.trim());

          return (
            <p
              key={pIndex}
              className="text-lg md:text-xl lg:text-2xl leading-relaxed md:leading-relaxed font-serif font-light text-center md:text-left"
            >
              {tokens.map((token, tIndex) => {
                // Handle audio tags specially
                if (isAudioTag(token)) {
                  return (
                    <span
                      key={`${pIndex}-${tIndex}`}
                      className="inline-block px-2 py-0.5 mx-1 text-xs md:text-sm rounded-full bg-indigo-500/10 text-indigo-400/70 font-sans font-medium"
                    >
                      {token}
                    </span>
                  );
                }

                // Regular word
                const thisWordIndex = globalWordIndex++;
                const isPast = thisWordIndex < currentWordIndex;
                const isCurrent = thisWordIndex === currentWordIndex;
                const isFuture = thisWordIndex > currentWordIndex;

                return (
                  <span
                    key={`${pIndex}-${tIndex}`}
                    ref={isCurrent ? currentWordRef : null}
                    className={`
                      transition-all duration-150 inline
                      ${isPast ? 'text-white/90' : ''}
                      ${isCurrent ? 'text-indigo-400 font-medium' : ''}
                      ${isFuture ? 'text-white/40' : ''}
                    `}
                    style={isCurrent ? {
                      textShadow: '0 0 20px rgba(129, 140, 248, 0.4)'
                    } : undefined}
                  >
                    {token}{' '}
                  </span>
                );
              })}
            </p>
          );
        })}
      </div>

      {/* Bottom gradient mask (above player) - accounts for safe-area-inset */}
      <div className="fixed bottom-[calc(140px+env(safe-area-inset-bottom,0px))] md:bottom-[calc(160px+env(safe-area-inset-bottom,0px))] left-0 right-0 h-20 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent pointer-events-none z-10" />
    </div>
  );
});

// Display name for React DevTools
ScriptReader.displayName = 'ScriptReader';

export default ScriptReader;
