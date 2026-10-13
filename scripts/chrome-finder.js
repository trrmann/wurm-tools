// Helper to discover Google Chrome or Chromium executable on Windows, Linux, and macOS
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export function findChromePath() {
  const platform = process.platform;

  if (platform === 'win32') {
    // 1. Check registry App Paths via reg query
    try {
      const regOut = execSync(
        'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      const match = regOut.match(/REG_SZ\s+(.*)/);
      if (match && match[1] && fs.existsSync(match[1].trim())) {
        return match[1].trim();
      }
    } catch {
      /* registry key not found */
    }

    // 2. Check standard Windows file locations
    const candidatePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google\\Chrome\\Application\\chrome.exe'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // 3. Check where / where.exe
    try {
      const whereOut = execSync('where chrome.exe', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const firstLine = whereOut.trim().split(/\r?\n/)[0];
      if (firstLine && fs.existsSync(firstLine)) {
        return firstLine;
      }
    } catch {
      /* chrome.exe not on PATH */
    }
  } else if (platform === 'linux') {
    // Linux (Fedora, Ubuntu, Debian, etc.)
    const commands = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];
    for (const cmd of commands) {
      try {
        const whichOut = execSync(`which ${cmd}`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        const binaryPath = whichOut.trim().split(/\r?\n/)[0];
        if (binaryPath && fs.existsSync(binaryPath)) {
          return binaryPath;
        }
      } catch {
        /* command not found on Linux */
      }
    }
  } else if (platform === 'darwin') {
    // macOS
    const macPaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
    for (const p of macPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  }

  throw new Error(
    `Google Chrome or Chromium executable could not be automatically found on ${platform}. ` +
      'Please install Chrome or set the CHROME_PATH environment variable.'
  );
}
