#!/usr/bin/env bash
# ==============================================================================
# Wurm Tools — Automated Deployment Script (Bash / Fedora & Linux)
# ==============================================================================
# Runs code verification (Prettier, ESLint, Vitest, and Vite build for target env),
# verifies git status, commits changes if requested (for -prod), and pushes to
# GitHub only for production when there are commits to push.
# Opens the live Render site in Google Chrome upon prod verification/deployment.
# Requires exactly one environment target switch: -dev, -preview, or -prod.
# -dev and -preview are local verification/build environments and never push to GitHub.
# For -prod, if uncommitted changes exist, a message argument is strictly required.
# If there are no new commits to push for -prod, pushing is safely skipped.
# ==============================================================================

set -euo pipefail

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Determine project root (one level up from script directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

DEPLOY_LOG_PATH="${PROJECT_ROOT}/.deploy.log"
if ! (umask 077; : > "${DEPLOY_LOG_PATH}"); then
  echo "[FAIL] Cannot overwrite deployment log: ${DEPLOY_LOG_PATH}" >&2
  exit 1
fi

deploy_main() {
trap 'status=$?; if [ "$status" -ne 0 ]; then printf "\n[FAIL] Deployment exited with status %s.\n[INFO] Deployment log: %s\n" "$status" "$DEPLOY_LOG_PATH"; fi' EXIT
echo "[INFO] Deployment log (overwritten each run): ${DEPLOY_LOG_PATH}"
echo "[INFO] Run started: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"

DEV_SET=false
PREVIEW_SET=false
PROD_SET=false
COMMIT_MESSAGE=""
AUTO_FORMAT=true
NO_LAUNCH=false
NO_PUSH=false
W3C_REQUESTED=false

BUMP_TYPE=""
NO_VERSION_COMMIT=false

# Seconds to wait after a push for Render to build and publish (default 5 minutes, 0 = no wait)
RENDER_WAIT=300

# Parse command-line flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    -dev|--dev)
      DEV_SET=true
      shift
      ;;
    -preview|--preview)
      PREVIEW_SET=true
      shift
      ;;
    -prod|--prod)
      PROD_SET=true
      shift
      ;;
    -m|--message|-CommitMessage|--CommitMessage)
      if [[ $# -lt 2 || "$2" =~ ^- ]]; then
        echo -e "${RED}[FAIL] Option $1 requires a non-empty string argument.${NC}"
        exit 1
      fi
      COMMIT_MESSAGE="$2"
      shift 2
      ;;
    --no-auto-format|-NoAutoFormat)
      AUTO_FORMAT=false
      shift
      ;;
    -s|--skip-tests|-SkipTests|--SkipTests)
      echo "Deployment verification requires all tests; --skip-tests is no longer supported." >&2
      exit 2
      ;;
    --no-launch|-NoLaunch|--no-open|-NoOpen)
      NO_LAUNCH=true
      shift
      ;;
    --no-push|-NoPush)
      NO_PUSH=true
      shift
      ;;
    --major|-Major)
      BUMP_TYPE="major"
      shift
      ;;
    --minor|-Minor)
      BUMP_TYPE="minor"
      shift
      ;;
    --patch|-Patch|--point|-Point)
      BUMP_TYPE="patch"
      shift
      ;;
    --no-version|--no-version-commit|-NoVersion|-NoVersionInCommit)
      NO_VERSION_COMMIT=true
      shift
      ;;
    -w3c|--w3c|-w3c-HTML|--w3c-html|-w3c-html|-w3c-CSS|--w3c-css|-w3c-css)
      W3C_REQUESTED=true
      shift
      ;;
    -Chrome|--chrome|-chrome)
      shift
      ;;
    -Lighthouse|--lighthouse|-lighthouse)
      echo "Preview and production verification require all Chrome suites; individual-suite flags are not supported. Use npm run test:lighthouse for a standalone audit." >&2
      exit 2
      ;;
    -CssOverview|--css-overview|-css-overview)
      echo "Preview and production verification require all Chrome suites; individual-suite flags are not supported. Use npm run test:css-overview for a standalone audit." >&2
      exit 2
      ;;
    -Memory|--memory|-memory)
      echo "Preview and production verification require all Chrome suites; individual-suite flags are not supported. Use npm run test:memory for a standalone audit." >&2
      exit 2
      ;;
    -RenderWait|--render-wait|-render-wait)
      if [ -z "${2:-}" ] || ! [[ "$2" =~ ^[0-9]+$ ]]; then
        echo "Error: $1 requires a non-negative number of seconds." >&2
        exit 1
      fi
      RENDER_WAIT="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: ./deploy.sh {-dev | -preview | -prod} [OPTIONS]"
      echo ""
      echo "Environment Targets (exactly one required):"
      echo "  -dev, --dev           Local development verification and build (mode: development). Never pushes."
      echo "  -preview, --preview   Local preview verification and build (mode: preview). Never pushes."
      echo "  -prod, --prod         Production deployment (mode: production). Pushes to GitHub and opens Render in Chrome."
      echo ""
      echo "Options:"
      echo "  -m, --message <msg>   Commit message for pending changes (REQUIRED for -prod if uncommitted changes exist)"
      echo "  --no-auto-format      Skip Prettier auto-formatting (enabled by default)"
      echo "  All targets require unit tests and local HTML/CSS checks; preview/prod also require all-page Chrome tests."
      echo "  Production pushes require full live W3C HTML/CSS validation after the Render deployment wait."
      echo "  Use -w3c to rerun the full live W3C suite after a prior W3C service failure (without pushing again)."
      echo "  --no-open             Skip opening the live Render site in Google Chrome on prod deployment"
      echo "  --no-push             Verify and build without pushing to GitHub"
      echo "  -w3c, --w3c           Rerun the full live W3C suite on prod; never narrows checks"
      echo "  -w3c-HTML, -w3c-CSS   Compatibility flags; full HTML + CSS validation still runs"
      echo "  -Chrome, --chrome     Compatibility flag; Chrome tests run for preview/prod, not dev"
      echo "  Skip-tests and individual Chrome-suite flags are rejected."
      echo "  -RenderWait <secs>    Seconds to wait after a prod push for Render to publish (default 300, 0 = none)"
      echo "  -h, --help            Show this help dialog"
      exit 0
      ;;
    *)
      echo -e "${RED}[FAIL] Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

