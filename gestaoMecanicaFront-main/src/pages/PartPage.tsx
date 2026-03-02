import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

interface PartData {
  id: number;
  nome: string;
  descricao?: string;
  numero_serie?: string;
  preco_custo?: number;
  preco_venda: number;
  quantidade_em_estoque: number;
  grupo?: number;
  fornecedor?: number;
}

interface FormErrors {
  nome?: string;
  descricao?: string;
  numero_serie?: string;
  preco_custo?: string;
  preco_venda?: string;
  quantidade_em_estoque?: string;
}

const PartPage: React.FC = () => {
  const [parts, setParts] = useState<PartData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newPart, setNewPart] = useState<Omit<PartData, 'id'>>({
    nome: '',
    descricao: '',
    numero_serie: '',
    preco_custo: 0,
    preco_venda: 0,
    quantidade_em_estoque: 0,
  });
  const [editingPart, setEditingPart] = useState<PartData | null>(null);
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

  const fetchData = async (page: number, search?: string) => {
    setLoading(true);
    try {
      const params: { page: number; search?: string } = { page: page };
      if (search) params.search = search;

      const response = await api.get(`/pecas/`, { params: params });
      // CORRIGIDO: Acessa a propriedade 'results' da resposta paginada
      setParts(response.data.results);
      setCount(response.data.count);
      setNextPageUrl(response.data.next);
      setPreviousPageUrl(response.data.previous);
    } catch (err: any) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        navigate('/login');
        showNotification('Sessão expirada. Faça login novamente.', 'error');
      } else {
        showNotification('Erro ao carregar as peças. Tente novamente mais tarde.', 'error');
        console.error('Erro ao buscar peças:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  // NOVO: useEffect para implementar o debouncing na busca
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchData(currentPage, searchTerm);
    }, 500); 

    return () => {
      clearTimeout(handler);
    };
  }, [currentPage, searchTerm, navigate, showNotification]);

  const validateForm = (partData: Omit<PartData, 'id'> | PartData): FormErrors => {
    const errors: FormErrors = {};
    if (!partData.nome) {
      errors.nome = 'Nome é obrigatório.';
    }
    if (!partData.preco_venda || partData.preco_venda <= 0) {
      errors.preco_venda = 'Preço de Venda deve ser um número positivo.';
    }
    if (typeof partData.quantidade_em_estoque !== 'number' || partData.quantidade_em_estoque < 0) {
      errors.quantidade_em_estoque = 'Estoque inválido.';
    }
    return errors;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormErrors(prev => ({ ...prev, [name]: undefined }));
    
    const finalValue = (e.target.type === 'number') ? Number(value) : value;

    if (editingPart) {
      setEditingPart({ ...editingPart, [name]: finalValue });
    } else {
      setNewPart({ ...newPart, [name]: finalValue });
    }
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm(newPart);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showNotification('Preencha todos os campos obrigatórios.', 'error');
      return;
    }
    setFormErrors({}); 

    try {
      await api.post('/pecas/', newPart);
      setNewPart({
        nome: '',
        descricao: '',
        numero_serie: '',
        preco_custo: 0,
        preco_venda: 0,
        quantidade_em_estoque: 0,
      });
      setIsFormVisible(false);
      setCurrentPage(1); // NOVO: Volta para a primeira página após adicionar
      showNotification('Peça adicionada com sucesso!', 'success');
    } catch (err: any) {
      showNotification('Erro ao adicionar a peça. Verifique os dados e tente novamente.', 'error');
      console.error('Erro ao adicionar peça:', err.response?.data);
    }
  };

  const handleEditClick = (part: PartData) => {
    setEditingPart(part);
    setIsFormVisible(true);
    setFormErrors({}); 
  };

  const handleUpdatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart) return;

    const errors = validateForm(editingPart);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showNotification('Preencha todos os campos obrigatórios.', 'error');
      return;
    }
    setFormErrors({});
  
    try {
      await api.put(`/pecas/${editingPart.id}/`, editingPart);
      setEditingPart(null);
      setIsFormVisible(false);
      fetchData(currentPage, searchTerm); // NOVO: Recarrega com a página e termo de busca atuais
      showNotification('Peça atualizada com sucesso!', 'success');
    } catch (err: any) {
      showNotification('Erro ao atualizar a peça. Verifique os dados e tente novamente.', 'error');
      console.error('Erro ao atualizar peça:', err.response?.data);
    }
  };

  const handleDeletePart = async (partId: number) => {
    if (window.confirm('Tem certeza de que deseja excluir esta peça?')) {
      try {
        await api.delete(`/pecas/${partId}/`);
        fetchData(currentPage, searchTerm); // NOVO: Recarrega com a página e termo de busca atuais
        showNotification('Peça excluída com sucesso!', 'success');
      } catch (err: any) {
        showNotification('Erro ao excluir a peça. Tente novamente mais tarde.', 'error');
        console.error('Erro ao excluir peça:', err.response?.data);
      }
    }
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
    return <div className="p-4 text-center">Carregando peças...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Gerenciamento de Peças</h1>
      
      {/* Botão Voltar posicionado para sempre aparecer */}
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
        >
          Voltar
        </button>
      </div>

      {/* Campo de busca */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar peças por nome, descrição ou N° de série..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      <button
        onClick={() => {
          setIsFormVisible(!isFormVisible);
          setEditingPart(null);
          setNewPart({
            nome: '',
            descricao: '',
            numero_serie: '',
            preco_custo: 0,
            preco_venda: 0,
            quantidade_em_estoque: 0,
          });
          setFormErrors({}); 
        }}
        className="mb-4 px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition duration-150"
      >
        {isFormVisible ? 'Esconder Formulário' : 'Adicionar Nova Peça'}
      </button>
      
      {isFormVisible && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">{editingPart ? 'Editar Peça' : 'Nova Peça'}</h2>
          <form onSubmit={editingPart ? handleUpdatePart : handleAddPart} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome:</label>
              <input
                type="text"
                name="nome"
                value={editingPart ? editingPart.nome : newPart.nome}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border rounded"
              />
              {formErrors.nome && <p className="text-red-500 text-xs mt-1">{formErrors.nome}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Descrição:</label>
              <textarea
                name="descricao"
                value={editingPart ? editingPart.descricao || '' : newPart.descricao || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border rounded"
              ></textarea>
              {formErrors.descricao && <p className="text-red-500 text-xs mt-1">{formErrors.descricao}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">N° de Série:</label>
              <input
                type="text"
                name="numero_serie"
                value={editingPart ? editingPart.numero_serie || '' : newPart.numero_serie || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border rounded"
              />
              {formErrors.numero_serie && <p className="text-red-500 text-xs mt-1">{formErrors.numero_serie}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Preço de Custo:</label>
              <input
                type="number"
                name="preco_custo"
                value={editingPart ? editingPart.preco_custo || 0 : newPart.preco_custo || 0}
                onChange={handleInputChange}
                step="0.01"
                className="mt-1 block w-full px-3 py-2 border rounded"
              />
              {formErrors.preco_custo && <p className="text-red-500 text-xs mt-1">{formErrors.preco_custo}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Preço de Venda:</label>
              <input
                type="number"
                name="preco_venda"
                value={editingPart ? editingPart.preco_venda : newPart.preco_venda}
                onChange={handleInputChange}
                step="0.01"
                required
                className="mt-1 block w-full px-3 py-2 border rounded"
              />
              {formErrors.preco_venda && <p className="text-red-500 text-xs mt-1">{formErrors.preco_venda}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Estoque:</label>
              <input
                type="number"
                name="quantidade_em_estoque"
                value={editingPart ? editingPart.quantidade_em_estoque : newPart.quantidade_em_estoque}
                onChange={handleInputChange}
                required
                min="0"
                className="mt-1 block w-full px-3 py-2 border rounded"
              />
              {formErrors.quantidade_em_estoque && <p className="text-red-500 text-xs mt-1">{formErrors.quantidade_em_estoque}</p>}
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700"
            >
              {editingPart ? 'Atualizar Peça' : 'Salvar Peça'}
            </button>
            {editingPart && (
              <button
                type="button"
                onClick={() => setEditingPart(null)}
                className="ml-2 px-4 py-2 bg-gray-500 text-white font-bold rounded hover:bg-gray-600"
              >
                Cancelar Edição
              </button>
            )}
          </form>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4">Lista de Peças</h2>
        {parts.length === 0 ? (
          <p>Nenhuma peça cadastrada.</p>
        ) : (
          <ul>
            {parts.map(part => (
              <li key={part.id} className="border-b last:border-b-0 py-2 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{part.nome}</p>
                  <p className="text-sm text-gray-500">Estoque: {part.quantidade_em_estoque}</p>
                  <p className="text-sm text-gray-500">Valor: R$ {Number(part.preco_venda).toFixed(2)}</p>
                </div>
                <div>
                  <button
                    onClick={() => handleEditClick(part)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeletePart(part.id)}
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

export default PartPage;
