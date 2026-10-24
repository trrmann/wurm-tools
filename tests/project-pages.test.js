import { afterEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import viteConfig from '../vite.config.js';
import { projectPagePaths, verifyPageResponse } from '../scripts/project-pages.js';

afterEach(() => vi.unstubAllGlobals());

describe('deployment audit page discovery', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  it('includes every current HTML build entry, including map, Wurm and HERO builders', () => {
    const pages = projectPagePaths();
    expect(pages.length).toBe(Object.keys(viteConfig.build.rollupOptions.input).length);
    for (const url of [
      '/',
      '/site/wurm/',
      '/site/map-explorer/',
      '/site/heroes/account/',
      '/site/heroes/player-characters/build/',
    ])
      expect(pages).toContain(url);
    expect(pages.some((page) => page.includes('partials'))).toBe(false);
  });
  it('keeps a useful description on every page included in deployment audits', () => {
    for (const file of Object.values(viteConfig.build.rollupOptions.input)) {
      const html = readFileSync(file, 'utf8');
      const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/)?.[1];
      expect(description?.length, file).toBeGreaterThanOrEqual(30);
    }
  });
  it('picks up new build pages without maintaining another page list', () => {
    const config = {
      build: {
        rollupOptions: {
          input: {
            ...viteConfig.build.rollupOptions.input,
            future: path.join(root, 'site/future/index.html'),
            named: path.join(root, 'site/reports/summary.html'),
          },
        },
      },
    };
    expect(projectPagePaths(config)).toContain('/site/future/');
    expect(projectPagePaths(config)).toContain('/site/reports/summary.html');
  });
  it('normalizes, deduplicates and sorts string, array and named inputs', () => {
    const config = (input) => ({ build: { rollupOptions: { input } } });
    expect(projectPagePaths(config('index.html'), root)).toEqual(['/']);
    expect(
      projectPagePaths(
        config(['site/z/index.html', 'index.html', 'index.html', 'entry.js', 'site/myindex.html']),
        root
      )
    ).toEqual(['/', '/site/myindex.html', '/site/z/']);
  });
  it('rejects missing HTML inputs and out-of-project entries', () => {
    expect(() => projectPagePaths({})).toThrow('No HTML pages');
    expect(() =>
      projectPagePaths({ build: { rollupOptions: { input: '../outside.html' } } }, root)
    ).toThrow('outside the project');
  });
  it('rejects missing pages instead of auditing a successful-looking error page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Not found', { status: 404 })));
    await expect(verifyPageResponse('http://localhost/missing/')).rejects.toThrow('HTTP 404');
  });
  it('allows successful responses and cancels the unused body', async () => {
    const cancel = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: { cancel } }));
    await verifyPageResponse('http://localhost/');
    expect(cancel).toHaveBeenCalledOnce();
  });
});
