import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  parseRetryAfter,
  validateHtml,
  validateCss,
  withRetry,
  run,
} from '../scripts/w3c-validator.js';
import { projectPagePaths } from '../scripts/project-pages.js';
import process from 'node:process';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('W3C validator retry behavior', () => {
  it('parses Retry-After seconds', () => {
    expect(parseRetryAfter({ headers: { get: () => '1.25' } })).toBe(1250);
  });

  it('parses Retry-After HTTP dates relative to the current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));

    expect(parseRetryAfter({ headers: { get: () => 'Wed, 01 Jan 2025 00:00:05 GMT' } })).toBe(5000);
  });

  it('retries HTTP 429 and returns a later successful response', async () => {
    vi.useFakeTimers();
    const validate = vi
      .fn()
      .mockResolvedValueOnce({ success: false, statusCode: 429, retryAfterMs: 1 })
      .mockResolvedValueOnce({ success: false, statusCode: 429, retryAfterMs: 1 })
      .mockResolvedValueOnce({ success: true });

    const resultPromise = withRetry('429 retry test', '/retry.html', validate);
    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toEqual({ success: true });
    expect(validate).toHaveBeenCalledTimes(3);
  });

  it('stops submitting pages to a validator after persistent HTTP 429', async () => {
    vi.useFakeTimers();
    const validate = vi.fn().mockResolvedValue({
      success: false,
      statusCode: 429,
      retryAfterMs: 1,
    });

    const firstRequest = withRetry('429 blocked test', '/first.html', validate);
    await vi.runAllTimersAsync();
    const firstResult = await firstRequest;
    const skipped = await withRetry('429 blocked test', '/second.html', validate);

    expect(firstResult.statusCode).toBe(429);
    expect(validate).toHaveBeenCalledTimes(3);
    expect(skipped).toMatchObject({ success: false, skipped: true });
    expect(skipped.error).toContain('/first.html');
  });

  it('stops submitting pages to a validator after HTTP 403', async () => {
    const validate = vi.fn().mockResolvedValue({
      success: false,
      statusCode: 403,
      isAntiBot: true,
    });

    const firstResult = await withRetry('403 blocked test', '/first.html', validate);
    const skipped = await withRetry('403 blocked test', '/second.html', validate);

    expect(firstResult.statusCode).toBe(403);
    expect(validate).toHaveBeenCalledTimes(1);
    expect(skipped).toMatchObject({ success: false, skipped: true });
    expect(skipped.error).toContain('/first.html');
  });

  it('stops submitting pages after a successful-response anti-bot challenge', async () => {
    const validate = vi.fn().mockResolvedValue({
      success: false,
      isAntiBot: true,
      error: 'Anti-bot verification required',
    });

    const firstResult = await withRetry('challenge blocked test', '/first.html', validate);
    const skipped = await withRetry('challenge blocked test', '/second.html', validate);

    expect(firstResult.error).toContain('Anti-bot');
    expect(validate).toHaveBeenCalledTimes(1);
    expect(skipped).toMatchObject({ success: false, skipped: true });
    expect(skipped.error).toContain('/first.html');
  });

  it.each([
    ['HTML', validateHtml, { messages: [] }],
    ['CSS', validateCss, { cssvalidation: { validity: true, errors: [], warnings: [] } }],
  ])(
    'retries real %s HTTP 429 responses before accepting success',
    async (service, validate, data) => {
      vi.useFakeTimers();
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': '2' } }))
        .mockResolvedValueOnce(new Response(JSON.stringify(data)));
      vi.stubGlobal('fetch', fetch);

      const pending = withRetry(`${service} HTTP retry`, '/', () =>
        validate('https://example.com/')
      );
      await vi.advanceTimersByTimeAsync(1999);
      expect(fetch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      await expect(pending).resolves.toMatchObject({ success: true });
      expect(fetch).toHaveBeenCalledTimes(2);
    }
  );

  it('reports service failures separately from invalid pages and skips remaining blocked checks', async () => {
    vi.useFakeTimers();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const fetch = vi.fn(async (_url, options) =>
      options?.method === 'HEAD'
        ? new Response('')
        : new Response('', { status: 429, headers: { 'Retry-After': '1' } })
    );
    vi.stubGlobal('fetch', fetch);

    const pending = run();
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toBe(1);
    expect(fetch.mock.calls.filter(([, options]) => options?.method !== 'HEAD')).toHaveLength(6);
    expect(log).toHaveBeenCalledWith(
      `  Page/service checks: 0 passed, 0 invalid, 2 service failures, ${(projectPagePaths().length - 1) * 2} skipped.`
    );
    expect(log.mock.calls.flat().join('\n')).not.toContain('[SUCCESS]');
  });

  it.each([
    ['HTML', validateHtml],
    ['CSS', validateCss],
  ])(
    'does not retry a confirmed Cloudflare challenge for %s even with HTTP 429',
    async (service, validate) => {
      const fetch = vi.fn().mockResolvedValue(
        new Response('Just a moment...', {
          status: 429,
          headers: { 'cf-mitigated': 'challenge' },
        })
      );
      vi.stubGlobal('fetch', fetch);

      const result = await withRetry(`${service} Cloudflare test`, '/', () =>
        validate('https://example.com/')
      );
      expect(result).toMatchObject({ success: false, isAntiBot: true, statusCode: 429 });
      expect(result.error).toContain('Cloudflare browser challenge');
      expect(await withRetry(`${service} Cloudflare test`, '/next', validate)).toMatchObject({
        success: false,
        skipped: true,
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  );
});
