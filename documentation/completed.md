# Wurm Tools — Completed Tasks & Implementation History

Active tasks and unresolved findings: [Wurm Tools roadmap](todo.md). Completed task status and historical implementation details are preserved here; a completed parent does not imply that its explicitly unfinished follow-ups are complete.

## Completed Milestones

W3C execution update (2026-10-24): public online validator services are disabled
because Cloudflare challenges prevent automated access. Deployment uses local,
checksum-pinned official Nu/W3C CSS Java tools against every live production page.
Java/tool integrity preflight runs before Git operations on both deployment scripts.
The production-push/wait/live-Chrome policy below is otherwise unchanged; historical
public-service retry notes are not the current execution path.

Deployment policy update (2026-10-23): the historical all-target Chrome and opt-in
W3C milestones below are superseded by the user-confirmed environment split.
Unit tests, formatting, lint, build, and local HTML/CSS checks remain mandatory
for all three targets. Chrome audits run for preview and production, not dev.
Full live W3C HTML/CSS checks now run automatically after a production push and
deployment wait, followed by live Chrome verification even if W3C fails. Failed
live checks are aggregated after both suites complete. No-push and up-to-date
production runs verify locally unless `-w3c` explicitly reruns the full live W3C
suite without pushing. Legacy W3C flags cannot narrow the suite. The previous
milestones remain below as implementation history, not the current test policy.

- [x] Migrate and refactor `/src/tools` to `/src/js/tools`
- [x] Add `/src/js/modules` folder for reusable modules (`toast.js`, `modal.js`, `navigation.js`)
- [x] Add `/src/js/modules/pages` folder for Page Objects (`BasePage.js`, `DashboardPage.js`, `ConceptsPage.js`)
- [x] Add `/site` folder with page folders for the site (`/site/dashboard/`, `/site/concepts/`)
- [x] Add `/src/styles/` for stylesheets (`style.css`) and brand assets in `/public/images/` (`logo.svg`, `favicon.svg`)
- [x] Configure Vite multi-page rollup inputs for `index.html`, `/site/dashboard/index.html`, and `/site/concepts/index.html` for Render static hosting
- [x] Multi-language linting (HTML, CSS, JS) with 0 vulnerabilities
- [x] Full Vitest test suite covering calculators and Page Objects
- [x] Require local HTML/CSS source validation across all build pages for dev, preview and prod; external W3C validation against the public production site is opt-in (-w3c, -w3c-HTML, -w3c-CSS)
- [x] Require Chrome Lighthouse-style testing (Performance, Accessibility, Best Practices, SEO across all pages) for dev, preview and prod before any commit/push, plus live verification after a production push
- [x] Require Chrome CSS Overview testing (typography, colors, media queries, selector utilization across all pages) for dev, preview and prod
- [x] Require Chrome Memory & DOM leak detection (heap allocations, DOM node counts, GC delta analysis across all pages) for dev, preview and prod; reject skip-tests and individual-suite deployment flags
- [x] Flip deploy autoformat to enabled by default with `-NoAutoFormat` / `--no-auto-format` override flags
- [x] Add `-NoLaunch` / `--no-launch` flag to deploy scripts; launch Chrome by default across `-dev`, `-preview`, and `-prod`
- [x] Project semantic versioning scripts (`scripts/version.ps1`, `scripts/version.sh`, `scripts/version.js`) with automatic commit message version tagging and version bump switches
- [x] Project scripts (`scripts/clear-chrome-storage.ps1`, `scripts/clear-chrome-storage.sh`, `scripts/clear-chrome-storage.js`) to clear Chrome local and session storage
- [x] Deploy scripts run local servers (`npm run dev`, `npm run preview`) directly in terminal foreground; background monitor polls for HTTP 200 before reforking Chrome and exiting cleanly
- [x] Break site header, footer, and sidebar into reusable partial templates (`site/partials/`) and loader modules (`src/js/modules/partials/`)
- [x] Break stylesheets into mobile-first hierarchy: `core.css`, `mobile.css`, `tablet.css`, `laptop.css`, `desktop.css`
- [x] Add `bigscreen.css` for 4K / TV displays without upper limit
- [x] Eliminate file duplication between `/src` and `/public` (static assets consolidated in `/public`)
- [x] Main home `index.html` configured as clean client redirect to `/site/dashboard/` with external JS module and no inline styles
- [x] Refactor all remaining style info out of JS/HTML into CSS classes so all style info is in CSS, HTML uses templates/partials, and JS is in external script modules
- [x] Note: W3C tests can only be fixed by production pushes and are only useful in production. W3C tests may require human input for authentication (anti-bot checks), which must be addressed from time to time.
- [x] Ensure no extraneous backward-compatibility files exist. This should be the definitive, single location from which to call the files; this is still the base version, so there is no reversion at this point.

