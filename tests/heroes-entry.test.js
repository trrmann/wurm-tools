import { afterEach, describe, expect, it, vi } from 'vitest';
import { HeroesPage } from '../src/js/modules/pages/HeroesPage.js';
import { mountHeroesAccounts } from '../src/js/tools/heroes/accounts.js';
import { renderShell } from '../src/js/modules/shell.js';

vi.mock('../src/js/tools/heroes/accounts.js', () => ({
  mountHeroesAccounts: vi.fn(),
}));
vi.mock('../src/js/modules/shell.js', () => ({
  renderShell: vi.fn(),
  setHeader: vi.fn(),
  initSidebar: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('Heros main login entry', () => {
  it.each(['/', '/index.html'])(
    'mounts login only at %s, without a tool shell or account redirect',
    (pathname) => {
      vi.stubGlobal('window', { location: { pathname } });
      vi.stubGlobal('document', { title: '', documentElement: { dataset: {} } });
      const container = { classList: { add: vi.fn() } };
      const teardown = vi.fn();
      mountHeroesAccounts.mockReturnValue(teardown);
      const page = new HeroesPage();
      page.checkAccess = vi.fn();
      page.mount(container);
      expect(document.title).toBe('Login — Heros Tools');
      expect(document.documentElement.dataset.game).toBe('heroes');
      expect(container.classList.add).toHaveBeenCalledWith('heroes-login-entry');
      expect(mountHeroesAccounts).toHaveBeenCalledWith(container, 'login');
      expect(renderShell).not.toHaveBeenCalled();
      expect(page.checkAccess).not.toHaveBeenCalled();
      expect(page.teardownAccounts).toBe(teardown);
    }
  );
});
