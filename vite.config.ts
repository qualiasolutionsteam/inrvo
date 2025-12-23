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
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
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
              // Google GenAI in separate chunk for better caching (large dependency)
              'genai-vendor': ['@google/genai'],
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
