import { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, X, CreditCard as Edit, Trash2, Paperclip, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { getEmpresaContext } from '../../utils/empresaContext';
import type { FinancialDocument } from '../../types/financialObra';

interface DocumentModalData {
  tipo: 'Conta a Pagar' | 'Conta a Receber' | 'Adiantamento' | 'Reembolso' | 'Medicao' | 'Imposto' | 'Parcelamento';
  descricao: string;
  work_id: string;
  fornecedor_id: string;
  cliente_id: string;
  cost_center_id: string;
  categoria: string;
  valor: string;
  data_vencimento: string;
  forma_pagamento: string;
  numero_documento: string;
  status: 'previsto' | 'aprovado' | 'pago' | 'recebido' | 'cancelado';
  observacoes: string;
  anexo?: File;
}

const TIPOS_DOCUMENTO = [
  'Conta a Pagar',
  'Conta a Receber',
  'Adiantamento',
  'Reembolso',
  'Medicao',
  'Imposto',
  'Parcelamento'
];

const STATUS_OPTIONS = ['previsto', 'aprovado', 'pago', 'recebido', 'cancelado'];

const FORMAS_PAGAMENTO = ['PIX', 'Transferência', 'Dinheiro', 'Débito', 'Crédito', 'Boleto', 'Cheque'];

export function DocumentosFinanceiros({ workId }: { workId?: string }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [works, setWorks] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);

  const [formData, setFormData] = useState<DocumentModalData>({
    tipo: 'Conta a Pagar',
    descricao: '',
    work_id: workId || '',
    fornecedor_id: '',
    cliente_id: '',
    cost_center_id: '',
    categoria: '',
    valor: '',
    data_vencimento: new Date().toISOString().split('T')[0],
    forma_pagamento: 'PIX',
    numero_documento: '',
    status: 'previsto',
    observacoes: ''
  });

  const { showAlert } = useAlert();

  useEffect(() => {
    loadDocuments();
    loadReferences();
  }, [workId]);

  useEffect(() => {
    applyFilters();
  }, [documents, searchTerm, filterTipo, filterStatus]);

  const loadReferences = async () => {
    try {
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) return;

      const [worksRes, suppliersRes, clientsRes, centersRes] = await Promise.all([
        supabase.from('works').select('id, nome').eq('empresa_id', empresaId).is('deleted_at', null),
        supabase.from('suppliers').select('id, nome_fantasia').eq('empresa_id', empresaId).is('deleted_at', null),
        supabase.from('clients').select('id, nome_fantasia').eq('empresa_id', empresaId).is('deleted_at', null),
        supabase.from('financial_cost_centers').select('id, nome, codigo').eq('empresa_id', empresaId).is('deleted_at', null)
      ]);

      setWorks(worksRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setClients(clientsRes.data || []);
      setCostCenters(centersRes.data || []);
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
          fornecedor:suppliers(nome_fantasia),
          cliente:clients(nome_fantasia),
          cost_center:financial_cost_centers(nome, codigo)
        `)
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('data_vencimento', { ascending: false });

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
        d.descricao.toLowerCase().includes(term) ||
        (d.numero_documento && d.numero_documento.toLowerCase().includes(term))
      );
    }

    if (filterTipo !== 'todos') {
      filtered = filtered.filter(d => d.tipo === filterTipo);
    }

    if (filterStatus !== 'todos') {
      filtered = filtered.filter(d => d.status === filterStatus);
    }

    setFilteredDocuments(filtered);
  };

  const handleSave = async () => {
    try {
      if (!formData.descricao || !formData.valor || !formData.data_vencimento) {
        showAlert('Preencha todos os campos obrigatórios', 'error');
        return;
      }

      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      let anexoPath = null;
      if (formData.anexo) {
        const timestamp = Date.now();
        const fileName = `${empresaId}/${timestamp}_${formData.anexo.name}`;
        const { error: uploadError } = await supabase.storage
          .from('financial-documents')
          .upload(fileName, formData.anexo);

        if (uploadError) throw uploadError;
        anexoPath = fileName;
      }

      const docData = {
        empresa_id: empresaId,
        work_id: formData.work_id || null,
        tipo: formData.tipo,
        descricao: formData.descricao,
        fornecedor_id: formData.fornecedor_id || null,
        cliente_id: formData.cliente_id || null,
        cost_center_id: formData.cost_center_id || null,
        categoria: formData.categoria || null,
        valor: Number(formData.valor),
        data_vencimento: formData.data_vencimento,
        forma_pagamento: formData.forma_pagamento || null,
        numero_documento: formData.numero_documento || null,
        status: formData.status,
        observacoes: formData.observacoes || null,
        anexo_path: anexoPath || (editingDoc?.anexo_path || null),
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

  const downloadAnexo = async (path: string, nome: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('financial-documents')
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      showAlert('Erro ao baixar anexo', 'error');
      console.error(error);
    }
  };

  const openModal = (doc?: any) => {
    if (doc) {
      setEditingDoc(doc);
      setFormData({
        tipo: doc.tipo,
        descricao: doc.descricao,
        work_id: doc.work_id || '',
        fornecedor_id: doc.fornecedor_id || '',
        cliente_id: doc.cliente_id || '',
        cost_center_id: doc.cost_center_id || '',
        categoria: doc.categoria || '',
        valor: String(doc.valor),
        data_vencimento: doc.data_vencimento,
        forma_pagamento: doc.forma_pagamento || 'PIX',
        numero_documento: doc.numero_documento || '',
        status: doc.status,
        observacoes: doc.observacoes || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      tipo: 'Conta a Pagar',
      descricao: '',
      work_id: workId || '',
      fornecedor_id: '',
      cliente_id: '',
      cost_center_id: '',
      categoria: '',
      valor: '',
      data_vencimento: new Date().toISOString().split('T')[0],
      forma_pagamento: 'PIX',
      numero_documento: '',
      status: 'previsto',
      observacoes: ''
    });
    setEditingDoc(null);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      previsto: 'bg-gray-100 text-gray-800',
      aprovado: 'bg-blue-100 text-blue-800',
      pago: 'bg-green-100 text-green-800',
      recebido: 'bg-green-100 text-green-800',
      cancelado: 'bg-red-100 text-red-800'
    };
    return badges[status] || badges.previsto;
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      previsto: 'Previsto',
      aprovado: 'Aprovado',
      pago: 'Pago',
      recebido: 'Recebido',
      cancelado: 'Cancelado'
    };
    return labels[status] || status;
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
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os tipos</option>
            {TIPOS_DOCUMENTO.map(tipo => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>

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

          {(searchTerm || filterTipo !== 'todos' || filterStatus !== 'todos') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterTipo('todos');
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
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    Nenhum documento encontrado
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-700">{doc.tipo}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {doc.descricao}
                      {doc.anexo_path && (
                        <button
                          onClick={() => downloadAnexo(doc.anexo_path, doc.descricao)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                          title="Baixar anexo"
                        >
                          <Paperclip size={14} className="inline" />
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">{doc.work?.nome || '-'}</td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-gray-800">
                      {formatCurrency(Number(doc.valor))}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-700">
                      {formatCurrency(Number(doc.valor_pago))}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {new Date(doc.data_vencimento).toLocaleDateString('pt-BR')}
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
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {TIPOS_DOCUMENTO.map(tipo => (
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
                    Centro de Custo
                  </label>
                  <select
                    value={formData.cost_center_id}
                    onChange={(e) => setFormData({ ...formData, cost_center_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {costCenters.map(cc => (
                      <option key={cc.id} value={cc.id}>{cc.codigo} - {cc.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.tipo === 'Conta a Pagar' || formData.tipo === 'Adiantamento' ? 'Fornecedor' : 'Cliente'}
                  </label>
                  <select
                    value={formData.tipo === 'Conta a Pagar' || formData.tipo === 'Adiantamento' ? formData.fornecedor_id : formData.cliente_id}
                    onChange={(e) => {
                      if (formData.tipo === 'Conta a Pagar' || formData.tipo === 'Adiantamento') {
                        setFormData({ ...formData, fornecedor_id: e.target.value });
                      } else {
                        setFormData({ ...formData, cliente_id: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {(formData.tipo === 'Conta a Pagar' || formData.tipo === 'Adiantamento' ? suppliers : clients).map(item => (
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
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
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
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
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
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={formData.forma_pagamento}
                    onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {FORMAS_PAGAMENTO.map(forma => (
                      <option key={forma} value={forma}>{forma}</option>
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
                  value={formData.numero_documento}
                  onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: NF-12345"
                />
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anexo (Nota Fiscal, Comprovante, etc.)
                </label>
                <input
                  type="file"
                  onChange={(e) => setFormData({ ...formData, anexo: e.target.files?.[0] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {editingDoc?.anexo_path && !formData.anexo && (
                  <p className="text-xs text-gray-500 mt-1">
                    Anexo existente: {editingDoc.anexo_path.split('/').pop()}
                  </p>
                )}
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
