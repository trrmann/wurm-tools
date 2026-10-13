#!/usr/bin/env bash
# ==============================================================================
# Wurm Tools — Automated Deployment Script (Bash / Fedora & Linux)
# ==============================================================================
# Runs code verification (Prettier, ESLint, Vitest, and Vite build),
# verifies git status, commits changes if requested, and pushes to GitHub
# to trigger Render static site deployment. Stops safely on any failure.
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

COMMIT_MESSAGE=""
AUTO_FORMAT=false
SKIP_TESTS=false

# Parse command-line flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--message)
      COMMIT_MESSAGE="$2"
      shift 2
      ;;
    --auto-format)
      AUTO_FORMAT=true
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    -h|--help)
      echo "Usage: ./deploy.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -m, --message <msg>   Commit message for pending changes"
      echo "  --auto-format         Auto-fix formatting with Prettier before checking"
      echo "  --skip-tests          Skip the unit test suite"
      echo "  -h, --help            Show this help dialog"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${CYAN}==========================================================${NC}"
echo -e "${CYAN}         Wurm Tools — Deployment Automation (Bash)${NC}"
echo -e "${CYAN}==========================================================${NC}"
echo -e "${GRAY}Working Directory: ${PROJECT_ROOT}${NC}\n"

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
  echo -e "${GREEN}✓ [${step_name}] Passed successfully.${NC}\n"
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
  echo -e "${YELLOW}⚠️ Skipping unit tests (--skip-tests flag set).${NC}\n"
fi

# 4. Production Build
invoke_step "Vite Production Build" npm run build

# 5. Git Status & Verification
echo -e "${CYAN}>>> [Git Status Check] Verifying repository state...${NC}"

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "${CURRENT_BRANCH}" != "main" ]; then
  echo -e "${YELLOW}⚠️ Current branch is '${CURRENT_BRANCH}' (not 'main').${NC}"
  read -r -p "Do you want to deploy branch '${CURRENT_BRANCH}' to origin main? (y/N) " CONFIRM
  if [[ ! "${CONFIRM}" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}[ABORT] Deployment cancelled by user.${NC}"
    exit 0
  fi
fi

if [ -n "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}Uncommitted changes detected in repository:${NC}"
  git status --short

  if [ -z "${COMMIT_MESSAGE}" ]; then
    read -r -p "Enter commit message for these changes (or press Enter to abort): " COMMIT_MESSAGE
    if [ -z "${COMMIT_MESSAGE}" ]; then
      echo -e "\n${YELLOW}[ABORT] Deployment halted: Cannot push uncommitted changes without a commit message.${NC}"
      exit 1
    fi
  fi

  invoke_step "Stage Changes" git add -A

  TRAILER="Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  FULL_MSG="${COMMIT_MESSAGE}

${TRAILER}"

  invoke_step "Commit Changes" git commit -m "${FULL_MSG}"
else
  echo -e "${GRAY}Working tree clean; no uncommitted changes.${NC}"
fi

# 6. Push to GitHub
invoke_step "Push to GitHub (origin main)" git push origin HEAD:main

# 7. Post-Deployment Summary
echo -e "${GREEN}==========================================================${NC}"
echo -e "${GREEN}  ✓ Verification & GitHub Push Completed Successfully!${NC}"
echo -e "${GREEN}==========================================================${NC}"
echo -e "GitHub Repo : https://github.com/trrmann/wurm-tools"
echo -e "Render Live : https://wurm-tools.onrender.com"
echo -e "W3C HTML    : https://validator.w3.org/nu/?doc=https%3A%2F%2Fwurm-tools.onrender.com%2F"
echo -e "W3C CSS     : https://jigsaw.w3.org/css-validator/validator?uri=https%3A%2F%2Fwurm-tools.onrender.com%2F"

if command -v gh >/dev/null 2>&1; then
  echo -e "\n${CYAN}Monitoring GitHub Actions CI...${NC}"
  sleep 3
  gh run list --repo trrmann/wurm-tools --limit 2 || true
fi

echo -e "\n${GREEN}Deployment workflow finished.${NC}\n"
