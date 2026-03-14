import { useState, useEffect } from 'react';
import { FileText, Plus, Search, X, CreditCard as Edit, Trash2, Download, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { getEmpresaContext } from '../../utils/empresaContext';

interface InvoiceModalData {
  numero_nota: string;
  work_id: string;
  fornecedor_id: string;
  cliente_id: string;
  document_id: string;
  cnpj: string;
  tipo: 'entrada' | 'saida';
  valor: string;
  data_emissao: string;
  chave_acesso: string;
  observacoes: string;
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
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [works, setWorks] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  const [formData, setFormData] = useState<InvoiceModalData>({
    numero_nota: '',
    work_id: workId || '',
    fornecedor_id: '',
    cliente_id: '',
    document_id: '',
    cnpj: '',
    tipo: 'entrada',
    valor: '',
    data_emissao: new Date().toISOString().split('T')[0],
    chave_acesso: '',
    observacoes: ''
  });

  const { showAlert } = useAlert();

  useEffect(() => {
    loadInvoices();
    loadReferences();
  }, [workId]);

  useEffect(() => {
    applyFilters();
  }, [invoices, searchTerm, filterTipo]);

  const loadReferences = async () => {
    try {
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) return;

      const [worksRes, suppliersRes, clientsRes, docsRes] = await Promise.all([
        supabase.from('works').select('id, nome').eq('empresa_id', empresaId).is('deleted_at', null),
        supabase.from('suppliers').select('id, nome_fantasia').eq('empresa_id', empresaId).is('deleted_at', null),
        supabase.from('clients').select('id, nome_fantasia').eq('empresa_id', empresaId).is('deleted_at', null),
        supabase.from('financial_documents').select('id, descricao, numero_documento').eq('empresa_id', empresaId).is('deleted_at', null)
      ]);

      setWorks(worksRes.data || []);
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

      let query = supabase
        .from('financial_invoices')
        .select(`
          *,
          work:works(nome),
          fornecedor:suppliers(nome_fantasia),
          cliente:clients(nome_fantasia),
          document:financial_documents(descricao, numero_documento)
        `)
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('data_emissao', { ascending: false });

      if (workId) {
        query = query.eq('work_id', workId);
      }

      const { data, error } = await query;

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
        inv.numero_nota.toLowerCase().includes(term) ||
        (inv.chave_acesso && inv.chave_acesso.toLowerCase().includes(term))
      );
    }

    if (filterTipo !== 'todos') {
      filtered = filtered.filter(inv => inv.tipo === filterTipo);
    }

    setFilteredInvoices(filtered);
  };

  const handleSave = async () => {
    try {
      if (!formData.numero_nota || !formData.valor || !formData.data_emissao) {
        showAlert('Preencha todos os campos obrigatórios', 'error');
        return;
      }

      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      let xmlPath = null;
      let pdfPath = null;

      if (formData.xmlFile) {
        const timestamp = Date.now();
        const fileName = `${empresaId}/${timestamp}_${formData.xmlFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('financial-invoices')
          .upload(fileName, formData.xmlFile);

        if (uploadError) throw uploadError;
        xmlPath = fileName;
      }

      if (formData.pdfFile) {
        const timestamp = Date.now();
        const fileName = `${empresaId}/${timestamp}_${formData.pdfFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('financial-invoices')
          .upload(fileName, formData.pdfFile);

        if (uploadError) throw uploadError;
        pdfPath = fileName;
      }

      const invoiceData = {
        empresa_id: empresaId,
        work_id: formData.work_id || null,
        document_id: formData.document_id || null,
        numero_nota: formData.numero_nota,
        fornecedor_id: formData.fornecedor_id || null,
        cliente_id: formData.cliente_id || null,
        cnpj: formData.cnpj || null,
        tipo: formData.tipo,
        valor: Number(formData.valor),
        data_emissao: formData.data_emissao,
        chave_acesso: formData.chave_acesso || null,
        observacoes: formData.observacoes || null,
        xml_path: xmlPath || (editingInvoice?.xml_path || null),
        pdf_path: pdfPath || (editingInvoice?.pdf_path || null),
        created_by: user?.id
      };

      if (editingInvoice) {
        const { error } = await supabase
          .from('financial_invoices')
          .update(invoiceData)
          .eq('id', editingInvoice.id);

        if (error) throw error;
        showAlert('Nota fiscal atualizada com sucesso', 'success');
      } else {
        const { error } = await supabase
          .from('financial_invoices')
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
        .from('financial_invoices')
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

  const downloadFile = async (path: string, nome: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('financial-invoices')
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      showAlert('Erro ao baixar arquivo', 'error');
      console.error(error);
    }
  };

  const openModal = (invoice?: any) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        numero_nota: invoice.numero_nota,
        work_id: invoice.work_id || '',
        fornecedor_id: invoice.fornecedor_id || '',
        cliente_id: invoice.cliente_id || '',
        document_id: invoice.document_id || '',
        cnpj: invoice.cnpj || '',
        tipo: invoice.tipo,
        valor: String(invoice.valor),
        data_emissao: invoice.data_emissao,
        chave_acesso: invoice.chave_acesso || '',
        observacoes: invoice.observacoes || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      numero_nota: '',
      work_id: workId || '',
      fornecedor_id: '',
      cliente_id: '',
      document_id: '',
      cnpj: '',
      tipo: 'entrada',
      valor: '',
      data_emissao: new Date().toISOString().split('T')[0],
      chave_acesso: '',
      observacoes: ''
    });
    setEditingInvoice(null);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

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

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por número ou chave de acesso..."
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
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>

          {(searchTerm || filterTipo !== 'todos') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterTipo('todos');
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
                    <td className="py-3 px-4 text-sm font-semibold text-gray-700">{inv.numero_nota}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        inv.tipo === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {inv.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {inv.fornecedor?.nome_fantasia || inv.cliente?.nome_fantasia || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">{inv.cnpj || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {new Date(inv.data_emissao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-gray-800">
                      {formatCurrency(Number(inv.valor))}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center gap-1">
                        {inv.xml_path && (
                          <button
                            onClick={() => downloadFile(inv.xml_path, `${inv.numero_nota}.xml`)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Baixar XML"
                          >
                            <Download size={14} />
                          </button>
                        )}
                        {inv.pdf_path && (
                          <button
                            onClick={() => downloadFile(inv.pdf_path, `${inv.numero_nota}.pdf`)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Baixar PDF"
                          >
                            <FileText size={14} />
                          </button>
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
                    value={formData.numero_nota}
                    onChange={(e) => setFormData({ ...formData, numero_nota: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
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
                    Documento Financeiro
                  </label>
                  <select
                    value={formData.document_id}
                    onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {documents.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.numero_documento} - {doc.descricao}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.tipo === 'entrada' ? 'Cliente' : 'Fornecedor'}
                  </label>
                  <select
                    value={formData.tipo === 'entrada' ? formData.cliente_id : formData.fornecedor_id}
                    onChange={(e) => {
                      if (formData.tipo === 'entrada') {
                        setFormData({ ...formData, cliente_id: e.target.value });
                      } else {
                        setFormData({ ...formData, fornecedor_id: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {(formData.tipo === 'entrada' ? clients : suppliers).map(item => (
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chave de Acesso
                </label>
                <input
                  type="text"
                  value={formData.chave_acesso}
                  onChange={(e) => setFormData({ ...formData, chave_acesso: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 12345678901234567890123456789012345678901234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Informações adicionais..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Arquivo XML
                  </label>
                  <input
                    type="file"
                    accept=".xml"
                    onChange={(e) => setFormData({ ...formData, xmlFile: e.target.files?.[0] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {editingInvoice?.xml_path && !formData.xmlFile && (
                    <p className="text-xs text-gray-500 mt-1">XML já cadastrado</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Arquivo PDF
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFormData({ ...formData, pdfFile: e.target.files?.[0] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {editingInvoice?.pdf_path && !formData.pdfFile && (
                    <p className="text-xs text-gray-500 mt-1">PDF já cadastrado</p>
                  )}
                </div>
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
