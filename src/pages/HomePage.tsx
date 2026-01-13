import { lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';

const App = lazy(() => import('../../App'));
const LandingPage = lazy(() => import('./LandingPage'));

const PageLoader = () => (
  <div className="fixed inset-0 z-[100] bg-[#020617] flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
  </div>
);

const HomePage = () => {
  const { user, isLoading } = useAuth();

  // Wait for auth to finish before deciding what to show
  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      {user ? <App /> : <LandingPage />}
    </Suspense>
  );
};

export default HomePage;
