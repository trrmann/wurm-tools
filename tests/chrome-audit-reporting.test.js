import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import process from 'node:process';

const audit = vi.hoisted(() => ({ cdp: null }));

vi.mock('../scripts/cdp-client.js', () => ({
  CdpSession: class {
    constructor() {
      return audit.cdp;
    }
  },
}));
vi.mock('../scripts/project-pages.js', () => ({
  projectPagePaths: () => ['/example/'],
  verifyPageResponse: vi.fn(async () => {}),
}));

let previousExitCode;
let previousArgv;

beforeEach(() => {
  vi.resetModules();
  previousExitCode = process.exitCode;
  previousArgv = process.argv;
  process.exitCode = 0;
  process.argv = ['node', 'audit', '--url', 'http://localhost:3000'];
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  audit.cdp = {
    ws: new EventEmitter(),
    launch: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    navigate: vi.fn(async () => {}),
    send: vi.fn(async () => {}),
    evaluate: vi.fn(async () => {}),
    collectGarbage: vi.fn(async () => {}),
    getPerformanceMetrics: vi.fn(async () => ({})),
  };
});

afterEach(() => {
  process.exitCode = previousExitCode;
  process.argv = previousArgv;
  vi.restoreAllMocks();
});

describe('Chrome audit failure diagnostics', () => {
  for (const [load, label] of [
    [() => import('../scripts/test-lighthouse.js'), 'Lighthouse'],
    [() => import('../scripts/test-css-overview.js'), 'CSS Overview'],
    [() => import('../scripts/test-memory.js'), 'Memory'],
  ]) {
    it(`${label} identifies startup failures as occurring before any page`, async () => {
      audit.cdp.launch.mockRejectedValue(new Error('Chrome did not start'));
      await load();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[FATAL]'),
        expect.objectContaining({
          message: expect.stringContaining('Chrome startup (before testing any page)'),
        })
      );
      expect(process.exitCode).toBe(1);
      expect(audit.cdp.navigate).not.toHaveBeenCalled();
      expect(audit.cdp.close).toHaveBeenCalledOnce();
    });

    it(`${label} identifies the exact page when navigation fails`, async () => {
      audit.cdp.navigate.mockRejectedValue(new Error('Navigation timed out'));
      await load();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[FATAL]'),
        expect.objectContaining({
          message: expect.stringContaining('http://localhost:3000/example/: Navigation timed out'),
        })
      );
      expect(process.exitCode).toBe(1);
      expect(audit.cdp.close).toHaveBeenCalledOnce();
    });
  }

  it('reports the Lighthouse page, category, score and threshold in the summary', async () => {
    audit.cdp.evaluate
      .mockResolvedValueOnce({ fcp: 0, domComplete: 0, ttfb: 0 })
      .mockResolvedValueOnce({ issues: [] })
      .mockResolvedValueOnce({ issues: [] })
      .mockResolvedValueOnce({ issues: ['Missing description'] });
    await import('../scripts/test-lighthouse.js');
    const failures = console.error.mock.calls.flat().join('\n');
    expect(failures.match(/http:\/\/localhost:3000\/example\/: SEO 80% < 85%/g)).toHaveLength(2);
    expect(process.exitCode).toBe(1);
    expect(audit.cdp.close).toHaveBeenCalledOnce();
  });

  it('reports the Memory page in the failure summary and still cleans up', async () => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback) => {
      queueMicrotask(callback);
      return 0;
    });
    audit.cdp.getPerformanceMetrics
      .mockResolvedValueOnce({ Nodes: 100 })
      .mockResolvedValueOnce({ Nodes: 300 })
      .mockResolvedValueOnce({ Nodes: 251 });
    await import('../scripts/test-memory.js');
    const failures = console.error.mock.calls.flat().join('\n');
    expect(failures.match(/http:\/\/localhost:3000\/example\//g)).toHaveLength(2);
    expect(process.exitCode).toBe(1);
    expect(audit.cdp.close).toHaveBeenCalledOnce();
  });

  it('accepts a Lighthouse category exactly at the existing 85% threshold', async () => {
    audit.cdp.evaluate
      .mockResolvedValueOnce({ fcp: 0, domComplete: 0, ttfb: 0 })
      .mockResolvedValueOnce({ issues: ['One accessibility issue'] })
      .mockResolvedValueOnce({ issues: [] })
      .mockResolvedValueOnce({ issues: [] });
    await import('../scripts/test-lighthouse.js');
    expect(console.error).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
    expect(audit.cdp.close).toHaveBeenCalledOnce();
  });

  it('accepts memory growth exactly at the existing heap and node thresholds', async () => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback) => {
      queueMicrotask(callback);
      return 0;
    });
    audit.cdp.getPerformanceMetrics
      .mockResolvedValueOnce({ Nodes: 100, JSHeapUsedSize: 1024 * 1024 })
      .mockResolvedValueOnce({ Nodes: 300, JSHeapUsedSize: 12 * 1024 * 1024 })
      .mockResolvedValueOnce({ Nodes: 250, JSHeapUsedSize: 11 * 1024 * 1024 });
    await import('../scripts/test-memory.js');
    expect(console.error).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
    expect(audit.cdp.close).toHaveBeenCalledOnce();
  });
});
