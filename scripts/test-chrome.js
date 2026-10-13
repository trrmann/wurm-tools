// Chrome Unified Testing Suite for Wurm Tools
// Executes Lighthouse, CSS Overview, and Memory Testing across all pages

import { spawnSync } from 'child_process';
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

function executeSuite(scriptName, label) {
  console.log(`>>> Running ${label}...`);
  const scriptPath = path.join(__dirname, scriptName);
  const result = spawnSync(process.execPath, [scriptPath, ...customArgs], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    console.error(`\n[FAIL] ${label} exited with status code ${result.status}.\n`);
    return false;
  }
  return true;
}

let allPassed = true;

if (runLighthouse) {
  const passed = executeSuite('test-lighthouse.js', 'Chrome Lighthouse Audit');
  if (!passed) allPassed = false;
}

if (runCssOverview) {
  const passed = executeSuite('test-css-overview.js', 'Chrome CSS Overview Audit');
  if (!passed) allPassed = false;
}

if (runMemory) {
  const passed = executeSuite('test-memory.js', 'Chrome Memory Leak Audit');
  if (!passed) allPassed = false;
}

console.log('==========================================================');
if (allPassed) {
  console.log('  [SUCCESS] All Chrome test suites completed successfully!');
  console.log('==========================================================\n');
  process.exit(0);
} else {
  console.log('  [FAIL] One or more Chrome test suites failed.');
  console.log('==========================================================\n');
  process.exit(1);
}
