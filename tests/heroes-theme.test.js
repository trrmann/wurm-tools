import { afterEach, describe, expect, it, vi } from 'vitest';
import { runInNewContext } from 'node:vm';
import { initializeHeroesTheme } from '../src/js/tools/heroes/theme.js';
import { applyHeroesBranding } from '../src/js/modules/pages/heroes-branding.js';
import { identityRequest } from '../src/js/tools/heroes/session.js';
import { heroesThemePlugin } from '../scripts/heroes-theme-plugin.js';

afterEach(() => vi.unstubAllGlobals());

function environment(pathname = '/site/heroes/', cached = 'light') {
  const storage = { getItem: vi.fn(() => cached), setItem: vi.fn() };
  const root = { dataset: {} };
  vi.stubGlobal('window', { location: { pathname, search: '' } });
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('sessionStorage', { getItem: () => 'session' });
  vi.stubGlobal('document', { documentElement: root, createElement: node });
  return { storage, root };
}

function node() {
  return {
    children: [],
    attributes: {},
    listeners: {},
    append(...children) {
      this.children.push(...children);
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener(name, listener) {
      this.listeners[name] = listener;
    },
  };
}

function toolbar(
  user = { id: 'one', username: 'one', roles: ['player'], preferences: { theme: 'dark' } }
) {
  const top = { ...node(), querySelector: () => null };
  const container = { querySelector: (selector) => (selector === '.top-header' ? top : null) };
  applyHeroesBranding(container, { stage: 'ready', user });
  const [button, status] = top.children[0].children;
  return { container, button, status, user };
}

function response(body, status = 200) {
  return { ok: status === 200, status, json: async () => body };
}

describe('HERO appearance startup', () => {
  it.each(['/', '/index.html', '/site/heroes/', '/site/heroes/public/', '/site/heroes/login/'])(
    'runs the shared cached preference synchronously before styles on %s',
    (path) => {
      const tags = heroesThemePlugin().transformIndexHtml.handler('', { path });
      expect(tags[0].injectTo).toBe('head-prepend');
      const root = { dataset: {} };
      runInNewContext(tags[0].children, {
        window: { location: { pathname: path } },
        document: { documentElement: root },
        localStorage: { getItem: () => 'light' },
      });
      expect(root.dataset).toMatchObject({ game: 'heroes', heroesTheme: 'light' });
    }
  );

  it('does not inject into or alter Wurm entries', () => {
    const { root, storage } = environment('/site/wurm/');
    expect(
      heroesThemePlugin().transformIndexHtml.handler('original', { path: '/site/wurm/index.html' })
    ).toBe('original');
    initializeHeroesTheme('light');
    expect(root.dataset).toEqual({});
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('preserves cached light during checking and uses the next account preference', () => {
    const { root } = environment();
    initializeHeroesTheme();
    applyHeroesBranding({ querySelector: () => null }, { stage: 'checking' });
    expect(root.dataset.heroesTheme).toBe('light');
    toolbar();
    expect(root.dataset.heroesTheme).toBe('dark');
    toolbar({ id: 'two', roles: ['player'], preferences: { theme: 'light' } });
    expect(root.dataset.heroesTheme).toBe('light');
    expect(root.dataset.heroesThemeAccount).toBe('two');
  });

  it.each([null, 'invalid', '{"theme":"light"}'])(
    'defaults safely with invalid cache %s',
    (cached) => {
      const { root } = environment('/', cached);
      initializeHeroesTheme();
      expect(root.dataset.heroesTheme).toBe('dark');
    }
  );

  it('continues without storage and applies authenticated light on root login', async () => {
    const { root, storage } = environment('/');
    storage.getItem.mockImplementation(() => {
      throw new Error('disabled');
    });
    storage.setItem.mockImplementation(() => {
      throw new Error('disabled');
    });
    initializeHeroesTheme();
    expect(root.dataset.heroesTheme).toBe('dark');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response({
          user: { id: 'new', preferences: { theme: 'light' } },
        })
      )
    );
    await identityRequest('login', {});
    expect(root.dataset.heroesTheme).toBe('light');
  });

  it('does not apply the theme of an account created or edited by another account', async () => {
    const { root } = environment();
    initializeHeroesTheme();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response({ user: { preferences: { theme: 'dark' } } }))
    );
    await identityRequest('admin/user', {});
    await identityRequest('register', {});
    expect(root.dataset.heroesTheme).toBe('light');
  });
});

describe('HERO appearance icon control', () => {
  it('shows an accessible sun, persists before applying, then offers a moon', async () => {
    const { root, storage } = environment();
    const { button, status, user } = toolbar();
    expect(button.type).toBe('button');
    expect(button.title).toBe('Switch to light mode');
    expect(button.attributes['aria-label']).toBe(button.title);
    expect(button.children[0].attributes['aria-hidden']).toBe('true');
    expect(button.children[0].textContent).toBe('☀');
    let resolve;
    const fetch = vi.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    vi.stubGlobal('fetch', fetch);
    const saving = button.listeners.click();
    expect(button.disabled).toBe(true);
    expect(root.dataset.heroesTheme).toBe('dark');
    resolve(response({ preferences: { theme: 'light' } }));
    await saving;
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ theme: 'light' });
    expect(root.dataset.heroesTheme).toBe('light');
    expect(user.preferences.theme).toBe('light');
    expect(storage.setItem).toHaveBeenLastCalledWith('heros-theme-v1', 'light');
    expect(button.title).toBe('Switch to dark mode');
    expect(button.children[0].textContent).toBe('☾');
    expect(button.disabled).toBe(false);
    expect(status.textContent).toBe('Appearance saved.');
    fetch.mockResolvedValue(response({ preferences: { theme: 'dark' } }));
    await button.listeners.click();
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ theme: 'dark' });
    expect(root.dataset.heroesTheme).toBe('dark');
    expect(button.title).toBe('Switch to light mode');
  });

  it.each([
    [response({ error: 'Unavailable' }, 503), 'Unavailable'],
    [response({}), 'did not confirm'],
  ])(
    'does not change or claim to save a rejected/unconfirmed preference',
    async (result, message) => {
      const { root } = environment();
      const { button, status } = toolbar();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(result));
      await button.listeners.click();
      expect(root.dataset.heroesTheme).toBe('dark');
      expect(status.textContent).toContain(message);
      expect(status.textContent).not.toContain('saved');
      expect(button.disabled).toBe(false);
      expect(button.title).toBe('Switch to light mode');
    }
  );

  it('does not apply an old save after switching accounts or signing out', async () => {
    const { root } = environment();
    const { button, container } = toolbar();
    let resolve;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((done) => {
            resolve = done;
          })
      )
    );
    const saving = button.listeners.click();
    applyHeroesBranding(container, { stage: 'anonymous' });
    resolve(response({ preferences: { theme: 'light' } }));
    await saving;
    expect(root.dataset.heroesTheme).toBe('dark');
    expect(root.dataset.heroesThemeAccount).toBeUndefined();
  });

  it('does not apply an old save when a new session replaces the account token', async () => {
    const { root } = environment();
    const { button } = toolbar();
    let resolve;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((done) => {
            resolve = done;
          })
      )
    );
    const saving = button.listeners.click();
    vi.stubGlobal('sessionStorage', { getItem: () => 'another-session' });
    resolve(response({ preferences: { theme: 'light' } }));
    await saving;
    expect(root.dataset.heroesTheme).toBe('dark');
  });
});
