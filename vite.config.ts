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
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        minify: true,
        cssMinify: true,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('react') || id.includes('react-dom')) {
                  return 'vendor-react';
                }
                if (id.includes('@supabase') || id.includes('firebase')) {
                  return 'vendor-db';
                }
                if (id.includes('lucide-react')) {
                  return 'vendor-icons';
                }
                if (id.includes('@google/genai')) {
                  return 'vendor-ai';
                }
                return 'vendor';
              }
            }
          }
        }
      }
    };
});
