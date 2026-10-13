// Concepts Page Entry Point
import '../../../styles/core.css';
import { ConceptsPage } from './ConceptsPage.js';

function initConceptsPage() {
  const container = document.getElementById('concepts-app');
  if (container) {
    const page = new ConceptsPage();
    page.mount(container);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initConceptsPage);
} else {
  initConceptsPage();
}
