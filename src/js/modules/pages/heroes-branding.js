import { HEROES_NAVIGATION, getHeroesPage, heroesPageHref } from './heroes-navigation.js';

export function applyHeroesBranding(container) {
  document.documentElement.dataset.game = 'heroes';
  const title = container.querySelector('.sidebar-title');
  const subtitle = container.querySelector('.sidebar-subtitle');
  const logo = container.querySelector('.logo-badge img');
  const footer = container.querySelector('.footer-content > p');
  if (title) title.textContent = 'Heros Tools';
  if (subtitle) subtitle.textContent = 'HERO System workspace';
  if (logo) {
    logo.alt = 'Heros Tools';
    logo.src = '/images/heroes-logo.svg';
  }
  if (footer) footer.textContent = 'Heros Tools - HERO System campaign and character workspace';
  const menu = container.querySelector('#nav-menu');
  if (menu) {
    menu.replaceChildren();
    for (const [label, href] of HEROES_NAVIGATION) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.textContent = label;
      link.className = 'nav-link';
      link.href = heroesPageHref({ href }, window.location.search);
      const current = getHeroesPage(window.location.pathname);
      if (
        (href === '/site/heroes/' && current.group === 'worlds') ||
        (href === '/site/heroes/people/' && current.group === 'people')
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
  const dashboard = container.querySelector('.footer-links a[href="/"]');
  if (dashboard) {
    dashboard.textContent = 'Heros Worlds';
    dashboard.href = '/site/heroes/';
  }
}
