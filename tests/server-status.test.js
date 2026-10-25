import { describe, it, expect, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {
  parseLibraryPaths,
  matchProcess,
  TARGETS,
  allowedOrigins,
  stopDetachedHelper,
} from '../scripts/wurm-local.js';
import { systemdUnitContent, windowsTaskCreateArgs } from '../scripts/helper-startup.js';
import { describeTarget, ServerStatusPage } from '../src/js/modules/pages/ServerStatusPage.js';
import {
  createHeroesSetupCode,
  heroesIdentityAction,
  totpCode,
} from '../scripts/heroes-identity.js';

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
    expect(allowedOrigins({})).toContain('https://wurm-tools.onrender.com');
    expect(allowedOrigins({ WURM_ALLOWED_ORIGINS: '*,https://extra.example' })).not.toContain('*');
    expect(allowedOrigins({ WURM_ALLOWED_ORIGINS: '*,https://extra.example' })).toContain(
      'https://extra.example'
    );
  });

  it('stops the Fedora login-startup helper when no detached-helper semaphore exists', async () => {
    const commands = [];
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wurm-helper-stop-'));
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      await stopDetachedHelper({
        file: path.join(temp, 'missing.semaphore'),
        runCommand: async (command, args) => commands.push([command, args]),
      });
      expect(commands).toEqual([
        ['systemctl', ['--user', 'is-active', '--quiet', 'wurm-helper.service']],
        ['systemctl', ['--user', 'stop', 'wurm-helper.service']],
      ]);
      expect(log).toHaveBeenCalledWith(
        'Wurm Tools Fedora/Linux login-startup helper stopped gracefully.'
      );
    } finally {
      log.mockRestore();
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });

  it('stops a detached helper without requiring a systemd user session', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wurm-helper-stop-'));
    const file = path.join(temp, 'helper.semaphore');
    const runCommand = vi.fn().mockRejectedValue(new Error('No systemd user session'));
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      fs.writeFileSync(file, JSON.stringify({ token: 'test-token', pid: 2147483647 }));
      await stopDetachedHelper({ file, runCommand });
      expect(runCommand).not.toHaveBeenCalled();
      expect(fs.existsSync(file)).toBe(false);
      expect(log).toHaveBeenCalledWith('Wurm local helper stopped gracefully.');
    } finally {
      log.mockRestore();
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });

  it('starts detached and shuts down when its semaphore is removed', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wurm-helper-'));
    const semaphore = path.join(temp, 'helper.semaphore');
    const script = path.resolve('scripts/wurm-local.js');
    const env = {
      ...process.env,
      WURM_HELPER_PORT: '0',
      WURM_HELPER_SEMAPHORE_PATH: semaphore,
      WURM_HELPER_AUTH_FILE: path.join(temp, 'helper-auth.json'),
      HEROES_IDENTITY_PATH: path.join(temp, 'identity.json'),
      WURM_SERVER_DIR: path.join(temp, 'missing-server'),
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
          const response = await fetch(`http://127.0.0.1:${port}/health`);
          return response.ok && response.headers.get('content-type')?.includes('application/json');
        } catch {
          return false;
        }
      };
      expect(await waitFor(isReachable)).toBe(true);
      const firstPid = JSON.parse(fs.readFileSync(semaphore, 'utf8')).pid;
      expect(run().status).toBe(0);
      expect(JSON.parse(fs.readFileSync(semaphore, 'utf8')).pid).toBe(firstPid);

      const origin = 'https://wurm-tools.onrender.com';
      const identity = (action, body = {}, bearer = '') =>
        heroesIdentityAction(action, body, { file: env.HEROES_IDENTITY_PATH, origin, bearer });
      const setupCode = await createHeroesSetupCode(env.HEROES_IDENTITY_PATH);
      const password = 'private-server-status-password';
      await identity('setup', { setupCode, username: 'administrator', password });
      const login = await identity('login', { username: 'administrator', password });
      const enrollment = await identity('mfa/start', {}, login.token);
      await identity('mfa/confirm', { code: totpCode(enrollment.secret) }, login.token);
      const accountHeaders = { Origin: origin, 'X-Heroes-Session': login.token };
      const helperUrl = `http://127.0.0.1:${port}`;
      const unauthenticated = await fetch(`${helperUrl}/status`, { headers: { Origin: origin } });
      expect(unauthenticated.status).toBe(401);

      const pairingResult = run(['--pairing-code']);
      expect(pairingResult.status).toBe(0);
      const code = pairingResult.stdout.match(/(\d{8})\s*$/)?.[1];
      expect(code).toBeDefined();
      const paired = await fetch(`${helperUrl}/pair`, {
        method: 'POST',
        headers: { ...accountHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      expect(paired.status).toBe(200);
      const { token } = await paired.json();
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const authHeaders = { ...accountHeaders, Authorization: `Bearer ${token}` };

      const status = await fetch(`${helperUrl}/status`, { headers: authHeaders });
      expect(status.status).toBe(200);
      const dbResponse = await fetch(`${helperUrl}/db/worlds`, { headers: authHeaders });
      expect(dbResponse.status).toBe(404);
      const startWithoutAuth = await fetch(`${helperUrl}/start/server`, {
        method: 'POST',
        headers: { Origin: origin },
      });
      expect(startWithoutAuth.status).toBe(401);
      const startWithoutInstall = await fetch(`${helperUrl}/start/server`, {
        method: 'POST',
        headers: authHeaders,
      });
      expect(startWithoutInstall.status).toBe(404);

      const rejectedOrigin = await fetch(`${helperUrl}/status`, {
        headers: { ...authHeaders, Origin: 'https://attacker.example' },
      });
      expect(rejectedOrigin.status).toBe(403);
      const preflight = await fetch(`${helperUrl}/db/worlds`, {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'authorization',
          'Access-Control-Request-Private-Network': 'true',
        },
      });
      expect(preflight.status).toBe(204);
      expect(preflight.headers.get('access-control-allow-private-network')).toBe('true');
      expect(preflight.headers.get('access-control-allow-headers')).toContain('Authorization');

      const replayedCode = await fetch(`${helperUrl}/pair`, {
        method: 'POST',
        headers: { ...accountHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      expect(replayedCode.status).toBe(401);

      expect(run(['--unpair-all']).status).toBe(0);
      const revoked = await fetch(`${helperUrl}/status`, { headers: authHeaders });
      expect(revoked.status).toBe(401);

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
  it('sends both credentials, preserves pairing on account denial, and offers pairing again only for invalid pairing', async () => {
    vi.stubGlobal('sessionStorage', { getItem: () => 'account-session' });
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    try {
      const page = new ServerStatusPage();
      page.authToken = 'paired-browser';
      page.showPairingRequired = vi.fn();
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Sign in to Heros Tools' }), { status: 401 })
      );
      await expect(page.request('/status')).rejects.toThrow('Sign in to Heros Tools');
      expect(page.showPairingRequired).not.toHaveBeenCalled();
      const headers = fetch.mock.calls[0][1].headers;
      expect(headers.get('X-Heroes-Session')).toBe('account-session');
      expect(headers.get('Authorization')).toBe('Bearer paired-browser');
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Pair this browser with the local helper first' }), {
          status: 401,
        })
      );
      expect((await page.request('/status')).status).toBe(401);
      expect(page.showPairingRequired).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

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

describe('helper login startup definitions', () => {
  it('creates an opt-in Windows logon task', () => {
    const args = windowsTaskCreateArgs(
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Wurm Tools\\scripts\\wurm-local.js'
    );
    expect(args).toContain('ONLOGON');
    expect(args[args.indexOf('/TR') + 1]).toBe(
      '"C:\\Program Files\\nodejs\\node.exe" "C:\\Wurm Tools\\scripts\\wurm-local.js"'
    );
  });

  it('creates a restartable Fedora systemd user unit', () => {
    const unit = systemdUnitContent(
      '/home/player/Wurm Tools',
      '/usr/bin/node',
      '/home/player/Wurm Tools/scripts/wurm-local.js'
    );
    expect(unit).toContain('WorkingDirectory="/home/player/Wurm Tools"');
    expect(unit).toContain(
      'ExecStart="/usr/bin/node" "/home/player/Wurm Tools/scripts/wurm-local.js" --foreground'
    );
    expect(unit).toContain('Restart=on-failure');
  });
});
