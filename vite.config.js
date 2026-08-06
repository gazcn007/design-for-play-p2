import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5180,
    strictPort: true,
    open: false,
    // This project lives in an iCloud-managed Documents folder. Hydrating an
    // asset updates metadata on hundreds of files, which Vite previously
    // interpreted as source edits and turned into a reload storm. The game is
    // playtested in long, stateful sessions, so an unsolicited reload is much
    // more damaging than needing one deliberate browser refresh after a code
    // change. Keep the dev transform/QA routes, but make preview sessions
    // stable and manual-refresh only.
    hmr: false,
    watch: {
      ignored: ['**/*'],
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
