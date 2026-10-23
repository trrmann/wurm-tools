export const HEROES_NAVIGATION = [
  ['Worlds & objects', '/site/heroes/'],
  ['Game Masters & players', '/site/heroes/people/'],
  ['Account / Login', '/site/heroes/account/'],
  ['Logout', '/site/heroes/logout/'],
  ['Wurm Tools', '/site/wurm/'],
];

export const HEROES_PAGES = [
  { href: '/site/heroes/', title: 'Worlds', group: 'worlds', editor: 'worlds', section: 'world' },
  { href: '/site/heroes/genres/', title: 'Genres', group: 'worlds', section: 'genre' },
  { href: '/site/heroes/campaigns/', title: 'Campaigns', group: 'worlds', section: 'campaign' },
  { href: '/site/heroes/objects/', title: 'Objects', group: 'worlds', editor: 'objects' },
  {
    href: '/site/heroes/non-player-characters/',
    title: 'Non-player characters',
    group: 'worlds',
    editor: 'non-player-character',
  },
  {
    href: '/site/heroes/player-characters/',
    title: 'Player characters',
    group: 'worlds',
    editor: 'player-character',
  },
  {
    href: '/site/heroes/assignments/',
    title: 'Character assignments',
    group: 'worlds',
    section: 'character',
  },
  {
    href: '/site/heroes/object-availability/',
    title: 'Object availability',
    group: 'worlds',
    section: 'object-scope',
  },
  {
    href: '/site/heroes/library/',
    title: 'Shared definition library',
    group: 'worlds',
    editor: 'library',
  },
  {
    href: '/site/heroes/people/',
    title: 'Game Masters',
    group: 'people',
    section: 'profile',
    role: 'game-master',
  },
  {
    href: '/site/heroes/people/players/',
    title: 'Players',
    group: 'people',
    section: 'profile',
    role: 'player',
  },
  { href: '/site/heroes/people/admins/', title: 'Admins', group: 'people', account: 'admin' },
  { href: '/site/heroes/people/notes/', title: 'GM notes', group: 'people', section: 'note' },
  ...[
    ['account', 'Account & security'],
    ['login', 'Login'],
    ['register', 'Register'],
    ['setup', 'Administrator setup'],
    ['logout', 'Logout'],
    ['logout-success', 'Logout confirmation'],
  ].map(([account, title]) => ({
    href: `/site/heroes/${account}/`,
    title,
    group: 'account',
    account,
  })),
];

export function getHeroesPage(pathname) {
  const path = pathname.replace(/index\.html$/, '').replace(/\/?$/, '/');
  if (path === '/') return HEROES_PAGES.find((page) => page.account === 'login');
  return HEROES_PAGES.find((page) => page.href === path) ?? HEROES_PAGES[0];
}

export function heroesPageHref(page, search = '') {
  if (!page.href.startsWith('/site/heroes/')) return page.href;
  const source = new URLSearchParams(search);
  const query = new URLSearchParams();
  for (const key of ['world', 'profile']) {
    if (source.get(key)) query.set(key, source.get(key));
  }
  return `${page.href}${query.size ? `?${query}` : ''}`;
}

export function updateHeroesContext(values) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(values)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  window.history.replaceState(null, '', url);
  for (const link of document.querySelectorAll('#sidebar-navigation a, #nav-menu a')) {
    const target = new URL(link.href, window.location.origin);
    if (target.pathname.startsWith('/site/heroes/'))
      link.href = heroesPageHref({ href: target.pathname }, url.search);
  }
}

export function getHeroesObjectPage(object) {
  const type = object.definition?.objectType ?? object.definition?.kind ?? object.kind ?? 'object';
  return HEROES_PAGES.find(
    (page) =>
      page.editor ===
      (['player-character', 'non-player-character'].includes(type) ? type : 'objects')
  );
}

export function isObjectForHeroesPage(object, page) {
  return page.editor === 'worlds' || getHeroesObjectPage(object).href === page.href;
}

