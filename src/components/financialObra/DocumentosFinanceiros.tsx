import { useState, useEffect } from 'react';
import { FileText, Plus, Search, X, CreditCard as Edit, Trash2, Paperclip } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { getEmpresaContext } from '../../utils/empresaContext';

interface DocumentModalData {
  document_type: 'provisao' | 'previsao' | 'adiantamento' | 'receber' | 'pagar';
  transaction_type: 'receita' | 'despesa';
  description: string;
  work_id: string;
  supplier_id: string;
  client_id: string;
  financial_account_id: string;
  category: string;
  amount: string;
  due_date: string;
  payment_method: string;
  document_number: string;
  status: 'aberto' | 'pago' | 'parcial' | 'atrasado' | 'cancelado';
  notes: string;
}

const DOCUMENT_TYPES = [
  { value: 'provisao', label: 'Provisão' },
  { value: 'previsao', label: 'Previsão' },
  { value: 'adiantamento', label: 'Adiantamento' },
  { value: 'receber', label: 'A Receber' },
  { value: 'pagar', label: 'A Pagar' }
];

const STATUS_OPTIONS = [
  { value: 'aberto', label: 'Aberto' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'pago', label: 'Pago' },
  { value: 'atrasado', label: 'Atrasado' },
  { value: 'cancelado', label: 'Cancelado' }
];

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'ted', label: 'TED' },
  { value: 'doc', label: 'DOC' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'cheque', label: 'Cheque' }
];

