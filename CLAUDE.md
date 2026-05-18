# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**BertinoMusicBlocs v1.0** — macOS Electron app for music composition/arrangement. Read `CONTEXT.md` for full architecture before modifying anything.

## Commands

```bash
npm install          # first time setup
npm run dev          # launch in dev mode

# Build — requires macOS machine:
npm run build        # Universal DMG (arm64 + x64, .dmg + .zip)
npm run build:arm    # Apple Silicon DMG only
npm run build:intel  # Intel DMG only
npm run build:dir    # unpacked directory (fast test)

# Icon generation (run once, or after replacing assets/icon.png):
node scripts/make-icon.js
```

Output goes to `dist/`. No automated tests — see manual checklist below.

## Architecture

The entire renderer lives in **one file**: `src/index.html` (HTML + CSS + JS inline, no bundler, no framework).

- `src/main.js` — Electron main process (Node.js): native dialogs, menus, IPC handlers
- `src/preload.js` — security bridge via `contextBridge`, exposes `window.electronAPI`
- `src/index.html` — complete app

**Global state** is the `S` object. Intentional globals: `S`, `TID`, `BID`, `staffNotes`, `fretDots`, `blockIcons`.

**Key entry points:**
- `init()` — app init on load
- `render()` — re-renders main canvas (tracks + blocks)
- `renderPanel()` — re-renders right panel
- `wireElectron()` — called on load in Electron context; overrides browser functions with native versions

## Code Rules

**Inline-only:** Keep all code in `src/index.html`. Do not create separate CSS/JS files unless explicitly asked.

**CSS colors:** Always use `:root` CSS variables (`var(--bg)`, `var(--surface)`, `var(--accent)`, `var(--neon)`, `var(--text)`, `var(--text2)`). Only hardcode hex for specific block gradients.

**Browser fallback:** Every feature must work when `src/index.html` is opened directly in Safari/Chrome. Always guard native calls:
```javascript
if (window.electronAPI) { /* native */ } else { /* browser fallback */ }
```

**Adding a feature with Electron native behavior:**
1. Implement browser version (blob/download) in `index.html`
2. Override it in `wireElectron()` with the native version
3. If a native dialog is needed: add `ipcMain.handle('event', ...)` in `main.js` and expose via `contextBridge` in `preload.js`

**Adding a track type:**
```javascript
// In TRACK_CONFIGS
newType: { icon:'🎹', badge:'PIANO', color:'#...' }
// In addTrack() → names object
// In renderTrack() → add switch/if branch
```

**Adding a block type:**
```javascript
// In BLOCK_DEFS
newType: { label:'New', icon:'★', color:'#...' }
// Add CSS class .block-newtype with its gradient
```

## Hard Constraints

- Never set `nodeIntegration: true`
- Never use `eval()` or unsanitized `innerHTML`
- Never fetch from external URLs in the renderer (CSP blocks it)
- Never add npm `dependencies` (app must stay self-contained)
- Never modify `hardenedRuntime: false` or add the `remote` module

## Manual Test Checklist (before commit)

- [ ] `npm run dev` launches without console errors
- [ ] Add/remove a track works
- [ ] Add/edit/delete a block works
- [ ] JSON export produces valid JSON
- [ ] Dark/Light mode toggle works
- [ ] Right panel resize works
- [ ] `Cmd+S` triggers JSON save, `Cmd+O` triggers open (Electron mode)
- [ ] App works when opening `src/index.html` directly in Safari/Chrome

## Project Metadata

- App ID: `com.bertinovic.musicblocs`
- JSON schema version: `1.0`
- Electron: `^31.x` (resolved to 31.7.7 at install time)
- Project file extension: `.bmb`
- Icon source: `assets/icon.png` (512×512) — auto-converted to `.icns` at build time
- macOS Universal DMG requires macOS host (needs `hdiutil` and `iconutil`)
