import { lazy, Suspense, useEffect, ComponentType } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, ScrollRestoration, useLocation, useRouteError } from 'react-router-dom';

// ============================================================================
// Chunk Loading Error Recovery
// ============================================================================

/**
 * Check if an error is related to stale chunks after deployment
 */
function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('dynamically imported module') ||
    msg.includes('failed to fetch') ||
    msg.includes('loading chunk') ||
    msg.includes('cross-origin') ||
    msg.includes('cors') ||
    msg.includes('script load') ||
    msg.includes('loading css chunk') ||
    msg.includes('unexpected token') // Often happens with stale HTML
  );
}

/**
 * Auto-refresh once for chunk errors, with infinite loop protection
 */
function handleChunkError(): boolean {
  const hasRefreshed = sessionStorage.getItem('chunk_refresh');
  if (!hasRefreshed) {
    sessionStorage.setItem('chunk_refresh', 'true');
    window.location.reload();
    return true; // Will reload
  }
  // Already tried, clear flag
  sessionStorage.removeItem('chunk_refresh');
  return false;
}

/**
 * Wraps lazy imports to handle chunk loading failures after deployments.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(() =>
    importFn().catch((error: Error) => {
      if (isChunkLoadError(error) && handleChunkError()) {
        return new Promise(() => {}); // Never resolves while reloading
      }
      throw error;
    })
  );
}

// Clear refresh flag on successful page load
if (typeof window !== 'undefined') {
  sessionStorage.removeItem('chunk_refresh');
}

// ============================================================================
// Error Boundary for Routes
// ============================================================================

/**
 * Friendly error UI that auto-refreshes for deployment errors
 */
