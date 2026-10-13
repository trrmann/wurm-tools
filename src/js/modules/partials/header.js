// Header Partial Module
export async function loadHeaderHtml() {
  try {
    const res = await fetch('/site/partials/header.html');
    if (res.ok) {
      return await res.text();
    }
  } catch {
    // Fall back to template
  }
  return getHeaderTemplate();
}

export function getHeaderTemplate(
  title = 'Deed & Upkeep Calculator',
  desc = 'Calculate deed dimensions, creation fees, monthly upkeep costs, and deed bank runway.'
) {
  return `
    <header class="top-header">
      <div class="header-left">
        <button id="mobile-menu-toggle" class="mobile-menu-toggle" aria-label="Toggle Menu">
          ☰
        </button>
        <div class="header-title-container">
          <h1 id="header-tool-title">${title}</h1>
          <p id="header-tool-desc">${desc}</p>
        </div>
      </div>

      <div class="header-actions">
        <span class="badge-tag">Offline-Ready Client</span>
      </div>
    </header>
  `;
}