// Receives only resources already filtered by the helper's authoritative ACL checks.
export function heroesWorkspaceRoutes(roles, state, library) {
  if (roles.includes('admin'))
    return HEROES_PAGES.filter((page) => !page.account).map((page) => page.href);
  const gm = roles.includes('game-master');
  const creator = gm || roles.includes('player');
  return HEROES_PAGES.filter((page) => {
    if (page.account) return false;
    if (page.section === 'world') return gm || state.worlds.length > 0;
    if (page.editor === 'library') return creator || library.length > 0;
    if (page.editor)
      return creator || state.objects.some((object) => isObjectForHeroesPage(object, page));
    const readable = state.records.some(
      (record) =>
        record.kind === page.section && (!page.role || record.data.roles.includes(page.role))
    );
    return readable || (['character', 'object-scope'].includes(page.section) ? creator : gm);
  }).map((page) => page.href);
}

export function heroesRouteAllowed(page, access) {
  return page.account
    ? page.account !== 'admin' || access.user.roles.includes('admin')
    : access.user.roles.includes('admin') || access.routes?.includes(page.href) === true;
}

export function heroesNavigationLinks(access) {
  if (access.stage !== 'ready')
    return heroesAccessPages(access).map((page) => [page.title, page.href]);
  const permitted = heroesAccessPages(access);
  return HEROES_NAVIGATION.flatMap(([label, href]) => {
    if (href === '/site/wurm/')
      return access.user.roles.includes('admin') || access.user.wurmAccess ? [[label, href]] : [];
    if (['/site/heroes/', '/site/heroes/people/'].includes(href)) {
      const group = href === '/site/heroes/' ? 'worlds' : 'people';
      const destination = permitted.find((page) => page.group === group);
      return destination ? [[label, destination.href]] : [];
    }
    return [[label, href]];
  });
}

export function heroesAccessPages(access) {
  if (access.stage === 'checking') return [];
  if (access.stage === 'setup') return HEROES_PAGES.filter((page) => page.account === 'setup');
  if (access.stage === 'anonymous')
    return HEROES_PAGES.filter((page) => ['login', 'register'].includes(page.account));
  if (access.stage === 'mfa')
    return HEROES_PAGES.filter((page) => ['account', 'logout'].includes(page.account));
  return HEROES_PAGES.filter(
    (page) =>
      !['login', 'register', 'setup', 'logout-success'].includes(page.account) &&
      heroesRouteAllowed(page, access)
  );
}

export function heroesAccessRedirect(page, access) {
  if (access.stage === 'setup') return page.account === 'setup' ? null : '/site/heroes/setup/';
  if (access.stage === 'anonymous')
    return ['login', 'register', 'logout-success', 'setup'].includes(page.account)
      ? null
      : '/site/heroes/login/';
  if (access.stage === 'mfa')
    return ['account', 'logout'].includes(page.account) ? null : '/site/heroes/account/';
  if (access.stage === 'ready' && page.account === 'admin' && !access.user.roles.includes('admin'))
    return '/site/heroes/account/?notice=route-denied';
  if (access.stage === 'ready' && !page.account && !heroesRouteAllowed(page, access))
    return '/site/heroes/account/?notice=route-denied';
  if (access.stage === 'ready' && ['setup', 'login', 'register'].includes(page.account))
    return '/site/heroes/account/';
  return null;
}

export function renderHeroesNavigation(container, filter = '', access = null) {
  container.replaceChildren();
  const current = getHeroesPage(window.location.pathname);
  const pages = access ? heroesAccessPages(access) : HEROES_PAGES;
  for (const page of pages.filter(
    (page) => (access && access.stage !== 'ready') || page.group === current.group
  )) {
    if (!page.title.toLowerCase().includes(filter.toLowerCase())) continue;
    const link = document.createElement('a');
    link.className = 'nav-link';
    link.href = heroesPageHref(page, window.location.search);
    link.textContent = page.title;
    if (current.href === page.href) link.setAttribute('aria-current', 'page');
    container.append(link);
  }
}
