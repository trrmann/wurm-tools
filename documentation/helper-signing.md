# Installer signing and publisher trust

[Installer guide](helper-installer.md) | [README](../README.md)

## What is ready, and what is not

Fedora packages currently say **UNSIGNED TEST BUILD** and their metadata explicitly says they
are not approved for public release. No signing identity, certificate, private key, paid signing
service, release upload, or trust bypass has been created. Signing is a required future release
gate, alongside native acceptance. Local signing/verification automation is implemented and
tested with disposable identities; real release signing remains blocked until a signing
identity is provisioned locally. The one-laptop option below does not require a token.
We can provision it together before public release;
never send a private key, certificate password, recovery key or signing token in chat.

A SHA-256 checksum detects changes **only if you trust its source**. Someone who can replace
the installer can often replace its checksum. A signature binds bytes to a signing identity;
users must independently trust that identity. Signing does not guarantee bug-free software,
prevent every warning, or promise absolute security.

## Automated local signing

### Start here: one Fedora laptop, no security expertise required

**You do not need another computer, a hardware token, a paid certificate, or to
disconnect this laptop from the internet.** The earlier hardware/offline instructions
were an advanced option, not a practical requirement for your situation.

For these Fedora installers, the "certificate" is a **public OpenPGP certificate**:
a file people can use to check that an installer was signed by your identity.
GPG (a signing program already available on this laptop) creates it for free.
This is not a website HTTPS certificate or a Windows code-signing certificate.
It does not independently prove your legal name, automatically remove warnings,
or make Windows trust the application.

Here is all you need to understand:

- **Private key:** your signing credential. Keep it and its password private.
- **Public certificate:** safe to share. This lets other people check signatures,
  but cannot sign anything for you.
- **Fingerprint:** a long public identification number. The script selects it for
  you; you do not have to invent one, type a placeholder, or understand key IDs.
- **Signing:** adding a separate proof file alongside an installer, not encrypting
  the application or uploading it.

**The tradeoff:** this option keeps the private key on your normal laptop, protected
by a password you choose. Malware running on that laptop could steal or misuse it;
a password does not make an infected computer safe. Keep Fedora updated, use a strong
unique password and keep a private recovery backup. The script explains this and
requires `USE THIS LAPTOP` approval before creating anything. It does not quietly
change the existing hardware-only command into software signing.

#### 1. Open the project's terminal

In VS Code with Wurm Tools open, choose **Terminal > New Terminal**. Copy these
lines into that terminal, then press Enter:

```bash
cd "$HOME/Documents/Projects/WurmTools/wurm-tools"
source "$HOME/.nvm/nvm.sh"
nvm use
```

Use this terminal for the remaining steps. Do **not** add `sudo`. If one of these
commands fails, stop and share the error message, not a password or private file.
These instructions assume the existing project setup on this Fedora laptop.

#### 2. Create your signing identity once

```bash
pnpm run helper:signing:setup setup-local
```

The script will:

1. Explain that the keys will live on this laptop. Type `USE THIS LAPTOP` if you agree.
2. Ask for a publisher name: the name you want people to see, for example
   `Wurm Tools Publisher`. It then asks for a real contact email address you monitor.
   **Both become public** when you share the certificate.
3. Ask you to confirm creation. Type `CREATE PRIMARY`.
4. Open GPG's password prompt (a window or a terminal dialog). Choose a strong, unique,
   **nonempty** password and enter it twice. GPG calls this a "passphrase"; it means
   the same thing here. Use your password manager to retain it if you have one.
   Do not choose "no password" if offered. Never enter the password in chat or
   directly into a shell command. Key generation may take a little while.
5. Create the separate signing key automatically. GPG may ask for the same password
   again. There are no smartcard menus and nothing to buy.
6. Print `Setup complete` and the location of your public certificate.

The private signing folder is **`~/.wurm-tools-signing`**, meaning the hidden
`.wurm-tools-signing` folder inside your home folder. It is outside the project and
is not included in the installers. The script leaves existing GPG identities alone.
Do not commit, upload or share this folder.

Your shareable public certificate is **`~/.wurm-tools-signing/publisher-public.asc`**.
In KDE's file manager, press **Ctrl+L**, type that path and press Enter to locate it.
Only this public file is intended for sharing. A private key is not a certificate
that your users need.

The script requests password prompts but cannot prove you chose a strong/nonempty
password or that your disk is encrypted. Do not treat `Setup complete` as a security audit.

#### 3. Make a private recovery backup

You do not need an offline computer. A removable USB drive stored safely is useful
so a laptop failure does not destroy your signing identity.

After setup succeeds, run these commands in the same terminal:

