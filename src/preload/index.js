// src/preload/index.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  query: (sql, params = []) => ipcRenderer.invoke('db:query', sql, params),
  execute: (sql, params = []) => ipcRenderer.invoke('db:execute', sql, params),
  saveBarcodeImage: (filename, base64Data) =>
    ipcRenderer.invoke('save-barcode-image', filename, base64Data),
});