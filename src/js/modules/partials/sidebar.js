// Sidebar Partial Module
export async function loadSidebarHtml() {
  try {
    const res = await fetch('/site/partials/sidebar.html');
    if (res.ok) {
      return await res.text();
    }
  } catch {
    // Fall back to template
  }
  return getSidebarTemplate();
}

export function getSidebarTemplate() {
  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="logo-badge">
          <img src="/images/logo.svg" alt="Wurm Tools" width="24" height="24" />
        </div>
        <div>
          <div class="sidebar-title">Wurm Tools</div>
          <div class="sidebar-subtitle">Companion Suite</div>
        </div>
      </div>

      <div class="sidebar-search">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            id="tool-search-input"
            class="search-input"
            placeholder="Search tools..."
            aria-label="Search tools"
          />
        </div>
      </div>

      <nav class="sidebar-nav" id="sidebar-navigation">
        <!-- Dynamically rendered tool list -->
      </nav>

      <div class="sidebar-footer">
        <button id="open-concepts-modal-btn" class="concepts-btn" type="button">
          <span>📜</span> View Suite Concepts & Roadmap
        </button>
        <div class="render-badge">Ready for Render Static Hosting</div>
      </div>
    </aside>
  `;
}
