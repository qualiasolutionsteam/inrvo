/**
 * Lightweight SVG utilities to replace D3 dependency (~42KB → ~2KB)
 * Provides radial line generation with smooth curve interpolation
 */

/**
 * Creates an array of numbers from 0 to n-1
 */
export function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

interface RadialPoint {
  angle: number;
  r: number;
}

/**
 * Converts polar coordinates to Cartesian
 */
function polarToCartesian(angle: number, radius: number): [number, number] {
  return [radius * Math.cos(angle - Math.PI / 2), radius * Math.sin(angle - Math.PI / 2)];
}

/**
 * Creates a smooth closed radial line path using Catmull-Rom splines
 * This approximates D3's curveBasisClosed behavior
 */
export function createRadialLine(points: RadialPoint[]): string {
  if (points.length < 3) return '';

  // Convert to Cartesian coordinates
  const cartesian = points.map(p => polarToCartesian(p.angle, p.r));

  // For closed curves, we need to wrap points
  const extended = [
    cartesian[cartesian.length - 2],
    cartesian[cartesian.length - 1],
    ...cartesian,
    cartesian[0],
    cartesian[1],
  ];

  const pathParts: string[] = [];

  // Start at the first computed curve point
  const firstPoint = catmullRomPoint(extended[0], extended[1], extended[2], extended[3], 0);
  pathParts.push(`M ${firstPoint[0].toFixed(2)} ${firstPoint[1].toFixed(2)}`);

  // Generate curve segments
  for (let i = 1; i < extended.length - 2; i++) {
    const p0 = extended[i - 1];
    const p1 = extended[i];
    const p2 = extended[i + 1];
    const p3 = extended[i + 2];

    // Sample the curve at multiple points for smoothness
    for (let t = 0.25; t <= 1; t += 0.25) {
      const point = catmullRomPoint(p0, p1, p2, p3, t);
      pathParts.push(`L ${point[0].toFixed(2)} ${point[1].toFixed(2)}`);
    }
  }

  pathParts.push('Z');
  return pathParts.join(' ');
}

/**
 * Catmull-Rom spline interpolation
 * Provides smooth curve through control points
 */
function catmullRomPoint(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number
): [number, number] {
  const t2 = t * t;
  const t3 = t2 * t;

  // Catmull-Rom basis functions
  const x =
    0.5 * (
      2 * p1[0] +
      (-p0[0] + p2[0]) * t +
      (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
      (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
    );

  const y =
    0.5 * (
      2 * p1[1] +
      (-p0[1] + p2[1]) * t +
      (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
      (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
    );

  return [x, y];
}

/**
 * Factory function that creates a radial line generator
 * Mimics D3's lineRadial API
 */
export function lineRadial() {
  return {
    call: (points: RadialPoint[]) => createRadialLine(points)
  };
}
