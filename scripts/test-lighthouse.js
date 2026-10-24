// Automated Chrome Lighthouse Auditing Suite for Wurm Tools
// Audits Performance, Accessibility, Best Practices, and SEO using Chrome DevTools Protocol

import { CdpSession } from './cdp-client.js';
import { projectPagePaths, verifyPageResponse } from './project-pages.js';

const pages = projectPagePaths();
const DEFAULT_BASE_URL = 'https://wurm-tools.onrender.com';

// Parse command line arguments
const args = process.argv.slice(2);
let baseUrl = DEFAULT_BASE_URL;
let minScore = 85;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && args[i + 1]) {
    baseUrl = args[++i];
  } else if (args[i] === '--min-score' && args[i + 1]) {
    minScore = parseInt(args[++i], 10);
  } else if (args[i].startsWith('http://') || args[i].startsWith('https://')) {
    baseUrl = args[i];
  }
}

baseUrl = baseUrl.replace(/\/+$/, '');

console.log('==========================================================');
console.log('         Wurm Tools — Chrome Lighthouse Audit Suite');
console.log('==========================================================');
console.log(`Target Base URL  : ${baseUrl}`);
console.log(`Pass Threshold   : ${minScore}/100 per category`);
console.log(`Pages To Audit   : ${pages.length} (from Vite build entries)\n`);

async function auditPage(cdp, pagePath) {
  const fullUrl = `${baseUrl}${pagePath}`;
  await verifyPageResponse(fullUrl);
  const consoleMessages = [];

  // Track console events
  await cdp.send('Runtime.enable');
  const onConsoleMessage = (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.method === 'Runtime.consoleAPICalled') {
        const type = msg.params.type;
        const text = msg.params.args?.map((a) => a.value).join(' ') || '';
        if (type === 'error' || type === 'warn') {
          consoleMessages.push({ type, text });
        }
      }
    } catch {
      /* ignore non-console CDP messages */
    }
  };
  cdp.ws.on('message', onConsoleMessage);

  try {
    await cdp.navigate(fullUrl, { timeoutMs: 25000 });

    // 1. PERFORMANCE METRICS (Web Vitals / Navigation Timing)
    const perfData = await cdp.evaluate(`
    (() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      const paint = performance.getEntriesByType('paint') || [];
      const fcp = paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0;
      const fp = paint.find(p => p.name === 'first-paint')?.startTime || 0;
      return {
        ttfb: nav.responseStart ? Math.round(nav.responseStart - nav.requestStart) : 0,
        domInteractive: nav.domInteractive ? Math.round(nav.domInteractive) : 0,
        domComplete: nav.domComplete ? Math.round(nav.domComplete) : 0,
        loadEventEnd: nav.loadEventEnd ? Math.round(nav.loadEventEnd) : 0,
        transferSize: nav.transferSize || 0,
        fcp: Math.round(fcp),
        fp: Math.round(fp)
      };
    })()
  `);

    // Calculate performance score (0-100)
    let perfScore = 100;
    if (perfData.fcp > 2500) perfScore -= 20;
    else if (perfData.fcp > 1800) perfScore -= 10;
    if (perfData.domComplete > 3500) perfScore -= 15;
    if (perfData.ttfb > 1200) perfScore -= 15;
    perfScore = Math.max(perfScore, 60);

    // 2. ACCESSIBILITY CHECKS
    const a11yData = await cdp.evaluate(`
    (() => {
      const issues = [];
      if (!document.documentElement.lang) issues.push('Missing <html lang> attribute');
      if (!document.title) issues.push('Missing page <title>');
      
      // Images alt check
      const imgs = Array.from(document.querySelectorAll('img'));
      const missingAlt = imgs.filter(img => !img.hasAttribute('alt'));
      if (missingAlt.length > 0) issues.push(missingAlt.length + ' image(s) missing alt attribute');

      // Form inputs check
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea'));
      const unlabelled = inputs.filter(i => {
        const id = i.id;
        const hasLabel = id && document.querySelector('label[for="' + id + '"]');
        const hasAria = i.getAttribute('aria-label') || i.getAttribute('aria-labelledby');
        return !hasLabel && !hasAria;
      });
      if (unlabelled.length > 0) issues.push(unlabelled.length + ' input(s) missing accessible label or aria-label');

      // Buttons check
      const btns = Array.from(document.querySelectorAll('button'));
      const emptyBtns = btns.filter(b => !b.textContent.trim() && !b.getAttribute('aria-label'));
      if (emptyBtns.length > 0) issues.push(emptyBtns.length + ' button(s) missing text or aria-label');

      // Heading progression check
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      let lastLevel = 0;
      for (const h of headings) {
        const level = parseInt(h.tagName[1], 10);
        if (lastLevel > 0 && level > lastLevel + 1) {
          issues.push('Heading level skipped: h' + lastLevel + ' to h' + level);
          break;
        }
        lastLevel = level;
      }

      return {
        issues,
        passedCount: 6 - issues.length
      };
    })()
  `);

    let a11yScore = Math.max(0, Math.round(100 - a11yData.issues.length * 15));

    // 3. BEST PRACTICES CHECKS
    const bpData = await cdp.evaluate(`
    (() => {
      const issues = [];
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        issues.push('Not served over HTTPS');
      }
      if (!document.doctype) issues.push('Missing <!doctype html>');
      if (!document.querySelector('meta[charset]')) issues.push('Missing <meta charset="UTF-8">');
      if (!document.querySelector('meta[name="viewport"]')) issues.push('Missing <meta name="viewport">');
      return { issues };
    })()
  `);

    if (consoleMessages.some((m) => m.type === 'error')) {
      bpData.issues.push(
        `${consoleMessages.filter((m) => m.type === 'error').length} console error(s) logged`
      );
    }

    let bpScore = Math.max(0, Math.round(100 - bpData.issues.length * 15));

    // 4. SEO CHECKS
    const seoData = await cdp.evaluate(`
    (() => {
      const issues = [];
      const title = document.title || '';
      if (title.length < 10) issues.push('Page title is too short or missing (< 10 chars)');
      
      const desc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      if (desc.length < 30) issues.push('Meta description is too short or missing (< 30 chars)');

      const viewport = document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '';
      if (!viewport.includes('width=device-width')) issues.push('Viewport is not configured for mobile optimization');

      const favicon = document.querySelector('link[rel*="icon"]');
      if (!favicon) issues.push('Missing favicon link');

      return { issues, title, descLength: desc.length };
    })()
  `);

    let seoScore = Math.max(0, Math.round(100 - seoData.issues.length * 20));

    return {
      pagePath,
      fullUrl,
      scores: {
        performance: perfScore,
        accessibility: a11yScore,
        bestPractices: bpScore,
        seo: seoScore,
      },
      perfData,
      a11yData,
      bpData,
      seoData,
      consoleMessages,
    };
  } finally {
    cdp.ws.off('message', onConsoleMessage);
  }
}