TARGET_COUNT=0
TARGETS=()
if [ "${DEV_SET}" = true ]; then
  TARGET_COUNT=$((TARGET_COUNT + 1))
  TARGETS+=("-dev")
fi
if [ "${PREVIEW_SET}" = true ]; then
  TARGET_COUNT=$((TARGET_COUNT + 1))
  TARGETS+=("-preview")
fi
if [ "${PROD_SET}" = true ]; then
  TARGET_COUNT=$((TARGET_COUNT + 1))
  TARGETS+=("-prod")
fi

if [ ${TARGET_COUNT} -eq 0 ]; then
  echo -e "\n${RED}[FAIL] Missing environment target switch. Exactly one target is required: -dev, -preview, or -prod.${NC}"
  echo -e "${YELLOW}Usage: ./deploy.sh {-dev | -preview | -prod} [-m <message>] [--no-auto-format] [--no-open] [--no-push]${NC}\n"
  exit 1
fi

if [ ${TARGET_COUNT} -gt 1 ]; then
  echo -e "\n${RED}[FAIL] Multiple environment target switches specified (${TARGETS[*]}). Only 1 target switch is allowed.${NC}"
  echo -e "${YELLOW}Please specify exactly one environment target: -dev, -preview, or -prod.${NC}\n"
  exit 1
fi

if [ "${DEV_SET}" = true ]; then
  TARGET_ENV="dev"
  VITE_MODE="development"
  DISPLAY_NAME="Development"
elif [ "${PREVIEW_SET}" = true ]; then
  TARGET_ENV="preview"
  VITE_MODE="preview"
  DISPLAY_NAME="Preview"
