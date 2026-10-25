# PostgreSQL and pgAdmin preparation

## Current application backend: SQLite

SQLite remains the only active database backend. The helper continues using SQL.js/WASM,
existing SQLite files, backup/recovery workflows, and identity storage without modification.
pgAdmin manages PostgreSQL; it cannot open SQLite databases. Use SQLite tools or the existing
application exports for SQLite. This work adds developer utilities and discovery, not a new
connection string, PostgreSQL driver, schema migration, or runtime database dependency.

Quick links: [developer setup](../README.md#quick-start-local-development),
[offline installer](helper-installer.md), [remaining gates](heroes-todo.md).

## Fedora laptop discovery (2026-10-25)

Before changes:

- Node was `/usr/bin/node` 24.18.0, not the 24.22.1 project pin. No default nvm installation
  or shell activation was found. pnpm was not installed.
- PostgreSQL server/client RPMs, services, matching processes, port 5432 listener and
  this user's Podman database containers were absent. This does not exclude remote servers,
  another user's containers, or custom data directories. No private connection profiles,
  saved credentials, or application database contents were read.
- pgAdmin **9.18** was already installed as the system Flathub application
  `org.pgadmin.pgadmin4`, branch `stable`, runtime `org.freedesktop.Platform/25.08`.
  It was not an RPM or a command named `pgadmin4`.
- Native SQLite **3.51.2** and SQLite Browser **3.13.1** were installed. The application
  separately uses its locked SQL.js dependency, not the host SQLite library.

Approved changes and verification:

- Installed nvm **0.40.8**, activated checksum-verified Node **24.22.1 LTS**, set the default
  alias, and bootstrapped **pnpm 12.15.0** in that user-local Node installation.
  The user's Bash startup loads nvm; a newly opened interactive Bash resolves Node and pnpm
  beneath `$HOME/.nvm/versions/node/v24.22.1/`, and `nvm current` reports `v24.22.1`.
  Existing VS Code terminals must be reopened. Noninteractive scripts must explicitly load nvm.
- Installed Fedora 44 x64 `postgresql`, `postgresql-server`, and their private library
  dependency, version **18.6-1.fc44**. `postgres`, `psql`, `pg_dump`, and `pg_restore`
  report 18.6.
- PostgreSQL remains **inactive and disabled**. `/var/lib/pgsql/data/PG_VERSION` is absent;
  `pg_isready -h 127.0.0.1 -p 5432` reports no response. No cluster initialization,
  database/role creation, data migration, service enablement, or application switch was performed.
- Updated the existing pgAdmin stable Flatpak from commit
  `8fd358fd52b58653d68dc4d32b61ad660dce28a1ac713678a0ef87cefd91b95a` to
  `e8866866ad5dd23c14c23d09eee48f46acfe33d75c7fba29a063933ea69b69c2`;
  its application version remains 9.18. No saved server definitions were changed.

## Support policy (not an LTS product label)

[PostgreSQL's versioning policy](https://www.postgresql.org/support/versioning/) provides
five years of maintenance per major release, rather than an LTS edition. PostgreSQL 18 is
supported through **2030-11-14**; use current minor/security updates within the selected major.
Fedora's own lifecycle and repository maintenance are separate constraints. Major upgrades
require explicit approval, backups, compatibility testing and dump/restore or `pg_upgrade`;
never upgrade a cluster just because a newer major package exists.

[pgAdmin](https://www.pgadmin.org/download/) has stable releases, not an LTS edition.
The verified installed distribution is Flathub stable; it is not a claim that the Flatpak is
an official pgAdmin upstream package or that an LTS build exists.

## Offline redistribution contract

- Both installer profiles retain the application's SQLite/SQL.js/WASM runtime.
- The **developer profile only** also carries publisher-verified Fedora `postgresql`
  client RPMs and their dependency closure (`psql`, `pg_dump`, `pg_restore`, `pg_isready`),
  plus the native `sqlite` CLI. Their versions are inventoried and checked during installation.
- The redistributable developer installer does **not** install PostgreSQL server or pgAdmin,
  initialize/start a cluster, download tools, inspect credentials, or migrate SQLite.
  Server/GUI installation on this laptop was a separately approved administrative action.
- pgAdmin is optional external administration software. Launch the installed Flatpak with
  `flatpak run org.pgadmin.pgadmin4`. Provision it separately for offline environments.
  Flatpak sandbox access to host PostgreSQL utilities must be tested before configuring
  backup/restore binary paths; do not grant broad filesystem access as a shortcut.
- Review PostgreSQL and SQLite redistribution licenses, notices, versions, architecture,
  and native Windows packaging before public release. No Windows database tooling is shipped yet.

## Future integration steps (gated; not executed)

1. Approve a separate development cluster's data location, port, lifecycle, backup policy,
   and loopback-only access. Inspect any existing cluster first; never run initialization
   over a populated data directory.
2. Only after approval, initialize the Fedora cluster with `sudo postgresql-setup --initdb`
   and start it with `sudo systemctl start postgresql`. Enable startup only if explicitly wanted.
3. Create separate least-privileged application and migration roles/database. Keep secrets in
   approved local secret storage, never source, discovery notes, installer manifests or logs.
   Do not weaken authentication to `trust`.
4. In pgAdmin register the approved loopback host/port/database/role using interactive secret
   entry. Verify connection and backup/restore tools; no password is supplied by this project.
5. Inventory SQL.js calls, transaction semantics, schema, access checks and backup operations
   before selecting a PostgreSQL driver and introducing an explicit backend boundary.
6. Design opt-in SQLite export/import with reversible mappings, row-count/integrity checks,
   preserved ownership, and tested rollback. Retain SQLite as the default.
7. Test both backends independently (permissions, concurrency, recovery, migrations,
   offline/host-unavailable errors), then approve any production rollout separately.

## Repeatable, non-secret checks

```bash
source "$HOME/.nvm/nvm.sh"
nvm use
nvm current
command -v node pnpm
pnpm --version
psql --version
pg_dump --version
pg_restore --version
sqlite3 --version
systemctl is-active postgresql
systemctl is-enabled postgresql
pg_isready -h 127.0.0.1 -p 5432
flatpak info org.pgadmin.pgadmin4
```

Inactive service and no-response readiness exit codes are expected until a cluster is approved.
These checks do not prove a GUI connection or a database migration has passed.

## Migration validation

The migrated developer installer passed acceptance in a Fedora 44 container with networking
disabled: nvm selected Node 24.22.1, pnpm 12.15.0 performed a forced frozen offline reinstall
with supply-chain checks enabled, PostgreSQL/SQLite client versions were verified, and
PostgreSQL server was confirmed absent. All **546 tests across 53 files**, ESLint, the
production build, local HTML/CSS validation for **34 pages**, and W3C tool readiness passed.
The rebuilt user installer also passed its complete offline lifecycle acceptance.
VS Code was an external-editor fixture; native GUI/login, actual pgAdmin connection,
signing, Windows tooling, and production deployment remain separate gates.