export function DocumentosFinanceiros({ workId }: { workId?: string }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [works, setWorks] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  const [formData, setFormData] = useState<DocumentModalData>({
    document_type: 'pagar',
    transaction_type: 'despesa',
    description: '',
    work_id: workId || '',
    supplier_id: '',
    client_id: '',
    financial_account_id: '',
    category: '',
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    payment_method: 'pix',
    document_number: '',
    status: 'aberto',
    notes: ''
  });

  const { showAlert } = useAlert();

  useEffect(() => {
    loadDocuments();
    loadReferences();
  }, [workId]);

  useEffect(() => {
    applyFilters();
  }, [documents, searchTerm, filterType, filterStatus]);

  const loadReferences = async () => {
    try {
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) return;

      const [worksRes, suppliersRes, clientsRes, accountsRes] = await Promise.all([
        supabase.from('works').select('id, nome').eq('empresa_id', empresaId).is('deleted_at', null),
        supabase.from('suppliers').select('id, nome_fantasia').eq('empresa_id', empresaId).is('deleted_at', null),
        supabase.from('clients').select('id, nome_fantasia').eq('empresa_id', empresaId).is('deleted_at', null),
        supabase.from('financial_accounts').select('id, name, type').eq('empresa_id', empresaId).is('deleted_at', null)
      ]);

      setWorks(worksRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setClients(clientsRes.data || []);
      setAccounts(accountsRes.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar referências:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        setLoading(false);
        return;
      }

      let query = supabase
        .from('financial_documents')
        .select(`
          *,
          work:works(nome),
          supplier:suppliers(nome_fantasia),
          client:clients(nome_fantasia),
          financial_account:financial_accounts(name)
        `)
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('due_date', { ascending: false });

      if (workId) {
        query = query.eq('work_id', workId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setDocuments(data || []);
    } catch (error: any) {
      showAlert('Erro ao carregar documentos', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...documents];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        d.description?.toLowerCase().includes(term) ||
        d.document_number?.toLowerCase().includes(term)
      );
    }

    if (filterType !== 'todos') {
      filtered = filtered.filter(d => d.document_type === filterType);
    }

    if (filterStatus !== 'todos') {
      filtered = filtered.filter(d => d.status === filterStatus);
    }

    setFilteredDocuments(filtered);
  };

  const handleSave = async () => {
    try {
      if (!formData.description || !formData.amount || !formData.due_date) {
        showAlert('Preencha todos os campos obrigatórios', 'error');
        return;
      }

      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const docData = {
        empresa_id: empresaId,
        work_id: formData.work_id || null,
        document_type: formData.document_type,
        transaction_type: formData.transaction_type,
        description: formData.description,
        supplier_id: formData.supplier_id || null,
        client_id: formData.client_id || null,
        financial_account_id: formData.financial_account_id || null,
        category: formData.category || null,
        amount: Number(formData.amount),
        due_date: formData.due_date,
        payment_method: formData.payment_method || null,
        document_number: formData.document_number || null,
        status: formData.status,
        notes: formData.notes || null,
        created_by: user?.id
      };

      if (editingDoc) {
        const { error } = await supabase
          .from('financial_documents')
          .update(docData)
          .eq('id', editingDoc.id);

        if (error) throw error;
        showAlert('Documento atualizado com sucesso', 'success');
      } else {
        const { error } = await supabase
          .from('financial_documents')
          .insert(docData);

        if (error) throw error;
        showAlert('Documento criado com sucesso', 'success');
      }

      setShowModal(false);
      setEditingDoc(null);
      resetForm();
      loadDocuments();
    } catch (error: any) {
      showAlert('Erro ao salvar documento', 'error');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este documento?')) return;

    try {
      const { error } = await supabase
        .from('financial_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      showAlert('Documento excluído com sucesso', 'success');
      loadDocuments();
    } catch (error: any) {
      showAlert('Erro ao excluir documento', 'error');
      console.error(error);
    }
  };

  const openModal = (doc?: any) => {
    if (doc) {
      setEditingDoc(doc);
      setFormData({
        document_type: doc.document_type,
        transaction_type: doc.transaction_type,
        description: doc.description,
        work_id: doc.work_id || '',
        supplier_id: doc.supplier_id || '',
        client_id: doc.client_id || '',
        financial_account_id: doc.financial_account_id || '',
        category: doc.category || '',
        amount: String(doc.amount),
        due_date: doc.due_date,
        payment_method: doc.payment_method || 'pix',
        document_number: doc.document_number || '',
        status: doc.status,
        notes: doc.notes || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      document_type: 'pagar',
      transaction_type: 'despesa',
      description: '',
      work_id: workId || '',
      supplier_id: '',
      client_id: '',
      financial_account_id: '',
      category: '',
      amount: '',
      due_date: new Date().toISOString().split('T')[0],
      payment_method: 'pix',
      document_number: '',
      status: 'aberto',
      notes: ''
    });
    setEditingDoc(null);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      aberto: 'bg-yellow-100 text-yellow-800',
      parcial: 'bg-blue-100 text-blue-800',
      pago: 'bg-green-100 text-green-800',
      atrasado: 'bg-red-100 text-red-800',
      cancelado: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || badges.aberto;
  };

  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  const getStatusLabel = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.label || status;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Documentos Financeiros</h2>
          <p className="text-gray-600 mt-1">Contas a pagar, receber e outros documentos</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          Novo Documento
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os tipos</option>
            {DOCUMENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os status</option>
            {STATUS_OPTIONS.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>

          {(searchTerm || filterType !== 'todos' || filterStatus !== 'todos') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('todos');
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
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Nº Documento</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Descrição</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Obra</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Valor</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Pago</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Vencimento</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-500">
                    Nenhum documento encontrado
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-700">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        doc.transaction_type === 'receita' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {getDocumentTypeLabel(doc.document_type)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">{doc.document_number || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{doc.description}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{doc.work?.nome || '-'}</td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-gray-800">
                      {formatCurrency(Number(doc.amount))}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-700">
                      {formatCurrency(Number(doc.paid_amount || 0))}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {new Date(doc.due_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadge(doc.status)}`}>
                        {getStatusLabel(doc.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openModal(doc)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
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
                {editingDoc ? 'Editar Documento' : 'Novo Documento'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingDoc(null);
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
                    Tipo de Documento <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.document_type}
                    onChange={(e) => {
                      const type = e.target.value as any;
                      const transactionType = (type === 'receber' || type === 'previsao') ? 'receita' : 'despesa';
                      setFormData({ ...formData, document_type: type, transaction_type: transactionType });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {DOCUMENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
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
                      <option key={status.value} value={status.value}>{status.label}</option>
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
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Pagamento de fornecedor ref. Janeiro/2026"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Obra
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
                    Conta Gerencial
                  </label>
                  <select
                    value={formData.financial_account_id}
                    onChange={(e) => setFormData({ ...formData, financial_account_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.transaction_type === 'despesa' ? 'Fornecedor' : 'Cliente'}
                  </label>
                  <select
                    value={formData.transaction_type === 'despesa' ? formData.supplier_id : formData.client_id}
                    onChange={(e) => {
                      if (formData.transaction_type === 'despesa') {
                        setFormData({ ...formData, supplier_id: e.target.value });
                      } else {
                        setFormData({ ...formData, client_id: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {(formData.transaction_type === 'despesa' ? suppliers : clients).map(item => (
                      <option key={item.id} value={item.id}>{item.nome_fantasia}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Material, Serviço"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vencimento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {PAYMENT_METHODS.map(method => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número do Documento
                </label>
                <input
                  type="text"
                  value={formData.document_number}
                  onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: NF-12345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  setEditingDoc(null);
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
                {editingDoc ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
