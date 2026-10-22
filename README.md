# Wurm Tools

A fast, modern, and modular companion suite for **Wurm Online** and **Wurm Unlimited** players. Built with pure **HTML, CSS, JavaScript (ES Modules), Node.js, and Vite**, designed for high performance, zero external framework bloat, and instantaneous static hosting on **Render**.

![Wurm Tools Preview](public/images/favicon.svg)

---

## Features (Starter Suite)

- 🏰 **Deed & Upkeep Calculator**:
  - Interactive dimensions planner ($W \times H$ tiles + perimeter buffer).
  - Monthly and yearly upkeep breakdown into Gold, Silver, Copper, and Iron.
  - Spirit guard upkeep scaling and initial founding fees.
  - Deed bank runway estimator (predicts exact days/months of upkeep remaining).
  - Presets: Homestead (5x5), Farmstead (11x11), Village (21x21), Township (31x31), Fortress (51x51).

- ⏳ **Action & Prayer Timers**:
  - 20-minute Prayer cooldown timer (favor gain cycles).
  - 30-minute Meditation path cooldown timer.
  - 3-hour Path ability countdown timer.
  - Custom countdown timer with preset shortcuts.
  - Synthesized audio chime (Web Audio API — works fully offline, no external audio files required).
  - Desktop browser notifications with permission toggle.

- 🧭 **Coordinate Distance & Travel Estimator**:
  - Calculates Euclidean tile distance and real-world metrics (1 tile = 4 meters).
  - Calculates 16-point compass heading and degrees.
  - Travel time estimation across: Walking on foot, Running on road, Ridden horse, Fast mount, Cart/Wagon, and Sailing ship.
  - Local waypoint manager: Save, recall, and manage custom coordinates directly in `localStorage`.

- 📝 **Settlement & Player Notes**:
  - Track deed building projects, mining veins, crafting supplies, and training goals.
  - Filter by category with priority badges and completion checkboxes.
  - One-click JSON backup export.

- 📜 **Extensive Concept Roadmap**:
  - Full architectural design and feature matrix documented in [`CONCEPTS.md`](./CONCEPTS.md).

---

## Tech Stack

- **Runtime & Tooling**: Node.js, Vite
- **Frontend**: Vanilla JavaScript (ES Modules), Semantic HTML5, Modern CSS (CSS Grid, Flexbox, CSS Variables)
- **Persistence**: Browser `localStorage` (client-side, privacy-respecting, zero tracking)
- **Version Control**: Git & GitHub (`trrmann/wurm-tools`)
- **Hosting**: Render (Static Site)

---

## Project Structure & Architecture

```text
WurmTools/
├── index.html                     # Primary SPA entry point
├── site/                          # Site page folders for Vite & Render
│   └── concepts/index.html        # Comprehensive concepts & roadmap page
├── public/                        # Static assets served at root
│   └── images/                    # Static images (logo.svg, favicon.svg)
├── src/
│   ├── images/                    # Source brand and interface images
│   ├── styles/                    # Stylesheets (style.css with theme variables & layout)
│   └── js/
│       ├── main.js                # Application entry point & controller bootstrap
│       ├── modules/               # Reusable core modules (shell, template, toast, modal, navigation, partials, pages)
│       │                          #   shell.js assembles site/partials/* (sidebar, header+nav, footer, modal) for every page
│       │                          #   HTML lives in site/partials/*.html (?raw + template.js fill/getTemplate), not in JS
│       │   └── pages/             # Page Objects (BasePage, DashboardPage, ConceptsPage)
│       └── tools/                 # Modular tools (deed-calculator, action-timers, etc.)
│           └── registry.js        # Central catalog of active tool modules
├── scripts/                       # Cross-platform automated deployment scripts
├── tests/                         # Vitest unit test suite (calculators, page objects)
└── documentation/                 # Concepts, roadmap, Render notes, validation
```

---

## Quick Start (Local Development)

