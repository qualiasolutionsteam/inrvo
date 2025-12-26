import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, ScrollRestoration } from 'react-router-dom';

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

// Loading spinner component
const PageLoader = () => (
  <div className="fixed inset-0 z-[100] bg-[#0f172a] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
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
    ],
  },
]);

// Router provider component
export const AppRouter = () => <RouterProvider router={router} />;
