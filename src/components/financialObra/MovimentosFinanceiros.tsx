import { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Search, X, Plus, CreditCard as Edit, Trash2, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { getEmpresaContext } from '../../utils/empresaContext';

interface MovementModalData {
  movement_type: 'entrada' | 'saida' | 'transferencia';
  bank_account_id: string;
  destination_bank_account_id: string;
  financial_document_id: string;
  amount: string;
  movement_date: string;
  description: string;
  notes: string;
}

export function MovimentosFinanceiros({ workId }: { workId?: string }) {
  const [movements, setMovements] = useState<any[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMov, setEditingMov] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  const [formData, setFormData] = useState<MovementModalData>({
    movement_type: 'saida',
    bank_account_id: '',
    destination_bank_account_id: '',
    financial_document_id: '',
    amount: '',
    movement_date: new Date().toISOString().split('T')[0],
    description: '',
    notes: ''
  });

  const { showAlert } = useAlert();

  useEffect(() => {
    loadMovements();
    loadReferences();
  }, [workId]);

  useEffect(() => {
    applyFilters();
  }, [movements, searchTerm, filterType, startDate, endDate]);

  const loadReferences = async () => {
    try {
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) return;

      const [accountsRes, docsRes] = await Promise.all([
        supabase.from('bank_accounts').select('id, name, bank_name').eq('empresa_id', empresaId).is('deleted_at', null),
        supabase.from('financial_documents').select('id, description, document_number').eq('empresa_id', empresaId).is('deleted_at', null)
      ]);

      setBankAccounts(accountsRes.data || []);
      setDocuments(docsRes.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar referências:', error);
    }
  };

  const loadMovements = async () => {
    try {
      setLoading(true);
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        setLoading(false);
        return;
      }

      let query = supabase
        .from('financial_movements')
        .select(`
          *,
          bank_account:bank_accounts!financial_movements_bank_account_id_fkey(name, bank_name),
          destination_bank_account:bank_accounts!financial_movements_destination_bank_account_id_fkey(name),
          financial_document:financial_documents(description, document_number)
        `)
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('movement_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      setMovements(data || []);
    } catch (error: any) {
      showAlert('Erro ao carregar movimentos', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...movements];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.description?.toLowerCase().includes(term) ||
        m.financial_document?.description?.toLowerCase().includes(term)
      );
    }

    if (filterType !== 'todos') {
      filtered = filtered.filter(m => m.movement_type === filterType);
    }

    if (startDate) {
      filtered = filtered.filter(m => m.movement_date >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(m => m.movement_date <= endDate);
    }

    setFilteredMovements(filtered);
  };

  const calculateTotals = () => {
    const entradas = filteredMovements
      .filter(m => m.movement_type === 'entrada')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const saidas = filteredMovements
      .filter(m => m.movement_type === 'saida')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const saldo = entradas - saidas;

    return { entradas, saidas, saldo };
  };

  const handleSave = async () => {
    try {
      if (!formData.amount || !formData.movement_date) {
        showAlert('Preencha todos os campos obrigatórios', 'error');
        return;
      }

      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const movData = {
        empresa_id: empresaId,
        movement_type: formData.movement_type,
        bank_account_id: formData.bank_account_id || null,
        destination_bank_account_id: formData.destination_bank_account_id || null,
        financial_document_id: formData.financial_document_id || null,
        amount: Number(formData.amount),
        movement_date: formData.movement_date,
        description: formData.description || null,
        notes: formData.notes || null,
        created_by: user?.id
      };

      if (editingMov) {
        const { error } = await supabase
          .from('financial_movements')
          .update(movData)
          .eq('id', editingMov.id);

        if (error) throw error;
        showAlert('Movimento atualizado com sucesso', 'success');
      } else {
        const { error } = await supabase
          .from('financial_movements')
          .insert(movData);

        if (error) throw error;
        showAlert('Movimento criado com sucesso', 'success');
      }

      setShowModal(false);
      setEditingMov(null);
      resetForm();
      loadMovements();
    } catch (error: any) {
      showAlert('Erro ao salvar movimento', 'error');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este movimento?')) return;

    try {
      const { error } = await supabase
        .from('financial_movements')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      showAlert('Movimento excluído com sucesso', 'success');
      loadMovements();
    } catch (error: any) {
      showAlert('Erro ao excluir movimento', 'error');
      console.error(error);
    }
  };

  const openModal = (mov?: any) => {
    if (mov) {
      setEditingMov(mov);
      setFormData({
        movement_type: mov.movement_type,
        bank_account_id: mov.bank_account_id || '',
        destination_bank_account_id: mov.destination_bank_account_id || '',
        financial_document_id: mov.financial_document_id || '',
        amount: String(mov.amount),
        movement_date: mov.movement_date,
        description: mov.description || '',
        notes: mov.notes || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      movement_type: 'saida',
      bank_account_id: '',
      destination_bank_account_id: '',
      financial_document_id: '',
      amount: '',
      movement_date: new Date().toISOString().split('T')[0],
      description: '',
      notes: ''
    });
    setEditingMov(null);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Movimentos Financeiros</h2>
          <p className="text-gray-600 mt-1">Pagamentos e recebimentos realizados</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          Novo Movimento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Recebido</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totals.entradas)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <ArrowUpCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pago</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totals.saidas)}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <ArrowDownCircle className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${totals.saldo >= 0 ? 'border-blue-500' : 'border-orange-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Saldo do Período</p>
              <p className={`text-2xl font-bold mt-1 ${totals.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {formatCurrency(totals.saldo)}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${totals.saldo >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
              <DollarSign className={totals.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'} size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por descrição..."
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
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
            <option value="transferencia">Transferências</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Data inicial"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Data final"
          />

          {(searchTerm || filterType !== 'todos' || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('todos');
                setStartDate('');
                setEndDate('');
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
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Data</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Descrição</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Conta Bancária</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Documento</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Valor</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Nenhum movimento encontrado
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => (
                  <tr key={mov.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {new Date(mov.movement_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                        mov.movement_type === 'entrada'
                          ? 'bg-green-100 text-green-800'
                          : mov.movement_type === 'saida'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {mov.movement_type === 'entrada' && <ArrowUpCircle size={12} />}
                        {mov.movement_type === 'saida' && <ArrowDownCircle size={12} />}
                        {mov.movement_type === 'entrada' ? 'Entrada' : mov.movement_type === 'saida' ? 'Saída' : 'Transferência'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {mov.description || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {mov.bank_account?.name || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {mov.financial_document?.description || '-'}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-semibold ${
                      mov.movement_type === 'entrada' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(Number(mov.amount))}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openModal(mov)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(mov.id)}
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                {editingMov ? 'Editar Movimento' : 'Novo Movimento'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingMov(null);
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
                    Tipo de Movimento <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.movement_type}
                    onChange={(e) => setFormData({ ...formData, movement_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                    <option value="transferencia">Transferência</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.movement_date}
                    onChange={(e) => setFormData({ ...formData, movement_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conta Bancária de Origem
                </label>
                <select
                  value={formData.bank_account_id}
                  onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.bank_name} - {acc.name}</option>
                  ))}
                </select>
              </div>

              {formData.movement_type === 'transferencia' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conta Bancária de Destino <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.destination_bank_account_id}
                    onChange={(e) => setFormData({ ...formData, destination_bank_account_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {bankAccounts.filter(acc => acc.id !== formData.bank_account_id).map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.bank_name} - {acc.name}</option>
                    ))}
                  </select>
                </div>
              )}

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
                  Descrição
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Pagamento de fornecedor X"
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
                  setEditingMov(null);
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
                {editingMov ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