### 1. Prerequisites

Ensure you have Node.js (v18 or newer) installed:

```bash
node -v
npm -v
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The site will be available at `http://localhost:3000`.

### 4. Code Quality & Formatting

Linting and formatting cover all **HTML (`.html`)**, **CSS (`.css`)**, and **JavaScript (`.js`)** files across the project:

```bash
# Check formatting across all HTML, CSS, and JS files with Prettier
npm run format:check

# Auto-format all HTML, CSS, and JS files with Prettier
npm run format

# Run multi-language ESLint (validates HTML, CSS, and JS)
npm run lint

# Auto-fix lint issues across HTML, CSS, and JS
npm run lint:fix
```

### 5. Build for Production

```bash
npm run build
```

The compiled, optimized production files will be placed into the `dist/` directory.

### Standalone C# HERO Model (Future Blazor and Desktop Work)

**On hold as of 2026-10-22:** all C#, Blazor, desktop, and other non-web development is paused until the user explicitly resumes it. The boundaries below are retained for future reference, not authorization to implement them. Current development is limited to the JavaScript web tools.

The [HERO domain library](./src/misc/Heros.Domain.csproj) is a separate .NET 10 class library for future Blazor integration. It is **not connected to the current website**, Vite, the local helper, or deployment. No Blazor application, API endpoint, browser interop, or persistence integration is enabled.

With the .NET 10 SDK installed, run:

```powershell
dotnet build src\misc\Heros.Domain.csproj
dotnet run --project tests\Heros.Domain.Tests\Heros.Domain.Tests.csproj
```

The second command runs dependency-free C# regression checks and exits nonzero on failure; it is separate from the JavaScript/Vitest suite. The library explicitly includes the numeric/collection foundations, validation result, HERO value, characteristic, and talent classes. Other C# experiments under `src/misc` (including IAM, names, and pips) are outside this project's build scope; this is not a completed migration of the entire tree.

Characteristic constructors calculate from copied options before initialization. Named roll methods such as `StrengthRoll()` return integer **targets**, not outcomes; use `CheckRoll(diceTotal)` to evaluate supplied 3d6 totals against the effective target. `RollTarget` is unadjusted and `EffectiveRollTarget` includes transient adjustments. Intelligence provides separate base/effective perception checks. Numeric values preserve rational precision without private-field reflection. Construction is a calculation snapshot: changing dependencies or point properties later does not automatically recalculate the model.

Talent rules and other unfinished mechanics remain WIP; successful compilation and regression checks do not certify complete rulebook implementation. The website's JavaScript model remains independent.

#### Host-Neutral Blazor and Desktop Boundaries

The future desktop implementation remains **host-neutral**: no MAUI, WPF, WinForms, Electron, or other desktop framework has been selected. The current domain library needs no desktop-specific target framework or UI dependencies.

Available desktop test environments are **Windows and Fedora Linux with KDE**. No Mac is available for testing. Treat Fedora/KDE as an explicit desktop target when evaluating frameworks, including native integration, packaging, and any embedded web-view requirements; do not choose a Windows/macOS-only approach by default. macOS support remains unverified unless a suitable test environment becomes available. Record the actual OS, Fedora/KDE versions, and display session used when desktop testing begins rather than assuming distribution or Wayland/X11 compatibility.

Use these boundaries when that implementation begins:

| Layer                           | Responsibility                                                                                              | Dependency boundary                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Existing `Heros.Domain` library | Numeric values, elements, calculations, and domain validation                                               | No Razor, browser, desktop UI, filesystem, database, or host-service dependencies                        |
| Future shared application layer | Use cases and contracts for loading/saving worlds and objects, import/export, and other external operations | References the domain; defines host-neutral contracts as actual use cases require them                   |
| Future Razor Class Library      | Reusable Blazor components, sheet presentation, forms, and interaction state                                | Uses application contracts/domain data; does not access native APIs or assume a browser-only environment |
| Future Blazor host              | Web startup, dependency injection, navigation, and web-specific service adapters                            | Composes the shared application/UI layers; server versus browser execution remains undecided             |
| Future desktop host             | Window/application lifecycle, dependency injection, native dialogs, and desktop service adapters            | Composes the same shared layers; framework choice remains deferred                                       |

