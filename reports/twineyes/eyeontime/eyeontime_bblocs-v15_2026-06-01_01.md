# TwinEyes · eyeontime — bblocs-v15 — 2026-06-01 #01
lead: bertinovicu · axis: horizontal · build: 5b4ab88
parent: ../twineyes_bblocs-v15_2026-06-01_01.md

> Passe statique inférée — traces de flux construites par lecture de code.

---

## Entrées identifiées

| Entrée | Type | Localisation | Persistée ? |
|---|---|---|---|
| `project name` | text input | header `#project-name` | oui (`S.projectName`) |
| `key` | select | header `#key-select` | oui (`S.key`) |
| `timeSign` | select | header `#time-select` | oui (`S.timeSign`) |
| `tempo` | number input | header `#tempo-input` | oui (`S.tempo`) |
| `track name` | text (modal ATT) | `#att-name` | oui (`track.name`) |
| `block name` | text | `#pf-name` (detail panel) | oui (`block.name`) |
| `block chords` | text | `#pf-chords` | oui (`block.chords`) |
| `block lyrics` | textarea | `#pf-lyrics` | oui (`block.lyrics`) |
| `block measure/duration` | number | `#pf-measure`, `#pf-measures` | oui (`block.measure`, `block.measures`) |
| `memo text` | textarea (inline chip) | `.memo-text-chip textarea` | oui (`block.notes`) |
| `memo clip name` | text (inline chip) | `.memo-chip-name` | oui (`block.name`) |
| `drag block from palette` | DnD | `blocksEl.drop` | oui (S.blocks.push) |
| `drag block to move` | DnD | `blocksEl.drop` | oui (`block.trackId`, `block.measure`) |
| `fretboard dot click` | click | `fret-cell` | oui (`block.fretDots[]`) |
| `mic recording` | getUserMedia | `startMemoRecording()` | oui (`block.audioData` base64) |
| `file import .bmb` | file picker | `openProject()` → `loadState()` | oui (S complet) |
| `staff note (click portée)` | click Y position | `blocksEl.click` | oui (`block.staffNotes`) |
| `staff note pitch (flèches)` | keydown ↑↓←→ | `bindKeys` | oui (modifie token) |

---

## Sorties identifiées

| Sortie | Type | Localisation | Source |
|---|---|---|---|
| Timeline DOM | render | `#tracks-inner` | `S.tracks + S.blocks` |
| Block chip | render | `track-blocks` | `block.*` |
| Live Memo waveform SVG | render | `.memo-chip-wave-area svg` | `block.waveformData` |
| Tête de lecture rouge | animation | `.memo-playhead` | `AudioContext.currentTime` |
| Fretboard grid | render | `fretboard-grid` | `block.fretDots` |
| Staff SVG | render | `staff-chip svg` | `block.staffNotes` |
| JSON save (.bmb) | file | `save-json` IPC | `serializeState(S)` |
| HTML export | file | `export-html` IPC | `buildExportHTML()` |
| PDF | print dialog | `window.print()` | `@media print` CSS |
| Railroad view | modal DOM | `#railroad-scroll` | `S.tracks + S.blocks` |
| Audio playback | Web Audio | `ctx.destination` | `block.audioData` / `block.staffNotes` |
| Version badge | text | `#version-badge` | `S.version` |
| Version dropdown | DOM | `#version-dropdown` | `S.versions[]` |
| Toast | transient DOM | `.toast` | event triggers |
| Undo stack | RAM | `_undoStack[]` | `JSON.stringify(S)` |

---

## Matrice intersection entrées × sorties

|  | Timeline DOM | Waveform SVG | JSON save | Audio | Undo stack | Railroad |
|--|:-:|:-:|:-:|:-:|:-:|:-:|
| project name | — | — | ✓ | — | ✓ | ✓ |
| track name | ✓ | — | ✓ | — | ✓ | ✓ |
| block chords | ✓ | — | ✓ | — | — | — |
| block lyrics | ✓ | — | ✓ | — | — | — |
| drag block | ✓ | — | ✓ | — | ✓ | ✓ |
| fretboard dot | ✓ | — | ✓ | — | — | — |
| mic recording | ✓ | **✓** | **✓** | **✓** | **❌ heavy** | — |
| file import | ✓ | ✓ | — | — | — | ✓ |
| staff note | ✓ | — | ✓ | ✓ | ✓ | — |
| key/tempo | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

**❌ heavy** = `mic recording` → `_undoStack` copie base64 audio complet.

---

## Parcours happy-path

### P1 — Créer et sauvegarder un projet avec un clip Live Memo

```
1. Ouvrir l'app → S initialisé, pistes par défaut créées
   pass: ensureDefaultTracks() → Lyrics/Fretboard/Main Structure/Live Memo/Mémos
2. Clic ⏺ lane A → getUserMedia() → permission accordée (nouveau: setPermissionRequestHandler)
   pass: startMemoRecording(trackId, 'A', btn)
3. Parler 10s → MediaRecorder.ondataavailable accumule chunks
4. Clic ⏹ → mr.stop() → onstop async
   → blob.arrayBuffer() → decodeAudioData → 80 peaks normalisés → waveformData[]
   → FileReader.readAsDataURL(blob) → audioData base64
   → S.blocks.push(block) → render()
5. Chip apparaît avec waveform SVG + nom "Mémo A" + "0:10"
6. Clic 💾 → electronAPI.saveProject({ data: JSON.stringify(S), ... })
   → IPC save-json → dialog.showSaveDialog → fs.writeFileSync
```

