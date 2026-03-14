import { useState, useEffect } from 'react';
import { FileText, Plus, Search, X, CreditCard as Edit, Trash2, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { getEmpresaContext } from '../../utils/empresaContext';

interface InvoiceModalData {
  invoice_number: string;
  invoice_type: 'entrada' | 'saida';
  supplier_id: string;
  client_id: string;
  cnpj: string;
  amount: string;
  issue_date: string;
  due_date: string;
  financial_document_id: string;
  notes: string;
  xmlFile?: File;
  pdfFile?: File;
}

export function NotasFiscais({ workId }: { workId?: string }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  const [formData, setFormData] = useState<InvoiceModalData>({
    invoice_number: '',
    invoice_type: 'entrada',
    supplier_id: '',
    client_id: '',
    cnpj: '',
    amount: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    financial_document_id: '',
    notes: ''
  });

  const { showAlert } = useAlert();

  useEffect(() => {
    loadInvoices();
    loadReferences();
  }, [workId]);

  useEffect(() => {
    applyFilters();
  }, [invoices, searchTerm, filterType]);

  const loadReferences = async () => {
    try {
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) return;

      const [suppliersRes, clientsRes, docsRes] = await Promise.all([
        supabase.from('suppliers').select('id, nome_fantasia, cnpj').eq('empresa_id', empresaId).is('deleted_at', null),
        supabase.from('clients').select('id, nome_fantasia, cnpj').eq('empresa_id', empresaId).is('deleted_at', null),
        supabase.from('financial_documents').select('id, description, document_number').eq('empresa_id', empresaId).is('deleted_at', null)
      ]);

      setSuppliers(suppliersRes.data || []);
      setClients(clientsRes.data || []);
      setDocuments(docsRes.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar referências:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          supplier:suppliers(nome_fantasia),
          client:clients(nome_fantasia),
          financial_document:financial_documents(description, document_number)
        `)
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('issue_date', { ascending: false });

      if (error) throw error;

      setInvoices(data || []);
    } catch (error: any) {
      showAlert('Erro ao carregar notas fiscais', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...invoices];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.invoice_number?.toLowerCase().includes(term) ||
        inv.cnpj?.toLowerCase().includes(term)
      );
    }

    if (filterType !== 'todos') {
      filtered = filtered.filter(inv => inv.invoice_type === filterType);
    }

    setFilteredInvoices(filtered);
  };

  const handleSave = async () => {
    try {
      if (!formData.invoice_number || !formData.amount || !formData.issue_date) {
        showAlert('Preencha todos os campos obrigatórios', 'error');
        return;
      }

      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const invoiceData = {
        empresa_id: empresaId,
        invoice_number: formData.invoice_number,
        invoice_type: formData.invoice_type,
        supplier_id: formData.supplier_id || null,
        client_id: formData.client_id || null,
        cnpj: formData.cnpj || null,
        amount: Number(formData.amount),
        issue_date: formData.issue_date,
        due_date: formData.due_date || null,
        financial_document_id: formData.financial_document_id || null,
        notes: formData.notes || null,
        created_by: user?.id
      };

      if (editingInvoice) {
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', editingInvoice.id);

        if (error) throw error;
        showAlert('Nota fiscal atualizada com sucesso', 'success');
      } else {
        const { error } = await supabase
          .from('invoices')
          .insert(invoiceData);

        if (error) throw error;
        showAlert('Nota fiscal criada com sucesso', 'success');
      }

      setShowModal(false);
      setEditingInvoice(null);
      resetForm();
      loadInvoices();
    } catch (error: any) {
      showAlert('Erro ao salvar nota fiscal', 'error');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta nota fiscal?')) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      showAlert('Nota fiscal excluída com sucesso', 'success');
      loadInvoices();
    } catch (error: any) {
      showAlert('Erro ao excluir nota fiscal', 'error');
      console.error(error);
    }
  };

  const openModal = (invoice?: any) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        invoice_number: invoice.invoice_number,
        invoice_type: invoice.invoice_type,
        supplier_id: invoice.supplier_id || '',
        client_id: invoice.client_id || '',
        cnpj: invoice.cnpj || '',
        amount: String(invoice.amount),
        issue_date: invoice.issue_date,
        due_date: invoice.due_date || '',
        financial_document_id: invoice.financial_document_id || '',
        notes: invoice.notes || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      invoice_number: '',
      invoice_type: 'entrada',
      supplier_id: '',
      client_id: '',
      cnpj: '',
      amount: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date().toISOString().split('T')[0],
      financial_document_id: '',
      notes: ''
    });
    setEditingInvoice(null);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const calculateTotals = () => {
    const entradas = filteredInvoices
      .filter(inv => inv.invoice_type === 'entrada')
      .reduce((sum, inv) => sum + Number(inv.amount), 0);

    const saidas = filteredInvoices
      .filter(inv => inv.invoice_type === 'saida')
      .reduce((sum, inv) => sum + Number(inv.amount), 0);

    return { entradas, saidas, total: entradas + saidas };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Notas Fiscais</h2>
          <p className="text-gray-600 mt-1">Controle de notas fiscais da obra</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          Nova Nota Fiscal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-sm text-gray-600">Notas de Entrada</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totals.entradas)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600">Notas de Saída</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totals.saidas)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-500">
          <p className="text-sm text-gray-600">Total de Notas</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{filteredInvoices.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por número ou CNPJ..."
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
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>

          {(searchTerm || filterType !== 'todos') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('todos');
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
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Número</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Fornecedor/Cliente</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">CNPJ</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Emissão</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Valor</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Arquivos</th>
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
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    Nenhuma nota fiscal encontrada
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-semibold text-gray-700">{inv.invoice_number}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        inv.invoice_type === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {inv.invoice_type === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {inv.supplier?.nome_fantasia || inv.client?.nome_fantasia || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">{inv.cnpj || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {new Date(inv.issue_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-gray-800">
                      {formatCurrency(Number(inv.amount))}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center gap-1">
                        {inv.xml_file_url && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">XML</span>
                        )}
                        {inv.pdf_file_url && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">PDF</span>
                        )}
                        {!inv.xml_file_url && !inv.pdf_file_url && (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openModal(inv)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(inv.id)}
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
                {editingInvoice ? 'Editar Nota Fiscal' : 'Nova Nota Fiscal'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingInvoice(null);
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
                    Número da Nota <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.invoice_type}
                    onChange={(e) => setFormData({ ...formData, invoice_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.invoice_type === 'entrada' ? 'Fornecedor' : 'Cliente'}
                  </label>
                  <select
                    value={formData.invoice_type === 'entrada' ? formData.supplier_id : formData.client_id}
                    onChange={(e) => {
                      if (formData.invoice_type === 'entrada') {
                        setFormData({ ...formData, supplier_id: e.target.value });
                      } else {
                        setFormData({ ...formData, client_id: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {(formData.invoice_type === 'entrada' ? suppliers : clients).map(item => (
                      <option key={item.id} value={item.id}>{item.nome_fantasia}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Documento Financeiro Vinculado
                </label>
                <select
                  value={formData.financial_document_id}
                  onChange={(e) => setFormData({ ...formData, financial_document_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {documents.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.document_number ? `${doc.document_number} - ` : ''}{doc.description}
                    </option>
                  ))}
                </select>
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
                    Data de Emissão <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Informações adicionais..."
                />
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingInvoice(null);
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
                {editingInvoice ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
