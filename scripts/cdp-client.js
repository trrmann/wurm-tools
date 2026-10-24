// Lightweight Chrome DevTools Protocol (CDP) client using native Node & ws
import { spawn } from 'child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';
import { findChromePath } from './chrome-finder.js';

export class CdpSession {
  constructor({ headless = true } = {}) {
    this.headless = headless;
    this.chromeProc = null;
    this.ws = null;
    this.msgId = 0;
    this.callbacks = new Map();
  }

  async launch() {
    const chromePath = process.env.CHROME_PATH || findChromePath();
    this.profileDir = await mkdtemp(path.join(tmpdir(), 'wurm-chrome-audit-'));
    const args = [
      this.headless ? '--headless=new' : '--headless=false',
      '--remote-debugging-port=0',
      `--user-data-dir=${this.profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-client-side-phishing-detection',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-hang-monitor',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-sync',
      '--disable-translate',
      '--metrics-recording-only',
      '--safebrowsing-disable-auto-update',
      'about:blank',
    ];

    this.chromeProc = spawn(chromePath, args, { stdio: ['ignore', 'ignore', 'ignore'] });
    let launchError;
    this.chromeProc.once('error', (error) => {
      launchError = error;
    });

    // Wait for CDP endpoint to be ready
    const started = Date.now();
    let wsUrl = null;
    while (Date.now() - started < 30000) {
      if (launchError) throw launchError;
      if (this.chromeProc.exitCode !== null || this.chromeProc.signalCode !== null)
        throw new Error('Chrome exited before its audit endpoint became ready.');
      try {
        const [port, endpoint] = (
          await readFile(path.join(this.profileDir, 'DevToolsActivePort'), 'utf8')
        )
          .trim()
          .split('\n');
        if (/^\d+$/.test(port) && endpoint?.startsWith('/devtools/browser/')) {
          wsUrl = `ws://127.0.0.1:${port}${endpoint}`;
          break;
        }
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    if (!wsUrl) {
      throw new Error(
        'Chrome startup failed: its isolated audit endpoint was not ready within 30000ms (no page was tested).'
      );
    }

    // Connect to WebSocket
    await new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
      this.ws.on('message', (raw) => {
        try {
          const parsed = JSON.parse(raw.toString());
          if (parsed.id && this.callbacks.has(parsed.id)) {
            const { resolve: res, reject: rej } = this.callbacks.get(parsed.id);
            this.callbacks.delete(parsed.id);
            if (parsed.error) {
              rej(new Error(parsed.error.message || JSON.stringify(parsed.error)));
            } else {
              res(parsed.result);
            }
          }
        } catch {
          /* ignore unparseable or untracked messages */
        }
      });
    });

    // Create a new target/page
    const pageTarget = await this.send('Target.createTarget', { url: 'about:blank' });
    this.pageTargetId = pageTarget.targetId;

    // Attach to the page target
    const attached = await this.send('Target.attachToTarget', {
      targetId: this.pageTargetId,
      flatten: true,
    });
    this.sessionId = attached.sessionId;

    // Enable required domains
    await this.send('Page.enable', {}, this.sessionId);
    await this.send('Runtime.enable', {}, this.sessionId);
    await this.send('DOM.enable', {}, this.sessionId);
    await this.send('CSS.enable', {}, this.sessionId);
    await this.send('Performance.enable', {}, this.sessionId);
  }

  send(method, params = {}, sessionId = null) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;
      this.callbacks.set(id, { resolve, reject });
      const payload = { id, method, params };
      if (sessionId || this.sessionId) {
        payload.sessionId = sessionId || this.sessionId;
      }
      this.ws.send(JSON.stringify(payload));
    });
  }

  async navigate(url, { waitUntil = 'load', timeoutMs = 20000 } = {}) {
    let mainFrame;
    const idleLoaders = new Set();
    const onMessage = (raw) => {
      const event = JSON.parse(raw.toString());
      if (event.sessionId !== this.sessionId) return;
      if (event.method === 'Page.frameNavigated' && !event.params.frame.parentId)
        mainFrame = event.params.frame;
      if (event.method === 'Page.lifecycleEvent' && event.params.name === 'networkIdle')
        idleLoaders.add(event.params.loaderId);
    };
    this.ws.on('message', onMessage);
    try {
      await this.send('Page.setLifecycleEventsEnabled', { enabled: true });
      const navigation = await this.send('Page.navigate', { url });
      if (navigation.errorText)
        throw new Error(`Navigation to ${url} failed: ${navigation.errorText}`);
      const startTime = Date.now();
      while (Date.now() - startTime < timeoutMs) {
        const loaderId = mainFrame?.loaderId || navigation.loaderId;
        if (loaderId && idleLoaders.has(loaderId)) {
          const readyState = await this.evaluate('document.readyState');
          if (
            readyState === 'complete' ||
            (waitUntil === 'interactive' && readyState === 'interactive')
          )
            return;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error(
        `Navigation to ${url} did not settle within ${timeoutMs}ms. ` +
          `Last main-frame URL: ${mainFrame?.url || '(not reported)'}; ` +
          `loader: ${mainFrame?.loaderId || navigation.loaderId || '(not reported)'}.`
      );
    } finally {
      this.ws.off('message', onMessage);
    }
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Evaluation error: ${res.exceptionDetails.text}`);
    }
    return res.result?.value;
  }

  async getPerformanceMetrics() {
    const res = await this.send('Performance.getMetrics');
    const metrics = {};
    if (res.metrics) {
      for (const m of res.metrics) {
        metrics[m.name] = m.value;
      }
    }
    return metrics;
  }

  async collectGarbage() {
    await this.send('HeapProfiler.collectGarbage');
  }

  async close() {
    this.ws?.terminate();
    if (
      this.chromeProc &&
      this.chromeProc.exitCode === null &&
      this.chromeProc.signalCode === null
    ) {
      const exited = new Promise((resolve) => this.chromeProc.once('close', resolve));
      this.chromeProc.kill();
      const timer = setTimeout(() => this.chromeProc.kill('SIGKILL'), 5000);
      timer.unref();
      await exited;
      clearTimeout(timer);
    }
    if (this.profileDir)
      await rm(this.profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