```bash
gpg --homedir "$HOME/.wurm-tools-signing" --armor --output "$HOME/wurm-tools-private-recovery.asc" --export-secret-keys
gpg --symmetric --cipher-algo AES256 --output "$HOME/wurm-tools-private-recovery.asc.gpg" "$HOME/wurm-tools-private-recovery.asc"
```

The first command may ask for your signing password. The second asks you to choose
and repeat a **backup password**. Use a strong nonempty password and retain it
separately. Neither command uploads anything. Both refuse to overwrite an existing
output unless you approve; decline overwriting any existing backup.
If either command fails or is cancelled, stop: a successful backup is not established.

In the file manager:

1. Copy `wurm-tools-private-recovery.asc.gpg` from your home folder to your USB drive.
2. Check that the copy can be decrypted: type `gpg --decrypt ` into your terminal
   (including the final space), drag the encrypted copy from the USB drive into
   that terminal to insert its actual path, and append ` > /dev/null` before
   pressing Enter. Enter the backup password in the local password prompt.
   The `> /dev/null` part prevents private key contents appearing on screen.
   After it finishes, run `echo $?`: `0` means it decrypted successfully.
   Any other number or an error means the check failed. This checks readability,
   not a full restore. Do not share decrypted contents.
3. In the file manager, open `~/.wurm-tools-signing/openpgp-revocs.d` and copy its
   `.rev` file to the USB drive too. This is the emergency cancellation document
   for your identity. Keep it private; do not publish it as part of a normal release.
4. Once the encrypted copy is checked, delete `wurm-tools-private-recovery.asc`
   (the intermediate private export) from your home folder and empty the Trash.
   Deleting a file is not a promise of forensic erasure, particularly on SSDs.
5. Eject the USB drive and keep it in a safe place. Do not upload private backups
   or revocation files to GitHub or include them in a support message.

If you do not yet have removable storage, you can create the identity, but recovery
is **not complete**. Do not claim the release/recovery gate has passed. If your laptop
is lost before a usable backup exists, you may have to establish a new publisher identity.

#### 4. Build/test the installers, then sign them

```bash
pnpm run helper:installer:refresh
```

This rebuilds and tests **both** Fedora installers. It can take several minutes and
needs internet for build-time downloads. Wait for it to finish successfully.
Installer users still do not need downloads during installation.

Then run:

```bash
pnpm run helper:signing:setup sign-local
```

Review the displayed signing identity and type `SIGN BOTH`. Enter your signing
password in GPG's local prompt if asked. GPG may remember the password for a short
time, so not every signature requires another prompt. The script signs and verifies
both installers and their build information. Success ends with:

```text
Both Fedora installers and metadata signed and verified. No publishing or release-gate changes performed.
```

The original installers remain alongside new `.asc` signature files. **Your app has
not been uploaded or approved for public release.** Native desktop tests, license
review, publisher-key distribution and the other release checks still apply.
Signing does not remove the current test-build labels.

#### If something goes wrong

##### Recover after a timeout or cancelled password window

Do **not** delete the signing folder or generate a replacement identity. First let
the old command finish, or press **Ctrl+C** in its terminal to stop it. Close any
password window belonging to that old attempt. Do not run two setup/recovery commands
at once.

If the timeout happened while creating the identity, or you are unsure how far setup
got, run:

```bash
pnpm run helper:signing:setup recover-local
```

It examines the saved progress:

- **No identity was saved:** asks for `USE THIS LAPTOP`, your public name/email and
  `CREATE PRIMARY` again, then retries creation without deleting the folder.
- **The parent identity exists but its signing key is missing:** displays the existing
  public fingerprint and asks for `RECOVER SETUP`. It creates only the missing signing
  key. Enter the password you chose earlier in GPG's local window.
- **Both keys already exist:** asks for `RECOVER SETUP`, then restores a missing
  public certificate, or preserves it if it already matches. It does not create
  duplicate keys or change your identity.

Wait for `Setup complete`. Recovery never knows or resets your password. If you
forgot it, or keys are expired, revoked, unavailable or ambiguous, it stops with an
error rather than guessing, deleting keys or changing your identity.
If an existing public certificate differs, it leaves it untouched for inspection.

If setup completed and the timeout happened while signing the installers, rerun:

```bash
pnpm run helper:signing:setup sign-local
```

Type `SIGN BOTH` and enter your existing password when asked. This now verifies
completed signatures against the exact current files and selected identity, leaves
them unchanged, and creates only missing signatures. It works if one installer
finished before the other, or if only one signature in a pair exists. A corrupt,
wrong-key or mismatched signature blocks recovery; it is never overwritten.
Nothing is rebuilt, uploaded or published by recovery.

