
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'sonner';
import './index.css';
import { AppRouter } from './src/router';
import { ModalProvider } from './src/contexts/ModalContext';
import { AudioProvider } from './src/contexts/AudioContext';
import { VoiceProvider } from './src/contexts/VoiceContext';
import { AppProvider } from './src/contexts/AppContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { ScriptProvider } from './src/contexts/ScriptContext';
import { LibraryProvider } from './src/contexts/LibraryContext';
import { AudioTagsProvider } from './src/contexts/AudioTagsContext';
import ErrorBoundary from './components/ErrorBoundary';

// Web vitals types for lazy-loaded module
type Metric = {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
};

// Initialize Sentry for error tracking
// DSN should be set via environment variable in production
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,

    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Session replay for debugging (sample 10% of sessions, 100% of errors)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Only enable in production
    enabled: import.meta.env.PROD,

    // Filter out noisy errors
    ignoreErrors: [
      // Browser extensions
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Network errors (user is offline)
      'Failed to fetch',
      'NetworkError',
      'Load failed',
    ],

    // Add user context when available
    beforeSend(event) {
      // Don't send events in development
      if (import.meta.env.DEV) {
        console.log('[Sentry] Would send event:', event);
        return null;
      }
      return event;
    },
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ModalProvider>
          <AudioProvider>
            <VoiceProvider>
              <ScriptProvider>
                <LibraryProvider>
                  <AudioTagsProvider>
                    <AppProvider>
                      <AppRouter />
                      <Toaster
                        position="top-center"
                        richColors
                        closeButton
                        duration={4000}
                        toastOptions={{
                          style: {
                            background: 'rgba(15, 23, 42, 0.95)',
                            border: '1px solid rgba(56, 189, 248, 0.2)',
                            backdropFilter: 'blur(12px)',
                            color: '#e2e8f0',
                          },
                        }}
                      />
                      <Analytics />
                    </AppProvider>
                  </AudioTagsProvider>
                </LibraryProvider>
              </ScriptProvider>
            </VoiceProvider>
          </AudioProvider>
        </ModalProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Web Vitals monitoring - Core Web Vitals + additional metrics
// Reports to console in development, could be sent to analytics in production
const reportWebVitals = (metric: Metric) => {
  // Log to console in development for debugging
  if (import.meta.env.DEV) {
    const color = metric.rating === 'good' ? '#0cce6b' : metric.rating === 'needs-improvement' ? '#ffa400' : '#ff4e42';
    console.log(
      `%c[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`,
      `color: ${color}; font-weight: bold;`
    );
  }

  // Send to Sentry in production for performance monitoring
  if (import.meta.env.PROD && SENTRY_DSN) {
    Sentry.addBreadcrumb({
      category: 'web-vitals',
      message: `${metric.name}: ${metric.value.toFixed(2)}ms`,
      level: metric.rating === 'good' ? 'info' : 'warning',
      data: {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
      },
    });
  }
};

// Lazy-load web-vitals for better initial bundle size (~5KB gzipped savings)
// Only load in production when Sentry is available for reporting
if (import.meta.env.PROD && SENTRY_DSN) {
  import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
    onCLS(reportWebVitals);  // Cumulative Layout Shift
    onFCP(reportWebVitals);  // First Contentful Paint
    onINP(reportWebVitals);  // Interaction to Next Paint (replaces FID as of 2024)
    onLCP(reportWebVitals);  // Largest Contentful Paint
    onTTFB(reportWebVitals); // Time to First Byte
  });
} else if (import.meta.env.DEV) {
  // In development, still load for debugging
  import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
    onCLS(reportWebVitals);
    onFCP(reportWebVitals);
    onINP(reportWebVitals);
    onLCP(reportWebVitals);
    onTTFB(reportWebVitals);
  });
}
