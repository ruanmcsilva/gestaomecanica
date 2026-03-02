// src/pages/Home.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getUserData } from '../api/api';
import api from '../api/api'; // Importa a instância do axios configurada
import { useNotification } from '../contexts/NotificationContext'; // Importa o hook de notificação

interface HomePageProps {
  setIsAuthenticated: (isAuthenticated: boolean) => void;
}

interface UserData {
  id: number;
  username: string;
  email: string;
}

interface DashboardData {
  services_in_progress_count: number;
  low_stock_parts_count: number;
}

function HomePage({ setIsAuthenticated }: HomePageProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null); // NOVO: Estado para dados do dashboard
  const [loading, setLoading] = useState<boolean>(true);
  // REMOVIDO: Não precisamos mais do estado de erro local, usaremos a notificação
  // const [error, setError] = useState<string | null>(null); 
  const navigate = useNavigate();
  const { showNotification } = useNotification(); // NOVO: Obtém a função de notificação

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        const userResponse = await getUserData(); // Busca dados do usuário
        setUserData(userResponse);

        // NOVO: Busca dados para o dashboard
        const [servicesCountResponse, lowStockCountResponse] = await Promise.all([
          api.get('/dashboard/services-in-progress/'),
          api.get('/dashboard/low-stock-parts/'),
        ]);
        setDashboardData({
          services_in_progress_count: servicesCountResponse.data.count,
          low_stock_parts_count: lowStockCountResponse.data.count,
        });

      } catch (err: any) {
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          logout();
          setIsAuthenticated(false);
          navigate('/login');
          showNotification('Sessão expirada. Faça login novamente.', 'error'); // NOVO: Notificação de erro
        } else {
          // setError('Erro ao carregar dados. Tente novamente mais tarde.'); // REMOVIDO
          showNotification('Erro ao carregar dados da Home. Tente novamente mais tarde.', 'error'); // NOVO: Notificação de erro
          console.error("Erro ao buscar dados protegidos:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [navigate, setIsAuthenticated, showNotification]); // showNotification adicionado como dependência

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
    navigate('/login');
    showNotification('Você foi desconectado.', 'success'); // NOVO: Notificação de sucesso
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-600">Carregando dados do dashboard...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto my-12 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 text-center">Dashboard</h2>
      {userData ? (
        <div className="text-center space-y-2 mb-6">
          <p className="text-gray-700">Bem-vindo, **{userData.username}**!</p>
          <p className="text-gray-600">ID: {userData.id}</p>
          <p className="text-gray-600">Email: {userData.email}</p>
        </div>
      ) : (
        <p className="text-gray-700 text-center">Nenhum dado de usuário encontrado.</p>
      )}

      {/* NOVO: Exibição dos dados do Dashboard */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className="bg-blue-100 p-4 rounded-lg shadow-md text-center">
            <h3 className="text-lg font-semibold text-blue-800">Serviços em Andamento</h3>
            <p className="text-3xl font-bold text-blue-600">{dashboardData.services_in_progress_count}</p>
          </div>
          <div className="bg-red-100 p-4 rounded-lg shadow-md text-center">
            <h3 className="text-lg font-semibold text-red-800">Peças com Estoque Baixo</h3>
            <p className="text-3xl font-bold text-red-600">{dashboardData.low_stock_parts_count}</p>
          </div>
        </div>
      )}

      <div className="text-center mt-8">
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition duration-150 ease-in-out"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

export default HomePage;
