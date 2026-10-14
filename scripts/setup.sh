#!/usr/bin/env bash
# One-time Fedora environment setup for Wurm Tools.
# Installs git/Node.js/Chrome (if missing), makes scripts executable and runs npm install.
# A semaphore file (.setup-complete) prevents re-running; pass --force to override.
#
# Usage: scripts/setup.sh [--force] [--no-chrome] [--helper-service] [-h|--help]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SEMAPHORE="${PROJECT_ROOT}/.setup-complete"
MIN_NODE_MAJOR=20

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
  echo "[SKIP] Setup already completed on: $(cat "${SEMAPHORE}")"
  echo "       Re-run with --force to override (or delete ${SEMAPHORE})."
  exit 0
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

# 2. Node.js >= MIN_NODE_MAJOR
node_major() { node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }
if ! command -v node >/dev/null 2>&1 || [ "$(node_major)" -lt "${MIN_NODE_MAJOR}" ]; then
  info "Installing Node.js and npm..."
  ${SUDO} dnf install -y nodejs npm
fi
if [ "$(node_major)" -lt "${MIN_NODE_MAJOR}" ]; then
  fail "Node.js ${MIN_NODE_MAJOR}+ required, found $(node -v 2>/dev/null || echo none). Install a newer version (e.g. 'dnf module' or nvm) and re-run."
fi
info "Node $(node -v), npm $(npm -v)"

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
info "Running npm install..."
(cd "${PROJECT_ROOT}" && npm install)

# 6. Local Wurm helper: report install detection, optionally install a systemd user service
info "Checking for a local Wurm server install..."
(cd "${PROJECT_ROOT}" && node -e "
import('./scripts/wurm-local.js').then(async (m) => {
  const s = await m.getStatus();
  for (const k of ['server', 'client']) console.log('  ' + s[k].label + ': ' + (s[k].installed ? s[k].path : 'not found (set WURM_' + k.toUpperCase() + '_DIR if installed elsewhere)'));
});
") || info "Could not run install detection (non-fatal)."

if [ "${HELPER_SERVICE}" = true ]; then
  info "Installing systemd user service 'wurm-helper'..."
  UNIT_DIR="${HOME}/.config/systemd/user"
  mkdir -p "${UNIT_DIR}"
  cat > "${UNIT_DIR}/wurm-helper.service" <<EOF
[Unit]
Description=Wurm Tools local helper

[Service]
WorkingDirectory=${PROJECT_ROOT}
ExecStart=$(command -v node) ${PROJECT_ROOT}/scripts/wurm-local.js --foreground
Restart=on-failure

[Install]
WantedBy=default.target
EOF
  systemctl --user daemon-reload
  systemctl --user enable --now wurm-helper.service \
    || info "Could not start the service; run 'npm run helper' manually."
  info "Optional: 'loginctl enable-linger \$USER' keeps it running when logged out."
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
