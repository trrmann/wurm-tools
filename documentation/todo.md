# Wurm Tools — Development Todo & Roadmap

## Completed Milestones

- [x] Migrate and refactor `/src/tools` to `/src/js/tools`
- [x] Add `/src/js/modules` folder for reusable modules (`toast.js`, `modal.js`, `navigation.js`)
- [x] Add `/src/js/modules/pages` folder for Page Objects (`BasePage.js`, `DashboardPage.js`, `ConceptsPage.js`)
- [x] Add `/site` folder with page folders for the site (`/site/dashboard/`, `/site/concepts/`)
- [x] Add `/src/styles/` for stylesheets (`style.css`) and brand assets in `/public/images/` (`logo.svg`, `favicon.svg`)
- [x] Configure Vite multi-page rollup inputs for `index.html`, `/site/dashboard/index.html`, and `/site/concepts/index.html` for Render static hosting
- [x] Multi-language linting (HTML, CSS, JS) with 0 vulnerabilities
- [x] Full Vitest test suite covering calculators and Page Objects
- [x] Verify W3C tests are performed against prod site after a new deploy all the time, not needed if no code is pushed to prod, unless an explicit switch is passed (-w3c, -w3c-HTML, -w3c-CSS), validating all page routes across the site
- [x] Verify Chrome Lighthouse automated testing suite (Performance, Accessibility, Best Practices, SEO across all pages; switch-driven for dev, automated for preview and prod)
- [x] Verify Chrome CSS Overview automated testing suite (typography, colors, media queries, selector utilization; switch-driven for dev, automated for preview and prod)
- [x] Verify Chrome Memory & DOM leak detection testing suite (heap allocations, DOM node counts, GC delta analysis; switch-driven for dev, automated for preview and prod)
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
- [x] note: w3c tests can only be fixed by production pushes and only of use in prod. w3c tests may require a human input to authentication(anti-bot tests) so need to address this as well from time to time.
- [x] ensure no extranious backwards compatibility files exist, this should be the definitive single point to call the files and this is still base version, so there is no reversion at this point.

- [x] Navigation partial (`site/partials/nav.html`, `src/js/modules/partials/nav.js`) loaded like the header/footer/sidebar; mounts in the header's `#nav-slot` (hidden by default until the site uses it)
- [x] Fedora local Wurm helper and status page detect the installed server/client, report process state, and launch either through Steam; validated on the Fedora laptop.
- [x] Read-only explorer discovers Adventure/Creative SQLite worlds and browses their tables. Local schemas expose player identity/power/kingdom/inventory references, separate skill records, and item coordinates; player coordinates are not in `PLAYERS`.
- [x] Verified local SQLite persistence with a repeatable test that creates a database file, writes a row, reopens it, and reads the row back without modifying game databases.

## Planned Items & Backlog

- [x] Live character positions are in the `POSITION` table of `wurmplayers.db` (keyed by `WURMID`, with `POSX/POSY/POSZ/LAYER/ZONEID`); `listPlayers` joins it.
- [x] `.map` layers decoded in `scripts/wurm-map.js`: 1024-byte header plus 2048x2048 4-byte records `[type, data, heightHi, heightLo]`; height is a big-endian int16 in decimetres (verified against item Z, median error 0.05 m). `flags.map` keeps its flag bits in the last byte; `resources.map` stores cave-resource and world-resource IDs in its high/low 16-bit words (`0xFFFF` means none; ID names/quantities remain unknown). `protectedTiles.bmap` is a Java-serialized `boolean[2048][2048]` (empty in the sample world; axis order is `[x][y]`, verified from the server jar). Tile type ids are named from the server jar (`scripts/wurm-tiles.json`, e.g. 2 = Grass), and `readAltitudes` returns surface, rock, cave floor, soil depth and water depth in metres (sea level 0; sample world spans -60.9 m to 370.7 m).
- [x] Joined skill/inventory views added (`/db/<world>/wurmplayers.db/skills/<wurmId>`, `/db/<world>/wurmitems.db/inventory/<inventoryId>`); verified `SKILLS.OWNER = PLAYERS.WURMID` and `ITEMS.PARENTID = PLAYERS.INVENTORYID`. Skill `NUMBER` is returned as an id (names live in the server jar).

- [x] Added a separate local SQLite map-baseline database; the game SQLite databases and binary map files are read-only.

