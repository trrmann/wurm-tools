import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const version = JSON.parse(fs.readFileSync(path.join(project, 'package.json'))).version;
const artifact = path.join(
  project,
  'artifacts/developer',
  `wurm-tools-developer-${version}-fedora44-x64-unsigned.run`
);
const container = `wurm-offline-developer-${randomUUID()}`;
const image = 'registry.fedoraproject.org/fedora:44';
function run(args) {
  const result = spawnSync('podman', args, { stdio: 'inherit', timeout: 900000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Podman ${args[0]} failed (${result.status})`);
}
let created = false;
try {
  if (!fs.existsSync(artifact))
    throw new Error(
      'Build the developer installer first: pnpm run helper:installer:build:developer'
    );
  run(['image', 'exists', image]);
  const digest = createHash('sha256').update(fs.readFileSync(artifact)).digest('hex');
  run([
    'create',
    '--network=none',
    '--name',
    container,
    '--env',
    `TEST_ARTIFACT_SHA256=${digest}`,
    image,
    'bash',
    '/acceptance.sh',
  ]);
  created = true;
  run(['cp', artifact, `${container}:/installer.run`]);
  run([
    'cp',
    path.join(project, 'scripts/test-developer-installer.sh'),
    `${container}:/acceptance.sh`,
  ]);
  run(['start', '--attach', container]);
} catch (error) {
  console.error(`[FAIL] ${error.message}`);
  process.exitCode = 1;
} finally {
  if (created) {
    const result = spawnSync('podman', ['rm', '--force', container], {
      stdio: 'inherit',
      timeout: 30000,
    });
    if (result.error || result.status !== 0) {
      console.error(`[FAIL] Could not remove test container ${container}; inspect it explicitly.`);
      process.exitCode = 1;
    }
  }
}
