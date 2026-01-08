import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';

// Lazy load all pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const PlayerPage = lazy(() => import('./pages/PlayerPage'));
const LibraryPage = lazy(() => import('./pages/LibraryPage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const VoicePage = lazy(() => import('./pages/VoicePage'));
const ClonePage = lazy(() => import('./pages/ClonePage'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const MarketingPage = lazy(() => import('./pages/marketing/MarketingPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const EmailVerifiedPage = lazy(() => import('./pages/EmailVerifiedPage'));
const ErrorPage = lazy(() => import('./pages/ErrorPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// ============================================================================
// Route Prefetching for instant navigation
// ============================================================================

// Map of routes to their import functions for prefetching
const routeImports: Record<string, () => Promise<unknown>> = {
  '/': () => import('./pages/HomePage'),
  '/play': () => import('./pages/PlayerPage'),
  '/library': () => import('./pages/LibraryPage'),
  '/templates': () => import('./pages/TemplatesPage'),
  '/voice': () => import('./pages/VoicePage'),
  '/clone': () => import('./pages/ClonePage'),
  '/how-it-works': () => import('./pages/HowItWorksPage'),
  '/about': () => import('./pages/AboutPage'),
  '/pricing': () => import('./pages/PricingPage'),
  '/marketing': () => import('./pages/marketing/MarketingPage'),
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
  '/': ['/library', '/templates', '/voice', '/play'],
  '/library': ['/', '/play', '/templates'],
  '/templates': ['/', '/library'],
  '/voice': ['/', '/clone', '/library'],
  '/clone': ['/voice', '/library'],
  '/pricing': ['/', '/library'],
  '/marketing': ['/', '/admin'],
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
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
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
        path: 'library',
        element: <LibraryPage />,
      },
      {
        path: 'templates',
        element: <TemplatesPage />,
      },
      {
        path: 'voice',
        element: <VoicePage />,
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
