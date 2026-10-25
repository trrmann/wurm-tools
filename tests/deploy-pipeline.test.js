import { afterEach, describe, expect, it } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const serviceOutput = Array.from(
  { length: 300 },
  (_, index) => `Service detail ${index}: URL=/site/heroes/ HTTP=429 cause=validator challenge`
).join('\n');
const folders = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

function fixture(shell, args, extraEnv = {}) {
  const folder = mkdtempSync(path.join(tmpdir(), 'wurm-deploy-test-'));
  folders.push(folder);
  mkdirSync(path.join(folder, 'scripts'));
  mkdirSync(path.join(folder, 'node_modules'));
  mkdirSync(path.join(folder, 'bin'));
  const script = shell === 'bash' ? 'deploy.sh' : 'deploy.ps1';
  copyFileSync(path.join(root, 'scripts', script), path.join(folder, 'scripts', script));
  const log = path.join(folder, 'commands.tsv');
  const deploymentLog = path.join(folder, '.deploy.log');
  writeFileSync(deploymentLog, 'STALE PREVIOUS RUN\n');
  writeFileSync(log, '');
  for (const command of ['npm', 'node', 'git', 'gh', 'sleep']) {
    writeFileSync(
      path.join(folder, 'bin', command),
      `#!/bin/sh
printf '%s\\t' '${command}' "$@" >> "$DEPLOY_LOG"
printf '\\n' >> "$DEPLOY_LOG"
if [ -n "$FAIL_STEP" ]; then
  case "$*" in *"$FAIL_STEP"*)
    echo "Fixture diagnostic stdout: $FAIL_STEP"
    echo "Fixture diagnostic stderr: $FAIL_STEP" >&2
    if [ -n "$SERVICE_OUTPUT" ]; then
      printf '%s\\n' "$SERVICE_OUTPUT"
      printf '%s\\n' "$SERVICE_OUTPUT" | sed 's/^/stderr: /' >&2
    fi
    exit 1 ;;
  esac
fi
if [ '${command}' = git ] && [ "$1" = rev-list ]; then
  if [ "$3" = HEAD..origin/main ]; then
    printf '%s\\n' "\${BEHIND_COMMITS:-0}"
  else
    printf '%s\\n' "\${PUSH_COMMITS:-0}"
  fi
fi
if [ '${command}' = git ] && [ "$1" = rev-parse ]; then printf 'main\\n'; fi
exit 0
`,
      { mode: 0o755 }
    );
  }
  const result = spawnSync(
    shell,
    shell === 'bash'
      ? [path.join(folder, 'scripts', script), ...args]
      : ['-NoProfile', '-File', path.join(folder, 'scripts', script), ...args],
    {
      env: {
        ...process.env,
        PATH: `${path.join(folder, 'bin')}${path.delimiter}${process.env.PATH}`,
        DEPLOY_LOG: log,
        ...extraEnv,
      },
      encoding: 'utf8',
      timeout: extraEnv.SERVICE_OUTPUT ? 60000 : 20000,
    }
  );
  const commands = readFileSync(log, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.replace(/\t$/, '').split('\t'));
  return {
    ...result,
    commands,
    deploymentLogPath: deploymentLog,
    deploymentLog: readFileSync(deploymentLog, 'utf8'),
  };
}

const hasPowerShell = spawnSync('pwsh', ['-NoProfile', '-Command', 'exit 0']).status === 0;

