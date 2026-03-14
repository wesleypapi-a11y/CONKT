import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, FileText, ArrowLeft, User, Eye, CreditCard as Edit, Printer } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { PurchaseRequest } from '../../types/purchase';
import { Work } from '../../types/work';
import { useAuth } from '../../contexts/AuthContext';
import PurchaseRequestModal from './PurchaseRequestModal';
import { useAlert } from '../../hooks/useAlert';
import { translateDatabaseError } from '../../utils/errorTranslations';
import { generatePurchaseRequestPDF } from '../../utils/purchaseRequestPdfGenerator';

interface PurchaseRequestsListProps {
  onNavigateHome: () => void;
}

export default function PurchaseRequestsList({ onNavigateHome }: PurchaseRequestsListProps) {
  const { user, prepareAuthHeader } = useAuth();
  const { showSuccess, showError, showConfirm, AlertComponent } = useAlert();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    work_id: '',
    supplier_id: '',
    date_start: '',
    date_end: ''
  });
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    loadRequests();
    loadWorks();
    loadSuppliers();
  }, [filters]);

  const loadRequests = async () => {
    try {
      let query = supabase
        .from('purchase_requests')
        .select(`
          *,
          works (
            name,
            work_address,
            work_city,
            client_id
          )
        `)
        .eq('status', 'solicitado')
        .is('deleted_at', null);

      if (filters.work_id) {
        query = query.eq('work_id', filters.work_id);
      }

      if (filters.date_start) {
        query = query.gte('created_at', filters.date_start);
      }

      if (filters.date_end) {
        query = query.lte('created_at', filters.date_end + 'T23:59:59');
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const clientIds = data
          .map(req => (req.works as any)?.client_id)
          .filter(Boolean);

        let clientsMap: { [key: string]: any } = {};

        if (clientIds.length > 0) {
          const { data: clientsData } = await supabase
            .from('clients')
            .select('id, name, fantasy_name')
            .in('id', clientIds);

          if (clientsData) {
            clientsData.forEach(client => {
              clientsMap[client.id] = client;
            });
          }
        }

        const requestsWithClients = data.map(req => {
          const workData = req.works as any;
          if (workData && workData.client_id && clientsMap[workData.client_id]) {
            return {
              ...req,
              works: {
                ...workData,
                clients: clientsMap[workData.client_id]
              }
            };
          }
          return req;
        });

        setRequests(requestsWithClients);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
      showError('Não foi possível carregar as solicitações');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const loadWorks = async () => {
    try {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .order('name');

      if (error) throw error;
      setWorks(data || []);
    } catch (error) {
      console.error('Erro ao carregar obras:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, fantasy_name')
        .eq('active', true)
        .order('fantasy_name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  };

  const handleAddRequest = () => {
    setSelectedRequest(null);
    setIsModalOpen(true);
  };

  const handleViewRequest = (request: PurchaseRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleEditRequest = (request: PurchaseRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handlePrintRequest = async (requestId: string) => {
    try {
      const blob = await generatePurchaseRequestPDF(requestId);
      if (!blob) {
        showError('Erro ao gerar PDF da solicitação');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Solicitacao_${requestId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showError('Erro ao gerar PDF da solicitação');
    }
  };

  const handleDeleteRequest = async (id: string) => {
    const request = requests.find(r => r.id === id);

    showConfirm(
      'Tem certeza que deseja excluir esta solicitação?\n\n' +
      'Esta ação irá:\n' +
      '• Remover a solicitação\n' +
      '• Excluir todas as cotações vinculadas\n' +
      '• Excluir todos os pedidos vinculados (se houver)\n' +
      '• Estornar valores do Realizado no orçamento (se houver)\n\n' +
      'Esta ação não pode ser desfeita.',
      async () => {
        try {
          console.log('[PurchaseRequestsList] Preparando Authorization header...');
          const authHeader = await prepareAuthHeader();

          if (!authHeader) {
            throw new Error('Não foi possível obter token válido. Por favor, faça login novamente.');
          }

          console.log('[PurchaseRequestsList] Token preparado com sucesso');

          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-purchase-request-cascade`;

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              request_id: id,
              user_id: user?.id || ''
            })
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.error || 'Erro ao excluir solicitação');
          }

          await loadRequests();

          const deletedCount = result.deleted?.quotations || 0;
          if (deletedCount > 0) {
            showSuccess(`Solicitação e ${deletedCount} cotação(ões) vinculada(s) excluídas com sucesso! Valores estornados do Realizado.`);
          } else {
            showSuccess('Solicitação excluída com sucesso!');
          }
        } catch (error: any) {
          console.error('Erro ao excluir solicitação:', error);
          showError(error.message || 'Erro ao excluir solicitação');
        }
      },
      {
        type: 'danger',
        confirmText: 'Sim, excluir tudo',
        cancelText: 'Cancelar'
      }
    );
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
    loadRequests();
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getWorkName(request.work_id || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const getWorkName = (workId: string) => {
    return works.find(w => w.id === workId)?.name || '-';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'solicitado': return '#3b82f6';
      case 'cotando': return '#f59e0b';
      case 'pedido': return '#10b981';
      case 'aberta': return '#3b82f6';
      case 'mapa': return '#8b5cf6';
      case 'aprovada': return '#10b981';
      case 'cancelada': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'solicitado': return 'Solicitado';
      case 'cotando': return 'Cotando';
      case 'pedido': return 'Pedido';
      case 'aberta': return 'Aberta';
      case 'mapa': return 'Mapa';
      case 'aprovada': return 'Aprovada';
      case 'cancelada': return 'Cancelada';
      default: return status;
    }
  };

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    try {
      // Buscar base_number da solicitação
      const { data: requestData } = await supabase
        .from('purchase_requests')
        .select('base_number')
        .eq('id', requestId)
        .single();

      let updateData: any = { status: newStatus };

      // Atualizar request_number baseado no status
      if (requestData?.base_number) {
        if (newStatus === 'solicitado') {
          updateData.request_number = `S-${requestData.base_number}`;
        } else if (newStatus === 'cotando') {
          updateData.request_number = `C-${requestData.base_number}`;
        } else if (newStatus === 'pedido') {
          updateData.request_number = `P-${requestData.base_number}`;
        }
      }

      const { error } = await supabase
        .from('purchase_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      await loadRequests();
      showSuccess('Status atualizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      showError('Não foi possível atualizar o status');
    }
  };

  const handleCreateFictitiousRequest = async () => {
    try {
      const randomNumber = Math.floor(Math.random() * 1000);
      const requestNumber = `JSCL${Date.now().toString().slice(-4)}`;

      const workToUse = works.length > 0 ? works[0].id : null;

      if (!workToUse) {
        showError('Crie pelo menos uma obra antes de criar solicitações fictícias');
        return;
      }

      const { data: newRequest, error: requestError } = await supabase
        .from('purchase_requests')
        .insert([{
          request_number: requestNumber,
          work_id: workToUse,
          status: 'solicitado',
          requester_id: user?.id,
          need_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: `Solicitação de teste ${randomNumber} - Materiais para construção`,
          contact_name: 'João Silva',
          contact_whatsapp: '(11) 98765-4321'
        }])
        .select()
        .single();

      if (requestError) throw requestError;

      const items = [
        { name: 'Cimento CP-II 50kg', quantity: 100, unit: 'sc' },
        { name: 'Areia Média', quantity: 10, unit: 'm³' },
        { name: 'Brita 1', quantity: 8, unit: 'm³' },
        { name: 'Tijolo Cerâmico 8 furos', quantity: 5000, unit: 'un' },
        { name: 'Vergalhão CA-50 10mm', quantity: 500, unit: 'kg' }
      ];

      for (const item of items) {
        await supabase
          .from('purchase_request_items')
          .insert([{
            request_id: newRequest.id,
            item_type: 'item_livre',
            phase: 'Estrutura',
            service: 'Alvenaria',
            item_name: item.name,
            complement: '',
            quantity: item.quantity,
            unit: item.unit
          }]);
      }

      showSuccess(`Solicitação fictícia ${requestNumber} criada com sucesso!`);
      loadRequests();
    } catch (error: any) {
      console.error('Erro ao criar solicitação fictícia:', error);
      showError('Não foi possível criar a solicitação fictícia');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b p-3">
        <button
          onClick={onNavigateHome}
          className="mb-3 px-4 py-2 rounded-md font-medium text-white flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{
            backgroundColor: arcoColors.primary.blue
          }}
          title="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar</span>
        </button>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-shrink-0" style={{ width: '180px' }}>
            <label className="block text-xs font-medium text-gray-700 mb-1">Obra</label>
            <select
              value={filters.work_id}
              onChange={(e) => setFilters({ ...filters, work_id: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: '#000000' }}
            >
              <option value="">Todas as Obras</option>
              {works.map(work => (
                <option key={work.id} value={work.id}>{work.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-shrink-0" style={{ width: '180px' }}>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fornecedor</label>
            <select
              value={filters.supplier_id}
              onChange={(e) => setFilters({ ...filters, supplier_id: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: '#000000' }}
            >
              <option value="">Todos os Fornecedores</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.fantasy_name || supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-shrink-0" style={{ width: '150px' }}>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data Inicial</label>
            <input
              type="date"
              value={filters.date_start}
              onChange={(e) => setFilters({ ...filters, date_start: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: '#000000' }}
            />
          </div>

          <div className="flex-shrink-0" style={{ width: '150px' }}>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data Final</label>
            <input
              type="date"
              value={filters.date_end}
              onChange={(e) => setFilters({ ...filters, date_end: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: '#000000' }}
            />
          </div>

          <div className="relative flex-1" style={{ minWidth: '200px' }}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar solicitações..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: '#000000' }}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddRequest}
              className="flex-shrink-0 px-4 py-1.5 rounded-md font-medium flex items-center gap-2 hover:opacity-90 transition-opacity text-sm"
              style={{
                backgroundColor: '#10B981',
                color: '#FFFFFF'
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Solicitações</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col min-h-0">
        {loading && requests.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Carregando...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
            <FileText className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Nenhuma solicitação encontrada</p>
            <p className="text-sm text-center">
              {searchTerm ? 'Tente ajustar os termos de busca' : 'Clique em "Nova Solicitação" para começar'}
            </p>
          </div>
        ) : (
          <div className="overflow-auto flex-1 p-4">
            <div className="mb-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-6 flex-1">
                  <div className="min-w-[140px]">
                    <span className="text-sm font-semibold" style={{ color: '#000000' }}>Pedido</span>
                  </div>
                  <div className="min-w-[110px]">
                    <span className="text-sm font-semibold" style={{ color: '#000000' }}>Status</span>
                  </div>
                  <div className="min-w-[200px]">
                    <span className="text-sm font-semibold" style={{ color: '#000000' }}>Cliente</span>
                  </div>
                  <div className="min-w-[160px]">
                    <span className="text-sm font-semibold" style={{ color: '#000000' }}>Necessidade</span>
                  </div>
                  <div className="min-w-[110px]">
                    <span className="text-sm font-semibold" style={{ color: '#000000' }}>Data</span>
                  </div>
                </div>
                <div className="min-w-[160px] text-center">
                  <span className="text-sm font-semibold" style={{ color: '#000000' }}>Ações</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {filteredRequests.map((request) => {
                const workData = request.works as any;
                const clientData = workData?.clients;
                const needDate = request.need_date ? new Date(request.need_date) : null;
                const createdDate = new Date(request.created_at);
                const isOverdue = needDate && needDate < new Date();

                return (
                  <div
                    key={request.id}
                    className="bg-white rounded-lg border border-gray-200 px-4 py-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-6 flex-1">
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-semibold text-base" style={{ color: '#000000' }}>
                            {request.request_number}
                          </span>
                        </div>

                        <div className="min-w-[110px]">
                          <select
                            value={request.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleStatusChange(request.id, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{
                              backgroundColor: getStatusColor(request.status),
                              color: '#FFFFFF'
                            }}
                          >
                            <option value="solicitado" style={{ backgroundColor: '#FFFFFF', color: '#000000' }}>Solicitado</option>
                            <option value="cotando" style={{ backgroundColor: '#FFFFFF', color: '#000000' }}>Cotando</option>
                            <option value="pedido" style={{ backgroundColor: '#FFFFFF', color: '#000000' }}>Pedido</option>
                          </select>
                        </div>

                        <div className="min-w-[200px]">
                          {clientData ? (
                            <div className="flex items-center gap-1.5">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm truncate" style={{ color: '#000000' }}>
                                {clientData.fantasy_name || clientData.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>

                        <div className="min-w-[160px]">
                          {needDate ? (
                            <span className={`text-sm font-medium`} style={{ color: isOverdue ? '#DC2626' : '#000000' }}>
                              {needDate.toLocaleDateString('pt-BR')}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>

                        <div className="min-w-[110px]">
                          <span className="text-sm" style={{ color: '#000000' }}>
                            {createdDate.toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 min-w-[160px] justify-center">
                        <button
                          onClick={() => handleViewRequest(request)}
                          className="p-2 hover:bg-blue-50 rounded transition-colors"
                          style={{ color: arcoColors.primary.blue }}
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditRequest(request)}
                          className="p-2 hover:bg-blue-50 rounded transition-colors"
                          style={{ color: arcoColors.primary.blue }}
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrintRequest(request.id)}
                          className="p-2 hover:bg-blue-50 rounded transition-colors"
                          style={{ color: arcoColors.primary.blue }}
                          title="Imprimir PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRequest(request.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <PurchaseRequestModal
          request={selectedRequest}
          onClose={handleCloseModal}
        />
      )}

      <AlertComponent />
    </div>
  );
}
