// Chrome Unified Testing Suite for Wurm Tools
// Executes Lighthouse, CSS Overview, and Memory Testing across all pages

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

let runLighthouse = false;
let runCssOverview = false;
let runMemory = false;
let customArgs = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--lighthouse') {
    runLighthouse = true;
  } else if (arg === '--css-overview') {
    runCssOverview = true;
  } else if (arg === '--memory') {
    runMemory = true;
  } else if (arg === '--all') {
    runLighthouse = true;
    runCssOverview = true;
    runMemory = true;
  } else {
    customArgs.push(arg);
  }
}

// If no specific suite was flagged, run all
if (!runLighthouse && !runCssOverview && !runMemory) {
  runLighthouse = true;
  runCssOverview = true;
  runMemory = true;
}

console.log('==========================================================');
console.log('         Wurm Tools — Chrome Automated Testing Suite');
console.log('==========================================================');
console.log(
  `Suites to Execute: ${[
    runLighthouse ? 'Lighthouse' : null,
    runCssOverview ? 'CSS Overview' : null,
    runMemory ? 'Memory & Leaks' : null,
  ]
    .filter(Boolean)
    .join(', ')}\n`
);

const failures = [];

async function executeSuite(scriptName, label) {
  console.log(`>>> Running ${label}...`);
  const scriptPath = path.join(__dirname, scriptName);
  const diagnostics = new Set();
  const result = await new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...customArgs], {
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    for (const [stream, destination] of [
      [child.stdout, process.stdout],
      [child.stderr, process.stderr],
    ]) {
      let pending = '';
      const record = (line) => {
        if (/^\s*\[(?:FAIL|FATAL)\]/.test(line)) diagnostics.add(line.trim());
      };
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        destination.write(chunk);
        pending += chunk;
        const lines = pending.split('\n');
        pending = lines.pop();
        for (const line of lines) record(line);
      });
      stream.on('end', () => record(pending));
    }
    child.once('error', (error) => {
      diagnostics.add(`[FAIL] Could not start ${label}: ${error.message}`);
      resolve({ code: null, signal: null });
    });
    child.once('close', (code, signal) => resolve({ code, signal }));
  });

  if (result.code !== 0) {
    const reason = result.signal ? `signal ${result.signal}` : `status code ${result.code}`;
    console.error(`\n[FAIL] ${label} exited with ${reason}.\n`);
    failures.push({ label, reason, diagnostics });
    return false;
  }
  return true;
}

let allPassed = true;

if (runLighthouse) {
  const passed = await executeSuite('test-lighthouse.js', 'Chrome Lighthouse Audit');
  if (!passed) allPassed = false;
}

if (runCssOverview) {
  const passed = await executeSuite('test-css-overview.js', 'Chrome CSS Overview Audit');
  if (!passed) allPassed = false;
}

if (runMemory) {
  const passed = await executeSuite('test-memory.js', 'Chrome Memory Leak Audit');
  if (!passed) allPassed = false;
}

console.log('==========================================================');
if (allPassed) {
  console.log('  [SUCCESS] All Chrome test suites completed successfully!');
  console.log('==========================================================\n');
} else {
  console.log('  [FAIL] One or more Chrome test suites failed.');
  for (const { label, reason, diagnostics } of failures) {
    console.error(`  [FAIL] ${label} (${reason})`);
    for (const diagnostic of diagnostics) console.error(`    ${diagnostic}`);
  }
  console.log('==========================================================\n');
  process.exitCode = 1;
}