- [x] Navigation partial (`site/partials/nav.html`, `src/js/modules/partials/nav.js`) loaded like the header/footer/sidebar; mounts in the header's `#nav-slot` (hidden by default until the site uses it)
- [x] Fedora local Wurm helper and status page detect the installed server/client, report process state, and launch either through Steam; validated on the Fedora laptop.
- [x] Read-only explorer discovers Adventure/Creative SQLite worlds and browses their tables. Local schemas expose player identity/power/kingdom/inventory references, separate skill records, and item coordinates; player coordinates are not in `PLAYERS`.
- [x] Verified local SQLite persistence with a repeatable test that creates a database file, writes a row, reopens it, and reads the row back without modifying game databases.

## Completed Map and Helper Work

- [x] Live character positions are in the `POSITION` table of `wurmplayers.db` (keyed by `WURMID`, with `POSX/POSY/POSZ/LAYER/ZONEID`); `listPlayers` joins it.
- [x] `.map` layers decoded in `scripts/wurm-map.js`: 1024-byte header plus 2048x2048 4-byte records `[type, data, heightHi, heightLo]`; height is a big-endian int16 in decimetres (verified against item Z, median error 0.05 m). `flags.map` keeps its flag bits in the last byte; `resources.map` stores cave-resource and world-resource IDs in its high/low 16-bit words (`0xFFFF` means none; ID names/quantities remain unknown). `protectedTiles.bmap` is a Java-serialized `boolean[2048][2048]` (empty in the sample world; axis order is `[x][y]`, verified from the server jar). Tile type ids are named from the server jar (`scripts/wurm-tiles.json`, e.g. 2 = Grass), and `readAltitudes` returns surface, rock, cave floor, soil depth and water depth in metres (sea level 0; sample world spans -60.9 m to 370.7 m).
- [x] Joined skill/inventory views added (`/db/<world>/wurmplayers.db/skills/<wurmId>`, `/db/<world>/wurmitems.db/inventory/<inventoryId>`); verified `SKILLS.OWNER = PLAYERS.WURMID` and `ITEMS.PARENTID = PLAYERS.INVENTORYID`. Skill `NUMBER` is returned as an id (names live in the server jar).

- [x] Added a separate local SQLite map-baseline database; the game SQLite databases and binary map files are read-only.

- [x] World Map Explorer: select a positioned character, capture all five map layers in a radius of up to 1,000 tiles (clipped at map edges), and switch the display between surface, rock, cave, resources, and flags. Inspect four corner altitudes, cave floor/ceiling, resource IDs and flags. Tile and layer models provide the object-oriented view; the exact five binary map layers are stored compactly per snapshot in the separate local SQLite baseline. Verified a full 2,706,804-tile Adventure snapshot and read its raster and tile data back; a full-size centered baseline stores about 80 MB.
- [x] Map topography view: show water depth from navy to blue and baseline-relative surface elevation from green lowlands through earth tones to pale peaks; tile details retain exact altitude in metres.

- [x] Map baseline: whole-world or custom width/height capture; export/import/delete of the site's own baseline copy with all five layers (surface, rock, cave, resources, flags). Without a reachable helper, the map page works from a browser-only (IndexedDB) store fed by importing a baseline JSON file. Wurm server files are never modified.

