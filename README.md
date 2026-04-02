# Custom New Tab

A Firefox extension that replaces the new tab page with a clean, customizable bookmark dashboard.

## Features

- **Clock & date** displayed prominently on every new tab
- **Bookmark tiles** with color-coded icons and automatic favicons
- **Add bookmarks** via the toolbar popup (auto-fills current tab) or directly on the new tab page
- **Edit mode** with iOS-style wiggle animation — drag to reorder, tap to edit, delete with one click
- **Cross-device sync** via `storage.sync` with automatic fallback to `storage.local`

## Install

### From source (temporary)

1. Open `about:debugging` in Firefox
2. Click **This Firefox** > **Load Temporary Add-on**
3. Select the `manifest.json` file in this directory

### From source (persistent with web-ext)

```bash
npm install -g web-ext
web-ext run
```

### Build for distribution

```bash
web-ext build
```

The packaged `.zip` will be in `web-ext-artifacts/`. Upload it at [addons.mozilla.org/developers](https://addons.mozilla.org/developers/).

## Project Structure

```
manifest.json       Extension manifest (MV2)
storage.js          Shared storage helper (sync with local fallback)
icons/              Extension icons (SVG)
popup/              Toolbar popup for quick bookmark adding
  popup.html
  popup.js
  popup.css
newtab/             New tab override page
  newtab.html
  newtab.js
  newtab.css
```

## Permissions

| Permission | Reason |
|------------|--------|
| `storage`  | Save and sync bookmarks across devices |
| `tabs`     | Auto-fill current tab URL when adding a bookmark from the popup |

## License

MIT
