// src/main/index.js
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import db from './database.js';

let mainWindow;

function createBackup() {
  const userData = app.getPath('userData');
  const dbPath = path.join(userData, 'negozio.db');
  const backupDir = path.join(userData, 'backups');

  // Crea la cartella backups se non esiste
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Nome del backup con data e ora precisa
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19); // es: 2026-05-23T10-45-30
  const backupPath = path.join(backupDir, `negozio_backup_${timestamp}.db`);

  try {
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`✅ Backup creato: ${backupPath}`);
    } else {
      console.log('⚠️ Database principale non trovato, backup saltato');
    }
  } catch (error) {
    console.error('❌ Errore durante la creazione del backup:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

// ==================== BACKUP ALL'AVVIO E ALLA CHIUSURA ====================
app.whenReady().then(() => {
  createBackup();           // Backup all'avvio
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Backup alla chiusura dell'app
app.on('before-quit', () => {
  createBackup();           // Backup prima di chiudere
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ==================== IPC Database ====================
ipcMain.handle('db:query', async (_, sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  } catch (error) {
    console.error('DB Query Error:', error);
    throw error;
  }
});

ipcMain.handle('db:execute', async (_, sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  } catch (error) {
    console.error('DB Execute Error:', error);
    throw error;
  }
});

ipcMain.handle('save-barcode-image', async (_, filename, base64Data) => {
  const { dialog } = require('electron');
  const fs = require('fs');

  try {
    const result = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'PNG Image', extensions: ['png'] }]
    });

    if (result.canceled || !result.filePath) return { success: false };

    const base64 = base64Data.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(result.filePath, buffer);
    return { success: true, path: result.filePath };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
});