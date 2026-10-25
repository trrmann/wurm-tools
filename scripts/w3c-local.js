import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { projectPagePaths, verifyPageResponse } from './project-pages.js';

const cache = fileURLToPath(new URL('../.w3c-tools/', import.meta.url));
const tools = [
  {
    name: 'Nu HTML',
    file: 'vnu.jar',
    url: 'https://github.com/validator/validator/releases/download/latest/vnu.jar',
    sha256: '19f89e204cb881e2d88c5d0cd451df6c1ee8334e7fe626f6694b64a129f6a813',
  },
  {
    name: 'W3C CSS',
    file: 'css-validator.jar',
    url: 'https://github.com/w3c/css-validator/releases/download/cssval-20250226/css-validator.jar',
    sha256: '5f764d63be946cce3940deb154759bdc4413b898f766ae48f5f0e5c2212c8afd',
  },
];

export async function verifiedTool(tool, setup = false) {
  const file = path.join(cache, tool.file);
  let bytes;
  try {
    bytes = await fs.readFile(file);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    if (!setup)
      throw new Error(`Missing ${file}. Run pnpm run test:w3c:setup first.`, { cause: error });
  }
  if (!bytes) {
    const response = await fetch(tool.url, { signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw new Error(`Download ${tool.url}: HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (createHash('sha256').update(bytes).digest('hex') !== tool.sha256) {
    throw new Error(
      `SHA-256 mismatch for ${tool.file}; refusing to execute. Review the pinned upstream release.`
    );
  }
  if (setup) {
    await fs.mkdir(cache, { recursive: true });
    await fs.writeFile(file, bytes);
  }
  return file;
}

export function executeJava(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('java', args, { timeout: 120000, windowsHide: true });
    let stdout = '';
    child.stdout.on('data', (data) => {
      stdout += data;
      process.stdout.write(data);
    });
    child.stderr.on('data', (data) => process.stderr.write(data));
    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (signal) reject(new Error(`Java terminated by ${signal}`));
      else resolve({ code, stdout });
    });
  });
}

export function checkResult(kind, result) {
  const data = JSON.parse(result.stdout);
  if (kind === 'Nu HTML') {
    if (!Array.isArray(data.messages)) throw new Error('Nu returned no messages array');
    return (
      result.code === 0 &&
      !data.messages.some(
        (message) => message.type === 'error' || message.type === 'non-document-error'
      )
    );
  }
  const css = data.cssvalidation;
  if (
    !css ||
    typeof css.validity !== 'boolean' ||
    !Number.isInteger(css.result?.errorcount) ||
    (css.errors !== undefined && !Array.isArray(css.errors))
  ) {
    throw new Error('CSS validator returned no valid conformance result');
  }
  return result.code === 0 && css.validity && css.result.errorcount === 0 && !css.errors?.length;
}

export async function run(args = process.argv.slice(2)) {
  let base = 'https://wurm-tools.onrender.com';
  let scope = 'all';
  let setup = false;
  let checkTools = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--setup') setup = true;
    else if (arg === '--check-tools') checkTools = true;
    else if (arg === '--html') scope = 'html';
    else if (arg === '--css') scope = 'css';
    else if (arg === '--all') scope = 'all';
    else if (arg === '--url' && args[index + 1]) base = args[++index];
    else throw new Error(`Unknown or incomplete option: ${arg}`);
  }
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Target must be HTTP or HTTPS');
  base = base.replace(/\/+$/, '');
  console.log('W3C local official validators; public online validator services DISABLED.');
  console.log('Requires Java 17+. Jars are integrity-checked before execution.');
  const selected = tools.filter(
    (tool) => scope === 'all' || (scope === 'html') === (tool.name === 'Nu HTML')
  );
  const files = await Promise.all(selected.map((tool) => verifiedTool(tool, setup)));
  const java = await executeJava(['--version']);
  const major = Number(java.stdout.match(/(?:openjdk|java)\s+(\d+)/i)?.[1]);
  if (java.code !== 0 || !Number.isInteger(major) || major < 17) {
    throw new Error('Java 17+ is required for local official W3C validators.');
  }
  if (setup || checkTools) {
    console.log(
      'Verified validator tools installed. Run pnpm run test:w3c to validate production.'
    );
    return 0;
  }
  let failed = 0;
  const pages = projectPagePaths();
  for (const page of pages) {
    const target = `${base}${page}`;
    try {
      await verifyPageResponse(target);
    } catch (error) {
      console.error(`[FAIL] ${target}: ${error.message}`);
      failed += selected.length;
      continue;
    }
    for (let index = 0; index < selected.length; index++) {
      const tool = selected[index];
      console.log(`\n>>> ${tool.name}: ${target}`);
      try {
        const options =
          tool.name === 'Nu HTML' ? ['--format', 'json', '--stdout'] : ['--output=json'];
        const localOptions =
          url.hostname === 'localhost'
            ? [
                '-Djava.net.preferIPv6Addresses=true',
                '-Dnu.validator.servlet.allow-forbidden-hosts=true',
              ]
            : ['127.0.0.1', '[::1]'].includes(url.hostname)
              ? ['-Dnu.validator.servlet.allow-forbidden-hosts=true']
              : [];
        const result = await executeJava([
          ...localOptions,
          '-jar',
          files[index],
          ...options,
          target,
        ]);
        if (!checkResult(tool.name, result))
          throw new Error(`Validation failed (exit ${result.code})`);
        console.log(`[PASS] ${tool.name}: ${target}`);
      } catch (error) {
        failed++;
        console.error(`[FAIL] ${tool.name}: ${target}: ${error.message}`);
      }
    }
  }
  console.log(
    `\n${failed ? '[FAIL]' : '[PASS]'} Local W3C: ${pages.length} pages, ${pages.length * selected.length} checks, ${failed} failed.`
  );
  return failed ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(`[FAIL] Local W3C: ${error.message}`);
      process.exitCode = 1;
    });
}
