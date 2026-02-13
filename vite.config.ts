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
              // Heavy AI and PDF libraries are safely split as they are mostly standalone/worker-based
              if (id.includes('tesseract.js') || id.includes('@google/genai')) {
                return 'vendor-ai';
              }
              if (id.includes('jspdf') || id.includes('pdf-lib')) {
                return 'vendor-pdf';
              }
              // Keep all UI and Core libs together to avoid reference issues (like lucide-react or recharts)
              return 'vendor';
            }
          },
        },
      },
      chunkSizeWarningLimit: 2000,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
