import { describe, expect, it } from 'vitest';
import { checkResult, run, verifiedTool } from '../scripts/w3c-local.js';

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
});
