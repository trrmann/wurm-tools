#!/usr/bin/env bash
# Runs only inside the disposable, network-disabled Fedora acceptance container.
set -euo pipefail
echo "$TEST_ARTIFACT_SHA256  /installer.run" | sha256sum --check
work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT
line="$(awk '/^__WURM_PAYLOAD__$/{print NR + 1; exit}' /installer.run)"
tail -n +"$line" /installer.run > "$work/payload.tar.gz"
tar -xzf "$work/payload.tar.gz" -C "$work"

# Bootstrap the minimal test image from the bundled, publisher-verified closure only.
mapfile -t required < "$work/developer/required-rpms.txt"
for index in "${!required[@]}"; do required[$index]="$work/developer/rpms/${required[$index]}"; done
dnf --assumeyes --disable-repo='*' \
  --repofrompath="wurm-offline,file://$work/developer/rpms" --enable-repo=wurm-offline \
  --setopt=wurm-offline.gpgcheck=True --setopt=localpkg_gpgcheck=True \
  --setopt=install_weak_deps=False install "${required[@]}"
useradd --create-home acceptance
chmod 755 /installer.run
export WURM_HELPER_PORT=5199
export HOME=/home/acceptance
export XDG_DATA_HOME="$HOME/.local/share"
export XDG_CONFIG_HOME="$HOME/.config"

if runuser --user acceptance -- bash /installer.run --yes --developer > "$work/missing-editor.log" 2>&1; then
  echo "[FAIL] Developer installation unexpectedly passed without VS Code" >&2
  exit 1
fi
grep -E 'code|VS Code' "$work/missing-editor.log"
test ! -e "$XDG_DATA_HOME/wurm-tools/helper/current"

# Native editor validation remains a separate gate; never bundle Microsoft's binary.
printf '#!/bin/sh\nprintf "External VS Code test fixture\\n"\n' > /usr/local/bin/code
chmod 755 /usr/local/bin/code
runuser --user acceptance -- bash /installer.run --yes --developer
dev="$XDG_DATA_HOME/wurm-tools/developer/wurm-dev"
helper="$XDG_DATA_HOME/wurm-tools/helper/wurm-helper"
runuser --user acceptance -- "$dev" node --version
runuser --user acceptance -- "$dev" node -e 'if (!process.execPath.includes("/developer/toolchains/") || process.version !== "v24.22.1") throw new Error("Wrong developer runtime selected")'
runuser --user acceptance -- "$dev" pnpm --version
runuser --user acceptance -- "$dev" bash -c 'set -e; source "$NVM_DIR/nvm.sh" --no-use; test "$(nvm current)" = v24.22.1; command -v pnpm; psql --version; pg_dump --version; pg_restore --version; sqlite3 --version'
runuser --user acceptance -- "$dev" pnpm install --frozen-lockfile --offline --force
if rpm -q postgresql-server; then
  echo "[FAIL] Developer client profile unexpectedly installed PostgreSQL server" >&2
  exit 1
fi
runuser --user acceptance -- "$dev" bash -c 'command -v deploy; deploy --help'
runuser --user acceptance -- "$dev" pnpm run lint
runuser --user acceptance -- "$dev" pnpm test
runuser --user acceptance -- "$dev" pnpm run build
runuser --user acceptance -- "$dev" pnpm run test:standards
runuser --user acceptance -- "$dev" pnpm run test:w3c:ready
runuser --user acceptance -- "$helper" uninstall --yes
test -x "$dev"
runuser --user acceptance -- "$dev" pnpm --version
echo "[PASS] Developer bundle installed and ran deployment prerequisites with networking disabled."
echo "[INFO] VS Code used an external-editor fixture. Real editor/login/Windows acceptance remains open."
