import { ESLint } from 'eslint';
import { fileURLToPath } from 'node:url';
import { projectPagePaths } from './project-pages.js';

const pages = projectPagePaths();
console.log(
  `Local HTML/CSS validation: ${pages.length} pages from Vite build entries, plus project stylesheets.`
);
console.log(
  'Using the project HTML/CSS ESLint validators locally; no files are sent to external services.'
);
const eslint = new ESLint();
const results = await eslint.lintFiles([
  ...pages.map((page) =>
    fileURLToPath(new URL(`..${page}${page.endsWith('/') ? 'index.html' : ''}`, import.meta.url))
  ),
  '**/*.css',
]);
const formatter = await eslint.loadFormatter('stylish');
const output = formatter.format(results);
if (output) console.log(output);
const failed = results.some(
  (result) => result.errorCount || result.warningCount || result.fatalErrorCount
);
if (failed) {
  console.error('[FAIL] Local HTML/CSS validation failed.');
  process.exitCode = 1;
} else
  console.log(
    `[PASS] Local HTML/CSS validation passed for all ${pages.length} pages and project stylesheets.`
  );