describe.skipIf(process.platform === 'win32')('mandatory deployment verification', () => {
  for (const shell of ['bash', ...(hasPowerShell ? ['pwsh'] : [])]) {
    describe(shell, () => {
      const noOpen = shell === 'bash' ? '--no-open' : '-NoOpen';
      const noFormat = shell === 'bash' ? '--no-auto-format' : '-NoAutoFormat';
      it.each([
        ['dev', 'development', 'dev', '3000'],
        ['preview', 'preview', 'preview', '4173'],
        ['prod', 'production', 'preview', '4173'],
      ])(
        'requires the environment-specific gates on %s, before git operations',
        (target, buildMode, mode, port) => {
          const result = fixture(shell, [`-${target}`, noOpen, noFormat]);
          expect(result.status, result.stderr || result.stdout).toBe(0);
          expect(result.deploymentLog).not.toContain('STALE PREVIOUS RUN');
          expect(result.deploymentLog).toContain('Verification Completed');
          const commands = result.commands;
          for (const command of [
            ['npm', 'run', 'format:check'],
            ['npm', 'run', 'lint'],
            ['npm', 'test'],
            ['npm', 'run', 'build', '--', '--mode', buildMode],
            ['npm', 'run', 'test:standards'],
          ])
            expect(commands).toContainEqual(command);
          const chrome = commands.findIndex((command) =>
            command[1]?.endsWith('run-with-server.js')
          );
          const git = commands.findIndex((command) => command[0] === 'git');
          const standards = commands.findIndex((command) => command.includes('test:standards'));
          expect(standards).toBeLessThan(git);
          if (target === 'dev') {
            expect(chrome).toBe(-1);
            expect(result.stdout).toContain('NOT REQUIRED (development target)');
          } else {
            expect(chrome).toBeGreaterThan(standards);
            expect(commands[chrome].slice(2)).toEqual([
              mode,
              port,
              '--',
              'node',
              expect.stringMatching(/test-chrome\.js$/),
              '--all',
              '--url',
              `http://localhost:${port}`,
            ]);
            expect(chrome).toBeLessThan(git);
          }
          expect(commands.some((command) => command.includes('test:w3c'))).toBe(false);
          expect(commands.some((command) => command.includes('push'))).toBe(false);
        },
        20000
      );
      it.each(
        shell === 'bash'
          ? ['--skip-tests', '--lighthouse', '--css-overview', '--memory']
          : ['-SkipTests', '-Lighthouse', '-CssOverview', '-Memory']
      )('rejects %s before running commands', (flag) => {
        const result = fixture(shell, ['-dev', flag]);
        expect(result.status).toBe(2);
        expect(result.commands).toEqual([]);
        expect(result.deploymentLog).toContain('[FAIL]');
        expect(result.deploymentLog).toContain(
          `[INFO] Deployment log: ${result.deploymentLogPath}`
        );
        expect(result.deploymentLog).not.toContain('STALE PREVIOUS RUN');
      });
      it.each([
        'format:check',
        'run lint',
        'test',
        'run build',
        'test:standards',
        'run-with-server.js',
        'w3c-local.js',
      ])(
        'aborts before git when %s fails',
        (step) => {
          const result = fixture(shell, ['-prod', noOpen, noFormat], { FAIL_STEP: step });
          expect(result.status).toBe(1);
          expect(result.commands.some((command) => command[0] === 'git')).toBe(false);
          expect(result.stdout).not.toContain('Verification Completed');
          expect(result.deploymentLog).toContain(`Fixture diagnostic stdout: ${step}`);
          expect(result.deploymentLog).toContain(`Fixture diagnostic stderr: ${step}`);
          expect(result.deploymentLog).toContain('[ABORT]');
          expect(result.stdout).toContain(`[INFO] Deployment log: ${result.deploymentLogPath}`);
        },
        20000
      );
      it('runs full W3C and live Chrome suites after a production push and deployment wait', () => {
        const result = fixture(shell, ['-prod', noOpen, noFormat, '-RenderWait', '1'], {
          PUSH_COMMITS: '1',
        });
        expect(result.status, result.stderr || result.stdout).toBe(0);
        const push = result.commands.findIndex((command) => command.includes('push'));
        const live = result.commands.findIndex((command) => command[1]?.endsWith('test-chrome.js'));
        const w3c = result.commands.findIndex((command) => command.includes('test:w3c'));
        expect(push).toBeGreaterThan(-1);
        expect(w3c).toBeGreaterThan(push);
        expect(live).toBeGreaterThan(w3c);
        expect(result.commands[w3c]).toEqual(['npm', 'run', 'test:w3c']);
        expect(result.commands[live].slice(2)).toEqual(['--all']);
        expect(result.stdout.indexOf('Render wait complete.')).toBeGreaterThan(-1);
        expect(result.stdout.indexOf('[W3C Standards Check]')).toBeGreaterThan(
          result.stdout.indexOf('Render wait complete.')
        );
        expect(result.stdout).toContain('PASSED (HTML and CSS, all live production pages)');
      }, 20000);
      it.each(['-w3c', '-w3c-HTML', '-w3c-CSS'])(
        'does not let %s narrow the mandatory post-deployment W3C suite',
        (flag) => {
          const result = fixture(shell, ['-prod', noOpen, noFormat, '-RenderWait', '0', flag], {
            PUSH_COMMITS: '1',
          });
          expect(result.status, result.stderr || result.stdout).toBe(0);
          expect(
            result.commands.filter((command) => command.some((arg) => arg.startsWith('test:w3c')))
          ).toEqual([['npm', 'run', 'test:w3c']]);
        },
        20000
      );
      it.each(['dev', 'preview'])(
        'does not contact W3C from %s, even with a legacy W3C flag',
        (target) => {
          const result = fixture(shell, [`-${target}`, noOpen, noFormat, '-w3c']);
          expect(result.status, result.stderr || result.stdout).toBe(0);
          expect(result.commands.some((command) => command.includes('test:w3c'))).toBe(false);
        },
        20000
      );
      it('allows an explicit full W3C rerun on production without pushing', () => {
        const result = fixture(
          shell,
          ['-prod', noOpen, noFormat, shell === 'bash' ? '--no-push' : '-NoPush', '-w3c'],
          { PUSH_COMMITS: '1' }
        );
        expect(result.status, result.stderr || result.stdout).toBe(0);
        expect(result.commands.some((command) => command.includes('push'))).toBe(false);
        expect(result.commands.filter((command) => command.includes('test:w3c'))).toEqual([
          ['npm', 'run', 'test:w3c'],
        ]);
        expect(result.commands.some((command) => command[1]?.endsWith('test-chrome.js'))).toBe(
          false
        );
        expect(result.commands.some((command) => command[1]?.endsWith('run-with-server.js'))).toBe(
          true
        );
        expect(result.stdout).toContain('PASSED (HTML and CSS, all live production pages)');
      }, 20000);
      it('runs live Chrome and reports failure when post-deployment W3C fails', () => {
        const result = fixture(shell, ['-prod', noOpen, noFormat, '-RenderWait', '0'], {
          PUSH_COMMITS: '1',
          FAIL_STEP: 'test:w3c',
        });
        expect(result.status).toBe(1);
        expect(result.commands.some((command) => command.includes('push'))).toBe(true);
        expect(result.commands.some((command) => command.includes('test:w3c'))).toBe(true);
        expect(result.commands.some((command) => command[1]?.endsWith('test-chrome.js'))).toBe(
          true
        );
        expect(result.stdout).not.toContain('Verification Completed');
        expect(result.deploymentLog).toContain('Fixture diagnostic stderr: test:w3c');
        expect(result.deploymentLog).toContain('Fixture diagnostic stdout: test:w3c');
        expect(result.deploymentLog).toContain('Chrome Tests against Render');
        expect(result.deploymentLog).toContain('Post-deployment validation failed:');
        expect(result.deploymentLog).toContain('[ABORT]');
        expect(result.stdout).toContain(`[INFO] Deployment log: ${result.deploymentLogPath}`);
      }, 20000);
      it('captures complete multiline failed-service stdout and stderr without truncation', () => {
        const result = fixture(shell, ['-prod', noOpen, noFormat, '-RenderWait', '0'], {
          PUSH_COMMITS: '1',
          FAIL_STEP: 'test:w3c',
          SERVICE_OUTPUT: serviceOutput,
        });
        expect(
          result.status,
          `${result.error || ''}\n${result.stderr}\n${result.deploymentLog.slice(-2000)}`
        ).toBe(1);
        const normalized = result.deploymentLog.replace(/\r\n/g, '\n');
        for (const line of serviceOutput.split('\n')) {
          expect(normalized.split('\n')).toContain(line);
          expect(normalized.split('\n')).toContain(`stderr: ${line}`);
        }
        expect(normalized).toContain('Post-deployment validation failed:');
        expect(normalized).toContain(`[INFO] Deployment log: ${result.deploymentLogPath}`);
      }, 60000);
      it('repeats all local gates after a rebase changes the source tree', () => {
        const result = fixture(shell, ['-prod', noOpen, noFormat, '-RenderWait', '0'], {
          PUSH_COMMITS: '1',
          BEHIND_COMMITS: '1',
        });
        expect(result.status, result.stderr || result.stdout).toBe(0);
        expect(
          result.commands.filter((command) => command.includes('test:standards'))
        ).toHaveLength(2);
        const rebase = result.commands.findIndex((command) => command.includes('rebase'));
        const push = result.commands.findIndex((command) => command.includes('push'));
        const repeated = result.commands.findLastIndex((command) =>
          command[1]?.endsWith('run-with-server.js')
        );
        expect(repeated).toBeGreaterThan(rebase);
        expect(repeated).toBeLessThan(push);
      }, 20000);
    });
  }
});
