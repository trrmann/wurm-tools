# HERO System — Development Todo & Roadmap

Completed tasks, original requirements, implementation details, historical decisions, and verification notes are in the [completed-task archive](heroes-completed.md). The [Wurm Tools roadmap](todo.md) tracks the rest of the project.

## Development Hold (2026-10-22)

All non-web development, including C#, Blazor, desktop hosts, native integrations, and engine migration, is **on hold until further notice from the user**. Preserve existing work; do not continue implementation, framework evaluation, or scaffolding in those areas. Only the current JavaScript HERO web tools and their supporting tests/documentation are active.

## Maximum Priority — Regression Acceptance Criteria

- **Sheet-order acceptance criterion for task-208:** Match section order and element order within each section to the applicable HERO 5th Edition rules sheet for that object type (character, base, equipment, vehicle, and other available type-specific sheets). Do not apply character-sheet ordering universally. Consult and document the relevant sheet references; flag missing references rather than inventing an order. Ordering must arrange the actual inherited and added object elements, not introduce a hardcoded element list. Verify ordering for each type and after type switching and save/reload.

The completed critical inherited-element regression fix, its superseded decision, and its verification details remain in the [archive](heroes-completed.md#maximum-priority---regression).

## Next

Calculations remain limited to existing, researched 5th Edition rules; labels do not imply undocumented formulas.

### Installation and Updates

**All conversational directions and their implementation status:** [User steering register](steering-notes.md).
This includes notes supplied while builds were running; open signing/native/Windows gates are
not silently marked complete by a passing container test.

- [ ] **Maximum priority:** Build and maintain a downloadable, self-extracting installer to install or update a Fedora or Windows machine, selecting the download based on the OS reported by the browser. Instead of showing a message to restart the helper, offer the update download and let the installer determine and correct the laptop's current state. Rebuild this component whenever the code required on the laptop is updated.

#### Installation Investigation and Implementation Plan (2026-10-24)

**Production-validation prerequisite satisfied (2026-10-25):** The user confirmed that the latest production deployment was 100% successful, satisfying the previously pending production gate, including required full live W3C HTML/CSS and live Chrome validation. This acceptance is user-reported; the deployed commit and detailed run results were not supplied with the confirmation. Preserve that distinction rather than substitute a local-preview result or assume the current checkout is the deployed commit. A blocked external validator would not qualify as a pass.

- [x] Complete the production deployment successfully before proceeding beyond installer planning — accepted by user confirmation on 2026-10-25.

The installation requirements below remain open; satisfying this prerequisite does not mark the installer built, released, or tested. This status update performs no implementation and does not lift the broader non-web/C#/desktop/engine development hold.

**Installer implementation authorized separately:** The user requested the installer next after
accepting production. This authorizes this Node-helper packaging work only, not the held
native/C#/desktop-engine work. Confirmed scope: Fedora **44 KDE x64 first**, then Windows **11 x64**
per-user **NSIS `.exe`**, with Windows testing after production deployment. Distribution will use
versioned GitHub Releases linked from the website; install/update is user-approved, offline-capable,
and startup is opt-in. Unsigned maintainer artifacts may be tested now, but public release remains
blocked until signing is provisioned. Review the supported Node LTS monthly and rebuild urgently
for security patches. The user requested ongoing help with signing.

**Fedora implementation progress:** The [installer guide](helper-installer.md) documents the
offline self-extracting test package, pinned bundled Node 24.22.1, payload integrity, per-user
lifecycle, consistent backups/recovery and data-preserving uninstall. The
[signing guide](helper-signing.md) records Fedora OpenPGP and future Windows Authenticode steps,
trust bootstrap, secure custody and rotation/revocation. Automated isolated Fedora acceptance
passes; startup tests use a `systemctl` fixture, not an actual desktop login. CI rebuilds/tests
the Fedora package without publishing it. Keep the maximum-priority parent task open pending
real login/startup, production deployment, Windows implementation/acceptance, signed release
metadata/downloads and the website handoff. The Android installer prerequisite is **not** satisfied.

**Expanded installer requirements confirmed (2026-10-25):**

- **One-laptop signing clarification:** The user has one internet-connected Fedora laptop,
  no known hardware token or access to an offline computer, and needs non-admin instructions.
  `helper:signing:setup setup-local` now offers an explicitly approved password-protected
  local identity; `sign-local` selects it and signs/verifies both tested profiles.
  No second computer, token purchase or internet disconnection is required.
  See [the beginner guide](helper-signing.md#start-here-one-fedora-laptop-no-security-expertise-required).
  Passwords remain in local GPG prompts. The optional hardware workflow retains its
  original strict checks; it is not silently weakened. Local `USE THIS LAPTOP` consent
  approves the different custody model. Real setup, recovery and signing remain open.
- **Tooling/database preparation:** pnpm 12.15.0 replaces npm for project workflows; Corepack
  bootstraps pnpm on online development/CI/Render hosts without npm commands. Node 24.22.1 LTS
  is selected with nvm 0.40.8 locally and in managed developer workspaces.
  [PostgreSQL/pgAdmin discovery](database-development.md) records the approved Fedora
  PostgreSQL 18.6 package installation (no initialized/running cluster), pgAdmin 9.18 stable
  Flatpak update, support policy, and future gated integration steps. SQLite stays active.
  Developer redistribution includes PostgreSQL client utilities and native SQLite CLI;
  both profiles retain SQLite/SQL.js/WASM. Server/pgAdmin redistribution is not approved.
  The migrated offline developer acceptance passes all 546 tests in 53 files, forced
  frozen dependency repair with pnpm supply-chain checks, native client/version checks,
  production build, 34-page HTML/CSS validation and W3C tool readiness. GUI/desktop and
  production gates remain open.
- [ ] **Future PostgreSQL/pgAdmin integration:** Follow the discovery guide's ordered
      cluster approval, least-privilege role, pgAdmin connection, backend contract,
      reversible migration and acceptance gates. No automatic SQLite migration or server
      initialization is part of installer work.
- Offline developer acceptance passes with Node 24.22.1: all 544 tests across 53 test files,
  production build, local HTML/CSS checks for 34 pages, and bundled W3C tool readiness.
  The rebuilt user installer also passes its complete lifecycle acceptance. Detached shutdown
  no longer requires a systemd user session; setup-test fixtures use the Node 24 baseline and
  test rejection of an older runtime. VS Code and login/startup still use fixtures, so these
  results do not satisfy native desktop, signing, production deployment or Windows gates.
- All install/repair/update profiles are strictly offline: include prerequisites and dependency
  closures; downloads occur only during package building. Compare every bundled component and
  add missing/new required components; update to the installer's reviewed versions, preserving
  newer compatible system packages without downgrade. Never interpret this as an unrelated OS
  upgrade or claim an offline package can discover future internet versions.
- Include a separate developer profile: source/JS, deployment Bash/shell scripts and all their
  operational dependencies, locked pnpm tools, Git/SSH/GitHub CLI, Node/pnpm, Java/W3C validators,
  Chromium and scoped PATH/VS Code terminal configuration. Administrator installation of
  bundled offline system packages is approved only with explicit invocation consent. Preserve
  existing checkouts/local edits; use new managed workspaces instead.
- Detect/configure an existing VS Code and block developer acceptance if absent. Do not bundle
  Microsoft's proprietary binary; provide official offline-provisioning guidance. Do not download
  editor extensions at installation. Full developer uninstall/old-toolchain cleanup remains open.
- Investigate Windows **10 x64 as well as 11 x64** when Windows work begins. Record exact builds,
  OS support/ESU status, runtime support and separate native tests; do not promise unsupported
  combinations before discovery. Fedora remains first and Windows testing follows production.
- Local fingerprint-pinned GPG signing/verification automation is implemented. The earlier
  hardware-only plan is superseded by the user's one-laptop constraints: an explicitly
  approved local software identity is now offered alongside the optional hardware workflow.
  Tests use disposable identities only; no production key, password, signing bypass or publication
  is created. Public release still requires native acceptance and redistribution-license review.

**Current-state notes:**

- Local installation currently requires an extracted source tree or Git clone, Node.js/pnpm, and dependency installation. There is no maintained end-user self-extracting release or equivalent Windows bootstrap. A downloaded static site is not the local helper.
- `scripts/setup.sh` is Fedora-specific, uses nvm-managed Node LTS and pinned pnpm, restores
  frozen dependencies when needed, and rechecks prerequisites even when `.setup-complete`
  exists. It still mixes developer prerequisites with helper setup and modifies script
  permissions/line endings; the managed offline developer profile is the redistribution path.
- `scripts/helper-startup.js` already provides opt-in Windows logon tasks and Fedora systemd user services. Registrations reference the current Node executable and source location, so moving a checkout or changing Node can invalidate them. Reuse and improve this lifecycle rather than create competing startup managers.
- The helper is shared by HERO and Wurm features, binds to loopback, supports `/health`, and uses a project-relative semaphore by default. HERO/map data use per-user storage with path overrides; identity and browser-pairing state also need explicit inventory. Packaging must include the helper's transitive modules, runtime dependencies, and assets, not just `wurm-local.js`.
- Existing CI uses Ubuntu, not a Windows/Fedora installation matrix. Available desktop validation targets are Windows and Fedora/KDE; supported OS versions, architectures, and Wayland/X11 coverage still need to be recorded and verified. No tested macOS installer is promised.

**Planned work, in dependency order; every item remains open:**

- [ ] **Define the support and maintenance contract:** Inventory supported Windows/Fedora versions, CPU architectures, shells, Node/pnpm versions, browser requirements, privileges, network/proxy constraints, installation locations, and release/support lifetime. Record decisions and unsupported combinations explicitly. Resolve installer format, runtime bundling, signing, distribution, and offline-install requirements before scaffolding; do not choose a desktop UI framework for this helper-installation task.
- [ ] **Separate developer and user installation profiles:** Give both profiles clear install, inspect, repair, update, uninstall, and troubleshooting workflows on both OSes. Share prerequisite checks, release metadata, lifecycle logic, and platform adapters where appropriate without requiring user installs to contain the development toolchain.
  - **Developer profile:** Use an explicit clone or extracted source workspace; validate Git where needed, supported Node/pnpm, and Chrome/Chromium for audit tooling. Restore lockfile-defined dependencies with `pnpm install --frozen-lockfile`, including development dependencies; make VS Code integration optional. Document PATH, executable permissions, line endings, paths with spaces/non-ASCII characters, and Windows `pnpm.cmd`/PowerShell restrictions without weakening execution policy. Do not overwrite source edits, switch branches, install held .NET/desktop tooling, or commit/push/deploy as an installation side effect.
  - **User profile:** Provide versioned self-extracting downloads for Windows and Fedora with the helper, required runtime/dependencies/assets, and accessible launch/status/uninstall entry points. Aim for no manual Git, pnpm, editor, or source-checkout requirement; determine bundled versus managed runtime delivery and its patching obligations explicitly. Browser-only use must remain available without forcing helper installation.
- [ ] **Establish one packaging source of truth:** Define a versioned release manifest covering application/helper version, supported platforms/architectures, runtime version, artifact checksums, protocol/data compatibility, and included files. Inventory transitive local imports and WASM/assets such as `sql.js`; test the resulting package without access to the repository or development `node_modules`. Keep platform-specific code thin and reuse the existing helper lifecycle where suitable.
- [ ] **Design safe per-user layout and migration:** Separate replaceable program/runtime files from persistent data, configuration, credentials, logs, and runtime state. Preserve HERO databases, identity/roles, pairing state, map baselines/edits, environment overrides, Wurm install paths, and startup preferences during updates. Inventory actual current paths before designing migration; handle clone/ZIP-based and legacy setup installations, custom data paths, permissions, and multiple Windows/Fedora user accounts without exposing another user's data. Never modify Wurm/Steam game files as an installer repair.
- [ ] **Design an idempotent installer state machine:** Inspect the actual machine on every run instead of trusting a completion marker. Distinguish absent, current, outdated, moved, partially installed, conflicting, and damaged installations; identify running helper instances and occupied ports safely. Report planned changes and request consent where required. Re-running install/repair must not duplicate startup entries, erase configuration, silently succeed after a failed step, or require unnecessary administrator/root access.
- [ ] **Define Windows and Fedora platform integration:** Prefer least-privilege per-user installs and explicit opt-in startup; preserve that preference across updates. Maintain Windows logon-task paths/quoting and Fedora systemd user-unit paths, reload/restart behavior, and logs. Test Windows locked files/antivirus and Fedora permissions, SELinux, KDE launchers, and login sessions; do not disable protections or enable system-wide services/lingering without explicit approval. Detect existing managed and manually started helpers without terminating unrelated processes.
- [ ] **Design transactional update, repair, and rollback:** Verify trusted artifact metadata before execution; stage updates, check compatibility and disk space, back up affected data/configuration, stop only the owned helper, switch versions, repair startup registration, restart when appropriate, and verify readiness. Recover safely from interruption, download failure, locked files, unavailable runtime, and failed health checks. Define database migration/backup compatibility and rollback limits; never roll back binaries against incompatible migrated data or silently downgrade.
- [ ] **Specify web-to-installer handoff:** Replace the restart-helper message with a download/update action and clear instructions. Recommend an artifact from browser-reported OS information but retain manual OS/architecture selection because detection can be missing or wrong; verify the real target inside the installer. Show installed/available versions and compatibility with the deployed web client. Do not claim the browser can install or repair the machine directly; preserve loopback-only access, allowed-origin restrictions, authentication, pairing, and account setup.
- [ ] **Define release trust and dependency upkeep:** Choose Windows signing and Fedora artifact verification mechanisms, trusted release hosting/metadata, checksum/signature validation, and a documented key rotation/revocation process. Track bundled runtime and dependency updates, licenses/notices, release provenance, and a reproducible lockfile-based build. Keep signing credentials and private user data out of artifacts, manifests, logs, and the repository.
- [ ] **Plan uninstall, diagnostics, and recovery:** Remove only installer-owned files and startup entries, with data retained by default and a separate explicit confirmation for deletion. Never remove shared system runtimes, source workspaces, unrelated services, or game installations. Provide actionable error codes, version/health/status inspection, redacted logs, backup/export/restore guidance, and repair/reinstall instructions for both profiles and OSes.
- [ ] **Build a release/rebuild pipeline after approval:** Rebuild and test installers whenever any packaged helper code, transitive module, runtime/dependency, asset, lifecycle script, or manifest changes. Publish versioned immutable artifacts with release notes and compatibility metadata; coordinate website download links with the successfully validated production release so they do not advertise missing or incompatible packages. Keep installer release checks separate from, and additional to, all existing deployment gates; define recovery if web deployment passes but installer publication fails.
- [ ] **Validate the four-profile matrix before claiming support:** Exercise developer and user installations on both actual Windows and Fedora/KDE targets, supplemented by automated unit/integration tests and clean-machine or VM install tests. Record exact OS/runtime/architecture/session and artifact versions. Cover fresh install, repeat install, repair, update from the previous supported release, move/custom paths, logoff/reboot/startup opt-in/out, uninstall with data retained/deleted, interrupted update, rollback, offline/network failure, invalid artifacts, incompatible versions, port conflicts, and permission denial.
  - **Developer acceptance:** A clean machine can install documented prerequisites, restore dependencies, run the existing formatting/lint/unit/build/local standards gates, and run the environment-appropriate all-page Chrome checks. Both deployment script variants retain their required behavior, and source edits survive repair/update.
  - **User acceptance:** A clean machine can install without a development checkout, open the deployed site, pair with the local helper, complete account setup as applicable, and use HERO/Wurm helper features. Update/repair preserves data and permissions, leaves exactly one intended helper/startup registration, and reports verified readiness; failure leaves a recoverable installation rather than a success message.
- [ ] **Publish and maintain operator/user documentation:** Provide separate Windows/Fedora developer and user instructions, supported-version tables, install/update/repair/uninstall examples, startup and storage locations, recovery procedures, release ownership, dependency-review cadence, and end-of-support policy. Retain investigation decisions and acceptance evidence in the completed-task archive when delivered; do not mark this installation requirement complete until both profiles on both OSes meet the acceptance criteria.

#### Confirmed Installer Decisions and Storage/Server Plan (2026-10-24)

**Scope and gates:** These are planned installation requirements, not delivered installation support. The production-validation prerequisite above is satisfied by user confirmation on 2026-10-25; the broader non-web implementation hold remains in effect. The user confirmed the following installation decisions:

- Initial targets: **Windows 11 x64 and Fedora KDE x64**. Confirm exact supported Fedora releases before implementation; do not imply other architectures or platforms are tested.
- End-user packages bundle a supported Node runtime and all required dependencies/assets. Installation must work offline after the complete artifact is downloaded; hosted services and update discovery still require connectivity. Developer installs retain the explicit source/toolchain workflow above.
- Install per user, with login startup **opt-in**. Notify users of updates and offer a verified download; installation requires user approval.
- Start with **local SQLite managed by the Node helper**. Hosted workspaces are optional future functionality with explicit migration/import, not automatic two-way synchronization.
- A local HERO system administrator may register a hosted server URL; the remote server's administrator separately approves access. Local administrator status does not confer remote administrator status.
- The eventual desktop app initially uses the same local Node helper; a native adapter may replace it later through compatible application contracts. This does not select a desktop framework or authorize its implementation.

**Investigation notes:** Current HERO persistence uses `sql.js` to read/write local SQLite files through the helper, with an operation queue and file replacement; it is not a PostgreSQL adapter or a general multi-process SQLite server. Browser pairing, HERO identity, and database files have separate storage/lifecycle concerns. The current static Render site cannot safely contain PostgreSQL credentials or itself provide a trusted application-server boundary. Hosted functionality will require a separately deployed authenticated backend.

- [ ] **Formalize local-first persistence without replacing it prematurely:** Keep SQLite as the default, usable without a hosted account or network. Document helper-owned access, single-writer/concurrency limits, schema versions, backup consistency, crash recovery, and supported data locations. Do not have browser, desktop, and helper processes independently overwrite the same SQLite file. Keep Wurm game databases read-only through their existing adapters; do not migrate game files into hosted storage.
- [ ] **Define host-neutral application and persistence contracts:** Describe concrete load/save, query, authorization, transaction, import/export, and error semantics independently of SQLite, PostgreSQL, Node, or a desktop UI. Reuse existing domain rules and permissions rather than duplicate them in each host. Plan a local SQLite adapter and a future hosted API adapter; test identifiers, relations, transactions, schema migration, and serialization consistently across both. Do not assume SQLite SQL, file-replacement behavior, or local identity records translate directly to PostgreSQL.
- [ ] **Use an authenticated server API for future PostgreSQL access:** Browser and desktop clients connect to an HTTPS application API, not directly to PostgreSQL. The API enforces user/workspace permissions on every operation, owns its database connection/pool, and uses private database connectivity where available. Restrict its database role to necessary runtime privileges; use a separate, controlled migration/provisioning identity. Prefer short-lived workload/database identity when the selected hosting provider supports it; otherwise retrieve rotating credentials from a server-side secret manager.
- [ ] **Design the system-administrator "Add server" workflow:** Require authenticated local HERO system-admin authorization and recent reauthentication for registration/change/removal. Store a friendly name, canonical HTTPS API URL, stable remote server identity, workspace selection, and supported API/version metadata; store no database connection string or master key in this profile. Validate the endpoint and certificate without bypass switches, authenticate to the remote service, and require its administrator's approval/invitation under remote policy before workspace access. Treat discovery metadata as untrusted, show the remote identity for confirmation, audit changes, and test denied/revoked access. Registration must not silently move local data or upload local credentials.
- [ ] **Constrain server registration and network access:** Specify allowed endpoint/port and redirect policies before enabling helper-side remote requests. Reject embedded credentials and unexpected schemes; protect against SSRF, DNS rebinding, redirects to metadata services, and accidental exposure of local services. Legitimate private/self-hosted servers need an explicit administrator-approved policy rather than a blanket private-network allowance. Keep TLS hostname/chain validation enabled; define trusted private-CA enrollment if needed. A registered server must not gain access to local Wurm files, local helper management, other server sessions, or unrelated local workspaces.
- [ ] **Separate all credential classes and trust boundaries:** Never ship PostgreSQL passwords, cloud administration credentials, service signing keys, or installer-signing keys in JavaScript bundles, desktop binaries, installers, source, release manifests, URLs, logs, or user-editable server profiles. A local helper or desktop app is a user-controlled client, not a safe place to conceal a shared hosted-service master secret. Keep hosted secrets in a restricted server-side secret manager; keep installer signing keys in a separately controlled signing service/store. Use distinct credentials per environment/service and record only nonsecret secret references in configuration.
- [ ] **Plan secure user authentication and token storage:** Prefer standard browser-based authorization with Authorization Code + PKCE for public clients, no embedded OAuth client secret, short-lived audience-scoped access tokens, and revocable/rotating sessions. Select the identity provider and browser/helper/desktop handoff with redirect/state validation explicitly; do not transmit local account passwords or identity files to establish a remote session. Keep long-lived client tokens behind the helper/native credential adapter using Windows Credential Manager/DPAPI or an appropriate Fedora Secret Service/KDE-supported store, with real Windows/Fedora validation. If the secure store is absent or locked, fail clearly or offer a documented nonpersistent session; never silently write plaintext refresh tokens. Keep web authentication out of persistent browser token storage where a properly secured server session is available, and address CSRF, XSS, CORS, and loopback pairing separately.
- [ ] **Define local/remote identities, tenancy, and disconnect:** Explicitly link remote identities rather than infer ownership from matching names/emails or local system-admin roles. Enforce remote user/workspace isolation server-side. Specify how multiple registered servers, role changes, expired sessions, revoked devices, logout, server removal, and unavailable servers behave; removing a registration revokes/cleans up its local session where possible without deleting local data or implying remote data deletion. Do not treat cached roles or client-provided workspace IDs as authority.
- [ ] **Design deliberate migration and portability:** Keep local and hosted workspaces visibly distinct. Require authorized source export and destination import with an explicit destination, backup, schema/format checks, relationship/ownership mapping, and approval recertification where required. Preserve the local original until verified completion and user consent; never transfer password hashes, local pairing state, or storage secrets as application data. Define attachment/map-data scope, quotas, retries/idempotency, partial-import recovery, and deletion semantics. Offline hosted-workspace editing and two-way synchronization remain deferred pending separate conflict-resolution and authorization requirements.
- [ ] **Preserve desktop compatibility through adapters:** Package and manage the Node helper with the future Windows/Fedora desktop app initially, using the same persistence/API formats and permission rules. Define helper ownership, loopback authentication, lifecycle, and version negotiation so browser and desktop use do not create competing helpers or databases. Put credential storage, filesystem, authentication handoff, and networking behind host adapters; do not require domain/shared UI code to know OS key stores or database credentials. A later native backend must pass the same contract and migration tests before replacing Node.
- [ ] **Document realistic protection, recovery, and acceptance:** No system can promise keys are "100% safe"; compromised administrators/devices, malicious dependencies, and runtime access remain threats. Record a threat model and verify least privilege, encryption in transit/at rest, secret-store access policy, redacted diagnostics/crash reports, token/key rotation and revocation, backup encryption with separately protected recovery keys, and recovery after compromise. Test that packages/build output contain no secrets and that invalid TLS, unauthorized server registration, cross-workspace access, revoked tokens, unavailable/locked credential stores, and missing hosted configuration fail safely while local-only use remains available. Do not describe SQLite itself as encrypted or current file permissions as equivalent to an OS credential vault.

**Questions still open before implementation:** Exact Fedora releases; the supported Node LTS/update lifetime; artifact hosting and ownership (versioned GitHub Releases is a candidate, not yet a confirmed provider); signing identities, budget, and key custody; retention/backup/recovery policy; identity provider and account-recovery/MFA requirements for hosted administrators; hosted backend/provider/region and tenancy model; private-server/private-CA policy; permitted hosted data types and quotas; and release-maintenance ownership. Resolve these at the relevant design milestone without delaying the agreed local-only installation baseline unnecessarily.

### Android Website Access — After Installer Acceptance

- [ ] Investigate and deliver Android access to the website. **Confirmed initial scope (2026-10-24): public website viewing only; no authenticated workspace access or editing initially.** Authenticated workspace access is a later phase through the hosted HTTPS API when available, with no laptop network exposure. This clarifies the original "may not write for now" note; it does not authorize Android application implementation now.

**Dependency gate:** Begin Android implementation only after the Windows/Fedora installer is built, its release/download integration is deployed, and installation/update/repair acceptance tests pass for both developer and user profiles on both OSes. Record artifact versions, deployed commit, and test evidence before lifting this gate. Planning/discovery is allowed now; the broader native/desktop development hold remains in effect.

**Discovery findings:**

- The HTTPS Render site can be opened from Android without an installer. Existing viewport metadata and HERO responsive rules at 900px/540px provide a starting point, not proof of Android compatibility. Loading the site must not be confused with having functional authenticated workspace access.
- HERO requests in `src/js/tools/heroes/helper-client.js` and `session.js` currently target `http://127.0.0.1:5180`; other account/Wurm/map clients also reference the laptop helper. On Android, loopback identifies the phone, not the Windows/Fedora laptop. The helper deliberately listens on laptop loopback only. Do not change its bind address, open firewall ports, forward a router port, or instruct users to bypass TLS/browser protections for this requirement.
- `/` is the HERO login landing page, with setup/register links intended for local-helper workflows. Identify appropriate public content and destinations explicitly rather than claim all existing pages are publicly usable. Existing authorization and helper-offline behavior must remain intact.
- No web app manifest or service worker was found in the inspected web source/assets. An Android browser experience does not require a native APK or PWA; home-screen installation, offline caching, notifications, and native storage are separate, unapproved scope.
- Current desktop Chrome audits and responsive CSS do not prove Android browser/device behavior. No Android device/version/browser matrix has been validated yet. Public-site viewing needs neither Node/Java on the phone nor access to the laptop's SQLite files.
- Chrome documents permission restrictions for public sites accessing local networks. Although laptop network access is excluded from this plan, this reinforces why replacing loopback with a LAN IP is not a supported shortcut. Reference: [Chrome Local Network Access guidance](https://developer.chrome.com/blog/local-network-access). Recheck actual browser behavior/version at implementation time rather than relying on an old rollout assumption.

**Ordered completion steps:**

1. [ ] **Verify installer prerequisite completion:** Confirm successful deployment and all required installer acceptance evidence above; do not infer completion from a working website or local W3C run.
2. [ ] **Define Android support and public page inventory:** Agree on minimum supported Android/browser versions, real phone/tablet test availability, portrait/landscape coverage, and required public pages/content. Document which routes are public, helper-dependent, or authenticated and what Android visitors should see. Start with a normal HTTPS browser experience; do not select a native framework or add a phone-side helper.
3. [ ] **Design honest public navigation and unavailable-feature UX:** Make public content reachable and explain that local workspace/account setup requires the supported computer workflow. Decide whether unavailable actions are hidden or disabled with an accessible explanation; avoid misleading install downloads, restart-helper instructions, repeated loopback polling, broken login/setup forms, or claims that opening the phone website pairs it with the laptop. Preserve existing Windows/Fedora workflows and do not rely solely on user-agent detection for capability decisions.
4. [ ] **Validate responsive and accessible presentation:** Check navigation, text scaling, touch targets, focus, screen-reader announcements, dialogs, virtual-keyboard interaction, scroll/overflow, theme contrast, orientation changes, slow networks, and failed loads on the approved public pages. Fix shared web components rather than fork Android-only copies. Do not request local-network, filesystem, notification, or other unrelated permissions for public viewing.
5. [ ] **Implement and test only the approved public-viewing phase:** After the gate is lifted, add focused route/capability tests and Android viewport/browser automation, then verify on real Android hardware or a documented emulator plus real-device follow-up. Check that no private workspace data appears, no mutation is attempted automatically, no phone-local helper is required, and public navigation remains usable when the helper is absent. Keep signed-in/private route guards enforced; a hidden button is not authorization.
6. [ ] **Release and verify public Android support:** Run the existing unit/format/lint/build, all-page source standards, local official W3C, and environment-appropriate Chrome gates without narrowing their page lists. Deploy the web changes, repeat required live gates, and record Android public-page acceptance on the actual production build. Publish a short support/troubleshooting guide and known limitations. Do not mark future authenticated Android access complete at this milestone.
7. [ ] **Prepare later authenticated access only after hosted API readiness:** Reuse the planned HTTPS API, identity/tenant authorization, server-registration policy, and persistence contracts; never connect Android directly to PostgreSQL or expose laptop SQLite/helper endpoints. Decide whether the first authenticated release is read-only or writable, and enforce any read-only policy at the API, not just in the UI. Approve account/session recovery, mobile token/session handling, server selection, data migration, and revoked/expired-session behavior before implementation. Local-only laptop data is not available remotely unless deliberately migrated/imported into an authorized hosted workspace.
8. [ ] **Validate cross-client compatibility before expanding scope:** Test browser/Android/future desktop behavior against the same hosted API contracts, permissions, schema versions, and workspace boundaries. Keep offline synchronization, Android-local databases, native APK/store distribution, PWA caching, and background operation deferred unless separately requested. Add future work with explicit dependencies rather than treat it as implicit in public website access.

**Open decisions for the implementation milestone:** Minimum Android/browser versions; available physical devices; exact public content and landing/navigation behavior; whether tablets are an initial target; and the hosted API/identity readiness schedule. These do not authorize extending the first release beyond public viewing.

### Object and Character Model

- [x] Include body shapes such as humanoid, bipedal, equestrian, canine, feline, quadrupedal, legless (use the correct term for shapes such as a snake or snail), vehicle, surface-area shapes such as a base, city/town, box, sphere, rod, compound shape, etc. Implemented model-owned classifications for all listed shape categories, plus explicit Bipedal, Equestrian, Canine, Feline, Limbless, Vehicle, and Surface Area body-shape types. Existing `nonpedal` values remain compatible; new limbless classifications use the correct term. Canine and Feline reuse the shared quadruped anatomy; no new anatomical assumptions or geometric calculations were added.
- [ ] Display values according to the rounding rules, including mixed-value results; never display mixed numbers as final values.
- [ ] Powers and skills use the same points-to-value function, and the resulting value has a purpose for each. Configure each to match the rulebook's cost structure. Results may be a number of dice, a base/target roll, a modifier to another roll, a number of dice or another value, etc.
- [ ] Work out skill tiers and the links from familiarity to knowledge or proficiency in a skill. Tie them together more closely according to the detailed rules.
- [ ] Identify the listed components' specifications more clearly in the OOP model and retain them there, with nothing hard-coded outside the model. Move all externally hard-coded items into the model with the switches needed for their proper use.
- [ ] Expand customization, including additional specifications for different skill tiers or generic specifications. Store these outside individual characters for reuse in worlds or campaigns generally.
- [ ] Model powers that refer to characteristics or skills as relationships to those same element instances rather than detached copies.
- [ ] Allow one power instance to belong to multiple power categories without duplicating the power.
- [ ] Model rulebook-defined skill specifications as OOP elements and allow custom skill specifications in characters and other objects.
- [ ] Implement the additional specifications documented in Markdown files that have not yet been built as OOP classes in the modules.
- [ ] Allow custom specifications for special effects.
- [ ] Review both generators for complete OOP ownership: move behavior into the highest appropriate shared object/domain method and remove generator-specific hard-coded domain behavior.
- [ ] Validate object and character generation against the 5th Edition rulebook before beginning interaction implementation.
- [ ] Associate each body part in a body shape with the following statistics in the OOP object model: random-hit 3d6 roll values, OCV modifier for a called shot, STUNx, NStun, and BODYx. All values must come from the rulebook.

### Accounts, Sharing, and Future API

These remain open follow-ups to the completed account, navigation, publication, and subscription work in the [archive](heroes-completed.md). Moving them here does not mark them complete or change their scope.

- [ ] **Backlog:** Keep the Heros Tools concept capable of being converted into an API in the future.
- [ ] Investigate single sign-on, potentially tied to the local laptop login ID or browser authentication from other pages or sites, linked to an internal ID.
- [ ] Determine the ability to send a code by email and use it for email confirmation.
- [ ] A player's objects can go to some, all, or no GMs. Each object submitted to a GM requires that GM's approval independently of the player being in the GM's game.
- [ ] A GM can choose to publish items for players, publish them globally, or leave them unpublished.
- [ ] A GM needs the player's permission to share an object, even if the GM has approved its submission by the player.

### Hex Map Editor — After Full Character/Object Builder Acceptance

- [ ] Build a web-based hex map editor that displays a hex map and lets users edit it like paper. **Confirmed initial purpose: Game Masters build maps and define bases and related locations. Preserve the ability to support player-created maps too, without making player editing an initial-release prerequisite.** Planning/discovery only now. Start implementation after full character and object building is complete and has passed documented model, round-trip, permissions, UI, and regression tests; record the accepted commit and test evidence. Do not require completion of combat/interaction implementation unless a particular map feature actually depends on it, and do not lift the native/desktop development hold.

**Feasibility and discovery notes (2026-10-24):**

- **Confirmed graphics requirement:** Provide a full graphical editing toolset for GM map creation and base/location design, not merely hex coloring or marker placement. Include selection/multiselection, move/copy/paste/duplicate/delete, pen/freehand drawing, line/polyline/curve and shape tools, fill/stroke/color/opacity controls, text formatting, erasing, grouping/ungrouping, alignment/distribution, ordering, layers with visibility/locking, rotate/resize, grid snapping with free placement, pan/zoom, undo/redo, and image/background import and manipulation. Include portable save/load and visual export/printing. These are required capabilities; implementation may be staged, but the full editor requirement is not complete until the agreed toolset is delivered and tested. Exact supported formats, limits, and advanced behaviors still need specification; this does not imply parity with every feature of a general-purpose graphics suite.
- Browser SVG or Canvas can render hex grids, editable terrain, text, paths, and freehand annotations with mouse, touch, or pen input. A native executable is not required. "Like paper" means direct manipulation, reliable erase/undo, and printable/exportable output; exact initial tools and map purpose still require approval.
- Existing `src/js/tools/map-explorer/index.js` renders Wurm square-tile rasters with Canvas, zoom, coordinate selection, and export workflows. `browser-store.js` provides IndexedDB-backed imported baselines. These are prior art for interaction/storage patterns, not an existing generic hex-map model. Do not repurpose Wurm binary layers or alter game files to store HERO maps.
- HERO management currently models campaigns/worlds and related ownership, but has no hex-map record kind. New map ownership, scope, serialization, and authorization need explicit integration with the helper/store/access layers; adding a menu or browser-only record is not sufficient.
- Keep map geometry and document editing separate from rendering, persistence, and HERO rules. Axial coordinates with cube-coordinate algorithms are a candidate for storage/geometry; screen coordinates must not become authoritative map coordinates. Investigate pointy/flat orientation, edge ownership, line interpolation, rounding at boundaries, and negative coordinates. Technical reference: [Red Blob Games hex-grid guide](https://www.redblobgames.com/grids/hexagons/); implement appropriately licensed original project code, not copied page content.
- No authenticated Android editing is approved by this requirement. Follow the separate Android roadmap; future desktop/browser adapters should reuse portable map documents and application operations rather than duplicate domain behavior.

**Ordered implementation plan; all tasks remain open:**

1. [ ] **Confirm builder acceptance and specify the full graphics toolset:** Verify the prerequisite above before implementation. Start with GM map creation and base/location definition; determine the required regional/site/floor-plan detail and whether encounter-map features are needed initially. Define acceptance cases for every confirmed graphics capability above, map bounds/size, orientation, labels/coordinates, scale/units, and print requirements. Plan delivery stages without reducing the full graphics requirement to a minimal paint-only editor. Character/object markers may reuse completed builder data later, but do not imply combat automation, pathfinding, line-of-sight rules, or undocumented HERO measurements.
2. [ ] **Define map documents and editing operations:** Design versioned metadata, stable map/layer/feature IDs, grid coordinates, terrain/edge features, text, vector strokes, visibility, references, and ownership. Store freehand geometry in map/world units so zooming does not distort it. Define bounds and resource limits, validated commands, grouped brush gestures, undo/redo semantics, dirty state, and map resize/orientation behavior without silent data loss. Keep optional map scale explicit rather than invent rulebook defaults.
   - **Base/location integration:** Let a GM define a base's mapped footprint and relevant areas and associate them with an existing or newly created base object through the completed object-builder workflow. Decide room/area boundaries, entrances, multiple levels, and regional-to-site links before implementing those details. Keep map annotations and geometry distinct from authoritative base statistics, costs, ownership, and permissions; reference the shared object model rather than copy or invent rules. Test object/map save-reload, units, linked-object changes/deletion, and whether shared maps may reveal a linked base's protected information.
3. [ ] **Design GM-first and optional player creation permissions:** GMs create/manage maps within authorized worlds/campaigns; decide which players can create private maps or submit/share their own maps and how a GM accepts them. Reuse publication/submission approval and ownership policies where applicable. Enforce access on list/read/write/export/import/delete operations in the backend, not merely in controls. Distinguish player-visible content from GM notes/hidden layers; unauthorized content must never be sent to a player and merely hidden by CSS. Define sharing, copying, owner deletion, retained shared maps, and revocation consistently with existing account/data policies.
4. [ ] **Prototype geometry/rendering after approval:** Compare SVG with Canvas against agreed map sizes, text editing, accessible selection, print fidelity, and pen performance; choose the simplest adequate renderer using measured evidence. Use pure geometry tests for hex/pixel round trips, neighbors, edge/corner selection, continuous brush interpolation, and orientation. Add pan/zoom with stable cursor anchoring, high-DPI rendering, pointer capture/cancel, and clear separation between navigation gestures and drawing. Do not introduce a new frontend framework unnecessarily.
5. [ ] **Implement the full graphical toolset and accessibility:** Deliver all confirmed graphics capabilities above with clear active-tool, layer, color, selection, and save state; keyboard navigation/shortcuts, accessible controls and selection descriptions, text editing, deliberate destructive actions, and reliable undo/redo. Define consistent transforms for grouped features, image/text objects, copied content, and locked/hidden layers; prevent accidental edits across layers. Handle pen/mouse/touch gesture cancellation, zoom/resize, and focus without accidental drawing or page-scroll traps. Supply a nonvisual map/feature inspector instead of relying solely on a canvas. Investigate maintained SVG/Canvas editing libraries against tool coverage, licensing, import sanitization, accessibility, export fidelity, and performance before deciding between a dependency and original editing primitives.
6. [ ] **Integrate safe persistence and portability:** Save authorized maps through the Node helper into local SQLite using the existing lifecycle and consistent transactions; define any draft/autosave behavior explicitly and report save failures. Support versioned portable import/export with strict validation, bounded payloads, sanitized labels and image/vector inputs, and no executable imported markup. Preserve unsaved work on navigation/failure as agreed. Reuse host-neutral contracts for later hosted PostgreSQL/API and desktop adapters; do not add automatic synchronization or unrestricted browser-storage fallback implicitly.
7. [ ] **Add printing and visual export:** Preserve map scale/aspect, grid/label legibility, orientation, margins, and optional multipage tiling; agree on required PNG/SVG/PDF/browser-print formats and supported size limits. Make GM-only material excluded by default from player/public exports and require authorized explicit selection for GM exports. Test fonts, licensed assets, external-image/CORS failures, print layouts, and portable document round trips.
8. [ ] **Verify behavior and performance against acceptance criteria:** Agree measurable map-size/feature-count, interaction-latency, memory, export-size, and save/load budgets before claiming support. Test create/edit/erase/undo/redo/save/reload/import/export/print, hidden-layer leakage, malicious/oversized imports, denied/revoked access, interrupted saves, object-reference deletion, resizing, theme contrast, keyboard use, and pointer cancellation. Validate GM and approved player workflows separately on Windows/Fedora browsers; Android and future desktop claims require their own acceptance.
9. [ ] **Release without weakening existing gates:** Add the new page as a Vite HTML build entry so existing dynamic all-page validation includes it. Run unit/model/permission tests, formatting/lint/build, local standards, official local W3C tools, and required preview/live Chrome suites. Validate authenticated map internals separately from signed-out page audits. Deploy, verify the production build, document GM/player workflows and backup/recovery, and archive requirements/test evidence only when delivered. Keep deferred tools and collaborative editing/fog-of-war/live sessions as explicit future tasks, not assumed completed scope.

**Open design decisions:** Initial tools and the level of base/location detail; supported sizes and measurable budgets; orientation/scale; player creation eligibility and approval; required print/export formats; optional background assets/markers; and draft/autosave expectations. The initial purpose is confirmed as GM map building and base definition. Resolve remaining decisions before coding, without treating this planning request as approval for a native app, real-time collaboration, or automatic combat rules.

### Object Interactions

- [ ] After generation is rulebook-aligned, define and implement OOP interaction methods for rule-defined combat, damaging/breaking objects, and non-combat actions.
- [ ] Validate object interactions against the 5th Edition rules before beginning genre-specific features.
- [ ] Voluntary account deletion should also allow the user to export all their data. Recovery by import requires system-administrator approval. All approvals on restoration must be recertified by GMs and other players.
- [ ] Involuntary deletion by a system administrator should allow a backup of all data to be stored and recovered.

Helper commands retained from the deletion note; the original note did not specify their relationship to that requirement:

```sh
pnpm run helper:stop
pnpm run helper
```

### Genre Support

- [ ] Add genre models and player/Game Master assistance after object interactions are rulebook-aligned. Let Game Masters configure house rules and players use the selected Game Master's rules.
- [ ] Implement genres in order: Fantasy Hero, Western Hero, Star Hero, Pulp Fiction Hero, then Champions superheroic worlds that can build on the other genres.

### Engine Evolution — ON HOLD Until Further Notice

Completed standalone C# foundations and host-neutral documentation remain in the [archive](heroes-completed.md#engine-evolution--completed-foundations-further-work-on-hold). The development hold above applies to every task in this section.

- [ ] Evaluate desktop hosts against the available **Windows and Fedora Linux/KDE** test environments. Fedora/KDE support must be considered explicitly, including packaging, native integration, and embedded web-view requirements. No Mac is available; do not claim tested macOS support. Record actual platform versions and display sessions during validation.
- [ ] When implementation begins, introduce shared application contracts and a Razor Class Library for actual use cases, then compose them from separate Blazor and desktop hosts. Select the desktop framework explicitly before scaffolding; keep storage, file dialogs, credentials, and native services in host adapters. Test shared behavior and each adapter independently. See the host-neutral boundaries in `README.md`.
- [ ] After object interactions and genre models are complete and rulebook-aligned, assess, plan, and implement migration of the OOP model and functionality to C#.
- [ ] After the C# implementation, assess turning the model into an object/character/world engine and integrating it with game engines such as Unreal.
- [ ] Keep HERO game-management behavior rule-compliant while exploring a separate game-design mode for scientifically grounded, realism-oriented rates and related concepts.
