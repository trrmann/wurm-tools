# Wurm Tools

A fast, modern, and modular companion suite for **Wurm Online** and **Wurm Unlimited** players. Built with pure **HTML, CSS, JavaScript (ES Modules), Node.js, and Vite**, designed for high performance, zero external framework bloat, and instantaneous static hosting on **Render**.

![Wurm Tools Preview](public/images/favicon.svg)

## Site entry and branding

The main URL `/` is the **Heros Tools login-only page**, without a dashboard, tool navigation,
or Wurm branding. Registration and first-time setup links are available immediately, even
when the local helper is offline.
When the helper reports that setup is incomplete, the registration link becomes
**Register first administrator** and opens setup instead of visitor registration.
The existing Wurm dashboard lives at `/site/wurm/`; authorized accounts reach it through
**Wurm Tools** in the Heros menu. Wurm pages keep their own Wurm titles and branding, and still
require system-administrator access or explicit Wurm delegation. Local Wurm APIs also require
browser pairing.

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
├── index.html                     # Heros login-only entry point
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

Use the current [Node.js LTS installer](https://nodejs.org/en/download) (Node.js 22 or
newer), which includes npm. On Windows, keep npm and Add to PATH selected during installation.
Close and reopen terminals/VS Code after installation, then verify:

```bash
node -v
npm -v
```

If either command is not found, repair/reinstall the official Node.js installer with npm and PATH
enabled, then reopen your terminal. On a managed device, ask your system administrator if installs
are blocked. If PowerShell blocks `npm.ps1`, use `npm.cmd` in place of `npm` below; do not weaken
your execution policy.

