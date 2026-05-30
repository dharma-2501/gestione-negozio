// src/renderer/pages/Report.jsx
import { useEffect, useState } from 'react';
import { useProductsStore } from '../stores/useProductsStore';
import { useCustomersStore } from '../stores/useCustomersStore';
import { BarChart3, Package, AlertTriangle, TrendingUp, DollarSign, Download, Printer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Report() {
  const { products, getTotalStock, getOldStock, fetchProducts } = useProductsStore();
  const { customers } = useCustomersStore();

  const [topSold, setTopSold] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modali
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [showOldStockModal, setShowOldStockModal] = useState(false);

  useEffect(() => {
    fetchProducts();
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      const topData = await window.electronAPI.query(`
        SELECT p.name, SUM(si.quantity) as total_sold
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        GROUP BY p.id, p.name
        ORDER BY total_sold DESC
        LIMIT 10
      `);
      setTopSold(topData);

      const trendData = await window.electronAPI.query(`
        SELECT date(date) as day, COALESCE(SUM(total), 0) as revenue
        FROM sales
        WHERE date >= date('now', '-30 days')
        GROUP BY date(date)
        ORDER BY day
      `);
      setSalesTrend(trendData);
    } catch (error) {
      console.error('Errore caricamento report:', error);
    } finally {
      setLoading(false);
    }
  };

  const lowStockProducts = products
    .filter(p => getTotalStock(p.id) < (p.min_stock || 5))
    .sort((a, b) => getTotalStock(a.id) - getTotalStock(b.id));

  const oldStockProducts = products.filter(p => getOldStock(p.id) > 0);

  const totalStockValue = products.reduce((sum, p) => {
    return sum + (getTotalStock(p.id) * p.price);
  }, 0);

  // ==================== ESPORTA CSV ====================
  const exportToCSV = () => {
    const data = products
      .filter(p => getTotalStock(p.id) > 0)
      .map(p => ({
        Nome: p.name,
        Barcode: p.barcode || '',
        Categoria: p.category || '',
        'Prezzo Vendita': p.price,
        'Prezzo Acquisto': p.purchase_price || 0,
        Stock: getTotalStock(p.id),
        'Valore Magazzino': (getTotalStock(p.id) * p.price).toFixed(2)
      }));

    const csvContent = "data:text/csv;charset=utf-8," 
      + Object.keys(data[0]).join(",") + "\n"
      + data.map(row => Object.values(row).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "magazzino_completo.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==================== STAMPA / PDF (SOLO ELENCO PRODOTTI) ====================
  const printWarehouse = () => {
    const printContent = document.getElementById('printable-warehouse');
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // ripristina React
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <BarChart3 className="w-10 h-10" />
          Report & Andamento
        </h1>
        <div className="flex gap-3">
          <button onClick={exportToCSV} className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-2xl hover:bg-green-700">
            <Download size={20} /> Esporta CSV
          </button>
          <button onClick={printWarehouse} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700">
            <Printer size={20} /> Stampa / PDF Magazzino
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white rounded-3xl p-6 shadow">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500">Prodotti totali</p>
              <p className="text-xl font-bold mt-2">{products.length}</p>
            </div>
            <Package className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500">Valore magazzino</p>
              <p className="text-xl font-bold mt-2">€{totalStockValue.toFixed(2)}</p>
            </div>
            <DollarSign className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <div onClick={() => setShowLowStockModal(true)} className="bg-white rounded-3xl p-6 shadow cursor-pointer hover:shadow-xl transition">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500">Basso stock</p>
              <p className="text-xl font-bold mt-2 text-orange-600">{lowStockProducts.length}</p>
            </div>
            <AlertTriangle className="w-12 h-12 text-orange-600" />
          </div>
        </div>

        <div onClick={() => setShowOldStockModal(true)} className="bg-white rounded-3xl p-6 shadow cursor-pointer hover:shadow-xl transition">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500">Lotti vecchi</p>
              <p className="text-xl font-bold mt-2 text-red-600">{oldStockProducts.length}</p>
            </div>
            <AlertTriangle className="w-12 h-12 text-red-600" />
          </div>
        </div>
      </div>

      {/* Grafici */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl p-8 shadow">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Andamento Vendite (ultimi 30 giorni)
          </h2>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={salesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(value) => `€${value}`} />
              <Bar dataKey="revenue" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow">
          <h2 className="text-xl font-semibold mb-6">Top Prodotti più Venduti</h2>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={topSold} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={240} />
              <Tooltip />
              <Bar dataKey="total_sold" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* === SEZIONE NASCOSTA PER STAMPA/PDF (solo elenco prodotti) === */}
      <div id="printable-warehouse" className="hidden">
        <div style={{ padding: '40px 30px', fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '10px', fontSize: '28px' }}>Magazzino Completo</h1>
          <p style={{ textAlign: 'center', marginBottom: '30px', color: '#555' }}>
            Data: {new Date().toLocaleDateString('it-IT')}
          </p>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f4f4f4' }}>
                <th style={{ border: '1px solid #ccc', padding: '12px', textAlign: 'left' }}>Nome Prodotto</th>
                <th style={{ border: '1px solid #ccc', padding: '12px', textAlign: 'center' }}>Barcode</th>
                <th style={{ border: '1px solid #ccc', padding: '12px', textAlign: 'right' }}>Stock</th>
                <th style={{ border: '1px solid #ccc', padding: '12px', textAlign: 'right' }}>Prezzo Vendita</th>
                <th style={{ border: '1px solid #ccc', padding: '12px', textAlign: 'right' }}>Valore Totale</th>
              </tr>
            </thead>
            <tbody>
              {products
                .filter(p => getTotalStock(p.id) > 0)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(p => (
                  <tr key={p.id}>
                    <td style={{ border: '1px solid #ccc', padding: '12px' }}>{p.name}</td>
                    <td style={{ border: '1px solid #ccc', padding: '12px', textAlign: 'center', fontFamily: 'monospace' }}>
                      {p.barcode || '—'}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '12px', textAlign: 'right' }}>
                      {getTotalStock(p.id)}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '12px', textAlign: 'right' }}>
                      €{p.price.toFixed(2)}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '12px', textAlign: 'right' }}>
                      €{(getTotalStock(p.id) * p.price).toFixed(2)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modali Basso Stock e Lotti Vecchi (invariati) */}
      {showLowStockModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowLowStockModal(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[85vh] overflow-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <AlertTriangle className="text-orange-600" /> Prodotti a Basso Stock
            </h2>
            <div className="space-y-4">
              {lowStockProducts.map(p => (
                <div key={p.id} className="flex justify-between items-center border-b pb-4">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-gray-500">{p.barcode || '—'}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-orange-600 text-xl">
                      {getTotalStock(p.id)} / {p.min_stock}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowLowStockModal(false)} className="mt-8 w-full py-4 border rounded-2xl">Chiudi</button>
          </div>
        </div>
      )}

      {showOldStockModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowOldStockModal(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl p-8 max-w-4xl w-full mx-4 max-h-[85vh] overflow-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <AlertTriangle className="text-red-600" /> Lotti vecchi &gt; 18 mesi
            </h2>
            <div className="space-y-8">
              {oldStockProducts.map(p => (
                <div key={p.id} className="border rounded-2xl p-6">
                  <div className="flex justify-between mb-4">
                    <p className="font-semibold text-lg">{p.name}</p>
                    <p className="font-bold text-red-600">{getOldStock(p.id)} pezzi vecchi</p>
                  </div>
                  {p.barcode && (
                    <div className="flex justify-center bg-white border rounded-xl p-4">
                      <Barcode value={p.barcode} width={2.5} height={70} fontSize={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setShowOldStockModal(false)} className="mt-8 w-full py-4 border rounded-2xl">Chiudi</button>
          </div>
        </div>
      )}
    </div>
  );
}