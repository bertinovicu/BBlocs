/**
 * make-icon.js
 * Generates assets/icon.png (512x512, purple gradient + music note)
 * using only Node.js built-ins (zlib).
 *
 * electron-builder reads assets/icon.png and auto-converts to:
 *   - assets/icon.icns  (macOS)
 *   - assets/icon.ico   (Windows)
 *
 * Run once:  node scripts/make-icon.js
 */

'use strict'
const fs   = require('fs')
const path = require('path')
const zlib = require('zlib')

const SIZE = 512
const OUT  = path.join(__dirname, '..', 'assets', 'icon.png')

// ── PNG helpers ────────────────────────────────────────────────────────────
function u32be(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n, 0)
  return b
}

function chunk(type, data) {
  const t   = Buffer.from(type, 'ascii')
  const len = u32be(data.length)
  const crc = crc32(Buffer.concat([t, data]))
  return Buffer.concat([len, t, data, u32be(crc)])
}

// CRC-32 (PNG spec)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8)
  return ((c ^ 0xFFFFFFFF) >>> 0)
}

// ── Pixel generation ────────────────────────────────────────────────────────
// Background: radial purple gradient
// Music-note silhouette: simple quarter-note shape built from pixel rules
function pixelAt(x, y) {
  const cx = SIZE / 2, cy = SIZE / 2
  const r  = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
  const maxR = SIZE * 0.5

  // Radial gradient dark-navy → deep-purple
  const t = Math.min(r / maxR, 1)
  const bg = [
    Math.round(0x0a + t * (0x2d - 0x0a)),   // R  0x0a → 0x2d
    Math.round(0x0a + t * (0x10 - 0x0a)),   // G  0x0a → 0x10
    Math.round(0x10 + t * (0x3a - 0x10)),   // B  0x10 → 0x3a
  ]

  // --- Music-note silhouette (quarter note, centered) ---
  const s  = SIZE / 512        // scale factor (always 1 here)
  const nX = cx                // stem right x
  const nY = cy - 30 * s       // notehead center y  (slightly above center)

  // Notehead: ellipse  a=70, b=52, rotated ~-25°
  const dx  = x - nX
  const dy  = y - (nY + 80 * s)
  const cos = Math.cos(-0.44), sin = Math.sin(-0.44)
  const ex  = dx * cos - dy * sin
  const ey  = dx * sin + dy * cos
  const inHead = (ex / (70 * s)) ** 2 + (ey / (52 * s)) ** 2 <= 1

  // Stem: vertical bar to the right of notehead
  const stemX1 = nX + 30 * s
  const stemX2 = nX + 52 * s
  const stemY1 = nY + 20 * s
  const stemY2 = nY - 220 * s
  const inStem = x >= stemX1 && x <= stemX2 && y >= stemY2 && y <= stemY1

  // Flag: curved shape at top of stem
  const flagDx = x - stemX2
  const flagDy = y - stemY2
  const inFlag = flagDx >= 0 && flagDx <= 90 * s &&
                 flagDy >= 0 && flagDy <= 80 * s &&
                 (flagDx / (90 * s)) ** 2 + ((flagDy - 80 * s) / (80 * s)) ** 2 <= 1

  if (inHead || inStem || inFlag) {
    // Note: bright lilac + thin white outline at edge
    const onEdge = (
      (!inHead && isNearHead(dx, dy, s)) ||
      (!inStem && isNearStem(x, y, stemX1, stemX2, stemY1, stemY2, s))
    )
    return onEdge ? [255, 255, 255, 255] : [0xc0, 0x84, 0xfc, 255]  // neon / white
  }

  // Soft inner glow (accent ring around the note area)
  const glowDist = Math.sqrt((x - (nX + 10*s)) ** 2 + (y - (nY + 30*s)) ** 2)
  if (glowDist < 160 * s && glowDist > 130 * s) {
    const alpha = Math.round(30 * (1 - Math.abs(glowDist - 145*s) / 15))
    return [0xa7, 0x8b, 0xfa, alpha]
  }

  return [...bg, 255]
}

function isNearHead(dx, dy, s) {
  const cos = Math.cos(-0.44), sin = Math.sin(-0.44)
  const ex = dx * cos - dy * sin, ey = dx * sin + dy * cos
  const d  = (ex / (70 * s)) ** 2 + (ey / (52 * s)) ** 2
  return d <= 1.15 && d >= 0.85
}

function isNearStem(x, y, x1, x2, y1, y2, s) {
  return x >= x1 - 2 && x <= x2 + 2 && y >= y2 - 2 && y <= y1 + 2
}

// ── Build raw RGBA → PNG ───────────────────────────────────────────────────
console.log(`Generating ${SIZE}×${SIZE} icon…`)

const scanlines = []
for (let y = 0; y < SIZE; y++) {
  const row = Buffer.alloc(1 + SIZE * 4)
  row[0] = 0  // filter type: None
  for (let x = 0; x < SIZE; x++) {
    const [r, g, b, a] = pixelAt(x, y)
    const i = 1 + x * 4
    row[i] = r; row[i+1] = g; row[i+2] = b; row[i+3] = a
  }
  scanlines.push(row)
}

const raw        = Buffer.concat(scanlines)
const compressed = zlib.deflateSync(raw, { level: 9 })

const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const IHDR = chunk('IHDR', Buffer.concat([
  u32be(SIZE), u32be(SIZE),
  Buffer.from([8, 6, 0, 0, 0])  // bit depth 8, RGBA, compression 0, filter 0, interlace 0
]))
const IDAT = chunk('IDAT', compressed)
const IEND = chunk('IEND', Buffer.alloc(0))

const png = Buffer.concat([sig, IHDR, IDAT, IEND])
fs.writeFileSync(OUT, png)
console.log(`✔  Written ${OUT}  (${(png.length / 1024).toFixed(1)} KB)`)
console.log()
console.log('electron-builder will auto-convert icon.png → icon.icns / icon.ico at build time.')
console.log('For a custom icon replace assets/icon.png with your 1024×1024 PNG.')
