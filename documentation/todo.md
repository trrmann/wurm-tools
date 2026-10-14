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
- [x] `.map` layers (top/rock/flags/resources/cave) are a 1024-byte header plus 2048x2048 little-endian uint32 tiles; low byte = tile type, bits 16-31 = signed height (/2560 m, verified against item Z). Reader: `scripts/wurm-map.js`. Other layers' bit meanings and `protectedTiles.bmap` are not decoded yet.
- [x] Joined skill/inventory views added (`/db/<world>/wurmplayers.db/skills/<wurmId>`, `/db/<world>/wurmitems.db/inventory/<inventoryId>`); verified `SKILLS.OWNER = PLAYERS.WURMID` and `ITEMS.PARENTID = PLAYERS.INVENTORYID`. Skill `NUMBER` is returned as an id (names live in the server jar).

- add a local sqllite db on the client laptop to track info for the page in the future. this will not be allowed to update the actual wurm db, that is to be read only.

::::::do not proceed past this point without approval:::::
