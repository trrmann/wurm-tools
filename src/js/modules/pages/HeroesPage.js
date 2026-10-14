import { BasePage } from './BasePage.js';
import * as heroesEditor from '../../tools/heroes/index.js';
import { renderShell, setHeader, initSidebar } from '../shell.js';

export class HeroesPage extends BasePage {
  static pageAppID = 'heroes-app';

  constructor() {
    super({
      id: 'heroes',
      title: 'HERO Worlds',
      description: 'Create HERO System worlds and point-built objects locally',
    });
    this.teardownSidebar = null;
  }

  render() {
    if (!this.container) return;
    this.viewport = renderShell(this.container);
    setHeader(this.title, this.description);
    heroesEditor.mount(this.viewport);
  }

  bindEvents() {
    this.teardownSidebar = initSidebar({
      currentToolId: null,
      onSelectTool: () => {},
    });
  }

  unbindEvents() {
    heroesEditor.unmount();
    this.teardownSidebar?.();
    this.teardownSidebar = null;
  }
}
