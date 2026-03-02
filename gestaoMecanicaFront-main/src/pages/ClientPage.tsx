import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useNavigate, Link } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

// Definição de tipo para os dados do cliente
interface ClientData {
  id: number;
  nome: string;
  telefone: string;
  email: string;
  cpf_cnpj: string;
  endereco: string;
}

// Interface para os erros de validação do formulário
interface FormErrors {
  nome?: string;
  telefone?: string;
  email?: string;
  cpf_cnpj?: string;
  endereco?: string;
}

const ClientPage: React.FC = () => {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newClient, setNewClient] = useState<Omit<ClientData, 'id'>>({
    nome: '',
    telefone: '',
    email: '',
    cpf_cnpj: '',
    endereco: '',
  });
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [searchTerm, setSearchTerm] = useState<string>(''); 
  
  //historico botao
  const [serviceHistory, setServiceHistory] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);


  const [currentPage, setCurrentPage] = useState<number>(1); 
  const [count, setCount] = useState<number>(0); 
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null); 
  const [previousPageUrl, setPreviousPageUrl] = useState<string | null>(null); 

  const navigate = useNavigate();
  const { showNotification } = useNotification();

  // NOVO: fetchData agora aceita a página e o termo de busca
  const fetchData = async (page: number, search?: string) => {
    setLoading(true);
    try {
      const params: { page: number; search?: string } = { page: page };
      if (search) params.search = search;

      const response = await api.get(`/clientes/`, { params: params });
      setClients(response.data.results);
      setCount(response.data.count);
      setNextPageUrl(response.data.next);
      setPreviousPageUrl(response.data.previous);
    } catch (err: any) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        navigate('/login');
        showNotification('Sessão expirada. Faça login novamente.', 'error');
      } else {
        showNotification('Erro ao carregar os clientes. Tente novamente mais tarde.', 'error');
        console.error('Erro ao buscar clientes:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  // NOVO: useEffect para buscar dados quando a página ou o termo de busca mudam
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchData(currentPage, searchTerm);
    }, 500); // Atraso de 500ms para o debounce

    return () => {
      clearTimeout(handler);
    };
  }, [currentPage, searchTerm, navigate, showNotification]); // Dependências para re-executar

  const validateForm = (clientData: Omit<ClientData, 'id'> | ClientData): FormErrors => {
    const errors: FormErrors = {};
    if (!clientData.nome) {
      errors.nome = 'Nome é obrigatório.';
    }
    if (!clientData.email) {
      errors.email = 'Email é obrigatório.';
    } else if (!/\S+@\S+\.\S+/.test(clientData.email)) {
      errors.email = 'Email inválido.';
    }
    if (!clientData.cpf_cnpj) {
      errors.cpf_cnpj = 'CPF/CNPJ é obrigatório.';
    }
    return errors;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormErrors(prev => ({ ...prev, [name]: undefined })); 

    if (editingClient) {
      setEditingClient({ ...editingClient, [name]: value });
    } else {
      setNewClient({ ...newClient, [name]: value });
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm(newClient);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showNotification('Preencha todos os campos obrigatórios.', 'error');
      return;
    }
    setFormErrors({}); 

    try {
      await api.post('/clientes/', newClient);
      setNewClient({ nome: '', telefone: '', email: '', cpf_cnpj: '', endereco: '' });
      setIsFormVisible(false);
      setCurrentPage(1); // NOVO: Volta para a primeira página após adicionar
      showNotification('Cliente adicionado com sucesso!', 'success');
    } catch (err: any) {
      showNotification('Erro ao adicionar cliente. Verifique os dados e tente novamente.', 'error');
      console.error('Erro ao adicionar cliente:', err.response?.data);
    }
  };

  const handleEditClick = (client: ClientData) => {
    setEditingClient(client);
    setIsFormVisible(true);
    setFormErrors({}); 
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    const errors = validateForm(editingClient);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showNotification('Preencha todos os campos obrigatórios.', 'error');
      return;
    }
    setFormErrors({});

    try {
      await api.put(`/clientes/${editingClient.id}/`, editingClient);
      setEditingClient(null);
      setIsFormVisible(false);
      fetchData(currentPage, searchTerm); // NOVO: Recarrega com a página e termo de busca atuais
      showNotification('Cliente atualizado com sucesso!', 'success');
    } catch (err: any) {
      showNotification('Erro ao atualizar cliente. Verifique os dados e tente novamente.', 'error');
      console.error('Erro ao atualizar cliente:', err.response?.data);
    }
  };

  const handleDeleteClient = async (clientId: number) => {
    if (window.confirm('Tem certeza de que deseja excluir este cliente?')) {
      try {
        await api.delete(`/clientes/${clientId}/`);
        fetchData(currentPage, searchTerm); 
        showNotification('Cliente excluído com sucesso!', 'success');
      } catch (err: any) {
        showNotification('Erro ao excluir cliente. Tente novamente mais tarde.', 'error');
        console.error('Erro ao excluir cliente:', err.response?.data);
      }
    }
  };

  const handleViewHistory = async (clientId: number) => {
  try {
    const response = await api.get(`/clientes/historico-servicos/${clientId}/`);
    setServiceHistory(response.data);
    setSelectedClientId(clientId);
    showNotification('Histórico carregado com sucesso!', 'success');
  } catch (err: any) {
    showNotification('Erro ao carregar o histórico do cliente.', 'error');
    console.error('Erro ao buscar histórico:', err.response?.data);
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
    return <div className="p-4 text-center">Carregando clientes...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Gerenciamento de Clientes</h1>
      
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
        >
          Voltar
        </button>
      </div>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar clientes por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      <button
        onClick={() => {
          setIsFormVisible(!isFormVisible);
          setEditingClient(null);
          setFormErrors({});
          setNewClient({ nome: '', telefone: '', email: '', cpf_cnpj: '', endereco: '' });
        }}
        className="mb-4 px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition duration-150"
      >
        {isFormVisible ? 'Esconder Formulário' : 'Adicionar Novo Cliente'}
      </button>

      {isFormVisible && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">{editingClient ? 'Editar Cliente' : 'Nova Cliente'}</h2>
          <form onSubmit={editingClient ? handleUpdateClient : handleAddClient} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome:</label>
              <input type="text" name="nome" value={editingClient ? editingClient.nome : newClient.nome} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border rounded" />
              {formErrors.nome && <p className="text-red-500 text-xs mt-1">{formErrors.nome}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Telefone:</label>
              <input type="text" name="telefone" value={editingClient ? editingClient.telefone : newClient.telefone} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border rounded" />
              {formErrors.telefone && <p className="text-red-500 text-xs mt-1">{formErrors.telefone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email:</label>
              <input type="email" name="email" value={editingClient ? editingClient.email : newClient.email} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border rounded" />
              {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">CPF/CNPJ:</label>
              <input type="text" name="cpf_cnpj" value={editingClient ? editingClient.cpf_cnpj : newClient.cpf_cnpj} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border rounded" />
              {formErrors.cpf_cnpj && <p className="text-red-500 text-xs mt-1">{formErrors.cpf_cnpj}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Endereço:</label>
              <input type="text" name="endereco" value={editingClient ? editingClient.endereco : newClient.endereco} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border rounded" />
              {formErrors.endereco && <p className="text-red-500 text-xs mt-1">{formErrors.endereco}</p>}
            </div>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700">
              {editingClient ? 'Atualizar Cliente' : 'Salvar Cliente'}
            </button>
            {editingClient && (
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="ml-2 px-4 py-2 bg-gray-500 text-white font-bold rounded hover:bg-gray-600"
              >
                Cancelar Edição
              </button>
            )}
          </form>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4">Lista de Clientes</h2>
        {clients.length === 0 ? (
          <p>Nenhum cliente cadastrado.</p>
        ) : (
          <ul>
            {clients.map(client => (
              <li key={client.id} className="border-b last:border-b-0 py-2 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{client.nome}</p>
                  <p className="text-sm text-gray-500">{client.email}</p>
                </div>
                <div>
                  <button
                    onClick={() => handleEditClick(client)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                  >
                    Editar
                  </button>
                  <Link 
                    to={`/clientes/${client.id}/historico`}
                    className="ml-2 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                  >
                    Histórico
                  </Link>

                  <button
                    onClick={() => handleDeleteClient(client.id)}
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

export default ClientPage;