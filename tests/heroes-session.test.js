import { afterEach, describe, expect, it, vi } from 'vitest';
import { identityRequest } from '../src/js/tools/heroes/session.js';

afterEach(() => vi.unstubAllGlobals());

function mockRequest(body, status = 200) {
  const fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetch);
  vi.stubGlobal('sessionStorage', { getItem: () => 'existing-session' });
  return fetch;
}

describe('HERO identity helper compatibility', () => {
  it.each(['status', 'setup', 'register', 'login'])(
    'does not send session credentials for public %s requests',
    async (action) => {
      const fetch = mockRequest({ setupRequired: true });
      await identityRequest(action, action === 'status' ? undefined : { username: 'test' });
      expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('X-Heroes-Session');
    }
  );

  it('preserves session authentication on protected requests', async () => {
    const fetch = mockRequest({ user: {} });
    await identityRequest('me');
    expect(fetch.mock.calls[0][1].headers['X-Heroes-Session']).toBe('existing-session');
  });

  it.each([401, 404, 200])(
    'explains the needed restart when an old helper returns %s',
    async (status) => {
      mockRequest({ error: 'Unknown route' }, status);
      await expect(identityRequest('status')).rejects.toMatchObject({
        code: 'HEROES_HELPER_OUTDATED',
        message: expect.stringContaining('npm run helper:stop'),
      });
    }
  );
});
