export const HELPER_TOKEN_KEY = 'wurm-tools-helper-token-v1';

export function createHeroesClient({ signal, onUnauthorized = () => {} } = {}) {
  return async (route, options = {}) => {
    const headers = new Headers(options.headers || {});
    const heroes = route.startsWith('/heroes/');
    const token = heroes ? heroesSessionToken() : localStorage.getItem(HELPER_TOKEN_KEY);
    if (token)
      headers.set(
        heroes ? 'X-Heroes-Session' : 'Authorization',
        heroes ? token : `Bearer ${token}`
      );
    if (options.body) headers.set('Content-Type', 'application/json');
    const response = await heroesFetch(`http://127.0.0.1:5180${route}`, {
      ...options,
      headers,
      signal,
    });
    const body = response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : null;
    if (!response.ok) {
      if (response.status === 401) {
        if (heroes) {
          sessionStorage.removeItem(HEROES_SESSION_KEY);
          throw new Error(
            'Your HERO session expired or was revoked. This action was not completed. Open Account & security to sign in again, then retry.'
          );
        } else {
          localStorage.removeItem(HELPER_TOKEN_KEY);
          onUnauthorized();
        }
      }
      if (
        response.status === 404 &&
        ['/heroes/library', '/heroes/management', '/heroes/access'].includes(route) &&
        !options.method
      ) {
        throw new Error(
          'The running helper needs an update. Restart it with pnpm run helper:stop, then pnpm run helper.'
        );
      }
      throw new Error(body?.error || `Local helper returned ${response.status}`);
    }
    return body;
  };
}

export function downloadHeroesJson(value, fileName) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = Array.from(fileName, (character) =>
    character.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(character) ? '-' : character
  ).join('');
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
import { heroesSessionToken, HEROES_SESSION_KEY, heroesFetch } from './session.js';