Keep file selection, storage paths, persistence, credential storage, networking, clipboard access, and other platform operations behind application contracts implemented by each host. Domain and shared UI code must not depend directly on browser `localStorage`, the current loopback helper, desktop window types, or operating-system paths. Pass imported/exported content through host-neutral data or streams; hosts handle file dialogs and storage locations. Define persistence/serialization DTOs explicitly rather than attempting to serialize calculation delegates and runtime object graphs.

Do not put environment-specific behavior into the model or add speculative interfaces before a concrete use case needs them. Keep domain checks runnable without a browser, desktop workload, or native window. When application contracts and Razor components exist, add shared tests and adapter-specific checks for both hosts. If desktop trimming or AOT is later selected, review the remaining reflection-based characteristic lookups and verify that publishing mode explicitly; current checks do not certify trimming/AOT support.

This is preparation only: no desktop executable, shared Razor project, native integration, or deployment is enabled. The existing website remains unchanged.

### 6. Preview Production Build

```bash
npm run preview
```

---

## Automated Deployment Scripts

Automated deployment scripts with safe stops are located in [`scripts/`](./scripts) for both **PowerShell (Windows)** and **Bash (Fedora / Linux)**.

### Automatic PATH Integration in VS Code

The workspace is configured in `.vscode/settings.json` so the `scripts/` folder is automatically prepended to the system `PATH` in all integrated terminals:

- **Windows (PowerShell / Command Prompt)**: `${workspaceFolder}\scripts`
- **Linux (Fedora / Ubuntu Bash)**: `${workspaceFolder}/scripts`

This means inside any new VS Code terminal, you can directly run:

```bash
# In Bash (Fedora / Linux):
deploy -dev                               # Build/verify for Development
deploy -preview                           # Build/verify for Preview
deploy -prod -m "feat: release new tools" # Deploy to Production (message required if uncommitted changes exist)

# In PowerShell / Windows Terminal:
deploy -dev                               # Build/verify for Development
deploy -preview                           # Build/verify for Preview
deploy -prod -m "feat: release new tools" # Deploy to Production (message required if uncommitted changes exist)
```

### Environment Target Switches `{-dev; -preview; -prod;}`

The deployment scripts enforce **mutually exclusive environment switches** (exactly one target switch is permitted per run):

| Target Switch | Environment | Scope  | Vite Build Mode | GitHub Push Behavior                                                                               | Live Browser Behavior                                                                                                 |
| :------------ | :---------- | :----- | :-------------- | :------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| `-dev`        | Development | Local  | `development`   | **Never pushed** (local verification matching `npm run dev`)                                       | Stays local; prints tip to run `npm run dev`                                                                          |
| `-preview`    | Preview     | Local  | `preview`       | **Never pushed** (local verification matching `npm run preview`)                                   | Stays local; prints tip to run `npm run preview`                                                                      |
| `-prod`       | Production  | Remote | `production`    | Pushes to `origin main` **only if commits are ahead**. If nothing to push, push is safely skipped. | Automatically opens `https://wurm-tools.onrender.com` in **Google Chrome** (pass `-NoOpen` / `--no-open` to suppress) |

### Deployment Pipeline Steps & Safe Stops

Both scripts run the exact same verification pipeline and **safely halt immediately** if any step encounters an error or fails validation:

