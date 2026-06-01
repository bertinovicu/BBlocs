# TwinEyes — bblocs-v15 — 2026-06-01 #01
lead: bertinovicu · build: 5b4ab88 · branche git: claude/clever-heisenberg-519d09

## TL;DR
> L'app est fonctionnelle et le build ARM64 est propre. Le danger immédiat est la mémoire : `pushUndo()` sérialise les audioData base64 en entier — un seul clip 30s × 60 niveaux d'undo = 38 MB de RAM, et ça empire vite. `t.name` sans `esc()` dans le dropdown versions est un XSS bas-risque mais réel. La prochaine action est d'exclure `audioData` de l'undo stack.

---

## Verdicts par branche

| Branche | Lentille | Verdict | Findings ❌ | Findings ⚠ |
|---|---|---|---|---|
| eyeonreal | vertical · menus | ⚠ | 3 | 4 |
| eyeontime | horizontal · flux | ❌ | 3 | 3 |

---

## Convergences (les deux têtes voient le même problème)

**C1 — `t.name` non échappé → XSS**
- eyeonreal B1 + eyeontime FC → `src/index.html:4058`
- `parentSel.innerHTML = structs.map(t => \`<option value="${t.id}">${t.name}</option>\`)`
- Un track name `<img src=x onerror=alert(1)>` → exécution JS arbitraire.
- Fix : `esc(t.name)` — 5 caractères.

**C2 — `_undoStack` copie audioData complet → explosion mémoire**
- eyeonreal B2 + eyeontime FI-1
- `pushUndo()` → `JSON.stringify(S)` incluant tout `block.audioData`.
- 1 clip 30s × 60 niveaux ≈ 38 MB RAM. 3 clips = 115 MB. Undo au-delà = crash probable sur machine standard.
- Fix : dans `pushUndo()`, sérialiser S sans les champs lourds : exclure `audioData` et `waveformData` de chaque bloc avant stringify.

**C3 — Pas de limite durée enregistrement Live Memo**
- eyeonreal B3 + eyeontime FI-2
- Enregistrement illimité → audioData illimité → JSON illimité → save/undo cassés.
- Fix : `setTimeout(() => { if (_memoRec) stopMemoRecording() }, 60000)` dans `startMemoRecording()`.

---

## Divergences

**D1 — Drag palette vers piste incompatible** (eyeonreal W1 seulement)
- Bloc standard droppé sur piste `live-memo` : chip non rendu, pas de feedback.
- Visible uniquement en parcours vertical (interaction directe).

**D2 — Playback audioData corrompu : exception silencieuse** (eyeontime FI-3 seulement)
- `atob(b64)` sans try/catch dans `playMemoBlock()`.
- Visible uniquement en traçant le flux import → playback.

**D3 — Block detail delete sans confirmation** (eyeonreal W2 seulement)
- UX disruptif, Ctrl+Z récupère — non critique mais visible en parcours vertical.

---

## Punch list (ordre d'action recommandé)

1. **🔴 Bloquant mémoire** · `pushUndo()` exclure audioData/waveformData · `src/index.html:~4207`
   ```js
   function pushUndo() {
     const snapshot = JSON.stringify(S, (k, v) =>
       (k === 'audioData' || k === 'waveformData') ? undefined : v)
     _undoStack.push(snapshot)
     ...
   }
   ```

2. **🔴 Bloquant mémoire** · Limite 60s enregistrement Live Memo · `src/index.html:startMemoRecording()`
   ```js
   const maxTimer = setTimeout(() => stopMemoRecording(), 60_000)
   _memoRec = { ..., maxTimer }
   // dans stopMemoRecording() : clearTimeout(_memoRec.maxTimer)
   ```

3. **🔴 XSS** · `esc(t.name)` dans dropdown versions · `src/index.html:4058`
   ```js
   parentSel.innerHTML = structs.map(t =>
     `<option value="${t.id}">${esc(t.name)}</option>`).join('')
   ```

4. **🟠 Robustesse** · try/catch autour de `atob()` dans `playMemoBlock()` · `src/index.html:~5478`
   ```js
   try { const b64 = block.audioData.split(',')[1]; ... }
   catch(e) { toast('Audio corrompu ou format invalide', 2000); return }
   ```

5. **🟠 UX** · Warn avant save si JSON > 5 MB · `src/index.html:saveProject()`
   ```js
   const data = JSON.stringify(S)
   if (data.length > 5_000_000) {
     if (!confirm('Projet > 5 MB (clips audio longs). Continuer ?')) return
   }
   ```

6. **🟡 UX** · Guard drop de bloc sur piste incompatible · `src/index.html: blocksEl drop handler`

7. **🟡 UX** · confirm() ou toast annulable avant delete block · `src/index.html:deleteBlock()`

---

## Historique d'incrémentation

| #NN | Timestamp | Branches | TL;DR |
|---|---|---|---|
| #01 | 2026-06-01 | full (statique inférée) | Mémoire undo+audioData critique, XSS t.name, build ARM64 OK |

---

## Liens
- eyeonreal : `eyeonreal/eyeonreal_bblocs-v15_2026-06-01_01.md`
- eyeontime : `eyeontime/eyeontime_bblocs-v15_2026-06-01_01.md`

---
*Footer · lead: bertinovicu · TwinEyes #01 · build 5b4ab88 · /twineyes v1*
