# Signed test downloads and Android browsing

The user approved a **clearly labeled test/prerelease**, not silently changing the
signed installers into production builds. The original metadata remains
`publicReleaseAllowed: false`; signed bytes and signatures are preserved.

## Publisher steps

1. Run `pnpm run helper:download:prepare`. This verifies both existing user-installer
   signatures and its SHA-256 digest using only the pinned public certificate in an
   isolated verification keyring. No private key or passphrase is used.
2. Prepared public files are under `artifacts/downloads/helper-v1.5.2-fedora44-test.1`.
   Only the user installer, signatures, checksum, signed build metadata and exported
   **public** certificate are staged. Existing outputs must match exactly.
3. Sign in to GitHub CLI locally: `gh auth login --hostname github.com --web`.
   Use your browser; do not send credentials or tokens in chat. This environment has
   no GitHub upload credentials by default.
4. Run `pnpm run helper:download:publish`. It creates/resumes a draft prerelease,
   uploads only the expected files without overwriting assets, then publishes the
   completed prerelease. It verifies the published asset inventory/digest.
   The release is explicitly a previously accepted build snapshot; its signed
   `fedora-build.json` records original source hashes. The tag is not a claim that
   the current website code produced those earlier signed bytes.
5. Deploy the updated website through the normal reviewed deployment process.
   The mandatory current-source installer rebuild/acceptance gate now writes both
   profiles under `artifacts/acceptance`, preserving already signed release snapshots.
   `helper:installer:refresh` / `helper:installer:check` use that acceptance directory;
   manual builds keep their original default location. `WURM_INSTALLER_OUTPUT_ROOT`
   can explicitly select another build/test root. This does not relax acceptance or
   make a new acceptance build a signed release. Local `sign-local` still selects the
   original release directory, not acceptance output.
   Uploading release assets does not deploy website changes.
6. Open `/site/downloads/` on the deployed site. It queries GitHub for the exact
   prerelease and refuses missing, incomplete, wrong-origin or wrong-hash assets.
   Before publication it explicitly says unavailable; it does not show a fake
   successful download or fall back to a source ZIP.

The signed developer installer is **not staged/uploaded**. It bundles project
reference documents, including the HERO rulebook PDF; public redistribution needs
permission/license clearance or a new package excluding restricted material and
new signatures. Merely signing that archive does not grant redistribution rights.

The signed snapshot predates these website/publication changes. Do not rebuild
over signed files to make them appear current. Later helper releases require new
versioned output, acceptance and signatures. Production gates remain recorded in
[steering notes](steering-notes.md).

## Website behavior

The login/account pages link to the download/setup page. A regular Fedora user
downloads a self-contained helper rather than installing Node or running dependency
commands. The page explains signature verification, normal-user installation, and
local account setup. No Windows/macOS/Android installer is advertised.

The website cannot open arbitrary SQLite files on the laptop. Desktop database
access still uses the existing authenticated localhost helper. No database driver,
server exposure or anonymous database endpoint is added.

Android users without a session enter a browsing shell for every HERO page,
including direct URLs and the root entry, without contacting localhost or signing
in. Database-backed editors/account handlers are **not mounted**; a disabled action
and explicit explanation replace them. Navigation alone grants no API permission.
Existing Android sessions falling back to anonymous/setup/error state also get
browsing shells. A valid connected session continues to use existing permissions.
This is not a native Android app, private-data cache or mock database.
