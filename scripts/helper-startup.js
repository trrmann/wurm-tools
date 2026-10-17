#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const action = process.argv[2];
const taskName = 'Wurm Tools Local Helper';
const unitName = 'wurm-helper.service';
const protocolName = 'wurm-helper';
const desktopFile = 'wurm-helper-handler.desktop';
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

export function windowsProtocolCommand(nodePath = process.execPath, helperPath = scriptPath) {
  return `"${nodePath}" "${helperPath}" "%1"`;
}

function desktopQuote(value) {
  return `"${value.replace(/(["`$\\])/g, '\\$1').replace(/%/g, '%%')}"`;
}

export function desktopEntryContent(nodePath = process.execPath, helperPath = scriptPath) {
  return [
    '[Desktop Entry]',
    'Type=Application',
    'Name=Wurm Tools helper launcher',
    `Exec=${desktopQuote(nodePath)} ${desktopQuote(helperPath)}`,
    'NoDisplay=true',
    'Terminal=false',
    `MimeType=x-scheme-handler/${protocolName};`,
    '',
  ].join('\n');
}

function installProtocolWindows() {
  const key = `HKCU\\Software\\Classes\\${protocolName}`;
  run('reg.exe', ['add', key, '/ve', '/d', 'URL:Wurm Tools helper', '/f']);
  run('reg.exe', ['add', key, '/v', 'URL Protocol', '/d', '', '/f']);
  run('reg.exe', [
    'add',
    `${key}\\shell\\open\\command`,
    '/ve',
    '/d',
    windowsProtocolCommand(),
    '/f',
  ]);
  console.info(`Browser launch enabled: ${protocolName}:// starts the helper on Windows.`);
}

function removeProtocolWindows() {
  tryRun('reg.exe', ['delete', `HKCU\\Software\\Classes\\${protocolName}`, '/f']);
  console.info('Browser launch handler removed.');
}

function applicationsDirectory() {
  return path.join(
    process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'),
    'applications'
  );
}

function installProtocolLinux() {
  const directory = applicationsDirectory();
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(directory, desktopFile), desktopEntryContent(), { mode: 0o600 });
  tryRun('update-desktop-database', [directory]);
  run('xdg-mime', ['default', desktopFile, `x-scheme-handler/${protocolName}`]);
  console.info(`Browser launch enabled: ${protocolName}:// starts the helper on Fedora.`);
}

function removeProtocolLinux() {
  const file = path.join(applicationsDirectory(), desktopFile);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  tryRun('update-desktop-database', [applicationsDirectory()]);
  console.info('Browser launch handler removed.');
}

function installWindows() {
  run('schtasks.exe', windowsTaskCreateArgs());
  run('schtasks.exe', ['/Run', '/TN', taskName]);
  installProtocolWindows();
  console.info('Opt-in startup installed: helper starts at your Windows logon.');
}

function removeWindows() {
  removeProtocolWindows();
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
  tryRun(process.execPath, [
    fileURLToPath(new URL('./helper-startup.js', import.meta.url)),
    'protocol-install',
  ]);
  console.info('Opt-in startup installed: systemd starts the helper at your Fedora logon.');
  console.info('Optional: loginctl enable-linger "$USER" keeps it running while logged out.');
}

function removeLinux() {
  removeProtocolLinux();
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
  if (action === 'protocol-install' || action === 'protocol-remove') {
    const install = action === 'protocol-install';
    if (process.platform === 'win32') install ? installProtocolWindows() : removeProtocolWindows();
    else if (process.platform === 'linux') install ? installProtocolLinux() : removeProtocolLinux();
    else process.exit(1);
  } else if (!['install', 'remove'].includes(action)) {
    console.error(
      'Usage: node scripts/helper-startup.js <install|remove|protocol-install|protocol-remove>'
    );
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
