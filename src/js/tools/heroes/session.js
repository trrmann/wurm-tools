export const HEROES_SESSION_KEY = 'heros-session-v1';
export const HEROES_LOGOUT_KEY = 'heros-logout-confirmed-v1';
export const HEROES_ROLE_LABELS = Object.freeze({
  admin: 'System administrator',
  'game-master': 'Game Master',
  player: 'Player',
  visitor: 'Visitor',
});

export function heroesSessionToken() {
  return sessionStorage.getItem(HEROES_SESSION_KEY);
}

export async function identityRequest(action, data) {
  const headers = {};
  const token = heroesSessionToken();
  if (token && !['status', 'setup', 'register', 'login'].includes(action))
    headers['X-Heroes-Session'] = token;
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`http://127.0.0.1:5180/heroes/auth/${action}`, {
    method: data === undefined ? 'GET' : 'POST',
    headers,
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    cache: 'no-store',
  });
  const body = await response.json();
  if (action === 'status' && (!response.ok || typeof body.setupRequired !== 'boolean')) {
    const error = new Error(
      'The helper is running, but does not support this account setup page. Restart the updated helper: run npm run helper:stop, wait for it to stop, then run npm run helper. Return here and select Check connection again.'
    );
    error.code = 'HEROES_HELPER_OUTDATED';
    error.status = response.status;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(body.error || `Identity service returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}
