import { applyHeroesAccountTheme } from './theme.js';

export const HEROES_SESSION_KEY = 'heros-session-v1';
export const HEROES_LOGOUT_KEY = 'heros-logout-confirmed-v1';
export const HEROES_ROLE_LABELS = Object.freeze({
  admin: 'System administrator',
  'game-master': 'Game Master',
  player: 'Player',
  visitor: 'Visitor',
});

export function heroesAccountLabel(user) {
  return user.displayName ? `${user.displayName} (@${user.username})` : user.username;
}

export function heroesSessionToken() {
  return sessionStorage.getItem(HEROES_SESSION_KEY);
}

export async function heroesFetch(url, options) {
  let response = await fetch(url, options);
  while (response.status === 202) {
    const pending = await response.clone().json();
    if (!pending.pendingApproval) return response;
    await new Promise((resolve, reject) => {
      const signal = options.signal;
      if (signal?.aborted)
        return reject(signal.reason || new DOMException('Aborted', 'AbortError'));
      const abort = () => {
        clearTimeout(timer);
        reject(signal.reason || new DOMException('Aborted', 'AbortError'));
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', abort);
        resolve();
      }, 2000);
      signal?.addEventListener('abort', abort, { once: true });
    });
    const headers = new Headers(options.headers);
    headers.set('X-Heroes-Approval', pending.pendingApproval);
    response = await fetch(url, { ...options, headers });
  }
  return response;
}

export async function identityRequest(action, data) {
  const headers = {};
  const token = heroesSessionToken();
  if (token && !['status', 'setup', 'register', 'login', 'invite/redeem'].includes(action))
    headers['X-Heroes-Session'] = token;
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  const response = await heroesFetch(`http://127.0.0.1:5180/heroes/auth/${action}`, {
    method: data === undefined ? 'GET' : 'POST',
    headers,
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    cache: 'no-store',
  });
  const body = await response.json();
  if (action === 'status' && (!response.ok || typeof body.setupRequired !== 'boolean')) {
    const error = new Error(
      'The helper is running, but does not support this account setup page. Restart the updated helper: run pnpm run helper:stop, wait for it to stop, then run pnpm run helper. Return here and select Check connection again.'
    );
    error.code = 'HEROES_HELPER_OUTDATED';
    error.status = response.status;
    throw error;
  }
  if (!response.ok) {
    const unsupported =
      response.status === 404 &&
      ['Unknown identity action', 'Unknown directory or message action', 'Unknown route'].includes(
        body.error
      );
    const error = new Error(
      unsupported
        ? 'The running helper does not support this account feature. From your updated WurmTools folder run pnpm run helper:stop, then pnpm run helper. Reload this page afterward. Your data has not been changed by this request.'
        : body.error || `Identity service returned ${response.status}`
    );
    error.status = response.status;
    throw error;
  }
  if (
    ['me', 'login', 'mfa/verify', 'mfa/confirm'].includes(action) &&
    body.user &&
    heroesSessionToken() === token
  )
    applyHeroesAccountTheme(body.user);
  if (action === 'logout' && typeof document !== 'undefined')
    delete document.documentElement.dataset.heroesThemeAccount;
  return body;
}
