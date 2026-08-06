import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 5181,
    strictPort: false,
    open: '/car03-3d.html',
  },
  build: {
    outDir: 'dist-car03-3d',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'car03-3d.html'),
      },
    },
  },
});
