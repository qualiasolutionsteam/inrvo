import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, ScrollRestoration } from 'react-router-dom';
import { ChronosLoader } from '@/components/ui/chronos-engine';

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
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Loading spinner component - uses ChronosEngine for visual consistency
const PageLoader = () => (
  <div className="fixed inset-0 z-[100] bg-[#020617] flex items-center justify-center">
    <ChronosLoader message="Loading..." />
  </div>
);

// Root layout with scroll restoration
const RootLayout = () => (
  <>
    <ScrollRestoration />
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  </>
);

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
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

// Router provider component
export const AppRouter = () => <RouterProvider router={router} />;
