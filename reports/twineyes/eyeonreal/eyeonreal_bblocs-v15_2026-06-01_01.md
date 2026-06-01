# TwinEyes · eyeonreal — bblocs-v15 — 2026-06-01 #01
lead: bertinovicu · axis: vertical · build: 5b4ab88
parent: ../twineyes_bblocs-v15_2026-06-01_01.md

> Passe statique inférée — app non instanciée dans ce contexte d'exécution.
> Findings basés sur lecture du code source `src/index.html`, `src/main.js`, `src/preload.js`.
> Statut de chaque finding : **inféré** sauf mention contraire (certains validés par tests build/lint).

---

## Arborescence d'écrans

```
/ (index.html)
├── Header bar
│   ├── Project name input
│   ├── Key / TimeSign / Tempo selectors
│   ├── v# → version dropdown
│   ├── ⏱ Snapshot
│   ├── ◧ Header collapse toggle
│   ├── ⬇ HTML export
│   ├── 🚂 Railroad modal
│   ├── 🖨 PDF print
│   ├── 📂 Open project
│   ├── 💾 Save project
│   └── 🌙 Dark/light toggle
├── Left palette
│   ├── Blocs section (draggable chips)
│   └── [ACTION section removed]
├── Timeline
│   ├── Ruler (◧ button + measure marks)
│   ├── Track rows (Lyrics / Fretboard / Main Structure / sub-tracks / Live Memo / Mémos)
│   │   ├── Track label (icon + name + ▲▼✕)
│   │   ├── Block chips (per type)
│   │   └── Live Memo lanes (A/B with ⏺▶⏹)
│   └── + Add Track row
├── Modal — Add Track
│   ├── Name input
│   ├── Type grid (6 buttons)
│   ├── Sub-type picker (conditional)
│   └── Parent structure picker (conditional)
├── Right panel — Block detail
│   ├── Name / Start / Duration / Key / Tempo / Chords / Lyrics fields
│   ├── Fretboard grid
│   └── Save / Delete block buttons
├── Railroad overlay
│   ├── Print / Close
│   └── Track rows (structure tracks only)
└── Staff palette float (legacy, accessible via Staff chip)
```

---

## Matrice écran × interaction

| Écran | Interaction | Attendu | Observé/Inféré | Verdict |
|---|---|---|---|---|
| Header | ⏱ Snapshot | pushUndo + version++ + toast | ✅ `snapshotVersion()` correct | ✅ |
| Header | v# clic → dropdown | liste snapshots + état actuel | ✅ `toggleVersionDropdown()` | ✅ |
| Header | v# dropdown → clic snapshot | confirm + loadState | ✅ avec confirm() | ✅ |
| Header | ◧ toggle | labels 36px ↔ 220px | ✅ classes CSS correctes | ✅ |
| Header | 💾 Save | dialog + écriture .bmb | ✅ IPC `save-json` | ✅ |
| Header | 📂 Open | dialog + loadState | ✅ IPC `open-json` | ✅ |
| Header | 🌙 toggle | dark/light bascule | ✅ `toggleDark()` | ✅ |
| Modal Add Track | Ajouter sans type | toast bloquant | ✅ `commitAddTrack()` retourne tôt | ✅ |
| Modal Add Track | Sous-piste sans sous-type | toast bloquant | ✅ contrôle présent | ✅ |
| Modal Add Track | Sous-piste + 1 Structure | dropdown visible, Structure présélectionnée | ✅ `updateSubParts()` | ✅ |
| Modal Add Track | Sous-piste + 0 Structure | warning badge affiché | ✅ `.att-warn.visible` | ✅ |
| Modal Add Track | Nom vide | nom = defaultName | ✅ fallback `cfg.defaultName` | ✅ |
| Palette gauche | Drag bloc → piste incompatible | bloc créé sur la piste (pas de filtre type) | ⚠ pas de garde track-type | ⚠ |
| Palette gauche | memo-clip dans blocs | absent | ✅ `PALETTE_HIDDEN` + `def.internal` | ✅ |
| Palette gauche | staff-bloc dans blocs | absent | ✅ `PALETTE_HIDDEN` | ✅ |
| Timeline | Ctrl+Z | undo 60 niveaux | ✅ `_undoStack` | ✅ |
| Timeline | Ctrl+Shift+Z | redo | ✅ `_redoStack` | ✅ |
| Timeline | Drag resize chip | live update | ✅ `_resizing` global | ✅ |
| Timeline | moveTrack ▲▼ sous-piste | reste dans zone sub | ✅ skip non-sub | ✅ |
| Live Memo | ⏺ → enregistrement | getUserMedia → MediaRecorder | ✅ async `startMemoRecording` | ✅ |
| Live Memo | ⏺ + pas de micro autorisé | crash silencieux | ❌ → fixé en 5b4ab88 (permission handler) | ❌→fixé |
| Live Memo | ⏹ pendant enregistrement | arrêt + clip créé | ✅ `stopMemoRecording()` | ✅ |
| Live Memo | ▶ chip | lecture + tête rouge animée | ✅ RAF + AudioContext | ✅ |
| Live Memo | ⏹ pendant lecture | arrête audio + cache playhead | ✅ `_stopMemoPlayhead()` | ✅ |
| Live Memo | Nom chip (clic input) | éditable inline | ✅ `block.name = input.value` | ✅ |
| Live Memo | ✕ chip | suppression clip | ✅ `deleteMemoBlock()` | ✅ |
| Live Memo | Durée > 60s | nouveau chip auto | ❌ pas de limite max | ❌ |
| Fretboard | Clic cellule | dot toggle | ✅ `toggleFretDot()` | ✅ |
| Fretboard | Scroll horizontal | cases 1–16 | ✅ CSS overflow-x | ✅ |
| Fretboard chip | Nom du bloc | horizontal en haut | ✅ `.fret-chip-name-row` | ✅ |
| Railroad | Ouvrir | tracks structure seulement | ✅ `RR_EXCLUDE` | ✅ |
| Block detail | Save | sauvegarde champs → render | ✅ `saveBlockDetail()` | ✅ |
| Block detail | Delete | confirmation native | ⚠ pas de confirm() avant delete | ⚠ |
| Version dropdown | t.name dans option | `${t.name}` non échappé | ❌ XSS si nom contient HTML | ❌ |
| Version dropdown | Fermeture click extérieur | classList.remove('open') | ✅ listener document click | ✅ |
| Header collapse | Positionnement icône track | group-toggle caché | ✅ `.group-toggle { display:none }` | ✅ |

