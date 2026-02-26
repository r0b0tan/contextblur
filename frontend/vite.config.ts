import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname),
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, '../public'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/transform': 'http://localhost:3000',
      '/models':    'http://localhost:3000',
    },
  },
});
