// src/renderer/components/Layout.jsx
import { Outlet, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, 
  Ticket, BarChart3, Settings 
} from 'lucide-react';

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r shadow-sm flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🛒 Negozio
          </h1>
        </div>

        <nav className="flex-1 p-3">
          <NavLink
            to="/"
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-xl mb-1 ${isActive ? 'bg-black text-white' : 'hover:bg-gray-100'}`
            }
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </NavLink>

          <NavLink
            to="/magazzino"
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-xl mb-1 ${isActive ? 'bg-black text-white' : 'hover:bg-gray-100'}`
            }
          >
            <Package className="w-5 h-5" />
            Magazzino
          </NavLink>

          <NavLink
            to="/cassa"
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-xl mb-1 ${isActive ? 'bg-black text-white' : 'hover:bg-gray-100'}`
            }
          >
            <ShoppingCart className="w-5 h-5" />
            Cassa / Vendite
          </NavLink>

          <NavLink
            to="/clienti"
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-xl mb-1 ${isActive ? 'bg-black text-white' : 'hover:bg-gray-100'}`
            }
          >
            <Users className="w-5 h-5" />
            Clienti & Fedeltà
          </NavLink>

          <NavLink
            to="/coupon"
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-xl mb-1 ${isActive ? 'bg-black text-white' : 'hover:bg-gray-100'}`
            }
          >
            <Ticket className="w-5 h-5" />
            Coupon
          </NavLink>

          <NavLink
            to="/report"
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-xl mb-1 ${isActive ? 'bg-black text-white' : 'hover:bg-gray-100'}`
            }
          >
            <BarChart3 className="w-5 h-5" />
            Report
          </NavLink>
        </nav>

        <div className="p-4 border-t">
          <NavLink
            to="/impostazioni"
            className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 py-2"
          >
            <Settings className="w-4 h-4" />
            Impostazioni
          </NavLink>
        </div>
      </div>

      {/* Contenuto principale */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}