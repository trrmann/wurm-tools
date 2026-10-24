import { initializeHeroesTheme } from '../src/js/tools/heroes/theme.js';

export function heroesThemePlugin() {
  return {
    name: 'heroes-theme-before-paint',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        if (
          !['/', '/index.html'].includes(context.path) &&
          !context.path.startsWith('/site/heroes/')
        )
          return html;
        return [
          {
            tag: 'script',
            children: `(${initializeHeroesTheme.toString()})();`,
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  };
}
