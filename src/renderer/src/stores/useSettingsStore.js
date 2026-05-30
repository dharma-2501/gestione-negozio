// src/renderer/stores/useSettingsStore.js
import { create } from 'zustand';

export const useSettingsStore = create((set, get) => ({
  settings: {},
  loading: false,

  fetchSettings: async () => {
    try {
      const rows = await window.electronAPI.db.query('SELECT * FROM settings');
      const settingsObj = {};
      rows.forEach(row => {
        settingsObj[row.key] = row.value;
      });
      set({ settings: settingsObj });
    } catch (error) {
      console.error(error);
    }
  },

  updateSetting: async (key, value) => {
    await window.electronAPI.db.execute(
      `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
      [key, String(value)]
    );
    await get().fetchSettings();
  },

  getPointsPerEuro: () => {
    return parseInt(get().settings.points_per_euro) || 10;
  }
}));