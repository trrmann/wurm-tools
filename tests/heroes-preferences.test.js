import { describe, it, expect, vi, afterEach } from 'vitest';
import { HEROES_ROLE_HOMES, heroesRoleLocation } from '../src/js/tools/heroes/preferences.js';
import { heroesFetch } from '../src/js/tools/heroes/session.js';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('HERO role destinations and approval transport', () => {
  it.each(Object.entries(HEROES_ROLE_HOMES))(
    'uses the %s home when no remembered destination exists',
    (role, href) => {
      expect(heroesRoleLocation(role)).toBe(href);
      expect(heroesRoleLocation(role, '//evil.example/path')).toBe(href);
      expect(heroesRoleLocation(role, '/site/heroes/logout/')).toBe(href);
      expect(heroesRoleLocation(role, '/site/heroes/campaigns/?world=a')).toBe(
        '/site/heroes/campaigns/?world=a'
      );
    }
  );
  it('retries the exact update only with its server-issued approval ID, never returns pending as success', async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ pendingApproval: 'server-approval' }), { status: 202 })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ saved: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const result = heroesFetch('http://127.0.0.1:5180/heroes/objects', {
      method: 'POST',
      headers: { 'X-Heroes-Session': 'session' },
      body: '{"name":"Original"}',
    });
    await vi.advanceTimersByTimeAsync(2100);
    expect((await result).status).toBe(200);
    expect(fetch.mock.calls[1][1].body).toBe('{"name":"Original"}');
    expect(fetch.mock.calls[1][1].headers.get('X-Heroes-Approval')).toBe('server-approval');
    expect(fetch.mock.calls[1][1].headers.get('X-Heroes-Session')).toBe('session');
  });
  it('aborts an approval wait when the calling view is disposed', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ pendingApproval: 'approval' }), { status: 202 })
        )
    );
    await expect(
      heroesFetch('http://127.0.0.1:5180/heroes/objects', {
        method: 'POST',
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
