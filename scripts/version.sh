#!/usr/bin/env bash
# ==============================================================================
# Wurm Tools — Semantic Version Manager (Fedora / Linux Bash)
# ==============================================================================
# Advances project version by major, minor, or point/patch increase.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

TARGET="${1:---get}"

case "$TARGET" in
  -M|--major|major|Major)
    node "${SCRIPT_DIR}/version.js" major
    ;;
  -m|--minor|minor|Minor)
    node "${SCRIPT_DIR}/version.js" minor
    ;;
  -p|--patch|patch|Patch|-point|--point|point|Point)
    node "${SCRIPT_DIR}/version.js" patch
    ;;
  -g|--get|get|Get)
    node "${SCRIPT_DIR}/version.js" --get
    ;;
  *)
    echo "Usage: $0 [major | minor | patch | point | --get]"
    exit 1
    ;;
esac