function RouteErrorBoundary() {
  const error = useRouteError();

  // Check if this is a chunk/deployment error
  const isDeploymentError = isChunkLoadError(error);

  useEffect(() => {
    if (isDeploymentError) {
      // Auto-refresh after showing message briefly
      const timer = setTimeout(() => {
        if (handleChunkError()) return;
        // If we already refreshed, just reload without the flag logic
        window.location.reload();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isDeploymentError]);

  return (
    <div className="fixed inset-0 z-[200] bg-[#020617] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        {isDeploymentError ? (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-sky-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-sky-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">
              Updating to latest version...
            </h1>
            <p className="text-slate-400 text-sm">
              A new version was deployed. Refreshing automatically.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-slate-400 text-sm mb-6">
              We encountered an unexpected error. Please try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl transition-colors"
            >
              Refresh Page
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Lazy load all pages for code splitting (with chunk error recovery)
const HomePage = lazyWithRetry(() => import('./pages/HomePage'));
const PlayerPage = lazyWithRetry(() => import('./pages/PlayerPage'));
const LibraryPage = lazyWithRetry(() => import('./pages/LibraryPage'));
const TemplatesPage = lazyWithRetry(() => import('./pages/TemplatesPage'));
const VoicesPage = lazyWithRetry(() => import('./pages/VoicesPage'));
const ClonePage = lazyWithRetry(() => import('./pages/ClonePage'));
const HowItWorksPage = lazyWithRetry(() => import('./pages/HowItWorksPage'));
const AboutPage = lazyWithRetry(() => import('./pages/AboutPage'));
const TermsPage = lazyWithRetry(() => import('./pages/TermsPage'));
const PrivacyPage = lazyWithRetry(() => import('./pages/PrivacyPage'));
const VoiceEthicsPage = lazyWithRetry(() => import('./pages/VoiceEthicsPage'));
const PricingPage = lazyWithRetry(() => import('./pages/PricingPage'));
const AdminPage = lazyWithRetry(() => import('./pages/AdminPage'));
const MarketingPage = lazyWithRetry(() => import('./pages/marketing/MarketingPage'));
const BlogPage = lazyWithRetry(() => import('./pages/BlogPage'));
const BlogViewPage = lazyWithRetry(() => import('./pages/BlogViewPage'));
const ResetPasswordPage = lazyWithRetry(() => import('./pages/ResetPasswordPage'));
const EmailVerifiedPage = lazyWithRetry(() => import('./pages/EmailVerifiedPage'));
const ErrorPage = lazyWithRetry(() => import('./pages/ErrorPage'));
const NotFoundPage = lazyWithRetry(() => import('./pages/NotFoundPage'));

// ============================================================================
// Route Prefetching for instant navigation
// ============================================================================

// Map of routes to their import functions for prefetching
const routeImports: Record<string, () => Promise<unknown>> = {
  '/': () => import('./pages/HomePage'),
  '/play': () => import('./pages/PlayerPage'),
  '/my-audios': () => import('./pages/LibraryPage'),
  '/templates': () => import('./pages/TemplatesPage'),
  '/your-voices': () => import('./pages/VoicesPage'),
  '/clone': () => import('./pages/ClonePage'),
  '/how-it-works': () => import('./pages/HowItWorksPage'),
  '/about': () => import('./pages/AboutPage'),
  '/pricing': () => import('./pages/PricingPage'),
  '/marketing': () => import('./pages/marketing/MarketingPage'),
  '/blog': () => import('./pages/BlogPage'),
};

// Prefetch a route's chunk
const prefetchRoute = (path: string) => {
  const importFn = routeImports[path];
  if (importFn) {
    // Use requestIdleCallback for non-blocking prefetch
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => importFn().catch(() => {}));
    } else {
      setTimeout(() => importFn().catch(() => {}), 100);
    }
  }
};

// Routes to prefetch from each page (adjacency map)
const prefetchMap: Record<string, string[]> = {
  '/': ['/my-audios', '/templates', '/your-voices', '/play'],
  '/my-audios': ['/', '/play', '/templates'],
  '/templates': ['/', '/my-audios'],
  '/your-voices': ['/', '/clone', '/my-audios'],
  '/clone': ['/your-voices', '/my-audios'],
  '/pricing': ['/', '/my-audios'],
  '/marketing': ['/', '/admin'],
  '/blog': ['/', '/admin', '/marketing'],
};

// Hook to prefetch adjacent routes when a page loads
const usePrefetchAdjacent = () => {
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;
    const adjacentRoutes = prefetchMap[currentPath] || [];

    // Prefetch adjacent routes after a short delay
    const timer = setTimeout(() => {
      adjacentRoutes.forEach(prefetchRoute);
    }, 1000); // Wait 1s after page load

    return () => clearTimeout(timer);
  }, [location.pathname]);
};

// Simple loading spinner - minimal and fast
const PageLoader = () => (
  <div className="fixed inset-0 z-[100] bg-[#020617] flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
  </div>
);

// Root layout with scroll restoration and route prefetching
const RootLayout = () => {
  // Prefetch adjacent routes for instant navigation
  usePrefetchAdjacent();

  return (
    <>
      <ScrollRestoration />
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </>
  );
};

// Router configuration
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'play/:id?',
        element: <PlayerPage />,
      },
      {
        path: 'my-audios',
        element: <LibraryPage />,
      },
      {
        path: 'templates',
        element: <TemplatesPage />,
      },
      {
        path: 'your-voices',
        element: <VoicesPage />,
      },
      {
        path: 'clone',
        element: <ClonePage />,
      },
      {
        path: 'how-it-works',
        element: <HowItWorksPage />,
      },
      {
        path: 'about',
        element: <AboutPage />,
      },
      {
        path: 'terms',
        element: <TermsPage />,
      },
      {
        path: 'privacy',
        element: <PrivacyPage />,
      },
      {
        path: 'voice-ethics',
        element: <VoiceEthicsPage />,
      },
      {
        path: 'pricing',
        element: <PricingPage />,
      },
      {
        path: 'admin',
        element: <AdminPage />,
      },
      {
        path: 'marketing',
        element: <MarketingPage />,
      },
      {
        path: 'blog',
        element: <BlogViewPage />,
      },
      {
        path: 'blog/:slug',
        element: <BlogViewPage />,
      },
      {
        path: 'blog-admin',
        element: <BlogPage />,
      },
      {
        path: 'auth/reset-password',
        element: <ResetPasswordPage />,
      },
      {
        path: 'auth/verified',
        element: <EmailVerifiedPage />,
      },
      {
        path: 'error',
        element: <ErrorPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

// Router provider component
export const AppRouter = () => <RouterProvider router={router} />;
