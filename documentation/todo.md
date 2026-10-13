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

## Planned Items & Backlog

- create a local wurm server status page - determine if there is a local server installed, if so, is it currently running. if possible create hooks to issue start commands to start it, and start the client to connect to it as a separate option.

- if there is a local server installed, determine what we can see in the local stored database data. i would like to see if we can see characters and thier locations and character status(gm status, skill list, inventory), and pull map data such as at a given location coordinate the corner elevations and tile contents (object and terrian) and border contents. potentially even mine info at a given location. potentially even search for ore tiles, or specific terrain tiles nearby. also poentialy search for other objects including mobs.

::::::do not proceed past this point without approval:::::
