# Wurm Tools — Code & Standards Validation

This document tracks HTML, CSS, and standards validation for the **Wurm Tools** web application.

**Quick navigation:** [Standalone W3C commands](#standalone-w3c-validation-no-deployment) ·
[Java and validator setup](#local-official-w3c-validators) ·
[Deployment gates and logs](#3-environment-targeted-deployment-quality-gates)

---

## 1. Live Validation Links (Render Deployment)

- **Live URL**: [https://wurm-tools.onrender.com/](https://wurm-tools.onrender.com/)

### W3C HTML Validation (Nu HTML Checker)

- **Direct Check**: [https://validator.w3.org/nu/?doc=https%3A%2F%2Fwurm-tools.onrender.com%2F](https://validator.w3.org/nu/?doc=https%3A%2F%2Fwurm-tools.onrender.com%2F)
- **General W3C Validator**: [https://validator.w3.org/](https://validator.w3.org/)

### W3C CSS Validation (Jigsaw CSS Validator)

- **Direct Check**: [https://jigsaw.w3.org/css-validator/validator?uri=https%3A%2F%2Fwurm-tools.onrender.com%2F&profile=css3svg&usermedium=all&warning=1&vextwarning=&lang=en](https://jigsaw.w3.org/css-validator/validator?uri=https%3A%2F%2Fwurm-tools.onrender.com%2F&profile=css3svg&usermedium=all&warning=1&vextwarning=&lang=en)
- **General CSS Validator**: [https://jigsaw.w3.org/css-validator/](https://jigsaw.w3.org/css-validator/)

---

## 2. Automated CI & Code Quality Suite

In addition to manual W3C online validation, the project includes automated CI checks executed on every push and pull request via GitHub Actions, covering all **HTML**, **CSS**, and **JavaScript** files:

- **Prettier Code Formatting**: `pnpm run format:check` (validates all `.html`, `.css`, and `.js` files)
- **ESLint Code Quality**: `pnpm run lint` (multi-language linting covering `.html` via `@html-eslint`, `.css` via `@eslint/css`, and `.js` via `@eslint/js`)
- **Vitest Unit Test Suite**: `pnpm test`
- **Vite Production Build Verification**: `pnpm run build`

---

## 3. Environment-Targeted Deployment Quality Gates

The cross-platform deployment automation scripts (`scripts/deploy.ps1` and `scripts/deploy.sh`) enforce targeted quality gates per environment switch:

- **Single-Run Deployment Log**: Both scripts overwrite `.deploy.log` in the repository root on every invocation. Terminal output, command stdout/stderr, failed checks, and abort summaries are retained for diagnosis until the next run; no historical logs are kept. Bash captures the combined output and PowerShell uses a transcript. The scripts print the absolute log path when exiting after a failure (PowerShell also prints it on success). Read this log before rerunning deployment, since the next run replaces it. It is Git-ignored and must not be committed or published; review/redact any sensitive command output before sharing it. A failure to initialize logging aborts before deployment work. Shell syntax/PowerShell parameter-binding errors before script execution cannot be captured by in-script logging.
  - This applies to every target (`-dev`, `-preview`, `-prod`) on Fedora/Bash and Windows/PowerShell. The `scripts/deploy` Bash wrapper forwards to `deploy.sh`; Windows `deploy.cmd` forwards to `deploy.ps1`, so both inherit the same logging. Complete emitted service diagnostics are captured, not just the exit status or final summary; response bodies not emitted by a test tool cannot be recovered by deployment logging. Regression tests verify both stdout and stderr, including multiline output larger than the terminal summary. PowerShell is exercised on Fedora; native Windows behavior still requires validation on Windows.
- **Target Switch Validation**: Requires exactly one target switch from `{-dev; -preview; -prod; }`. Any attempt to combine multiple target switches or omit the target causes an immediate safe abort.
- **Pre-deployment Verification**: Every target executes Prettier formatting/checking, ESLint validation, the full Vitest suite, and Vite mode-specific compilation prior to touching Git.
- **Production installer gate**: Production also rebuilds and accepts both offline Fedora
  installer profiles before Git operations, repeating after a source-changing rebase.
  Source fingerprints and artifact hashes prevent acceptance of stale packages.
  This currently requires the Fedora x64 release host with nvm/pnpm and developer-package
  prerequisites. Windows production deployment remains blocked pending its release workflow;
  dev/preview do not require installer builds. See [installer operations](helper-installer.md).
- **Local HTML/CSS Validation**: Every target runs `pnpm run test:standards` against all HTML build entries and project stylesheets using the existing HTML/CSS ESLint rules. These source checks run locally without external services; they are not W3C conformance certification.
- **Environment-Specific All-Page Chrome Tests**: Preview and prod run all Lighthouse-style, CSS Overview, and Memory/leak suites against every Vite HTML build entry using a local preview of their just-built output. Dev runs unit tests and source checks without Chrome audits. All applicable local gates must pass before committing or pushing, and run again if a production rebase changes the source tree. Missing/error page responses fail verification.
- **No Partial Deployment Verification**: Skip-tests and individual Chrome-suite deployment flags are rejected. Standalone pnpm audit commands remain available for focused troubleshooting.
- **Post-Deployment W3C Checks**: After a production push and the Render deployment wait, local official Nu HTML and W3C CSS validators check every live page. Public online validator services are disabled. Production preflight checks Java and verified tools before Git operations. On no-push or up-to-date production runs, `-w3c` explicitly reruns the full live suite; compatibility aliases cannot narrow it. A production push attempts live Chrome even if W3C fails and aggregates failures afterward. Deployment W3C checks do not run for dev or preview; standalone commands can validate local preview explicitly.
- **Persistent W3C failure evidence**: After tool/Java preflight, each standalone/deployment W3C page-validation run also writes
  `.validation-results/w3c/<unique-run>/report.json`, independently of the overwritten
  `.deploy.log`. The report is updated after each page/check and retains target, tool,
  complete emitted stdout/stderr, exit code/signal, failures and final totals. Failed
  HTML/CSS diagnostics are repeated at the end, so a later Chrome pass cannot obscure them.
  Reports are Git-ignored, private local diagnostics; inspect/redact before sharing.
  They are not included in developer redistribution. No retries, skipped pages or
  weaker validation rules are used to turn a failure into a pass.
- **Local Scope for `-dev` and `-preview`**: Aligned with `pnpm run dev` and `pnpm run preview`, `-dev` and `-preview` are strictly local environments and will never push code to GitHub.
- **Production Git Commit Guard**: When deploying with `-prod`, the script inspects repository status for uncommitted changes (`git status --porcelain`). If changes are detected, a non-empty message argument (`-m` / `-CommitMessage`) is strictly required; deployments without an explicit message argument abort immediately with exit code 1.
- **Smart Push-to-Prod**: For `-prod`, if the working tree is clean and the local branch is already up to date with `origin/main`, the script skips pushing to GitHub.
- **Live Render Verification in Chrome**: After a production push and deployment wait, all three Chrome suites additionally audit every page on Render. No-push runs verify the local production build rather than an unchanged live site. The script then opens the live Render site (`https://wurm-tools.onrender.com`) in Google Chrome unless opening is disabled.

Each suite uses a disposable Chrome profile and its own debugging endpoint, waits for
main-document network-idle (including redirects), and cleans up its browser/profile.
Protected pages test signed-out access/login behavior, not authenticated editor internals.
Threshold failures print the full page URL and are repeated in the suite's failure
summary; Lighthouse also identifies each failing category and score. Fatal page
errors identify the active page, while browser-startup failures explicitly state
that no page was tested. The unified Chrome runner streams output and repeats
failed-suite diagnostics in its final summary, even when later suites pass.
Chrome has a separate 30-second startup deadline;
page-navigation and audit thresholds remain unchanged.

### Standalone W3C validation (no deployment)

If a production push already occurred and only W3C failed, run `pnpm run test:w3c`
without committing, pushing or redeploying. This checks **both HTML and CSS on every live page**.
Keep the failed run's report and compare it with the new report; a new success does not
explain an earlier failure whose diagnostics were lost. Use the first failed target/tool
and its raw diagnostics to distinguish document errors, invalid tool output, Java termination
and network/HTTP failures. Fix the actual cause before accepting that run.
The [steering register](steering-notes.md) tracks this requirement and the installer gates.

Run commands from the repository root after completing the
[developer prerequisites](#local-official-w3c-validators).
These commands use local official validators, not public W3C validator endpoints.

| Goal                                                                | Command                                         |
| ------------------------------------------------------------------- | ----------------------------------------------- |
| Check all live production pages, HTML and CSS                       | `pnpm run test:w3c`                             |
| Check all pages on an already-running local preview                 | `pnpm run test:w3c --url http://localhost:4173` |
| Check only live HTML                                                | `pnpm run test:w3c:html`                        |
| Check only live CSS                                                 | `pnpm run test:w3c:css`                         |
| Verify Java and cached validator tools without checking pages       | `pnpm run test:w3c:ready`                       |
| Download missing official validator jars and verify their checksums | `pnpm run test:w3c:setup`                       |

**Standalone pnpm validation never commits, pushes, or deploys.** All-page scope
comes from the Vite HTML build entries. Focused HTML/CSS commands are troubleshooting
tools; they do not replace the mandatory full deployment gate.

To check your current changes rather than the existing live deployment:

```sh
# Terminal 1: build the changes, then leave preview running.
pnpm run build
pnpm run preview
# Terminal 2: validate all preview pages.
pnpm run test:w3c --url http://localhost:4173
```

Use the actual preview port printed by Vite if 4173 is unavailable. A successful
preview run does not certify the current live site or deploy your changes.

#### Deployment flags are not W3C-only commands

Both deployment scripts accept an explicit live W3C recheck:

```sh
# Fedora/Bash:
bash scripts/deploy.sh -prod --no-push -w3c --no-open
```

```powershell
# Windows/PowerShell:
.\scripts\deploy.ps1 -Prod -NoPush -w3c -NoOpen
```

These still run the normal production verification and Git checks. `--no-push` /
`-NoPush` prevents pushing, not all other Git operations; dirty production worktrees
still require a commit message under the deployment policy. Use `pnpm run test:w3c`
when you want **only validation, with no Git changes**. Deployment aliases
`-w3c-HTML` and `-w3c-CSS` cannot narrow the mandatory full HTML + CSS check.

#### Keeping standalone output for diagnosis

Deploy scripts automatically overwrite `.deploy.log` and print its absolute path
on abort. Standalone pnpm commands do **not** automatically write that deployment log.
To capture a standalone run in the same single-run log:

```sh
# Fedora/Bash: preserve a failing validator exit status through tee.
set -o pipefail
pnpm run test:w3c 2>&1 | tee .deploy.log
```

```powershell
# PowerShell: capture both streams; inspect $LASTEXITCODE after completion.
pnpm.cmd run test:w3c 2>&1 | Tee-Object -FilePath .deploy.log
$LASTEXITCODE
```

Both overwrite the previous log. Do not run these concurrently with deployment
logging or another validation capture; read the log before another run replaces it.
Never commit the log, and redact sensitive diagnostics before sharing it.

### Local official W3C validators

Install Java 17+ on the deployment machine (Fedora: a supported OpenJDK runtime;
Windows: a supported Java distribution with `java` on PATH), then run:

Fedora developer setup (`bash scripts/setup.sh`) installs OpenJDK 21 if the active
Java is missing/older than 17 and downloads missing verified jars automatically.
Existing `.setup-complete` markers do not skip prerequisite checks. Project
dependencies use `pnpm install --frozen-lockfile` for initial/forced setup or a missing `node_modules`.
On Windows, after `pnpm.cmd install --frozen-lockfile`, run `.\scripts\setup-w3c.ps1`: it uses winget to
install Temurin 21 when needed and prepares the same verified jars. Package-manager
permission/license prompts remain interactive; unavailable installation tools,
failed downloads, incompatible PATH selections, or checksum mismatches fail visibly.
These setup scripts are developer tooling, not the future end-user installer.

```sh
pnpm run test:w3c:setup
pnpm run test:w3c:ready
pnpm run test:w3c
# Optional local preview or focused scope:
pnpm run test:w3c --url http://localhost:4173
pnpm run test:w3c:html
pnpm run test:w3c:css
```

Setup explicitly downloads official upstream jars into Git-ignored `.w3c-tools/`.
Validation itself never downloads missing tools or contacts public validator APIs.
Nu version 26.10.12 and W3C CSS release cssval-20250226 are SHA-256 pinned in
`scripts/w3c-local.js`; every run checks integrity. Nu's upstream `latest` URL can
change: a checksum mismatch fails closed until the version/digest is reviewed,
not silently updated. Standalone pnpm setup does not install Java; the developer
setup scripts above can install it when missing. Windows uses the same
Node/Java runner; native Windows validation remains required.

Every dynamically discovered HTML entry is fetched from the target URL and checked
by both validators, including linked CSS fetched by the CSS validator. Raw validator
stdout/stderr is streamed without suppression into the deployment log. Invalid
results, malformed output, unavailable pages, tool errors, and process timeouts
fail the gate. Checks continue across pages to collect diagnostics. Warnings and
Nu informational messages remain visible but are not treated as errors.

Public W3C services are disabled because Cloudflare challenges prevented automated
access. The old public runner rejects direct CLI execution; it is retained for
regression coverage only. This is official local validation of the target pages,
not a claim of W3C certification. Production checks still fetch the live website;
local preview success does not validate an unchanged production deployment.

---
