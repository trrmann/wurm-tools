// Automated Chrome Memory & Leak Detection Suite for Wurm Tools
// Connects via Chrome DevTools Protocol to measure heap allocations, DOM node counts, and leak resilience across interactions

import { CdpSession } from './cdp-client.js';

const DEFAULT_PAGES = ['/', '/site/dashboard/', '/site/concepts/'];
const DEFAULT_BASE_URL = 'https://wurm-tools.onrender.com';
const MAX_ALLOWED_HEAP_DELTA_MB = 10; // Max allowed heap growth after GC
const MAX_ALLOWED_NODE_DELTA = 150; // Max allowed detached node growth after GC

const args = process.argv.slice(2);
let baseUrl = DEFAULT_BASE_URL;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && args[i + 1]) {
    baseUrl = args[++i];
  } else if (args[i].startsWith('http://') || args[i].startsWith('https://')) {
    baseUrl = args[i];
  }
}

baseUrl = baseUrl.replace(/\/+$/, '');

console.log('==========================================================');
console.log('         Wurm Tools — Chrome Memory & Leak Testing');
console.log('==========================================================');
console.log(`Target Base URL      : ${baseUrl}`);
console.log(`Max Heap Growth Allow: ${MAX_ALLOWED_HEAP_DELTA_MB} MB`);
console.log(`Max Node Growth Allow: ${MAX_ALLOWED_NODE_DELTA} DOM nodes\n`);

function formatBytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function testPageMemory(cdp, pagePath) {
  const fullUrl = `${baseUrl}${pagePath}`;
  await cdp.navigate(fullUrl, { timeoutMs: 25000 });

  // Let initial rendering settle and trigger GC for a clean baseline
  await new Promise((r) => setTimeout(r, 600));
  await cdp.collectGarbage();

  const baselineMetrics = await cdp.getPerformanceMetrics();
  const baseHeapUsed = baselineMetrics.JSHeapUsedSize || 0;
  const baseHeapTotal = baselineMetrics.JSHeapTotalSize || 0;
  const baseNodes = baselineMetrics.Nodes || 0;
  const baseDocuments = baselineMetrics.Documents || 0;

  // Simulate user actions: switching tools, searching, modal toggling
  await cdp.evaluate(`
    (async () => {
      // 1. Cycle through tool navigation buttons
      const navButtons = Array.from(document.querySelectorAll('.nav-item-btn'));
      for (let i = 0; i < 2; i++) {
        for (const btn of navButtons) {
          btn.click();
          await new Promise(r => setTimeout(r, 60));
        }
      }

      // 2. Simulate search typing
      const searchInput = document.getElementById('tool-search-input');
      if (searchInput) {
        searchInput.value = 'calc';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 80));
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // 3. Open and close modal
      const openModalBtn = document.getElementById('open-concepts-modal-btn');
      const closeModalBtn = document.getElementById('close-concepts-modal');
      if (openModalBtn && closeModalBtn) {
        openModalBtn.click();
        await new Promise(r => setTimeout(r, 100));
        closeModalBtn.click();
        await new Promise(r => setTimeout(r, 100));
      }
    })()
  `);

  // Allow interaction DOM updates to settle
  await new Promise((r) => setTimeout(r, 500));

  // Measure peak memory during interaction
  const peakMetrics = await cdp.getPerformanceMetrics();
  const peakHeapUsed = peakMetrics.JSHeapUsedSize || 0;
  const peakNodes = peakMetrics.Nodes || 0;

  // Force GC to reclaim transient memory
  await cdp.collectGarbage();
  await new Promise((r) => setTimeout(r, 200));

  // Measure post-GC memory
  const finalMetrics = await cdp.getPerformanceMetrics();
  const finalHeapUsed = finalMetrics.JSHeapUsedSize || 0;
  const finalHeapTotal = finalMetrics.JSHeapTotalSize || 0;
  const finalNodes = finalMetrics.Nodes || 0;
  const finalDocuments = finalMetrics.Documents || 0;

  const heapGrowthBytes = Math.max(0, finalHeapUsed - baseHeapUsed);
  const heapGrowthMb = heapGrowthBytes / (1024 * 1024);
  const nodeGrowth = Math.max(0, finalNodes - baseNodes);

  const passed = heapGrowthMb <= MAX_ALLOWED_HEAP_DELTA_MB && nodeGrowth <= MAX_ALLOWED_NODE_DELTA;

  return {
    pagePath,
    passed,
    baseline: {
      heapUsed: baseHeapUsed,
      heapTotal: baseHeapTotal,
      nodes: baseNodes,
      documents: baseDocuments,
    },
    peak: {
      heapUsed: peakHeapUsed,
      nodes: peakNodes,
    },
    final: {
      heapUsed: finalHeapUsed,
      heapTotal: finalHeapTotal,
      nodes: finalNodes,
      documents: finalDocuments,
    },
    heapGrowthMb,
    nodeGrowth,
  };
}

