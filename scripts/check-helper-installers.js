import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assertCurrentInstaller, installerOutputDirectory } from './helper-build-state.js';

const project = fileURLToPath(new URL('../', import.meta.url));
try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--rebuild'))
    throw new Error('Usage: check-helper-installers.js [--rebuild]');
  if (args.includes('--rebuild') && (process.platform !== 'linux' || process.arch !== 'x64'))
    throw new Error(
      'Offline Fedora installer rebuild/acceptance requires the Fedora x64 release host. Run production deployment there; Windows installer production support remains gated.'
    );
  const outputRoot =
    process.env.WURM_INSTALLER_OUTPUT_ROOT || path.join(project, 'artifacts/acceptance');
  const env = { ...process.env, WURM_INSTALLER_OUTPUT_ROOT: outputRoot };
  console.log(
    `Current-source acceptance output: ${outputRoot}. Published signed artifacts are not replaced.`
  );
  for (const profile of ['user', 'developer']) {
    const directory = installerOutputDirectory(project, profile === 'developer', outputRoot);
    if (args.includes('--rebuild')) {
      for (const script of [
        `helper:installer:build${profile === 'developer' ? ':developer' : ''}`,
        `helper:installer:test${profile === 'developer' ? ':developer' : ''}`,
      ]) {
        const result = spawnSync('pnpm', ['run', script], { cwd: project, env, stdio: 'inherit' });
        if (result.error) throw result.error;
        if (result.status !== 0) throw new Error(`${script} failed (${result.status})`);
      }
    }
    await assertCurrentInstaller(project, directory);
    console.log(
      `[PASS] ${profile} installer matches current distribution sources and artifact hash.`
    );
  }
  console.log('Freshness is not a signing, native desktop, Windows or public-release approval.');
} catch (error) {
  console.error(`[FAIL] ${error.message}`);
  process.exitCode = 1;
}
