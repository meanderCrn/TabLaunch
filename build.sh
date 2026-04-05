#!/usr/bin/env bash
set -euo pipefail

VERSION=$(jq -r '.version' manifest.json)
POLYFILL_VERSION="0.12.0"
POLYFILL_URL="https://unpkg.com/webextension-polyfill@${POLYFILL_VERSION}/dist/browser-polyfill.min.js"

DIST_DIR="dist"
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

COMMON_FILES=(
  icons
  newtab
  popup
  storage.js
)

# ── Firefox (MV2, ship as-is) ──
echo "Building Firefox extension..."
FF_DIR="$DIST_DIR/firefox"
mkdir -p "$FF_DIR"

cp manifest.json "$FF_DIR/"
for f in "${COMMON_FILES[@]}"; do
  cp -r "$f" "$FF_DIR/"
done

(cd "$FF_DIR" && zip -r "../tablaunch-${VERSION}-firefox.zip" .)
echo "  -> dist/tablaunch-${VERSION}-firefox.zip"

# ── Chrome (MV3, polyfill + transformed manifest) ──
echo "Building Chrome extension..."
CR_DIR="$DIST_DIR/chrome"
mkdir -p "$CR_DIR"

for f in "${COMMON_FILES[@]}"; do
  cp -r "$f" "$CR_DIR/"
done

# Transform manifest: MV2 -> MV3
jq '{
  manifest_version: 3,
  name: .name,
  version: .version,
  description: .description,
  permissions: .permissions,
  chrome_url_overrides: .chrome_url_overrides,
  action: .browser_action,
  icons: .icons
}' manifest.json > "$CR_DIR/manifest.json"

# Download polyfill
echo "  Downloading webextension-polyfill v${POLYFILL_VERSION}..."
curl -sL "$POLYFILL_URL" -o "$CR_DIR/browser-polyfill.min.js"

# Inject polyfill script tag before storage.js in HTML files
for html in "$CR_DIR"/newtab/newtab.html "$CR_DIR"/popup/popup.html; do
  sed -i.bak 's|<script src="../storage.js"></script>|<script src="../browser-polyfill.min.js"></script>\n  <script src="../storage.js"></script>|' "$html"
  rm "$html.bak"
done

(cd "$CR_DIR" && zip -r "../tablaunch-${VERSION}-chrome.zip" .)
echo "  -> dist/tablaunch-${VERSION}-chrome.zip"

echo "Done! Built v${VERSION} for Firefox and Chrome."
