import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// `command` and `mode` are the only two inputs that decide whether this build
// may skip ahead. `npm run dev` serves in development mode and gets the
// chapter select; `npm run prod` serves the same code in production mode and
// gets the real run; `npm run build` is a production bundle either way. Mode
// comes straight off the CLI flag, so this does not depend on NODE_ENV and
// behaves the same on every machine.
export default defineConfig(({ command, mode }) => {
  const devMode = command === 'serve' && mode !== 'production';

  return {
    define: {
      __DEV_MODE__: JSON.stringify(devMode),
    },
    server: {
      port: devMode ? 5180 : 5181,
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
      rollupOptions: {
        input: {
          main: resolve(import.meta.dirname, 'index.html'),
          chapter01Opening: resolve(import.meta.dirname, 'chapter01-opening.html'),
        },
      },
    },
  };
});
