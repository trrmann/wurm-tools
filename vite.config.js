import { fileURLToPath } from 'url';
import { resolve, join } from 'path';
import os from 'os';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import { HEROES_PAGES } from './src/js/modules/pages/heroes-navigation.js';
import { heroesThemePlugin } from './scripts/heroes-theme-plugin.js';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '**/.installer-cache/**', '**/artifacts/**'],
  },
  plugins: [heroesThemePlugin()],
  // Relocate Vite cache outside synced cloud folders (e.g. OneDrive) to prevent EPERM file-lock errors on Windows
  cacheDir: join(os.tmpdir(), 'vite-wurm-tools'),
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        login: resolve(rootDir, 'index.html'),
        dashboard: resolve(rootDir, 'site/wurm/index.html'),
        concepts: resolve(rootDir, 'site/concepts/index.html'),
        serverStatus: resolve(rootDir, 'site/server-status/index.html'),
        mapExplorer: resolve(rootDir, 'site/map-explorer/index.html'),
        heroes: resolve(rootDir, 'site/heroes/index.html'),
        heroesPeople: resolve(rootDir, 'site/heroes/people/index.html'),
        ...Object.fromEntries(
          HEROES_PAGES.filter(
            (page) => !['/site/heroes/', '/site/heroes/people/'].includes(page.href)
          ).map((page) => [
            `heroes-${page.href.split('/').filter(Boolean).slice(2).join('-')}`,
            resolve(rootDir, `.${page.href}index.html`),
          ])
        ),
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
