import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

export function installerOutputDirectory(project, developer = false, outputRoot) {
  const root = outputRoot ? path.resolve(project, outputRoot) : path.join(project, 'artifacts');
  return path.join(root, ...(developer ? ['developer'] : []));
}

export function installerSourceFiles(project) {
  return [
    ...new Set(
      execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
        cwd: project,
        encoding: 'utf8',
      })
        .split('\0')
        .filter(Boolean)
    ),
  ]
    .filter((relative) => {
      if (
        !/^(?:src\/|site\/|public\/|scripts\/|tests\/|documentation\/|\.github\/|\.vscode\/settings\.json$|(?:README\.md|package\.json|pnpm-(?:lock|workspace)\.yaml|\.nvmrc|[^/]*config\.js|index\.html|render\.yaml|\.gitignore|\.gitattributes|\.prettierignore|\.prettierrc)$)/.test(
          relative
        )
      )
        return false;
      if (relative.split('/').some((part) => part === '..' || part.startsWith('.env')))
        throw new Error(`Unexpected source path: ${relative}`);
      const file = path.join(project, relative);
      if (!fs.existsSync(file)) return false;
      if (!fs.lstatSync(file).isFile()) throw new Error(`Not a regular source file: ${relative}`);
      return true;
    })
    .sort();
}

export function installerSourceState(project) {
  return Object.fromEntries(
    installerSourceFiles(project).map((file) => [
      file,
      createHash('sha256')
        .update(fs.readFileSync(path.join(project, file)))
        .digest('hex'),
    ])
  );
}

export async function assertCurrentInstaller(project, directory) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'fedora-build.json'), 'utf8'));
  if (!manifest.sourceFiles)
    throw new Error('Installer has no source provenance; rebuild and rerun acceptance.');
  const current = installerSourceState(project);
  const changed = [
    ...new Set([...Object.keys(current), ...Object.keys(manifest.sourceFiles)]),
  ].filter((file) => current[file] !== manifest.sourceFiles[file]);
  if (changed.length)
    throw new Error(
      `Installer is stale (${changed.length} source files differ): ${changed.slice(0, 8).join(', ')}. Rebuild and rerun acceptance.`
    );
  if (
    typeof manifest.artifact !== 'string' ||
    manifest.artifact !== path.basename(manifest.artifact)
  )
    throw new Error('Invalid installer artifact path in build metadata');
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(path.join(directory, manifest.artifact)))
    hash.update(chunk);
  if (hash.digest('hex') !== manifest.sha256)
    throw new Error(
      'Installer artifact hash differs from build metadata; rebuild and rerun acceptance.'
    );
  return manifest;
}
