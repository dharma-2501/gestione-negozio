// src/renderer/stores/useCustomersStore.js
import { create } from 'zustand';

export const useCustomersStore = create((set, get) => ({
  customers: [],
  loading: false,

  // ==================== FETCH ====================
  fetchCustomers: async () => {
    set({ loading: true });
    try {
      const result = await window.electronAPI.query(
        `SELECT * FROM customers ORDER BY name ASC`,
        []
      );
      set({ customers: result || [] });
    } catch (err) {
      console.error('❌ fetchCustomers error:', err);
    } finally {
      set({ loading: false });
    }
  },

  // ==================== ADD CLIENTE + CODICE FEDELTÀ ====================
  addCustomer: async (customerData) => {
    try {
      const loyaltyCode = 'CF-' + Math.random().toString(36).substring(2, 10).toUpperCase();

      const res = await window.electronAPI.execute(`
        INSERT INTO customers (name, phone, email, loyalty_code, points)
        VALUES (?, ?, ?, ?, 0)
      `, [
        customerData.name,
        customerData.phone || null,
        customerData.email || null,
        loyaltyCode
      ]);

      console.log('✅ Cliente creato con codice:', loyaltyCode);
      await get().fetchCustomers();
      return res;
    } catch (error) {
      console.error('❌ addCustomer error:', error);
      throw error;
    }
  },

  // ==================== RIGENERA CODICE FEDELTÀ ====================
  regenerateLoyaltyCode: async (id) => {
    try {
      const newCode = 'CF-' + Math.random().toString(36).substring(2, 10).toUpperCase();

      await window.electronAPI.execute(`
        UPDATE customers SET loyalty_code = ? WHERE id = ?
      `, [newCode, id]);

      console.log('✅ Codice rigenerato:', newCode);
      await get().fetchCustomers();
      alert(`✅ Nuovo codice: ${newCode}`);
    } catch (error) {
      console.error('❌ regenerateLoyaltyCode error:', error);
      alert('Errore durante la rigenerazione del codice');
    }
  },

  // ==================== AGGIORNA PUNTI (usato da Cassa) ====================
  updatePoints: async (customerId, pointsToAdd) => {
    if (!customerId) return;
    try {
      await window.electronAPI.execute(`
        UPDATE customers SET points = points + ? WHERE id = ?
      `, [pointsToAdd, customerId]);
      await get().fetchCustomers();
    } catch (error) {
      console.error('❌ updatePoints error:', error);
    }
  },
}));