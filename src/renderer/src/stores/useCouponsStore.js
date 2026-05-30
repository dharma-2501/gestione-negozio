// src/renderer/stores/useCouponsStore.js
import { create } from 'zustand';

export const useCouponsStore = create((set, get) => ({
  coupons: [],
  loading: false,

  // ==================== FETCH ====================
  fetchCoupons: async () => {
    set({ loading: true });
    try {
      const result = await window.electronAPI.query(
        `SELECT * FROM coupons ORDER BY created_at DESC`,
        []
      );
      set({ coupons: result || [] });
    } catch (err) {
      console.error('❌ fetchCoupons error:', err);
    } finally {
      set({ loading: false });
    }
  },

  // ==================== ADD COUPON ====================
  addCoupon: async (couponData) => {
    try {
      console.log('🚀 addCoupon →', couponData);

      const res = await window.electronAPI.execute(`
        INSERT INTO coupons (code, discount, type, expires_at, min_spend, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `, [
        couponData.code,
        couponData.discount,
        couponData.type,
        couponData.expires_at || null,
        couponData.min_spend || 0
      ]);

      console.log('✅ Coupon creato con ID:', res?.lastInsertRowid);
      await get().fetchCoupons();
      return res;
    } catch (error) {
      console.error('❌ ERRORE addCoupon:', error);
      throw error;
    }
  },

  // ==================== TOGGLE ATTIVO/DISATTIVO ====================
  toggleCoupon: async (id) => {
    try {
      await window.electronAPI.execute(`
        UPDATE coupons 
        SET is_active = NOT is_active 
        WHERE id = ?
      `, [id]);

      await get().fetchCoupons();
    } catch (error) {
      console.error('❌ toggleCoupon error:', error);
      throw error;
    }
  },
}));