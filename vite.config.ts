import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // Note: GEMINI_API_KEY is intentionally NOT exposed to frontend
      // All Gemini API calls go through Supabase Edge Functions (gemini-script)
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Code splitting configuration for smaller chunks
        rollupOptions: {
          output: {
            manualChunks: {
              // Split vendor chunks for better caching
              'react-vendor': ['react', 'react-dom'],
              'supabase-vendor': ['@supabase/supabase-js'],
              'sentry-vendor': ['@sentry/react'],
              // Google GenAI removed from manual chunks - already lazy-loaded in geminiService.ts
              // This saves ~50KB gzipped from initial bundle (only loads when fallback needed)
              // Framer Motion is large (~120KB), separate for better caching
              'framer-motion-vendor': ['framer-motion'],
            },
          },
        },
        // Target modern browsers for smaller bundles
        target: 'es2020',
        // Increase chunk size warning threshold (Sentry is large but necessary)
        chunkSizeWarningLimit: 600,
      },
    };
});