else
  TARGET_ENV="prod"
  VITE_MODE="production"
  DISPLAY_NAME="Production"
fi

echo -e "${CYAN}==========================================================${NC}"
echo -e "${CYAN}         Wurm Tools — Deployment Automation (${DISPLAY_NAME})${NC}"
echo -e "${CYAN}==========================================================${NC}"
echo -e "${CYAN}Environment Target: ${TARGET_ENV} (${DISPLAY_NAME})${NC}"
echo -e "${GRAY}Working Directory : ${PROJECT_ROOT}${NC}\n"

# Helper function to execute a step with safe stop on error
invoke_step() {
  local step_name="$1"
  shift
  echo -e "${CYAN}>>> [${step_name}] Starting...${NC}"
  if ! "$@"; then
    echo -e "\n${RED}[FAIL] Step '${step_name}' failed.${NC}"
    echo -e "${RED}[ABORT] Deployment aborted safely. Fix the issue and re-run deploy.sh.${NC}"
    exit 1
  fi
  echo -e "${GREEN}[PASS] ${step_name} completed successfully.${NC}\n"
}

POST_DEPLOYMENT_FAILURES=()
invoke_post_deployment_step() {
  local step_name="$1"
  shift
  echo -e "${CYAN}>>> [${step_name}] Starting...${NC}"
  if "$@"; then
    echo -e "${GREEN}[PASS] ${step_name} completed successfully.${NC}\n"
    return 0
  else
    local status=$?
    echo -e "\n${RED}[FAIL] Step '${step_name}' failed with status ${status}; continuing remaining live checks.${NC}\n"
    POST_DEPLOYMENT_FAILURES+=("${step_name} (status ${status})")
    return 1
  fi
}

launch_when_ready() {
  local url="${1:-http://localhost:3000}"
  local timeout="${2:-30}"
  local timeout_ms=$((timeout * 1000))
  echo -e "${CYAN}>>> Forking background monitor (polling ${url} for HTTP 200 within ${timeout}s)...${NC}"
  node "${SCRIPT_DIR}/launch-when-ready.js" "${url}" "${timeout_ms}" &
}

# 0. Check dependencies
if [ ! -d "node_modules" ]; then
  invoke_step "Install Dependencies" npm install
fi

# Clean up legacy .vite cache in node_modules if present to avoid OneDrive lock issues
if [ -d "node_modules/.vite" ]; then
  rm -rf "node_modules/.vite" 2>/dev/null || true
fi

# 1. Formatting Check (AutoFormat is default true unless --no-auto-format is passed)
verify_target() {
  if [ "${TARGET_ENV}" = "prod" ]; then
    invoke_step "Local W3C Validator Prerequisites" node "${SCRIPT_DIR}/w3c-local.js" --check-tools
  fi
  if [ "${AUTO_FORMAT}" = true ]; then
    invoke_step "Auto-Format Code (Prettier)" npm run format
  else
    echo -e "${GRAY}[INFO] Skipping auto-format (--no-auto-format flag specified).${NC}"
  fi
  invoke_step "Prettier Code Style Check" npm run format:check
  invoke_step "ESLint Code Quality Check" npm run lint
  invoke_step "Vitest Unit Test Suite" npm test
  invoke_step "Vite Build (${DISPLAY_NAME} / mode: ${VITE_MODE})" npm run build -- --mode "${VITE_MODE}"
  invoke_step "Local HTML & CSS Validation (All Pages)" npm run test:standards
  if [ "${TARGET_ENV}" = "dev" ]; then
    CHROME_RESULT="NOT REQUIRED (development target)"
    echo -e "${CYAN}[INFO] Development verification does not run Chrome audits.${NC}"
  else
    invoke_step "All Chrome Tests against local preview (All Pages)" \
      node "${SCRIPT_DIR}/run-with-server.js" preview 4173 -- \
      node "${SCRIPT_DIR}/test-chrome.js" --all --url "http://localhost:4173"
    CHROME_RESULT="PASSED (all suites, all pages, local preview)"
  fi
}

