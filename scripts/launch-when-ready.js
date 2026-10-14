// Monitor URL until it responds with HTTP 200 within a timeout, then refork Chrome and exit
import http from 'http';
import https from 'https';
import { spawn } from 'child_process';
import { findChromePath } from './chrome-finder.js';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const positionalArgs = args.filter((a) => !a.startsWith('--'));

const targetUrl = positionalArgs[0] || 'http://localhost:3000';
const timeoutMs = parseInt(positionalArgs[1], 10) || 30000;
const pollIntervalMs = 250;

async function checkUrl(urlStr) {
  const tryFetch = (target) =>
    new Promise((resolve) => {
      try {
        const urlObj = new URL(target);
        const client = urlObj.protocol === 'https:' ? https : http;
        const req = client.get(target, { timeout: 1500 }, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
      } catch {
        resolve(false);
      }
    });

  const primary = await tryFetch(urlStr);
  if (primary) return true;

  // Fallback for dual-stack localhost resolution
  try {
    const urlObj = new URL(urlStr);
    if (urlObj.hostname === 'localhost') {
      urlObj.hostname = '127.0.0.1';
      return await tryFetch(urlObj.toString());
    }
  } catch {
    // ignore
  }

  return false;
}

function spawnDetached(cmd, cmdArgs, onError) {
  const child = spawn(cmd, cmdArgs, { detached: true, stdio: 'ignore' });
  child.on('error', onError);
  child.unref();
}

export function launchBrowser(url) {
  let chromePath = null;
  try {
    chromePath = findChromePath();
  } catch {
    // Fall back to system default
  }

  let opener = null;
  if (process.platform === 'win32') {
    opener = ['cmd.exe', ['/c', 'start', '', url]];
  } else if (process.platform === 'darwin') {
    opener = ['open', [url]];
  } else {
    opener = ['xdg-open', [url]];
  }

  const useDefault = () => {
    console.log(`[launch-when-ready] Opening ${url} with default browser (${opener[0]})`);
    spawnDetached(opener[0], opener[1], (err) =>
      console.error(`[launch-when-ready] Failed to open browser: ${err.message}`)
    );
  };

  if (chromePath) {
    console.log(`[launch-when-ready] Opening ${url} with ${chromePath}`);
    spawnDetached(chromePath, ['--new-window', url], (err) => {
      console.error(`[launch-when-ready] Chrome failed (${err.message}); using default browser`);
      useDefault();
    });
  } else {
    useDefault();
  }
}

export async function monitor(url = targetUrl, timeout = timeoutMs, dryRun = isDryRun) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const isUp = await checkUrl(url);
    if (isUp) {
      if (!dryRun) {
        launchBrowser(url);
      }
      return true;
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  return false;
}

// Run as CLI script when invoked directly
const isDirectCli = process.argv[1] && process.argv[1].endsWith('launch-when-ready.js');
if (isDirectCli) {
  monitor().then((success) => {
    if (!success) {
      console.error(`[launch-when-ready] ${targetUrl} did not respond within ${timeoutMs}ms`);
    }
    process.exit(success ? 0 : 1);
  });
}
