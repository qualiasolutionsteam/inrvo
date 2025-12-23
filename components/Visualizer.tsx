import React, { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import { range, createRadialLine } from '@/src/lib/svgUtils';

interface VisualizerProps {
  isActive: boolean;
  intensity?: number; // 0 to 1
}

const Visualizer: React.FC<VisualizerProps> = memo(({ isActive, intensity = 0.5 }) => {
  const pathRef = useRef<SVGPathElement>(null);
  const path2Ref = useRef<SVGPathElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(400);

  // Responsive sizing
  const updateSize = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let newSize: number;
    if (vw < 640) {
      // Mobile: max 35% viewport height or width - 48px, whichever is smaller
      newSize = Math.min(vw - 48, vh * 0.35, 280);
    } else if (vw < 1024) {
      // Tablet
      newSize = Math.min(vw * 0.45, 350);
    } else {
      // Desktop
      newSize = 400;
    }

    setSize(Math.max(200, newSize)); // Minimum 200px
  }, []);

  useEffect(() => {
    updateSize();

    // Debounced resize handler
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateSize, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [updateSize]);

  // Memoize base points configuration
  const { points, radius, numPoints } = useMemo(() => {
    const np = size < 300 ? 80 : 120;
    const angleStep = (Math.PI * 2) / np;
    const r = size * 0.25;

    return {
      numPoints: np,
      radius: r,
      points: range(np).map(i => ({ angle: i * angleStep, r }))
    };
  }, [size]);

  // Animation loop using refs for direct DOM manipulation
  useEffect(() => {
    const pathEl = pathRef.current;
    const path2El = path2Ref.current;
    if (!pathEl || !path2El) return;

    let t = 0;
    let animId: number;

    const animate = () => {
      t += isActive ? 0.02 : 0.005;

      // Scale animation intensity based on size
      const noiseMultiplier = isActive ? (size < 300 ? 18 : 25) : (size < 300 ? 3 : 5);
      const swellMultiplier = size < 300 ? 10 : 15;

      const newPoints = points.map((p, i) => {
        const noise = Math.sin(t + i * 0.2) * noiseMultiplier;
        const swell = Math.sin(t * 0.5) * swellMultiplier;
        return {
          angle: p.angle,
          r: radius + noise + swell
        };
      });

      const pathD = createRadialLine(newPoints);
      pathEl.setAttribute('d', pathD);
      path2El.setAttribute('d', pathD);

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isActive, size, points, radius]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="auraGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <radialGradient id="centerGradient">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={`translate(${size / 2}, ${size / 2})`}>
          <path
            ref={pathRef}
            fill="none"
            stroke="url(#auraGradient)"
            strokeWidth={size < 300 ? 1.5 : 2}
            style={{ filter: 'blur(1px)' }}
          />
          <path
            ref={path2Ref}
            fill="url(#centerGradient)"
            stroke="none"
            opacity={0.4}
          />
        </g>
      </svg>
    </div>
  );
});

Visualizer.displayName = 'Visualizer';

export default Visualizer;
