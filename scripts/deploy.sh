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

DEV_SET=false
PREVIEW_SET=false
PROD_SET=false
COMMIT_MESSAGE=""
AUTO_FORMAT=true
SKIP_TESTS=false
NO_LAUNCH=false
NO_PUSH=false

BUMP_TYPE=""
NO_VERSION_COMMIT=false

W3C_ALL=false
W3C_HTML=false
W3C_CSS=false

CHROME_ALL=false
LIGHTHOUSE=false
CSS_OVERVIEW=false
MEMORY=false

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
    -a|--auto-format|-AutoFormat|--AutoFormat)
      AUTO_FORMAT=true
      shift
      ;;
    -s|--skip-tests|-SkipTests|--SkipTests)
      SKIP_TESTS=true
      shift
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
    -w3c|--w3c)
      W3C_ALL=true
      shift
      ;;
    -w3c-HTML|--w3c-html|-w3c-html)
      W3C_HTML=true
      shift
      ;;
    -w3c-CSS|--w3c-css|-w3c-css)
      W3C_CSS=true
      shift
      ;;
    -Chrome|--chrome|-chrome)
      CHROME_ALL=true
      shift
      ;;
    -Lighthouse|--lighthouse|-lighthouse)
      LIGHTHOUSE=true
      shift
      ;;
    -CssOverview|--css-overview|-css-overview)
      CSS_OVERVIEW=true
      shift
      ;;
    -Memory|--memory|-memory)
      MEMORY=true
      shift
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
      echo "  -a, --auto-format     Auto-fix formatting with Prettier before checking"
      echo "  -s, --skip-tests      Skip the unit test suite"
      echo "  --no-open             Skip opening the live Render site in Google Chrome on prod deployment"
      echo "  --no-push             Verify and build without pushing to GitHub"
      echo "  -w3c, --w3c           Run full W3C validation (HTML + CSS) against live production site"
      echo "  -w3c-HTML             Run W3C HTML5 validation only against live production site"
      echo "  -w3c-CSS              Run W3C CSS validation only against live production site"
      echo "  -Chrome, --chrome     Run full Chrome test suite (Lighthouse, CSS Overview, Memory)"
      echo "  -Lighthouse           Run Chrome Lighthouse audit (Performance, Accessibility, Best Practices, SEO)"
      echo "  -CssOverview          Run Chrome CSS Overview audit"
      echo "  -Memory               Run Chrome Memory & DOM node leak testing"
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
  echo -e "${YELLOW}Usage: ./deploy.sh {-dev | -preview | -prod} [-m <message>] [--auto-format] [--skip-tests] [--no-open] [--no-push]${NC}\n"
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

open_render_in_chrome() {
  local url="${1:-https://wurm-tools.onrender.com}"
  echo -e "${CYAN}>>> Opening Render site in Google Chrome...${NC}"

  if command -v google-chrome >/dev/null 2>&1; then
    google-chrome "${url}" >/dev/null 2>&1 &
    echo -e "${GREEN}[PASS] Opened ${url} in Google Chrome.${NC}\n"
  elif command -v google-chrome-stable >/dev/null 2>&1; then
    google-chrome-stable "${url}" >/dev/null 2>&1 &
    echo -e "${GREEN}[PASS] Opened ${url} in Google Chrome.${NC}\n"
  elif command -v chromium >/dev/null 2>&1; then
    chromium "${url}" >/dev/null 2>&1 &
    echo -e "${GREEN}[PASS] Opened ${url} in Chromium.${NC}\n"
  elif command -v chromium-browser >/dev/null 2>&1; then
    chromium-browser "${url}" >/dev/null 2>&1 &
    echo -e "${GREEN}[PASS] Opened ${url} in Chromium.${NC}\n"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${url}" >/dev/null 2>&1 &
    echo -e "${GREEN}[PASS] Opened ${url} in default browser.${NC}\n"
  else
    echo -e "${YELLOW}[WARN] Could not detect a browser command (google-chrome/xdg-open).${NC}"
    echo -e "Please visit: ${url}\n"
  fi
}

