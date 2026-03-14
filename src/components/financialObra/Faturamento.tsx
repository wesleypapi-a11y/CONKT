import { useState, useEffect } from 'react';
import { FileText, Plus, Search, X, CreditCard as Edit, Trash2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { getEmpresaContext } from '../../utils/empresaContext';

interface BillingModalData {
  work_id: string;
  cliente_id: string;
  tipo: 'Medicao' | 'Parcela Contrato' | 'Reembolso' | 'Outros';
  descricao: string;
  numero_medicao: string;
  valor: string;
  data_emissao: string;
  data_vencimento: string;
  data_recebimento: string;
  status: 'a_faturar' | 'faturado' | 'recebido' | 'atrasado';
  observacoes: string;
  contract_id: string;
}

const TIPOS_FATURAMENTO = ['Medicao', 'Parcela Contrato', 'Reembolso', 'Outros'];
const STATUS_OPTIONS = ['a_faturar', 'faturado', 'recebido', 'atrasado'];

export function Faturamento({ workId }: { workId?: string }) {
  const [billings, setBillings] = useState<any[]>([]);
  const [filteredBillings, setFilteredBillings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBilling, setEditingBilling] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [works, setWorks] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  const [formData, setFormData] = useState<BillingModalData>({
    work_id: workId || '',
    cliente_id: '',
    tipo: 'Medicao',
    descricao: '',
    numero_medicao: '',
    valor: '',
    data_emissao: new Date().toISOString().split('T')[0],
    data_vencimento: '',
    data_recebimento: '',
    status: 'a_faturar',
    observacoes: '',
    contract_id: ''
  });

  const { showAlert } = useAlert();

  useEffect(() => {
    loadBillings();
    loadReferences();
  }, [workId]);

  useEffect(() => {
    applyFilters();
  }, [billings, searchTerm, filterStatus]);

  const loadReferences = async () => {
    try {
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) return;

      const [worksRes, clientsRes, contractsRes] = await Promise.all([
        supabase.from('works').select('id, nome').eq('empresa_id', empresaId).is('deleted_at', null),
        supabase.from('clients').select('id, nome_fantasia').eq('empresa_id', empresaId).is('deleted_at', null),
        supabase.from('contracts').select('id, numero_contrato').eq('empresa_id', empresaId).is('deleted_at', null)
      ]);

      setWorks(worksRes.data || []);
      setClients(clientsRes.data || []);
      setContracts(contractsRes.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar referências:', error);
    }
  };

  const loadBillings = async () => {
    try {
      setLoading(true);
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        setLoading(false);
        return;
      }

      let query = supabase
        .from('financial_billings')
        .select(`
          *,
          work:works(nome),
          cliente:clients(nome_fantasia),
          contract:contracts(numero_contrato)
        `)
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('data_emissao', { ascending: false });

      if (workId) {
        query = query.eq('work_id', workId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setBillings(data || []);
    } catch (error: any) {
      showAlert('Erro ao carregar faturamentos', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...billings];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(b =>
        b.descricao.toLowerCase().includes(term) ||
        (b.numero_medicao && String(b.numero_medicao).includes(term))
      );
    }

    if (filterStatus !== 'todos') {
      filtered = filtered.filter(b => b.status === filterStatus);
    }

    setFilteredBillings(filtered);
  };

  const handleSave = async () => {
    try {
      if (!formData.descricao || !formData.valor || !formData.work_id) {
        showAlert('Preencha todos os campos obrigatórios', 'error');
        return;
      }

      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const billingData = {
        empresa_id: empresaId,
        work_id: formData.work_id,
        cliente_id: formData.cliente_id || null,
        tipo: formData.tipo,
        descricao: formData.descricao,
        numero_medicao: formData.numero_medicao ? Number(formData.numero_medicao) : null,
        valor: Number(formData.valor),
        data_emissao: formData.data_emissao,
        data_vencimento: formData.data_vencimento || null,
        data_recebimento: formData.data_recebimento || null,
        status: formData.status,
        observacoes: formData.observacoes || null,
        contract_id: formData.contract_id || null,
        created_by: user?.id
      };

      if (editingBilling) {
        const { error } = await supabase
          .from('financial_billings')
          .update(billingData)
          .eq('id', editingBilling.id);

        if (error) throw error;
        showAlert('Faturamento atualizado com sucesso', 'success');
      } else {
        const { error } = await supabase
          .from('financial_billings')
          .insert(billingData);

        if (error) throw error;
        showAlert('Faturamento criado com sucesso', 'success');
      }

      setShowModal(false);
      setEditingBilling(null);
      resetForm();
      loadBillings();
    } catch (error: any) {
      showAlert('Erro ao salvar faturamento', 'error');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este faturamento?')) return;

    try {
      const { error } = await supabase
        .from('financial_billings')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      showAlert('Faturamento excluído com sucesso', 'success');
      loadBillings();
    } catch (error: any) {
      showAlert('Erro ao excluir faturamento', 'error');
      console.error(error);
    }
  };

  const openModal = (billing?: any) => {
    if (billing) {
      setEditingBilling(billing);
      setFormData({
        work_id: billing.work_id,
        cliente_id: billing.cliente_id || '',
        tipo: billing.tipo,
        descricao: billing.descricao,
        numero_medicao: billing.numero_medicao ? String(billing.numero_medicao) : '',
        valor: String(billing.valor),
        data_emissao: billing.data_emissao,
        data_vencimento: billing.data_vencimento || '',
        data_recebimento: billing.data_recebimento || '',
        status: billing.status,
        observacoes: billing.observacoes || '',
        contract_id: billing.contract_id || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      work_id: workId || '',
      cliente_id: '',
      tipo: 'Medicao',
      descricao: '',
      numero_medicao: '',
      valor: '',
      data_emissao: new Date().toISOString().split('T')[0],
      data_vencimento: '',
      data_recebimento: '',
      status: 'a_faturar',
      observacoes: '',
      contract_id: ''
    });
    setEditingBilling(null);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      a_faturar: 'bg-yellow-100 text-yellow-800',
      faturado: 'bg-blue-100 text-blue-800',
      recebido: 'bg-green-100 text-green-800',
      atrasado: 'bg-red-100 text-red-800'
    };
    return badges[status] || badges.a_faturar;
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      a_faturar: 'A Faturar',
      faturado: 'Faturado',
      recebido: 'Recebido',
      atrasado: 'Atrasado'
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Faturamento</h2>
          <p className="text-gray-600 mt-1">Medições e valores a receber do cliente</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          Novo Faturamento
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por descrição ou número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os status</option>
            {STATUS_OPTIONS.map(status => (
              <option key={status} value={status}>{getStatusLabel(status)}</option>
            ))}
          </select>

          {(searchTerm || filterStatus !== 'todos') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('todos');
              }}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <X size={18} />
              Limpar
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Descrição</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Cliente</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Obra</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Valor</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Emissão</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredBillings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    Nenhum faturamento encontrado
                  </td>
                </tr>
              ) : (
                filteredBillings.map((billing) => (
                  <tr key={billing.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-700">{billing.tipo}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{billing.descricao}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{billing.cliente?.nome_fantasia || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{billing.work?.nome || '-'}</td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-gray-800">
                      {formatCurrency(Number(billing.valor))}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {new Date(billing.data_emissao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadge(billing.status)}`}>
                        {getStatusLabel(billing.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openModal(billing)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(billing.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                {editingBilling ? 'Editar Faturamento' : 'Novo Faturamento'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingBilling(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {TIPOS_FATURAMENTO.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status} value={status}>{getStatusLabel(status)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Medição 01 - Janeiro/2026"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Obra <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.work_id}
                    onChange={(e) => setFormData({ ...formData, work_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={!!workId}
                  >
                    <option value="">Selecione...</option>
                    {works.map(work => (
                      <option key={work.id} value={work.id}>{work.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente
                  </label>
                  <select
                    value={formData.cliente_id}
                    onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.nome_fantasia}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {formData.tipo === 'Medicao' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número da Medição
                    </label>
                    <input
                      type="number"
                      value={formData.numero_medicao}
                      onChange={(e) => setFormData({ ...formData, numero_medicao: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 1"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contrato Vinculado
                  </label>
                  <select
                    value={formData.contract_id}
                    onChange={(e) => setFormData({ ...formData, contract_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {contracts.map(contract => (
                      <option key={contract.id} value={contract.id}>{contract.numero_contrato}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Emissão <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.data_emissao}
                    onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Recebimento
                  </label>
                  <input
                    type="date"
                    value={formData.data_recebimento}
                    onChange={(e) => setFormData({ ...formData, data_recebimento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Informações adicionais..."
                />
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingBilling(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingBilling ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