async function run() {
  const cdp = new CdpSession({ port: 9222, headless: true });
  let anyFailed = false;

  try {
    await cdp.launch();

    for (const pagePath of DEFAULT_PAGES) {
      console.log(`>>> Testing Memory on: ${pagePath} (${baseUrl}${pagePath})`);
      const res = await testPageMemory(cdp, pagePath);

      console.log(
        '  ┌──────────────────────────────────┬──────────────┬──────────────┬──────────────┐'
      );
      console.log(
        '  │ Metric                           │ Baseline     │ Peak         │ Post-GC      │'
      );
      console.log(
        '  ├──────────────────────────────────┼──────────────┼──────────────┼──────────────┤'
      );
      console.log(
        `  │ JS Heap Used                     │ ${formatBytes(res.baseline.heapUsed).padEnd(12, ' ')} │ ${formatBytes(res.peak.heapUsed).padEnd(12, ' ')} │ ${formatBytes(res.final.heapUsed).padEnd(12, ' ')} │`
      );
      console.log(
        `  │ Total Heap Allocated             │ ${formatBytes(res.baseline.heapTotal).padEnd(12, ' ')} │ ${(res.peak.heapUsed ? '—' : '—').padEnd(12, ' ')} │ ${formatBytes(res.final.heapTotal).padEnd(12, ' ')} │`
      );
      console.log(
        `  │ DOM Nodes Count                  │ ${res.baseline.nodes.toString().padEnd(12, ' ')} │ ${res.peak.nodes.toString().padEnd(12, ' ')} │ ${res.final.nodes.toString().padEnd(12, ' ')} │`
      );
      console.log(
        `  │ Active Documents                 │ ${res.baseline.documents.toString().padEnd(12, ' ')} │ ${res.baseline.documents.toString().padEnd(12, ' ')} │ ${res.final.documents.toString().padEnd(12, ' ')} │`
      );
      console.log(
        '  └──────────────────────────────────┴──────────────┴──────────────┴──────────────┘'
      );

      console.log(
        `  • Heap Growth After GC: ${res.heapGrowthMb.toFixed(2)} MB (limit: ${MAX_ALLOWED_HEAP_DELTA_MB} MB)`
      );
      console.log(
        `  • Node Growth After GC: ${res.nodeGrowth} nodes (limit: ${MAX_ALLOWED_NODE_DELTA} nodes)`
      );
      console.log(
        `  • Memory Health Status: ${res.passed ? '[PASS] No Leaks Detected' : '[FAIL] Potential Memory Leak Detected'}\n`
      );

      if (!res.passed) {
        anyFailed = true;
      }
    }

    console.log('==========================================================');
    if (anyFailed) {
      console.log('  [FAIL] One or more pages exceeded memory growth thresholds.');
      console.log('==========================================================\n');
      process.exit(1);
    } else {
      console.log('  [SUCCESS] All pages passed Chrome Memory leak tests!');
      console.log('==========================================================\n');
      process.exit(0);
    }
  } finally {
    await cdp.close();
  }
}

run().catch((err) => {
  console.error('[FATAL] Memory test runner failed:', err);
  process.exit(1);
});