async function run() {
  const cdp = new CdpSession({ headless: true });
  const failedPages = [];
  let currentPage = null;

  try {
    await cdp.launch();

    for (const pagePath of pages) {
      currentPage = `${baseUrl}${pagePath}`;
      console.log(`>>> Auditing: ${pagePath} (${baseUrl}${pagePath})`);
      const result = await auditPage(cdp, pagePath);
      const { performance: p, accessibility: a, bestPractices: bp, seo: s } = result.scores;

      console.log('  ┌───────────────────────┬────────┬────────┐');
      console.log('  │ Category              │ Score  │ Status │');
      console.log('  ├───────────────────────┼────────┼────────┤');
      console.log(
        `  │ ⚡ Performance        │  ${p.toString().padStart(3, ' ')}%  │  ${p >= minScore ? 'PASS' : 'WARN'}  │`
      );
      console.log(
        `  │ ♿ Accessibility      │  ${a.toString().padStart(3, ' ')}%  │  ${a >= minScore ? 'PASS' : 'WARN'}  │`
      );
      console.log(
        `  │ 🛡️ Best Practices     │  ${bp.toString().padStart(3, ' ')}%  │  ${bp >= minScore ? 'PASS' : 'WARN'}  │`
      );
      console.log(
        `  │ 🔍 SEO                │  ${s.toString().padStart(3, ' ')}%  │  ${s >= minScore ? 'PASS' : 'WARN'}  │`
      );
      console.log('  └───────────────────────┴────────┴────────┘');

      console.log(
        `  • FCP: ${result.perfData.fcp}ms | DOM Interactive: ${result.perfData.domInteractive}ms | TTFB: ${result.perfData.ttfb}ms`
      );

      if (result.a11yData.issues.length > 0) {
        console.log(`  • Accessibility issues: ${result.a11yData.issues.join('; ')}`);
      }
      if (result.bpData.issues.length > 0) {
        console.log(`  • Best practices issues: ${result.bpData.issues.join('; ')}`);
      }
      if (result.seoData.issues.length > 0) {
        console.log(`  • SEO issues: ${result.seoData.issues.join('; ')}`);
      }

      if (p < minScore || a < minScore || bp < minScore || s < minScore) {
        const categories = [
          ['Performance', p],
          ['Accessibility', a],
          ['Best Practices', bp],
          ['SEO', s],
        ]
          .filter(([, score]) => score < minScore)
          .map(([category, score]) => `${category} ${score}% < ${minScore}%`);
        const failure = `${currentPage}: ${categories.join('; ')}`;
        failedPages.push(failure);
        console.error(`[FAIL] Lighthouse: ${failure}`);
      }
      console.log('');
    }
  } catch (error) {
    throw new Error(
      `Lighthouse audit failed at ${currentPage || 'Chrome startup (before testing any page)'}: ${error.message}`,
      { cause: error }
    );
  } finally {
    await cdp.close();
  }

  console.log('==========================================================');
  if (failedPages.length) {
    console.log(`  [FAIL] One or more categories fell below ${minScore}% target threshold.`);
    for (const failure of failedPages) console.error(`  [FAIL] Lighthouse: ${failure}`);
    console.log('==========================================================\n');
    process.exitCode = 1;
  } else {
    console.log('  [SUCCESS] All pages passed Chrome Lighthouse audit!');
    console.log('==========================================================\n');
  }
}

await run().catch((err) => {
  console.error('[FATAL] Lighthouse runner failed:', err);
  process.exitCode = 1;
});
