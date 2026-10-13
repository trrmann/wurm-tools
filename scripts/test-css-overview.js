// Automated Chrome CSS Overview Testing Suite for Wurm Tools
// Emulates Chrome DevTools CSS Overview panel: colors, contrast, typography, media queries, and unused rules

import { CdpSession } from './cdp-client.js';

const DEFAULT_PAGES = ['/', '/site/concepts/', '/site/server-status/'];
const DEFAULT_BASE_URL = 'https://wurm-tools.onrender.com';

const args = process.argv.slice(2);
let baseUrl = DEFAULT_BASE_URL;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && args[i + 1]) {
    baseUrl = args[++i];
  } else if (args[i].startsWith('http://') || args[i].startsWith('https://')) {
    baseUrl = args[i];
  }
}

baseUrl = baseUrl.replace(/\/+$/, '');

console.log('==========================================================');
console.log('         Wurm Tools — Chrome CSS Overview Audit');
console.log('==========================================================');
console.log(`Target Base URL  : ${baseUrl}`);
console.log(`Pages To Analyze : ${DEFAULT_PAGES.length}\n`);

async function analyzeCssOverview(cdp, pagePath) {
  const fullUrl = `${baseUrl}${pagePath}`;
  await cdp.navigate(fullUrl, { timeoutMs: 25000 });

  const overview = await cdp.evaluate(`
    (() => {
      // 1. Gather all stylesheets and rules
      let totalRules = 0;
      let mediaQueries = new Set();
      let allSelectors = [];
      
      try {
        for (const sheet of document.styleSheets) {
          try {
            const rules = sheet.cssRules || [];
            totalRules += rules.length;
            for (const r of rules) {
              if (r.type === CSSRule.MEDIA_RULE) {
                mediaQueries.add(r.conditionText || r.media.mediaText);
                for (const inner of r.cssRules || []) {
                  if (inner.selectorText) allSelectors.push(inner.selectorText);
                }
              } else if (r.selectorText) {
                allSelectors.push(r.selectorText);
              }
            }
          } catch (e) {
            // Cross-origin stylesheet access restricted
          }
        }
      } catch (e) {}

      // 2. Analyze DOM computed styles
      const elements = Array.from(document.querySelectorAll('*'));
      const textColors = new Set();
      const bgColors = new Set();
      const borderColors = new Set();
      const fontFamilies = new Set();
      const fontSizes = new Set();
      const fontWeights = new Set();
      const lineHeights = new Set();

      function normalizeColor(c) {
        if (!c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent') return null;
        return c;
      }

      for (const el of elements) {
        const style = window.getComputedStyle(el);
        const textC = normalizeColor(style.color);
        const bgC = normalizeColor(style.backgroundColor);
        const borderC = normalizeColor(style.borderColor);

        if (textC && el.innerText?.trim()) textColors.add(textC);
        if (bgC) bgColors.add(bgC);
        if (borderC) borderColors.add(borderC);

        if (style.fontFamily) {
          const primaryFont = style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
          fontFamilies.add(primaryFont);
        }
        if (style.fontSize) fontSizes.add(style.fontSize);
        if (style.fontWeight) fontWeights.add(style.fontWeight);
        if (style.lineHeight) lineHeights.add(style.lineHeight);
      }

      // 3. Unused selector analysis
      let usedSelectors = 0;
      let unusedSelectors = 0;
      const sampledUnused = [];

      for (const sel of allSelectors) {
        // split grouped selectors
        const parts = sel.split(',');
        for (let p of parts) {
          p = p.trim();
          if (!p || p.includes(':') || p.includes('::')) continue; // skip pseudo-classes/elements
          try {
            if (document.querySelector(p)) {
              usedSelectors++;
            } else {
              unusedSelectors++;
              if (sampledUnused.length < 5) sampledUnused.push(p);
            }
          } catch (e) {
            // invalid selector in browser context
          }
        }
      }

      const totalTestedSelectors = usedSelectors + unusedSelectors;
      const selectorUsagePct = totalTestedSelectors > 0
        ? Math.round((usedSelectors / totalTestedSelectors) * 100)
        : 100;

      return {
        domElementsCount: elements.length,
        totalRules,
        mediaQueries: Array.from(mediaQueries),
        colors: {
          textColors: Array.from(textColors),
          bgColors: Array.from(bgColors),
          borderColors: Array.from(borderColors),
        },
        typography: {
          fontFamilies: Array.from(fontFamilies),
          fontSizes: Array.from(fontSizes).sort((a,b) => parseFloat(a) - parseFloat(b)),
          fontWeights: Array.from(fontWeights).sort((a,b) => parseInt(a,10) - parseInt(b,10)),
        },
        selectors: {
          total: totalTestedSelectors,
          used: usedSelectors,
          unused: unusedSelectors,
          usagePct: selectorUsagePct,
          sampledUnused,
        }
      };
    })()
  `);

  return overview;
}

async function run() {
  const cdp = new CdpSession({ port: 9222, headless: true });

  try {
    await cdp.launch();

    for (const pagePath of DEFAULT_PAGES) {
      console.log(`>>> CSS Overview for: ${pagePath} (${baseUrl}${pagePath})`);
      const data = await analyzeCssOverview(cdp, pagePath);

      console.log('  ┌────────────────────────────────────────────────────────┐');
      console.log('  │ Metric                     │ Summary Value              │');
      console.log('  ├────────────────────────────┼────────────────────────────┤');
      console.log(
        `  │ DOM Elements Styled        │ ${data.domElementsCount.toString().padEnd(26, ' ')} │`
      );
      console.log(
        `  │ Stylesheet Rules Loaded    │ ${data.totalRules.toString().padEnd(26, ' ')} │`
      );
      console.log(
        `  │ Unique Text Colors         │ ${data.colors.textColors.length.toString().padEnd(26, ' ')} │`
      );
      console.log(
        `  │ Unique Background Colors   │ ${data.colors.bgColors.length.toString().padEnd(26, ' ')} │`
      );
      console.log(
        `  │ Unique Font Families       │ ${data.typography.fontFamilies.join(', ').slice(0, 26).padEnd(26, ' ')} │`
      );
      console.log(
        `  │ Font Sizes Count           │ ${data.typography.fontSizes.length.toString().padEnd(26, ' ')} │`
      );
      console.log(
        `  │ Media Query Breakpoints    │ ${data.mediaQueries.length.toString().padEnd(26, ' ')} │`
      );
      console.log(
        `  │ Selector Utilization Rate  │ ${`${data.selectors.usagePct}% (${data.selectors.used}/${data.selectors.total})`.padEnd(26, ' ')} │`
      );
      console.log('  └────────────────────────────────────────────────────────┘');

      if (data.mediaQueries.length > 0) {
        console.log(`  • Active Breakpoints: ${data.mediaQueries.join('; ')}`);
      }
      console.log(`  • Font Sizes in Use : ${data.typography.fontSizes.join(', ')}`);
      console.log(`  • Font Weights      : ${data.typography.fontWeights.join(', ')}`);
      console.log('');
    }

    console.log('==========================================================');
    console.log('  [SUCCESS] Chrome CSS Overview audit completed!');
    console.log('==========================================================\n');
  } finally {
    await cdp.close();
  }
}

run().catch((err) => {
  console.error('[FATAL] CSS Overview runner failed:', err);
  process.exit(1);
});
