# Wurm Tools — Development Todo & Roadmap

Completed milestones, implementation details, measurements, and historical notes are in the [completed-task archive](completed.md). HERO System tasks are tracked separately in the [HERO roadmap](heroes-todo.md), with their own [completed-task archive](heroes-completed.md).

**Installer and follow-up instructions:** [User steering notes/status](steering-notes.md) ·
[Installer operations](helper-installer.md) · [Signing](helper-signing.md) ·
[PostgreSQL/pgAdmin discovery (SQLite retained)](database-development.md) ·
[Deployment and W3C troubleshooting](validation.md).
The installer parent task remains in the HERO roadmap; it is not complete until its release gates pass.

## Undiscovered Data (Fedora)

- [ ] Map: determine the meaning of rock-layer "Rock" data bytes 202/222 (137 tiles) and `resources.map` quantity versus type. Field/crop tiles (type, age) and real protected tiles remain untested because the sample world has none.
- [ ] Items: investigate remaining `ITEMS` details, `ITEMDATA`, `SPELLEFFECTS`, `LOCKS`, `ITEMKEYS`, and `COINS`; map template IDs to names from the server JAR.
- [ ] Structures (remaining): investigate `WALLS`, `FENCES`, `FLOORS`, `BUILDTILES`, `DOORS`, `GATES`, and `STRUCTURES`; verify floor-level/layer conventions against the map.
- [ ] Villages and kingdoms (remaining): investigate `VILLAGES` links to structures, `CITIZENS`, `GUARDS`, `KINGDOMS`, `HOTA_ITEMS`, `MINING`, and `FOCUSZONES`.
- [ ] Deities, entities, and economy: investigate `DEITIES`, `ENTITIES`, `CONTROLLERS`, `LOCALSUPPLYDEMAND`, and `TRADER`.
- [ ] Player extras: investigate `ACHIEVEMENTS`, `TITLES`, `AFFINITIES`, `SKILLCHANCES`, `CALENDAR`, and `SERVERPROPERTIES`.
- [ ] Build ID-to-name maps from the server JAR for skills, item templates, creature templates, and deities.
- [ ] Sensitive tables (accounts, IP history, email history, tickets): inspect schema and counts only unless approved.

## Map and Ore Follow-ups

These unresolved details remain open even though their parent implementation tasks are complete. The [archive](completed.md) retains the original findings, measurements, routes, and caveats.

- Ground items: cave versus surface remains unresolved because `ITEMS` has no layer column.
- Resource-map ID names and quantities remain unknown.
- Ore quantities: all observed values are `0xFFFF`, reported as unrolled. The assumption that Wurm sets them when a tile is first mined remains unconfirmed.
- Ore quality: the x/y seed order used for the derived per-tile quality ceiling is not independently verified.
- Not done: a UI panel for ores and ore queries in browser-only mode.

## Map Editing

The helper-mode map edit interface and work report are complete; browser-only edits remain open.

- Confirm real pile sizes per material (clay differs from dirt) and set them as defaults in `scripts/wurm-piles.js`.
- Browser-only (IndexedDB) edit support.
