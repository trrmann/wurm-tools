#!/usr/bin/env bash
# One-time Fedora environment setup for Wurm Tools.
# Uses nvm-managed Node LTS and pinned pnpm; installs missing Fedora developer prerequisites.
# Rechecks prerequisites each run; --force also restores project dependencies.
#
# Usage: scripts/setup.sh [--force] [--no-chrome] [--helper-service] [-h|--help]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SEMAPHORE="${PROJECT_ROOT}/.setup-complete"
MIN_NODE_MAJOR=24

FORCE=false
INSTALL_CHROME=true
HELPER_SERVICE=false

for arg in "$@"; do
  case "$arg" in
    --force|-f) FORCE=true ;;
    --no-chrome) INSTALL_CHROME=false ;;
    --helper-service) HELPER_SERVICE=true ;;
    -h|--help)
      sed -n '2,7p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

info() { echo -e "\033[0;36m[INFO]\033[0m $*"; }
fail() { echo -e "\033[0;31m[FAIL]\033[0m $*" >&2; exit 1; }

if [ -f "${SEMAPHORE}" ] && [ "${FORCE}" != true ]; then
  info "Previous setup: $(cat "${SEMAPHORE}"); rechecking prerequisites."
fi

if ! command -v dnf >/dev/null 2>&1; then
  fail "dnf not found. This script targets Fedora."
fi

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  command -v sudo >/dev/null 2>&1 || fail "sudo is required when not running as root."
  SUDO="sudo"
fi

# 1. git
if command -v git >/dev/null 2>&1; then
  info "git present: $(git --version)"
else
  info "Installing git..."
  ${SUDO} dnf install -y git
fi

# 2. Use the checkout's nvm-managed Node and pinned pnpm.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] || fail "nvm is missing. Follow README Quick Start to provision nvm, Node LTS and pnpm."
source "$NVM_DIR/nvm.sh" --no-use
nvm use --silent "$(cat "${PROJECT_ROOT}/.nvmrc")" || fail "Run nvm install in the project first."
node_major() { node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }
if [ "$(node_major)" -lt "${MIN_NODE_MAJOR}" ]; then
  fail "Node.js ${MIN_NODE_MAJOR}+ required, found $(node -v 2>/dev/null || echo none). Run nvm install and re-run."
fi
command -v pnpm >/dev/null 2>&1 || fail "pnpm is missing. Run corepack enable pnpm and corepack prepare pnpm@12.15.0 --activate using nvm Node."
[ "$(pnpm --version)" = "12.15.0" ] || fail "pnpm 12.15.0 is required; provision the pinned version first."
info "Node $(node -v), pnpm $(pnpm -v)"

# 3. Chrome / Chromium (needed for the Chrome tests and opening the site)
if [ "${INSTALL_CHROME}" = true ]; then
  if command -v google-chrome >/dev/null 2>&1 || command -v google-chrome-stable >/dev/null 2>&1 \
    || command -v chromium >/dev/null 2>&1 || command -v chromium-browser >/dev/null 2>&1; then
    info "Chrome/Chromium already installed."
  else
    info "Installing Chromium..."
    ${SUDO} dnf install -y chromium
  fi
fi

# 4. Script permissions and line endings
info "Marking scripts executable..."
chmod +x "${SCRIPT_DIR}/deploy" "${SCRIPT_DIR}"/*.sh
if command -v sed >/dev/null 2>&1; then
  sed -i 's/\r$//' "${SCRIPT_DIR}/deploy" "${SCRIPT_DIR}"/*.sh
fi

# 5. Dependencies
if [ ! -f "${SEMAPHORE}" ] || [ "${FORCE}" = true ] || [ ! -d "${PROJECT_ROOT}/node_modules" ]; then
  info "Restoring lockfile-defined project dependencies..."
  (cd "${PROJECT_ROOT}" && pnpm install --frozen-lockfile)
fi

# W3C tools are developer prerequisites, not part of the end-user helper.
java_major() {
  if command -v java >/dev/null 2>&1; then
    java --version 2>/dev/null | sed -nE '1s/.*(openjdk|java) ([0-9]+).*/\2/p'
  fi
}
JAVA_MAJOR="$(java_major || true)"
if [[ ! "${JAVA_MAJOR}" =~ ^[0-9]+$ ]] || [ "${JAVA_MAJOR}" -lt 17 ]; then
  info "Installing Java 17+ for official local W3C validators..."
  ${SUDO} dnf install -y java-21-openjdk-headless
fi
JAVA_MAJOR="$(java_major || true)"
if [[ ! "${JAVA_MAJOR}" =~ ^[0-9]+$ ]] || [ "${JAVA_MAJOR}" -lt 17 ]; then
  fail "Java 17+ is required. Check the active Java alternative and PATH, then rerun setup."
fi
info "Preparing checksum-verified local W3C validators (downloads missing jars)..."
(cd "${PROJECT_ROOT}" && pnpm run test:w3c:setup)

# 6. Local Wurm helper: report install detection, optionally install a systemd user service
info "Checking for a local Wurm server install..."
(cd "${PROJECT_ROOT}" && node -e "
import('./scripts/wurm-local.js').then(async (m) => {
  const s = await m.getStatus();
  for (const k of ['server', 'client']) console.log('  ' + s[k].label + ': ' + (s[k].installed ? s[k].path : 'not found (set WURM_' + k.toUpperCase() + '_DIR if installed elsewhere)'));
});
") || info "Could not run install detection (non-fatal)."

if [ "${HELPER_SERVICE}" = true ]; then
  info "Installing opt-in systemd user service 'wurm-helper'..."
  (cd "${PROJECT_ROOT}" && pnpm run helper:startup:install) \
    || info "Could not install the service; run 'pnpm run helper' manually."
  info "Set WURM_SERVER_DIR / WURM_ALLOWED_ORIGINS via 'systemctl --user edit wurm-helper'."
fi

# 7. git push readiness (informational only)
if ! (cd "${PROJECT_ROOT}" && git remote get-url origin >/dev/null 2>&1); then
  info "No git 'origin' remote configured; 'deploy -prod' will not be able to push."
fi
if ! git config --global user.name >/dev/null 2>&1 || ! git config --global user.email >/dev/null 2>&1; then
  info "Set your git identity: git config --global user.name \"Name\"; git config --global user.email you@example.com"
fi

date -u +"%Y-%m-%dT%H:%M:%SZ" > "${SEMAPHORE}"

echo
info "Setup complete. Reopen the VS Code terminal so scripts/ is on PATH, then run: deploy -dev"