*Latence observée (inférée) : décodeAudioData sur 10s clip ≈ 50–100ms · Persistance : oui (fichier .bmb) · Cohérence inter-vues : ok*

**Point de fragilité :** `JSON.stringify(S)` à l'étape 6 incluant audioData base64 + tous les snapshots undo → fichier .bmb peut dépasser 10 MB pour 3 clips avec historique.

---

### P2 — Ajouter une sous-piste sous Main Structure

```
1. Clic + Add Track → modal ouverte
2. Clic Sous-piste → updateSubParts() → parentWrap.visible = true
   (1 structure trouvée → Main Structure présélectionnée)
3. Clic Drums → _pendingSubType = 'drums'
4. Saisir "Drums groove" → _pendingTrackType = '__sub__'
5. Clic Ajouter → commitAddTrack()
   → type = 'drums', track.parentStructureId = structureId
   → parentIdx = findIndex(structure)
   → splice(insertAt, 0, track)
   → render()
6. Piste Drums apparaît sous Main Structure dans la timeline
```

*Cohérence : normalizeTrackOrder() maintient le rang 3 si drag-to-reorder ultérieur.*

---

## Parcours sous stress

**Volume :** 20 clips Live Memo (20 × 640 Ko audioData) + 60 niveaux undo → `_undoStack` = 20 × 640 Ko × 60 = ~768 MB RAM. **Crash mémoire probable sur macOS.**

**Concurrence :** Deux enregistrements simultanés impossibles (`if (_memoRec) stopMemoRecording()` protège) ✅

**Fichier corrompu à l'import :** `sanitizeStaffNotes()` nettoie les tokens staff. Mais `block.audioData` non validé : une chaîne non-base64 passera, `atob()` lèvera une exception dans `playMemoBlock()` → catch absent → promise rejection silencieuse. ⚠

**Projet avec track.name = `<img src=x onerror=alert(1)>`** → `t.name` injecté dans `<option>${t.name}</option>` dans le dropdown versions → XSS. ❌ (aussi trouvé par eyeonreal)

---

## Findings d'intersection

### ❌ Couplages cassants

**FI-1 — mic recording → _undoStack : explosion mémoire**
- `src/index.html:pushUndo()` copie `JSON.stringify(S)` qui contient `block.audioData`.
- 1 clip 30s ≈ 640 Ko × 60 niveaux = **38 MB juste pour l'undo**.
- Fix : exclure `audioData` et `waveformData` de la sérialisation undo (ref-only par blockId).

**FI-2 — mic recording → JSON save : pas de limite de taille**
- Aucun garde sur la taille de `S` avant `JSON.stringify()` dans `saveProject()`.
- 10 clips longues → fichier .bmb > 10 MB, `fs.writeFileSync()` peut bloquer le process Electron.
- Fix : warn si `JSON.stringify(S).length > 5_000_000`, proposer "Vider les clips" avant save.

**FI-3 — atob(b64) sans try/catch dans playMemoBlock()**
- `src/index.html:5478` — la conversion base64 → ArrayBuffer n'est pas wrappée dans try/catch.
- Un fichier importé avec `audioData` corrompu fera crasher `playMemoBlock()` silencieusement.
- Fix : `try { const b64 = block.audioData.split(',')[1]; ... } catch(e) { toast('Audio corrompu'); }`

### ⚠ Couplages cachés

**FC-1 — S.versions[] accumule audioData**
- Chaque `snapshotVersion()` → `JSON.stringify(S)` dans `S.versions`. Idem pour pushUndo.
- Un projet avec 3 snapshots + 2 clips = ~4 MB RAM en state pur.

**FC-2 — render() complet sur moveTrack / removeTrack / dropBlock**
- Ces mutations appellent `render()` qui rebuilde tous les DOM tracks + chips.
- Avec 10 Live Memo clips, chaque render recrée les 10 chip SVG (waveform redraw).

**FC-3 — waveformData absente sur clips importés depuis old format**
- `loadState()` : si `block.waveformData` est undefined (ancien .bmb), `drawMemoWaveform(undefined)` retourne SVG placeholder. Acceptable. ✅

### ✅ Propagations correctes
- Key/Tempo → Staff SVG (armure + chiffrage recalculés à chaque render) ✅
- fretDots → miniChordDiagram + fretboard grid (même source) ✅
- block.name → chip label + detail panel (édition bidirectionnelle) ✅
- S.darkMode → CSS class toggle → persisté dans JSON ✅
- Ctrl+Z → loadState → render → tous les chips reconstruits ✅

---

## Précis de flux
- Entrées identifiées : 18
- Sorties identifiées : 15
- Cases ✓ dans la matrice : 28 / 90
- Parcours bout-en-bout complets : 2
- Findings cassants : 3 | Couplages cachés : 3