- **"Signing folder already exists":** use `recover-local` above, not folder deletion.
- **Password prompt cancelled or timed out again:** retry the corresponding recovery
  command after the old command exits. Do not paste passwords into a shell command.
- **Installer is stale:** run `helper:installer:refresh` again before signing.
- **Existing signatures:** `sign-local` verifies and preserves valid signatures when
  resuming. A later changed release still needs a new version/output location.
  Recovery does not let you alter signed files or bypass stale-source checks.
- **Expiry:** the signing key lasts one year; the parent identity lasts two years.
  Put renewal reminders in your calendar well before those dates. Expired keys are
  refused; ask for renewal help without sharing private material.
- **Lost laptop or suspected theft of keys:** stop signing/publishing. Use your private
  backup and emergency cancellation document with help to revoke the identity and
  announce a replacement through trusted channels.

No real identity is generated just by reading this guide or by running its tests.
The setup and signing steps require your local confirmation/password interaction.

### Guided hardware provisioning script

**Optional advanced alternative.** The following section is for people who already
have suitable hardware and an offline-primary process. It is **not required** for the
one-laptop workflow above; do not follow both workflows to create duplicate identities.

Start with the script's help; it performs no setup without an explicit action:

```bash
pnpm run helper:signing:setup --help
pnpm run helper:signing:setup inspect
```

The script is [provision-helper-signing.js](../scripts/provision-helper-signing.js).
It assists with provisioning; it cannot supply a physical token, prove disk encryption,
make an online laptop a trusted offline machine, or bypass local PIN/touch approval.
Obtain an **OpenPGP-compatible** token first (not a FIDO-only security key).
Use a new/empty token for this beginner workflow: any existing key slot blocks generation.
The script never resets a token, guesses factory PINs or replaces existing keys.
`inspect` does not modify the token; GPG may learn local public-key/card stubs.
GPG `scdaemon`, working smartcard access and local pinentry are prerequisites; missing
tools/card access fail explicitly. No packages or drivers are installed by this script.

**Two-machine/offline-storage workflow:**

1. On a trusted offline Linux machine, prepare this project and its locked dependencies
   beforehand. Use protected offline storage outside the checkout for the primary keyring.
   Run the script as your normal user in a real terminal, not through CI or chat tool commands.
2. Create a certification-only primary, with two-year expiry:

   ```bash
   pnpm run helper:signing:setup create-primary --home /offline-media/new-private-keyring
   ```

   This requires a new/nonexistent directory, typed `OFFLINE PRIMARY` and `CREATE PRIMARY`
   consent, public publisher name/email, and a strong nonempty passphrase entered only
   in GPG pinentry. The script cannot verify passphrase strength; do not accept an empty one.
   It prints the **public primary fingerprint**. GPG creates the revocation certificate under
   `openpgp-revocs.d`. Keep that certificate private: publication can revoke your identity.
   If generation fails, the script leaves the private keyring for local inspection; it does
   not delete secret material or retry creation over it.

3. Make and test encrypted offline recovery backups of the primary and revocation
   certificate using your trusted offline process. This script deliberately does not export
   private keys or pretend a backup has been made. Configure non-default user/admin PINs
   through local `gpg --card-edit` prompts or your token manufacturer's documented utility.
   Never put PINs in commands, scripts, logs or chat. Do not run a factory reset.
4. With only the intended empty token connected, generate its signing subkey on-card:

   ```bash
   pnpm run helper:signing:setup add-signing-key --home /offline-media/new-private-keyring --primary FULL_PRIMARY_FINGERPRINT
   ```

   Confirm that backup/PIN preparation is complete and type the exact token identifier
   when prompted. GPG's supported `addcardkey` menu handles token-dependent algorithms and
   PIN prompts. Select **Signature key** (normally option 1), set expiry (recommended `1y`),
   and approve locally. The script sends `save` after this operation and verifies the
   resulting token fingerprint, hardware-storage marker, signing capability and expiry.
   This is guided interaction, not blind menu-number/PIN automation. An interrupted
   generation can leave an on-card key: inspect/recover locally; do not reset/retry over it.
   On-card-generated private subkeys cannot be backed up. If the token is lost, use the
   offline primary to revoke the subkey and certify a replacement.

