import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

interface ServiceData {
  id: number;
  cliente: number;
  moto: number;
  data_inicio: string;
  data_fim: string | null;
  observacoes?: string;
  descricao: string;
  kilometragem: number;
  valor_mao_de_obra: string;
  valor_total_pecas: number;
  valor_total_servico: number;
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

interface PecaData {
  id: number;
  nome: string;
  descricao: string;
  preco_venda: number;
  quantidade_em_estoque: number;
}

interface ItemServicoPeca {
  id: number;
  servico: number;
  peca: number;
  quantidade_utilizada: number;
  valor_unitario_na_epoca: number | string;
}

interface FotoServicoData {
  id: number;
  servico: number;
  foto: string;
  descricao?: string;
  data_upload: string;
}

const ServiceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [service, setService] = useState<ServiceData | null>(null);
  const [client, setClient] = useState<ClienteData | null>(null);
  const [moto, setMoto] = useState<MotoData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedService, setEditedService] = useState<ServiceData | null>(null);
  const [serviceParts, setServiceParts] = useState<ItemServicoPeca[]>([]);
  const [allParts, setAllParts] = useState<PecaData[]>([]);
  const [newPart, setNewPart] = useState<{ peca: number; quantidade_utilizada: number; valor_unitario_na_epoca: number }>({
    peca: 0,
    quantidade_utilizada: 0,
    valor_unitario_na_epoca: 0
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<FotoServicoData[]>([]);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    if (!id) {
      setLoading(false);
      return;
    }
    
    try {
      // CORRIGIDO: Acessa a propriedade 'results' para as listas paginadas
      const [serviceResponse, partsResponse, allPartsResponse, photosResponse] = await Promise.all([
        api.get(`/servicos/${id}/`),
        api.get(`/itens-servico/?servico=${id}`),
        api.get('/pecas/'),
        api.get(`/fotos/?servico=${id}`),
      ]);

      const serviceData: ServiceData = serviceResponse.data;
      setService(serviceData);
      setEditedService(serviceData);
      setServiceParts(partsResponse.data.results); // CORRIGIDO
      setAllParts(allPartsResponse.data.results); // CORRIGIDO
      setUploadedPhotos(photosResponse.data.results); // CORRIGIDO

      const [clientResponse, motoResponse] = await Promise.all([
        api.get(`/clientes/${serviceData.cliente}/`),
        api.get(`/motos/${serviceData.moto}/`)
      ]);

      setClient(clientResponse.data);
      setMoto(motoResponse.data);
      
    } catch (err: any) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        navigate('/login');
        showNotification('Sessão expirada. Faça login novamente.', 'error');
      } else if (err.response && err.response.status === 404) {
        showNotification('Serviço não encontrado.', 'error');
        setError('Serviço não encontrado.');
      } else {
        showNotification('Erro ao carregar detalhes do serviço.', 'error');
        console.error('Erro ao buscar detalhes:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showNotification]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newValue = (name === 'kilometragem' || name === 'valor_mao_de_obra') ? Number(value) : value;
    setEditedService({ ...editedService!, [name]: newValue });
  };

  const handlePartInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPart({ ...newPart, [name]: Number(value) });
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const partToAdd = { ...newPart, servico: Number(id) };
      await api.post('/itens-servico/', partToAdd);
      await fetchDetails();
      setNewPart({ peca: 0, quantidade_utilizada: 0, valor_unitario_na_epoca: 0 });
      showNotification('Peça adicionada com sucesso!', 'success');
    } catch (err: any) {
      showNotification('Erro ao adicionar a peça. Verifique os dados e tente novamente.', 'error');
      console.error('Erro ao adicionar peça:', err.response?.data);
    }
  };

  const handleDeletePart = async (partId: number) => {
    if (window.confirm('Deseja remover esta peça?')) {
      try {
        await api.delete(`/itens-servico/${partId}/`);
        await fetchDetails();
        showNotification('Peça removida com sucesso!', 'success');
      } catch {
        showNotification('Erro ao remover peça.', 'error');
      }
    }
  };

  const getPartName = (partId: number) => {
    const part = allParts.find(p => p.id === partId);
    return part ? part.nome : 'Peça não encontrada';
  };

  const handlePrintOS = async () => {
    if (!service) return;
    try {
      const response = await api.get(`/servicos/${service.id}/imprimir_os/`, {
        responseType: 'blob',
      });
      const fileURL = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(fileURL, '_blank');
      showNotification('Ordem de Serviço gerada com sucesso!', 'success');
    } catch (err: any) {
      showNotification('Erro ao gerar a ordem de serviço em PDF.', 'error');
      console.error('Erro ao gerar PDF:', err);
    }
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedService || !id) return;
    try {
      const dataToUpdate = {
        descricao: editedService.descricao,
        observacoes: editedService.observacoes,
        kilometragem: editedService.kilometragem,
        valor_mao_de_obra: editedService.valor_mao_de_obra,
      };
      await api.put(`/servicos/${id}/`, dataToUpdate);
      await fetchDetails();
      setIsEditing(false);
      showNotification('Serviço atualizado com sucesso!', 'success');
    } catch (err: any) {
      showNotification('Erro ao atualizar o serviço. Verifique os dados e tente novamente.', 'error');
      console.error('Erro ao atualizar serviço:', err.response?.data || err.message);
    }
  };

  const handleDeleteService = async () => {
    if (!id) return;
    if (window.confirm('Tem certeza que deseja excluir este serviço?')) {
      try {
        await api.delete(`/servicos/${id}/`);
        navigate('/servicos');
        showNotification('Serviço excluído com sucesso!', 'success');
      } catch (err: any) {
        showNotification('Erro ao excluir o serviço. Tente novamente mais tarde.', 'error');
        console.error('Erro ao excluir serviço:', err.response?.data || err.message);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !service) return;

    const formData = new FormData();
    formData.append('servico', String(service.id));
    formData.append('foto', selectedFile);

    try {
      await api.post('/fotos/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSelectedFile(null);
      await fetchDetails();
      showNotification('Foto adicionada com sucesso!', 'success');
    } catch (err: any) {
      showNotification('Erro ao fazer upload da foto. Tente novamente.', 'error');
      console.error('Erro ao fazer upload da foto:', err.response?.data || err.message);
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (window.confirm('Tem certeza de que deseja excluir esta foto?')) {
      try {
        await api.delete(`/fotos/${photoId}/`);
        await fetchDetails();
        showNotification('Foto excluída com sucesso!', 'success');
      } catch (err: any) {
        showNotification('Erro ao excluir a foto. Tente novamente mais tarde.', 'error');
        console.error('Erro ao excluir foto:', err.response?.data || err.message);
      }
    }
  };

  const renderPartsSection = () => (
    <div className="bg-white shadow-md rounded-lg p-6 mt-6">
      <h2 className="text-xl font-bold mb-4">Peças Utilizadas</h2>
      <form onSubmit={handleAddPart} className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Peça:</label>
          <select name="peca" value={newPart.peca} onChange={handlePartInputChange} required className="w-full border rounded px-3 py-2">
            <option value="0">Selecione uma peça</option>
            {allParts.map(part => (
              <option key={part.id} value={part.id}>{part.nome} (Estoque: {part.quantidade_em_estoque})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Quantidade:</label>
          <input type="number" name="quantidade_utilizada" value={newPart.quantidade_utilizada} onChange={handlePartInputChange} required className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Valor Unitário:</label>
          <input type="number" step="0.01" name="valor_unitario_na_epoca" value={newPart.valor_unitario_na_epoca} onChange={handlePartInputChange} required className="w-full border rounded px-3 py-2" />
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Adicionar Peça</button>
      </form>

      {serviceParts.length === 0 ? (
        <p>Nenhuma peça adicionada.</p>
      ) : (
        <ul>
          {serviceParts.map(item => (
            <li key={item.id} className="border-b py-2 flex justify-between items-center">
              <div>
                <p><strong>Peça:</strong> {getPartName(item.peca)}</p>
                <p><strong>Qtd:</strong> {item.quantidade_utilizada}</p>
                <p><strong>Valor Unitário:</strong> R$ {Number(item.valor_unitario_na_epoca).toFixed(2)}</p>
              </div>
              <button onClick={() => handleDeletePart(item.id)} className="bg-red-500 text-white px-3 py-1 rounded">Excluir</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl font-semibold text-gray-700">
        Carregando detalhes do serviço...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 text-center text-lg font-semibold">
        {error}
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Detalhes do Serviço #{service?.id}</h1>
      
      <div className="mb-4 space-x-2">
        <button
          onClick={handlePrintOS}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
        >
          Imprimir OS
        </button>
        <button
          onClick={() => setIsEditing(true)}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
        >
          Editar
        </button>
        <button
          onClick={() => {
            if (window.confirm('Tem certeza que deseja excluir este serviço?')) {
              handleDeleteService();
            }
          }}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Excluir
        </button>
      </div>

      {isEditing ? (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Editar Serviço</h2>
          <form onSubmit={handleUpdateService} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Descrição:</label>
              <textarea
                name="descricao"
                value={editedService?.descricao || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border rounded"
              ></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Quilometragem:</label>
              <input
                type="number"
                name="kilometragem"
                value={editedService?.kilometragem || 0}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Valor Mão de Obra:</label>
              <input
                type="number"
                name="valor_mao_de_obra"
                value={editedService?.valor_mao_de_obra || '0.00'}
                onChange={handleInputChange}
                step="0.01"
                className="mt-1 block w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Observações:</label>
              <textarea
                name="observacoes"
                value={editedService?.observacoes || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border rounded"
              ></textarea>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Salvar Alterações</button>
            <button type="button" onClick={() => { setIsEditing(false); setEditedService(service); }} className="bg-gray-500 text-white px-4 py-2 rounded ml-2">Cancelar</button>
          </form>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Informações do Serviço</h2>
          <p><strong>Cliente:</strong> {client?.nome}</p>
          <p><strong>Moto:</strong> {moto?.modelo}</p>
          <p><strong>Placa:</strong> {moto?.placa}</p>
          <p><strong>Quilometragem:</strong> {service?.kilometragem} km</p>
          <p><strong>Descrição:</strong> {service?.descricao}</p>
          <p><strong>Observações:</strong> {service?.observacoes || 'N/A'}</p>
          <p><strong>Data de Início:</strong> {service?.data_inicio}</p>
          <p><strong>Data de Fim:</strong> {service.data_fim || 'N/A'}</p>
          <p><strong>Valor Mão de Obra:</strong> R$ {Number(service?.valor_mao_de_obra).toFixed(2)}</p>
          <p><strong>Valor Total Peças:</strong> R$ {Number(service?.valor_total_pecas).toFixed(2)}</p>
          <p><strong>Valor Total Serviço:</strong> R$ {Number(service?.valor_total_servico).toFixed(2)}</p>
        </div>
      )}

      {/* Seção de upload e listagem de fotos */}
      <div className="bg-white shadow-md rounded-lg p-6 mt-6">
        <h2 className="text-xl font-bold mb-4">Fotos do Serviço</h2>
        <form onSubmit={handleUploadPhoto} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Selecionar Foto:</label>
            <input type="file" onChange={handleFileChange} required className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </div>
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Upload Foto</button>
        </form>

        {uploadedPhotos.length === 0 ? (
          <p>Nenhuma foto adicionada.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            {uploadedPhotos.map(photo => (
              <div key={photo.id} className="relative group">
                <img src={photo.foto} alt={photo.descricao || 'Foto do Serviço'} className="w-full h-32 object-cover rounded-lg" />
                <button
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Excluir foto"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {renderPartsSection()}
    </div>
  );
};

export default ServiceDetailsPage;
