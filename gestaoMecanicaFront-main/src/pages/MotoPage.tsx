import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/api';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

// Definição de tipo para os dados da moto
interface MotoData {
  id: number;
  cliente: number;
  marca: string;
  modelo: string;
  ano: number;
  placa: string;
}

// Definição de tipo para os dados do cliente (para o select)
interface ClienteData {
  id: number;
  nome: string;
}

// Interface para os erros de validação do formulário
interface FormErrors {
  cliente?: string;
  marca?: string;
  modelo?: string;
  ano?: string;
  placa?: string;
}

const MotoPage: React.FC = () => {
  const [motos, setMotos] = useState<MotoData[]>([]);
  const [clientes, setClientes] = useState<ClienteData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newMoto, setNewMoto] = useState<Omit<MotoData, 'id'>>({
    cliente: 0,
    marca: '',
    modelo: '',
    ano: new Date().getFullYear(),
    placa: '',
  });
  const [editingMoto, setEditingMoto] = useState<MotoData | null>(null);
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [searchTerm, setSearchTerm] = useState<string>('');

  // NOVO: Estados para paginação
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [count, setCount] = useState<number>(0);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [previousPageUrl, setPreviousPageUrl] = useState<string | null>(null);

  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const fetchData = useCallback(async (page: number, search?: string) => {
    setLoading(true);
    try {
      const params: { page: number; search?: string } = { page: page };
      if (search) params.search = search;

      const [motosResponse, clientesResponse] = await Promise.all([
        api.get(`/motos/`, { params: params }),
        api.get('/clientes/'),
      ]);

      setMotos(motosResponse.data.results);
      setClientes(clientesResponse.data.results); // CORREÇÃO: Acesso ao results para clientes
      setCount(motosResponse.data.count);
      setNextPageUrl(motosResponse.data.next);
      setPreviousPageUrl(motosResponse.data.previous);
    } catch (err: any) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        navigate('/login');
        showNotification('Sessão expirada. Faça login novamente.', 'error');
      } else {
        showNotification('Erro ao carregar os dados. Tente novamente mais tarde.', 'error');
        console.error('Erro ao buscar motos/clientes:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, showNotification]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchData(currentPage, searchTerm);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [currentPage, searchTerm, fetchData]);

  const validateForm = (motoData: Omit<MotoData, 'id'> | MotoData): FormErrors => {
    const errors: FormErrors = {};
    if (motoData.cliente === 0) {
      errors.cliente = 'Cliente é obrigatório.';
    }
    if (!motoData.marca) {
      errors.marca = 'Marca é obrigatória.';
    }
    if (!motoData.modelo) {
      errors.modelo = 'Modelo é obrigatório.';
    }
    if (!motoData.placa) {
      errors.placa = 'Placa é obrigatória.';
    }
    if (!motoData.ano || motoData.ano < 1900 || motoData.ano > new Date().getFullYear() + 1) {
      errors.ano = 'Ano inválido.';
    }
    return errors;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormErrors(prev => ({ ...prev, [name]: undefined }));

    const parsedValue = name === 'cliente' || name === 'ano' ? Number(value) : value;

    if (editingMoto) {
      setEditingMoto({ ...editingMoto, [name]: parsedValue });
    } else {
      setNewMoto({ ...newMoto, [name]: parsedValue });
    }
  };

  const handleAddMoto = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm(newMoto);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showNotification('Preencha todos os campos obrigatórios.', 'error');
      return;
    }
    setFormErrors({});

    try {
      await api.post('/motos/', newMoto);
      setNewMoto({ cliente: 0, marca: '', modelo: '', ano: new Date().getFullYear(), placa: '' });
      setIsFormVisible(false);
      setCurrentPage(1); // NOVO: Volta para a primeira página após adicionar
      fetchData(1, searchTerm); // Recarrega com a primeira página
      showNotification('Moto adicionada com sucesso!', 'success');
    } catch (err: any) {
      showNotification('Erro ao adicionar moto. Verifique os dados e tente novamente.', 'error');
      console.error('Erro ao adicionar moto:', err.response?.data);
    }
  };

  const handleEditClick = (moto: MotoData) => {
    setEditingMoto(moto);
    setIsFormVisible(true);
    setFormErrors({});
  };

  const handleUpdateMoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMoto) return;

    const errors = validateForm(editingMoto);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showNotification('Preencha todos os campos obrigatórios.', 'error');
      return;
    }
    setFormErrors({});

    try {
      await api.put(`/motos/${editingMoto.id}/`, editingMoto);
      setEditingMoto(null);
      setIsFormVisible(false);
      fetchData(currentPage, searchTerm); // Recarrega com a página e termo de busca atuais
      showNotification('Moto atualizada com sucesso!', 'success');
    } catch (err: any) {
      showNotification('Erro ao atualizar moto. Verifique os dados e tente novamente.', 'error');
      console.error('Erro ao atualizar moto:', err.response?.data);
    }
  };

  const handleDeleteMoto = async (motoId: number) => {
    if (window.confirm('Tem certeza de que deseja excluir esta moto?')) {
      try {
        await api.delete(`/motos/${motoId}/`);
        fetchData(currentPage, searchTerm); // Recarrega com a página e termo de busca atuais
        showNotification('Moto excluída com sucesso!', 'success');
      } catch (err: any) {
        showNotification('Erro ao excluir moto. Tente novamente mais tarde.', 'error');
        console.error('Erro ao excluir moto:', err.response?.data);
      }
    }
  };

  const getClientName = (clientId: number) => {
    const client = clientes.find(c => c.id === clientId);
    return client ? client.nome : 'Cliente Desconhecido';
  };

  // NOVO: Funções para navegar entre as páginas
  const handleNextPage = () => {
    if (nextPageUrl) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (previousPageUrl) {
      setCurrentPage(prev => prev - 1);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Carregando motos...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Gerenciamento de Motos</h1>

      {/* Botão Voltar posicionado para sempre aparecer */}
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
        >
          Voltar
        </button>
      </div>

      {/* NOVO: Campo de busca */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar motos por modelo ou placa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      <button
        onClick={() => {
          setIsFormVisible(!isFormVisible);
          setEditingMoto(null);
          setNewMoto({ cliente: 0, marca: '', modelo: '', ano: new Date().getFullYear(), placa: '' });
          setFormErrors({});
        }}
        className="mb-4 px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition duration-150"
      >
        {isFormVisible ? 'Esconder Formulário' : 'Adicionar Nova Moto'}
      </button>

      {isFormVisible && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">{editingMoto ? 'Editar Moto' : 'Nova Moto'}</h2>
          <form onSubmit={editingMoto ? handleUpdateMoto : handleAddMoto} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Cliente:</label>
              <select
                name="cliente"
                value={editingMoto ? editingMoto.cliente : newMoto.cliente}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border rounded"
              >
                <option value={0}>Selecione um cliente</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
              {formErrors.cliente && <p className="text-red-500 text-xs mt-1">{formErrors.cliente}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Marca:</label>
              <input type="text" name="marca" value={editingMoto ? editingMoto.marca : newMoto.marca} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border rounded" />
              {formErrors.marca && <p className="text-red-500 text-xs mt-1">{formErrors.marca}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Modelo:</label>
              <input type="text" name="modelo" value={editingMoto ? editingMoto.modelo : newMoto.modelo} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border rounded" />
              {formErrors.modelo && <p className="text-red-500 text-xs mt-1">{formErrors.modelo}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ano:</label>
              <input type="number" name="ano" value={editingMoto ? editingMoto.ano : newMoto.ano} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border rounded" />
              {formErrors.ano && <p className="text-red-500 text-xs mt-1">{formErrors.ano}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Placa:</label>
              <input type="text" name="placa" value={editingMoto ? editingMoto.placa : newMoto.placa} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border rounded" />
              {formErrors.placa && <p className="text-red-500 text-xs mt-1">{formErrors.placa}</p>}
            </div>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700">
              {editingMoto ? 'Atualizar Moto' : 'Salvar Moto'}
            </button>
            {editingMoto && (
              <button
                type="button"
                onClick={() => setEditingMoto(null)}
                className="ml-2 px-4 py-2 bg-gray-500 text-white font-bold rounded hover:bg-gray-600"
              >
                Cancelar Edição
              </button>
            )}
          </form>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4">Lista de Motos</h2>
        {motos.length === 0 ? (
          <p>Nenhuma moto cadastrada.</p>
        ) : (
          <ul>
            {motos.map(moto => (
              <li key={moto.id} className="border-b last:border-b-0 py-2 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{moto.marca} - {moto.modelo} ({moto.ano})</p>
                  <p className="text-sm text-gray-500">Placa: {moto.placa}</p>
                  <p className="text-sm text-gray-500">Cliente: {getClientName(moto.cliente)}</p>
                </div>
                <div>
                  <button
                    onClick={() => handleEditClick(moto)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteMoto(moto.id)}
                    className="ml-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {/* NOVO: Controles de Paginação */}
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={handlePreviousPage}
            disabled={!previousPageUrl || loading}
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded disabled:bg-gray-400 hover:bg-blue-700 transition-colors"
          >
            Anterior
          </button>
          <span className="text-gray-700">Página {currentPage}</span>
          <button
            onClick={handleNextPage}
            disabled={!nextPageUrl || loading}
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded disabled:bg-gray-400 hover:bg-blue-700 transition-colors"
          >
            Próximo
          </button>
        </div>
      </div>
    </div>
  );
};

export default MotoPage;
