import path from 'node:path';
import { fileURLToPath } from 'node:url';
import viteConfig from '../vite.config.js';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export function projectPagePaths(config = viteConfig, root = projectRoot) {
  const input = config.build?.rollupOptions?.input;
  const files =
    typeof input === 'string' ? [input] : Array.isArray(input) ? input : Object.values(input || {});
  const pages = files
    .filter((file) => typeof file === 'string' && file.endsWith('.html'))
    .map((file) => {
      const relative = path.relative(root, path.resolve(root, file));
      if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
        throw new Error(`HTML build entry is outside the project: ${file}`);
      return `/${relative.split(path.sep).join('/')}`.replace(/\/index\.html$/, '/');
    });
  if (!pages.length) throw new Error('No HTML pages were found in the Vite build entries');
  return [...new Set(pages)].sort();
}

export async function verifyPageResponse(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
  await response.body?.cancel();
  if (!response.ok) throw new Error(`Page ${url} returned HTTP ${response.status}`);
}
