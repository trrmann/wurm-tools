# Local helper installation and release guide

[Back to README](../README.md) | [Signing and release trust](helper-signing.md) | [HERO roadmap](heroes-todo.md#installation-and-updates)

## Availability and support

**Current status: Fedora 44 KDE x64 unsigned maintainer test build. Not a public release.**
The package includes Node **24.22.1 LTS**, the helper, SQL.js/WASM, and required shared modules.
Installation, repair and update need no Git, pnpm, source checkout, or internet connection.
Stopping a detached helper does not require a systemd user session; login-startup service
checks apply only when no detached-helper semaphore is present.
Building the package does need pnpm dependencies and the official Node download.
**No installer may download prerequisites.** Build-time downloads are separate from installation.
“Up to date” means the reviewed/tested versions bundled in this installer, not an internet
lookup at install time. Newer upstream fixes require rebuilding and supplying a new installer.
Every helper payload file is integrity-checked and its managed components are replaced/repaired;
the manifest and `status` record their versions. Unrelated system software is not modified.

Windows 11 x64 will use a per-user NSIS executable; **Windows 10 x64 support is also requested**
and must be investigated and tested separately when Windows work begins. Record the exact
edition/build, OS support/ESU status, bundled-runtime support, shell and signing compatibility;
do not imply Windows 10 is supported because Windows 11 passes. Implementation/native acceptance
follow the Fedora/production work. Other Fedora versions, architectures and macOS are not
supported by this installer. Browser-only features remain available without it.

Do not publish unsigned test builds as normal downloads. The website retains its existing
source-install guidance until signed, tested release downloads and trusted release metadata
exist. Browser OS detection must eventually recommend a download, not prevent manual selection.
Neither a generated checksum nor `publicReleaseAllowed: false` is a digital signature.

## Maintainers: build and test Fedora

Use a normal user account on Fedora 44 x64, with the repository's development dependencies
restored (`pnpm install --frozen-lockfile`). Do not use `sudo` to run the installer or acceptance test.

```bash
pnpm run helper:installer:build
pnpm run helper:installer:test
```

The build downloads the pinned official Node archive if absent, verifies its SHA-256, then
caches it in `.installer-cache/`. A checksum mismatch fails closed; delete only the named bad
archive after investigating its origin. Rebuilding restores the lockfile's production dependencies
into a temporary directory with lifecycle scripts disabled. No local database, key, environment
file or development `node_modules` is copied into the package.

Outputs in ignored `artifacts/`:

- `wurm-tools-helper-<version>-fedora44-x64-unsigned.run`: self-extracting package.
- The matching `.run.sha256`: transport-integrity checksum, **not publisher authentication**.
- `fedora-build.json`: runtime/platform/version/hash metadata, explicitly unsigned and not public.

The embedded manifest enumerates and hashes every included regular file. Symlinks, traversal,
missing files, unlisted files and changed contents are rejected before installation.
The build includes the Node license and the installed SQL.js package/license.
The [Fedora CI job](../.github/workflows/ci.yml) rebuilds and tests on every normal CI run;
it does not publish releases or upload unsigned installers.

Acceptance uses temporary HOME/XDG/data locations with spaces, non-ASCII and URL-special characters,
a free loopback port, the actual bundled Node, and a working directory outside the checkout.
It tests SQLite/WASM writes, install/repair/update,
data/identity/pairing preservation, bad checksums, failed-update rollback, interrupted-update
recovery, locking, downgrade refusal, foreign port conflicts and data-preserving uninstall.
Startup command tests use an isolated `systemctl` fixture; **they do not prove real login startup**.
The running development helper and your normal data are not modified.

## Testing an installer deliberately

These commands are for a maintainer-approved **unsigned test artifact**, not instructions to
trust arbitrary `.run` files. Check the source/build provenance first. Never run as root.
Replace `<version>` with the built application version:

```bash
cd artifacts
sha256sum --check wurm-tools-helper-<version>-fedora44-x64-unsigned.run.sha256
bash wurm-tools-helper-<version>-fedora44-x64-unsigned.run --yes
```

Omit `--startup` unless you explicitly want login startup. An existing helper on the selected
port or a foreign `wurm-helper.service` is not stopped or overwritten. For a checkout-owned
helper, stop it from **that checkout** (`pnpm run helper:stop`); remove its old startup registration
explicitly if migrating. Do not run old and packaged helpers against the same data concurrently.

By default the management launcher is:

```bash
HELPER="${XDG_DATA_HOME:-$HOME/.local/share}/wurm-tools/helper/wurm-helper"
"$HELPER" status
"$HELPER" start
"$HELPER" setup-code
"$HELPER" pair-code
"$HELPER" stop
"$HELPER" startup-on
"$HELPER" startup-off
"$HELPER" uninstall --yes
```

Setup/pair codes are private: do not paste them into issue reports. The helper remains bound
to `127.0.0.1`; no firewall opening or public/LAN exposure is part of installation.
Return to the website's administrator setup and use **Check connection again**.

Rerun the installer for a repair or an approved newer version for an update. Startup preference
is preserved; `--startup` explicitly enables it. Downgrades are refused. No download, upgrade,
Git operation, website deployment or game-file modification happens automatically.

## Program files, settings and recovery

Program/runtime files live under `$XDG_DATA_HOME/wurm-tools/helper` (or
`~/.local/share/wurm-tools/helper`), in versioned `releases/` with a switched `current` link.
The stable launcher and manager remain outside the versioned payload. No desktop/menu shortcut
is installed yet; use the printed launcher path.

Existing HERO, identity, pairing and map-baseline paths remain unchanged. On first install the
manager records supported existing path, port, origin and Wurm install overrides privately in
`settings.json`. Default data paths, relative path overrides and the startup-unit location are
captured as absolute paths, so login startup or a different shell/XDG environment does not
silently open a new database. Later runs reuse them; setting a different shell variable does not silently
migrate an established installation. Stop the helper before deliberately changing settings.
User data must stay outside the replaceable helper program directory.

Default persistent locations:

| Data                | Fedora default                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------ |
| HERO SQLite         | `$XDG_DATA_HOME/wurm-tools/heroes.db` or `~/.local/share/wurm-tools/heroes.db`             |
| Identity/accounts   | HERO database path plus `.identity`                                                        |
| Pairing             | `$XDG_CONFIG_HOME/wurm-tools/helper-auth.json` or `~/.config/wurm-tools/helper-auth.json`  |
| Map baselines/edits | `$XDG_DATA_HOME/wurm-tools/map-baseline.db` or `~/.local/share/wurm-tools/map-baseline.db` |

Updates stop the owned helper, snapshot existing data/identity/pairing/map files privately,
switch the program, and require health ownership verification before recording success.
Failure restores the snapshots and prior program/startup preference. This is a stop-the-helper
snapshot, not support for concurrent external SQLite writers or arbitrary schema downgrades.

Logs are in `helper.log`, beside the launcher; systemd users can also inspect
`journalctl --user -u wurm-helper.service`. Backups remain in private `backups/` directories
and can contain credentials. Keep them protected; do not upload them or delete them casually.
Uninstall removes installed program/startup files but retains user data, settings, logs,
installation identity and backups. There is intentionally no automatic data purge.

If interrupted during update, do not delete `pending.json` or restore only the old binary.
After confirming the recorded installation PID is no longer running:

```bash
bash /path/to/the/trusted-installer.run --yes --recover
```

Recovery refuses a live installation lock, removes a stale lock only after a PID check,
restores the journal's file snapshots and previous program, and verifies restart. A malformed
lock requires manual inspection; do not remove one belonging to a running process. Recovery
errors are explicit and leave the journal/backups intact for investigation.

## Developer versus user setup

The **user profile** contains only the helper runtime. The separate **developer profile**
contains the JavaScript source, Bash/PowerShell deployment scripts, lockfile-restored development
dependencies, nvm 0.40.8, Node 24.22.1, pnpm 12.15.0 and official local W3C jars.
The pinned native pnpm executable is bundled, not bootstrapped during installation.
Build from the activated nvm environment described in the [README](../README.md#quick-start-local-development).
It also carries the complete official Fedora
RPM dependency closure for Git/SSH, Bash, shell utilities, Java 25, Chromium, GPG, GitHub CLI
and required package tools, PostgreSQL clients (`psql`, `pg_dump`, `pg_restore`, `pg_isready`)
and the native SQLite CLI. No PostgreSQL server or pgAdmin is installed by this profile;
SQLite/SQL.js remains the application backend. See [database discovery](database-development.md).
Fedora 44 repositories provide Java 25, not the Java 21 package
previously contemplated; the validators require Java 17 or newer.
The lockfile's pnpm content-addressable store and isolated registry-metadata cache are included,
without build-workspace links or user credentials. pnpm's supply-chain checks remain enabled.
The build verifies a forced offline dependency reinstall before packaging, so the managed
environment can restore/repair dependencies with `pnpm install --frozen-lockfile --offline` without registry access.

Build on Fedora 44 x64 with DNF download support, Podman, the official Fedora 44 container
image and the official Fedora signing keys already trusted. A disposable build container
generates local repository metadata with `createrepo_c`; nothing is installed on the host.
**Only this build step uses the network** to obtain missing/current packages:

```bash
podman pull registry.fedoraproject.org/fedora:44
pnpm run helper:installer:build:developer
```

Outputs are in `artifacts/developer/`. The developer `.run` is larger because dependencies
are included rather than fetched later. Its signed/hash-covered inventory records Node/pnpm,
every locked pnpm component, and RPM names/architectures/versions. Package signature checks
are mandatory; no `--nogpgcheck`, missing-dependency skip or online fallback is used.

For an approved test artifact, after verification:

```bash
bash wurm-tools-developer-<version>-fedora44-x64-unsigned.run --yes \
  --developer --approve-system-changes
```

The user explicitly authorized administrator installation of bundled system packages for this
profile. `--approve-system-changes` is still required at invocation if any component is absent
or older. The installer inventories **all bundled RPM components**, adds new required tools, upgrades
older matching installed components, retains newer installed versions without downgrade, and
rechecks the transaction. Transitive dependencies are available in a bundled local RPM repository;
DNF resolves them against compatible existing providers rather than forcing another Fedora
edition/identity or every alternative provider into the system. All network repositories are
disabled and local RPM signature checking stays enabled. Missing offline
dependencies, incompatible system state or failed package verification abort clearly; do not
solve them by allowing downloads. Approved system-package transactions are separate from
helper/database rollback and may update shared libraries used by other applications.

**VS Code is the explicit external prerequisite.** Its proprietary binary is not redistributed
inside this public package. Have an authorized administrator provision its original official
offline installer and verify its publisher signature beforehand. The developer profile detects
`code --version` and blocks if missing; it does not silently fetch or replace VS Code. Editor
extensions are not downloaded/installed by this installer either. See
[the Microsoft license](https://code.visualstudio.com/license) for the binary redistribution
restriction. Real VS Code editor acceptance is separate from the test fixture used in automated
container acceptance.

Developer source is installed into a new per-user managed workspace on every install/update,
under `$XDG_DATA_HOME/wurm-tools/developer/workspaces/`. Existing Git clones, source edits,
credentials and older managed workspaces are never overwritten or deleted. The fresh workspace
has a local Git repository and the public origin URL, but no copied credentials, automatic
commit, fetch, push or production deployment. The shipped source snapshot is staged so packaging
tools can inventory it; local activation/editor paths are excluded. It is **not** a clone of
upstream history. Review/reconcile it with the intended upstream branch and configure Git
identity before production deployment; the installer does not bypass Git/deployment safety checks.

Use the printed `.../wurm-tools/developer/wurm-dev` launcher:

```bash
/path/to/wurm-dev                  # developer shell with scoped PATH
/path/to/wurm-dev code .           # existing VS Code, opening this workspace
/path/to/wurm-dev deploy --help    # Bash deployment entry is on PATH
/path/to/wurm-dev pnpm test
/path/to/wurm-dev pnpm run build
```

The scoped environment loads its bundled nvm and selects the bundled Node without downloading.
It puts Node/pnpm, workspace scripts and pnpm
executables on PATH; the new workspace's VS Code terminal uses the same Node/scripts paths.
Its workspace configuration selects the private bundled pnpm store, metadata cache and offline mode.
The
toolchain is separate from the helper runtime so uninstalling the helper does not break the
developer workspace. Existing shell startup files and unrelated PATH settings remain unchanged.
Installed/bundled tool versions and workspace/toolchain locations are recorded in
`.../wurm-tools/developer/installed-components.json`. Old workspaces/toolchains are retained
deliberately; automatic cleanup or a complete developer-uninstall UI is not yet implemented.

Standalone legacy source setup (`bash scripts/setup.sh`) remains an **online developer setup**
workflow, not the offline installer's implementation. It must not be called as an installer
fallback. Held .NET/native tooling is not installed. Git pushes, remote live validation and
production deployments naturally require network later; offline installation does not grant
credentials or remove deployment approval/gates.

### Network-disabled developer acceptance

With Podman available and the official image obtained explicitly beforehand:

```bash
podman pull registry.fedoraproject.org/fedora:44
pnpm run helper:installer:test:developer
```

The test copies only the built package/test harness into a disposable Fedora container with
**network disabled**, installs the bundled RPM closure there (not on your host), checks
missing-editor refusal, and exercises developer tools, deployment PATH, lint/tests/build and
local-validator readiness. A labelled `code` fixture stands in for already provisioned VS Code;
it is not a redistributed editor or a claim of native editor/desktop acceptance.

## Outstanding release acceptance

The overall installer/Android prerequisite remains **open** until these pass:

1. Real Fedora 44 KDE login, logout/reboot, startup opt-out and multi-user/manual UI smoke tests.
2. Production deployment and its existing complete validation gates.
3. Windows NSIS implementation and native Windows 11 plus investigated Windows 10
   install/update/repair/uninstall tests,
   scheduled after production as requested.
4. Protected production signing identity, independent verification, rotation/revocation
   rehearsal and trusted release approval metadata. Local signing automation alone is not enough.
5. Signed GitHub Releases and website OS-recommended/manual-choice install/update handoff.
6. Both developer/user profile acceptance and remaining full roadmap scenarios.
7. Redistribution/license notices and any corresponding-source obligations for bundled
   open-source dependencies, before publishing the full developer package.

Node and dependency versions require a maintainer review monthly, plus urgent security rebuilds.
Update the pinned version/hash only from independently checked upstream metadata, rebuild, rerun
acceptance, and follow the signing guide. Never patch a published version's artifact in place.
