// Lightweight Chrome DevTools Protocol (CDP) client using native Node & ws
import { spawn } from 'child_process';
import WebSocket from 'ws';
import { findChromePath } from './chrome-finder.js';

export class CdpSession {
  constructor({ port = 9222, headless = true } = {}) {
    this.port = port;
    this.headless = headless;
    this.chromeProc = null;
    this.ws = null;
    this.msgId = 0;
    this.callbacks = new Map();
  }

  async launch() {
    const chromePath = process.env.CHROME_PATH || findChromePath();
    const args = [
      this.headless ? '--headless=new' : '--headless=false',
      `--remote-debugging-port=${this.port}`,
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

    // Wait for CDP endpoint to be ready
    let attempts = 0;
    let wsUrl = null;
    while (attempts < 30) {
      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/json/version`);
        if (res.ok) {
          const data = await res.json();
          wsUrl = data.webSocketDebuggerUrl;
          break;
        }
      } catch {
        /* wait for Chrome startup */
      }
      await new Promise((r) => setTimeout(r, 200));
      attempts++;
    }

    if (!wsUrl) {
      throw new Error(`Failed to connect to Chrome CDP on port ${this.port} after launch.`);
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
    await this.send('Page.navigate', { url });

    // Wait for page load event
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const readyState = await this.evaluate('document.readyState');
      if (readyState === 'complete' || (waitUntil === 'interactive' && readyState !== 'loading')) {
        // Allow a small tick for dynamic scripts/modules to initialize
        await new Promise((r) => setTimeout(r, 600));
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
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
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* ignore close errors */
      }
    }
    if (this.chromeProc) {
      try {
        this.chromeProc.kill();
      } catch {
        /* ignore termination errors */
      }
    }
  }
}