5. Export **public material only** to a new transfer file:

   ```bash
   pnpm run helper:signing:setup export-public --home /offline-media/new-private-keyring --primary FULL_PRIMARY_FINGERPRINT --output /transfer/publisher-public.asc
   ```

   Remove and securely retain the offline primary storage. On the online release laptop,
   independently compare the public fingerprint, import only this public file, insert
   the token and let GPG learn its key stubs:

   ```bash
   gpg --show-keys --with-fingerprint /transfer/publisher-public.asc
   gpg --import /transfer/publisher-public.asc
   gpg --card-status
   pnpm run helper:signing:setup inspect
   ```

   Do not transfer the private primary keyring to the release laptop. The guided signing
   action requires an offline/unavailable primary-secret stub (`#`) and a signing subkey
   whose fingerprint and full card identifier match the connected token.

6. On the release laptop, build/test the final installers **before** signing:

   ```bash
   pnpm run helper:installer:refresh
   pnpm run helper:signing:setup sign --fingerprint FULL_SIGNING_SUBKEY_FINGERPRINT
   ```

   The script checks both artifacts' source provenance/hash, refuses existing signatures,
   asks for exact fingerprint consent, then signs/verifies each installer and its metadata.
   PIN/touch prompts stay local. In this optional hardware workflow, if one profile succeeds and the next fails, it leaves
   those valid signatures intact and reports failure; inspect the output and use the
   low-level `resume`/verify commands below for the remaining profile. It never silently
   overwrites existing signatures or claims both succeeded after partial failure.
   Signing preserves current public-release-blocked labels and publishes nothing.

No hardware provisioning or real signing has been performed merely by adding/testing the
script. Native token generation/PIN/GUI tests still require your physical token and local
interaction. The test suite checks parsing, hardware binding, wrong/expired/software-key
rejection and refusal of unattended key creation without touching a real identity.

The higher-isolation production option is an offline primary key and a dedicated hardware-backed
signing subkey, with a PIN/passphrase handled by your local GPG agent/pinentry. No real signing
identity was visible during implementation; the automation does **not** silently generate one,
export secret material, accept a password argument, or store a PIN.

After provisioning the token/key, select its **full signing-subkey fingerprint**, not an email
address, short ID, or merely the primary key's fingerprint:

```bash
export GPG_TTY="$(tty)"
export WURM_SIGNING_FINGERPRINT='FULL_SIGNING_SUBKEY_FINGERPRINT'
pnpm run helper:installer:build:signed
```

This builds the offline user installer, runs isolated Fedora acceptance, signs the final `.run`
and `fedora-build.json`, then independently verifies **both exact signatures** and the artifact
hash. Missing/unavailable keys, incorrect fingerprints, failed token access, failed tests and
invalid/expired/revoked signatures fail explicitly. Signing and verification disable automatic
network key discovery. A token can still require a physical touch/PIN; secure automation does
not bypass that approval.
Offline verification can only recognize revocations already present in its local keyring.
Distribute authenticated public-key/revocation updates through the release process; disabling
network key discovery is not a claim that an old offline keyring knows about a recent compromise.

To sign/verify already tested outputs, including the separate developer bundle:

```bash
pnpm run helper:installer:sign
pnpm run helper:installer:verify
pnpm run helper:installer:sign artifacts/developer
pnpm run helper:installer:verify artifacts/developer
```

The low-level recovery action `node scripts/sign-helper-installer.js resume <directory>`
verifies existing signatures and fills only missing ones. It requires the same exact
fingerprint environment setting as normal signing. Normal `sign` retains its strict
no-existing-signatures behavior. For the one-laptop workflow, use `sign-local` instead:
it selects the dedicated identity and checks both profiles before resuming.

Each output gets a detached `.asc` file. Existing signatures are never overwritten; the builder
also refuses to replace signed outputs. Preserve them as immutable release evidence and use a
new version/output location for the next build. Fingerprints are public identifiers; private
keys stay in the local GPG keyring or token. Use an independently authenticated public key for verification,
not a key downloaded blindly alongside an installer.

Signing a maintainer test build **does not** remove its unsigned-test/public-release-blocked
labels or satisfy native acceptance, license-compliance, Windows or publishing gates. This
automation intentionally does not publish anything or declare the artifact production-approved.
Disposable unprotected software keys are used only inside temporary isolated test homes; they
are not retained or recommended for real releases.

## Fedora: publisher trust and release checks

For the self-extracting `.run`, use detached OpenPGP signatures, not RPM signing (this is not
an RPM). The one-laptop workflow keeps password-protected keys locally with private recovery
material; the optional advanced workflow keeps the primary offline and signing subkey on
hardware. Hardware isolation is stronger, not a prerequisite for the documented local option.
Use a separate test key
when exercising the process; do not treat it as the eventual public publisher identity.

Provisioning checklist, before any public release:

