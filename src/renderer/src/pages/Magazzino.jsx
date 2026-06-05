// src/renderer/pages/Magazzino.jsx
import { useEffect, useState } from 'react';
import { useProductsStore } from '../stores/useProductsStore';
import { useCategoriesStore } from '../stores/useCategoriesStore';
import { useNotification } from '../hooks/useNotification';
import { Package, Plus, Edit2, Trash2, Check, X } from 'lucide-react';

export default function Magazzino() {
  const { 
    products, 
    loading, 
    fetchProducts, 
    addProduct, 
    addBatch, 
    updateProduct, 
    deleteProduct, 
    getTotalStock, 
    getOldStock 
  } = useProductsStore();

  const { categories, fetchCategories, addCategory, deleteCategory, updateCategory } = useCategoriesStore();
  const { notify } = useNotification();

const [searchTerm, setSearchTerm] = useState('');
const [barcodeSearch, setBarcodeSearch] = useState('');
const [appliedBarcodeFilter, setAppliedBarcodeFilter] = useState('') 

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [newProduct, setNewProduct] = useState({ name: '', price: '', purchasePrice: '', category: '', barcode: '', min_stock: 1, quantity: '' });
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [stockForm, setStockForm] = useState({ action: 'add', quantity: '', purchasePrice: '', supplier: '', notes: '' });
  const [newCategoryName, setNewCategoryName] = useState('');

  // ==================== MODIFICA CATEGORIA ====================
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

 

const normalizeBarcode = (value) =>
  String(value ?? '')
    .replace(/[\r\n\t]/g, '')
    .replace(/\s+/g, '')
    .trim();

const filteredProducts = products.filter((p) => {
  const term = searchTerm.toLowerCase().trim();

  const matchesText =
    (p.name || '').toLowerCase().includes(term) ||
    normalizeBarcode(p.barcode).includes(normalizeBarcode(term));

  const matchesBarcodeFilter =
    !appliedBarcodeFilter ||
    normalizeBarcode(p.barcode) === normalizeBarcode(appliedBarcodeFilter);

  return matchesText && matchesBarcodeFilter;
});

const handleBarcodeSearch = (valueFromEvent) => {
  const raw = valueFromEvent !== undefined ? valueFromEvent : barcodeSearch;
  const code = normalizeBarcode(raw);

  if (!code) {
    setAppliedBarcodeFilter('');
    return;
  }

  setAppliedBarcodeFilter(code);
};

const handleKeyDown = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleBarcodeSearch(event.target.value);
  }
};

  const openStockModal = (product) => {
    setSelectedProduct(product);
    setStockForm({ action: 'add', quantity: '', purchasePrice: '', supplier: '', notes: '' });
    setShowStockModal(true);
  };

  const handleStockAction = async () => {
    if (!selectedProduct || !stockForm.quantity) return notify("Inserisci una quantità!");
    const qty = parseInt(stockForm.quantity);
    if (isNaN(qty)) return notify("Quantità non valida");

    const current = getTotalStock(selectedProduct.id);

    try {
      if (stockForm.action === 'set') {
        if (qty < 0) return notify("La quantità non può essere negativa!");
        if (qty < current && !window.confirm(`Stai riducendo da ${current} a ${qty} pezzi.\n\nConfermi?`)) return;
        await addBatch(selectedProduct.id, qty - current, null, null, 'Correzione quantità');
      } else {
        await addBatch(selectedProduct.id, qty, null, null, 'Aggiunta merce');
      }
      setShowStockModal(false);
      notify("✅ Quantità aggiornata con successo!");
    } catch (error) {
      console.error("Errore handleStockAction:", error);
      notify(`❌ Errore:\n${error.message || error}`);
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      price: product.price,
      purchasePrice: product.purchase_price || '',
      category: product.category || '',
      barcode: product.barcode || '',
      min_stock: product.min_stock || 1
    });
    setShowEditModal(true);
  };

  const saveEditedProduct = async () => {
    if (!editingProduct) return;
    await updateProduct(editingProduct.id, newProduct);
    setShowEditModal(false);
    setEditingProduct(null);
    fetchProducts();
  };

  const handleAddNewProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return notify("Nome e prezzo sono obbligatori!");

    try {
      const productToAdd = { ...newProduct };
      const quantity = newProduct.quantity ? parseInt(newProduct.quantity) : 0;
      
      await addProduct(productToAdd);
      
      if (quantity > 0) {
        const products = await fetchProducts();
        const addedProduct = products[products.length - 1];
        await addBatch(addedProduct.id, quantity, null, null, 'Quantità iniziale');
      }
      
      setShowAddModal(false);
      setNewProduct({ name: '', price: '', purchasePrice: '', category: '', barcode: '', min_stock: 1, quantity: '' });
      fetchProducts();
      notify("✅ Prodotto aggiunto con successo!");
    } catch (error) {
      console.error("Errore addProduct:", error);
      notify(`❌ Errore durante l'aggiunta:\n${error.message || error}`);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return notify("Inserisci il nome della categoria");
    try {
      await addCategory(name);
      setNewCategoryName('');
      notify(`✅ Categoria "${name}" aggiunta con successo!`);
    } catch (error) {
      console.error("Errore completo:", error);
      notify(`❌ Errore durante l'aggiunta della categoria:\n\n${error.message || error}`);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Vuoi davvero eliminare questa categoria?")) return;
    try {
      await deleteCategory(id);
      await fetchCategories();
      notify("✅ Categoria eliminata con successo!");
    } catch (error) {
      console.error(error);
      notify("❌ Errore durante l'eliminazione della categoria");
    }
  };

  // ==================== RINOMINA CATEGORIA ====================
  const startEditingCategory = (category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };

  const saveCategoryEdit = async () => {
    if (!editingCategoryId || !editingCategoryName.trim()) return;
    try {
      await updateCategory(editingCategoryId, editingCategoryName);
      setEditingCategoryId(null);
      setEditingCategoryName('');
      notify("✅ Categoria rinominata con successo!");
    } catch (error) {
      console.error(error);
      notify(`❌ Errore durante la rinomina:\n${error.message || error}`);
    }
  };

  const cancelCategoryEdit = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  if (loading) return <div className="p-8 text-center text-xl">Caricamento magazzino...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <Package className="w-10 h-10" /> Magazzino
        </h1>
        <div className="flex gap-3">
          <button onClick={() => setShowCategoryModal(true)} className="bg-gray-700 text-white px-5 py-3 rounded-xl">Gestisci Categorie</button>
          <button onClick={() => setShowAddModal(true)} className="bg-black text-white px-6 py-3 rounded-xl flex items-center gap-2">
            <Plus /> Nuovo Prodotto
          </button>
        </div>
      </div>

      {/* Ricerca rapida barcode */}
      <div className="flex flex-row gap-4 p-4 bg-purple-50 rounded-2xl border border-purple-200 mb-6">
        <label className="block text-sm font-medium mb-2 text-purple-600">Aggiungi / Modifica Prodotto Rapida</label>
        <input
          type="text"
          value={barcodeSearch}
          onChange={(e) => setBarcodeSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scansiona codice a barre e premi Invio"
          className="border rounded px-3 py-2 w-full"
        />
        <button
        type="button"
        onClick={() => {
          setBarcodeSearch('');
          setAppliedBarcodeFilter('');
        }}
        className="bg-gray-700 text-white px-5 py-3 rounded-xl"
      >
        ❌
      </button>
      </div>

      {/* Ricerca generale */}
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-3xl p-2 mb-4">
        <label className="block text-sm font-medium mb-2">Cerca nel Magazzino</label>
        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Scrivi qui..." className="w-full border p-4 rounded-2xl text-md" />
      </div>

      {/* Tabella (invariata) */}
      <div className="bg-white rounded-3xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left">Codice a Barre</th>
              <th className="px-6 py-4 text-left">Prodotto</th>
              <th className="px-6 py-4 text-left">Categoria</th>
              <th className="px-6 py-4 text-right">Prezzo Vendita</th>
              <th className="px-6 py-4 text-right">Prezzo Acquisto</th>
              <th className="px-6 py-4 text-center">Stock</th>
              <th className="px-6 py-4 text-center">Vecchi</th>
              <th className="px-6 py-4 text-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(p => {
              const total = getTotalStock(p.id);
              const old = getOldStock(p.id);
              const isLow = total < (p.min_stock || 1);
              return (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-5 font-mono text-sm text-gray-700">{p.barcode || '-'}</td>
                  <td className="px-6 py-5 font-medium">{p.name}</td>
                  <td className="px-6 py-5 text-gray-600">{p.category || '-'}</td>
                  <td className="px-6 py-5 text-right font-semibold">€{Number(p.price).toFixed(2)}</td>
                  <td className="px-6 py-5 text-right text-gray-500">€{Number(p.purchase_price || 0).toFixed(2)}</td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-4 py-1 rounded-full ${isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{total}</span>
                  </td>
                  <td className="px-6 py-5 text-center">{old > 0 ? <span className="text-red-600">⚠️ {old}</span> : '—'}</td>
                  <td className="px-6 py-5 text-center flex gap-2 justify-center">
                    <button onClick={() => openStockModal(p)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">Gestisci Quantità</button>
                    <button onClick={() => openEditModal(p)} className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm"><Edit2 size={16}/></button>
                    <button onClick={() => deleteProduct(p.id)} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm"><Trash2 size={16}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modale Nuovo Prodotto (invariato) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-6">Nuovo Prodotto</h2>
            <form onSubmit={handleAddNewProduct} className="space-y-5">
              <input type="text" placeholder="Nome prodotto" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full border p-4 rounded-2xl" required />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" placeholder="Prezzo Vendita €" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="border p-4 rounded-2xl" required />
                <input type="number" step="0.01" placeholder="Prezzo Acquisto €" value={newProduct.purchasePrice} onChange={e => setNewProduct({...newProduct, purchasePrice: e.target.value})} className="border p-4 rounded-2xl" />
              </div>
              <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full border p-4 rounded-2xl">
                <option value="">Seleziona categoria</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <input type="text" placeholder="Codice a barre" value={newProduct.barcode} onChange={e => setNewProduct({...newProduct, barcode: e.target.value})} className="w-full border p-4 rounded-2xl" />
              <input type="number" placeholder="Quantità iniziale (opzionale)" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: e.target.value})} className="w-full border p-4 rounded-2xl" />
              <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold">Salva Prodotto</button>
            </form>
            <button onClick={() => setShowAddModal(false)} className="mt-4 w-full py-4 border rounded-2xl">Annulla</button>
          </div>
        </div>
      )}

      {/* Modale Modifica Prodotto (invariato) */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-6">Modifica Prodotto</h2>
            <div className="space-y-5">
              <input type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full border p-4 rounded-2xl" />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="border p-4 rounded-2xl" />
                <input type="number" step="0.01" value={newProduct.purchasePrice} onChange={e => setNewProduct({...newProduct, purchasePrice: e.target.value})} className="border p-4 rounded-2xl" />
              </div>
              <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full border p-4 rounded-2xl">
                <option value="">Seleziona categoria</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <input type="text" value={newProduct.barcode} onChange={e => setNewProduct({...newProduct, barcode: e.target.value})} className="w-full border p-4 rounded-2xl" />
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-4 border rounded-2xl">Annulla</button>
              <button onClick={saveEditedProduct} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-semibold">Salva Modifiche</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Gestisci Quantità (invariato) */}
      {showStockModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-2">Gestisci Quantità</h2>
            <p className="mb-6 font-medium">{selectedProduct.name}</p>
            <p className="text-sm text-gray-500 mb-4">Attualmente: <strong>{getTotalStock(selectedProduct.id)} pezzi</strong></p>
            <div className="space-y-4">
              <select value={stockForm.action} onChange={e => setStockForm({...stockForm, action: e.target.value})} className="w-full border p-4 rounded-2xl">
                <option value="add">Aggiungi pezzi</option>
                <option value="set">Imposta quantità totale (puoi diminuire)</option>
              </select>
              <input type="number" placeholder={stockForm.action === 'set' ? "Nuova quantità totale" : "Quantità da aggiungere"} value={stockForm.quantity} onChange={e => setStockForm({...stockForm, quantity: e.target.value})} className="w-full border p-4 rounded-2xl text-2xl" />
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowStockModal(false)} className="flex-1 py-4 border rounded-2xl">Annulla</button>
              <button onClick={handleStockAction} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-semibold">
                {stockForm.action === 'set' ? 'Imposta Quantità' : 'Aggiungi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE GESTISCI CATEGORIE CON RINOMINA */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">Gestisci Categorie</h2>
            
            <div className="flex gap-2 mb-6">
              <input 
                type="text" 
                value={newCategoryName} 
                onChange={e => setNewCategoryName(e.target.value)} 
                placeholder="Nuova categoria" 
                className="flex-1 border p-4 rounded-2xl" 
              />
              <button onClick={handleAddCategory} className="bg-green-600 text-white px-6 rounded-2xl">Aggiungi</button>
            </div>

            <div className="max-h-96 overflow-auto space-y-2">
              {categories.map(c => (
                <div key={c.id} className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-2xl">
                  {editingCategoryId === c.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingCategoryName}
                        onChange={e => setEditingCategoryName(e.target.value)}
                        className="flex-1 border p-3 rounded-xl text-sm"
                        autoFocus
                      />
                      <button onClick={saveCategoryEdit} className="text-green-600"><Check size={20} /></button>
                      <button onClick={cancelCategoryEdit} className="text-red-500"><X size={20} /></button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium">{c.name}</span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => startEditingCategory(c)} className="text-amber-600 hover:text-amber-700">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDeleteCategory(c.id)} className="text-red-500">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => setShowCategoryModal(false)} className="mt-8 w-full py-4 border rounded-2xl">Chiudi</button>
          </div>
        </div>
      )}
    </div>
  );
}