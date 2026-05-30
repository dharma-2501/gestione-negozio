// src/renderer/stores/useCategoriesStore.js
import { create } from 'zustand';

export const useCategoriesStore = create((set, get) => ({
  categories: [],
  loading: false,

  fetchCategories: async () => {
    set({ loading: true });
    try {
      const result = await window.electronAPI.query('SELECT * FROM categories ORDER BY name ASC', []);
      set({ categories: result || [] });
    } catch (err) {
      console.error('❌ fetchCategories:', err);
    } finally {
      set({ loading: false });
    }
  },

  addCategory: async (name) => {
    const trimmed = name?.trim();
    if (!trimmed) throw new Error('Nome categoria obbligatorio');

    try {
      console.log('🚀 addCategory →', trimmed);
      const res = await window.electronAPI.execute(
        'INSERT OR IGNORE INTO categories (name) VALUES (?)',
        [trimmed]
      );
      console.log('✅ Categoria inserita - changes:', res?.changes);
      await get().fetchCategories();
      return true;
    } catch (error) {
      console.error('❌ ERRORE addCategory:', error);
      throw error;
    }
  },

  deleteCategory: async (id) => {
    try {
      await window.electronAPI.execute('DELETE FROM categories WHERE id = ?', [id]);
      await get().fetchCategories();
    } catch (error) {
      console.error('❌ deleteCategory:', error);
      throw error;
    }
  },

  // ==================== RINOMINA CATEGORIA (AGGIORNATA) ====================
  updateCategory: async (id, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) throw new Error('Il nome della categoria non può essere vuoto');

    try {
      // Prendiamo il vecchio nome
      const oldRow = await window.electronAPI.query(
        'SELECT name FROM categories WHERE id = ?',
        [id]
      );
      const oldName = oldRow[0]?.name;

      if (!oldName) throw new Error('Categoria non trovata');

      // Aggiorniamo la tabella categories
      await window.electronAPI.execute(
        'UPDATE categories SET name = ? WHERE id = ?',
        [trimmed, id]
      );

      // Aggiorniamo anche tutti i prodotti che usavano il vecchio nome
      if (oldName !== trimmed) {
        await window.electronAPI.execute(
          'UPDATE products SET category = ? WHERE category = ?',
          [trimmed, oldName]
        );
        console.log(`✅ Aggiornati prodotti dalla categoria "${oldName}" a "${trimmed}"`);
      }

      await get().fetchCategories();
      return true;
    } catch (error) {
      console.error('❌ updateCategory error:', error);
      throw error;
    }
  },
}));