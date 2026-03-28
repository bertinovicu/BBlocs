# CONTEXT.md — BertinovicMusicChart Desktop

## Vue d'ensemble du projet

**BertinovicMusicChart** est une application de composition et d'arrangement musicale, distribuée sous forme d'application macOS native via un fichier `.dmg`. Elle est construite avec **Electron**, encapsulant une interface web riche développée en HTML/CSS/JavaScript pur.

---

## Architecture

```
BertinovicMusicChart/
├── src/
│   ├── main.js        ← Processus principal Electron (Node.js)
│   ├── preload.js     ← Pont sécurisé (contextBridge) entre main ↔ renderer
│   └── index.html     ← Application complète (HTML+CSS+JS inline)
├── assets/
│   ├── icon.icns                  ← Icône macOS (à fournir)
│   ├── dmg-background.png         ← Fond du DMG installer (à fournir)
│   └── entitlements.mac.plist     ← Droits macOS Hardened Runtime
├── CONTEXT.md         ← Ce fichier
├── CLAUDE.md          ← Instructions pour Claude/AI assistants
└── package.json       ← Config npm + electron-builder
```

---

## Stack technique

| Couche        | Technologie                    | Version  |
|---------------|-------------------------------|----------|
| Runtime       | Electron                       | ^31.x    |
| Packaging     | electron-builder               | ^24.x    |
| Renderer      | HTML5 / CSS3 / Vanilla JS      | —        |
| Fonts         | Google Fonts (Space Mono, Syne)| CDN      |
| Audio         | Web Audio API                  | natif    |
| Persistance   | Fichiers JSON via dialog natif | —        |

---

## Fonctionnalités principales

### Éditeur de chart
- **Tracks** : Accords, Mélodie, Basse, Percussion, Loops, Guitare Tab, Fretboard, Portée, Paroles, Arpégiateur
- **Blocks** : Intro, Verse, Pre-Chorus, Chorus, Bridge, Break, Outro, Solo, Interlude, Coda
- Glisser-déposer des blocks sur les tracks
- Réorganisation des tracks (haut/bas)

### Notation musicale
- Portée interactive avec palette de notes (style Sibelius)
- Fretboard interactif avec édition des dots d'accords
- Tab guitare
- Degrés harmoniques colorés (I, II, IV, V, VI, VII)

### Tonalité & Harmonie
- Sélection de tonalité (toutes les 12 clés majeures)
- Affichage des degrés avec code couleur
- Légende harmonique intégrée

### Gestion de projet
- Système de versions (snapshot)
- Export JSON (format schéma v4.0)
- Export HTML (standalone autoporté)
- Import MIDI (simulation + API native)
- Impression / export PDF

### Interface macOS Tahoe
- Titlebar `hiddenInset` avec traffic lights natifs
- Vibrancy / effet verre dépoli
- Support Dark Mode / Light Mode
- Menus natifs avec raccourcis clavier

---

## Flux de données

```
[Utilisateur interagit avec index.html]
         ↓
[window.electronAPI.*]   ← exposé par preload.js via contextBridge
         ↓
[ipcRenderer.invoke()]   ← communication sécurisée
         ↓
[ipcMain.handle() dans main.js]   ← Node.js + dialog.showSaveDialog etc.
         ↓
[Système de fichiers macOS]
```

---

## État global (JavaScript)

L'état de l'application est maintenu dans l'objet `S` (dans `index.html`) :

```javascript
S = {
  tracks: [],          // Array de tracks
  blocks: [],          // Array de blocks
  selectedBlockId: null,
  key: 'C',           // Tonalité courante
  timeSign: '4/4',
  darkMode: true,
  versions: [],        // Historique des versions
  version: 1,
}
```

---

## Commandes de build

```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev

# Builder le DMG (universal : Intel + Apple Silicon)
npm run build

# Builder uniquement Intel (x64)
npm run build:intel

# Builder uniquement Apple Silicon (arm64)
npm run build:arm
```

---

## Fichiers assets à fournir

Avant de builder, placer dans `assets/` :

1. **`icon.icns`** — Icône macOS 1024×1024 px (format ICNS multi-résolution)
   - Générable avec : `iconutil -c icns icon.iconset`
   - Ou via [Image2icon](https://img2icnsapp.com/)

2. **`dmg-background.png`** — Fond de la fenêtre DMG installer
   - Recommandé : 540×380 px @2x (1080×760 px)
   - Design sombre avec logo Bertinovic

---

## Distribution

Le `.dmg` produit dans `dist/` contient :
- `BertinovicMusicChart-1.0.0-arm64.dmg` (Apple Silicon)
- `BertinovicMusicChart-1.0.0-x64.dmg` (Intel)

Pour distribuer sans signature Apple Developer : l'utilisateur doit faire **Clic droit → Ouvrir** lors du premier lancement (Gatekeeper bypass).

Pour une distribution signée, configurer dans `package.json` :
```json
"mac": {
  "identity": "Developer ID Application: Bertinovic (XXXXXXXXXX)"
}
```

---

## Versions & Changelog

| Version | Date       | Notes                              |
|---------|------------|------------------------------------|
| 1.0.0   | 2025-01-01 | Version initiale — portage Electron |
