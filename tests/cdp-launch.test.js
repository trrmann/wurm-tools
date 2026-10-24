import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';

const chrome = vi.hoisted(() => ({
  spawn: vi.fn(),
  readFile: vi.fn(),
  rm: vi.fn(),
  socket: null,
}));

vi.mock('child_process', () => ({ spawn: chrome.spawn }));
vi.mock('node:fs/promises', () => ({
  mkdtemp: vi.fn(async () => '/tmp/wurm-chrome-audit-test'),
  readFile: chrome.readFile,
  rm: chrome.rm,
}));
vi.mock('../scripts/chrome-finder.js', () => ({ findChromePath: () => '/test/chrome' }));
vi.mock('ws', async () => ({
  default: class extends (await import('node:events')).EventEmitter {
    constructor(url) {
      super();
      this.url = url;
      this.terminate = vi.fn();
      chrome.socket = this;
      queueMicrotask(() => this.emit('open'));
    }
  },
}));

import { CdpSession } from '../scripts/cdp-client.js';

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  const proc = new EventEmitter();
  proc.exitCode = null;
  proc.signalCode = null;
  proc.kill = vi.fn(() => queueMicrotask(() => proc.emit('close')));
  chrome.spawn.mockReturnValue(proc);
  chrome.readFile.mockRejectedValue(Object.assign(new Error('Not ready'), { code: 'ENOENT' }));
});

afterEach(() => vi.useRealTimers());

function session() {
  const cdp = new CdpSession();
  cdp.send = vi.fn(async (method) => {
    if (method === 'Target.createTarget') return { targetId: 'page' };
    if (method === 'Target.attachToTarget') return { sessionId: 'session' };
    return {};
  });
  return cdp;
}

describe('isolated Chrome startup', () => {
  it('allows a slow startup without accepting an incomplete endpoint file', async () => {
    chrome.readFile.mockImplementation(async () => {
      if (Date.now() - start < 7000)
        throw Object.assign(new Error('Not ready'), { code: 'ENOENT' });
      if (Date.now() - start < 7200) return '32123\n';
      return '32123\n/devtools/browser/audit\n';
    });
    const start = Date.now();
    const cdp = session();
    const launching = cdp.launch();
    await vi.advanceTimersByTimeAsync(7400);
    await launching;
    expect(chrome.socket.url).toBe('ws://127.0.0.1:32123/devtools/browser/audit');
    expect(cdp.sessionId).toBe('session');
    const closing = cdp.close();
    await vi.advanceTimersByTimeAsync(0);
    await closing;
    expect(chrome.spawn.mock.results[0].value.kill).toHaveBeenCalledOnce();
    expect(chrome.rm).toHaveBeenCalledWith('/tmp/wurm-chrome-audit-test', expect.any(Object));
  });

  it('fails after the startup deadline with a clear pre-page error', async () => {
    const cdp = session();
    const launching = expect(cdp.launch()).rejects.toThrow(
      'not ready within 30000ms (no page was tested)'
    );
    await vi.advanceTimersByTimeAsync(30000);
    await launching;
    expect(cdp.send).not.toHaveBeenCalled();
    const closing = cdp.close();
    await vi.advanceTimersByTimeAsync(0);
    await closing;
  });
});
