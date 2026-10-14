import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { parseLibraryPaths, matchProcess, TARGETS, allowedOrigins } from '../scripts/wurm-local.js';
import { describeTarget } from '../src/js/modules/pages/ServerStatusPage.js';

describe('wurm-local helper', () => {
  it('parses Steam library paths', () => {
    const vdf = '"libraryfolders"\n{\n "0"\n {\n "path"\t\t"D:\\\\SteamLibrary"\n }\n}';
    expect(parseLibraryPaths(vdf)).toEqual(['D:\\SteamLibrary']);
  });

  it('matches a running server process and returns its pid', () => {
    const listing = '10 explorer.exe\n4242 java -cp x com.wurmonline.server.ServerLauncher';
    expect(matchProcess(listing, TARGETS.server.processPattern)).toBe(4242);
    expect(matchProcess('10 explorer.exe', TARGETS.server.processPattern)).toBe(false);
  });

  it('allows the dev and preview origins', () => {
    expect(allowedOrigins({})).toContain('http://localhost:3000');
  });

  it('starts detached and shuts down when its semaphore is removed', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wurm-helper-'));
    const semaphore = path.join(temp, 'helper.semaphore');
    const script = path.resolve('scripts/wurm-local.js');
    const env = {
      ...process.env,
      WURM_HELPER_PORT: '0',
      WURM_HELPER_SEMAPHORE_PATH: semaphore,
    };
    const run = (args = []) =>
      spawnSync(process.execPath, [script, ...args], { env, encoding: 'utf8', timeout: 10000 });
    const waitFor = async (predicate, timeoutMs = 10000) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (await predicate()) return true;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return false;
    };

    try {
      expect(run().status).toBe(0);
      let port;
      const isReachable = async () => {
        try {
          const state = JSON.parse(fs.readFileSync(semaphore, 'utf8'));
          port = state.port;
          if (!port) return false;
          const response = await fetch(`http://127.0.0.1:${port}/status`);
          return response.ok && response.headers.get('content-type')?.includes('application/json');
        } catch {
          return false;
        }
      };
      expect(await waitFor(isReachable)).toBe(true);
      const firstPid = JSON.parse(fs.readFileSync(semaphore, 'utf8')).pid;
      expect(run().status).toBe(0);
      expect(JSON.parse(fs.readFileSync(semaphore, 'utf8')).pid).toBe(firstPid);

      expect(run(['--stop']).status).toBe(0);
      expect(fs.existsSync(semaphore)).toBe(false);
      expect(await waitFor(async () => !(await isReachable()))).toBe(true);
    } finally {
      if (fs.existsSync(semaphore)) run(['--stop']);
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }, 20000);
});

describe('ServerStatusPage.describeTarget', () => {
  it('hides start when not installed and disables it when already running', () => {
    const missing = describeTarget('server', { label: 'S', installed: false });
    expect(missing.hidden).toBe('hidden');
    expect(missing.disabled).toBe('disabled');
    expect(
      describeTarget('server', { label: 'S', installed: true, running: true, path: 'p' }).badge
    ).toContain('Running');
    expect(
      describeTarget('server', { label: 'S', installed: true, running: true, path: 'p' }).hidden
    ).toBe('');
    expect(
      describeTarget('client', { label: 'C', installed: true, running: false, path: 'p' }).disabled
    ).toBe('');
  });
});
