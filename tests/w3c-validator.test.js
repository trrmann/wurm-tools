import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseRetryAfter, withRetry } from '../scripts/w3c-validator.js';

afterEach(() => {
  vi.useRealTimers();
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
});
