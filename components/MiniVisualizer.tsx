import React, { useEffect, useRef, memo, useMemo } from 'react';
import { range, createRadialLine } from '@/src/lib/svgUtils';

interface MiniVisualizerProps {
  isActive: boolean;
  size?: number;
}

const MiniVisualizer: React.FC<MiniVisualizerProps> = memo(({
  isActive,
  size = 40
}) => {
  const pathRef = useRef<SVGPathElement>(null);
  const path2Ref = useRef<SVGPathElement>(null);
  const isActiveRef = useRef(isActive);

  // Update ref when isActive changes (no re-render needed)
  isActiveRef.current = isActive;

  const numPoints = 32;
  const angleStep = (Math.PI * 2) / numPoints;
  const radius = size * 0.28;

  // Memoize base points
  const points = useMemo(() =>
    range(numPoints).map(i => ({
      angle: i * angleStep,
      r: radius
    })),
  [numPoints, angleStep, radius]);

  // Animation loop - uses refs for direct DOM manipulation
  useEffect(() => {
    const pathEl = pathRef.current;
    const path2El = path2Ref.current;
    if (!pathEl || !path2El) return;

    let t = 0;
    let animId: number;

    const animate = () => {
      const active = isActiveRef.current;
      t += active ? 0.025 : 0.008;

      const noiseMultiplier = active ? 5 : 1.5;
      const swellMultiplier = active ? 3 : 1;

      const newPoints = points.map((p, i) => {
        const noise = Math.sin(t + i * 0.25) * noiseMultiplier;
        const swell = Math.sin(t * 0.6) * swellMultiplier;
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
  }, [points, radius]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="flex-shrink-0"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="miniAuraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <radialGradient id="miniCenterGrad">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.7" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <path
          ref={pathRef}
          fill="none"
          stroke="url(#miniAuraGrad)"
          strokeWidth={1.5}
        />
        <path
          ref={path2Ref}
          fill="url(#miniCenterGrad)"
          opacity={0.5}
        />
      </g>
    </svg>
  );
});

MiniVisualizer.displayName = 'MiniVisualizer';

export default MiniVisualizer;