If you do not have the local JavaScript project, [download the project source ZIP](https://github.com/trrmann/wurm-tools/archive/refs/heads/main.zip)
and fully extract it (Windows: **Extract All**). Open a terminal in the extracted `wurm-tools-main`
folder containing `package.json` and `scripts/wurm-local.js`, not inside the ZIP or the `scripts`
subfolder. A saved page or downloaded static website build is not the local helper. Git users can
update an existing clone instead. Keep this project folder to run/update the helper later.

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
5. **Vitest Unit Test Suite**: Runs `npm test`; skipping tests is not permitted.
6. **Vite Target Build**: Builds the application for the targeted mode (`development`, `preview`, or `production`).
7. **Local HTML/CSS Validation**: Runs `npm run test:standards` on every HTML build entry and project stylesheets using the existing HTML/CSS ESLint rules. This is local source validation, not the external W3C Nu/Jigsaw service or a W3C conformance certification.
8. **All-Page Chrome Gate (Preview and Production)**: Runs **all** Lighthouse-style, CSS Overview, and Memory/leak suites on every dynamically discovered page against a local preview of the just-built target, **before any commit or push**. Development does not run Chrome audits. A production push additionally runs all three suites against the live Render site after the deployment wait.
9. **Git Status & Commit Guard**: Checks repository state. For `-prod`, strictly requires a non-empty string message argument (`-m` / `-CommitMessage`) if uncommitted changes exist, stages files, and commits with co-authorship.
10. **Intelligent Push to GitHub**:

- For `-dev` and `-preview`: Local only, push is completely skipped.
- For `-prod`: Fetches remote tracking refs. If there are new commits ahead of `origin/main`, pushes to `origin main` triggering Render static site deployment. If the repository is clean and already up to date, pushing is skipped with an informational notice.

11. **Post-Deployment W3C and Chrome Validation (Production)**: After a production push and the Render deployment wait, automatically runs full W3C HTML/CSS validation across all live pages, then all live Chrome suites. A failure stops the workflow and prevents a success report; it cannot undo the already-pushed deployment.
12. **Live Site Launch in Google Chrome (Production)**: For `-prod`, automatically opens `https://wurm-tools.onrender.com` in Google Chrome (with system browser fallback).
13. **Summary & Live Monitoring**: Reports target environment status, Chrome/W3C test status, GitHub Actions CI status, Render live site link, and W3C validation URLs.

Every deployment target requires unit tests, formatting, lint, build, and local HTML/CSS
checks. Preview and production additionally require all-page Chrome audits; development
does not. `--skip-tests` / `-SkipTests` and
individual Chrome-suite deployment flags are rejected; use standalone `npm run test:lighthouse`,
`npm run test:css-overview`, or `npm run test:memory` for focused troubleshooting.
`-Chrome` / `--chrome` remains accepted but is redundant. `--no-push` does not skip local
verification (it does not audit an unchanged live production site).
External W3C HTML/CSS validation is **automatic after a production push and deployment wait**.
It does not run for development, preview, no-push, or up-to-date production runs.
`-w3c`, `-w3c-HTML`, and `-w3c-CSS` remain compatibility flags but cannot narrow the
mandatory full suite or cause external validation for a local/no-deployment run.
Use standalone `npm run test:w3c:html` or `npm run test:w3c:css` for focused live checks.
External services cannot access localhost and are not used by local validation.

Chrome's Lighthouse-style, CSS Overview and Memory suites, and W3C validation all
discover their page list from Vite's HTML build entries. There is no separate three-page list
to maintain: adding a build entry automatically adds it to every audit, including HERO builders,
Wurm and Map Explorer. Partials and assets are not standalone pages. Chrome checks each
requested page's HTTP response before auditing and fails on missing/error responses.
Each audit uses a disposable, isolated Chrome profile and waits for the main document and
its network requests/redirects to settle. It never attaches to an existing browser or reuses
account sessions. Protected routes therefore test signed-out access/login flows, not the
protected editor's signed-in behavior.

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
- **HERO accounts:** HERO pages store data through this local helper. In a
  cloned Wurm Tools project, run `npm install` once to install the project dependencies, including
  the bundled `sql.js` SQLite module. There is no separate SQLite server or PIN. Start `npm run dev`
  (which starts/reuses the helper). HERO now requires a separate account login, not Wurm pairing.
  A static site deployed to Render cannot reach the local database unless
  the user has the project and local helper installed and running on their own computer.
- **HERO object and character editing:** The Objects, Non-player characters, and Player characters
  pages have category-specific Create/Save/Update actions and a searchable saved collection.
  Search matches names and model type labels without changing the selected world or deleting data;
  the count shows matching entries and an empty-search message explains how to recover the list.
  Saving clears the search so a new or renamed entry stays visible.
  Start with name and type, then use **Edit sheet** or **Save controls** to jump through long forms.
  Saved-definition reuse and manual point equations are expandable optional tools.
  Scope guidance distinguishes global creation from creation in a selected world and warns that
  editing a shared definition affects every use. Existing sheet ordering, inherited elements,
  point rules, backups, and server-side permissions are unchanged.
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
  Campaigns, Objects, Non-player characters, Player characters, Character assignments, Object availability, and Shared
  definition library pages. Objects contains every model-defined kind other than explicit PC/NPC
  kinds (including generic Characters); no data is reclassified or migrated. World rows open the
  correct object editor. The people sidebar opens Game Masters, Players, Admins, and GM notes.
  Selected world/profile context follows sidebar and upper-menu links and survives reload.
  Create Genres, create Campaigns with a parent genre, then configure each World's parent campaign,
  ownership, and subscriptions. Character assignments inherit campaign/genre through their selected
  world context; they do not choose an independent campaign. Unconfigured worlds appear in the all-records Worlds list.
  External GMs/players can be named without creating profiles, and characters may remain unowned.
- **Separate collections and builders:** Player characters, Non-player characters and Objects
  open saved-entry lists with a Create button. Creating, editing or viewing an entry opens its
  category's separate `/build/` page; **Back to saved entries** returns to the collection.
  World/profile context follows these links. Saved builder URLs retain the object ID so reload
  reopens the entry. PC and NPC types are locked; Objects allows all other model-defined kinds.
  The same sheet, anatomy, point, import/export and permission capabilities remain in place.
- **Registered participant names:** builders select Game Master and Player accounts from the
  permitted account directory, not free text or organizational profiles. PCs require a Player
  and may leave GM unassigned. NPCs may leave GM unassigned and have no Player assignment.
  Other objects require a GM; Player is optional. These are descriptive account associations,
  not ownership transfers, subscriptions or access grants. Selections persist in the definition's
  `participants` field. Legacy definitions without that field remain supported and may be edited
  without inventing missing assignments. Existing unavailable selections are retained; changing
  an assignment requires a discoverable registered account with the matching assigned role.
- **Shared object availability:** `/site/heroes/object-availability/` links the same saved object to
  multiple genres, campaigns, and worlds, or marks it global. Genre/campaign availability includes
  descendant worlds. These links share one definition: editing changes every use, not copies.
  Select **All scopes (new objects are global)** in an object editor to create/import objects
  without a world, or select a world to create a world-only object. Configure availability to move
  a world-only object into shared storage and select its scopes. Empty scopes mean unassigned, not
  global; all stored objects remain accessible in All scopes. World deletion removes world-only
  objects and world-context assignments/notes, but retains shared objects and parent campaigns/genres.
  Removing an object's last world link leaves it unassigned. Deleting an object removes all its uses.
  References required by assignments/notes cannot be removed without clearing those records first.
- **Hierarchy migration:** after backing up `heroes.db`, restart the helper to apply
  Genre → Campaign → World. Unique old world/campaign links are reversed automatically on first
  database access. Worlds with multiple old campaigns remain unassigned and show migration notes
  listing the candidates; choose the correct campaign on Worlds. Old campaigns without a genre
  are flagged for a parent-genre selection on Campaigns. All campaigns, worlds, objects, profiles,
  notes, and previous world-genre labels are retained. Migration is persisted atomically and is not
  repeated on reload. Existing character campaign links become historical notes; campaign membership
  now comes from the character's world.
- **Registration, login, and logout:** public signup at `/site/heroes/register/` creates a local
  Visitor account only. `/site/heroes/login/` authenticates it; `/site/heroes/account/` is **Profile**:
  password changes first, an explicitly unavailable email-verification placeholder, collapsed
  name/authenticator controls, and account closure last. No email is collected or verification
  claimed. Social-service failures appear separately and do not prevent Profile maintenance.
  `/site/heroes/logout/` invalidates the server session
  before navigating to `/site/heroes/logout-success/`; a failed request never reports success.
  These accounts belong to this computer's helper, **not** a site-wide central service.
  Workspace profiles remain organizational records, not authenticated identities or impersonation.
  Administrators can link them to confirmed accounts or mark no-login organizational entries;
  portable management exports/imports exclude those identity links.
- **Selected role and notes:** the header selects one of the account's assigned roles. That
  server-side session role, not the union of assigned roles, governs navigation and actions.
  Active Admin shows administrator tools, directories, notes and content stewardship, not
  GM/Player content editors. Switch to an assigned GM/Player role to use those editors;
  direct editor URLs and game-content mutations are also denied while Admin is active.
  Visitors are read-only even with an old write grant. GM, Player and Admin notes require their
  matching active role and cannot be published; administrator full-store backups remain a
  privileged maintenance exception. The signed-in name appears once, under the Heros brand.
  A sun/moon icon switches to the opposite appearance, with a target-mode tooltip and accessible
  label. Light/dark mode is retained per account and cached locally for synchronous initialization
  before styles/modules load, avoiding a dark flash on light-mode reloads. Wurm pages are excluded.
  Storage-disabled browsers still support the in-memory/account setting, but cannot retain a
  prepaint cache across reloads. The last selected assigned role is
  remembered; otherwise the highest assigned role is used (Admin, GM, Player, Visitor).
  Switching roles restores that role's last location, or its directory; Visitors default to
  public content. Single-role accounts show role text rather than a selector.
  Logout, or Release during impersonation, is at the far right of the header.
- **Account directory and messages:** Game Master/Player pages show privacy-aware real-account
  directories above organizational records. Users may consent to public listing; private accounts
  appear only through relationships, pending invitations/requests, existing conversations or
  administrator contact. Administrators see all active accounts. Approved Player–GM relationships,
  cancellable invitations, messages, replies and participant-local message removal are supported.
  Messages are limited to 4,000 characters and 30 sends per 15 minutes. Relationships alone do not
  grant campaign/content access. Users can separately opt into showing active-login status;
  last-seen timestamps are not published. Administrators see all pending relationships and may
  revoke them or force-sign-out another account without impersonating it.
- **Impersonation and disposable previews:** administrators may impersonate an account or
  preview a role using an isolated temporary identity/database. Preview changes are discarded
  on Release. Account impersonation uses the administrator's existing session and does not
  create another target login or consume the target's session allowance. Release restores the
  administrator; Logout and credential/security changes are unavailable until Release.
  Wurm access is unavailable while impersonating. Each mutation records actor, target, role,
  route, time and outcome. If the target has an active login, each exact mutation requires
  approval or rejection; no response for five minutes permits automatic approval on retry.
  The client waits and retries the exact request; this is not offline/background execution.
  Pending responses are not reported as saved, and successful retries do not duplicate writes.
  The actor may cancel a pending request; Release cancels pending requests. Role previews
  do not require another person's approval. Administrator previews may exercise isolated
  administrative settings, never real account credentials.
- **Publication and editors:** `/site/heroes/sharing/` separates ownership, immutable original
  creator identity, editor accounts and read-only publication. Audiences include private, public,
  selected approved Player/GM relationships, all world/campaign/genre subscribers, or an explicitly
  selected subset. Scope membership uses approved subscriptions, or confirmed account-linked
  profiles with approved Player–GM relationships; ending the relationship revokes derived
  audience access immediately.
  Editors can read/write independently of the publication audience. New resources record their
  creator; legacy unknown creators stay unknown. Administrators must explicitly adopt ownerless
  legacy content before publishing. Published/editor-shared resources and provenance survive
  owner-account deletion under administrator stewardship.
  `/site/heroes/public/` is readable without login and deliberately ignores any signed-in
  privileges. **Public means this local helper installation, not a central internet service.**
  Do not expose the helper to the internet. Private linked dependencies suppress public results,
  rather than exposing hidden content. The landing page links to public content.
- **Approved independent copies:** Publishing includes requests, owner approvals, declines and
  cancellation for readable objects, library entries and management graphs. Dependencies must
  be readable and their owners must consent. Accepted copies use new IDs, private ownership,
  embedded/remapped dependencies and immutable original-name/creator/source provenance.
  There is no live synchronization. Owners may propose updates to existing copy recipients;
  acceptance creates a new private revision without overwriting the recipient's previous copy
  or edits. Active Admin retains owner/stewardship review but must switch to an assigned GM/Player
  role to request or accept copies into their own account. Individual object export is owner-only
  (or privileged administrator maintenance);
  other viewers use the approval workflow. Owners may delete a library entry only when all
  live uses affected by detachment are writable. GM-owned worlds may be deleted only when
  all affected objects and records are writable in the active role.
- **Player and GM dashboards:** account directories include Player-owned PCs first, then other
  objects and their scope memberships, plus GM-owned campaigns/worlds and visibility controls.
  GMs invite approved related Players; Players accept invitations or request subscriptions.
  GMs approve/reject subscriptions and separately approve use of owner-enrolled objects.
  Cancellation, rejection, revocation, withdrawal and confirmed owned-object deletion are
  available; administrators can moderate pending workflows. Access is derived dynamically,
  not copied into permanent ACL grants. Scope visibility, relationships, subscriptions and
  object-use revocations take effect immediately. Approved campaign/world objects appear in
  their world views; private dependencies remain private.
  See [the completed interface checklist](./documentation/heroes-completed.md#interface-issues).
- **First administrator:** restart the helper after updating, then run `npm run heroes:setup-code`
  in the project folder. Open `/site/heroes/setup/`, enter the one-use code within ten minutes and
  create an administrator with a distinct 12-256-character password. The code is shown only by the
  local command, never by the web API; public signup cannot claim Admin/GM/Player. Log in and
  manually add the supplied TOTP secret to an authenticator app (SHA-1, six digits, 30 seconds).
  Confirm one code, then save the ten single-use recovery codes offline. Administrators cannot
  access HERO data or ACL controls until two-factor authentication is complete. Other users can
  opt into the same protection. Enrollment secrets and recovery codes are shown only to that account.
  There is no email password-reset service or bypass for lost authenticator/recovery credentials.
  `/site/heroes/setup/` puts **Paste setup code here** at the top, followed by three steps:
  start the helper, get a code, paste it into the form. Expandable installation help includes
  official Node.js/project ZIP downloads and step-by-step Windows instructions; troubleshooting
  is separate so it does not overwhelm the main flow. The form stays visible with the helper
  offline, but submission is disabled until **Check connection again** confirms setup is needed.
  Account creation leads to plain-language sign-in, authenticator and recovery-code instructions.
  Until an administrator exists, authenticated-workspace HERO routes lead to this one setup destination, with no
  workspace, registration, Wurm or logout navigation. After that, signed-out users see sign-in
  and registration only; pending two-factor users see account verification and logout only.
  Workspace links/content appear only after full authentication. Admin navigation is hidden from
  non-admins. Completed setup hides its form and offers sign-in/account guidance instead.
  If the command reports **already running**, it has reused the existing helper rather than
  loading updated code. Run `npm run helper:stop`, wait for it to stop, then `npm run helper`.
  Old helpers may reject `X-Heroes-Session` in browser CORS checks. Public account-status
  checks omit that header and report a restart instruction when the helper lacks account support.
- **Server ACLs:** `/site/heroes/people/admins/roles/` lets an authenticated, MFA-verified active admin grant
  Visitor/Player/Game Master/Admin roles, disable accounts, and assign/revoke explicit Read or
  Read-and-write access to individual worlds, objects, library definitions, and management records
  (subject to matching-role note restrictions). Existing data is admin-only until explicitly shared. New Visitors cannot
  create data; Players can create objects, definitions and character/availability records;
  GMs can also create worlds and management records. Creators receive write ACLs for their records.
  Roles alone do not expose existing data. Grant linked world/campaign/genre/profile/library context
  separately; records requiring hidden dependencies are omitted rather than leaking their contents.
  Availability/global links do not grant access or ownership. Live library edits require write
  permission over all affected definitions/objects. Bulk imports/collection backups and cascading
  world/library deletion are admin-only; permitted individual objects can be exported. Profile
  filtering and navigation are never authorization. Role changes, disabling and ACL changes revoke
  affected sessions; permissions are evaluated on every request. The last admin cannot be demoted
  or disabled. No C# is exposed to or executed by the website.
  Administrator invitations and culture definitions have separate pages linked from
  `/site/heroes/people/admins/`; the main page lists system administrators.
  Administrator account lists can be searched by display name or username, filtered by account
  status, and paged independently per role (ten accounts per page). These display filters do not
  change permissions or the available account-edit and ACL targets.
  On Genres, Game Masters and system administrators have a prominent **Create genre** action.
  New genres are organizational records, not genre-specific rules. Creation clears an active
  workspace-profile filter so the new genre remains visible before campaigns/worlds are linked.
  **Show all accessible genres** clears only that display filter; it never grants permissions.
- **Personal names:** Account & security lets users optionally save structured personal names using
  the shared PersonName model and a selectable culture. System administrators configure each
  culture's name ordering and add selectable cultures in the expandable
  **System configuration: cultures and name order** sheet on Account & security or Admins.
  Ordering is enforced by the helper; users cannot override it individually. Existing cultures in
  saved names remain selectable when upgrading. No family name is required. Preferred names take
  precedence over the composed full name for display. Display names appear alongside the unchanged
  sign-in username in the main header, sidebar, account headings and administrator account lists.
  Names are not listed for other users by default or included in game-data exports. Opting into
  the Game Master directory shares the display name and username with Player accounts; sending
  a play request shares them with the addressed GM. Relationship names are visible only to their
  participants. Each signed-in user
  edits only their own name; permanent self-deletion removes it and retained-account recovery
  preserves it.
  If an older running helper returns "Unknown identity action", restart from the updated project
  folder with `npm run helper:stop`, then `npm run helper`, and reload the page. Unknown
  name/configuration routes now show this instruction instead of an unexplained error.
- **Player–Game Master relationships:** In **Account & security**, Game Masters can opt into
  **List my name for players seeking a Game Master**. This is **off by default**. Only opted-in,
  active GMs appear in the Player dropdown, identified by display name and username. Players
  select a listed GM and submit a play request; doing so shares their display name and username
  with that GM. Only the addressed GM can approve/reject it. Players can cancel pending requests;
  either participant can end an approved relationship. Rejected, cancelled, or ended pairs can
  request again while the GM is listed. **Refresh play relationships** reloads the directory and
  request statuses. Unlisting blocks new requests but leaves existing relationships visible to
  their participants. Accounts with both roles can play under each other, but not themselves.
  Approval establishes only an account relationship: world subscriptions, organizational profiles,
  object submission/approval, sharing consent, and resource ACLs remain separate and unchanged.
  Disabling, removing a required role, or retained closure cancels pending requests and ends active
  relationships; a GM must opt in again after restoration. Permanent closure removes related
  requests/relationships. They stay in the identity store, outside portable game backups.
- **Visitor role requests:** In **Account & security**, Visitors can request Player, Game Master,
  or both roles without an invitation. The latest request's status remains visible there; a pending
  request can be cancelled, and a rejected/cancelled request can be resubmitted. On **Admins**,
  system administrators approve all requested roles or reject the request. Approval replaces Visitor
  status and revokes the requester's sessions; sign in again to use the approved roles. Approval
  does not join a game or grant access to existing resources. Rejection leaves access unchanged.
  Manual account edits, disabling, or retained account closure cancel pending requests so stale
  approvals cannot undo later account-management decisions. Permanent closure removes the request.
  Only fully authenticated system administrators can review requests; Administrator is never a
  requestable role. Restart an older helper to enable this workflow.
- **Administrator invitations:** On Admins, choose one or more approved roles and select
  **Create invitation**. Copy the private code shown once and send it only to the intended recipient.
  On **Register**, using the same helper, the recipient enters that code and chooses their own
  username and password. Leaving the code blank registers a Visitor as before. Codes expire after
  24 hours, work once, and are stored only as hashes. Pending invitations list roles and expiry
  without revealing codes; administrators can revoke them. Disabling, demoting, or closing the
  issuing administrator's account invalidates their unused invitations. Invited administrators
  must still enroll in TOTP after sign-in. Roles do not share existing game data; explicit resource
  ACLs remain necessary. No email delivery or public invitation link is configured. Restart an older
  helper with `npm run helper:stop`, then `npm run helper`, to enable invitation support.
- **Self-service account closure:** Account & security offers three choices, requiring the current
  password and exact username confirmation. **Retain** deactivates the account with identity,
  ownership, and game data preserved; a system administrator may restore it after verifying identity.
  **Delete** removes credentials and unshared owned resources permanently. Shared resources and
  their connected contexts, globally available definitions, and legacy data without recorded
  ownership are retained under system-administrator stewardship. **Transfer** requests acceptance
  from a named active account: the sender remains active and can cancel; the recipient can accept
  or decline in Account & security. Acceptance transfers all then-owned resources and their write
  ACLs, preserves other users' access, and permanently removes the sender's credentials. Linked
  resources owned by others still require separate permissions. The last active system administrator
  cannot close their account. Creator ownership is tracked separately from ACL access for new
  helper-created/imported resources; existing write grants are not assumed to prove ownership.
  Administrative disabling remains distinct from permanent self-deletion. Ownership and pending
  transfer requests stay in the local identity store and are excluded from portable game backups.
- **Local identity security and future providers:** passwords use salted scrypt hashes; TOTP
  secrets use AES-256-GCM encryption. Recovery codes, setup codes and bearer sessions are stored
  as hashes, never plaintext. Sessions expire after eight hours (pending MFA after ten minutes),
  are bound to the approved app origin and stored in browser session storage, separate from Wurm
  pairing. Login/MFA/signup attempts are throttled; account creation and last successful login
  timestamps provide local account tracking, not anonymous visitor analytics. The default identity
  store is `<heroes.db path>.identity`; `HEROES_IDENTITY_PATH` can override it. Its `.key` file
  must be protected and backed up separately using OS access controls; POSIX files use mode 0600.
  Local encryption does not defend against an attacker controlling the same OS user or both files.
  Ordinary HERO JSON backups exclude all identities, credentials, sessions and ACLs. Keep the
  identity store and key confidential, never commit them or place them in exported game collections.
  The server's principal/access boundary and provider identity field allow future central identity
  integration; OIDC and WebAuthn/passkeys are explicitly reported as **disabled/unconfigured**.
  Enabling either requires a real provider, validated server-side issuer/audience/nonce or signed
  challenge, stable relying-party domain and TLS design. No browser-submitted external identity is
  trusted. The helper stays loopback-only over local HTTP; it is not a public authentication server.
- **Campaign backups:** export all management data, a profile collection, or individual
  world/campaign/genre collections from the corresponding management pages. Object editor lists export
  individual objects. JSON imports accept these collections plus existing world/object exports;
  select a destination world or Global when importing an individual object. Imports validate the whole
  collection before persistence and create independent copies with new IDs, never overwrite/merge
  existing records. Version 2 collections include required genre/campaign/world, availability, and profile dependencies and GM notes
  as readable JSON. A player collection includes that player's characters, not other characters
  merely sharing their worlds; a GM collection includes objects available in the GM's owned worlds.
  Campaign and genre collections include their descendant worlds and available objects, including
  global and directly scoped objects even without descendant worlds. Required context for shared
  availability links is included without copying unrelated objects. Version 1 management backups
  are accepted and migrated with the same unique/ambiguous-link handling.
  Genres are organizational records, not implemented genre rules. Exports flatten library
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
- **HERO route visibility:** The helper's authenticated `/heroes/access` response derives workspace
  routes from the same filtered resource/context/library ACL checks used for data reads. Sidebars,
  upper menus, footer links, and management cross-links omit unavailable destinations entirely.
  Group links lead to the first permitted page, not an inaccessible landing page. A direct unavailable
  workspace URL opens Account & security with an explanation instead of mounting its tools.
  Accounts retain pages where their role permits creation even when no records exist yet; for
  example, Game Masters can create new genres and Players can create objects. Visitors with no
  resource grants see account controls only. These UI checks do not replace server-side resource
  authorization. Role/ACL changes revoke affected sessions; sign in again to refresh route access.
  Restart an older helper to enable the route-list endpoint.
- **Wurm account authorization:** Wurm pages (including calculators, map, server status and roadmap)
  require a fully signed-in HERO system administrator by default. On **Admins**, use **Save Wurm tools
  delegation** to grant/revoke all Wurm features for another account, including local server/client
  launch. Player/Game Master roles and HERO resource ACLs do not grant Wurm access. Delegation
  changes revoke the affected account's sessions; sign in again afterward. Unauthorized accounts
  have no Wurm link in HERO navigation, and direct Wurm URLs show account guidance instead of tools.
  This also means the helper must be reachable for the initial Wurm page access check; cached/offline
  pages do not bypass authorization. Static client code is not confidential or encrypted.
- Wurm helper APIs require **both** an authorized complete HERO account session (`X-Heroes-Session`)
  and browser pairing (`Authorization: Bearer ...`). `/status`, `/db/...`, `/map/...` and
  `/start/...` enforce both checks on every request; pairing/unpairing also requires account
  authorization. `/health` remains public for readiness checks. Existing pairing tokens alone no
  longer provide Wurm access. Restart an older helper after updating.
- After account sign-in, run `npm run helper:pair-code` locally and enter the 8-digit, 10-minute code
  in the Server page. Each browser gets its own bearer token. `npm run helper:unpair` revokes all
  browser tokens. Use `npm run helper:startup:remove` to stop a login-managed helper.
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
├── index.html               # Heros login-only entry point (Wurm home: site/wurm/index.html)
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
