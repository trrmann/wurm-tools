import {
  heroesNavigationLinks,
  getHeroesPage,
  heroesPageHref,
  heroesAccessPages,
} from './heroes-navigation.js';
import {
  HEROES_ROLE_LABELS,
  heroesAccountLabel,
  heroesSessionToken,
  identityRequest,
} from '../../tools/heroes/session.js';
import { heroesRoleLocation } from '../../tools/heroes/preferences.js';
import { applyHeroesAccountTheme, initializeHeroesTheme } from '../../tools/heroes/theme.js';

export function applyHeroesBranding(container, access = null) {
  document.documentElement.dataset.game = 'heroes';
  if (access?.user) applyHeroesAccountTheme(access.user);
  else if (!document.documentElement.dataset.heroesTheme) initializeHeroesTheme();
  if (access && !access.user && access.stage !== 'checking')
    delete document.documentElement.dataset.heroesThemeAccount;
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
    header.querySelector('.heroes-signed-in')?.remove();
    header.querySelector('.heroes-role-switcher')?.remove();
    if (access?.stage === 'ready') {
      const label = document.createElement('label');
      label.className = 'heroes-role-switcher';
      label.textContent = 'Active role ';
      const assigned = access.user.assignedRoles || access.user.roles;
      const select = document.createElement(assigned.length > 1 ? 'select' : 'span');
      select.className = 'custom-select';
      select.setAttribute('aria-label', 'Active role');
      for (const role of assigned.length > 1 ? assigned : []) {
        const option = document.createElement('option');
        option.value = role;
        option.textContent = HEROES_ROLE_LABELS[role] || role;
        select.append(option);
      }
      select.value = access.user.activeRole || access.user.roles[0];
      if (assigned.length === 1)
        select.textContent = HEROES_ROLE_LABELS[assigned[0]] || assigned[0];
      const status = document.createElement('span');
      status.setAttribute('role', 'status');
      select.addEventListener('change', async () => {
        select.disabled = true;
        try {
          const result = await identityRequest('role/select', { role: select.value });
          window.location.replace(heroesRoleLocation(select.value, result.location));
        } catch (error) {
          status.textContent = error.message;
          select.value = access.user.activeRole || access.user.roles[0];
          select.disabled = false;
        }
      });
      label.append(select, status);
      header.append(label);
    }
  }
  const top = container.querySelector('.top-header');
  if (top && access?.stage === 'ready') {
    top.querySelector('.heroes-session-actions')?.remove();
    const actions = document.createElement('div');
    actions.className = 'heroes-session-actions';
    const theme = document.createElement('button');
    theme.type = 'button';
    theme.className = 'btn heroes-theme-toggle';
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    theme.append(icon);
    const updateThemeButton = () => {
      const target = document.documentElement.dataset.heroesTheme === 'light' ? 'dark' : 'light';
      const label = `Switch to ${target} mode`;
      theme.title = label;
      theme.setAttribute('aria-label', label);
      icon.textContent = target === 'light' ? '☀' : '☾';
    };
    updateThemeButton();
    const status = document.createElement('span');
    status.setAttribute('role', 'status');
    theme.addEventListener('click', async () => {
      const target = document.documentElement.dataset.heroesTheme === 'light' ? 'dark' : 'light';
      const account = document.documentElement.dataset.heroesThemeAccount;
      const session = heroesSessionToken();
      theme.disabled = true;
      status.textContent = '';
      try {
        const result = await identityRequest('preferences/save', { theme: target });
        if (result.preferences?.theme !== target)
          throw new Error('The helper did not confirm the appearance preference. Please retry.');
        if (
          document.documentElement.dataset.heroesThemeAccount !== account ||
          heroesSessionToken() !== session
        )
          return;
        access.user.preferences = { ...access.user.preferences, theme: target };
        applyHeroesAccountTheme(access.user);
        updateThemeButton();
        status.textContent = 'Appearance saved.';
      } catch (error) {
        status.textContent = error.message;
      } finally {
        theme.disabled = false;
      }
    });
    actions.append(theme, status);
    const exit = document.createElement(access.user.impersonation ? 'button' : 'a');
    exit.className = 'btn';
    exit.textContent = access.user.impersonation ? 'Release' : 'Logout';
    if (access.user.impersonation) {
      exit.type = 'button';
      exit.addEventListener('click', async () => {
        exit.disabled = true;
        try {
          await identityRequest('impersonation/release', {});
          window.location.replace('/site/heroes/people/admins/');
        } catch (error) {
          status.textContent = error.message;
          exit.disabled = false;
        }
      });
      const notice = document.createElement('span');
      notice.textContent = access.user.impersonation.preview
        ? 'Disposable role preview - changes are discarded on Release'
        : `Impersonating - actor: ${access.user.impersonation.actorName}`;
      actions.append(notice);
    } else exit.href = '/site/heroes/logout/';
    actions.append(exit);
    top.append(actions);
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
