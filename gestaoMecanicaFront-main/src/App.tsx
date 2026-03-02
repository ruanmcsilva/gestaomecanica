// src/App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Importa os componentes das páginas
import LoginPage from './pages/Login';
import HomePage from './pages/Home';
import ClientPage from './pages/ClientPage'; 
import MotoPage from './pages/MotoPage';
import ServicePage from './pages/ServicePage';
import ServiceDetailsPage from './pages/ServiceDetailsPage';
import PartPage from './pages/PartPage';
import ReportsPage from './pages/ReportsPage';
import ClientHistoryPage from './pages/ClientHistoryPage';


import Layout from './components/Layout';
import { NotificationProvider } from './contexts/NotificationContext';


// Essa interface garante o tipo correto para o prop de autenticação
interface AuthProps {
  setIsAuthenticated: (isAuthenticated: boolean) => void;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!localStorage.getItem('access_token') 
  );

  useEffect(() => {
    // Logica para validar o token ao iniciar
  }, []);

  // Um componente para agrupar as rotas protegidas
  const ProtectedRoutes = () => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return (
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="/clientes" element={<ClientPage />} />
          <Route path="/motos" element={<MotoPage />} />
          <Route path="/servicos" element={<ServicePage />} />
          <Route path="/servicos/:id" element={<ServiceDetailsPage />} />
          <Route path="/pecas" element={<PartPage />} />
          <Route path="/relatorios" element={<ReportsPage />} />
          <Route path="/clientes/:id/historico" element={<ClientHistoryPage />} />
        </Routes>
      </Layout>
    );
  };


  return (
    <NotificationProvider>
      <Router>
        <Routes>
          {/* Rota pública para login */}
          <Route path="/login" element={<LoginPage setIsAuthenticated={setIsAuthenticated} />} />
          
          {/* Rotas protegidas */}
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </Router>
    </NotificationProvider>
  );
}

export default App;