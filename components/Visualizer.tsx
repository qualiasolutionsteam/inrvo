import React, { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import * as d3 from 'd3';

interface VisualizerProps {
  isActive: boolean;
  intensity?: number; // 0 to 1
}

const Visualizer: React.FC<VisualizerProps> = memo(({ isActive, intensity = 0.5 }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(400);

  // Cache D3 selections to avoid re-querying the DOM
  const d3SelectionsRef = useRef<{
    path: d3.Selection<SVGPathElement, any, null, undefined> | null;
    path2: d3.Selection<SVGPathElement, any, null, undefined> | null;
    g: d3.Selection<SVGGElement, unknown, null, undefined> | null;
    initialized: boolean;
    lastSize: number;
  }>({ path: null, path2: null, g: null, initialized: false, lastSize: 0 });

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

  // Memoize line generator and points to avoid recreation
  const { line, points, radius, numPoints } = useMemo(() => {
    const np = size < 300 ? 80 : 120;
    const angleStep = (Math.PI * 2) / np;
    const r = size * 0.25;

    return {
      numPoints: np,
      radius: r,
      points: d3.range(np).map(i => ({ angle: i * angleStep, r })),
      line: d3.lineRadial<{ angle: number; r: number }>()
        .angle(d => d.angle)
        .radius(d => d.r)
        .curve(d3.curveBasisClosed)
    };
  }, [size]);

  // Initialize SVG structure only once, or when size changes significantly
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${size} ${size}`)
      .style('overflow', 'visible');

    // Only rebuild DOM structure if size changed or not initialized
    const selections = d3SelectionsRef.current;
    if (!selections.initialized || selections.lastSize !== size) {
      svg.selectAll('g').remove();

      const g = svg.append('g')
        .attr('transform', `translate(${size / 2}, ${size / 2})`);

      const path = g.append('path')
        .datum(points)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', 'url(#auraGradient)')
        .attr('stroke-width', size < 300 ? 1.5 : 2)
        .attr('filter', 'blur(1px)');

      const path2 = g.append('path')
        .datum(points)
        .attr('d', line)
        .attr('fill', 'url(#centerGradient)')
        .attr('stroke', 'none')
        .attr('opacity', 0.4);

      selections.g = g;
      selections.path = path;
      selections.path2 = path2;
      selections.initialized = true;
      selections.lastSize = size;
    }
  }, [size, points, line]);

  // Animation loop - separate from DOM structure initialization
  useEffect(() => {
    const selections = d3SelectionsRef.current;
    if (!selections.path || !selections.path2) return;

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

      // Update paths using cached selections (no DOM queries)
      selections.path!.attr('d', line(newPoints));
      selections.path2!.attr('d', line(newPoints));

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isActive, size, points, radius, line]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg ref={svgRef} className="w-full h-full">
        <defs>
          <linearGradient id="auraGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          <radialGradient id="centerGradient">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
});

Visualizer.displayName = 'Visualizer';

export default Visualizer;
