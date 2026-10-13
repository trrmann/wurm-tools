#!/usr/bin/env bash
# ==============================================================================
# Wurm Tools — Clear Chrome Local & Session Storage (Fedora / Linux Bash)
# ==============================================================================
# Clears localStorage and sessionStorage across production and localhost origins.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

ORIGIN="${1:-}"

if [[ -n "$ORIGIN" ]]; then
  node "${SCRIPT_DIR}/clear-chrome-storage.js" "$ORIGIN"
else
  node "${SCRIPT_DIR}/clear-chrome-storage.js"
fi
