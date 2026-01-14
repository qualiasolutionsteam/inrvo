
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'sonner';
import './index.css';
import { AppRouter } from './src/router';
import { ModalProvider } from './src/contexts/ModalContext';
import { AuthModalProvider } from './src/contexts/modals/AuthModalContext';
import { AudioProvider } from './src/contexts/AudioContext';
import { AppProvider } from './src/contexts/AppContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { ScriptProvider } from './src/contexts/ScriptContext';
import { LibraryProvider } from './src/contexts/LibraryContext';
import { AudioTagsProvider } from './src/contexts/AudioTagsContext';
import { ChatHistoryProvider } from './src/contexts/ChatHistoryContext';
import { OnboardingProvider } from './src/contexts/OnboardingContext';
import { StreamingGenerationProvider } from './src/contexts/StreamingGenerationContext';
import ErrorBoundary from './components/ErrorBoundary';

// Web vitals types for lazy-loaded module
type Metric = {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
};

// Sentry DSN from environment
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

// Lazy-load Sentry to improve initial page load performance (~85KB saved from critical path)
// Deferred to after first paint using requestIdleCallback
if (SENTRY_DSN && import.meta.env.PROD) {
  const initSentry = () => {
    import('@sentry/react').then((Sentry) => {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: import.meta.env.MODE,
        release: `inrvo@${__APP_VERSION__}`,

        // Send default PII (IP address on events)
        sendDefaultPii: true,

        // Enable Sentry Logs
        _experiments: {
          enableLogs: true,
        },

        // Integrations
        integrations: [
          // Capture console.error and console.warn as Sentry logs
          Sentry.consoleLoggingIntegration({ levels: ['error', 'warn'] }),
          // Browser tracing for performance
          Sentry.browserTracingIntegration(),
          // Session replay
          Sentry.replayIntegration({
            maskAllText: false,
            blockAllMedia: false,
          }),
        ],

        // Performance monitoring
        tracesSampleRate: 0.1,

        // Session replay for debugging (sample 10% of sessions, 100% of errors)
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,

        // Only enable in production
        enabled: true,

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
          return event;
        },
      });
    }).catch((err) => {
      console.warn('[Sentry] Failed to load:', err);
    });
  };

  // Defer Sentry initialization to after first paint
  if ('requestIdleCallback' in window) {
    requestIdleCallback(initSentry, { timeout: 3000 });
  } else {
    // Fallback for Safari and older browsers
    setTimeout(initSentry, 1000);
  }
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
        <AuthModalProvider>
          <ModalProvider>
            <AudioProvider>
              <StreamingGenerationProvider>
                <ScriptProvider>
                  <LibraryProvider>
                    <AudioTagsProvider>
                      <ChatHistoryProvider>
                        <AppProvider>
                          <OnboardingProvider>
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
                          </OnboardingProvider>
                        </AppProvider>
                      </ChatHistoryProvider>
                    </AudioTagsProvider>
                  </LibraryProvider>
                </ScriptProvider>
              </StreamingGenerationProvider>
            </AudioProvider>
          </ModalProvider>
        </AuthModalProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Web Vitals monitoring - Core Web Vitals + additional metrics
// Reports to console in development, sends to Sentry in production
const reportWebVitals = (metric: Metric) => {
  // Log to console in development for debugging
  if (import.meta.env.DEV) {
    const color = metric.rating === 'good' ? '#0cce6b' : metric.rating === 'needs-improvement' ? '#ffa400' : '#ff4e42';
    console.log(
      `%c[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)}${metric.name === 'CLS' ? '' : 'ms'} (${metric.rating})`,
      `color: ${color}; font-weight: bold;`
    );
  }

  // Send to Sentry in production for performance monitoring (lazy-loaded)
  if (import.meta.env.PROD && SENTRY_DSN) {
    import('@sentry/react').then((Sentry) => {
      // Add as breadcrumb for context
      Sentry.addBreadcrumb({
        category: 'web-vitals',
        message: `${metric.name}: ${metric.value.toFixed(2)}${metric.name === 'CLS' ? '' : 'ms'}`,
        level: metric.rating === 'good' ? 'info' : 'warning',
        data: {
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id,
        },
      });

      // Set as custom measurement for Sentry performance monitoring
      Sentry.setMeasurement(metric.name, metric.value, metric.name === 'CLS' ? '' : 'millisecond');

      // Report poor metrics as issues for alerting
      if (metric.rating === 'poor') {
        Sentry.captureMessage(`Poor Web Vital: ${metric.name}`, {
          level: 'warning',
          tags: {
            webVital: metric.name,
            rating: metric.rating,
          },
          extra: {
            value: metric.value,
            delta: metric.delta,
            id: metric.id,
          },
        });
      }
    }).catch(() => {
      // Sentry not loaded yet, skip reporting
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
