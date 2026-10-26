import { describe, expect, it } from 'vitest';
import {
  checkResult,
  run,
  verifiedTool,
  validationDiagnostics,
  saveValidationReport,
} from '../scripts/w3c-local.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('local official W3C validators', () => {
  it('requires both a successful exit and a valid Nu result', () => {
    const result = (messages, code = 0) => ({ code, stdout: JSON.stringify({ messages }) });
    expect(checkResult('Nu HTML', result([]))).toBe(true);
    expect(checkResult('Nu HTML', result([{ type: 'info' }]))).toBe(true);
    expect(checkResult('Nu HTML', result([{ type: 'error' }]))).toBe(false);
    expect(checkResult('Nu HTML', result([{ type: 'non-document-error' }]))).toBe(false);
    expect(checkResult('Nu HTML', result([], 1))).toBe(false);
    expect(() => checkResult('Nu HTML', { code: 0, stdout: '{}' })).toThrow();
  });

  it('accepts omitted CSS errors only with an explicit zero error count and validity', () => {
    const result = (cssvalidation, code = 0) => ({
      code,
      stdout: JSON.stringify({ cssvalidation }),
    });
    const valid = { validity: true, result: { errorcount: 0 } };
    expect(checkResult('W3C CSS', result(valid))).toBe(true);
    expect(checkResult('W3C CSS', result({ ...valid, errors: [] }))).toBe(true);
    expect(checkResult('W3C CSS', result({ ...valid, validity: false }))).toBe(false);
    expect(checkResult('W3C CSS', result({ ...valid, errors: [{ message: 'bad CSS' }] }))).toBe(
      false
    );
    expect(checkResult('W3C CSS', result(valid, 1))).toBe(false);
    expect(() => checkResult('W3C CSS', result({ validity: true }))).toThrow();
    expect(() => checkResult('W3C CSS', { code: 0, stdout: 'not JSON' })).toThrow();
  });

  it('fails missing tools without downloading implicitly', async () => {
    await expect(verifiedTool({ file: 'missing-test.jar' })).rejects.toThrow('test:w3c:setup');
  });

  it('rejects unsupported arguments before executing validators', async () => {
    await expect(run(['--online'])).rejects.toThrow('Unknown');
    await expect(run(['--url'])).rejects.toThrow('incomplete');
  });

  it('summarizes HTML/CSS errors and retains process failures without treating them as passes', () => {
    expect(
      validationDiagnostics('Nu HTML', {
        stdout: JSON.stringify({
          messages: [
            { type: 'info', message: 'ignore' },
            { type: 'error', lastLine: 7, message: 'Invalid element' },
          ],
        }),
      })
    ).toEqual(['Line 7: Invalid element']);
    expect(
      validationDiagnostics('W3C CSS', {
        stdout: JSON.stringify({
          cssvalidation: {
            errors: [{ line: 12, message: 'Invalid property' }],
          },
        }),
      })
    ).toEqual(['Line 12: Invalid property']);
    expect(
      validationDiagnostics('Nu HTML', { stdout: '', stderr: 'Network unavailable', code: 1 }).join(
        ' '
      )
    ).toContain('Network unavailable');
    expect(checkResult('Nu HTML', { stdout: '{"messages":[]}', code: 0, signal: 'SIGTERM' })).toBe(
      false
    );
  });

  it('retains separate run reports including complete stdout and stderr', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'w3c-reports-'));
    try {
      const report = {
        checks: [{ passed: false, stdout: 'complete\noutput', stderr: 'full error', code: 1 }],
      };
      const first = await saveValidationReport(path.join(directory, 'first'), report);
      await saveValidationReport(path.join(directory, 'second'), { checks: [] });
      expect(JSON.parse(await fs.readFile(first, 'utf8'))).toEqual(report);
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
});
