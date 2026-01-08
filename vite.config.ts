import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isAnalyze = process.env.ANALYZE === 'true';
    // Use git commit hash for release tracking, fallback to timestamp
    const appVersion = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
                       new Date().toISOString().slice(0, 10).replace(/-/g, '');

    return {
      define: {
        __APP_VERSION__: JSON.stringify(appVersion),
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        // Bundle analyzer - run with ANALYZE=true npm run build
        isAnalyze && visualizer({
          filename: 'dist/stats.html',
          open: true,
          gzipSize: true,
          brotliSize: true,
        }),
      ].filter(Boolean),
      // Note: GEMINI_API_KEY is intentionally NOT exposed to frontend
      // All Gemini API calls go through Supabase Edge Functions (gemini-script)
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // Optimize dependency pre-bundling
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'react-router-dom',
          '@supabase/supabase-js',
          'framer-motion',
          'sonner',
        ],
        // Exclude large deps that are lazy-loaded
        exclude: ['@google/generative-ai'],
      },
      build: {
        // Code splitting configuration for smaller chunks
        rollupOptions: {
          output: {
            manualChunks: (id) => {
              // More granular chunking for better caching
              if (id.includes('node_modules')) {
                // React Router (separate from core React for better caching)
                if (id.includes('react-router') || id.includes('@remix-run')) {
                  return 'router-vendor';
                }
                // Core React - always needed (check after router to avoid overlap)
                if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) {
                  return 'react-vendor';
                }
                // Supabase client
                if (id.includes('@supabase')) {
                  return 'supabase-vendor';
                }
                // Sentry for error tracking
                if (id.includes('@sentry')) {
                  return 'sentry-vendor';
                }
                // Framer Motion - large animation library
                if (id.includes('framer-motion')) {
                  return 'framer-motion-vendor';
                }
                // Lucide icons - tree-shake but keep together
                if (id.includes('lucide-react')) {
                  return 'icons-vendor';
                }
                // Toast notifications
                if (id.includes('sonner')) {
                  return 'toast-vendor';
                }
                // Date/time utilities
                if (id.includes('date-fns')) {
                  return 'date-vendor';
                }
                // Markdown rendering
                if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype')) {
                  return 'markdown-vendor';
                }
                // Audio/media utilities
                if (id.includes('lamejs') || id.includes('audio')) {
                  return 'audio-vendor';
                }
              }
              return undefined;
            },
          },
          // Improve tree-shaking
          treeshake: {
            preset: 'recommended',
            moduleSideEffects: (id, external) => {
              // Mark CSS files as having side effects
              if (id.endsWith('.css')) return true;
              // Default: assume no side effects for better tree-shaking
              return false;
            },
          },
        },
        // Target modern browsers for smaller bundles
        target: 'es2020',
        // Enable minification optimizations
        minify: 'esbuild',
        // Increase chunk size warning threshold
        chunkSizeWarningLimit: 600,
        // Enable CSS code splitting
        cssCodeSplit: true,
        // Reduce inline limit for better caching
        assetsInlineLimit: 4096,
        // Enable source maps for production debugging
        sourcemap: mode === 'development',
      },
    };
});
