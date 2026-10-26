import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  installerSourceFiles,
  installerSourceState,
  assertCurrentInstaller,
  installerOutputDirectory,
} from '../scripts/helper-build-state.js';

const directories = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true });
});

function fixture() {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'installer-state-'));
  directories.push(project);
  execFileSync('git', ['init', '--quiet', project]);
  for (const directory of ['scripts', 'documentation', 'artifacts'])
    fs.mkdirSync(path.join(project, directory));
  fs.writeFileSync(path.join(project, 'scripts/helper.js'), 'original');
  fs.writeFileSync(path.join(project, '.gitignore'), 'artifacts/\n');
  fs.writeFileSync(path.join(project, '.env'), 'DO_NOT_PACKAGE=secret');
  const artifact = 'test.run';
  fs.writeFileSync(path.join(project, 'artifacts', artifact), 'installer');
  const metadata = {
    artifact,
    sourceFiles: installerSourceState(project),
    sha256: createHash('sha256').update('installer').digest('hex'),
  };
  fs.writeFileSync(path.join(project, 'artifacts/fedora-build.json'), JSON.stringify(metadata));
  return { project, directory: path.join(project, 'artifacts') };
}

describe('installer source freshness', () => {
  it('isolates current-source acceptance outputs from immutable signed release locations', () => {
    const project = '/tmp/project';
    expect(installerOutputDirectory(project)).toBe('/tmp/project/artifacts');
    expect(installerOutputDirectory(project, true)).toBe('/tmp/project/artifacts/developer');
    expect(installerOutputDirectory(project, false, 'artifacts/acceptance')).toBe(
      '/tmp/project/artifacts/acceptance'
    );
    expect(installerOutputDirectory(project, true, '/tmp/isolated')).toBe(
      '/tmp/isolated/developer'
    );
  });
  it('includes new distribution sources but excludes credentials and generated artifacts', async () => {
    const { project, directory } = fixture();
    expect(installerSourceFiles(project)).toEqual(['.gitignore', 'scripts/helper.js']);
    await expect(assertCurrentInstaller(project, directory)).resolves.toMatchObject({
      artifact: 'test.run',
    });
    fs.writeFileSync(path.join(project, 'documentation/new-notes.md'), 'steering');
    await expect(assertCurrentInstaller(project, directory)).rejects.toThrow('stale');
  });

  it('rejects changed or removed source content and tampered artifacts', async () => {
    const { project, directory } = fixture();
    fs.writeFileSync(path.join(project, 'scripts/helper.js'), 'changed');
    await expect(assertCurrentInstaller(project, directory)).rejects.toThrow('scripts/helper.js');
    fs.writeFileSync(path.join(project, 'scripts/helper.js'), 'original');
    fs.writeFileSync(path.join(directory, 'test.run'), 'tampered');
    await expect(assertCurrentInstaller(project, directory)).rejects.toThrow('artifact hash');
    fs.rmSync(path.join(project, 'scripts/helper.js'));
    await expect(assertCurrentInstaller(project, directory)).rejects.toThrow('stale');
  });

  it('requires provenance from a new build instead of accepting old metadata', async () => {
    const { project, directory } = fixture();
    fs.writeFileSync(path.join(directory, 'fedora-build.json'), '{}');
    await expect(assertCurrentInstaller(project, directory)).rejects.toThrow(
      'no source provenance'
    );
  });
});
