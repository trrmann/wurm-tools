// W3C HTML & CSS Validator for Wurm Tools
// Validates all pages across the site against official W3C Nu HTML Checker & Jigsaw CSS Validator

const SITE_PAGES = ['/', '/site/dashboard/', '/site/concepts/'];
const DEFAULT_BASE_URL = 'https://wurm-tools.onrender.com';

// Parse arguments
const args = process.argv.slice(2);
let checkHtml = true;
let checkCss = true;
let baseUrl = DEFAULT_BASE_URL;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--html' || arg === '-w3c-HTML' || arg === '--w3c-html') {
    checkHtml = true;
    checkCss = false;
  } else if (arg === '--css' || arg === '-w3c-CSS' || arg === '--w3c-css') {
    checkHtml = false;
    checkCss = true;
  } else if (arg === '--all' || arg === '-w3c' || arg === '--w3c') {
    checkHtml = true;
    checkCss = true;
  } else if (arg === '--url' && args[i + 1]) {
    baseUrl = args[++i];
  } else if (arg.startsWith('http://') || arg.startsWith('https://')) {
    baseUrl = arg;
  }
}

// Clean trailing slash for base URL
baseUrl = baseUrl.replace(/\/+$/, '');

console.log('==========================================================');
console.log('         Wurm Tools — W3C Standards Validation Suite');
console.log('==========================================================');
console.log(`Target Base URL : ${baseUrl}`);
console.log(
  `Validation Scope: ${checkHtml && checkCss ? 'HTML + CSS' : checkHtml ? 'HTML only' : 'CSS only'}`
);
console.log(`Pages To Validate: ${SITE_PAGES.length} pages\n`);

async function validateHtml(targetUrl) {
  const nuUrl = `https://validator.w3.org/nu/?doc=${encodeURIComponent(targetUrl)}&out=json`;
  try {
    const res = await fetch(nuUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WurmTools-W3C-Validation/1.0',
      },
    });

    const rawText = await res.text();

    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        return {
          success: false,
          isAntiBot: true,
          error: `W3C HTTP ${res.status}: Rate limit or anti-bot challenge triggered. Complete verification at: ${nuUrl}`,
          messages: [],
        };
      }
      return { success: false, error: `W3C HTTP ${res.status}: ${res.statusText}`, messages: [] };
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      if (
        rawText.includes('captcha') ||
        rawText.includes('challenge') ||
        rawText.includes('cloudflare')
      ) {
        return {
          success: false,
          isAntiBot: true,
          error: `Anti-bot authentication required. Please visit in browser: ${nuUrl}`,
          messages: [],
        };
      }
      return {
        success: false,
        error: `Unexpected non-JSON response from W3C Nu Checker`,
        messages: [],
      };
    }

    const messages = data.messages || [];
    const errors = messages.filter((m) => m.type === 'error');
    const warnings = messages.filter((m) => m.type === 'info' && m.subType === 'warning');
    const infos = messages.filter((m) => m.type === 'info' && m.subType !== 'warning');

    return {
      success: errors.length === 0,
      errors,
      warnings,
      infos,
      totalCount: messages.length,
    };
  } catch (err) {
    return { success: false, error: err.message, messages: [] };
  }
}

async function validateCss(targetUrl) {
  const cssUrl = `https://jigsaw.w3.org/css-validator/validator?uri=${encodeURIComponent(targetUrl)}&output=json`;
  try {
    const res = await fetch(cssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WurmTools-W3C-Validation/1.0',
      },
    });

    const rawText = await res.text();

    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        return {
          success: false,
          isAntiBot: true,
          error: `CSS Validator HTTP ${res.status}: Rate limit or challenge. Verify at: ${cssUrl}`,
        };
      }
      return { success: false, error: `CSS Validator HTTP ${res.status}: ${res.statusText}` };
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      if (rawText.includes('captcha') || rawText.includes('challenge')) {
        return {
          success: false,
          isAntiBot: true,
          error: `Anti-bot authentication required for CSS validator: ${cssUrl}`,
        };
      }
      return { success: false, error: `Unexpected non-JSON response from Jigsaw CSS Validator` };
    }

    const result = data.cssvalidation || {};
    const errors = result.errors || [];
    const warnings = result.warnings || [];
    const validity = result.validity !== false && errors.length === 0;

    return {
      success: validity,
      errors,
      warnings,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function run() {
  let anyErrors = false;

  for (const pagePath of SITE_PAGES) {
    const fullUrl = `${baseUrl}${pagePath}`;
    console.log(`>>> Validating Page: ${pagePath} (${fullUrl})`);

    try {
      const probeRes = await fetch(fullUrl, { method: 'HEAD' });
      if (!probeRes.ok) {
        console.log(
          `  [WARN] Target URL returned HTTP ${probeRes.status} (deployment may still be building on remote host).`
        );
      }
    } catch (e) {
      console.log(`  [WARN] Target URL probe failed (${e.message}).`);
    }

    // 1. HTML Validation
    if (checkHtml) {
      process.stdout.write('  • Nu HTML Checker: ');
      const htmlResult = await validateHtml(fullUrl);

      if (htmlResult.error) {
        console.log(`[FAIL] Connection/Service Error (${htmlResult.error})`);
        anyErrors = true;
      } else if (!htmlResult.success) {
        console.log(`[FAIL] ${htmlResult.errors.length} error(s) found`);
        anyErrors = true;
        htmlResult.errors.forEach((err, idx) => {
          console.log(
            `     ${idx + 1}. [Line ${err.lastLine || '?'}, Col ${err.lastColumn || '?'}] ${err.message}`
          );
          if (err.extract) {
            console.log(`        Snippet: ${err.extract.replace(/\n+/g, ' ').trim()}`);
          }
        });
      } else {
        const infoNote =
          htmlResult.infos.length > 0 ? ` (${htmlResult.infos.length} info notes)` : '';
        console.log(`[PASS] Valid HTML5${infoNote}`);
      }
    }

    // 2. CSS Validation
    if (checkCss) {
      process.stdout.write('  • Jigsaw CSS Validator: ');
      const cssResult = await validateCss(fullUrl);

      if (cssResult.error) {
        console.log(`[FAIL] Connection/Service Error (${cssResult.error})`);
        anyErrors = true;
      } else if (!cssResult.success) {
        console.log(`[FAIL] ${cssResult.errors.length} CSS error(s) found`);
        anyErrors = true;
        cssResult.errors.forEach((err, idx) => {
          console.log(`     ${idx + 1}. [Line ${err.line || '?'}] ${err.message}`);
        });
      } else {
        const warnCount = cssResult.warnings?.length || 0;
        console.log(`[PASS] Valid CSS (${warnCount} vendor warnings)`);
      }
    }

    console.log('');
  }

  console.log('==========================================================');
  if (anyErrors) {
    console.log('  [FAIL] W3C Validation found errors across one or more pages.');
    console.log('==========================================================\n');
    process.exit(1);
  } else {
    console.log('  [SUCCESS] All pages passed W3C validation successfully!');
    console.log('==========================================================\n');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('[FATAL] Unexpected error in W3C validation:', err);
  process.exit(1);
});
