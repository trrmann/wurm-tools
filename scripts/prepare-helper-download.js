import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { signing } from './sign-helper-installer.js';
import {
  HELPER_TEST_RELEASE as release,
  releaseAssetNames,
  releaseDownloadAssets,
} from '../src/js/modules/helper-release.js';

const project = fileURLToPath(new URL('../', import.meta.url));
function command(program, args, options = {}) {
  const result = spawnSync(program, args, { encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `${program} failed (${result.status}): ${result.stderr || 'See terminal output.'}`
    );
  return result.stdout;
}

export function prepareDownload({
  source = path.join(project, 'artifacts'),
  publicKey = path.join(os.homedir(), '.wurm-tools-signing/publisher-public.asc'),
  output = path.join(project, 'artifacts/downloads', release.tag),
} = {}) {
  const metadata = JSON.parse(fs.readFileSync(path.join(source, 'fedora-build.json'), 'utf8'));
  if (
    metadata.profile !== 'user' ||
    metadata.artifact !== release.artifact ||
    metadata.sha256 !== release.sha256 ||
    metadata.publicReleaseAllowed !== false
  )
    throw new Error(
      'This download workflow only accepts the pinned, public-release-blocked USER test build. Developer redistribution remains held.'
    );
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'wurm-download-verify-'));
  try {
    const env = { ...process.env, GNUPGHOME: temporary };
    command('gpg', ['--batch', '--import', publicKey], { env });
    const listing = command(
      'gpg',
      ['--batch', '--with-colons', '--with-fingerprint', '--list-keys'],
      { env }
    );
    const fingerprints = listing
      .split('\n')
      .filter((line) => line.startsWith('fpr:'))
      .map((line) => line.split(':')[9]);
    if (
      fingerprints[0] !== release.primaryFingerprint ||
      !fingerprints.includes(release.signingFingerprint)
    )
      throw new Error('Publisher public certificate does not match the pinned identity.');
    signing({
      action: 'verify',
      directory: source,
      expectedFingerprint: release.signingFingerprint,
      env,
    });
    const certificate = command(
      'gpg',
      ['--batch', '--armor', '--export', release.primaryFingerprint],
      { env }
    );
    fs.mkdirSync(output, { recursive: true });
    for (const name of releaseAssetNames()) {
      let data;
      if (name === 'publisher-public.asc') data = Buffer.from(certificate);
      else if (name.endsWith('.sha256'))
        data = Buffer.from(`${release.sha256}  ${release.artifact}\n`);
      else data = fs.readFileSync(path.join(source, name));
      const target = path.join(output, name);
      if (fs.existsSync(target)) {
        if (!fs.lstatSync(target).isFile() || !fs.readFileSync(target).equals(data))
          throw new Error(`Prepared output differs; refusing overwrite: ${target}`);
      } else fs.writeFileSync(target, data, { flag: 'wx', mode: 0o644 });
    }
    const digest = createHash('sha256')
      .update(fs.readFileSync(path.join(output, release.artifact)))
      .digest('hex');
    if (digest !== release.sha256) throw new Error('Prepared installer digest changed.');
    signing({
      action: 'verify',
      directory: output,
      expectedFingerprint: release.signingFingerprint,
      env,
    });
    console.log(
      `Verified public-only test download files prepared at ${output}. Original signed files unchanged. Nothing published.`
    );
    return output;
  } finally {
    command('gpgconf', ['--kill', 'all'], { env: { ...process.env, GNUPGHOME: temporary } });
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [action = 'prepare', ...extra] = process.argv.slice(2);
    if (!['prepare', 'publish'].includes(action) || extra.length)
      throw new Error('Usage: node scripts/prepare-helper-download.js [prepare|publish]');
    const output = prepareDownload();
    if (action === 'publish') {
      command('gh', ['auth', 'status']);
      const existing = command('gh', ['api', 'repos/trrmann/wurm-tools/releases?per_page=100']);
      const found = JSON.parse(existing).find((item) => item.tag_name === release.tag);
      if (found && !found.draft) {
        releaseDownloadAssets(found);
        console.log(`Existing published prerelease is complete: ${found.html_url}`);
      } else {
        if (!found)
          command('gh', [
            'release',
            'create',
            release.tag,
            '--repo',
            'trrmann/wurm-tools',
            '--target',
            'efad78b6aa0881e6190ef78dfde6c91efcdd7cf1',
            '--draft',
            '--prerelease',
            '--title',
            'Fedora 44 helper 1.5.2 - signed test build',
            '--notes',
            'SIGNED TEST/PRERELEASE ONLY. Not production approved. Original signed bytes retain unsigned-test labels and publicReleaseAllowed=false. Fedora 44 x64 user helper only; not Windows/Android. Verify the detached signatures with the independently authenticated publisher fingerprint before running. SQLite remains local. Native desktop/license/public-release gates remain open. Developer bundle withheld pending reference-document redistribution review. Signed build provenance is in fedora-build.json; this is the previously accepted snapshot, not a claim that the tag or current website source produced these bytes.',
          ]);
        const state = JSON.parse(
          command('gh', ['api', 'repos/trrmann/wurm-tools/releases?per_page=100'])
        ).find((item) => item.tag_name === release.tag);
        if (!state?.draft)
          throw new Error('Expected the test release to remain a draft during upload.');
        for (const name of releaseAssetNames()) {
          const present = state.assets.find((asset) => asset.name === name);
          const localHash = createHash('sha256')
            .update(fs.readFileSync(path.join(output, name)))
            .digest('hex');
          if (present) {
            if (present.digest !== `sha256:${localHash}` || present.state !== 'uploaded')
              throw new Error(
                `Existing draft asset differs or is incomplete: ${name}. Nothing overwritten.`
              );
          } else
            command(
              'gh',
              [
                'release',
                'upload',
                release.tag,
                path.join(output, name),
                '--repo',
                'trrmann/wurm-tools',
              ],
              { stdio: 'inherit' }
            );
        }
        const uploaded = JSON.parse(
          command('gh', ['api', `repos/trrmann/wurm-tools/releases/${state.id}`])
        );
        if (!uploaded.draft || uploaded.prerelease !== true || uploaded.tag_name !== release.tag)
          throw new Error('Unexpected draft release state before publishing.');
        for (const name of releaseAssetNames()) {
          const matches = uploaded.assets.filter((asset) => asset.name === name);
          const digest = createHash('sha256')
            .update(fs.readFileSync(path.join(output, name)))
            .digest('hex');
          if (
            matches.length !== 1 ||
            matches[0].state !== 'uploaded' ||
            matches[0].digest !== `sha256:${digest}`
          )
            throw new Error(`Draft asset failed final digest verification: ${name}`);
        }
        command('gh', [
          'release',
          'edit',
          release.tag,
          '--repo',
          'trrmann/wurm-tools',
          '--draft=false',
          '--prerelease',
        ]);
        const published = JSON.parse(
          command('gh', ['api', `repos/trrmann/wurm-tools/releases/tags/${release.tag}`])
        );
        releaseDownloadAssets(published);
        console.log(`Published and checked: ${published.html_url}`);
      }
    }
  } catch (error) {
    console.error(`[FAIL] ${error.message}`);
    process.exitCode = 1;
  }
}
