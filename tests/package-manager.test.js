import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installerSourceFiles } from '../scripts/helper-build-state.js';

const project = fileURLToPath(new URL('../', import.meta.url));

describe('pnpm-only project commands', () => {
  it('pins pnpm, retains its lockfile and removes the obsolete npm lockfile', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8'));
    expect(pkg.packageManager).toBe('pnpm@12.15.0');
    expect(fs.existsSync(path.join(project, 'pnpm-lock.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(project, 'package-lock.json'))).toBe(false);
    for (const command of Object.values(pkg.scripts))
      expect(command).not.toMatch(/\b(?:npm|npx)(?:\.cmd)?\s/);
  });

  it('keeps npm/npx commands out of operational scripts, CI, deployment and guides', () => {
    const obsoleteCommand =
      /\bnpm(?:\.cmd)?[ \t]+(?:ci|install|run|test|exec|update|upgrade|uninstall|i|add)\b|\bnpx(?:\.cmd)?[ \t]+(?:eslint|prettier|vitest|vite|pnpm)\b/;
    const violations = [];
    for (const file of installerSourceFiles(project)) {
      if (!/\.(?:js|sh|ps1|cmd|md|yaml|yml|json|html)$/.test(file)) continue;
      const lines = fs.readFileSync(path.join(project, file), 'utf8').split('\n');
      for (const [index, line] of lines.entries())
        if (obsoleteCommand.test(line)) violations.push(`${file}:${index + 1}`);
    }
    expect(violations).toEqual([]);
  });
});
