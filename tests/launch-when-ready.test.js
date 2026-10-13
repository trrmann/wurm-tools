import { describe, it, expect } from 'vitest';
import http from 'http';
import { monitor } from '../scripts/launch-when-ready.js';

describe('HTTP 200 Monitor & Browser Launcher', () => {
  it('detects when local server responds with HTTP 200 within timeout', async () => {
    let server;
    const port = await new Promise((resolve) => {
      server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
      });
      server.listen(0, () => {
        const addr = server.address();
        resolve(addr.port);
      });
    });

    try {
      const isUp = await monitor(`http://localhost:${port}`, 3000, true);
      expect(isUp).toBe(true);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('times out and returns false cleanly if server never responds', async () => {
    // Pick an unallocated port and short timeout
    const isUp = await monitor('http://localhost:59999', 300, true);
    expect(isUp).toBe(false);
  });
});
