// src/components/Sidebar.tsx

import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar: React.FC = () => {
  return (
    <nav className="w-64 h-screen bg-gray-800 text-white p-4 flex-shrink-0">
      <div className="text-2xl font-bold mb-6 text-center">Mecânica App</div>
      <ul>
        <li>
          <NavLink
            to="/"
            className={({ isActive }) =>
              `block py-2 px-4 rounded transition duration-200 hover:bg-gray-700 ${isActive ? 'bg-gray-700 font-bold' : ''}`
            }
          >
            Início
          </NavLink>
        </li>
        <li className="mt-2">
          <NavLink
            to="/clientes"
            className={({ isActive }) =>
              `block py-2 px-4 rounded transition duration-200 hover:bg-gray-700 ${isActive ? 'bg-gray-700 font-bold' : ''}`
            }
          >
            Clientes
          </NavLink>
        </li>
        <li className="mt-2">
          <NavLink
            to="/motos" // 
            className={({ isActive }) =>
              `block py-2 px-4 rounded transition duration-200 hover:bg-gray-700 ${isActive ? 'bg-gray-700 font-bold' : ''}`
            }
          >
            Motos
          </NavLink>
        </li>
        <li className="mt-2">
          <NavLink
            to="/servicos" 
            className={({ isActive }) =>
              `block py-2 px-4 rounded transition duration-200 hover:bg-gray-700 ${isActive ? 'bg-gray-700 font-bold' : ''}`
            }
          >
            Serviços
          </NavLink>
        </li>

        <li className="mt-2">
          <NavLink
            to="/pecas" 
            className={({ isActive }) =>
              `block py-2 px-4 rounded transition duration-200 hover:bg-gray-700 ${isActive ? 'bg-gray-700 font-bold' : ''}`
            }
          >
            Peças
          </NavLink>
        </li>

        <li className="mt-2">
          <NavLink
            to="/relatorios" 
            className={({ isActive }) =>
              `block py-2 px-4 rounded transition duration-200 hover:bg-gray-700 ${isActive ? 'bg-gray-700 font-bold' : ''}`
            }
          >
            Relatórios
          </NavLink>
        </li>


        {/* Futuramente, você pode adicionar mais links aqui: Peças, Serviços, Estoque, Relatórios */}
      </ul>
    </nav>
  );
};

export default Sidebar;