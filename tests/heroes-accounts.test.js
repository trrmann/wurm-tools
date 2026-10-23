import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountHeroesAccounts } from '../src/js/tools/heroes/accounts.js';

vi.mock('../src/js/tools/heroes/session.js', () => ({
  HEROES_SESSION_KEY: 'heros-session-v1',
  HEROES_LOGOUT_KEY: 'heros-logout-confirmed-v1',
  HEROES_ROLE_LABELS: {
    admin: 'System administrator',
    'game-master': 'Game Master',
    player: 'Player',
    visitor: 'Visitor',
  },
  identityRequest: vi.fn(),
}));
vi.mock('../src/js/tools/heroes/helper-client.js', () => ({
  createHeroesClient: () => async () => ({ records: [], worlds: [], objects: [], entries: [] }),
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
  add(option) {
    this.children.push(option);
    if (this.value === undefined) this.value = option.value;
  }
  get elements() {
    return Object.fromEntries(
      descendants(this)
        .filter((node) => node.name)
        .map((node) => [node.name, node])
    );
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
  vi.stubGlobal(
    'Option',
    class extends Element {
      constructor(label, value) {
        super('option');
        this.textContent = label;
        this.value = value;
      }
    }
  );
  const container = new Element('div');
  mountHeroesAccounts(container, mode);
  return container;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('HERO account management usability', () => {
  const admin = {
    id: 'admin',
    username: 'administrator',
    roles: ['admin'],
    mfaEnabled: true,
  };
  const player = { id: 'player', username: 'dual-role', roles: ['player', 'game-master'] };
  const configure = () =>
    identityRequest.mockImplementation(async (action) =>
      action === 'me' ? { user: admin } : { users: [admin, player], grants: [] }
    );

  it('groups actual accounts by readable role and distinguishes them from profiles', async () => {
    configure();
    const container = mount('admin');
    await vi.waitFor(() =>
      expect(
        descendants(container).some((node) => node.textContent === 'Visitor accounts (0)')
      ).toBe(true)
    );
    const labels = descendants(container).map((node) => node.textContent);
    expect(labels).toContain('System administrator accounts (1)');
    expect(labels).toContain('Game Master accounts (1)');
    expect(labels).toContain('Player accounts (1)');
    expect(labels.filter((label) => label.startsWith('dual-role - Active'))).toHaveLength(2);
    expect(labels.some((label) => label.includes('administrator (you)'))).toBe(true);
    expect(labels.some((label) => label.includes('without deleting its identity'))).toBe(true);
  });

  it('explains session revocation instead of silently navigating away', async () => {
    vi.stubGlobal('sessionStorage', { removeItem: vi.fn() });
    identityRequest.mockRejectedValue(
      Object.assign(new Error('Sign in required'), { status: 401 })
    );
    const container = mount('account');
    await vi.waitFor(() =>
      expect(descendants(container).some((node) => node.textContent === 'Sign in again')).toBe(true)
    );
    expect(
      descendants(container).some((node) => node.textContent.includes('action was not completed'))
    ).toBe(true);
    expect(sessionStorage.removeItem).toHaveBeenCalledWith('heros-session-v1');
  });

  it('reports role changes in progress and refreshes the roster after disabling an account', async () => {
    let disabled = false;
    let finish;
    identityRequest.mockImplementation(async (action, data) => {
      if (action === 'me') return { user: admin };
      if (action === 'admin/user') {
        await new Promise((resolve) => {
          finish = resolve;
        });
        disabled = data.disabled;
        return { user: { ...player, disabled } };
      }
      return { users: [admin, { ...player, disabled }], grants: [] };
    });
    vi.stubGlobal(
      'FormData',
      class {
        constructor(panel) {
          return Object.entries(panel.elements).map(([name, input]) => [name, input.value || '']);
        }
      }
    );
    const container = mount('admin');
    await vi.waitFor(() =>
      expect(descendants(container).some((node) => node.textContent === 'Save account roles')).toBe(
        true
      )
    );
    const panel = descendants(container).find(
      (node) => node.tag === 'form' && node.children[0].textContent === 'Save account roles'
    );
    panel.elements.userId.value = player.id;
    panel.elements.userId.listeners.change();
    panel.elements.disabled.checked = true;
    panel.listeners.submit({ preventDefault() {} });
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    expect(
      descendants(container).some(
        (node) => node.textContent === 'Save account roles - contacting your local helper...'
      )
    ).toBe(true);
    finish();
    await vi.waitFor(() =>
      expect(
        descendants(container).some((node) => node.textContent.startsWith('dual-role - Disabled'))
      ).toBe(true)
    );
    expect(identityRequest).toHaveBeenCalledWith('admin/user', {
      userId: player.id,
      roles: ['player', 'game-master'],
      disabled: true,
    });
    expect(
      descendants(container).some((node) =>
        node.textContent.includes('account lists are refreshed')
      )
    ).toBe(true);
  });

  it('offers all three self-closure policies and clears the local session only after confirmation by the helper', async () => {
    const removeItem = vi.fn();
    vi.stubGlobal('sessionStorage', { removeItem });
    vi.stubGlobal(
      'FormData',
      class {
        constructor(panel) {
          return Object.entries(panel.elements).map(([name, input]) => [name, input.value || '']);
        }
      }
    );
    identityRequest.mockImplementation(async (action) => {
      if (action === 'me') return { user: admin };
      if (action === 'closure/status') return { ownedCount: 3, incoming: [], outgoing: [] };
      if (action === 'closure/request')
        return { closed: true, message: 'Deactivated for recovery.' };
      throw new Error(`Unexpected action: ${action}`);
    });
    const container = mount('account');
    await vi.waitFor(() =>
      expect(descendants(container).some((node) => node.name === 'choice')).toBe(true)
    );
    const panel = descendants(container).find(
      (node) => node.tag === 'form' && node.children[0].textContent === 'Confirm account closure'
    );
    expect(panel.elements.choice.children.map((node) => node.value)).toEqual([
      'retain',
      'delete',
      'transfer',
    ]);
    expect(panel.elements.recipient.required).toBe(false);
    expect(panel.elements.password.autocomplete).toBe('current-password');
    panel.elements.confirmation.value = 'administrator';
    panel.elements.password.value = 'entered-password';
    expect(removeItem).not.toHaveBeenCalled();
    panel.listeners.submit({ preventDefault() {} });
    await vi.waitFor(() => expect(removeItem).toHaveBeenCalledWith('heros-session-v1'));
    expect(identityRequest).toHaveBeenCalledWith('closure/request', {
      choice: 'retain',
      recipient: '',
      confirmation: 'administrator',
      password: 'entered-password',
    });
    expect(
      descendants(container).some((node) => node.textContent === 'Deactivated for recovery.')
    ).toBe(true);
  });

  it('shows outgoing cancellation and incoming acceptance/decline controls without closing an account automatically', async () => {
    identityRequest.mockImplementation(async (action) => {
      if (action === 'me') return { user: admin };
      return {
        ownedCount: 1,
        incoming: [{ id: 'incoming', username: 'sender', ownedCount: 2 }],
        outgoing: [{ id: 'outgoing', username: 'recipient' }],
      };
    });
    const container = mount('account');
    await vi.waitFor(() =>
      expect(
        descendants(container).some((node) => node.textContent === 'Accept transfer from sender')
      ).toBe(true)
    );
    const labels = descendants(container).map((node) => node.textContent);
    expect(labels).toContain('Decline transfer from sender');
    expect(labels).toContain('Cancel ownership transfer');
    expect(
      identityRequest.mock.calls.every(([action]) => ['me', 'closure/status'].includes(action))
    ).toBe(true);
  });
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
