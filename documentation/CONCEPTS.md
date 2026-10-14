
# Wurm Tools — Comprehensive Suite Concepts & Roadmap

This document outlines the architectural roadmap and modular feature concepts for the **Wurm Tools** web application. Designed for players of both **Wurm Online** and **Wurm Unlimited**, this suite bridges essential game mechanics, calculators, timers, and reference matrices into an intuitive, responsive, and extensible web toolkit.

---

## 1. Architectural Vision

- **Modular Architecture**: Each tool is an independent JavaScript module adhering to a standard interface (`mount(container)`, `unmount()`, and optional `saveState()` / `loadState()`).
- **Client-Side & Offline-Ready**: Powered by vanilla JavaScript with `localStorage` persistence, zero tracking, and lightweight footprint.
- **Responsive & Accessible**: Clean, modern dark-mode aesthetic with fantasy/earthy accents reminiscent of Wurm's medieval sandbox world.
- **Vite & Static Hosting**: Lightning-fast builds, optimized bundle splitting, and instantaneous deployment on Render.

---

## 2. Comprehensive Tool Suite Modules

### Module Group A: Settlement & Deed Operations

1. **Deed Cost & Upkeep Calculator** _(Implemented in starter dashboard)_
   - Calculate deed creation cost, monthly upkeep, and yearly maintenance in Gold, Silver, Copper, and Iron.
   - Size dimension calculator ($X \times Y$ tiles, perimeter tiles).
   - Guard count calculation (Spirit guards, upkeep increments).
   - Warning indicators when monthly cost approaches low balance thresholds.

2. **Perimeter & Expansion Planner**
   - Plan perimeter expansion steps and measure overlap with neighbors.
   - Calculate perimeter tile costs and border buffer rules.

3. **Building & Structure Material Calculator**
   - Material estimates for wooden, stone, slate, pottery, and marble houses.
   - Floor, roof, and wall plank/mortar/brick calculators.
   - Storage capacity estimator (Bulk storage bins, Food storage bins, Small carts, Large carts).

4. **Settlement Roles & Permission Matrix**
   - Visual cheat sheet for deed permissions (Citizen, Ally, Non-citizen, Enemy).
   - Recommended permission presets for trading posts, private homesteads, and alliance hubs.

---

### Module Group B: Timers, Rituals & Religion

1. **Action & Prayer Timers** _(Implemented in starter dashboard)_
   - Prayer cooldown tracker (20-minute cycle for favor gains).
   - Audio chime and browser notifications when timers elapse.
   - Meditation path ability countdowns (Cool-down resets for tier 1–5 abilities).
   - Custom countdown timer with preset shortcuts.

2. **Priest Favor & Spell Matrix**
   - Favor regeneration calculator based on Faith and Alignment.
   - Complete spell dictionary by deity (Fo, Magranon, Vynora, Libila).
   - Required favor, difficulty, channel time, and target restrictions.
   - Link / ritual circle alignment calculator.

3. **Sleep Bonus & Fatigue Tracker**
   - Sleep powder duration and remaining double-XP tick countdown.
   - Activity planning: optimal skill sessions during active sleep bonus.

---

### Module Group C: Navigation, Cartography & Travel

1. **Coordinate Distance & Travel Estimator** _(Implemented in starter dashboard)_
   - Distance calculation between two tile coordinates $(X_1, Y_1)$ and $(X_2, Y_2)$ in tiles and meters (1 tile = 4 meters).
   - Compass heading calculation (degrees and 16-point cardinal compass directions).
   - Travel time estimation across different transport methods:
     - On foot (walking, running)
     - Ridden horse / Hell horse (different speeds)
     - Cart (small cart, large cart)
     - Wagon / Carrier
     - Sailing (Rowboat, Sailboat, Corbita, Cog, Knarr)

2. **Waypoint Route Planner**
   - Save custom waypoints in `localStorage`.
   - Multi-leg journey planner with cumulative travel times.

3. **Slope & Terraforming Helper**
   - Slope elevation difference calculator (dirt/rock count needed to flatten or grade to a specific slope).
   - Cart slope limit warnings (e.g., maximum slope for loaded wagons vs. ridden horses).

---

### Module Group D: Crafting, Smithing & Metallurgy

1. **Alloy & Smelting Calculator**
   - Exact mass ratios for brass, bronze, electrum, steel, and glimmersteel.
   - Ore purity to metal ingot yield estimator.
   - Fuel duration calculator (wood/peat/charcoal burn times in forge/campfire).

2. **Improvement & Quality Level (QL) Guide**
   - Tool quality vs. maximum item quality cap.
   - Tool wear probability and damage repair formulas.
   - Optimal tool quality target recommendations based on current player skill.

3. **Rune Attributes & Synergy Guide**
   - Searchable reference of all god runes (Fo, Vynora, Magranon, Libila, Jackal).
   - Bonus effects (speed, QL chance, decay reduction, favor generation).
   - Incompatibility / conflict checker when combining multiple runes.

---

### Module Group E: Farming, Forestry & Cooking

1. **Crop Calendar & Harvest Cycle**
   - Wurm seasonal calendar synchronization (Starfall cycles).
   - Planting and harvesting windows for crops (barley, wheat, rye, corn, cotton, herbs).
   - Tree & bush sprout pruning and harvest timetable.

2. **Nutrition & CCFP Balancer**
   - Calorie, Carbohydrate, Fat, and Protein (CCFP) balancing helper.
   - Meal optimization for skill gain bonuses, stamina reduction, and carry weight boosts.
   - Recipe builder with affinity yield notes.

3. **Animal Husbandry & Trait Matrix**
   - Breeding trait inheritance tracker (Speed, Strength, Carry capacity, etc.).
   - Gestation periods and age stages (Foal -> Young -> Adolescent -> Mature -> Aged).
   - Inbreeding warning system.

---

### Module Group F: Archaeology & Prospecting

1. **Prospecting Analysis Log**
   - Log tile soundings and detect nearby veins.
   - Triangulate vein location based on quality and distance clues.

2. **Archaeological Fragment Restorer**
   - Track discovered statuettes, runes, and artifact fragments.
   - Combine simulator predicting success rates based on skill and fragment condition.

---

## 3. Data Persistence & Export

- **Local Storage**: All custom deed configurations, timer presets, waypoints, and personal notes persist seamlessly in browser `localStorage`.
- **JSON Import / Export**: Built-in settings backup allows players to export their configurations to a `.json` file and restore them on another device or browser.
- **Privacy First**: No server-side analytics, cookies, or user tracking. 100% client-side computation.

---

## 4. How to Add a New Tool Module

Adding a new tool to Wurm Tools is simple thanks to the modular architecture:

1. Create a new directory under `src/tools/<tool-name>/`.
2. Provide an `index.js` exporting:
   ```javascript
   export const toolMetadata = {
     id: 'tool-id',
     name: 'Tool Display Name',
     category: 'Settlement' | 'Timers' | 'Travel' | 'Crafting' | 'Reference',
     icon: '🗺️',
     description: 'Short summary of the tool functionality.',
   };

   export function mount(containerElement) {
     // Render markup and attach event listeners
   }

   export function unmount() {
     // Clean up timers or global listeners
   }
   ```
3. Register the tool in `src/tools/registry.js`.
4. The dashboard navigation and search will automatically discover and display the new module!
