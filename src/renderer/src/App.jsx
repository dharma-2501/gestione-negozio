// src/renderer/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Magazzino from './pages/Magazzino';

// Placeholder per le altre pagine (le creeremo una alla volta)
import Dashboard from './pages/Dashboard';   // la creeremo tra poco
import Cassa from './pages/Cassa';
import Clienti from './pages/Clienti';
import Impostazioni from './pages/Impostazioni';
import Coupon from './pages/Coupon';
import Report from './pages/Report';
// import Coupon from './pages/Coupon';
// import Report from './pages/Report';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="magazzino" element={<Magazzino />} />
          <Route path="cassa" element={<Cassa />} /> 
          <Route path="clienti" element={<Clienti />} />
          <Route path="impostazioni" element={<Impostazioni/>} />
          <Route path="coupon" element={<Coupon />} />
          <Route path="report" element={<Report />} />
          {/* Le altre pagine le aggiungiamo dopo */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;