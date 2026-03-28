const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Save project as .bmb / .json
  saveJSON: (data, defaultName) =>
    ipcRenderer.invoke('save-json', { data, defaultName }),

  // Open project from .bmb / .json
  openJSON: () =>
    ipcRenderer.invoke('open-json'),

  // Export standalone HTML
  exportHTML: (html, defaultName) =>
    ipcRenderer.invoke('export-html', { html, defaultName }),

  // Import MIDI file (returns base64 data)
  importMidi: () =>
    ipcRenderer.invoke('import-midi'),

  // Listen for menu actions triggered from main.js (Cmd+S, Cmd+O, etc.)
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (_event, action) => callback(action))
  },

  // Called when user picks a file from File > Open Recent
  onLoadRecent: (callback) => {
    ipcRenderer.on('load-recent', (_event, payload) => callback(payload))
  },
})
