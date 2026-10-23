import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountHeroesAccounts } from '../src/js/tools/heroes/accounts.js';

vi.mock('../src/js/tools/heroes/session.js', () => ({
  HEROES_SESSION_KEY: 'heros-session-v1',
  HEROES_LOGOUT_KEY: 'heros-logout-confirmed-v1',
  identityRequest: vi.fn(),
}));
import { identityRequest } from '../src/js/tools/heroes/session.js';

class Element {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.textContent = '';
    this.classList = { toggle: vi.fn() };
    this.listeners = {};
  }
  append(...children) {
    this.children.push(...children);
  }
  replaceChildren(...children) {
    this.children = children;
  }
  setAttribute() {}
  addEventListener(name, listener) {
    this.listeners[name] = listener;
  }
  querySelector() {
    return descendants(this).find((node) => node.tag === 'button' && node.type === 'submit');
  }
}

function descendants(node) {
  return [node, ...node.children.flatMap(descendants)];
}

function mount(mode = 'setup') {
  vi.stubGlobal('document', { createElement: (tag) => new Element(tag) });
  const container = new Element('div');
  mountHeroesAccounts(container, mode);
  return container;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('first-time HERO setup guidance', () => {
  it('keeps ordered setup instructions visible when the helper is offline', async () => {
    identityRequest.mockRejectedValue(new Error('Failed to fetch'));
    const container = mount();
    await vi.waitFor(() =>
      expect(
        descendants(container).some(
          (node) => node.textContent === 'Connection details: Failed to fetch'
        )
      ).toBe(true)
    );
    const list = descendants(container).find((node) => node.tag === 'ol');
    expect(list.children.map((step) => step.children[0].textContent)).toEqual([
      'Start the helper',
      'Get your setup code',
      'Paste the code in the form above',
    ]);
    expect(
      descendants(container)
        .map((node) => node.textContent)
        .join('\n')
    ).toContain('npm run heroes:setup-code');
    expect(
      descendants(container).some((node) => node.href === 'https://nodejs.org/en/download')
    ).toBe(true);
    expect(
      descendants(container).some(
        (node) => node.href === 'https://github.com/trrmann/wurm-tools/archive/refs/heads/main.zip'
      )
    ).toBe(true);
    expect(
      descendants(container)
        .map((node) => node.textContent)
        .join('\n')
    ).toContain('npm.cmd install');
    expect(descendants(container).filter((node) => node.tag === 'form')).toHaveLength(1);
    expect(descendants(container).find((node) => node.type === 'submit').disabled).toBe(true);
    const content = container.children[0].children[2];
    expect(content.children.findIndex((node) => node.tag === 'form')).toBeLessThan(
      content.children.findIndex((node) => node.tag === 'section')
    );
  });

  it('shows the setup form only when the helper needs its first administrator', async () => {
    identityRequest.mockResolvedValue({ setupRequired: true });
    const container = mount();
    await vi.waitFor(() =>
      expect(descendants(container).filter((node) => node.tag === 'form')).toHaveLength(1)
    );
    expect(descendants(container).filter((node) => node.tag === 'ol')).toHaveLength(1);
    expect(descendants(container).some((node) => node.name === 'setupCode')).toBe(true);
    await vi.waitFor(() =>
      expect(descendants(container).find((node) => node.type === 'submit').disabled).toBe(false)
    );
  });

  it('replaces the checklist with sign-in guidance after administrator creation', async () => {
    identityRequest.mockImplementation((action) =>
      action === 'status'
        ? Promise.resolve({ setupRequired: false })
        : Promise.reject(Object.assign(new Error('Sign in required'), { status: 401 }))
    );
    const container = mount();
    await vi.waitFor(() =>
      expect(
        descendants(container).some((node) =>
          node.textContent.includes('An administrator has already been created')
        )
      ).toBe(true)
    );
    expect(descendants(container).find((node) => node.tag === 'form').hidden).toBe(true);
    expect(
      descendants(container).find(
        (node) => node.tag === 'section' && node !== container.children[0]
      ).hidden
    ).toBe(true);
    expect(descendants(container).some((node) => node.href === '/site/heroes/login/')).toBe(true);
  });

  it('rechecks the connection without losing the setup-code field', async () => {
    identityRequest
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ setupRequired: true });
    const container = mount();
    const button = descendants(container).find(
      (node) => node.textContent === 'Check connection again'
    );
    await vi.waitFor(() => expect(button.disabled).toBe(false));
    const code = descendants(container).find((node) => node.name === 'setupCode');
    code.value = 'my-private-code';
    button.listeners.click();
    await vi.waitFor(() =>
      expect(descendants(container).find((node) => node.type === 'submit').disabled).toBe(false)
    );
    expect(descendants(container).find((node) => node.name === 'setupCode')).toBe(code);
    expect(code.value).toBe('my-private-code');
  });

  it('makes setup instructions discoverable from login even when offline', async () => {
    identityRequest.mockRejectedValue(new Error('Failed to fetch'));
    const container = mount('login');
    await vi.waitFor(() =>
      expect(descendants(container).some((node) => node.textContent === 'Failed to fetch')).toBe(
        true
      )
    );
    expect(descendants(container).some((node) => node.href === '/site/heroes/setup/')).toBe(true);
  });
});
