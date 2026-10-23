import {
  heroesNavigationLinks,
  getHeroesPage,
  heroesPageHref,
  heroesAccessPages,
} from './heroes-navigation.js';
import { HEROES_ROLE_LABELS, heroesAccountLabel } from '../../tools/heroes/session.js';

export function applyHeroesBranding(container, access = null) {
  document.documentElement.dataset.game = 'heroes';
  const title = container.querySelector('.sidebar-title');
  const subtitle = container.querySelector('.sidebar-subtitle');
  const logo = container.querySelector('.logo-badge img');
  const footer = container.querySelector('.footer-content > p');
  if (title) title.textContent = 'Heros Tools';
  if (subtitle)
    subtitle.textContent = access?.user
      ? `Signed in as ${heroesAccountLabel(access.user)} - ${access.user.roles.map((role) => HEROES_ROLE_LABELS[role] || role).join(', ')}${access.stage === 'mfa' ? ' (verification required)' : ''}`
      : 'HERO System workspace';
  const header = container.querySelector('.header-title-container');
  if (header) {
    let identity = header.querySelector('.heroes-signed-in');
    if (!identity) {
      identity = document.createElement('p');
      identity.className = 'heroes-signed-in';
      identity.setAttribute('aria-live', 'polite');
      header.append(identity);
    }
    identity.textContent = access?.user
      ? `Signed in as ${heroesAccountLabel(access.user)}${access.stage === 'mfa' ? ' (verification required)' : ''}`
      : '';
    identity.title = identity.textContent;
    identity.hidden = !access?.user;
  }
  if (logo) {
    logo.alt = 'Heros Tools';
    logo.src = '/images/heroes-logo.svg';
  }
  if (footer) footer.textContent = 'Heros Tools - HERO System campaign and character workspace';
  const menu = container.querySelector('#nav-menu');
  if (menu) {
    menu.replaceChildren();
    const navigation = heroesNavigationLinks(access || { stage: 'checking' });
    for (const [label, href] of navigation) {
      if (
        href === '/site/wurm/' &&
        !(
          access?.stage === 'ready' &&
          (access.user.roles.includes('admin') || access.user.wurmAccess)
        )
      )
        continue;
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.textContent = label;
      link.className = 'nav-link';
      link.href = heroesPageHref({ href }, window.location.search);
      const current = getHeroesPage(window.location.pathname);
      if (
        (href.startsWith('/site/heroes/') &&
          getHeroesPage(href).group === 'worlds' &&
          current.group === 'worlds') ||
        (getHeroesPage(href).group === 'people' && current.group === 'people') ||
        (href === '/site/heroes/account/' &&
          current.group === 'account' &&
          !current.account.startsWith('logout'))
      )
        link.setAttribute('aria-current', 'page');
      item.append(link);
      menu.append(item);
    }
  }
  const concepts = container.querySelector('#open-concepts-modal-btn');
  concepts?.remove();
  const roadmap = container.querySelector('.footer-links a[href="/site/concepts/"]');
  if (roadmap) {
    roadmap.textContent = 'Game Masters & players';
    roadmap.href = '/site/heroes/people/';
  }
  const dashboard = container.querySelector('.footer-links a[href="/site/wurm/"]');
  if (dashboard) {
    dashboard.textContent = 'Heros Worlds';
    dashboard.href = '/site/heroes/';
  }
  if (access) {
    const links = container.querySelector('.footer-links');
    if (links) {
      links.replaceChildren();
      const pages =
        access.stage === 'ready'
          ? heroesNavigationLinks(access).filter(([, href]) => href !== '/site/heroes/logout/')
          : heroesAccessPages(access).map((page) => [page.title, page.href]);
      for (const [label, href] of pages) {
        const link = document.createElement('a');
        link.textContent = label;
        link.href = href;
        links.append(link);
      }
    }
  }
}