1. Choose the publisher name and a monitored contact address, and designate key custodians.
2. Create the identity using the chosen local or hardware workflow; set expiry and prepare
   a revocation certificate. Make encrypted private backups and test recovery without exposing secrets.
3. Create a dedicated signing subkey; keep its private material out of the repository,
   installers, ordinary CI artifacts and end-user installations. Restrict signing access.
4. Publish the **public** key and complete fingerprint in the release guide and a separately
   controlled, trusted channel. Document how users authenticate that fingerprint.
5. Test valid, modified, wrong-key, expired/revoked-key and mismatched-version artifacts before
   wiring the website download/update workflow. Do not turn off trust/signature checks.

Once a signing identity is provisioned, these are example maintainer commands, with the real
full fingerprint and approved artifact path supplied locally:

```bash
gpg --list-secret-keys --keyid-format long
gpg --armor --export "$SIGNING_FINGERPRINT" > publisher-public.asc
gpg --local-user "$SIGNING_FINGERPRINT" --armor --detach-sign \
  --output "$ARTIFACT.asc" "$ARTIFACT"
gpg --local-user "$SIGNING_FINGERPRINT" --armor --detach-sign \
  --output "$RELEASE_MANIFEST.asc" "$RELEASE_MANIFEST"
```

Only the public key, detached signatures, approved artifacts and nonsecret signed manifest
are distributed. Sign the final immutable bytes, after build/tests. The future release manifest
must cover versions, supported OS/architecture, artifact hashes, runtime/protocol/data compatibility,
and release trust state; merely changing an unsigned boolean does not make it trusted.

Users must import only the authenticated publisher public key, compare its full fingerprint,
then verify the exact file **before running it**:

```bash
gpg --show-keys --with-fingerprint publisher-public.asc
gpg --import publisher-public.asc
gpg --verify "$ARTIFACT.asc" "$ARTIFACT"
```

Require a successful signature from the expected publisher signing identity. A “good signature”
from a stranger is not publisher verification. A missing, invalid or unexpected signature blocks
installation/update in the future public handoff. Do not globally mark arbitrary keys trusted.
See the [official GnuPG commands manual](https://www.gnupg.org/documentation/manuals/gnupg/GPG-Commands.html).

## Windows: Authenticode for the future NSIS executable

Windows needs an appropriate publisher code-signing identity, not the Fedora OpenPGP key.
Evaluate a publicly trusted certificate with hardware-backed key custody or an eligible managed
signing service. Confirm identity-validation requirements, eligibility, region, ongoing cost,
renewal and CI integration before purchasing or provisioning anything. No service/provider
has been selected or authorized yet.

On a controlled Windows signing machine with the Windows SDK, a certificate-store example
(provider-backed identities can require their own integration) is:

```powershell
signtool sign /sha1 $CertificateThumbprint /fd SHA256 /tr $TimestampUrl /td SHA256 $Installer
signtool verify /pa /all /v $Installer
Get-AuthenticodeSignature -FilePath $Installer | Format-List Status,SignerCertificate,TimeStamperCertificate
```

Use the correct protected certificate and an approved RFC 3161 timestamp service. No PFX password
belongs on a command line, in source, or in a build log. Timestamp and verify the completed NSIS
`.exe` **after** packaging, then compute the release hash/sign the release manifest. Check the
expected publisher, chain, timestamp and signature status on a clean Windows 11 machine.
An unsigned/self-signed test executable is not a substitute for a publicly trusted release.
Authenticode does not guarantee immediate SmartScreen reputation or zero warnings.
See [Microsoft SignTool documentation](https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool).

## CI, release approval and incident response

- Build/test with no access to production signing keys. Keep unsigned artifacts private/test-only.
- Use protected release environments and explicit human approval. Prefer short-lived,
  narrowly scoped CI identity for a managed signer; restrict signing to reviewed immutable inputs.
  Separate build access from signing/release authorization.
- Verify the resulting signatures independently before publishing versioned GitHub Releases.
  The website must consume authenticated release metadata, not a mutable “latest” binary URL.
- Record artifact hash, signing fingerprint/certificate identity, commit, test results and approval.
  Never record private material.
- Renew before expiry; retain the previous public key/certificate information needed to verify
  historical releases. Announce replacement fingerprints through independently trusted channels.
- For compromise: disable signing/publishing immediately, revoke affected credentials/subkeys or
  certificates, identify affected releases, publish an authenticated advisory, block unsafe
  updates and issue a newly signed fixed release. Test the revocation/rotation process in advance.

These steps remain on the [installer roadmap](heroes-todo.md#installation-and-updates). Do not mark
the signing gate complete merely because an unsigned local package builds successfully.