---

## Findings (par sévérité décroissante)

### ❌ Bloquants

**B1 — `t.name` non échappé dans version dropdown**
- `src/index.html:4058` — `${t.name}` dans innerHTML d'un `<option>` sans `esc()`
- Si un track name contient `<script>alert(1)</script>` → XSS.
- Attendu : `${esc(t.name)}`

**B2 — `_undoStack` copie audioData en entier**
- `src/index.html:4207` — `pushUndo()` fait `JSON.stringify(S)` qui inclut `block.audioData` (base64 ≈ 640 Ko/clip)
- 1 clip × 60 niveaux undo = ~38 MB RAM. 3 clips = ~115 MB pour les undo seuls.
- Attendu : exclure `audioData`/`waveformData` de la sérialisation undo (ou passer à des delta-patches)

**B3 — Pas de limite durée enregistrement Live Memo**
- `src/index.html:startMemoRecording()` — aucun guard `maxDuration`.
- Enregistrer 10 min = 13 MB base64 dans le JSON projet → save/load cassé ou très lent.
- Attendu : `setTimeout(() => stopMemoRecording(), 60000)` + toast d'avertissement à 50s

### ⚠ Watch

**W1 — Drag depuis palette vers piste de type incompatible**
- Aucun filtre : un bloc `chorus` peut être droppé sur une piste `live-memo` ou `memos`.
- `buildLiveMemoLanes()` appelé mais ne renderisera pas les blocs non-`memo-clip` → chip vide sans feedback.
- Attendu : filtrer dans le drop handler (`if (!FREE_TRACK_TYPES.has(track.type)) return` pour les blocs standard)

**W2 — Block detail delete sans confirmation**
- `deleteBlock()` appelé directement depuis le panneau sans `confirm()`.
- Ctrl+Z peut récupérer, mais l'UX est surprenante.
- Attendu : confirm() ou au minimum toast "annulable 5s"

**W3 — `export-html` IPC non implémenté dans main.js**
- `src/main.js:232` — `ipcMain.handle('import-midi')` seul dans ce bloc. `export-html` est géré.
- En revanche `showMidiImport` dans index.html (l.4478) fait `toast('MIDI import requires...')` → bouton mort dans l'interface browser. Dans Electron, `wireElectron()` l'override — OK.
- Verdict : ⚠ confus mais non bloquant.

**W4 — Aucune validation des champs numériques dans Block detail**
- `pf-measure` et `pf-measures` : valeurs négatives ou non-numériques non rejetées côté renderer.
- `saveBlockDetail()` fait `Math.max(1, Math.min(...))` — garde correcte. ✅
- Toujours signaler : pas de feedback visuel si valeur hors-plage.

### ✅ Validés (sampling)
- Context isolation + nodeIntegration:false sur toutes les BrowserWindow ✅
- `esc()` appliqué sur tous les noms/chords/lyrics injectés en innerHTML (sauf B1) ✅
- normalizeTrackOrder() appelé après chaque addTrack ✅
- pushUndo() présent sur dropBlock, quickDeleteBlock, deleteBlock, removeTrack, toggleMute, moveTrack ✅
- hardenedRuntime:true + entitlements micro dans 5b4ab88 ✅

---

## Écrans orphelins / actions mortes

- `#staff-palette-float` — palette Staff legacy, accessible via `showStaffPalette()` mais piste Staff non créée par défaut → zone morte pour nouveaux projets.
- `import-midi` dans le menu Electron → toast "requires Electron app" dans le browser fallback → action désactivée mais pas visuellement dans l'Electron build (menu item existe). **Mort dans les deux cas.**

---

## Précis de surface UI
- Écrans/zones visités : 9 zones majeures
- Interactions testées (inférées) : 38
- Couverture golden path estimée : ~80 %
- Findings bloquants : 3 | Watch : 4
