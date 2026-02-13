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
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Group React and Recharts together to avoid dependency issues with React 19
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('recharts')) {
                return 'vendor-core';
              }
              // Other large libraries still get their own chunks
              if (id.includes('tesseract.js') || id.includes('@google/genai')) {
                return 'vendor-ai';
              }
              if (id.includes('jspdf') || id.includes('pdf-lib')) {
                return 'vendor-pdf';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-ui';
              }
              return 'vendor-lib';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
