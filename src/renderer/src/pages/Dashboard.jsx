// src/renderer/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useProductsStore } from '../stores/useProductsStore';
import { useCustomersStore } from '../stores/useCustomersStore';
import { BarChart3, TrendingUp, Package, Users, DollarSign, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function Dashboard() {
  const { products, getTotalStock, getOldStock, fetchProducts } = useProductsStore();
  const { customers } = useCustomersStore();

  const [stats, setStats] = useState({
    revenueToday: 0,
    revenueMonth: 0,
    totalRevenue: 0,
    salesToday: 0,
    salesMonth: 0,
    avgTicket: 0,
    inventoryValue: 0,
  });

  const [salesTrend, setSalesTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    fetchProducts();
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Revenue Oggi
      const todayRes = await window.electronAPI.query(`
        SELECT COALESCE(SUM(total), 0) as value 
        FROM sales WHERE date(date) = date('now')
      `);
      
      // Revenue Questo mese
      const monthRes = await window.electronAPI.query(`
        SELECT COALESCE(SUM(total), 0) as value 
        FROM sales WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
      `);

      // Revenue Totale
      const totalRes = await window.electronAPI.query(`
        SELECT COALESCE(SUM(total), 0) as value FROM sales
      `);

      // Vendite Oggi / Mese
      const salesTodayRes = await window.electronAPI.query(`
        SELECT COUNT(*) as count FROM sales WHERE date(date) = date('now')
      `);
      const salesMonthRes = await window.electronAPI.query(`
        SELECT COUNT(*) as count FROM sales WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
      `);

      // Media scontrino
      const avgRes = await window.electronAPI.query(`
        SELECT COALESCE(AVG(total), 0) as avg FROM sales
      `);

      // Valore magazzino (al prezzo di vendita)
      const inventoryRes = await window.electronAPI.query(`
        SELECT COALESCE(SUM(sb.quantity * p.price), 0) as value
        FROM stock_batches sb
        JOIN products p ON sb.product_id = p.id
      `);

      setStats({
        revenueToday: todayRes[0]?.value || 0,
        revenueMonth: monthRes[0]?.value || 0,
        totalRevenue: totalRes[0]?.value || 0,
        salesToday: salesTodayRes[0]?.count || 0,
        salesMonth: salesMonthRes[0]?.count || 0,
        avgTicket: avgRes[0]?.avg || 0,
        inventoryValue: inventoryRes[0]?.value || 0,
      });

      // Andamento vendite ultimi 30 giorni
      const trendRes = await window.electronAPI.query(`
        SELECT date(date) as day, COALESCE(SUM(total), 0) as revenue
        FROM sales
        WHERE date >= date('now', '-30 days')
        GROUP BY date(date)
        ORDER BY day
      `);
      setSalesTrend(trendRes);

      // Top 5 prodotti più venduti
      const topRes = await window.electronAPI.query(`
        SELECT p.name, SUM(si.quantity) as qty, SUM(si.quantity * si.price) as revenue
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        GROUP BY p.id, p.name
        ORDER BY revenue DESC
        LIMIT 5
      `);
      setTopProducts(topRes);

    } catch (error) {
      console.error('❌ Errore caricamento statistiche Dashboard:', error);
    }
  };

  const lowStock = products.filter(p => getTotalStock(p.id) < (p.min_stock || 2));
  const oldStock = products.filter(p => getOldStock(p.id) > 0);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Dashboard Negozio</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
        <div className="bg-white rounded-3xl p-6 shadow text-center">
          <DollarSign className="mx-auto w-8 h-8 text-green-600 mb-2" />
          <p className="text-gray-500 text-sm">Revenue Oggi</p>
          <p className="text-xl font-bold mt-1">€{stats.revenueToday.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow text-center">
          <DollarSign className="mx-auto w-8 h-8 text-green-600 mb-2" />
          <p className="text-gray-500 text-sm">Revenue Mese</p>
          <p className="text-xl font-bold mt-1">€{stats.revenueMonth.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow text-center">
          <DollarSign className="mx-auto w-8 h-8 text-green-600 mb-2" />
          <p className="text-gray-500 text-sm">Revenue Totale</p>
          <p className="text-xl font-bold mt-1">€{stats.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow text-center">
          <BarChart3 className="mx-auto w-8 h-8 text-blue-600 mb-2" />
          <p className="text-gray-500 text-sm">Vendite Oggi</p>
          <p className="text-xl font-bold mt-1">{stats.salesToday}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow text-center">
          <Package className="mx-auto w-8 h-8 text-purple-600 mb-2" />
          <p className="text-gray-500 text-sm">Valore Magazzino</p>
          <p className="text-xl font-bold mt-1">€{stats.inventoryValue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow text-center">
          <Users className="mx-auto w-8 h-8 text-amber-600 mb-2" />
          <p className="text-gray-500 text-sm">Clienti Attivi</p>
          <p className="text-xl font-bold mt-1">{customers.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Andamento 30 giorni */}
        <div className="bg-white rounded-3xl p-8 shadow">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Andamento Vendite (ultimi 30 giorni)
          </h2>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={salesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(value) => `€${value}`} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 prodotti */}
        <div className="bg-white rounded-3xl p-8 shadow">
          <h2 className="text-xl font-semibold mb-6">Top 5 Prodotti più Venduti</h2>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={160} />
              <Tooltip formatter={(value) => `€${value}`} />
              <Bar dataKey="revenue" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Allerte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        <div className="bg-white rounded-3xl p-8 shadow">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-orange-600">
            <AlertTriangle /> Prodotti a Basso Stock
          </h2>
          {lowStock.length === 0 ? (
            <p className="text-green-600">✅ Tutti i prodotti sopra la soglia minima</p>
          ) : (
            <div className="space-y-4">
              {lowStock.map(p => (
                <div key={p.id} className="flex justify-between border-b pb-3">
                  <span className="font-medium">{p.name}</span>
                  <span className="font-bold text-orange-600">
                    {getTotalStock(p.id)} / min {p.min_stock}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-8 shadow">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-red-600">
            <AlertTriangle /> Lotti vecchi &gt; 18 mesi
          </h2>
          {oldStock.length === 0 ? (
            <p className="text-green-600">✅ Nessun lotto vecchio</p>
          ) : (
            <div className="space-y-4">
              {oldStock.map(p => (
                <div key={p.id} className="flex justify-between border-b pb-3">
                  <span className="font-medium">{p.name}</span>
                  <span className="font-bold text-red-600">
                    {getOldStock(p.id)} pezzi vecchi
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}