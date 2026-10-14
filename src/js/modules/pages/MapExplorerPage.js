import { BasePage } from './BasePage.js';
import * as mapExplorer from '../../tools/map-explorer/index.js';
import { renderShell, setHeader, initSidebar } from '../shell.js';

export class MapExplorerPage extends BasePage {
  static pageAppID = 'map-explorer-app';

  constructor() {
    super({
      id: 'map-explorer',
      title: 'World Map Explorer',
      description: 'Capture and inspect local Wurm world map layers',
    });
    this.teardownSidebar = null;
  }

  render() {
    if (!this.container) return;
    this.viewport = renderShell(this.container);
    setHeader('World Map Explorer', 'Capture and inspect local Wurm world map layers');
    mapExplorer.mount(this.viewport);
  }

  bindEvents() {
    this.teardownSidebar = initSidebar({
      currentToolId: null,
      onSelectTool: () => {},
    });
  }

  unbindEvents() {
    mapExplorer.unmount();
    this.teardownSidebar?.();
    this.teardownSidebar = null;
  }
}
