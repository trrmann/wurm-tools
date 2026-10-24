# Wurm Tools — Code & Standards Validation

This document tracks HTML, CSS, and standards validation for the **Wurm Tools** web application.

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

- **Prettier Code Formatting**: `npm run format:check` (validates all `.html`, `.css`, and `.js` files)
- **ESLint Code Quality**: `npm run lint` (multi-language linting covering `.html` via `@html-eslint`, `.css` via `@eslint/css`, and `.js` via `@eslint/js`)
- **Vitest Unit Test Suite**: `npm test`
- **Vite Production Build Verification**: `npm run build`

---

## 3. Environment-Targeted Deployment Quality Gates

The cross-platform deployment automation scripts (`scripts/deploy.ps1` and `scripts/deploy.sh`) enforce targeted quality gates per environment switch:

- **Single-Run Deployment Log**: Both scripts overwrite `.deploy.log` in the repository root on every invocation. Terminal output, command stdout/stderr, failed checks, and abort summaries are retained for diagnosis until the next run; no historical logs are kept. Bash captures the combined output and PowerShell uses a transcript. The scripts print the absolute log path when exiting after a failure (PowerShell also prints it on success). Read this log before rerunning deployment, since the next run replaces it. It is Git-ignored and must not be committed or published; review/redact any sensitive command output before sharing it. A failure to initialize logging aborts before deployment work. Shell syntax/PowerShell parameter-binding errors before script execution cannot be captured by in-script logging.
  - This applies to every target (`-dev`, `-preview`, `-prod`) on Fedora/Bash and Windows/PowerShell. The `scripts/deploy` Bash wrapper forwards to `deploy.sh`; Windows `deploy.cmd` forwards to `deploy.ps1`, so both inherit the same logging. Complete emitted service diagnostics are captured, not just the exit status or final summary; response bodies not emitted by a test tool cannot be recovered by deployment logging. Regression tests verify both stdout and stderr, including multiline output larger than the terminal summary. PowerShell is exercised on Fedora; native Windows behavior still requires validation on Windows.
- **Target Switch Validation**: Requires exactly one target switch from `{-dev; -preview; -prod; }`. Any attempt to combine multiple target switches or omit the target causes an immediate safe abort.
- **Pre-deployment Verification**: Every target executes Prettier formatting/checking, ESLint validation, the full Vitest suite, and Vite mode-specific compilation prior to touching Git.
- **Local HTML/CSS Validation**: Every target runs `npm run test:standards` against all HTML build entries and project stylesheets using the existing HTML/CSS ESLint rules. These source checks run locally without external services; they are not W3C conformance certification.
- **Environment-Specific All-Page Chrome Tests**: Preview and prod run all Lighthouse-style, CSS Overview, and Memory/leak suites against every Vite HTML build entry using a local preview of their just-built output. Dev runs unit tests and source checks without Chrome audits. All applicable local gates must pass before committing or pushing, and run again if a production rebase changes the source tree. Missing/error page responses fail verification.
- **No Partial Deployment Verification**: Skip-tests and individual Chrome-suite deployment flags are rejected. Standalone npm audit commands remain available for focused troubleshooting.
- **Post-Deployment W3C Checks**: After a production push and the Render deployment wait, full W3C HTML/CSS validation runs against every live page. On no-push or up-to-date production runs, `-w3c` explicitly reruns the full live suite without pushing again; `-w3c-HTML` and `-w3c-CSS` are compatibility aliases and cannot narrow it. The validator retries transient failures and honors `Retry-After`. Persistent rate limits or anti-bot blocks stop further requests to that service, report remaining pages as unvalidated, and fail the gate rather than reporting a pass. A production push attempts live Chrome checks even if W3C fails; the script aggregates failures and exits nonzero after all live gates, and cannot roll back the already-pushed deployment. W3C checks do not run for dev or preview. Use standalone npm W3C commands for focused live checks; external services cannot reach localhost.
- **Local Scope for `-dev` and `-preview`**: Aligned with `npm run dev` and `npm run preview`, `-dev` and `-preview` are strictly local environments and will never push code to GitHub.
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

### W3C service failures versus conformance errors

The W3C runner prints separate counts for passed checks, invalid page/service checks,
service failures, and skipped checks. Each page requires both HTML and CSS checks in
the full suite. Service failures and skipped checks are **not conformance results**.

Ordinary HTTP 429 rate limits retry up to three attempts, honoring `Retry-After`
or using 3- and 6-second backoff when it is absent. A confirmed Cloudflare browser
challenge (`cf-mitigated: challenge`) or HTTP 403 stops requests to that validator
immediately; repeatedly retrying cannot complete an interactive challenge.
The failure summary repeats the blocked service, HTTP status, page, and cause.

If the public services block command-line access, the gate remains failed even if
Chrome passes. Rebuilding or pushing the website does not fix the validator's
access policy. After service access is restored, run `npm run test:w3c` to recheck
all live pages without deploying again. A manual browser check can help diagnose
access but does not replace the automated all-page gate. If reliable public API
access cannot be obtained, explicitly plan deployment of maintained Nu/Jigsaw
validator instances and corresponding runner support; do not bypass challenges,
silently switch validators, skip checks, or label local lint as W3C certification.

---