1. **Environment Target Validation**: Enforces that exactly one switch (`-dev`, `-preview`, or `-prod`) is supplied. Aborts safely if none or multiple are specified.
2. **Dependency Verification**: Ensures `node_modules` are installed.
3. **Prettier Code Formatting**: Runs `npm run format:check` (auto-fixed by default; skip with `--no-auto-format` / `-NoAutoFormat`).
4. **ESLint Quality Check**: Runs `npm run lint`.
5. **Vitest Unit Test Suite**: Runs `npm test` (or optional `--skip-tests` / `-SkipTests`).
6. **Vite Target Build**: Builds the application for the targeted mode (`development`, `preview`, or `production`).
7. **Git Status & Commit Guard**: Checks repository state. For `-prod`, strictly requires a non-empty string message argument (`-m` / `-CommitMessage`) if uncommitted changes exist, stages files, and commits with co-authorship.
8. **Intelligent Push to GitHub**:
   - For `-dev` and `-preview`: Local only, push is completely skipped.
   - For `-prod`: Fetches remote tracking refs. If there are new commits ahead of `origin/main`, pushes to `origin main` triggering Render static site deployment. If the repository is clean and already up to date, pushing is skipped with an informational notice.
9. **Live Site Launch in Google Chrome (Production)**: For `-prod`, automatically opens `https://wurm-tools.onrender.com` in Google Chrome (with system browser fallback).
10. **Summary & Live Monitoring**: Reports target environment status, GitHub Actions CI status, Render live site link, and W3C validation URLs.

---

## Local Server Status Helper

The **Server** page (`/site/server-status/`) shows whether a local Wurm Unlimited dedicated server and client are installed and running, and can start them. Browsers can't inspect local processes, so it talks to a small localhost-only helper:

```bash
npm run dev           # starts Vite and automatically starts/reuses the helper
npm run preview       # starts Vite preview and automatically starts/reuses the helper
npm run helper        # optional: start/reuse the helper without starting the site
npm run helper:pair-code # print a one-time code to pair a browser
npm run helper:unpair  # revoke all paired browsers
npm run helper:stop  # removes its semaphore and waits for graceful shutdown
npm run helper:startup:install # opt into starting the helper at Windows/Fedora logon
npm run helper:startup:remove  # remove the logon startup task/service
```

The background helper is kept alive by `.wurm-helper.semaphore` in the project root. Deleting
that file (or running `npm run helper:stop`) asks it to stop accepting requests and close active
connections. Both Windows and Fedora `deploy -dev` / `deploy -preview` flows use these npm
commands, so no separate helper setup is required. If a browser asks for local network access,
allow it for the Render site.

- **Local site ports:** development uses `http://localhost:3000` and preview uses
  `http://localhost:4173` (their `127.0.0.1` equivalents are also allowed). Both commands fail if
  their port is occupied instead of silently switching to an origin the helper rejects. If
  preview reports that 4173 is in use, reuse the existing preview or stop it in its own terminal
  before restarting. A page at `http://localhost:4174` cannot pair with the default helper.
- **HERO Worlds pairing:** the HERO Worlds page also stores data through this local helper. In a
  cloned Wurm Tools project, run `npm install` once to install the project dependencies, including
  the bundled `sql.js` SQLite module. There is no separate SQLite server or PIN. Start `npm run dev`
  (which starts/reuses the helper), then run `npm run helper:pair-code` in another terminal opened
  in the project folder and enter the displayed 8-digit code in the HERO Worlds page. The code
  expires after 10 minutes. A static site deployed to Render cannot reach the local database unless
  the user has the project and local helper installed and running on their own computer.
- **HERO reusable definitions:** `/site/heroes/library/` provides a standalone anatomy builder and shared
  local library for saved parts, shapes, and world-object templates. Save custom/compound anatomy
  there before using it in an object. Choose independent copy or live reference when inserting a
  saved definition; deleting a definition converts its saved uses to copies. Library/world/object
  JSON exports contain portable copies. After updating helper code, restart it with
  `npm run helper:stop` followed by `npm run helper` (or restart via `npm run dev` /
  `npm run preview`) to enable the library routes without changing existing HERO data.
