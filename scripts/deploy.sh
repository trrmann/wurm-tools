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
AUTO_FORMAT=false
SKIP_TESTS=false
NO_OPEN=false
NO_PUSH=false

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
    -a|--auto-format|-AutoFormat|--AutoFormat)
      AUTO_FORMAT=true
      shift
      ;;
    -s|--skip-tests|-SkipTests|--SkipTests)
      SKIP_TESTS=true
      shift
      ;;
    --no-open|-NoOpen)
      NO_OPEN=true
      shift
      ;;
    --no-push|-NoPush)
      NO_PUSH=true
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

# 0. Check dependencies
if [ ! -d "node_modules" ]; then
  invoke_step "Install Dependencies" npm install
fi

# 1. Formatting Check
if [ "${AUTO_FORMAT}" = true ]; then
  invoke_step "Format Code (Prettier)" npm run format
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

    TRAILER="Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
    FULL_MSG="${TRIMMED_MSG}

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

# 6. Post-Deployment Summary & Actions
echo -e "${GREEN}==========================================================${NC}"
echo -e "${GREEN}  [SUCCESS] ${DISPLAY_NAME} Verification Completed!${NC}"
echo -e "${GREEN}==========================================================${NC}"
echo -e "Environment : ${DISPLAY_NAME} (${TARGET_ENV})"
echo -e "Target Mode : Vite mode '${VITE_MODE}'"

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

  # Open Render live site in Chrome
  if [ "${NO_OPEN}" = false ]; then
    open_render_in_chrome "https://wurm-tools.onrender.com"
  fi
elif [ "${TARGET_ENV}" = "preview" ]; then
  echo -e "GitHub Push : Skipped (local preview environment)"
  echo -e "\n${CYAN}Tip: Run 'npm run preview' to launch local preview server on http://localhost:4173${NC}"
else
  echo -e "GitHub Push : Skipped (local development environment)"
  echo -e "\n${CYAN}Tip: Run 'npm run dev' to launch local development server on http://localhost:3000${NC}"
fi

echo -e "\n${GREEN}Deployment workflow finished.${NC}\n"


