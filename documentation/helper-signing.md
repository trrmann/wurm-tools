# Installer signing and publisher trust

[Installer guide](helper-installer.md) | [README](../README.md)

## What is ready, and what is not

Fedora packages currently say **UNSIGNED TEST BUILD** and their metadata explicitly says they
are not approved for public release. No signing identity, certificate, private key, paid signing
service, release upload, or trust bypass has been created. Signing is a required future release
gate, alongside native acceptance. Local signing/verification automation is implemented and
tested with disposable identities; real release signing remains blocked until the protected
signing identity/token is provisioned. We can provision it together before public release;
never send a private key, certificate password, recovery key or signing token in chat.

A SHA-256 checksum detects changes **only if you trust its source**. Someone who can replace
the installer can often replace its checksum. A signature binds bytes to a signing identity;
users must independently trust that identity. Signing does not guarantee bug-free software,
prevent every warning, or promise absolute security.

## Automated local signing

The default production recommendation is an offline primary key and a dedicated hardware-backed
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

Each output gets a detached `.asc` file. Existing signatures are never overwritten; the builder
also refuses to replace signed outputs. Preserve them as immutable release evidence and use a
new version/output location for the next build. Fingerprints are public identifiers; private
keys stay in the agent/token. Use an independently authenticated public key for verification,
not a key downloaded blindly alongside an installer.

Signing a maintainer test build **does not** remove its unsigned-test/public-release-blocked
labels or satisfy native acceptance, license-compliance, Windows or publishing gates. This
automation intentionally does not publish anything or declare the artifact production-approved.
Disposable unprotected software keys are used only inside temporary isolated test homes; they
are not retained or recommended for real releases.

## Fedora: recommended signing plan

For the self-extracting `.run`, use detached OpenPGP signatures, not RPM signing (this is not
an RPM). Keep the primary key offline with protected recovery/revocation material. Prefer a
dedicated signing subkey on hardware or a restricted signing host. Use a separate test key
when exercising the process; do not treat it as the eventual public publisher identity.

Provisioning checklist, before any public release:

1. Choose the publisher name and a monitored contact address, and designate key custodians.
2. Create the primary key on a trusted offline machine; set expiry and prepare a revocation
   certificate. Make encrypted offline backups and test recovery without exposing secrets.
3. Create a dedicated signing subkey; keep its private material out of the repository,
   installers, ordinary CI artifacts and application computers. Restrict signing access.
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
