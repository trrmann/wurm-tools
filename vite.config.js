import { fileURLToPath } from 'url';
import { resolve, join } from 'path';
import os from 'os';
import { defineConfig } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // Relocate Vite cache outside synced cloud folders (e.g. OneDrive) to prevent EPERM file-lock errors on Windows
  cacheDir: join(os.tmpdir(), 'vite-wurm-tools'),
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        dashboard: resolve(rootDir, 'index.html'),
        concepts: resolve(rootDir, 'site/concepts/index.html'),
        serverStatus: resolve(rootDir, 'site/server-status/index.html'),
        mapExplorer: resolve(rootDir, 'site/map-explorer/index.html'),
      },
    },
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 4173,
  },
});
