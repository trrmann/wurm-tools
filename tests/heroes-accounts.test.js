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
  heroesAccountLabel: (user) =>
    user.displayName ? `${user.displayName} (@${user.username})` : user.username,
  identityRequest: vi.fn(),
}));
vi.mock('../src/js/tools/heroes/helper-client.js', () => ({
  createHeroesClient: () => async () => ({ records: [], worlds: [], objects: [], entries: [] }),
}));
import { identityRequest } from '../src/js/tools/heroes/session.js';
import { DEFAULT_NAME_CULTURES } from '../src/js/modules/objects/heroes/account-name.mjs';

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

function mount(mode = 'setup', options) {
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
  mountHeroesAccounts(container, mode, options);
  return container;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('HERO account management usability', () => {
  it.each([false, true])(
    'allows impersonated name editing with preview=%s without forbidden security, closure, or role controls',
    async (preview) => {
      vi.stubGlobal(
        'FormData',
        class {
          constructor(panel) {
            return Object.entries(panel.elements).map(([name, input]) => [name, input.value || '']);
          }
        }
      );
      const user = {
        id: 'visitor',
        username: 'visitor',
        roles: ['visitor'],
        activeRole: 'visitor',
        assignedRoles: ['visitor'],
        impersonation: { administratorId: 'admin', preview },
        roleRequest: { id: 'pending', status: 'pending', roles: ['player'], createdAt: Date.now() },
      };
      identityRequest.mockImplementation(async (action) => {
        if (action === 'me') return { user };
        if (action === 'name-config') return { cultures: DEFAULT_NAME_CULTURES };
        if (action === 'profile/name') return { user };
        throw new Error(`Unexpected action ${action}`);
      });
      const container = mount('account');
      await vi.waitFor(() =>
        expect(descendants(container).some((node) => node.name === 'firstName')).toBe(true)
      );
      const nodes = descendants(container);
      expect(nodes.some((node) => node.textContent.includes('Use Release in the header'))).toBe(
        true
      );
      expect(
        nodes.some((node) =>
          node.textContent.includes(
            preview
              ? 'those settings are isolated and disposable'
              : 'Administrator security controls are unavailable while impersonating a real user'
          )
        )
      ).toBe(true);
      expect(nodes.some((node) => node.href === '/site/heroes/logout/')).toBe(false);
      expect(
        nodes.some((node) => ['password', 'currentPassword', 'confirmation'].includes(node.name))
      ).toBe(false);
      expect(
        nodes.filter((node) => node.tag === 'form').map((node) => node.children[0].textContent)
      ).toEqual(['Save personal name']);
      expect(identityRequest).not.toHaveBeenCalledWith('closure/status');
      const panel = nodes.find((node) => node.tag === 'form');
      panel.listeners.submit({ preventDefault() {} });
      await vi.waitFor(() =>
        expect(identityRequest).toHaveBeenCalledWith('profile/name', expect.any(Object))
      );
    }
  );

  it.each(['logout', 'admin', 'admin-invitations', 'admin-roles', 'admin-cultures'])(
    'offers only release guidance for impersonated %s',
    async (mode) => {
      identityRequest.mockResolvedValue({
        user: {
          id: 'admin',
          username: 'admin',
          roles: ['admin'],
          activeRole: 'admin',
          impersonation: { preview: false },
        },
      });
      const container = mount(mode);
      await vi.waitFor(() =>
        expect(
          descendants(container).some((node) =>
            node.textContent.includes('Use Release in the header')
          )
        ).toBe(true)
      );
      expect(descendants(container).some((node) => node.tag === 'form')).toBe(false);
      expect(identityRequest.mock.calls.map(([action]) => action)).toEqual(['me']);
    }
  );

  it.each([
    ['admin', 'System administrators (1)'],
    ['admin-invitations', 'Create invitation'],
    ['admin-roles', 'Save account roles'],
    ['admin-cultures', 'Save culture name ordering'],
  ])('allows isolated administrator preview controls in %s without Logout', async (mode, label) => {
    const user = {
      id: 'preview-admin',
      username: 'preview-admin',
      roles: ['admin'],
      assignedRoles: ['admin'],
      activeRole: 'admin',
      impersonation: { preview: true },
    };
    identityRequest.mockImplementation(async (action) => {
      if (action === 'me') return { user };
      if (action === 'admin/list') return { users: [user], grants: [], invitations: [] };
      if (action === 'name-config') return { cultures: DEFAULT_NAME_CULTURES };
      throw new Error(`Unexpected action ${action}`);
    });
    const container = mount(mode);
    await vi.waitFor(() =>
      expect(descendants(container).some((node) => node.textContent === label)).toBe(true)
    );
    expect(descendants(container).some((node) => node.href === '/site/heroes/logout/')).toBe(false);
    expect(identityRequest).not.toHaveBeenCalledWith('closure/status');
  });

  it.each([
    ['admin', undefined, '/site/heroes/people/admins/'],
    ['game-master', undefined, '/site/heroes/people/'],
    ['player', undefined, '/site/heroes/people/players/'],
    ['visitor', undefined, '/site/heroes/public/'],
    ['player', '/site/heroes/player-characters/', '/site/heroes/player-characters/'],
  ])('redirects already signed-in %s Login to its role location', async (role, saved, expected) => {
    const replace = vi.fn();
    vi.stubGlobal('window', { location: { replace } });
    vi.stubGlobal('sessionStorage', { getItem: () => 'token' });
    identityRequest.mockImplementation(async (action) => {
      if (action === 'status') return { setupRequired: false };
      if (action === 'me')
        return {
          user: { roles: [role], activeRole: role, preferences: { locations: { [role]: saved } } },
        };
      throw new Error(`Unexpected action ${action}`);
    });
    mount('login');
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith(expected));
  });

  it.each([false, true])(
    'redirects successful sign-in with MFA=%s using saved role preferences',
    async (mfaRequired) => {
      const replace = vi.fn();
      vi.stubGlobal('window', { location: { replace } });
      vi.stubGlobal('sessionStorage', {
        getItem: () => null,
        setItem: vi.fn(),
        removeItem: vi.fn(),
      });
      vi.stubGlobal(
        'FormData',
        class {
          constructor() {
            return [];
          }
        }
      );
      const user = {
        roles: ['player'],
        activeRole: 'player',
        preferences: { locations: { player: '/site/heroes/player-characters/' } },
      };
      identityRequest.mockImplementation(async (action) => {
        if (action === 'status') return { setupRequired: false };
        if (action === 'login') return { token: 'token', user, mfaRequired };
        if (action === 'mfa/verify') return {};
        if (action === 'me') return { user };
        throw new Error(`Unexpected action ${action}`);
      });
      const container = mount('login');
      const findForm = (label) =>
        descendants(container).find(
          (node) => node.tag === 'form' && node.children[0].textContent === label
        );
      await vi.waitFor(() => expect(findForm('Log in')).toBeDefined());
      findForm('Log in').listeners.submit({ preventDefault() {} });
      if (mfaRequired) {
        await vi.waitFor(() => expect(findForm('Verify two-factor authentication')).toBeDefined());
        findForm('Verify two-factor authentication').listeners.submit({ preventDefault() {} });
      }
      await vi.waitFor(() =>
        expect(replace).toHaveBeenCalledWith('/site/heroes/player-characters/')
      );
    }
  );

  it('puts password change first, explains unavailable email verification, and collapses name and deletion', async () => {
    identityRequest.mockImplementation(async (action) => {
      if (action === 'me')
        return {
          user: {
            id: 'visitor',
            username: 'visitor',
            roles: ['visitor'],
            assignedRoles: ['visitor'],
            mfaEnabled: true,
          },
        };
      if (action === 'name-config') return { cultures: DEFAULT_NAME_CULTURES };
      if (action === 'closure/status') return { ownedCount: 0, incoming: [], outgoing: [] };
      throw new Error(`Unexpected action ${action}`);
    });
    const container = mount('account');
    await vi.waitFor(() =>
      expect(descendants(container).some((node) => node.name === 'currentPassword')).toBe(true)
    );
    const content = container.children[0].children[2];
    expect(content.children[0].children[0].textContent).toBe('Change password');
    expect(content.children[1].children[0].textContent).toBe('Email verification');
    expect(
      descendants(content).some((node) =>
        node.textContent.includes('does not collect an email address')
      )
    ).toBe(true);
    expect(
      descendants(content).some((node) => node.textContent.includes('no address is verified'))
    ).toBe(true);
    expect(content.children[2].children[0].textContent).toBe('Edit personal name');
    expect(content.children.at(-1).children[0].textContent).toBe('Delete or transfer account');
    expect(content.children[2].open).toBeFalsy();
    expect(content.children.at(-1).open).toBeFalsy();
    expect(content.children[0].children[0].textContent).toBe('Change password');
  });

  it.each(['player', 'game-master'])(
    'renders required Profile panels before social data resolves and preserves them after a %s directory failure',
    async (role) => {
      let rejectDirectory;
      identityRequest.mockImplementation(async (action) => {
        if (action === 'me')
          return {
            user: {
              id: 'account',
              username: 'account',
              roles: [role],
              assignedRoles: [role, 'admin'],
              activeRole: role,
            },
          };
        if (action === 'name-config') return { cultures: DEFAULT_NAME_CULTURES };
        if (action === 'closure/status') return { ownedCount: 0, incoming: [], outgoing: [] };
        if (action === 'directory/status')
          return new Promise((_resolve, reject) => {
            rejectDirectory = reject;
          });
        throw new Error(`Unexpected action ${action}`);
      });
      const container = mount('account');
      await vi.waitFor(() => expect(rejectDirectory).toBeTypeOf('function'));
      const content = container.children[0].children[2];
      const checkRequiredPanels = () => {
        expect(content.children[0].children[0].textContent).toBe('Change password');
        expect(content.children[1].children[0].textContent).toBe('Email verification');
        expect(content.children[2].children[0].textContent).toBe('Edit personal name');
        expect(content.children.at(-1).children[0].textContent).toBe('Delete or transfer account');
        expect(descendants(content).some((node) => node.name === 'currentPassword')).toBe(true);
        expect(descendants(content).some((node) => node.name === 'firstName')).toBe(true);
        expect(descendants(content).some((node) => node.name === 'confirmation')).toBe(true);
      };
      checkRequiredPanels();
      rejectDirectory(new Error('Directory offline'));
      await vi.waitFor(() =>
        expect(
          descendants(content).some((node) =>
            node.textContent.includes(
              'Play relationships are temporarily unavailable: Directory offline'
            )
          )
        ).toBe(true)
      );
      checkRequiredPanels();
      expect(
        descendants(content).some((node) => node.textContent === 'Retry play relationships')
      ).toBe(true);
    }
  );

  it('shows system administrators and direct links to all focused admin pages', async () => {
    const currentAdmin = {
      id: 'admin',
      username: 'administrator',
      roles: ['admin'],
      assignedRoles: ['admin'],
      activeRole: 'admin',
    };
    identityRequest.mockImplementation(async (action) => {
      if (action === 'me') return { user: currentAdmin };
      if (action === 'admin/list')
        return {
          users: [
            currentAdmin,
            {
              id: 'second-admin',
              username: 'second',
              roles: ['admin'],
              assignedRoles: ['admin', 'player'],
              disabled: true,
            },
            { id: 'player', username: 'not-admin', roles: ['player'], assignedRoles: ['player'] },
          ],
        };
      throw new Error(`Unexpected action ${action}`);
    });
    const container = mount('admin');
    await vi.waitFor(() =>
      expect(
        descendants(container).some((node) => node.textContent === 'System administrators (2)')
      ).toBe(true)
    );
    expect(descendants(container).some((node) => node.textContent === 'second — disabled')).toBe(
      true
    );
    expect(descendants(container).some((node) => node.textContent === 'not-admin — active')).toBe(
      false
    );
    expect(
      descendants(container).some((node) => node.href === '/site/heroes/people/admins/invitations/')
    ).toBe(true);
    expect(
      descendants(container).some((node) => node.href === '/site/heroes/people/admins/roles/')
    ).toBe(true);
    expect(
      descendants(container).some((node) => node.href === '/site/heroes/people/admins/cultures/')
    ).toBe(true);
    expect(
      descendants(container).some(
        (node) => node.tag === 'h2' && node.textContent === 'System administrators'
      )
    ).toBe(true);
  });

  it('requires the selected administrator role for admin modes even when admin is an assigned membership', async () => {
    identityRequest.mockResolvedValue({
      user: {
        id: 'multi-role',
        username: 'multi-role',
        roles: ['player'],
        assignedRoles: ['player', 'admin'],
        activeRole: 'player',
      },
    });
    const container = mount('admin-roles');
    await vi.waitFor(() =>
      expect(
        descendants(container).some((node) => node.textContent === 'Administrator access required')
      ).toBe(true)
    );
    expect(identityRequest).not.toHaveBeenCalledWith('admin/list');
  });

  it('keeps culture configuration on its own administrator mode', async () => {
    vi.stubGlobal(
      'FormData',
      class {
        constructor(panel) {
          return Object.entries(panel.elements).map(([name, input]) => [name, input.value || '']);
        }
      }
    );
    const currentAdmin = {
      id: 'admin',
      username: 'administrator',
      roles: ['admin'],
      assignedRoles: ['admin'],
      activeRole: 'admin',
    };
    identityRequest.mockImplementation(async (action, data) => {
      if (action === 'me') return { user: currentAdmin };
      if (action === 'name-config') return { cultures: DEFAULT_NAME_CULTURES };
      if (action === 'admin/name-config') return { user: currentAdmin, cultures: data.cultures };
      throw new Error(`Unexpected action ${action}`);
    });
    const container = mount('admin-cultures');
    await vi.waitFor(() =>
      expect(
        descendants(container).some((node) => node.textContent === 'Add selectable culture')
      ).toBe(true)
    );
    expect(descendants(container).some((node) => node.textContent === 'Create invitation')).toBe(
      false
    );
    const save = descendants(container).find(
      (node) => node.tag === 'form' && node.children[0].textContent === 'Save culture name ordering'
    );
    save.listeners.submit({ preventDefault() {} });
    await vi.waitFor(() =>
      expect(identityRequest).toHaveBeenCalledWith(
        'admin/name-config',
        expect.objectContaining({ cultures: expect.any(Array) })
      )
    );
  });

  it('shows incoming Game Master invitations to Players as accept/decline controls', async () => {
    const invitation = {
      id: 'gm-invitation',
      playerId: 'player',
      gameMasterId: 'gm',
      initiatedBy: 'game-master',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    identityRequest.mockImplementation(async (action) => {
      if (action === 'me')
        return {
          user: {
            id: 'player',
            username: 'player',
            roles: ['player'],
            assignedRoles: ['player', 'game-master'],
            activeRole: 'player',
          },
        };
      if (action === 'name-config') return { cultures: DEFAULT_NAME_CULTURES };
      if (action === 'directory/status')
        return {
          users: [
            { id: 'player', username: 'player', displayName: '', roles: ['player'] },
            { id: 'gm', username: 'game-master', displayName: '', roles: ['game-master'] },
          ],
          relationships: [invitation],
          listing: { gameMaster: false, player: false },
        };
      if (action === 'play/status') return { directory: [], relationships: [invitation] };
      if (action === 'closure/status') return { ownedCount: 0, incoming: [], outgoing: [] };
      throw new Error(`Unexpected action ${action}`);
    });
    const container = mount('account');
    await vi.waitFor(() =>
      expect(
        descendants(container).some(
          (node) =>
            node.tag === 'form' &&
            node.children[0].textContent === 'Accept Game Master invitation: game-master'
        )
      ).toBe(true)
    );
    expect(
      descendants(container).some(
        (node) =>
          node.tag === 'form' &&
          node.children[0].textContent === 'Decline Game Master invitation: game-master'
      )
    ).toBe(true);
    expect(
      descendants(container).some(
        (node) =>
          node.tag === 'form' && node.children[0].textContent === 'Cancel play request: game-master'
      )
    ).toBe(false);
  });

  it('explains a denied direct route on Account & security instead of silently showing an empty workspace', async () => {
    identityRequest.mockImplementation(async (action) => {
      if (action === 'me')
        return { user: { id: 'visitor', username: 'visitor', roles: ['visitor'] } };
      if (action === 'name-config') return { cultures: DEFAULT_NAME_CULTURES };
      if (action === 'closure/status') return { ownedCount: 0, incoming: [], outgoing: [] };
      throw new Error(`Unexpected action ${action}`);
    });
    const container = mount('account', { accessDenied: true });
    await vi.waitFor(() =>
      expect(
        descendants(container).some((node) => node.textContent.includes('No workspace was opened.'))
      ).toBe(true)
    );
  });

  it('prefills and saves explicit Wurm delegation separately from HERO roles', async () => {
    vi.stubGlobal(
      'FormData',
      class {
        constructor(panel) {
          return Object.entries(panel.elements).map(([name, input]) => [name, input.value || '']);
        }
      }
    );
    const delegated = {
      id: 'delegate',
      username: 'wurm-delegate',
      roles: ['visitor'],
      wurmAccess: false,
    };
    identityRequest.mockImplementation(async (action, data) => {
      if (action === 'me') return { user: admin };
      if (action === 'name-config') return { cultures: DEFAULT_NAME_CULTURES };
      if (action === 'admin/list')
        return { users: [admin, delegated], grants: [], invitations: [] };
      if (action === 'admin/wurm-access') {
        delegated.wurmAccess = data.allowed;
        return { user: delegated };
      }
      throw new Error(`Unexpected action ${action}`);
    });
    const container = mount('admin-roles');
    const findForm = () =>
      descendants(container).find(
        (node) =>
          node.tag === 'form' && node.children[0].textContent === 'Save Wurm tools delegation'
      );
    await vi.waitFor(() => expect(findForm()).toBeDefined());
    const panel = findForm();
    panel.elements.userId.value = delegated.id;
    panel.elements.userId.listeners.change();
    expect(panel.elements.allowed.checked).toBe(false);
    panel.elements.allowed.checked = true;
    panel.listeners.submit({ preventDefault() {} });
    await vi.waitFor(() =>
      expect(
        descendants(container).some((node) => node.textContent.includes('Wurm delegation saved.'))
      ).toBe(true)
    );
    expect(identityRequest).toHaveBeenCalledWith('admin/wurm-access', {
      userId: delegated.id,
      allowed: true,
    });
    expect(delegated.roles).toEqual(['visitor']);
    findForm().elements.userId.value = delegated.id;
    findForm().elements.userId.listeners.change();
    expect(findForm().elements.allowed.checked).toBe(true);
  });

  it('keeps GM listing unchecked by default, saves explicit consent and reviews incoming play requests', async () => {
    vi.stubGlobal(
      'FormData',
      class {
        constructor(panel) {
          return Object.entries(panel.elements).map(([name, input]) => [name, input.value || '']);
        }
      }
    );
    const user = {
      id: 'gm',
      username: 'review-gm',
      roles: ['game-master'],
      listedAsGameMaster: false,
    };
    const relationship = {
      id: 'play-request',
      playerId: 'player',
      gameMasterId: 'gm',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    identityRequest.mockImplementation(async (action, data) => {
      if (action === 'me') return { user };
      if (action === 'name-config') return { cultures: DEFAULT_NAME_CULTURES };
      if (action === 'directory/status')
        return {
          users: [
            { id: 'gm', username: 'review-gm', displayName: '', roles: ['game-master'] },
            {
              id: 'player',
              username: 'requesting-player',
              displayName: 'Player Name',
              roles: ['player'],
            },
          ],
          relationships: [relationship],
          listing: { gameMaster: user.listedAsGameMaster, player: false },
        };
      if (action === 'closure/status') return { ownedCount: 0, outgoing: [], incoming: [] };
      if (action === 'directory/listing') {
        user.listedAsGameMaster = data.visible;
        return { listed: data.visible };
      }
      if (action === 'play/respond') {
        relationship.status = 'approved';
        return { relationship };
      }
      throw new Error(`Unexpected action ${action}`);
    });
    const container = mount('account');
    const findForm = (label) =>
      descendants(container).find(
        (node) => node.tag === 'form' && node.children[0].textContent === label
      );
    await vi.waitFor(() => expect(findForm('Save Game Master listing')).toBeDefined());
    const listing = findForm('Save Game Master listing');
    expect(listing.elements.visible.checked).toBe(false);
    listing.elements.visible.checked = true;
    listing.listeners.submit({ preventDefault() {} });
    await vi.waitFor(() =>
      expect(
        descendants(container).some(
          (node) => node.textContent === 'Your Game Master name is now listed for Player accounts.'
        )
      ).toBe(true)
    );
    expect(identityRequest).toHaveBeenCalledWith('directory/listing', {
      role: 'game-master',
      visible: true,
    });
    expect(findForm('Save Game Master listing').elements.visible.checked).toBe(true);
    findForm('Approve play request: Player Name (@requesting-player)').listeners.submit({
      preventDefault() {},
    });
    await vi.waitFor(() =>
      expect(findForm('End play relationship: Player Name (@requesting-player)')).toBeDefined()
    );
    expect(identityRequest).toHaveBeenCalledWith('play/respond', {
      id: 'play-request',
      decision: 'approve',
    });
    expect(
      descendants(container).some((node) =>
        node.textContent.includes('resource ACLs are unchanged')
      )
    ).toBe(true);
  });

  it('offers only listed GMs, sends the selected request and lets the player cancel it', async () => {
    vi.stubGlobal(
      'FormData',
      class {
        constructor(panel) {
          return Object.entries(panel.elements).map(([name, input]) => [name, input.value || '']);
        }
      }
    );
    const user = { id: 'player', username: 'request-player', roles: ['player'] };
    const gm = {
      id: 'gm',
      username: 'listed-gm',
      displayName: 'Visible GM',
      roles: ['game-master'],
    };
    let relationships = [];
    identityRequest.mockImplementation(async (action, data) => {
      if (action === 'me') return { user };
      if (action === 'name-config') return { cultures: DEFAULT_NAME_CULTURES };
      if (action === 'directory/status')
        return {
          users: [
            user,
            gm,
            {
              id: 'unlisted-gm',
              username: 'unlisted-gm',
              displayName: 'Connected but unlisted GM',
              roles: ['game-master'],
            },
          ],
          relationships,
          listing: { gameMaster: false, player: false },
        };
      if (action === 'play/status') return { directory: [gm], relationships };
      if (action === 'closure/status') return { ownedCount: 0, outgoing: [], incoming: [] };
      if (action === 'play/request') {
        relationships = [
          {
            id: 'play-request',
            playerId: 'player',
            gameMasterId: 'gm',
            status: 'pending',
            createdAt: new Date().toISOString(),
          },
        ];
        return { relationship: relationships[0] };
      }
      if (action === 'play/respond') {
        relationships[0].status = 'cancelled';
        return { relationship: relationships[0] };
      }
      throw new Error(`Unexpected action ${action}: ${JSON.stringify(data)}`);
    });
    const container = mount('account');
    const findForm = (label) =>
      descendants(container).find(
        (node) => node.tag === 'form' && node.children[0].textContent === label
      );
    await vi.waitFor(() => expect(findForm('Request to play')).toBeDefined());
    expect(
      findForm('Request to play').elements.username.children.map((option) => option.textContent)
    ).toEqual(['Visible GM (@listed-gm)']);
    findForm('Request to play').listeners.submit({ preventDefault() {} });
    await vi.waitFor(() =>
      expect(findForm('Cancel play request: Visible GM (@listed-gm)')).toBeDefined()
    );
    expect(identityRequest).toHaveBeenCalledWith('play/request', { username: 'listed-gm' });
    expect(findForm('Request to play')).toBeUndefined();
    findForm('Cancel play request: Visible GM (@listed-gm)').listeners.submit({
      preventDefault() {},
    });
    await vi.waitFor(() => expect(findForm('Request to play')).toBeDefined());
    expect(identityRequest).toHaveBeenCalledWith('play/respond', {
      id: 'play-request',
      decision: 'cancel',
    });
    expect(
      descendants(container).some((node) => node.textContent.includes('cancelled. Requested'))
    ).toBe(true);
  });

  it('lets a Visitor request both roles, view the pending request and cancel it', async () => {
    vi.stubGlobal(
      'FormData',
      class {
        constructor() {
          return [];
        }
      }
    );
    let roleRequest = null;
    identityRequest.mockImplementation(async (action, data) => {
      const user = { id: 'visitor', username: 'visitor', roles: ['visitor'], roleRequest };
      if (action === 'me') return { user };
      if (action === 'name-config') return { cultures: DEFAULT_NAME_CULTURES };
      if (action === 'closure/status') return { ownedCount: 0, outgoing: [], incoming: [] };
      if (action === 'roles/request') {
        roleRequest = {
          id: 'request',
          roles: data.roles,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        return { user: { ...user, roleRequest } };
      }
      if (action === 'roles/cancel') {
        roleRequest = { ...roleRequest, status: 'cancelled', resolvedAt: new Date().toISOString() };
        return { user: { ...user, roleRequest } };
      }
      throw new Error(`Unexpected action ${action}`);
    });
    const container = mount('account');
    await vi.waitFor(() =>
      expect(
        descendants(container).some((node) => node.textContent === 'Submit role request')
      ).toBe(true)
    );
    let panel = descendants(container).find(
      (node) => node.tag === 'form' && node.children[0].textContent === 'Submit role request'
    );
    panel.elements.player.checked = true;
    panel.elements['game-master'].checked = true;
    panel.listeners.submit({ preventDefault() {} });
    await vi.waitFor(() =>
      expect(
        descendants(container).some((node) => node.textContent === 'Cancel role request')
      ).toBe(true)
    );
    expect(identityRequest).toHaveBeenCalledWith('roles/request', {
      roles: ['player', 'game-master'],
    });
    expect(
      descendants(container).some((node) =>
        node.textContent.includes('Your role request: pending - Player, Game Master')
      )
    ).toBe(true);
    expect(descendants(container).some((node) => node.textContent === 'Submit role request')).toBe(
      false
    );
    panel = descendants(container).find(
      (node) => node.tag === 'form' && node.children[0].textContent === 'Cancel role request'
    );
    panel.listeners.submit({ preventDefault() {} });
    await vi.waitFor(() =>
      expect(
        descendants(container).some((node) =>
          node.textContent.includes('Your role request: cancelled')
        )
      ).toBe(true)
    );
    expect(identityRequest).toHaveBeenCalledWith('roles/cancel', { requestId: 'request' });
    expect(descendants(container).some((node) => node.textContent === 'Submit role request')).toBe(
      true
    );
  });

  it.each(['approve', 'reject'])(
    'lets an administrator %s a specific pending role request and refreshes the queue',
    async (decision) => {
      vi.stubGlobal(
        'FormData',
        class {
          constructor() {
            return [];
          }
        }
      );
      const visitor = {
        id: 'visitor',
        username: 'waiting-user',
        roles: ['visitor'],
        roleRequest: {
          id: 'pending-id',
          roles: ['player', 'game-master'],
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      };
      identityRequest.mockImplementation(async (action, data) => {
        if (action === 'me') return { user: admin };
        if (action === 'name-config') return { cultures: DEFAULT_NAME_CULTURES };
        if (action === 'admin/list') return { users: [admin, visitor], grants: [] };
        if (action === 'admin/roles/review') {
          visitor.roleRequest.status = data.decision === 'approve' ? 'approved' : 'rejected';
          if (data.decision === 'approve') visitor.roles = ['player', 'game-master'];
          return { user: visitor };
        }
        throw new Error(`Unexpected action ${action}`);
      });
      const container = mount('admin-roles');
      const label = `${decision === 'approve' ? 'Approve' : 'Reject'} role request from waiting-user`;
      await vi.waitFor(() =>
        expect(descendants(container).some((node) => node.textContent === label)).toBe(true)
      );
      const panel = descendants(container).find(
        (node) => node.tag === 'form' && node.children[0].textContent === label
      );
      panel.listeners.submit({ preventDefault() {} });
      await vi.waitFor(() =>
        expect(
          descendants(container).some((node) => node.textContent === 'Pending role requests (0)')
        ).toBe(true)
      );
      expect(identityRequest).toHaveBeenCalledWith('admin/roles/review', {
        userId: 'visitor',
        requestId: 'pending-id',
        decision,
      });
      expect(
        descendants(container).some((node) =>
          node.textContent.includes(
            decision === 'approve' ? 'must sign in again' : 'Role request rejected'
          )
        )
      ).toBe(true);
    }
  );

  it('edits optional name components, prefills existing culture, and updates signed-in identity on save', async () => {
    vi.stubGlobal(
      'FormData',
      class {
        constructor(panel) {
          return Object.entries(panel.elements).map(([name, input]) => [name, input.value || '']);
        }
      }
    );
    const onAccessChange = vi.fn();
    identityRequest.mockImplementation(async (action, data) => {
      if (action === 'directory/status')
        return {
          users: [],
          relationships: [],
          listing: { gameMaster: false, player: false },
        };
      if (action === 'play/status') return { directory: [], relationships: [] };
      if (action === 'name-config') return { cultures: DEFAULT_NAME_CULTURES };
      if (action === 'me')
        return {
          user: {
            id: 'named',
            username: 'named',
            roles: ['player'],
            mfaEnabled: true,
            personalName: {
              firstName: 'Hana',
              familyName: 'Tanaka',
              culture: 'ja-JP',
              nameOrder: 'auto',
            },
          },
        };
      if (action === 'closure/status') return { ownedCount: 0, incoming: [], outgoing: [] };
      if (action === 'profile/name')
        return {
          user: {
            username: 'named',
            roles: ['player'],
            displayName: 'Tanaka Hana',
            personalName: data.personalName,
          },
        };
      throw new Error(`Unexpected action ${action}`);
    });
    const container = mount('account', { onAccessChange });
    await vi.waitFor(() =>
      expect(descendants(container).some((node) => node.name === 'firstName')).toBe(true)
    );
    const panel = descendants(container).find(
      (node) => node.tag === 'form' && node.children[0].textContent === 'Save personal name'
    );
    expect(panel.elements.culture.value).toBe('ja-JP');
    expect(panel.elements.culture.tag).toBe('select');
    expect(panel.elements.nameOrder).toBeUndefined();
    expect(panel.elements.familyName.value).toBe('Tanaka');
    expect(panel.elements.familyName.required).toBe(false);
    panel.listeners.submit({ preventDefault() {} });
    await vi.waitFor(() =>
      expect(onAccessChange).toHaveBeenCalledWith({
        stage: 'ready',
        user: expect.objectContaining({ displayName: 'Tanaka Hana' }),
      })
    );
    expect(
      descendants(container).some((node) => node.tag === 'h2' && node.textContent === 'Profile')
    ).toBe(true);
    expect(
      descendants(container).some((node) => node.textContent === 'Tanaka Hana (@named) - Player')
    ).toBe(false);
  });

  const admin = {
    id: 'admin',
    username: 'administrator',
    roles: ['admin'],
    mfaEnabled: true,
  };
  const player = { id: 'player', username: 'dual-role', roles: ['player', 'game-master'] };
  const configure = () =>
    identityRequest.mockImplementation(async (action) =>
      action === 'name-config'
        ? { cultures: DEFAULT_NAME_CULTURES }
        : action === 'me'
          ? { user: admin }
          : { users: [admin, player], grants: [] }
    );

  it('redeems an optional invitation on Register without sending it to normal registration', async () => {
    vi.stubGlobal(
      'FormData',
      class {
        constructor(panel) {
          return Object.entries(panel.elements).map(([name, input]) => [name, input.value || '']);
        }
      }
    );
    identityRequest.mockImplementation(async (action) => {
      if (action === 'status')
        return { setupRequired: false, accountFeatures: { invitations: true } };
      if (action === 'invite/redeem') return { message: 'Account created. Sign in to continue.' };
      throw new Error(`Unexpected action ${action}`);
    });
    const container = mount('register');
    await vi.waitFor(() =>
      expect(descendants(container).some((node) => node.name === 'code')).toBe(true)
    );
    const panel = descendants(container).find((node) => node.tag === 'form');
    expect(panel.elements.code.required).toBe(false);
    panel.elements.username.value = 'new-user';
    panel.elements.password.value = 'new-test-password';
    panel.elements.code.value = 'private-code';
    panel.listeners.submit({ preventDefault() {} });
    await vi.waitFor(() =>
      expect(identityRequest).toHaveBeenCalledWith('invite/redeem', {
        username: 'new-user',
        password: 'new-test-password',
        code: 'private-code',
      })
    );
    expect(identityRequest).not.toHaveBeenCalledWith('register', expect.anything());
  });

  it('creates invitations with selected roles, shows the code once, and refreshes revocations', async () => {
    vi.stubGlobal(
      'FormData',
      class {
        constructor() {
          return [];
        }
      }
    );
    let pending = [];
    identityRequest.mockImplementation(async (action, data) => {
      if (action === 'me') return { user: admin };
      if (action === 'name-config') return { cultures: DEFAULT_NAME_CULTURES };
      if (action === 'admin/list')
        return { users: [admin, player], grants: [], invitations: pending };
      if (action === 'admin/invite') {
        const invitation = { id: 'invite', roles: data.roles, expiresAt: Date.now() + 86400000 };
        pending = [invitation];
        return { code: 'private-one-time-code', invitation };
      }
      if (action === 'admin/invite/revoke') {
        pending = [];
        return { revoked: true };
      }
      throw new Error(`Unexpected action ${action}`);
    });
    const container = mount('admin-invitations');
    await vi.waitFor(() =>
      expect(descendants(container).some((node) => node.textContent === 'Create invitation')).toBe(
        true
      )
    );
    const panel = descendants(container).find(
      (node) => node.tag === 'form' && node.children[0].textContent === 'Create invitation'
    );
    panel.elements.player.checked = true;
    panel.listeners.submit({ preventDefault() {} });
    await vi.waitFor(() =>
      expect(descendants(container).some((node) => node.value === 'private-one-time-code')).toBe(
        true
      )
    );
    expect(identityRequest).toHaveBeenCalledWith('admin/invite', { roles: ['player'] });
    const revoke = descendants(container).find((node) => node.textContent === 'Revoke invitation');
    revoke.listeners.click();
    await vi.waitFor(() =>
      expect(
        descendants(container).some((node) => node.textContent === 'Pending invitations (0)')
      ).toBe(true)
    );
    expect(identityRequest).toHaveBeenCalledWith('admin/invite/revoke', { invitationId: 'invite' });
    expect(descendants(container).some((node) => node.value === 'private-one-time-code')).toBe(
      false
    );
  });

  it('groups actual accounts by readable role and distinguishes them from profiles', async () => {
    configure();
    const container = mount('admin-roles');
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
    expect(labels).not.toContain('System configuration: cultures and name order');
    expect(labels).not.toContain('Add selectable culture');
  });

  it('paginates role lists at ten accounts and resets the page when searching or filtering status', async () => {
    const accounts = Array.from({ length: 23 }, (_, index) => ({
      id: `visitor-${index}`,
      username: `visitor-${String(index).padStart(2, '0')}`,
      displayName: index === 22 ? 'Unique Display Name' : '',
      roles: ['visitor'],
      disabled: index === 22,
    }));
    identityRequest.mockImplementation(async (action) => {
      if (action === 'me') return { user: admin };
      if (action === 'name-config') return { cultures: DEFAULT_NAME_CULTURES };
      return { users: [admin, ...accounts], grants: [] };
    });
    const container = mount('admin-roles');
    await vi.waitFor(() =>
      expect(
        descendants(container).some((node) => node.textContent === 'Visitor accounts (23)')
      ).toBe(true)
    );
    const group = descendants(container).find(
      (node) => node.tag === 'section' && node.children[0]?.textContent === 'Visitor accounts (23)'
    );
    const list = group.children.find((node) => node.tag === 'ul');
    const controls = group.children.at(-1);
    expect(list.children).toHaveLength(10);
    expect(controls.children[0].disabled).toBe(true);
    controls.children[1].listeners.click();
    expect(group.children[1].textContent).toContain('Showing 11-20 of 23');
    controls.children[1].listeners.click();
    expect(list.children).toHaveLength(3);
    expect(controls.children[1].disabled).toBe(true);
    const search = descendants(container).find((node) => node.type === 'search');
    search.value = 'unique display';
    search.listeners.input();
    expect(list.children).toHaveLength(1);
    expect(group.children[1].textContent).toContain('page 1 of 1');
    const state = descendants(container).find(
      (node) =>
        node.tag === 'select' &&
        node.children.some((option) => option.textContent === 'All accounts')
    );
    state.value = 'active';
    state.listeners.change();
    expect(list.children).toHaveLength(0);
    expect(group.children[1].textContent).toBe('No accounts match these filters.');
    search.value = '';
    search.listeners.input();
    expect(group.children[0].textContent).toBe('Visitor accounts (22)');
    expect(list.children).toHaveLength(10);
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
      if (action === 'name-config') return { cultures: DEFAULT_NAME_CULTURES };
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
    const container = mount('admin-roles');
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
      if (action === 'name-config') return { cultures: DEFAULT_NAME_CULTURES };
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
      if (action === 'name-config') return { cultures: DEFAULT_NAME_CULTURES };
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
      identityRequest.mock.calls.every(([action]) =>
        ['me', 'name-config', 'closure/status'].includes(action)
      )
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
    ).toContain('pnpm run heroes:setup-code');
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
    ).toContain('pnpm.cmd install');
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

  it.each([true, false])(
    'routes login registration according to setupRequired=%s',
    async (setupRequired) => {
      identityRequest.mockResolvedValue({ setupRequired });
      const container = mount('login');
      await vi.waitFor(() =>
        expect(descendants(container).some((node) => node.type === 'submit')).toBe(true)
      );
      const registrationLinks = descendants(container).filter((node) =>
        node.textContent.startsWith('Register')
      );
      expect(registrationLinks).toHaveLength(1);
      expect(registrationLinks[0].href).toBe(
        setupRequired ? '/site/heroes/setup/' : '/site/heroes/register/'
      );
      expect(registrationLinks[0].textContent).toBe(
        setupRequired ? 'Register first administrator' : 'Register as visitor'
      );
    }
  );

  it('makes registration and setup discoverable from login immediately, even when offline', async () => {
    identityRequest.mockRejectedValue(new Error('Failed to fetch'));
    const container = mount('login');
    expect(
      descendants(container).some(
        (node) =>
          node.href === '/site/heroes/register/' && node.textContent === 'Register as visitor'
      )
    ).toBe(true);
    await vi.waitFor(() =>
      expect(descendants(container).some((node) => node.textContent === 'Failed to fetch')).toBe(
        true
      )
    );
    expect(descendants(container).some((node) => node.href === '/site/heroes/setup/')).toBe(true);
    expect(
      descendants(container).filter((node) => node.href === '/site/heroes/register/')
    ).toHaveLength(1);
  });
});
