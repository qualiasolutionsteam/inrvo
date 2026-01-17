import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;
  isChunkError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  declare props: Props;
  declare setState: Component<Props, State>['setState'];
  state: State = { hasError: false, error: null, eventId: null, isChunkError: false };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Detect chunk loading errors (happens after deployments with stale cache)
    const isChunkError =
      error.message?.includes('dynamically imported module') ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch') ||
      error.name === 'ChunkLoadError';

    return { hasError: true, error, isChunkError };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Don't send chunk errors to Sentry (they're user cache issues, not bugs)
    // Lazy-load Sentry to avoid including it in the initial bundle
    if (!this.state.isChunkError && import.meta.env.PROD) {
      import('@sentry/react').then((Sentry) => {
        const eventId = Sentry.captureException(error, {
          extra: {
            componentStack: errorInfo.componentStack,
          },
        });
        this.setState({ eventId });
      }).catch(() => {
        // Sentry not available, skip reporting
      });
    }
  }

  handleHardRefresh = () => {
    // Clear cache and reload
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, isChunkError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Special UI for chunk loading errors
      if (this.state.isChunkError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
            <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center border border-white/20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sky-500/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-sky-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>

              <h1 className="text-2xl font-semibold text-white mb-2">
                Update Available
              </h1>

              <p className="text-white/70 mb-6">
                A new version of the app is available. Please refresh to get the latest updates.
              </p>

              <button
                onClick={this.handleHardRefresh}
                className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-sky-500 to-sky-500 hover:from-sky-600 hover:to-sky-600 text-white font-medium transition-all shadow-lg shadow-sky-500/20"
              >
                Refresh Now
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
          <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center border border-white/20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-semibold text-white mb-2">
              Something went wrong
            </h1>

            <p className="text-white/70 mb-6">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="text-left text-xs text-red-300 bg-red-900/20 rounded-lg p-4 mb-6 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
