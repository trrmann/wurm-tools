import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { persistBaseline } from '../scripts/wurm-map-baseline.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('atomic baseline database replacement', () => {
  async function fixture(action) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wurm-baseline-replace-'));
    const file = path.join(root, 'baseline.db');
    fs.writeFileSync(file, 'old database');
    try {
      await action(file, root);
    } finally {
      fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  }

  it.each(['EPERM', 'EACCES', 'EBUSY'])(
    'retries transient %s without removing the old database',
    async (code) => {
      await fixture(async (file, root) => {
        vi.useFakeTimers();
        const rename = fs.promises.rename.bind(fs.promises);
        const spy = vi
          .spyOn(fs.promises, 'rename')
          .mockImplementationOnce(async () => {
            expect(fs.readFileSync(file, 'utf8')).toBe('old database');
            throw Object.assign(new Error('temporarily locked'), { code });
          })
          .mockImplementation(rename);
        const operation = persistBaseline({ export: () => Buffer.from('new database') }, file);
        await vi.runAllTimersAsync();
        await operation;
        expect(spy).toHaveBeenCalledTimes(2);
        expect(fs.readFileSync(file, 'utf8')).toBe('new database');
        expect(fs.readdirSync(root)).toEqual(['baseline.db']);
      });
    }
  );

  it.each([
    ['EPERM', 7],
    ['ENOSPC', 1],
  ])('surfaces persistent %s and cleans only the temporary file', async (code, attempts) => {
    await fixture(async (file, root) => {
      vi.useFakeTimers();
      const error = Object.assign(new Error('replacement failed'), { code });
      const spy = vi.spyOn(fs.promises, 'rename').mockRejectedValue(error);
      const operation = persistBaseline({ export: () => Buffer.from('new database') }, file);
      const rejection = expect(operation).rejects.toBe(error);
      await vi.runAllTimersAsync();
      await rejection;
      expect(spy).toHaveBeenCalledTimes(attempts);
      expect(fs.readFileSync(file, 'utf8')).toBe('old database');
      expect(fs.readdirSync(root)).toEqual(['baseline.db']);
    });
  });
});
