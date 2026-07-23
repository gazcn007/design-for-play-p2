import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5180,
    strictPort: true,
    open: false,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
