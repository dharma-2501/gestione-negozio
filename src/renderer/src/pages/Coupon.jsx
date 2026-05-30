// src/renderer/pages/Coupon.jsx
import { useEffect, useState } from 'react';
import { useCouponsStore } from '../stores/useCouponsStore';
import { Ticket, Plus, ToggleLeft, ToggleRight, Download, X } from 'lucide-react';
import Barcode from 'react-barcode';
import html2canvas from 'html2canvas';

export default function Coupon() {
  const { coupons, fetchCoupons, addCoupon, toggleCoupon } = useCouponsStore();

  const [showForm, setShowForm] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);

  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount: '',
    type: 'percent',
    expires_at: '',
    neverExpires: true,
    min_spend: 0
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  // ==================== CREA COUPON ====================
  const handleAddCoupon = async (e) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.discount) {
      return alert("Codice e valore sconto sono obbligatori!");
    }

    try {
      await addCoupon({
        code: newCoupon.code.toUpperCase(),
        discount: Number(newCoupon.discount),
        type: newCoupon.type,
        expires_at: newCoupon.neverExpires ? null : newCoupon.expires_at,
        min_spend: Number(newCoupon.min_spend) || 0
      });

      setNewCoupon({ code: '', discount: '', type: 'percent', expires_at: '', neverExpires: true, min_spend: 0 });
      setShowForm(false);
      alert("✅ Coupon creato con successo!");
    } catch (error) {
      console.error("Errore addCoupon:", error);
      alert(`❌ Errore durante la creazione del coupon:\n${error.message || error}`);
    }
  };

  const isExpired = (expiresAt) => expiresAt && new Date(expiresAt) < new Date();

  // ==================== DOWNLOAD BARCODE ====================
  const downloadBarcode = async (coupon) => {
    const element = document.getElementById(`barcode-${coupon.id}`);
    if (!element) return alert("Errore: barcode non trovato");

    try {
      const canvas = await html2canvas(element, { 
        scale: 4, 
        backgroundColor: "#ffffff",
        logging: false
      });
      const base64 = canvas.toDataURL('image/png');

      const result = await window.electronAPI.saveBarcodeImage(
        `coupon-${coupon.code}.png`, 
        base64
      );

      if (result.success) {
        alert(`✅ Coupon salvato!\n${result.path}`);
      } else {
        alert("Salvataggio annullato o fallito");
      }
    } catch (err) {
      console.error(err);
      alert("Errore durante il salvataggio del barcode");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <Ticket className="w-10 h-10" />
          Coupon Generici
        </h1>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="bg-black text-white px-6 py-3 rounded-xl flex items-center gap-2"
        >
          <Plus /> Nuovo Coupon
        </button>
      </div>

      {/* Form Nuovo Coupon */}
      {showForm && (
        <form onSubmit={handleAddCoupon} className="bg-white rounded-3xl shadow p-8 mb-8 grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-3">
            <label className="block text-sm font-medium mb-2">Codice Coupon</label>
            <input
              type="text"
              placeholder="SUMMER25"
              value={newCoupon.code}
              onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
              className="w-full border p-4 rounded-2xl text-xl font-mono"
              required
            />
          </div>

          <div className="col-span-6 md:col-span-2">
            <label className="block text-sm font-medium mb-2">Valore sconto</label>
            <input
              type="number"
              placeholder="20"
              value={newCoupon.discount}
              onChange={e => setNewCoupon({ ...newCoupon, discount: e.target.value })}
              className="w-full border p-4 rounded-2xl"
              required
            />
          </div>

          <div className="col-span-6 md:col-span-2">
            <label className="block text-sm font-medium mb-2">Tipo</label>
            <select
              value={newCoupon.type}
              onChange={e => setNewCoupon({ ...newCoupon, type: e.target.value })}
              className="w-full border p-4 rounded-2xl"
            >
              <option value="percent">% sconto</option>
              <option value="fixed">€ fisso</option>
            </select>
          </div>

          <div className="col-span-12 md:col-span-5">
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={newCoupon.neverExpires}
                onChange={e => setNewCoupon({ ...newCoupon, neverExpires: e.target.checked })}
                className="w-5 h-5"
              />
              <span>Scade mai (coupon generico)</span>
            </label>

            {!newCoupon.neverExpires && (
              <input
                type="date"
                value={newCoupon.expires_at}
                onChange={e => setNewCoupon({ ...newCoupon, expires_at: e.target.value })}
                className="w-full border p-4 rounded-2xl"
              />
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Spesa minima (€)</label>
              <input
                type="number"
                value={newCoupon.min_spend}
                onChange={e => setNewCoupon({ ...newCoupon, min_spend: e.target.value })}
                className="w-full border p-4 rounded-2xl"
                placeholder="0 = nessuna"
              />
            </div>
          </div>

          <button type="submit" className="col-span-12 bg-green-600 text-white py-5 rounded-3xl font-semibold text-xl mt-4">
            Crea Coupon
          </button>
        </form>
      )}

      {/* Tabella Coupon */}
      <div className="bg-white rounded-3xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-5 text-left">Codice</th>
              <th className="px-6 py-5 text-left">Sconto</th>
              <th className="px-6 py-5 text-center">Scadenza</th>
              <th className="px-6 py-5 text-center">Stato</th>
              <th className="px-6 py-5 text-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map(c => {
              const expired = isExpired(c.expires_at);
              return (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td 
                    className="px-6 py-5 font-mono font-bold text-lg cursor-pointer hover:text-blue-600"
                    onClick={() => setSelectedCoupon(c)}
                  >
                    {c.code}
                  </td>
                  <td className="px-6 py-5">
                    {c.type === 'percent' ? `${c.discount}%` : `€${c.discount}`}
                  </td>
                  <td className="px-6 py-5 text-center text-sm">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString('it-IT') : '∞ Senza scadenza'}
                  </td>
                  <td className="px-6 py-5 text-center">
                    {expired ? (
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">Scaduto</span>
                    ) : c.is_active ? (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">Attivo</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-sm">Disattivato</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button onClick={() => toggleCoupon(c.id)} className="text-blue-600">
                      {c.is_active ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modale Codice a Barre Ingrandito */}
      {selectedCoupon && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" 
          onClick={() => setSelectedCoupon(null)}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className="bg-white rounded-3xl p-10 max-w-md w-full mx-4"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">Coupon: {selectedCoupon.code}</h2>
              <button onClick={() => setSelectedCoupon(null)} className="text-gray-400 hover:text-gray-600">
                <X size={30} />
              </button>
            </div>

            <div id={`barcode-${selectedCoupon.id}`} className="bg-white border-2 border-gray-200 rounded-2xl p-10 flex justify-center">
              <Barcode
                value={selectedCoupon.code}
                width={3.2}
                height={110}
                fontSize={20}
                margin={25}
              />
            </div>

            <button
              onClick={() => downloadBarcode(selectedCoupon)}
              className="mt-10 w-full py-5 bg-black text-white rounded-2xl flex items-center justify-center gap-3 text-lg font-medium"
            >
              <Download size={24} />
              Salva come PNG (scegli cartella)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}