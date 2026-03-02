import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

interface PecaItem {
  nome_peca: string;
  quantidade: number;
  valor_unitario: number;
}

interface ServicoHistory {
  id: number;
  data_inicio: string;
  status: string;
  kilometragem: number;
  descricao: string;
  valor_mao_de_obra: number;
  valor_total_servico: number;
  moto: string;
  itens_peca: PecaItem[];
}

const ClientHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [clientName, setClientName] = useState<string>('Carregando...');
  const [history, setHistory] = useState<ServicoHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      if (!id) {
        setLoading(false);
        return;
      }
      
      try {
        const clientResponse = await api.get(`/clientes/${id}/`);
        setClientName(clientResponse.data.nome);

        const historyResponse = await api.get(`/clientes/${id}/historico/`);
        setHistory(historyResponse.data);
      } catch (err: any) {
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          navigate('/login');
          showNotification('Sessão expirada. Faça login novamente.', 'error');
        } else if (err.response && err.response.status === 404) {
          setError('Cliente não encontrado.');
          showNotification('Cliente não encontrado.', 'error');
        } else {
          setError('Erro ao carregar o histórico.');
          showNotification('Erro ao carregar o histórico. Tente novamente mais tarde.', 'error');
          console.error('Erro ao buscar histórico:', err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [id, navigate, showNotification]);

  if (loading) {
    return <div className="p-4 text-center">Carregando histórico...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Histórico de Serviços de {clientName}</h1>
        <button
            onClick={() => navigate('/clientes')}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
        >
            Voltar
        </button>
      </div>

      {history.length === 0 ? (
        <p>Nenhum serviço encontrado para este cliente.</p>
      ) : (
        <ul className="space-y-4">
          {history.map(servico => (
            <li key={servico.id} className="bg-white shadow-md rounded-lg p-4">
              <h3 className="font-semibold text-lg">Serviço #{servico.id} ({new Date(servico.data_inicio).toLocaleDateString()})</h3>
              <p><strong>Status:</strong> {servico.status}</p>
              <p><strong>Moto:</strong> {servico.moto}</p>
              <p><strong>Quilometragem:</strong> {servico.kilometragem} km</p>
              <p><strong>Valor Mão de Obra:</strong> R$ {Number(servico.valor_mao_de_obra).toFixed(2)}</p>
              <p><strong>Valor Total Serviço:</strong> R$ {Number(servico.valor_total_servico).toFixed(2)}</p>
              <p><strong>Descrição:</strong> {servico.descricao}</p>
              
              <h4 className="font-medium mt-4">Peças Utilizadas:</h4>
              {servico.itens_peca.length === 0 ? (
                <p className="text-sm italic">Nenhuma peça utilizada.</p>
              ) : (
                <ul className="list-disc list-inside ml-4">
                  {servico.itens_peca.map((peca, index) => (
                    <li key={index} className="text-sm">
                      {peca.quantidade}x {peca.nome_peca} (R$ {Number(peca.valor_unitario).toFixed(2)} cada)
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ClientHistoryPage;