launch_when_ready() {
  local url="${1:-http://localhost:3000}"
  local timeout="${2:-30}"
  local timeout_ms=$((timeout * 1000))
  echo -e "${CYAN}>>> Forking background monitor (polling ${url} for HTTP 200 within ${timeout}s)...${NC}"
  node "${SCRIPT_DIR}/launch-when-ready.js" "${url}" "${timeout_ms}" >/dev/null 2>&1 &
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
if [ "${AUTO_FORMAT}" = true ]; then
  invoke_step "Auto-Format Code (Prettier)" npm run format
else
  echo -e "${GRAY}[INFO] Skipping auto-format (--no-auto-format flag specified).${NC}"
fi

invoke_step "Prettier Code Style Check" npm run format:check

# 2. Linting Check
invoke_step "ESLint Code Quality Check" npm run lint

# 3. Unit Tests
if [ "${SKIP_TESTS}" = false ]; then
  invoke_step "Vitest Unit Test Suite" npm test
else
  echo -e "${YELLOW}[WARN] Skipping unit tests (--skip-tests flag set).${NC}\n"
fi

# 4. Vite Build for Target Environment
invoke_step "Vite Build (${DISPLAY_NAME} / mode: ${VITE_MODE})" npm run build -- --mode "${VITE_MODE}"

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

# 6. W3C Standards Validation Suite
# Automatically run for production when code was pushed to origin/main.
# Not run if no code was pushed to prod, unless an explicit switch (-w3c, -w3c-HTML, or -w3c-CSS) was passed.
RUN_W3C=false
W3C_MODE="all"

if [ "${W3C_HTML}" = true ]; then
  RUN_W3C=true
  W3C_MODE="html"
elif [ "${W3C_CSS}" = true ]; then
  RUN_W3C=true
  W3C_MODE="css"
elif [ "${W3C_ALL}" = true ]; then
  RUN_W3C=true
  W3C_MODE="all"
elif [ "${TARGET_ENV}" = "prod" ] && [ "${HAS_PUSHED}" = true ]; then
  # Automatic post-deploy W3C test on newly deployed code
  RUN_W3C=true
  W3C_MODE="all"
fi

if [ "${RUN_W3C}" = true ]; then
  echo -e "${CYAN}>>> [W3C Standards Check] Testing site pages against official W3C validators...${NC}"
  if [ "${TARGET_ENV}" = "prod" ] && [ "${HAS_PUSHED}" = true ]; then
    echo -e "${GRAY}>>> Pausing 5 seconds for Render webhook to register live build...${NC}"
    sleep 5
  fi

  case "${W3C_MODE}" in
    html)
      invoke_step "W3C HTML5 Validation Suite (All Pages)" npm run test:w3c:html
      ;;
    css)
      invoke_step "W3C CSS Validation Suite (All Pages)" npm run test:w3c:css
      ;;
    *)
      invoke_step "W3C Full Validation Suite (HTML5 & CSS across All Pages)" npm run test:w3c
      ;;
  esac
elif [ "${TARGET_ENV}" = "prod" ] && [ "${HAS_PUSHED}" = false ]; then
  echo -e "${CYAN}[INFO] No code was pushed to prod. W3C testing skipped (use -w3c, -w3c-HTML, or -w3c-CSS to run on demand).${NC}\n"
fi

# 7. Chrome Automated Testing Suite (Lighthouse, CSS Overview, Memory)
CHROME_RESULT="NOT RUN (use --chrome, --lighthouse, --css-overview, --memory)"
CHROME_FLAGS=()
if [ "${CHROME_ALL}" = true ] || { [ "${LIGHTHOUSE}" = true ] && [ "${CSS_OVERVIEW}" = true ] && [ "${MEMORY}" = true ]; }; then
  CHROME_FLAGS=(--all)
else
  [ "${LIGHTHOUSE}" = true ] && CHROME_FLAGS+=(--lighthouse)
  [ "${CSS_OVERVIEW}" = true ] && CHROME_FLAGS+=(--css-overview)
  [ "${MEMORY}" = true ] && CHROME_FLAGS+=(--memory)
fi
# Preview runs the full Chrome suite automatically against the local preview build
if [ ${#CHROME_FLAGS[@]} -eq 0 ] && [ "${TARGET_ENV}" = "preview" ]; then
  CHROME_FLAGS=(--all)
fi

if [ ${#CHROME_FLAGS[@]} -gt 0 ]; then
  echo -e "${CYAN}>>> [Chrome Testing] Executing headless Chrome automated test suites (${CHROME_FLAGS[*]})...${NC}"
  if [ "${TARGET_ENV}" = "prod" ]; then
    invoke_step "Chrome Tests against Render (https://wurm-tools.onrender.com)" \
      node "${SCRIPT_DIR}/test-chrome.js" "${CHROME_FLAGS[@]}"
  else
    LOCAL_MODE="dev"; LOCAL_PORT=3000
    if [ "${TARGET_ENV}" = "preview" ]; then LOCAL_MODE="preview"; LOCAL_PORT=4173; fi
    invoke_step "Chrome Tests against local ${LOCAL_MODE} (http://localhost:${LOCAL_PORT})" \
      node "${SCRIPT_DIR}/run-with-server.js" "${LOCAL_MODE}" "${LOCAL_PORT}" -- \
      node "${SCRIPT_DIR}/test-chrome.js" "${CHROME_FLAGS[@]}" --url "http://localhost:${LOCAL_PORT}"
  fi
  CHROME_RESULT="PASSED (${CHROME_FLAGS[*]})"
fi

# 8. Post-Deployment Summary & Actions
echo -e "${GREEN}==========================================================${NC}"
echo -e "${GREEN}  [SUCCESS] ${DISPLAY_NAME} Verification Completed!${NC}"
echo -e "${GREEN}==========================================================${NC}"
echo -e "Environment : ${DISPLAY_NAME} (${TARGET_ENV})"
echo -e "Target Mode : Vite mode '${VITE_MODE}'"
echo -e "Chrome Tests: ${CHROME_RESULT}"

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

  # Open Render live site in Chrome (default unless --no-launch / --no-open is passed)
  if [ "${NO_LAUNCH}" = false ]; then
    open_render_in_chrome "https://wurm-tools.onrender.com"
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


