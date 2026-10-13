// Wurm Tools — Main Application Bootstrap
import '../styles/style.css';
import { DashboardPage } from './modules/pages/DashboardPage.js';
import { showToast } from './modules/toast.js';

export { showToast };

let activeDashboardPage = null;

export function initApp() {
  const appContainer = document.getElementById('app');
  if (appContainer) {
    activeDashboardPage = new DashboardPage();
    activeDashboardPage.mount(appContainer);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
