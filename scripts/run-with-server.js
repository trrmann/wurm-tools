// Starts a local Vite server, waits for HTTP 200, runs a command against it, then stops the server.
// Usage: node scripts/run-with-server.js <preview|dev> <port> -- <command> [args...]
import { spawn, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { monitor } from './launch-when-ready.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const sep = args.indexOf('--');
const [mode, portArg] = args.slice(0, sep);
const cmd = args.slice(sep + 1);
const port = parseInt(portArg, 10);

if (sep < 0 || !['preview', 'dev'].includes(mode) || !port || cmd.length === 0) {
  console.error('Usage: run-with-server.js <preview|dev> <port> -- <command> [args...]');
  process.exit(2);
}

// Vite is spawned directly (bypassing npm's predev hook), so start the helper explicitly.
spawnSync(process.execPath, [path.join(__dirname, 'wurm-local.js')], { stdio: 'inherit' });

const viteBin = path.join(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js');
const viteArgs = mode === 'preview' ? ['preview'] : [];
const server = spawn(
  process.execPath,
  [viteBin, ...viteArgs, '--port', String(port), '--strictPort'],
  {
    stdio: 'ignore',
  }
);

let serverExited = false;
server.on('exit', () => {
  serverExited = true;
});

const stopServer = () => {
  if (!serverExited) server.kill();
};

const url = `http://localhost:${port}`;
const ready = await monitor(url, 30000, true);
if (!ready) {
  stopServer();
  console.error(`[FAIL] Local ${mode} server did not respond with HTTP 200 at ${url} within 30s.`);
  process.exit(1);
}

console.log(`[INFO] Local ${mode} server ready at ${url}; running: ${cmd.join(' ')}\n`);
const exe = cmd[0] === 'node' ? process.execPath : cmd[0];
const child = spawn(exe, cmd.slice(1), { stdio: 'inherit' });
child.on('error', (err) => {
  stopServer();
  console.error(`[FAIL] Could not run command: ${err.message}`);
  process.exit(1);
});
child.on('exit', (code) => {
  stopServer();
  process.exit(code ?? 1);
});
