import React, { Suspense, lazy } from 'react';

// Lazy load the Visualizer component (and D3 along with it)
const Visualizer = lazy(() => import('./Visualizer'));

interface LazyVisualizerProps {
  isActive: boolean;
  intensity?: number;
}

// Placeholder component shown when not active or while loading
function VisualizerPlaceholder({ size = 400 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Static placeholder orb */}
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 animate-pulse" />
    </div>
  );
}

// Loading spinner shown while Visualizer chunk loads
function VisualizerLoader({ size = 400 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div className="w-16 h-16 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );
}

/**
 * Lazy-loaded Visualizer component.
 *
 * Only loads the D3 library (~42KB gzipped) when the visualizer is actually active.
 * Shows a static placeholder when inactive, and a loading spinner while the chunk loads.
 */
export default function LazyVisualizer({ isActive, intensity }: LazyVisualizerProps) {
  // Don't load D3 until we actually need the visualizer
  if (!isActive) {
    return <VisualizerPlaceholder />;
  }

  return (
    <Suspense fallback={<VisualizerLoader />}>
      <Visualizer isActive={isActive} intensity={intensity} />
    </Suspense>
  );
}