- [x] World Map Explorer: select a positioned character, capture all five map layers in a radius of up to 1,000 tiles (clipped at map edges), and switch the display between surface, rock, cave, resources, and flags. Inspect four corner altitudes, cave floor/ceiling, resource IDs and flags. Tile and layer models provide the object-oriented view; the exact five binary map layers are stored compactly per snapshot in the separate local SQLite baseline. Verified a full 2,706,804-tile Adventure snapshot and read its raster and tile data back; a full-size centered baseline stores about 80 MB.

- [x] Approved Render-to-local database access through a paired loopback helper. Status, read-only database, and Steam-launch routes require a per-browser token; pairing uses an expiring local CLI code; only exact app origins are allowed. Added opt-in Windows logon-task and Fedora systemd startup. Validated HTTPS Render-origin pairing, authentication, and private-network preflight in a browser; no database contents are uploaded.

::::::do not proceed past this point without approval:::::

## Map object loading (Fedora)

- `scripts/wurm-map.js` now exposes `loadTile(dir, x, y)` / `loadRegion(dir, x0, y0, w, h)` returning plain objects:
  surface/rock/cave layers (type name, tags, height in m, decoded data byte), resources (cave/world, null = empty) and flags (botanizable/foragable/gatherable + raw).
- Data byte: trees/bushes → foliage age + growth stage; grass → growth, grass type, flower; other tiles → `{raw}` or null.
  Lookup tables are generated from the server jar into `scripts/wurm-tile-data.json`; per-tile tags in `scripts/wurm-tiles.json`.
- Cave ceiling: the `map_cave` data byte is the ceiling height above the floor in dm (`CaveTile.decodeCeilingHeight`); `loadTile` exposes `cave.ceiling` in metres (null when 0). Sample: open cave floors read 2.7-3.3 m.
- Data byte on other tiles: Clay, Tar and Mycelium use the grass layout (observed 64/128/192 + low bits); all other terrain tiles are 0. Rock-layer "Rock" tiles carry raw 202/222 (meaning unknown, 137 tiles).
- Protected tiles: `Zones.isTileProtected(x, y)` reads `protectedTiles[x][y]`, so `isProtected(x, y)` is correct as is.

## Undiscovered data (Fedora)

- [ ] Map: meaning of rock-layer "Rock" data bytes 202/222 (137 tiles); `resources.map` quantity vs type; field/crop tiles (type, age) and real protected tiles are untested because the sample world has none.
- [x] Creatures: `/db/<world>/wurmcreatures.db/creatures?x=&y=&w=&h=` joins `CREATURES` and `POSITION` by tile region (tile = floor(pos / 4 m); `LAYER` 0 surface, -1 cave); names come from `TEMPLATENAME` (`TEMPLATEID` is -1 in the sample). Skills at `/db/<world>/wurmcreatures.db/skills/<wurmId>` (`SKILLS.OWNER` = creature `WURMID`; many creatures have none).
- [x] Ground items (`PARENTID = -10`) by tile region at `/db/<world>/wurmitems.db/ground`, named by `ITEMS.NAME`; `ITEMS` has no layer column, so cave vs surface is still to be resolved.
- [ ] Items: remaining `ITEMS` detail, `ITEMDATA`, `SPELLEFFECTS`, `LOCKS`, `ITEMKEYS`, `COINS`; template id to name from the jar.
- [x] Structures: `/db/<world>/wurmzones.db/walls|fences|floors|buildtiles?x=&y=&w=&h=` use tile coordinates directly (no /4) and `LAYER` as floor level; verified 316 walls on layer 0.
- [ ] Structures (remaining): `WALLS`, `FENCES`, `FLOORS`, `BUILDTILES`, `DOORS`, `GATES`, `STRUCTURES`; verify floor-level/layer conventions against the map.
- [x] `/db/<world>/wurmzones.db/villages` returns bounds in tiles (Twitter credential columns are never selected).
- [ ] Villages and kingdoms (remaining): `VILLAGES` link to structures, `CITIZENS`, `GUARDS`, `KINGDOMS`, `HOTA_ITEMS`, `MINING`, `FOCUSZONES`.
- [ ] Deities, entities and economy: `DEITIES`, `ENTITIES`, `CONTROLLERS`, `LOCALSUPPLYDEMAND`, `TRADER`.
- [ ] Player extras: `ACHIEVEMENTS`, `TITLES`, `AFFINITIES`, `SKILLCHANCES`, `CALENDAR`, `SERVERPROPERTIES`.
- [ ] Id-to-name maps from the server jar for skills, item templates, creature templates and deities.
- [ ] Sensitive tables (accounts, IP history, email history, tickets): schema and counts only unless approved.
