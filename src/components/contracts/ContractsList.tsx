import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, FileText, Home, DollarSign } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { Contract } from '../../types/contract';
import { Client } from '../../types/client';
import { Work } from '../../types/work';
import { Supplier } from '../../types/supplier';
import { useAuth } from '../../contexts/AuthContext';
import ContractModal from './ContractModal';

interface ContractsListProps {
  onNavigateHome: () => void;
}

export default function ContractsList({ onNavigateHome }: ContractsListProps) {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [clientFilter, setClientFilter] = useState<string>('todos');
  const [workFilter, setWorkFilter] = useState<string>('todos');
  const [supplierFilter, setSupplierFilter] = useState<string>('todos');
  const [minValue, setMinValue] = useState<string>('');
  const [maxValue, setMaxValue] = useState<string>('');
  const [installmentsFilter, setInstallmentsFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | undefined>();

  useEffect(() => {
    loadContracts();
    loadRelatedData();
  }, []);

  useEffect(() => {
    filterContracts();
  }, [searchTerm, statusFilter, clientFilter, workFilter, supplierFilter, minValue, maxValue, installmentsFilter, contracts]);

  const loadContracts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedData = async () => {
    if (!user) return;

    try {
      const [clientsData, worksData, suppliersData] = await Promise.all([
        supabase.from('clients').select('id, name').eq('user_id', user.id),
        supabase.from('works').select('id, name').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('suppliers').select('id, name').eq('user_id', user.id)
      ]);

      if (clientsData.data) setClients(clientsData.data as Client[]);
      if (worksData.data) setWorks(worksData.data as Work[]);
      if (suppliersData.data) setSuppliers(suppliersData.data as Supplier[]);
    } catch (error) {
      console.error('Error loading related data:', error);
    }
  };

  const filterContracts = () => {
    let filtered = contracts;

    if (statusFilter !== 'todos') {
      filtered = filtered.filter(contract => contract.status === statusFilter);
    }

    if (clientFilter !== 'todos') {
      filtered = filtered.filter(contract => contract.client_id === clientFilter);
    }

    if (workFilter !== 'todos') {
      filtered = filtered.filter(contract => contract.work_id === workFilter);
    }

    if (supplierFilter !== 'todos') {
      filtered = filtered.filter(contract => contract.supplier_id === supplierFilter);
    }

    if (minValue) {
      const min = parseFloat(minValue);
      if (!isNaN(min)) {
        filtered = filtered.filter(contract => contract.contract_value >= min);
      }
    }

    if (maxValue) {
      const max = parseFloat(maxValue);
      if (!isNaN(max)) {
        filtered = filtered.filter(contract => contract.contract_value <= max);
      }
    }

    if (installmentsFilter) {
      const installments = parseInt(installmentsFilter);
      if (!isNaN(installments)) {
        filtered = filtered.filter(contract => contract.installments === installments);
      }
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(contract => {
        const client = clients.find(c => c.id === contract.client_id);
        const work = works.find(w => w.id === contract.work_id);
        const supplier = suppliers.find(s => s.id === contract.supplier_id);

        return (
          contract.contract_number.toLowerCase().includes(term) ||
          client?.name.toLowerCase().includes(term) ||
          work?.name.toLowerCase().includes(term) ||
          supplier?.name.toLowerCase().includes(term) ||
          contract.scope.toLowerCase().includes(term)
        );
      });
    }

    setFilteredContracts(filtered);
  };

  const handleAddContract = () => {
    setSelectedContractId(undefined);
    setModalOpen(true);
  };

  const handleEditContract = (contractId: string) => {
    setSelectedContractId(contractId);
    setModalOpen(true);
  };

  const handleDeleteContract = async (contractId: string) => {
    if (!confirm('Deseja realmente excluir este contrato? Todos os dados relacionados serão perdidos.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);

      if (error) throw error;
      await loadContracts();
    } catch (error) {
      console.error('Error deleting contract:', error);
      alert('Erro ao excluir contrato');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedContractId(undefined);
  };

  const handleModalSave = () => {
    loadContracts();
  };

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || '-';
  };

  const getWorkName = (workId: string) => {
    return works.find(w => w.id === workId)?.name || '-';
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(s => s.id === supplierId)?.name || '-';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800';
      case 'concluido': return 'bg-blue-100 text-blue-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ativo': return 'Ativo';
      case 'concluido': return 'Concluído';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('todos');
    setClientFilter('todos');
    setWorkFilter('todos');
    setSupplierFilter('todos');
    setMinValue('');
    setMaxValue('');
    setInstallmentsFilter('');
  };

  return (
    <div className="flex flex-col h-full relative">
      <button
        onClick={onNavigateHome}
        className="absolute top-0 right-0 z-10 p-2 sm:p-3 rounded-lg shadow-lg hover:shadow-xl transition-all"
        style={{
          backgroundColor: conktColors.primary.blue,
          color: '#000000'
        }}
        title="Voltar ao Início"
      >
        <Home className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      <div className="mb-4 pr-12 sm:pr-0 flex-shrink-0">
        {/* Search and New Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar contratos..."
              className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{}}
            />
          </div>

          <button
            onClick={handleAddContract}
            className="px-3 sm:px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm"
            style={{
              backgroundColor: '#10B981',
              color: '#000000'
            }}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Novo Contrato</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Filtros</h3>
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Limpar filtros
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cliente</label>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{}}
              >
                <option value="todos">Todos</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Obra</label>
              <select
                value={workFilter}
                onChange={(e) => setWorkFilter(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{}}
              >
                <option value="todos">Todas</option>
                {works.map(work => (
                  <option key={work.id} value={work.id}>{work.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fornecedor</label>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{}}
              >
                <option value="todos">Todos</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{}}
              >
                <option value="todos">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col min-h-0">
        {loading && contracts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Carregando...
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
            <FileText className="w-16 h-16 mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">Nenhum contrato encontrado</p>
            <p className="text-sm text-gray-400">
              {searchTerm || statusFilter !== 'todos' || clientFilter !== 'todos' || workFilter !== 'todos' || supplierFilter !== 'todos' || minValue || maxValue || installmentsFilter
                ? 'Tente ajustar os filtros de busca'
                : 'Clique em "Novo Contrato" para começar'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block flex-1 overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nº Contrato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Obra
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fornecedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 mr-2 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {contract.contract_number}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700 break-words max-w-xs">
                          {getClientName(contract.client_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {getWorkName(contract.work_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {getSupplierName(contract.supplier_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                          <span className="text-sm font-medium text-gray-900">
                            R$ {contract.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(contract.status)}`}>
                          {getStatusLabel(contract.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditContract(contract.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteContract(contract.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Excluir"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden flex-1 overflow-auto p-3 space-y-3">
              {filteredContracts.map((contract) => (
                <div key={contract.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <h3 className="text-sm font-semibold text-gray-900">{contract.contract_number}</h3>
                      </div>
                      <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${getStatusColor(contract.status)}`}>
                        {getStatusLabel(contract.status)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditContract(contract.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteContract(contract.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="text-gray-600">
                      <span className="font-medium">Cliente:</span> {getClientName(contract.client_id)}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Obra:</span> {getWorkName(contract.work_id)}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Fornecedor:</span> {getSupplierName(contract.supplier_id)}
                    </p>
                    <div className="flex items-center gap-1 text-green-600 font-semibold">
                      <DollarSign className="w-3 h-3" />
                      <span>R$ {contract.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <ContractModal
          isOpen={modalOpen}
          onClose={handleModalClose}
          onSave={handleModalSave}
          contractId={selectedContractId}
        />
      )}
    </div>
  );
}
