// W3C HTML & CSS Validator for Wurm Tools
// Validates all pages across the site against official W3C Nu HTML Checker & Jigsaw CSS Validator

import { projectPagePaths } from './project-pages.js';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SITE_PAGES = projectPagePaths();
const DEFAULT_BASE_URL = 'https://wurm-tools.onrender.com';
const unavailableValidators = new Map();
const SERVICE_RETRIES = 3;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
          statusCode: res.status,
          retryAfterMs: parseRetryAfter(res),
          error: `W3C HTTP ${res.status}: Rate limit or anti-bot challenge triggered. Complete verification at: ${nuUrl}`,
          messages: [],
        };
      }
      return {
        success: false,
        statusCode: res.status,
        retryAfterMs: parseRetryAfter(res),
        error: `W3C HTTP ${res.status}: ${res.statusText}`,
        messages: [],
      };
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
          statusCode: res.status,
          retryAfterMs: parseRetryAfter(res),
          error: `CSS Validator HTTP ${res.status}: Rate limit or challenge. Verify at: ${cssUrl}`,
        };
      }
      return {
        success: false,
        statusCode: res.status,
        retryAfterMs: parseRetryAfter(res),
        error: `CSS Validator HTTP ${res.status}: ${res.statusText}`,
      };
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

function parseRetryAfter(response) {
  const header = response.headers?.get('retry-after');
  if (!header) return null;
  if (/^\d+(?:\.\d+)?$/.test(header.trim())) return Math.ceil(Number(header) * 1000);
  const timestamp = Date.parse(header);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : null;
}

const WAIT_TIMEOUT_MS = parseInt(process.env.W3C_WAIT_TIMEOUT_MS || '300000', 10);
const WAIT_INTERVAL_MS = 10000;

async function withRetry(service, pagePath, fn) {
  const unavailable = unavailableValidators.get(service);
  if (unavailable) {
    return {
      success: false,
      skipped: true,
      error: `${service} requests skipped after HTTP ${unavailable.statusCode} at ${unavailable.pagePath}; remaining pages were not submitted.`,
    };
  }

  let result;
  for (let attempt = 1; attempt <= SERVICE_RETRIES; attempt++) {
    result = await fn();
    const rateLimited = result.statusCode === 429;
    const blocked = result.statusCode === 403 || result.isAntiBot;
    if (blocked) {
      unavailableValidators.set(service, {
        statusCode: result.statusCode ?? 'anti-bot challenge',
        pagePath,
      });
      return result;
    }
    const transient =
      rateLimited ||
      (result.error && /HTTP 5\d\d|fetch failed|ECONN|ETIMEDOUT/i.test(result.error));
    if (!transient) return result;
    if (attempt < SERVICE_RETRIES) {
      const delay = result.retryAfterMs ?? 3000 * 2 ** (attempt - 1);
      console.log(
        `[INFO] ${service} returned HTTP ${result.statusCode ?? 'network error'} for ${pagePath}; retrying in ${Math.ceil(delay / 1000)} second(s) (${attempt + 1}/${SERVICE_RETRIES}).`
      );
      await sleep(delay);
    } else if (rateLimited || blocked) {
      unavailableValidators.set(service, { statusCode: result.statusCode, pagePath });
    }
  }
  return result;
}

// Waits until every page responds 200 so a deploy still building is not validated
async function waitForDeployment() {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  let pending = [...SITE_PAGES];
  let announced = false;

  while (pending.length > 0) {
    const stillPending = [];
    for (const pagePath of pending) {
      try {
        const res = await fetch(`${baseUrl}${pagePath}`, { method: 'HEAD' });
        if (!res.ok) stillPending.push(`${pagePath} (HTTP ${res.status})`);
      } catch (e) {
        stillPending.push(`${pagePath} (${e.message})`);
      }
    }
    if (stillPending.length === 0) return true;
    pending = stillPending.map((p) => p.split(' ')[0]);
    if (Date.now() >= deadline) {
      console.log(
        `[FAIL] Site not fully live after ${WAIT_TIMEOUT_MS / 1000}s: ${stillPending.join(', ')}\n`
      );
      return false;
    }
    if (!announced) console.log('Waiting for deployment to go live (all pages must return 200)...');
    announced = true;
    console.log(`  • Pending: ${stillPending.join(', ')}`);
    await sleep(WAIT_INTERVAL_MS);
  }
  return true;
}

async function run() {
  let anyErrors = false;

  if (!(await waitForDeployment())) process.exit(1);
  console.log('All pages are live.\n');

  for (const pagePath of SITE_PAGES) {
    const fullUrl = `${baseUrl}${pagePath}`;
    console.log(`>>> Validating Page: ${pagePath} (${fullUrl})`);

    // 1. HTML Validation
    if (checkHtml) {
      process.stdout.write('  • Nu HTML Checker: ');
      const htmlResult = await withRetry('Nu HTML Checker', pagePath, () => validateHtml(fullUrl));

      if (htmlResult.skipped) {
        console.log(`[SKIP] ${htmlResult.error}`);
        anyErrors = true;
      } else if (htmlResult.error) {
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
      const cssResult = await withRetry('Jigsaw CSS Validator', pagePath, () =>
        validateCss(fullUrl)
      );

      if (cssResult.skipped) {
        console.log(`[SKIP] ${cssResult.error}`);
        anyErrors = true;
      } else if (cssResult.error) {
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
    for (const [service, result] of unavailableValidators) {
      console.log(
        `  [BLOCKED] ${service} returned HTTP ${result.statusCode} at ${result.pagePath}; later pages were not submitted to that service.`
      );
    }
    console.log('==========================================================\n');
    process.exit(1);
  } else {
    console.log('  [SUCCESS] All pages passed W3C validation successfully!');
    console.log('==========================================================\n');
    process.exit(0);
  }
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  run().catch((err) => {
    console.error('[FATAL] Unexpected error in W3C validation:', err);
    process.exit(1);
  });
}

export { parseRetryAfter, validateHtml, validateCss, withRetry };
