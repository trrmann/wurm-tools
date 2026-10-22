export const HEROES_NAVIGATION = [
  ['Worlds & objects', '/site/heroes/'],
  ['Game Masters & players', '/site/heroes/people/'],
  ['Wurm Tools', '/'],
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
  { href: '/site/heroes/people/admins/', title: 'Admins', group: 'people', admin: true },
  { href: '/site/heroes/people/notes/', title: 'GM notes', group: 'people', section: 'note' },
];

export function getHeroesPage(pathname) {
  const path = pathname.replace(/index\.html$/, '').replace(/\/?$/, '/');
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

export function renderHeroesNavigation(container, filter = '') {
  container.replaceChildren();
  const current = getHeroesPage(window.location.pathname);
  for (const page of HEROES_PAGES.filter((page) => page.group === current.group)) {
    if (!page.title.toLowerCase().includes(filter.toLowerCase())) continue;
    const link = document.createElement('a');
    link.className = 'nav-link';
    link.href = heroesPageHref(page, window.location.search);
    link.textContent = page.title;
    if (current.href === page.href) link.setAttribute('aria-current', 'page');
    container.append(link);
  }
}