- [x] Approved Render-to-local database access through a paired loopback helper. Status, read-only database, and Steam-launch routes require a per-browser token; pairing uses an expiring local CLI code; only exact app origins are allowed. Added opt-in Windows logon-task and Fedora systemd startup. Validated HTTPS Render-origin pairing, authentication, and private-network preflight in a browser; no database contents are uploaded.

## Map object loading (Fedora)

- `scripts/wurm-map.js` now exposes `loadTile(dir, x, y)` / `loadRegion(dir, x0, y0, w, h)` returning plain objects:
  surface/rock/cave layers (type name, tags, height in m, decoded data byte), resources (cave/world, null = empty) and flags (botanizable/foragable/gatherable + raw).
- Data byte: trees/bushes → foliage age + growth stage; grass → growth, grass type, flower; other tiles → `{raw}` or null.
  Lookup tables are generated from the server jar into `scripts/wurm-tile-data.json`; per-tile tags in `scripts/wurm-tiles.json`.
- Cave ceiling: the `map_cave` data byte is the ceiling height above the floor in dm (`CaveTile.decodeCeilingHeight`); `loadTile` exposes `cave.ceiling` in metres (null when 0). Sample: open cave floors read 2.7-3.3 m.
- Data byte on other tiles: Clay, Tar and Mycelium use the grass layout (observed 64/128/192 + low bits); all other terrain tiles are 0. Rock-layer "Rock" tiles carry raw 202/222 (meaning unknown, 137 tiles).
- Protected tiles: `Zones.isTileProtected(x, y)` reads `protectedTiles[x][y]`, so `isProtected(x, y)` is correct as is.

## Completed Data Discovery (Fedora)

- [x] Creatures: `/db/<world>/wurmcreatures.db/creatures?x=&y=&w=&h=` joins `CREATURES` and `POSITION` by tile region (tile = floor(pos / 4 m); `LAYER` 0 surface, -1 cave); names come from `TEMPLATENAME` (`TEMPLATEID` is -1 in the sample). Skills at `/db/<world>/wurmcreatures.db/skills/<wurmId>` (`SKILLS.OWNER` = creature `WURMID`; many creatures have none).
- [x] Ground items (`PARENTID = -10`) by tile region at `/db/<world>/wurmitems.db/ground`, named by `ITEMS.NAME`; `ITEMS` has no layer column, so cave vs surface is still to be resolved.
- [x] Structures: `/db/<world>/wurmzones.db/walls|fences|floors|buildtiles?x=&y=&w=&h=` use tile coordinates directly (no /4) and `LAYER` as floor level; verified 316 walls on layer 0.
- [x] `/db/<world>/wurmzones.db/villages` returns bounds in tiles (Twitter credential columns are never selected).

- [x] Determine which ores are available and where; decode this on the Fedora laptop with live data access.
  - Ores are the cave-layer wall tile types (iron, copper, gold, etc., plus slate, marble, rocksalt, sandstone). `scripts/wurm-ore.js` summarizes them per baseline (count, bounds, 32x32 density, quantity) and stores that in the baseline DB table `map_snapshot_ores`; it is filled on create/import and backfilled for older baselines, and removed on delete.
  - Helper route: `GET /map/snapshots/<id>/ores?type=<tileType>&limit=<n>` (summary, plus tile list when `type` is given).
  - Result for the "Creative" world: gold 2,775, silver 4,431, iron 56,508, copper 4,479, lead 4,488, zinc 4,569, tin 4,492, slate 859, marble 1,118, rocksalt 39,357, sandstone 62,435; no adamantine or glimmersteel.
  - Ore quantities are all 0xFFFF (not yet rolled; Wurm sets them when a tile is first mined), so quantity is reported as unrolled. Unconfirmed assumption.
  - Quality is a derived per-tile ceiling (see README); stored per ore (min/avg/max) and per tile, and shown on the Underground resources layer with the unrolled state. The x/y seed order is not independently verified.
  - Not done: a UI panel for ores, and ore queries in browser-only mode.

## Related Roadmaps and Completed Editing Work

- HERO System development tasks: [heroes-todo.md](heroes-todo.md)

- [x] Map edit interface and work report (helper mode); browser-only edits still open