- **Heros Tools management:** HERO pages now use their own Heros Tools title, shield, navigation,
  and cyan theme; Wurm pages retain Wurm branding. Open `/site/heroes/people/` for local Game Master
  profiles and `/site/heroes/people/players/` for Players. A profile can have either or both roles. Use **Open workspace** to view a
  profile's worlds/characters; the profile ID in the URL preserves that workspace across reloads.
  The upper menu switches between Worlds & objects and Game Masters & players. Each has a distinct
  sidebar, not a duplicate of the upper menu. The world sidebar opens dedicated Worlds, Genres,
  Campaigns, Objects, Non-player characters, Player characters, Character assignments, and Shared
  definition library pages. Objects contains every model-defined kind other than explicit PC/NPC
  kinds (including generic Characters); no data is reclassified or migrated. World rows open the
  correct object editor. The people sidebar opens Game Masters, Players, Admins, and GM notes.
  Selected world/profile context follows sidebar and upper-menu links and survives reload.
  Create worlds and configure ownership/subscriptions/genres on Worlds; use Character assignments
  for player/campaign links. Unconfigured worlds also appear in the all-records Worlds list.
  External GMs/players can be named without creating profiles, and characters may remain unowned.
- **Local profiles are not accounts:** the existing helper pairing protects every management
  endpoint, but anyone paired with that helper can read/change all profiles and notes. Profile
  selection is neither authentication nor administrator impersonation. Do not store passwords or
  confidential notes. Account registration, sign-in, server-enforced role permissions, lockout,
  and private GM notes are deferred. The Admins page explicitly documents this boundary; it does
  not create fake administrator roles or ACL controls. Sidebar/profile filtering is not authorization.
  No C# is exposed to or executed by the website.
- **Campaign backups:** export all management data, a profile collection, or individual
  world/campaign/genre collections from the corresponding management pages. Object editor lists export
  individual objects. JSON imports accept these collections plus existing world/object exports;
  select a destination world when importing an individual object. Imports validate the whole
  collection before persistence and create independent copies with new IDs, never overwrite/merge
  existing records. Collections include required profile/world/campaign dependencies and GM notes
  as readable JSON. A player collection includes that player's characters, not other characters
  merely sharing their worlds; a GM collection includes all objects in the GM's owned worlds.
  A genre includes worlds tagged with that genre and characters assigned to matching campaigns.
  Genre labels are organizational metadata, not implemented genre rules. Exports flatten library
  references; back up the standalone reusable-definition library separately if its original entries
  are also needed. Limits are 1,000 records, worlds, and objects per collection and 64 MB per import.
  Data lives in the same local `heroes.db`, not a hosted account database. Restart the helper once
  after updating (`npm run helper:stop`, then `npm run helper`) to enable `/heroes/management`.
  Existing world/object export formats remain definition-only backups; use management collections
  to preserve ownership, campaigns, subscriptions, and notes.
