#!/usr/bin/env node
/**
 * Wurm Tools — Semantic Version Manager
 * Supports: major, minor, patch (point) increments and reading current version.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const pkgPath = path.join(projectRoot, 'package.json');

function readPackageJson() {
  const content = fs.readFileSync(pkgPath, 'utf8');
  return JSON.parse(content);
}

function parseSemver(versionStr) {
  const match = versionStr.match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (!match) {
    throw new Error(`Invalid semver version: "${versionStr}"`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || '',
  };
}

function bumpVersion(current, type) {
  const semver = parseSemver(current);
  switch (type.toLowerCase()) {
    case 'major':
      return `${semver.major + 1}.0.0`;
    case 'minor':
      return `${semver.major}.${semver.minor + 1}.0`;
    case 'patch':
    case 'point':
      return `${semver.major}.${semver.minor}.${semver.patch + 1}`;
    default:
      throw new Error(`Unknown bump type "${type}". Allowed: major, minor, patch, point`);
  }
}

function updateVersion(newVersion) {
  const pkg = readPackageJson();
  const oldVersion = pkg.version;
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

  return { oldVersion, newVersion };
}

const args = process.argv.slice(2);
const firstArg = args[0] || '--get';

if (firstArg === '--get' || firstArg === '-g' || firstArg === 'get') {
  const pkg = readPackageJson();
  console.log(pkg.version);
  process.exit(0);
}

if (['major', 'minor', 'patch', 'point'].includes(firstArg.toLowerCase())) {
  const pkg = readPackageJson();
  const { oldVersion, newVersion } = updateVersion(bumpVersion(pkg.version, firstArg));
  console.log(`[PASS] Bumped version: v${oldVersion} -> v${newVersion} (${firstArg})`);
  process.exit(0);
}

console.error(`Usage: node scripts/version.js [major | minor | patch | point | --get]`);
process.exit(1);
