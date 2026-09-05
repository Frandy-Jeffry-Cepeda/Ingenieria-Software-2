import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo el frontend llama a /api y Vite lo redirige al backend local,
// igual que hace nginx en producción. Así el código es idéntico en ambos casos.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.DEV_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
