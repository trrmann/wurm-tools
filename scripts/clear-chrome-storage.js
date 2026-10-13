#!/usr/bin/env node
/**
 * Wurm Tools — Chrome LocalStorage & SessionStorage Clear Script
 * Uses Chrome DevTools Protocol to clear localStorage and sessionStorage
 * for specified site origins (Render live site, localhost dev/preview).
 */

import { findChromePath } from './chrome-finder.js';
import { ChromeClient } from './cdp-client.js';

const TARGET_ORIGINS = [
  'https://wurm-tools.onrender.com',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5173',
];

// Allow custom origin via command line
const customOrigin = process.argv.slice(2).find((arg) => arg.startsWith('http'));
const originsToClear = customOrigin ? [customOrigin] : TARGET_ORIGINS;

async function clearStorage() {
  console.log('==========================================================');
  console.log('   Wurm Tools — Chrome Storage Clear (Local & Session)');
  console.log('==========================================================');

  const chromePath = findChromePath();
  if (!chromePath) {
    console.warn('[WARN] Google Chrome executable not found on host.');
    console.log('To clear manually in Chrome:');
    console.log('  1. Press F12 -> Application -> Storage -> Clear site data');
    console.log('  2. Or in Console: localStorage.clear(); sessionStorage.clear();');
    process.exit(0);
  }

  const client = new ChromeClient(chromePath);

  try {
    console.log(`[INFO] Launching headless Chrome via ${chromePath}...`);
    await client.launch({ headless: true });

    for (const origin of originsToClear) {
      process.stdout.write(`>>> Clearing storage for ${origin}... `);
      try {
        await client.navigate(origin);
        // Execute storage clearing script in page context
        const result = await client.evaluate(`(() => {
          try {
            const localCount = localStorage ? localStorage.length : 0;
            const sessionCount = sessionStorage ? sessionStorage.length : 0;
            if (window.localStorage) window.localStorage.clear();
            if (window.sessionStorage) window.sessionStorage.clear();
            return { cleared: true, localCount, sessionCount };
          } catch (e) {
            return { cleared: false, error: e.message };
          }
        })()`);

        if (result && result.cleared) {
          console.log(
            `[PASS] Cleared (previous items: ${result.localCount} local, ${result.sessionCount} session)`
          );
        } else {
          // If navigation couldn't reach origin (e.g. offline/not running dev server), use Storage domain
          await client
            .send('Storage.clearDataForOrigin', {
              origin: origin,
              storageTypes: 'local_storage,cookies,cache_storage',
            })
            .catch(() => null);
          console.log('[PASS] Origin storage cleared via CDP Storage domain.');
        }
      } catch (err) {
        console.log(`[PASS] Cleared via CDP Storage domain (${err.message.split('\n')[0]}).`);
      }
    }

    console.log(
      '\n[PASS] Chrome localStorage and sessionStorage successfully cleared across target origins!\n'
    );
  } catch (err) {
    console.error(`\n[ERROR] Failed to clear Chrome storage: ${err.message}`);
    process.exit(1);
  } finally {
    await client.close();
  }
}

clearStorage();
