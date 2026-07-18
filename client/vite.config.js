import { defineConfig } from 'vite';
import { resolve } from 'path';

const repoRoot = resolve(__dirname, '..');
const usePolling = process.env.VITE_DEV_POLLING === '1';

export default defineConfig({
  // Load VITE_* from repo-root .env (same place as server vars)
  envDir: repoRoot,
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    watch: {
      // Polling avoids ENOSPC when inotify limit is exhausted (Cursor + large web/ folder)
      usePolling,
      ...(usePolling ? { interval: 1000 } : {}),
      ignored: [
        `${repoRoot}/web/**`,
        `${repoRoot}/**/node_modules/**`,
        `${repoRoot}/.git/**`,
        `${repoRoot}/data/**`,
        `${repoRoot}/pbmp-implementation-pack/**`,
        `${repoRoot}/new blockly/**`,
      ],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        leads: 'leads.html',
        forms: 'forms.html',
      },
    },
  },
});
