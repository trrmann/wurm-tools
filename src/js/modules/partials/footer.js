// Footer Partial Module
export async function loadFooterHtml() {
  try {
    const res = await fetch('/site/partials/footer.html');
    if (res.ok) {
      return await res.text();
    }
  } catch {
    // Fall back to template
  }
  return getFooterTemplate();
}

export function getFooterTemplate() {
  return `
    <footer class="site-footer">
      <div class="footer-content">
        <p>Wurm Tools — Companion Suite for Wurm Online & Wurm Unlimited</p>
        <div class="footer-links">
          <a href="/site/dashboard/" class="footer-link">Dashboard</a>
          <span class="footer-separator">•</span>
          <a href="/site/concepts/" class="footer-link">Roadmap</a>
          <span class="footer-separator">•</span>
          <a href="https://github.com/trrmann/wurm-tools" target="_blank" rel="noopener noreferrer" class="footer-link">GitHub</a>
        </div>
      </div>
    </footer>
  `;
}
