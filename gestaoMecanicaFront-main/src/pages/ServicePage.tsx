import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/api';
import { useNavigate, Link } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

interface ServiceData {
  id: number;
  cliente: number;
  moto: number;
  data_servico: string;
  observacoes?: string;
  pecas: number[];
  kilometragem: number;
  descricao: string;
  status: string;
}

interface ClienteData {
  id: number;
  nome: string;
}

interface MotoData {
  id: number;
  placa: string;
  modelo: string;
}

interface FormErrors {
  cliente?: string;
  moto?: string;
  data_servico?: string;
  descricao?: string;
  kilometragem?: string;
  observacoes?: string;
}

const ServicePage: React.FC = () => {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [clients, setClients] = useState<ClienteData[]>([]);
  const [motos, setMotos] = useState<MotoData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newService, setNewService] = useState<Omit<ServiceData, 'id' | 'pecas'>>({
    cliente: 0,
    moto: 0,
    data_servico: '',
    observacoes: '',
    kilometragem: 0,
    descricao: '',
  });
  const navigate = useNavigate();
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const { showNotification } = useNotification();

  // NOVO: Estados para paginação
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [count, setCount] = useState<number>(0);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [previousPageUrl, setPreviousPageUrl] = useState<string | null>(null);

  const fetchData = useCallback(async (page: number, search?: string, statusFilter?: string) => {
    setLoading(true);
    try {
      const params: { page: number; search?: string; status?: string } = { page: page };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const [servicesResponse, clientsResponse, motosResponse] = await Promise.all([
        api.get('/servicos/', { params }),
        api.get('/clientes/', { params: { page_size: 100 } }), // NÃO paginar clientes para o select
        api.get('/motos/', { params: { page_size: 100 } }), // NÃO paginar motos para o select
      ]);
      setServices(servicesResponse.data.results);
      setClients(clientsResponse.data.results);
      setMotos(motosResponse.data.results);
      setCount(servicesResponse.data.count);
      setNextPageUrl(servicesResponse.data.next);
      setPreviousPageUrl(servicesResponse.data.previous);
    } catch (err: any) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        navigate('/login');
        showNotification('Sessão expirada. Faça login novamente.', 'error');
      } else {
        showNotification('Erro ao carregar dados. Tente novamente mais tarde.', 'error');
        console.error('Erro ao buscar dados:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, showNotification]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchData(currentPage, searchTerm, selectedStatusFilter);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [currentPage, searchTerm, selectedStatusFilter, fetchData]);

  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.nome : 'Cliente não encontrado';
  };

  const getMotoInfo = (motoId: number) => {
    const moto = motos.find(m => m.id === motoId);
    return moto ? `${moto.modelo} (${moto.placa})` : 'Moto não encontrada';
  };

  const validateForm = (serviceData: Omit<ServiceData, 'id' | 'pecas'>): FormErrors => {
    const errors: FormErrors = {};
    if (serviceData.cliente === 0) {
      errors.cliente = 'Selecione um cliente.';
    }
    if (serviceData.moto === 0) {
      errors.moto = 'Selecione uma moto.';
    }
    if (!serviceData.data_servico) {
      errors.data_servico = 'Data de Início é obrigatória.';
    }
    if (!serviceData.descricao) {
      errors.descricao = 'Descrição é obrigatória.';
    }
    if (!serviceData.kilometragem || serviceData.kilometragem <= 0) {
      errors.kilometragem = 'Quilometragem inválida.';
    }
    return errors;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormErrors(prev => ({ ...prev, [name]: undefined }));
    
    const finalValue = (name === 'kilometragem' || name === 'cliente' || name === 'moto') ? Number(value) : value;
    setNewService({ ...newService, [name]: finalValue });
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm(newService);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showNotification('Preencha todos os campos obrigatórios.', 'error');
      return;
    }
    setFormErrors({}); 
    
    try {
      const response = await api.post('/servicos/', { ...newService, status: 'PENDENTE' });
      const createdService = response.data;
      
      setServices(prev => [...prev, createdService]);

      setNewService({ cliente: 0, moto: 0, data_servico: '', observacoes: '', kilometragem: 0, descricao: '' });
      showNotification('Serviço adicionado com sucesso!', 'success');
    } catch (err: any) {
      showNotification('Erro ao adicionar o serviço. Verifique os dados e tente novamente.', 'error');
      console.error('Erro ao adicionar serviço:', err.response?.data);
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    if (window.confirm('Tem certeza de que deseja excluir este serviço?')) {
      try {
        await api.delete(`/servicos/${serviceId}/`);
        setServices(services.filter(service => service.id !== serviceId));
        showNotification('Serviço excluído com sucesso!', 'success');
      } catch (err: any) {
        showNotification('Erro ao excluir serviço. Tente novamente mais tarde.', 'error');
        console.error('Erro ao excluir serviço:', err.response?.data);
      }
    }
  };

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
    return <div className="p-4 text-center">Carregando dados...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Gerenciamento de Serviços</h1>

      {/* Botão Voltar */}
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
        >
          Voltar
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Adicionar Novo Serviço</h2>
        <form onSubmit={handleAddService} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cliente:</label>
            <select
              name="cliente"
              value={newService.cliente}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border rounded"
            >
              <option value="0">Selecione um cliente</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.nome}</option>
              ))}
            </select>
            {formErrors.cliente && <p className="text-red-500 text-xs mt-1">{formErrors.cliente}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Moto:</label>
            <select
              name="moto"
              value={newService.moto}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border rounded"
            >
              <option value="0">Selecione uma moto</option>
              {motos.map(moto => (
                <option key={moto.id} value={moto.id}>{moto.placa}</option>
              ))}
            </select>
            {formErrors.moto && <p className="text-red-500 text-xs mt-1">{formErrors.moto}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Data de Início:</label>
            <input
              type="date"
              name="data_servico"
              value={newService.data_servico}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border rounded"
            />
            {formErrors.data_servico && <p className="text-red-500 text-xs mt-1">{formErrors.data_servico}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição:</label>
            <textarea
              name="descricao"
              value={newService.descricao} 
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border rounded"
            ></textarea>
            {formErrors.descricao && <p className="text-red-500 text-xs mt-1">{formErrors.descricao}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Quilometragem:</label>
            <input
              type="number"
              name="kilometragem"
              value={newService.kilometragem}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border rounded"
            />
            {formErrors.kilometragem && <p className="text-red-500 text-xs mt-1">{formErrors.kilometragem}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Observações:</label>
            <textarea
              name="observacoes"
              value={newService.observacoes}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border rounded"
            ></textarea>
            {formErrors.observacoes && <p className="text-red-500 text-xs mt-1">{formErrors.observacoes}</p>}
          </div>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700">
            Salvar Serviço
          </button>
        </form>
      </div>

      <div className="bg-white shadow-md rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4">Lista de Serviços</h2>
        <div className="mb-4 flex space-x-4">
          <input
            type="text"
            placeholder="Buscar por descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Todos os Status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>

        {services.length === 0 ? (
          <p>Nenhum serviço cadastrado.</p>
        ) : (
          <ul>
            {services.map(service => (
              <li key={service.id} className="border-b last:border-b-0 py-2 flex justify-between items-center">
                <div>
                  <Link to={`/servicos/${service.id}`} className="block hover:bg-gray-100 p-2 rounded transition-colors">
                    <p className="font-semibold">Serviço #{service.id}</p>
                    <p className="text-sm text-gray-500">
                      Cliente: {getClientName(service.cliente)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Moto: {getMotoInfo(service.moto)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Data de Início: {service.data_servico}
                    </p>
                    <p className="text-sm text-gray-500">
                      Status: {service.status}
                    </p>
                  </Link>
                </div>
                <button
                  onClick={() => handleDeleteService(service.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        )}
        
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

export default ServicePage;