verify_target
# 5. Git Status & Verification
echo -e "${CYAN}>>> [Git Status Check] Verifying repository state...${NC}"

STATUS_OUTPUT="$(git status --porcelain)"
HAS_PUSHED=false

if [ "${TARGET_ENV}" = "prod" ]; then
  # Advance project version if bump flag was provided
  if [ -n "${BUMP_TYPE}" ]; then
    invoke_step "Advance Project Version (${BUMP_TYPE})" node "${SCRIPT_DIR}/version.js" "${BUMP_TYPE}"
    STATUS_OUTPUT="$(git status --porcelain)"
  fi

  if [ -n "${STATUS_OUTPUT}" ]; then
    echo -e "${YELLOW}[INFO] Uncommitted changes detected for production deployment:${NC}"
    git status --short

    TRIMMED_MSG="$(echo "${COMMIT_MESSAGE}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    if [ -z "${TRIMMED_MSG}" ]; then
      echo -e "\n${RED}[FAIL] Production deployment aborted: Uncommitted changes detected, but no commit message argument was provided.${NC}"
      echo -e "${RED}For production (-prod), a message argument (-m / --message <string>) is required when uncommitted changes exist.${NC}\n"
      echo -e "${YELLOW}Example: ./deploy.sh -prod -m \"feat: release version 1.1.0\"${NC}\n"
      exit 1
    fi

    invoke_step "Stage Changes" git add -A

    # Resolve version to prefix commit message automatically
    CURRENT_VERSION="$(node "${SCRIPT_DIR}/version.js" --get 2>/dev/null || echo "")"
    PROCESSED_MSG="${TRIMMED_MSG}"
    if [ "${NO_VERSION_COMMIT}" = false ] && [ -n "${CURRENT_VERSION}" ]; then
      if [[ ! "${PROCESSED_MSG}" =~ ^\[?v?[0-9]+\.[0-9]+\.[0-9]+ ]]; then
        PROCESSED_MSG="[v${CURRENT_VERSION}] ${PROCESSED_MSG}"
        echo -e "${CYAN}[INFO] Attached project version v${CURRENT_VERSION} to commit message.${NC}"
      fi
    fi

    TRAILER="Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
    FULL_MSG="${PROCESSED_MSG}

${TRAILER}"

    invoke_step "Commit Changes (Production)" git commit -m "${FULL_MSG}"
  else
    echo -e "${GRAY}Working tree clean; no uncommitted changes.${NC}"
  fi

  # Check if there are any commits to push to origin main
  git fetch origin main --quiet 2>/dev/null || true

  # If origin/main has commits this branch lacks (e.g. a merged PR), a push would be rejected
  # as non-fast-forward. Rebase onto origin/main first; abort cleanly on conflicts.
  BEHIND_COUNT="$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)"
  BEHIND_COUNT="$(echo "${BEHIND_COUNT}" | tr -d '[:space:]')"
  if [ "${BEHIND_COUNT:-0}" -gt 0 ] && [ "${NO_PUSH}" = false ]; then
    echo -e "${YELLOW}[INFO] Branch is ${BEHIND_COUNT} commit(s) behind origin/main; rebasing before push.${NC}"
    if ! git rebase origin/main; then
      git rebase --abort 2>/dev/null || true
      echo -e "${RED}[FAIL] Rebase onto origin/main hit conflicts and was aborted. Resolve manually, then re-run.${NC}"
      exit 1
    fi
    # A rebase changes the source tree; the pushed code must pass the same full gate.
    verify_target
  fi

  AHEAD_COUNT=0
  if git rev-list --count origin/main..HEAD >/dev/null 2>&1; then
    AHEAD_COUNT="$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)"
    AHEAD_COUNT="$(echo "${AHEAD_COUNT}" | tr -d '[:space:]')"
  fi

  if [ "${AHEAD_COUNT:-0}" -gt 0 ]; then
    if [ "${NO_PUSH}" = false ]; then
      CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
      if [ "${CURRENT_BRANCH}" != "main" ]; then
        echo -e "${YELLOW}[WARN] Current branch is '${CURRENT_BRANCH}' (not 'main').${NC}"
        read -r -p "Do you want to deploy branch '${CURRENT_BRANCH}' to origin main? (y/N) " CONFIRM
        if [[ ! "${CONFIRM}" =~ ^[Yy]$ ]]; then
          echo -e "${YELLOW}[ABORT] Production deployment cancelled by user.${NC}"
          exit 0
        fi
      fi
      invoke_step "Push to GitHub (origin main: ${AHEAD_COUNT} commit(s) ahead)" git push origin HEAD:main
      HAS_PUSHED=true
    else
      echo -e "${YELLOW}[INFO] Skipping push to GitHub (--no-push flag set).${NC}\n"
    fi
  else
    echo -e "${CYAN}[INFO] Local branch is up to date with origin/main. Nothing to push to prod.${NC}\n"
  fi
else
  # dev or preview: strictly local environments, never push to GitHub
  if [ -n "${STATUS_OUTPUT}" ]; then
    echo -e "${YELLOW}[INFO] Uncommitted changes detected in working directory:${NC}"
    git status --short
    echo -e "${GRAY}[INFO] Environment is local (${DISPLAY_NAME}). Working changes remain local.${NC}\n"
  else
    echo -e "${GRAY}Working tree clean.${NC}"
  fi
  echo -e "${CYAN}[INFO] Environment is local ${DISPLAY_NAME} (matches 'npm run ${TARGET_ENV}'). Skipping push to GitHub.${NC}\n"
fi

# Wait for Render to pull the new commit from GitHub and publish it before any live-site testing
if [ "${TARGET_ENV}" = "prod" ] && [ "${HAS_PUSHED}" = true ] && [ "${RENDER_WAIT}" -gt 0 ]; then
  echo -e "${CYAN}>>> Waiting ${RENDER_WAIT} seconds for Render to build and publish the pushed commit (override with -RenderWait <seconds>)...${NC}"
  for ((remaining = RENDER_WAIT; remaining > 0; remaining -= 5)); do
    printf "\r  %4d seconds remaining " "${remaining}"
    if [ "${remaining}" -ge 5 ]; then sleep 5; else sleep "${remaining}"; fi
  done
  printf "\r%40s\r" ""
  echo -e "${CYAN}[INFO] Render wait complete.${NC}\n"
fi

# 6. W3C Standards Validation Suite
W3C_RESULT="NOT RUN (no production deployment)"
if [ "${TARGET_ENV}" = "prod" ] && { [ "${HAS_PUSHED}" = true ] || [ "${W3C_REQUESTED}" = true ]; }; then
  echo -e "${CYAN}>>> [W3C Standards Check] Local official validators checking live site pages; public validator services disabled.${NC}"
  if [ "${HAS_PUSHED}" = true ]; then
    W3C_STEP="W3C Full Validation Suite (HTML5 & CSS across All Pages)"
  else
    W3C_STEP="W3C Full Validation Suite (Explicit Live Recheck)"
  fi
  if invoke_post_deployment_step "${W3C_STEP}" npm run test:w3c; then
    W3C_RESULT="PASSED (HTML and CSS, all live production pages)"
  else
    W3C_RESULT="FAILED (see W3C output; other live checks will continue)"
  fi
else
  echo -e "${CYAN}[INFO] External W3C validation runs only after a production push and deployment wait.${NC}\n"
fi

# 7. Chrome Automated Testing Suite (Lighthouse, CSS Overview, Memory)
if [ "${TARGET_ENV}" = "prod" ] && [ "${HAS_PUSHED}" = true ]; then
  if invoke_post_deployment_step "Chrome Tests against Render (https://wurm-tools.onrender.com)" \
    node "${SCRIPT_DIR}/test-chrome.js" --all
  then
    CHROME_RESULT="PASSED (all suites, all pages, local preview and Render)"
  else
    CHROME_RESULT="FAILED (see live Chrome audit output)"
  fi
fi

if [ "${#POST_DEPLOYMENT_FAILURES[@]}" -gt 0 ]; then
  echo -e "${RED}[FAIL] Post-deployment validation failed:${NC}"
  printf '  - %s\n' "${POST_DEPLOYMENT_FAILURES[@]}"
  echo -e "${RED}[ABORT] At least one live gate failed. The production push already occurred; rerun failed live checks after resolving service issues.${NC}\n"
  exit 1
fi

# Ensure the local helper is running for every target (idempotent, detaches itself)
echo -e "${CYAN}>>> [Local Helper] Ensuring Wurm local helper is running...${NC}"
if ! node "${SCRIPT_DIR}/wurm-local.js"; then
  echo -e "${YELLOW}[WARN] Local helper failed to start; continuing without it.${NC}"
fi
echo

# 8. Post-Deployment Summary & Actions
echo -e "${GREEN}==========================================================${NC}"
echo -e "${GREEN}  [SUCCESS] ${DISPLAY_NAME} Verification Completed!${NC}"
echo -e "${GREEN}==========================================================${NC}"
echo -e "Environment : ${DISPLAY_NAME} (${TARGET_ENV})"
echo -e "Target Mode : Vite mode '${VITE_MODE}'"
echo -e "Chrome Tests: ${CHROME_RESULT}"
echo -e "W3C Tests   : ${W3C_RESULT}"

if [ "${TARGET_ENV}" = "prod" ]; then
  if [ "${HAS_PUSHED}" = true ]; then
    echo -e "GitHub Push : Pushed to origin main"
  else
    echo -e "GitHub Push : Skipped (already up to date, nothing to push)"
  fi
  echo -e "GitHub Repo : https://github.com/trrmann/wurm-tools"
  echo -e "Render Live : https://wurm-tools.onrender.com"
  echo -e "W3C HTML    : https://validator.w3.org/nu/?doc=https%3A%2F%2Fwurm-tools.onrender.com%2F"
  echo -e "W3C CSS     : https://jigsaw.w3.org/css-validator/validator?uri=https%3A%2F%2Fwurm-tools.onrender.com%2F"

  if [ "${HAS_PUSHED}" = true ] && command -v gh >/dev/null 2>&1; then
    echo -e "\n${CYAN}Monitoring GitHub Actions CI...${NC}"
    sleep 3
    gh run list --repo trrmann/wurm-tools --limit 2 || true
  fi

  # Poll Render in a detached monitor and launch Chrome only after it responds.
  if [ "${NO_LAUNCH}" = false ]; then
    launch_when_ready "https://wurm-tools.onrender.com" 300
  else
    echo -e "${GRAY}[INFO] Chrome launch skipped (--no-launch flag set).${NC}\n"
  fi

  echo -e "\n${GREEN}Deployment workflow finished.${NC}\n"
elif [ "${TARGET_ENV}" = "preview" ]; then
  echo -e "GitHub Push : Skipped (local preview environment)"
  echo -e "Local URL   : http://localhost:4173"

  # Fork background monitor to poll HTTP 200 and refork Chrome
  if [ "${NO_LAUNCH}" = false ]; then
    launch_when_ready "http://localhost:4173" 30
  else
    echo -e "${GRAY}[INFO] Chrome launch skipped (--no-launch flag set)."
  fi

  echo -e "\n${CYAN}>>> Starting Vite preview server (running in foreground; press Ctrl+C to stop)...${NC}\n"
  npm run preview
else
  echo -e "GitHub Push : Skipped (local development environment)"
  echo -e "Local URL   : http://localhost:3000"

  # Fork background monitor to poll HTTP 200 and refork Chrome
  if [ "${NO_LAUNCH}" = false ]; then
    launch_when_ready "http://localhost:3000" 30
  else
    echo -e "${GRAY}[INFO] Chrome launch skipped (--no-launch flag set)."
  fi

  echo -e "\n${CYAN}>>> Starting Vite development server (running in foreground; press Ctrl+C to stop)...${NC}\n"
  npm run dev
fi
}

deploy_main "$@" 2>&1 | tee "${DEPLOY_LOG_PATH}"
