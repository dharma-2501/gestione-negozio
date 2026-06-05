// src/renderer/pages/Cassa.jsx
import { useState, useEffect } from 'react';
import { useProductsStore } from '../stores/useProductsStore';
import { useCustomersStore } from '../stores/useCustomersStore';
import { useCouponsStore } from '../stores/useCouponsStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { ShoppingCart, Plus, Minus, Trash2, User, Gift, Ticket, AlertTriangle } from 'lucide-react';

export default function Cassa() {
  const { products, cart, addToCart, removeFromCart, changeQuantity, completeSale, getTotalStock } = useProductsStore();
  const { customers, fetchCustomers } = useCustomersStore();
  const { coupons, fetchCoupons } = useCouponsStore();
  const { getPointsPerEuro } = useSettingsStore();

  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const [loyaltySearch, setLoyaltySearch] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchCoupons();
  }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()))
  );

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // RISCATTO: 1 punto = €0.25
  const redeemValue = 0.25;
  const actualPointsUsed = usePoints && selectedCustomer 
    ? Math.min(pointsToRedeem, selectedCustomer.points) 
    : 0;

  const discountFromPoints = actualPointsUsed * redeemValue;
  const discountFromCoupon = appliedCoupon
    ? appliedCoupon.type === 'percent'
      ? total * (appliedCoupon.discount / 100)
      : appliedCoupon.discount
    : 0;

  const finalTotal = Math.max(0, total - discountFromPoints - discountFromCoupon);

  // GUADAGNO PUNTI: 1 punto ogni €5 sulla spesa dopo coupon ma PRIMA dello sconto punti
  const netAfterCoupon = total - discountFromCoupon;
  const pointsEarned = (actualPointsUsed > 0) ? 0 : Math.floor(netAfterCoupon / 5);

  // Applica Coupon
  const applyCoupon = () => {
    if (!couponCode.trim()) return alert("Inserisci un codice coupon");
    const coupon = coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase() && c.is_active);
    if (!coupon) return alert("❌ Coupon non valido");
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return alert("❌ Coupon scaduto");
    if (coupon.min_spend > 0 && total < coupon.min_spend) return alert(`❌ Minimo spesa: €${coupon.min_spend}`);

    setAppliedCoupon(coupon);
    setCouponCode('');
    alert(`✅ Coupon "${coupon.code}" applicato!`);
  };

  const handleLoyaltySearch = () => {
    const code = loyaltySearch.trim().replace(/'/g, '-').toUpperCase();
    if (!code) return;

    const found = customers.find(c => 
      c.loyalty_code && c.loyalty_code.toUpperCase() === code
    );
    if (found) {
      setSelectedCustomerId(found.id);
      setLoyaltySearch('');
      alert(`✅ Cliente trovato: ${found.name}`);
    } else {
      alert("❌ Nessun cliente trovato con questo codice tessera fedeltà");
    }
  };

  const handleCompleteSale = async () => {
    try {
      await completeSale(
  selectedCustomerId, 
  discountFromPoints, 
  pointsEarned,
  appliedCoupon ? appliedCoupon.code : null   // ← tracciamento coupon
);
      
      // === AGGIORNAMENTO IMMEDIATO DEI CLIENTI ===
      await fetchCustomers();                    // ← questa era la riga mancante
      
      // Reset tutto
      setUsePoints(false);
      setPointsToRedeem(0);
      setAppliedCoupon(null);
      setSelectedCustomerId(null);
      setLoyaltySearch('');
      
      alert(`✅ Vendita completata!`);
    } catch (error) {
      console.error("Errore completeSale:", error);
      alert("❌ Errore durante il completamento della vendita");
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      const cust = customers.find(c => c.id === parseInt(selectedCustomerId));
      setSelectedCustomer(cust || null);
      setUsePoints(false);
      setPointsToRedeem(0);
    } else {
      setSelectedCustomer(null);
    }
  }, [selectedCustomerId, customers]);

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 overflow-auto">
        <h1 className="text-3xl font-bold mb-6">Cassa</h1>

        <div className="mb-4 bg-white p-4 rounded-3xl border flex items-center gap-3">
          <Gift className="w-6 h-6 text-amber-500" />
          <input
            type="text"
            placeholder="Codice Tessera Fedeltà (premi Invio)"
            value={loyaltySearch}
            onChange={e => {
              // Converte automaticamente ' in - (problema pistola barcode)
              const normalized = e.target.value.replace(/'/g, '-');
              setLoyaltySearch(normalized);
            }}
            onKeyDown={e => e.key === 'Enter' && handleLoyaltySearch()}
            className="flex-1 border-0 bg-transparent text-lg focus:outline-none"
          />
          <button onClick={handleLoyaltySearch} className="bg-amber-500 text-white px-5 py-2 rounded-2xl text-sm font-medium">Cerca</button>
        </div>

        <div className="mb-6 bg-white p-4 rounded-3xl border flex items-center gap-3">
          <User className="w-6 h-6 text-gray-400" />
          <select value={selectedCustomerId || ''} onChange={e => setSelectedCustomerId(e.target.value || null)} className="flex-1 border-0 bg-transparent text-lg">
            <option value="">👤 Cliente anonimo</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.points} punti</option>)}
          </select>
        </div>

        <input type="text" placeholder="Cerca per nome o codice a barre..." value={search} onChange={e => setSearch(e.target.value)} className="w-full p-4 border rounded-2xl mb-6 text-lg" />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filteredProducts.map(p => (
            <div key={p.id} onClick={() => addToCart(p)} className="bg-white border rounded-3xl p-6 cursor-pointer hover:shadow-xl transition">
              <h3 className="font-semibold">{p.name}</h3>
              {p.barcode && <p className="text-xs text-gray-500">📟 {p.barcode}</p>}
              <p className="text-3xl font-bold text-green-600 mt-2">€{p.price.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Carrello */}
      <div className="w-96 bg-white border-l p-6 flex flex-col">
        <h2 className="text-2xl font-bold mb-6">Carrello</h2>

        <div className="flex-1 overflow-auto space-y-4">
          {cart.map(item => {
            const available = getTotalStock(item.id);
            const warning = item.quantity > available;
            return (
              <div key={item.id} className="flex justify-between items-center border-b pb-4">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">€{item.price} × {item.quantity}</p>
                  {warning && <p className="text-red-600 text-xs flex items-center gap-1"><AlertTriangle size={14}/> Solo {available} disponibili</p>}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => changeQuantity(item.id, item.quantity - 1)}><Minus /></button>
                  <span className="font-mono w-8 text-center">{item.quantity}</span>
                  <button onClick={() => changeQuantity(item.id, item.quantity + 1)}><Plus /></button>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-500"><Trash2 /></button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Coupon */}
        <div className="mt-4 p-4 bg-purple-50 rounded-2xl border border-purple-200">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <Ticket className="w-5 h-5" />
            <span>Coupon</span>
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="Codice coupon" value={couponCode} onChange={e => setCouponCode(e.target.value)} className="flex-1 border rounded-2xl px-4 py-3" />
            <button onClick={applyCoupon} className="px-2 bg-purple-600 text-white rounded-2xl">Applica</button>
          </div>
          {appliedCoupon && <div className="mt-3 text-purple-700">✅ {appliedCoupon.code} applicato</div>}
        </div>

        {/* Punti */}
        {selectedCustomer && selectedCustomer.points > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-2xl border border-yellow-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={usePoints} onChange={() => setUsePoints(!usePoints)} />
              <span className="font-medium">Usa punti fedeltà</span>
            </label>
            {usePoints && (
              <div className="mt-3 flex items-center gap-3">
                <input type="number" min="0" max={selectedCustomer.points} value={pointsToRedeem} onChange={e => setPointsToRedeem(Math.min(parseInt(e.target.value) || 0, selectedCustomer.points))} className="w-24 text-center border rounded-xl p-3" />
                <span className="text-sm">punti → sconto €{(pointsToRedeem * redeemValue).toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Totale + Debug Punti */}
        <div className="pt-6 border-t mt-auto">
          <div className="flex justify-between text-xl">
            <span>Subtotale</span>
            <span>€{total.toFixed(2)}</span>
          </div>
          {discountFromCoupon > 0 && <div className="flex justify-between text-purple-600"><span>Sconto Coupon</span><span>-€{discountFromCoupon.toFixed(2)}</span></div>}
          {discountFromPoints > 0 && <div className="flex justify-between text-green-600"><span>Sconto Punti ({actualPointsUsed} pt)</span><span>-€{discountFromPoints.toFixed(2)}</span></div>}

          <div className="flex justify-between text-3xl font-bold mt-4">
            <span>Totale</span>
            <span>€{finalTotal.toFixed(2)}</span>
          </div>

          {/* DEBUG visibile */}
          <div className="text-xs text-gray-500 mt-3 text-center border-t pt-3">
            Netto dopo coupon: €{netAfterCoupon.toFixed(2)}<br/>
            Punti guadagnati questa vendita: <strong>{pointsEarned}</strong>
          </div>

          <button
            onClick={handleCompleteSale}
            disabled={cart.length === 0}
            className="w-full mt-8 py-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-2xl font-semibold rounded-3xl"
          >
            COMPLETA VENDITA
          </button>
        </div>
      </div>
    </div>
  );
}