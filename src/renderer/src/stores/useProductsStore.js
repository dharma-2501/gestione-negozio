// src/renderer/stores/useProductsStore.js
import { create } from 'zustand';
import { useNotificationStore } from './useNotificationStore';

export const useProductsStore = create((set, get) => ({
  products: [],
  cart: [],
  loading: false,

  // ==================== FETCH ====================
  fetchProducts: async () => {
    set({ loading: true });
    try {
      const result = await window.electronAPI.query(`
        SELECT 
          p.*,
          COALESCE(SUM(sb.quantity), 0) as total_stock,
          COALESCE(SUM(CASE WHEN sb.entry_date < date('now', '-18 months') THEN sb.quantity ELSE 0 END), 0) as old_stock
        FROM products p
        LEFT JOIN stock_batches sb ON sb.product_id = p.id
        GROUP BY p.id
        ORDER BY p.name ASC
      `, []);
      set({ products: result || [] });
    } catch (err) {
      console.error('❌ fetchProducts error:', err);
    } finally {
      set({ loading: false });
    }
  },

  // ==================== ADD PRODOTTO ====================
  addProduct: async (productData) => {
    console.log('🚀 addProduct chiamato con dati:', productData);
    if (!productData.name || !productData.price) throw new Error('Nome e prezzo obbligatori');
    try {
      // Normalize barcode: empty or whitespace-only → null
      const normalizedBarcode = productData.barcode 
        ? productData.barcode.trim().replace(/[\r\n\t]/g, '').replace(/\s+/g, '') || null
        : null;

      const res = await window.electronAPI.execute(`
        INSERT INTO products (name, price, purchase_price, category, barcode, min_stock)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        productData.name.trim(),
        parseFloat(productData.price) || 0,
        productData.purchasePrice ? parseFloat(productData.purchasePrice) : null,
        productData.category || null,
        normalizedBarcode,
        parseInt(productData.min_stock) || 5
      ]);
      await get().fetchProducts();
      return res;
    } catch (error) {
      console.error('❌ addProduct error:', error);
      throw error;
    }
  },

  // ==================== UPDATE PRODOTTO ====================
  updateProduct: async (id, productData) => {
    try {
      // Normalize barcode: empty or whitespace-only → null
      const normalizedBarcode = productData.barcode 
        ? productData.barcode.trim().replace(/[\r\n\t]/g, '').replace(/\s+/g, '') || null
        : null;

      await window.electronAPI.execute(`
        UPDATE products 
        SET name = ?, price = ?, purchase_price = ?, category = ?, barcode = ?, min_stock = ?
        WHERE id = ?
      `, [
        productData.name, 
        parseFloat(productData.price) || 0,
        productData.purchasePrice ? parseFloat(productData.purchasePrice) : null,
        productData.category || null,
        normalizedBarcode,
        parseInt(productData.min_stock) || 5,
        id
      ]);
      await get().fetchProducts();
    } catch (error) {
      console.error('❌ updateProduct error:', error);
      throw error;
    }
  },

  // ==================== DELETE PRODOTTO (FIXATO) ====================
  deleteProduct: async (id) => {
    if (!window.confirm('❗ Vuoi davvero eliminare definitivamente questo prodotto e tutto il suo stock?\n\nLe vendite passate resteranno registrate.')) {
      return;
    }

    try {
      console.log('🗑️ deleteProduct chiamato per ID:', id);

      // 1. Elimina prima i dettagli delle vendite (sale_items)
      await window.electronAPI.execute('DELETE FROM sale_items WHERE product_id = ?', [id]);

      // 2. Elimina i lotti di magazzino (stock_batches)
      await window.electronAPI.execute('DELETE FROM stock_batches WHERE product_id = ?', [id]);

      // 3. Ora possiamo eliminare il prodotto
      await window.electronAPI.execute('DELETE FROM products WHERE id = ?', [id]);

      console.log('✅ Prodotto eliminato con successo');
      await get().fetchProducts();   // refresh tabella

      useNotificationStore.getState().addNotification('✅ Prodotto eliminato con successo!', 'success');
    } catch (error) {
      console.error('❌ deleteProduct error:', error);
      useNotificationStore.getState().addNotification(`❌ Errore durante l’eliminazione:\n${error.message || error}`, 'error');
    }
  },

  // ==================== ADD BATCH (Gestisci Quantità) ====================
  addBatch: async (productId, quantity, purchasePrice = null, supplier = null, notes = null) => {
    try {
      await window.electronAPI.execute(`
        INSERT INTO stock_batches (product_id, quantity, purchase_price, supplier, notes)
        VALUES (?, ?, ?, ?, ?)
      `, [productId, quantity, purchasePrice, supplier, notes]);
      await get().fetchProducts();
    } catch (error) {
      console.error('❌ addBatch error:', error);
      throw error;
    }
  },

  getTotalStock: (productId) => {
    const p = get().products.find(p => p.id === productId);
    return p ? Number(p.total_stock || 0) : 0;
  },

  getOldStock: (productId) => {
    const p = get().products.find(p => p.id === productId);
    return p ? Number(p.old_stock || 0) : 0;
  },

  // ==================== CARRELLO ====================
  addToCart: (product) => {
    console.log('🛒 addToCart chiamato per:', product?.name);
    if (!product || !product.id) return console.error('Prodotto non valido');
    set((state) => {
      const existing = state.cart.find(item => item.id === product.id);
      if (existing) {
        return { cart: state.cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) };
      }
      return { cart: [...state.cart, { ...product, quantity: 1 }] };
    });
  },

  changeQuantity: (id, quantity) => {
    if (quantity < 1) return get().removeFromCart(id);
    set((state) => ({
      cart: state.cart.map(item => item.id === id ? { ...item, quantity } : item)
    }));
  },

  removeFromCart: (id) => {
    set((state) => ({
      cart: state.cart.filter(item => item.id !== id)
    }));
  },

  // ==================== COMPLETE SALE ====================
  completeSale: async (customerId, discountFromPoints = 0, pointsEarned = 0, couponCode = null, discountFromManual = 0) => {
    const { cart } = get();
    if (cart.length === 0) return useNotificationStore.getState().addNotification("Carrello vuoto!", 'warning');

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const finalTotal = Math.max(0, total - discountFromPoints - (parseFloat(discountFromManual) || 0));

    try {
      const totalDiscount = (parseFloat(discountFromPoints) || 0) + (parseFloat(discountFromManual) || 0);
      const saleRes = await window.electronAPI.execute(`
        INSERT INTO sales (total, customer_id, discount, points_earned, coupon_code)
        VALUES (?, ?, ?, ?, ?)
      `, [finalTotal, customerId || null, totalDiscount, pointsEarned, couponCode]);

      const saleId = saleRes.lastInsertRowid;

      for (const item of cart) {
        let remaining = item.quantity;
        const batches = await window.electronAPI.query(`
          SELECT * FROM stock_batches WHERE product_id = ? AND quantity > 0 ORDER BY entry_date ASC
        `, [item.id]);

        for (const batch of batches) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, batch.quantity);
          await window.electronAPI.execute(`UPDATE stock_batches SET quantity = quantity - ? WHERE id = ?`, [take, batch.id]);
          await window.electronAPI.execute(`
            INSERT INTO sale_items (sale_id, product_id, batch_id, quantity, price)
            VALUES (?, ?, ?, ?, ?)
          `, [saleId, item.id, batch.id, take, item.price]);
          remaining -= take;
        }
      }

      if (customerId) {
        const pointsToSubtract = Math.round(discountFromPoints / 0.25);
        await window.electronAPI.execute(`
          UPDATE customers SET points = points + ? - ? WHERE id = ?
        `, [pointsEarned, pointsToSubtract, customerId]);
      }

      set({ cart: [] });
      await get().fetchProducts();
      useNotificationStore.getState().addNotification(`✅ Vendita completata! Totale €${finalTotal.toFixed(2)}`, 'success');
    } catch (error) {
      console.error('❌ completeSale error:', error);
      useNotificationStore.getState().addNotification("Errore durante la vendita", 'error');
    }
  },
}));