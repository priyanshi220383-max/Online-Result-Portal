import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The single .env file lives in the project root (one level up).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '');
  return {
    envDir: '..',
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        // In development the browser calls /api and Vite forwards it to the backend.
        '/api': { target: env.VITE_DEV_PROXY_TARGET || 'http://localhost:5000', changeOrigin: true },
      },
    },
  };
});
