// Tools Registry - Central catalog of all active modules
import * as deedCalc from './deed-calculator/index.js';
import * as actionTimers from './action-timers/index.js';
import * as distanceCalc from './distance-calc/index.js';
import * as playerNotes from './player-notes/index.js';

export const TOOLS_LIST = [
  deedCalc,
  actionTimers,
  distanceCalc,
  playerNotes
];

export const CATEGORIES = [
  { id: 'All', name: 'All Tools', icon: '⚡' },
  { id: 'Settlement', name: 'Settlement & Deed', icon: '🏰' },
  { id: 'Timers', name: 'Timers & Rituals', icon: '⏳' },
  { id: 'Navigation', name: 'Navigation & Travel', icon: '🧭' }
];

export function getToolById(id) {
  return TOOLS_LIST.find(t => t.toolMetadata.id === id);
}
