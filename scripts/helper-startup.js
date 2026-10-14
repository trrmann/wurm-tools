#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const action = process.argv[2];
const taskName = 'Wurm Tools Local Helper';
const unitName = 'wurm-helper.service';
const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'wurm-local.js');

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
}

function tryRun(command, args) {
  try {
    run(command, args);
    return true;
  } catch {
    return false;
  }
}

function systemdQuote(value) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/%/g, '%%')}"`;
}

export function windowsTaskCreateArgs(nodePath = process.execPath, helperPath = scriptPath) {
  return [
    '/Create',
    '/TN',
    taskName,
    '/SC',
    'ONLOGON',
    '/TR',
    `"${nodePath}" "${helperPath}"`,
    '/RL',
    'LIMITED',
    '/F',
  ];
}

export function systemdUnitContent(
  projectRoot = path.resolve(path.dirname(scriptPath), '..'),
  nodePath = process.execPath,
  helperPath = scriptPath
) {
  return [
    '[Unit]',
    'Description=Wurm Tools local helper',
    '',
    '[Service]',
    `WorkingDirectory=${systemdQuote(projectRoot)}`,
    `ExecStart=${systemdQuote(nodePath)} ${systemdQuote(helperPath)} --foreground`,
    'Restart=on-failure',
    'RestartSec=3',
    '',
    '[Install]',
    'WantedBy=default.target',
    '',
  ].join('\n');
}

function installWindows() {
  run('schtasks.exe', windowsTaskCreateArgs());
  run('schtasks.exe', ['/Run', '/TN', taskName]);
  console.info('Opt-in startup installed: helper starts at your Windows logon.');
}

function removeWindows() {
  tryRun(process.execPath, [scriptPath, '--stop']);
  tryRun('schtasks.exe', ['/End', '/TN', taskName]);
  if (!tryRun('schtasks.exe', ['/Delete', '/TN', taskName, '/F'])) {
    console.info('The Wurm Tools helper logon task was not installed.');
    return;
  }
  console.info('The Wurm Tools helper logon task was removed.');
}

function unitDirectory() {
  return path.join(
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
    'systemd',
    'user'
  );
}

function installLinux() {
  const directory = unitDirectory();
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const projectRoot = path.resolve(path.dirname(scriptPath), '..');
  const unit = systemdUnitContent(projectRoot);
  fs.writeFileSync(path.join(directory, unitName), unit, { mode: 0o600 });
  run('systemctl', ['--user', 'daemon-reload']);
  run('systemctl', ['--user', 'enable', '--now', unitName]);
  console.info('Opt-in startup installed: systemd starts the helper at your Fedora logon.');
  console.info('Optional: loginctl enable-linger "$USER" keeps it running while logged out.');
}

function removeLinux() {
  const unitPath = path.join(unitDirectory(), unitName);
  tryRun('systemctl', ['--user', 'disable', '--now', unitName]);
  if (fs.existsSync(unitPath)) fs.unlinkSync(unitPath);
  run('systemctl', ['--user', 'daemon-reload']);
  tryRun('systemctl', ['--user', 'reset-failed', unitName]);
  console.info('The Wurm Tools systemd user service was removed.');
}

const isDirectCli =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectCli) {
  if (!['install', 'remove'].includes(action)) {
    console.error('Usage: node scripts/helper-startup.js <install|remove>');
    process.exit(2);
  } else if (process.platform === 'win32') {
    action === 'install' ? installWindows() : removeWindows();
  } else if (process.platform === 'linux') {
    action === 'install' ? installLinux() : removeLinux();
  } else {
    console.error(
      `Login startup is supported on Windows and Fedora/Linux, not ${process.platform}.`
    );
    process.exit(1);
  }
}
