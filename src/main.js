const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const RECENT_FILE = path.join(app.getPath('userData'), 'recent.json')

function loadRecent() {
  try { return JSON.parse(fs.readFileSync(RECENT_FILE, 'utf-8')) } catch { return [] }
}
function saveRecent(list) {
  try { fs.writeFileSync(RECENT_FILE, JSON.stringify(list)) } catch {}
}
function addToRecent(filePath) {
  const list = loadRecent().filter(p => p !== filePath)
  list.unshift(filePath)
  saveRecent(list.slice(0, 10))
  buildMenu()
}

let mainWindow = null
let splashWindow = null

// ─── Splash ──────────────────────────────────────────────────────────────────

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })
  splashWindow.loadFile(path.join(__dirname, 'splash.html'))
}

// ─── Main window ─────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#0a0a10',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  mainWindow.loadFile(path.join(__dirname, 'index.html'))

  // Show main window after splash has had time to display (min 2.5s)
  const SPLASH_DURATION = 2500
  const splashStart = Date.now()

  mainWindow.once('ready-to-show', () => {
    const elapsed = Date.now() - splashStart
    const remaining = Math.max(0, SPLASH_DURATION - elapsed)
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close()
        splashWindow = null
      }
      mainWindow.show()
      mainWindow.focus()
    }, remaining)
  })

  mainWindow.on('closed', () => { mainWindow = null })

  buildMenu()
}

// ─── Native menu ─────────────────────────────────────────────────────────────

function buildMenu() {
  const isMac = process.platform === 'darwin'
  const template = [
    ...(isMac ? [{ role: 'appMenu', label: 'BertinoMusicBlocs' }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-action', 'new'),
        },
        {
          label: 'Open Project…',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu-action', 'open'),
        },
        {
          label: 'Open Recent',
          submenu: (() => {
            const recent = loadRecent()
            if (!recent.length) return [{ label: 'No recent projects', enabled: false }]
            return [
              ...recent.map(p => ({
                label: path.basename(p),
                click: () => {
                  try {
                    const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
                    mainWindow?.webContents.send('load-recent', { data, filePath: p })
                  } catch {
                    mainWindow?.webContents.send('load-recent', { error: true, filePath: p })
                  }
                },
              })),
              { type: 'separator' },
              { label: 'Clear Recent', click: () => { saveRecent([]); buildMenu() } },
            ]
          })(),
        },
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-action', 'save'),
        },
        { type: 'separator' },
        {
          label: 'Export HTML…',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => mainWindow?.webContents.send('menu-action', 'export-html'),
        },
        {
          label: 'Print / Export PDF…',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow?.webContents.send('menu-action', 'export-pdf'),
        },
        {
          label: 'Import MIDI…',
          click: () => mainWindow?.webContents.send('menu-action', 'import-midi'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Dark Mode',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => mainWindow?.webContents.send('menu-action', 'toggle-dark'),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      role: 'windowMenu',
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

// Save JSON project
ipcMain.handle('save-json', async (_e, { data, defaultName }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Project',
    defaultPath: defaultName || 'project.bmb',
    filters: [
      { name: 'BertinoMusicBlocs Project', extensions: ['bmb', 'json'] },
    ],
  })
  if (canceled || !filePath) return { ok: false }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  addToRecent(filePath)
  return { ok: true, filePath }
})

// Open JSON project
ipcMain.handle('open-json', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Project',
    filters: [
      { name: 'BertinoMusicBlocs Project', extensions: ['bmb', 'json'] },
    ],
    properties: ['openFile'],
  })
  if (canceled || !filePaths.length) return { ok: false }
  const raw = fs.readFileSync(filePaths[0], 'utf-8')
  addToRecent(filePaths[0])
  return { ok: true, data: JSON.parse(raw), filePath: filePaths[0] }
})

// Export standalone HTML
ipcMain.handle('export-html', async (_e, { html, defaultName }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export HTML',
    defaultPath: defaultName || 'chart.html',
    filters: [{ name: 'HTML File', extensions: ['html'] }],
  })
  if (canceled || !filePath) return { ok: false }
  fs.writeFileSync(filePath, html, 'utf-8')
  return { ok: true, filePath }
})

// Import MIDI (opens file picker, returns raw bytes as base64)
ipcMain.handle('import-midi', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import MIDI',
    filters: [{ name: 'MIDI File', extensions: ['mid', 'midi'] }],
    properties: ['openFile'],
  })
  if (canceled || !filePaths.length) return { ok: false }
  const buf = fs.readFileSync(filePaths[0])
  return { ok: true, data: buf.toString('base64'), filePath: filePaths[0] }
})

// ─── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createSplash()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
