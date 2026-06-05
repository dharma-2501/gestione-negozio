// src/renderer/pages/Clienti.jsx
import { useEffect, useRef, useState } from 'react';
import { useCustomersStore } from '../stores/useCustomersStore';
import { useNotification } from '../hooks/useNotification';
import { Users, Plus, Star, RefreshCw, X, Search, Gift, Edit2, Download, Trash2 } from 'lucide-react';
import Barcode from 'react-barcode';
import html2canvas from 'html2canvas';

export default function Clienti() {
  const { customers, loading, fetchCustomers, addCustomer, regenerateLoyaltyCode, updatePoints, deleteCustomer, updateCustomer } = useCustomersStore();
  const { notify } = useNotification();

  const [showForm, setShowForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });

  // Modale carta ingrandita
  const [modalCustomer, setModalCustomer] = useState(null);

  // Modale modifica punti
  const [editingPointsCustomer, setEditingPointsCustomer] = useState(null);
  const [newPointsValue, setNewPointsValue] = useState(0);

  // Modale modifica cliente
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editCustomerData, setEditCustomerData] = useState({ name: '', phone: '', email: '' });

  // Ricerca
  const [nameSearch, setNameSearch] = useState('');
  const [loyaltySearch, setLoyaltySearch] = useState('');   // filtro attivo (solo su Invio)
  const [loyaltyInput, setLoyaltyInput] = useState('');     // campo di input (non filtra in tempo reale)
  const [loyaltyMessage, setLoyaltyMessage] = useState('');

  const loyaltyInputRef = useRef(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(c => {
    const matchesName = !nameSearch || 
      c.name.toLowerCase().includes(nameSearch.toLowerCase()) ||
      (c.phone && c.phone.includes(nameSearch)) ||
      (c.email && c.email.toLowerCase().includes(nameSearch.toLowerCase()));

    // Ricerca tessera fedeltà solo quando loyaltySearch viene impostato (su Invio)
    const matchesLoyalty = !loyaltySearch || 
      (c.loyalty_code && c.loyalty_code.toLowerCase().includes(loyaltySearch.toLowerCase()));

    return matchesName && matchesLoyalty;
  });

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name) return;
    await addCustomer(newCustomer);
    setNewCustomer({ name: '', phone: '', email: '' });
    setShowForm(false);
  };

  const focusLoyaltyInput = () => {
    window.setTimeout(() => loyaltyInputRef.current?.focus(), 0);
  };

  const handleLoyaltySearch = (e) => {
    e.preventDefault();

    const term = loyaltyInput.trim().replace(/'/g, '-').toUpperCase();
    if (!term) {
      setLoyaltySearch('');
      setLoyaltyMessage('');
      focusLoyaltyInput();
      return;
    }

    setLoyaltySearch(term);
    const hasMatch = customers.some(c =>
      c.loyalty_code && c.loyalty_code.toUpperCase().includes(term)
    );

    setLoyaltyMessage(
      hasMatch
        ? `✅ Trovati clienti con codice ${term}`
        : '❌ Nessun cliente trovato con questo codice tessera fedeltà'
    );

    focusLoyaltyInput();
  };

  const openCard = (customer) => {
    setModalCustomer(customer);
  };

  const closeModal = () => {
    setModalCustomer(null);
  };

  // ==================== MODIFICA PUNTI ====================
  const openEditPoints = (customer) => {
    setEditingPointsCustomer(customer);
    setNewPointsValue(customer.points);
  };

  const savePoints = async () => {
    if (!editingPointsCustomer) return;
    try {
      await updatePoints(editingPointsCustomer.id, parseInt(newPointsValue) || 0);
      await fetchCustomers();
      setEditingPointsCustomer(null);
      notify("✅ Punti aggiornati con successo!");
    } catch (error) {
      console.error(error);
      notify("❌ Errore durante l'aggiornamento dei punti");
    }
  };

  // ==================== MODIFICA CLIENTE ====================
  const openEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setEditCustomerData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || ''
    });
  };

  const saveEditedCustomer = async () => {
    if (!editingCustomer || !editCustomerData.name) return;
    try {
      await updateCustomer(editingCustomer.id, editCustomerData);
      await fetchCustomers();
      setEditingCustomer(null);
      notify("✅ Cliente aggiornato con successo!");
    } catch (error) {
      console.error(error);
      notify("❌ Errore durante l'aggiornamento del cliente");
    }
  };

  // ==================== CANCELLA CLIENTE ====================
  const handleDeleteCustomer = async (customer) => {
    if (!window.confirm(`Vuoi davvero eliminare il cliente "${customer.name}"?\nQuesta azione è irreversibile.`)) return;
    try {
      await deleteCustomer(customer.id);
      await fetchCustomers();
      notify("✅ Cliente eliminato con successo!");
    } catch (error) {
      console.error(error);
      notify("❌ Errore durante l'eliminazione del cliente");
    }
  };

  // ==================== SALVA CODICE A BARRE CON SCELTA CARTELLA ====================
  const downloadBarcode = async (customer) => {
    const element = document.getElementById(`barcode-${customer.id}`);
    if (!element) return notify("Errore: barcode non trovato");

    try {
      const canvas = await html2canvas(element, { 
        scale: 4, 
        backgroundColor: "#ffffff",
        logging: false 
      });
      const base64 = canvas.toDataURL('image/png');

      const result = await window.electronAPI.saveBarcodeImage(
        `tessera-${customer.loyalty_code || 'cliente'}.png`,
        base64
      );

      if (result.success) {
        notify(`✅ Codice a barre salvato correttamente!\n${result.path}`);
      } else if (result.canceled) {
        // L'utente ha annullato
      } else {
        notify("Salvataggio fallito");
      }
    } catch (err) {
      console.error(err);
      notify("Errore durante il salvataggio del barcode");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <Users className="w-10 h-10" />
          Clienti & Carte Fedeltà
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-black text-white px-6 py-3 rounded-xl flex items-center gap-2"
        >
          <Plus /> Nuovo Cliente + Carta
        </button>
      </div>

      {/* Ricerca */}
      <div className="mb-8 flex gap-4">
        <div className="flex-1 bg-white p-4 rounded-3xl border flex items-center gap-3">
          <Search className="w-6 h-6 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per nome, telefono o email..."
            value={nameSearch}
            onChange={e => setNameSearch(e.target.value)}
            className="flex-1 border-0 bg-transparent text-lg focus:outline-none"
          />
        </div>

        <div className="flex-1 bg-white p-4 rounded-3xl border flex items-center gap-3">
          <Gift className="w-6 h-6 text-amber-500" />
          <input
            ref={loyaltyInputRef}
            type="text"
            placeholder="Codice Tessera Fedeltà (premi Invio per cercare)"
            value={loyaltyInput}
            onChange={e => {
              // Normalizza ' → - (per pistola barcode)
              const normalized = e.target.value.replace(/'/g, '-');
              setLoyaltyInput(normalized);
            }}
            onKeyDown={e => e.key === 'Enter' && handleLoyaltySearch(e)}
            className="flex-1 border-0 bg-transparent text-lg focus:outline-none"
          />
        </div>
      </div>
      {loyaltyMessage && <p className="mb-4 text-sm text-amber-700">{loyaltyMessage}</p>}

      {/* Form Nuovo Cliente */}
      {showForm && (
        <form onSubmit={handleAddCustomer} className="bg-white p-6 rounded-3xl shadow mb-8 grid grid-cols-3 gap-4">
          <input type="text" placeholder="Nome e Cognome" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="border p-4 rounded-2xl" required />
          <input type="tel" placeholder="Telefono" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="border p-4 rounded-2xl" />
          <input type="email" placeholder="Email" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} className="border p-4 rounded-2xl" />
          <button type="submit" className="col-span-3 bg-green-600 text-white py-4 rounded-2xl font-semibold">Crea Cliente + Carta Fedeltà</button>
        </form>
      )}

      {/* Griglia Clienti */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => (
          <div key={customer.id} className="bg-white rounded-3xl p-6 shadow hover:shadow-xl transition">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-semibold">{customer.name}</h3>
                {customer.phone && <p className="text-gray-600">{customer.phone}</p>}
                {customer.email && <p className="text-gray-500 text-sm">{customer.email}</p>}
              </div>
              <div className="text-right flex items-center gap-2">
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-6 h-6" />
                  <span className="text-4xl font-bold">{customer.points}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); openEditPoints(customer); }}
                  className="text-amber-600 hover:text-amber-700"
                >
                  <Edit2 size={18} />
                </button>
              </div>
            </div>

            {/* Carta Fedeltà cliccabile */}
            <div
              onClick={() => openCard(customer)}
              className="mt-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center cursor-pointer hover:border-blue-300 transition"
            >
              <p className="text-xs text-gray-500 mb-3 tracking-widest">CARTA FEDELTÀ</p>
              
              <div className="bg-white p-4 rounded-xl shadow-inner max-w-[280px]">
                <Barcode
                  value={customer.loyalty_code || 'CF-00000000'}
                  width={1.1}
                  height={55}
                  fontSize={13}
                  margin={8}
                />
              </div>

              <p className="font-mono text-sm mt-4 text-gray-700 tracking-wider">
                {customer.loyalty_code}
              </p>
            </div>

            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); openEditCustomer(customer); }}
                className="text-xs flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200"
              >
                <Edit2 className="w-3 h-3" />
                Modifica
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer); }}
                className="text-xs flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-xl hover:bg-red-200"
              >
                <Trash2 className="w-3 h-3" />
                Elimina
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); regenerateLoyaltyCode(customer.id); }}
                className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 px-2"
              >
                <RefreshCw className="w-3 h-3" />
                Rigenera codice
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modale Carta Ingrandita */}
      {modalCustomer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={closeModal}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-md w-full mx-4 p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">{modalCustomer.name}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500 mb-4">CARTA FEDELTÀ</p>
              
              <div id={`barcode-${modalCustomer.id}`} className="bg-white border-2 border-gray-200 rounded-2xl p-8 mb-6">
                <Barcode
                  value={modalCustomer.loyalty_code}
                  width={1.9}
                  height={90}
                  fontSize={18}
                  margin={15}
                />
              </div>

              <p className="font-mono text-xl tracking-[4px] text-gray-800">
                {modalCustomer.loyalty_code}
              </p>

              <div className="mt-8 flex items-center justify-center gap-2 text-yellow-500">
                <Star className="w-7 h-7" />
                <span className="text-5xl font-bold">{modalCustomer.points}</span>
                <span className="text-xl">punti</span>
              </div>
            </div>

            <button
              onClick={() => downloadBarcode(modalCustomer)}
              className="mt-8 w-full py-4 bg-black text-white rounded-2xl flex items-center justify-center gap-3"
            >
              <Download size={22} />
              Salva codice a barre come PNG (scegli cartella)
            </button>

            <button
              onClick={() => {
                regenerateLoyaltyCode(modalCustomer.id);
                setTimeout(() => setModalCustomer(null), 300);
              }}
              className="mt-4 w-full py-4 border border-gray-300 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50"
            >
              <RefreshCw className="w-5 h-5" />
              Rigenera codice a barre
            </button>
          </div>
        </div>
      )}

      {/* Modale Modifica Punti */}
      {editingPointsCustomer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setEditingPointsCustomer(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">Modifica Punti Fedeltà</h2>
            <p className="mb-4">Cliente: <strong>{editingPointsCustomer.name}</strong></p>
            
            <input
              type="number"
              value={newPointsValue}
              onChange={e => setNewPointsValue(e.target.value)}
              className="w-full border p-4 rounded-2xl text-4xl text-center font-bold mb-6"
            />

            <div className="flex gap-4">
              <button onClick={() => setEditingPointsCustomer(null)} className="flex-1 py-4 border rounded-2xl">Annulla</button>
              <button onClick={savePoints} className="flex-1 bg-green-600 text-white py-4 rounded-2xl">Salva Punti</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Modifica Cliente */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setEditingCustomer(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">Modifica Cliente</h2>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome e Cognome"
                value={editCustomerData.name}
                onChange={e => setEditCustomerData({ ...editCustomerData, name: e.target.value })}
                className="w-full border p-4 rounded-2xl"
                required
              />
              <input
                type="tel"
                placeholder="Telefono"
                value={editCustomerData.phone}
                onChange={e => setEditCustomerData({ ...editCustomerData, phone: e.target.value })}
                className="w-full border p-4 rounded-2xl"
              />
              <input
                type="email"
                placeholder="Email"
                value={editCustomerData.email}
                onChange={e => setEditCustomerData({ ...editCustomerData, email: e.target.value })}
                className="w-full border p-4 rounded-2xl"
              />
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setEditingCustomer(null)} className="flex-1 py-4 border rounded-2xl">Annulla</button>
              <button onClick={saveEditedCustomer} className="flex-1 bg-green-600 text-white py-4 rounded-2xl">Salva Modifiche</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}