- `GET /status` and `POST /start/server|client` (JSON). Starting uses Steam (`steam://rungameid/402370` server, `366220` client).
- Installs are found in Steam libraries, or set `WURM_SERVER_DIR` / `WURM_CLIENT_DIR`.
- `WURM_HELPER_PORT` changes the port; CORS allows `localhost:3000`/`4173` plus `WURM_ALLOWED_ORIGINS` (comma-separated).
- Local-use only: the deployed Render site generally cannot reach your localhost helper.
- On Fedora, `scripts/setup.sh` reports whether a Wurm install is detected; add `--helper-service` to install and start a systemd user service (`wurm-helper`) for the helper.
- The Database Explorer reads the server's SQLite databases read-only (via `sql.js`) through `/db/...` endpoints. On the Fedora laptop, both Adventure and Creative worlds are detected. Player identity/power/kingdom, skill records, and item coordinates are available in separate tables, with live positions in the `POSITION` table (joined into the players view). Skill and inventory views join by `OWNER`/`PARENTID`.
- **World Map Explorer** lists positioned characters, captures all five map layers for the entire world or a custom width × height around a selected character, and lets you display the surface, rock, cave, resources, or flags layer. Selecting a tile shows terrain, surface/rock corner altitudes, cave floor/ceiling, resource IDs and flags. Each baseline stores the original five 4-byte map layers (20 bytes per tile; the whole Adventure world is about 54 MB). Baselines can be exported to a re-importable JSON file, imported, or deleted (one or all for a world); these actions touch only this local file in a separate local SQLite file: `~/.local/share/wurm-tools/map-baseline.db` on Fedora/Linux, `%LOCALAPPDATA%\wurm-tools\map-baseline.db` on Windows, or `~/Library/Application Support/wurm-tools/map-baseline.db` on macOS. Set `WURM_MAP_BASELINE_PATH` to choose another file. Game database and map files are only read. Ore availability and locations are decoded from the cave layer into the baseline (`GET /map/snapshots/<id>/ores`); quantities read as unrolled until a tile is first mined. The Underground resources layer colors each ore type, lists per-ore counts, unrolled/rolled state, quantity and a derived quality ceiling, and shows ore, quantity and quality for the selected tile. Quality is the server's per-tile ceiling (`20 + Random((x + y*worldSize)*789221).nextInt(80)`, derived from the decompiled server); actual mined quality also depends on the miner's skill and tool, and it needs the world size (known for whole-world or newly captured baselines).
- The map helper endpoints are local-use only, like the other `/db/...` endpoints; the deployed Render site generally cannot reach the user's localhost helper.
- On first use from Render, run `npm run helper:pair-code` locally and enter the 8-digit, 10-minute code in the Server page. Each browser gets its own bearer token; `/status`, `/db/...`, and `/start/...` require pairing. `npm run helper:unpair` revokes all browser tokens. Use `npm run helper:startup:remove` to stop a login-managed helper.
- Database routes remain read-only, and database contents are never uploaded. The helper binds only to `127.0.0.1`; auth hashes are stored under the current user's config directory, while browser tokens stay in that browser's local storage.
- CORS allows the exact Render origin and local `localhost`/`127.0.0.1` dev/preview origins. `WURM_ALLOWED_ORIGINS` adds exact origins only; wildcard origins are ignored. `WURM_HELPER_PORT` changes the port.
- Login startup is opt-in: `npm run helper:startup:install` registers a Windows logon task or Fedora/Linux systemd user service; `npm run helper:startup:remove` removes it. Fedora setup also accepts `scripts/setup.sh --helper-service`.
- The Database Explorer reads the server's SQLite databases read-only (via `sql.js`) through `/db/...` endpoints. On the Fedora laptop, both Adventure and Creative worlds are detected. Player identity/power/kingdom, skill records, and item coordinates are available in separate tables, with live positions in the `POSITION` table (joined into the players view). Skill and inventory views join by `OWNER`/`PARENTID`. Terrain type/height, flags, and protected tiles can be read with `scripts/wurm-map.js`; tile type names and altitudes (surface, rock, cave floor) are included; resource records are not decoded yet.
- `npm test -- tests/wurm-db.test.js` includes a local SQLite write/export/reopen/read-back test; it uses a temporary fixture and never writes to the game's databases.

## Deploying to Render

This repository is pre-configured for **Render Static Sites** via [`render.yaml`](./render.yaml) and manual deployment.

### Method 1: Render Blueprint (Zero-Config)

1. Push this repository to GitHub:
   ```bash
   git push -u origin main
   ```
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** > **Blueprint**.
3. Select your `wurm-tools` GitHub repository.
4. Render will automatically detect [`render.yaml`](./render.yaml), build with `npm install && npm run build`, and publish `dist/`.

### Method 2: Manual Static Site on Render

