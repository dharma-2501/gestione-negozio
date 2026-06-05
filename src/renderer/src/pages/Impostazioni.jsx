// src/renderer/pages/Impostazioni.jsx
import { useEffect, useState } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useNotification } from '../hooks/useNotification';
import { Settings, Save } from 'lucide-react';

export default function Impostazioni() {
  const { settings, fetchSettings, updateSetting, getPointsPerEuro } = useSettingsStore();
  const { notify } = useNotification();
  const [pointsPerEuro, setPointsPerEuro] = useState(10);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings.points_per_euro) {
      setPointsPerEuro(parseInt(settings.points_per_euro));
    }
  }, [settings]);

  const handleSave = async () => {
    await updateSetting('points_per_euro', pointsPerEuro);
    notify('✅ Impostazione salvata!');
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold flex items-center gap-3 mb-8">
        <Settings className="w-10 h-10" />
        Impostazioni
      </h1>

      <div className="bg-white rounded-3xl shadow p-8">
        <label className="block text-lg font-medium mb-3">
          Punti fedeltà: 1 punto ogni
        </label>
        
        <div className="flex items-center gap-4">
          <input
            type="number"
            min="1"
            value={pointsPerEuro}
            onChange={(e) => setPointsPerEuro(parseInt(e.target.value) || 1)}
            className="w-24 text-4xl font-bold border rounded-2xl p-4 text-center"
          />
          <span className="text-2xl">euro</span>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Attualmente: <strong>1 punto ogni {getPointsPerEuro()} €</strong>
        </p>

        <button
          onClick={handleSave}
          className="mt-8 w-full bg-black text-white py-5 rounded-3xl text-lg font-semibold flex items-center justify-center gap-2 hover:bg-gray-800"
        >
          <Save className="w-5 h-5" />
          Salva Impostazione
        </button>
      </div>
    </div>
  );
}