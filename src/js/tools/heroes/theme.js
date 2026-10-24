// Kept self-contained so Vite can run this same function before styles or modules load.
export function initializeHeroesTheme(theme) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const path = window.location.pathname;
  if (!['/', '/index.html', '/site/heroes'].includes(path) && !path.startsWith('/site/heroes/'))
    return;
  const root = document.documentElement;
  root.dataset.game = 'heroes';
  try {
    if (theme === 'light' || theme === 'dark') localStorage.setItem('heros-theme-v1', theme);
    else theme = localStorage.getItem('heros-theme-v1');
  } catch {
    // Disabled storage must not prevent account access or an in-memory theme change.
  }
  root.dataset.heroesTheme =
    theme === 'light' || theme === 'dark'
      ? theme
      : root.dataset.heroesTheme === 'light'
        ? 'light'
        : 'dark';
}

export function applyHeroesAccountTheme(user) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  initializeHeroesTheme(user.preferences?.theme === 'light' ? 'light' : 'dark');
  document.documentElement.dataset.heroesThemeAccount = user.id || user.username || '';
}