1. Go to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **Static Site**.
3. Connect your GitHub repository (`wurm-tools`).
4. Configure the build parameters:
   - **Name**: `wurm-tools`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
5. Click **Create Static Site**.
6. Render will automatically build and publish your site with a free SSL certificate on `https://wurm-tools.onrender.com` (or your custom domain).

---

## Project Structure

```text
WurmTools/
├── .github/
│   └── workflows/ci.yml     # Automated CI (Prettier, ESLint, Vitest, Build)
├── .vscode/
│   └── settings.json        # Integrated terminal PATH configuration
├── documentation/
│   ├── CONCEPTS.md          # Comprehensive concept roadmap for future tools
│   ├── render.md            # Render deployment dashboard links
│   └── validation.md        # W3C HTML & CSS live validation links
├── scripts/
│   ├── deploy.ps1           # Deployment automation for Windows PowerShell
│   ├── deploy.sh            # Deployment automation for Bash (Fedora / Linux)
│   ├── deploy.cmd           # Windows Command Prompt / terminal wrapper
│   └── deploy               # Linux executable wrapper
├── tests/
│   └── calculators.test.js  # Vitest unit test suite
├── index.html               # Main application HTML entry point
├── package.json             # NPM project manifest & scripts
├── render.yaml              # Render Blueprint deployment configuration
├── vite.config.js           # Vite build configuration
├── public/
│   └── images/favicon.svg   # Application vector icon (see Favicon location)
└── src/
    ├── main.js              # Application router, toast, search & modal logic
    ├── style.css            # Dark fantasy responsive styling & components
    └── tools/
        ├── registry.js      # Central registry discovering all active tools
        ├── deed-calculator/ # Deed cost, upkeep & runway calculator
        ├── action-timers/   # Audio/visual prayer & action timers
        ├── distance-calc/   # Coordinate distance & travel estimator
        └── player-notes/    # Player project log & persistent notebook
```

---

## How to Add New Tools

The architecture is built for easy expansion:

1. Create a folder in `src/tools/<your-tool-name>/`.
2. Add an `index.js` exporting:
   - `toolMetadata`: `{ id, name, category, icon, description }`
   - `mount(container)`: DOM rendering and event listeners.
   - `unmount()`: Cleanup function.
3. Import and add your tool to `TOOLS_LIST` in `src/tools/registry.js`.
4. Your tool is immediately integrated into the sidebar navigation and search bar!

---

## License

MIT License. Designed with passion for the Wurm Online and Wurm Unlimited community.

## Favicon location

The favicon lives at `public/images/favicon.svg` (served at `/images/favicon.svg`) and every page references it with `<link rel="icon" href="/images/favicon.svg">`. It does not need to be in the site root: Google's guidelines state the `href` can be any relative or absolute URL (https://developers.google.com/search/docs/appearance/favicon-in-search), and the HTML Standard defines `rel=icon` as an explicit link (https://html.spec.whatwg.org/#rel-icon). The root `/favicon.ico` fallback only applies to pages without a link tag.

## Map edit working copy and work report

The map explorer's **Edit working copy** panel (needs the local helper) edits any of the five layers per tile or with a brush up to 19×19. Edits are stored separately in the local baseline DB (`map_edits`); the baseline is never changed. **Work report** diffs the edits against the baseline (counts by layer and tile-type change) and can be downloaded as JSON or CSV. Discard edits per layer or entirely. Edits in browser-only mode (no helper) are not supported yet.

### Pile-based terraforming

The edit panel shows each tile's corner elevations and edge slopes. Edit heights in piles (raise +, dig −). The work report totals piles per material (dirt, sand, clay, peat, tar, rock shards). Pile sizes are editable under "Pile sizes" and saved in the browser; every material defaults to 1 dm per pile, which is an assumption, so set the real values (clay differs from dirt). The material comes from the tile's top surface type only, so mixed layers such as clay under dirt are not split. Cave piles are approximate. Edits need the helper; browser-only edits are not supported yet.
