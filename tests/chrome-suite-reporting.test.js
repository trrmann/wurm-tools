import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import process from 'node:process';

const command = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock('child_process', () => ({ spawn: command.spawn }));

let previousExitCode;
let previousArgv;

beforeEach(() => {
  vi.resetModules();
  command.spawn.mockReset();
  previousExitCode = process.exitCode;
  previousArgv = process.argv;
  process.exitCode = 0;
  process.argv = ['node', 'test-chrome.js', '--all', '--url', 'http://localhost:3000'];
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  process.exitCode = previousExitCode;
  process.argv = previousArgv;
  vi.restoreAllMocks();
});

function result({ chunks = [], code = 0, signal = null, error } = {}) {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  queueMicrotask(() => {
    for (const chunk of chunks) child.stderr.write(chunk);
    child.stdout.end();
    child.stderr.end();
    child.stderr.once('end', () => {
      if (error) child.emit('error', error);
      child.emit('close', code, signal);
    });
  });
  return child;
}

describe('unified Chrome failure summary', () => {
  it('retains the exact failed page after later suites pass, including chunked output', async () => {
    command.spawn
      .mockImplementationOnce(() =>
        result({
          chunks: [
            '[FAIL] Lighthouse: http://localhost:3000/ex',
            'ample/: SEO 80% < 85%\n',
            '[FAIL] Lighthouse: http://localhost:3000/example/: SEO 80% < 85%',
          ],
          code: 1,
        })
      )
      .mockImplementation(() => result());
    await import('../scripts/test-chrome.js');
    expect(command.spawn).toHaveBeenCalledTimes(3);
    expect(command.spawn.mock.calls[0][1]).toEqual([
      expect.stringContaining('test-lighthouse.js'),
      '--url',
      'http://localhost:3000',
    ]);
    expect(process.stderr.write).toHaveBeenCalledWith(
      '[FAIL] Lighthouse: http://localhost:3000/ex'
    );
    expect(console.error).toHaveBeenCalledWith(
      '    [FAIL] Lighthouse: http://localhost:3000/example/: SEO 80% < 85%'
    );
    expect(
      console.error.mock.calls.filter(([line]) =>
        line.startsWith('    [FAIL] Lighthouse: http://localhost:3000/example/')
      )
    ).toHaveLength(1);
    expect(process.exitCode).toBe(1);
  });

  it('repeats a fatal startup error rather than attributing it to a page', async () => {
    command.spawn.mockImplementation(() =>
      result({ chunks: ['[FATAL] Chrome startup (before testing any page)\n'], code: 1 })
    );
    await import('../scripts/test-chrome.js');
    expect(console.error).toHaveBeenCalledWith(
      '    [FATAL] Chrome startup (before testing any page)'
    );
    expect(process.exitCode).toBe(1);
  });

  it('surfaces a child launch failure and continues to the other suites', async () => {
    command.spawn
      .mockImplementationOnce(() => result({ error: new Error('Executable unavailable') }))
      .mockImplementation(() => result());
    await import('../scripts/test-chrome.js');
    expect(command.spawn).toHaveBeenCalledTimes(3);
    expect(console.error).toHaveBeenCalledWith(
      '    [FAIL] Could not start Chrome Lighthouse Audit: Executable unavailable'
    );
    expect(process.exitCode).toBe(1);
  });

  it('reports signal termination and succeeds when every suite exits cleanly', async () => {
    command.spawn.mockImplementation(() => result({ code: null, signal: 'SIGTERM' }));
    await import('../scripts/test-chrome.js');
    expect(console.error).toHaveBeenCalledWith(
      '  [FAIL] Chrome Memory Leak Audit (signal SIGTERM)'
    );
    expect(process.exitCode).toBe(1);

    vi.resetModules();
    process.exitCode = 0;
    console.error.mockClear();
    command.spawn.mockImplementation(() => result());
    await import('../scripts/test-chrome.js');
    expect(process.exitCode).toBe(0);
    expect(console.error).not.toHaveBeenCalled();
  });
});
