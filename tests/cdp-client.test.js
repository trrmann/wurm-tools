import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { CdpSession } from '../scripts/cdp-client.js';

afterEach(() => vi.useRealTimers());

function fixture(onNavigate) {
  const cdp = new CdpSession();
  cdp.ws = new EventEmitter();
  cdp.sessionId = 'audit-session';
  const emit = (method, params, sessionId = cdp.sessionId) => {
    cdp.ws.emit('message', JSON.stringify({ sessionId, method, params }));
  };
  cdp.send = vi.fn(async (method) => {
    if (method === 'Page.navigate') {
      onNavigate(emit);
      return { frameId: 'main', loaderId: 'initial' };
    }
    return {};
  });
  cdp.evaluate = vi.fn(async () => 'complete');
  return cdp;
}

describe('Chrome audit navigation readiness', () => {
  it('waits for the redirected main document to become network-idle', async () => {
    vi.useFakeTimers();
    const cdp = fixture((emit) => {
      emit('Page.frameNavigated', { frame: { id: 'main', loaderId: 'initial' } });
      emit('Page.frameNavigated', { frame: { id: 'main', loaderId: 'redirect' } });
      emit('Page.lifecycleEvent', { name: 'networkIdle', loaderId: 'initial' });
      setTimeout(
        () => emit('Page.lifecycleEvent', { name: 'networkIdle', loaderId: 'redirect' }),
        300
      );
    });
    const navigation = cdp.navigate('http://localhost/protected/');
    await vi.advanceTimersByTimeAsync(200);
    expect(cdp.evaluate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    await navigation;
    expect(cdp.evaluate).toHaveBeenCalledOnce();
    expect(cdp.ws.listenerCount('message')).toBe(0);
  });
  it('does not mistake another target or subframe for the audited document', async () => {
    vi.useFakeTimers();
    const cdp = fixture((emit) => {
      emit('Page.frameNavigated', { frame: { id: 'main', loaderId: 'initial' } });
      emit('Page.frameNavigated', { frame: { id: 'child', parentId: 'main', loaderId: 'child' } });
      emit('Page.lifecycleEvent', { name: 'networkIdle', loaderId: 'child' });
      emit('Page.lifecycleEvent', { name: 'networkIdle', loaderId: 'initial' }, 'other-session');
    });
    const navigation = expect(
      cdp.navigate('http://localhost/', { timeoutMs: 400 })
    ).rejects.toThrow('did not settle');
    await vi.runAllTimersAsync();
    await navigation;
    expect(cdp.evaluate).not.toHaveBeenCalled();
    expect(cdp.ws.listenerCount('message')).toBe(0);
  });
  it('fails explicitly on Chrome navigation errors and removes its listener', async () => {
    const cdp = fixture(() => {});
    cdp.send.mockImplementation(async (method) =>
      method === 'Page.navigate' ? { errorText: 'net::ERR_CONNECTION_REFUSED' } : {}
    );
    await expect(cdp.navigate('http://localhost/')).rejects.toThrow('ERR_CONNECTION_REFUSED');
    expect(cdp.ws.listenerCount('message')).toBe(0);
  });
  it('still requires document readiness after network-idle', async () => {
    vi.useFakeTimers();
    const cdp = fixture((emit) => {
      emit('Page.lifecycleEvent', { name: 'networkIdle', loaderId: 'initial' });
    });
    cdp.evaluate.mockResolvedValueOnce('loading').mockResolvedValue('complete');
    const navigation = cdp.navigate('http://localhost/');
    await vi.runAllTimersAsync();
    await navigation;
    expect(cdp.evaluate).toHaveBeenCalledTimes(2);
  });
});
