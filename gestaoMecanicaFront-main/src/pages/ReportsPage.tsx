import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext'; // NOVO: Importa o hook de notificação

interface ReportData {
  mes: number;
  ano: number;
  servicos_concluidos_count: number;
  total_mao_de_obra: number;
  total_pecas_receita: number;
  total_custo_pecas: number;
  total_receita_bruta: number;
  total_lucro_bruto: number;
}

const ReportsPage: React.FC = () => {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(false); 
  // REMOVIDO: Não precisamos mais do estado de erro local para exibição geral
  const [error, setError] = useState<string | null>(null); 
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); 
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear()); 
  
  const navigate = useNavigate();
  const { showNotification } = useNotification(); // NOVO: Obtém a função de notificação

  const handleFetchReport = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    // REMOVIDO: Não precisamos mais do erro local, a notificação fará o trabalho
    // setError(null); 
    setReport(null); 
    
    try {
      const response = await api.get(`/relatorio-financeiro/?mes=${selectedMonth}&ano=${selectedYear}`);
      setReport(response.data);
      showNotification('Relatório gerado com sucesso!', 'success'); // NOVO: Notificação de sucesso
    } catch (err: any) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        navigate('/login');
        showNotification('Sessão expirada. Faça login novamente.', 'error'); // NOVO: Notificação de erro
      } else {
        // setError('Erro ao gerar relatório. Verifique o mês/ano e tente novamente.'); // REMOVIDO
        showNotification('Erro ao gerar relatório. Verifique o mês/ano e tente novamente.', 'error'); // NOVO: Notificação de erro
        console.error('Erro ao buscar relatório:', err.response?.data || err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleFetchReport();
  }, [showNotification]); // NOVO: showNotification adicionado como dependência

  const getMonths = () => {
    const months = [];
    for (let i = 1; i <= 12; i++) {
      months.push({ value: i, label: String(i).padStart(2, '0') });
    }
    return months;
  };

  const getYears = () => {
    const years = [];
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 5; i <= currentYear + 1; i++) { 
      years.push({ value: i, label: String(i) });
    }
    return years;
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Relatórios Financeiros</h1>

      {/* NOVO: Botão Voltar posicionado para sempre aparecer */}
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)} // Usa navigate(-1) para voltar à página anterior
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
        >
          Voltar
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Gerar Relatório por Período</h2>
        <form onSubmit={handleFetchReport} className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Mês:</label>
              <select
                name="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border rounded"
              >
                {getMonths().map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Ano:</label>
              <select
                name="year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border rounded"
              >
                {getYears().map(year => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* REMOVIDO: Não precisamos mais do erro geral aqui */}
          {/* {error && <p className="text-red-500 text-sm mt-2">{error}</p>} */}
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">
            Gerar Relatório
          </button>
        </form>
      </div>

      {loading ? (
        <div className="p-4 text-center">Carregando relatório...</div>
      ) : report ? (
        <div className="bg-white shadow-md rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4">Resumo Financeiro ({String(report.mes).padStart(2, '0')}/{report.ano})</h2>
          <p><strong>Serviços Concluídos:</strong> {report.servicos_concluidos_count}</p>
          <p><strong>Total Mão de Obra:</strong> R$ {report.total_mao_de_obra.toFixed(2)}</p>
          <p><strong>Total Receita Peças:</strong> R$ {report.total_pecas_receita.toFixed(2)}</p>
          <p><strong>Total Custo Peças:</strong> R$ {report.total_custo_pecas.toFixed(2)}</p>
          <p className="font-bold">Receita Bruta Total: R$ {report.total_receita_bruta.toFixed(2)}</p>
          <p className="font-bold">Lucro Bruto Total: R$ {report.total_lucro_bruto.toFixed(2)}</p>
        </div>
      ) : (
        <p className="p-4 text-center text-gray-500">Selecione o período e gere o relatório.</p>
      )}
    </div>
  );
};

export default ReportsPage;
