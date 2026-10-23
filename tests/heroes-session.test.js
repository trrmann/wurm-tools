import { afterEach, describe, expect, it, vi } from 'vitest';
import { identityRequest } from '../src/js/tools/heroes/session.js';
import { createHeroesClient } from '../src/js/tools/heroes/helper-client.js';
import { applyHeroesBranding } from '../src/js/modules/pages/heroes-branding.js';

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
  it('keeps the workspace visible and explains a rejected action when a session is revoked', async () => {
    const removeItem = vi.fn();
    vi.stubGlobal('sessionStorage', { getItem: () => 'revoked', removeItem });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ error: 'Sign in to Heros Tools' }),
      })
    );
    await expect(createHeroesClient()('/heroes/management')).rejects.toThrow(
      'This action was not completed. Open Account & security'
    );
    expect(removeItem).toHaveBeenCalledWith('heros-session-v1');
  });

  it('shows the signed-in account and all its readable roles in the shared shell', () => {
    const subtitle = {};
    let identity;
    const header = {
      querySelector: () => identity,
      append: (node) => {
        identity = node;
      },
    };
    vi.stubGlobal('document', {
      documentElement: { dataset: {} },
      createElement: () => ({ setAttribute() {} }),
    });
    const container = {
      querySelector: (selector) =>
        selector === '.header-title-container'
          ? header
          : selector === '.sidebar-subtitle'
            ? subtitle
            : null,
    };
    applyHeroesBranding(container, {
      stage: 'ready',
      user: { username: 'alex', roles: ['admin', 'player'] },
    });
    expect(subtitle.textContent).toBe('Signed in as alex - System administrator, Player');
    applyHeroesBranding(container, {
      stage: 'ready',
      user: { username: 'alex', displayName: 'Alex Vale', roles: ['player'] },
    });
    expect(subtitle.textContent).toBe('Signed in as Alex Vale (@alex) - Player');
    expect(identity.textContent).toBe('Signed in as Alex Vale (@alex)');
    expect(identity.hidden).toBe(false);
    applyHeroesBranding(container, { stage: 'anonymous' });
    expect(subtitle.textContent).toBe('HERO System workspace');
    expect(identity.hidden).toBe(true);
  });

  it.each(['profile/name', 'name-config', 'admin/name-config', 'closure/status'])(
    'explains an outdated helper when %s is unknown',
    async (action) => {
      mockRequest({ error: 'Unknown identity action' }, 404);
      await expect(identityRequest(action)).rejects.toThrow('npm run helper:stop');
    }
  );

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
