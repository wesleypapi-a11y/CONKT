import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, PlusCircle, MinusCircle, ArrowLeftRight, Download, Filter, Search, X, CreditCard as Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { getEmpresaContext } from '../../utils/empresaContext';

interface CashflowEntry {
  id: string;
  tipo: 'entrada' | 'saida';
  categoria: string;
  descricao: string;
  valor: number;
  data_lancamento: string;
  forma_pagamento: string;
  observacoes?: string;
  status: 'previsto' | 'realizado' | 'vencido';
  created_at: string;
}

interface EntryModalData {
  tipo: 'entrada' | 'saida';
  categoria: string;
  descricao: string;
  valor: string;
  data_lancamento: string;
  forma_pagamento: string;
  observacoes: string;
  status: 'previsto' | 'realizado' | 'vencido';
}

const CATEGORIAS_ENTRADA = [
  'Recebimento de Clientes',
  'Aporte',
  'Outros Recebimentos'
];

const CATEGORIAS_SAIDA = [
  'Salários',
  'Pró-labore',
  'Fornecedores',
  'Impostos',
  'Aluguel',
  'Ferramentas / Softwares',
  'Combustível',
  'Alimentação',
  'Marketing',
  'Outros Custos'
];

const FORMAS_PAGAMENTO = [
  'Dinheiro',
  'PIX',
  'Transferência',
  'Débito',
  'Crédito',
  'Boleto',
  'Cheque'
];

export function CompanyCashflow() {
  const [entries, setEntries] = useState<CashflowEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<CashflowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CashflowEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [formData, setFormData] = useState<EntryModalData>({
    tipo: 'entrada',
    categoria: '',
    descricao: '',
    valor: '',
    data_lancamento: new Date().toISOString().split('T')[0],
    forma_pagamento: 'PIX',
    observacoes: '',
    status: 'realizado'
  });

  const { showAlert } = useAlert();

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [entries, searchTerm, filterTipo, filterStatus, filterCategoria, startDate, endDate]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const { empresaId } = await getEmpresaContext();

      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('company_cashflow_entries')
        .select('*')
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('data_lancamento', { ascending: false });

      if (error) throw error;

      setEntries(data || []);
    } catch (error: any) {
      showAlert('Erro ao carregar lançamentos', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...entries];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.descricao.toLowerCase().includes(term) ||
        e.categoria.toLowerCase().includes(term)
      );
    }

    if (filterTipo !== 'todos') {
      filtered = filtered.filter(e => e.tipo === filterTipo);
    }

    if (filterStatus !== 'todos') {
      filtered = filtered.filter(e => e.status === filterStatus);
    }

    if (filterCategoria !== 'todas') {
      filtered = filtered.filter(e => e.categoria === filterCategoria);
    }

    if (startDate) {
      filtered = filtered.filter(e => e.data_lancamento >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(e => e.data_lancamento <= endDate);
    }

    setFilteredEntries(filtered);
  };

  const calculateStats = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthEntries = entries.filter(e => {
      const date = new Date(e.data_lancamento);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const entradas = currentMonthEntries
      .filter(e => e.tipo === 'entrada' && e.status === 'realizado')
      .reduce((sum, e) => sum + Number(e.valor), 0);

    const saidas = currentMonthEntries
      .filter(e => e.tipo === 'saida' && e.status === 'realizado')
      .reduce((sum, e) => sum + Number(e.valor), 0);

    const aReceber = entries
      .filter(e => e.tipo === 'entrada' && e.status === 'previsto')
      .reduce((sum, e) => sum + Number(e.valor), 0);

    const aPagar = entries
      .filter(e => e.tipo === 'saida' && e.status === 'previsto')
      .reduce((sum, e) => sum + Number(e.valor), 0);

    const saldoAtual = entries
      .filter(e => e.status === 'realizado')
      .reduce((sum, e) => {
        return e.tipo === 'entrada' ? sum + Number(e.valor) : sum - Number(e.valor);
      }, 0);

    const resultado = entradas - saidas;

    return {
      saldoAtual,
      entradas,
      saidas,
      resultado,
      aReceber,
      aPagar
    };
  };

  const handleSave = async () => {
    try {
      if (!formData.categoria || !formData.descricao || !formData.valor) {
        showAlert('Preencha todos os campos obrigatórios', 'error');
        return;
      }

      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const entryData = {
        empresa_id: empresaId,
        tipo: formData.tipo,
        categoria: formData.categoria,
        descricao: formData.descricao,
        valor: Number(formData.valor),
        data_lancamento: formData.data_lancamento,
        forma_pagamento: formData.forma_pagamento,
        observacoes: formData.observacoes || null,
        status: formData.status,
        created_by: user?.id
      };

      if (editingEntry) {
        const { error } = await supabase
          .from('company_cashflow_entries')
          .update(entryData)
          .eq('id', editingEntry.id);

        if (error) throw error;
        showAlert('Lançamento atualizado com sucesso', 'success');
      } else {
        const { error } = await supabase
          .from('company_cashflow_entries')
          .insert(entryData);

        if (error) throw error;
        showAlert('Lançamento criado com sucesso', 'success');
      }

      setShowModal(false);
      setEditingEntry(null);
      resetForm();
      loadEntries();
    } catch (error: any) {
      showAlert('Erro ao salvar lançamento', 'error');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este lançamento?')) return;

    try {
      const { error } = await supabase
        .from('company_cashflow_entries')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      showAlert('Lançamento excluído com sucesso', 'success');
      loadEntries();
    } catch (error: any) {
      showAlert('Erro ao excluir lançamento', 'error');
      console.error(error);
    }
  };

  const openModal = (tipo: 'entrada' | 'saida', entry?: CashflowEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        tipo: entry.tipo,
        categoria: entry.categoria,
        descricao: entry.descricao,
        valor: String(entry.valor),
        data_lancamento: entry.data_lancamento,
        forma_pagamento: entry.forma_pagamento,
        observacoes: entry.observacoes || '',
        status: entry.status
      });
    } else {
      resetForm();
      setFormData(prev => ({ ...prev, tipo }));
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      tipo: 'entrada',
      categoria: '',
      descricao: '',
      valor: '',
      data_lancamento: new Date().toISOString().split('T')[0],
      forma_pagamento: 'PIX',
      observacoes: '',
      status: 'realizado'
    });
    setEditingEntry(null);
  };

  const stats = calculateStats();

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterTipo('todos');
    setFilterStatus('todos');
    setFilterCategoria('todas');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Fluxo de Caixa</h2>
          <p className="text-gray-600 mt-1">Controle financeiro da empresa</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openModal('entrada')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <PlusCircle size={18} />
            Nova Entrada
          </button>
          <button
            onClick={() => openModal('saida')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <MinusCircle size={18} />
            Nova Saída
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Saldo Atual</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(stats.saldoAtual)}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Entradas do Mês</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(stats.entradas)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Saídas do Mês</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(stats.saidas)}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <TrendingDown className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${stats.resultado >= 0 ? 'border-green-500' : 'border-red-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Resultado do Mês</p>
              <p className={`text-2xl font-bold mt-1 ${stats.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.resultado)}
              </p>
            </div>
            <div className={`${stats.resultado >= 0 ? 'bg-green-100' : 'bg-red-100'} p-3 rounded-lg`}>
              <ArrowLeftRight className={`${stats.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`} size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Contas a Receber</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{formatCurrency(stats.aReceber)}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <TrendingUp className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Contas a Pagar</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(stats.aPagar)}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <TrendingDown className="text-orange-600" size={24} />
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
                placeholder="Buscar por descrição ou categoria..."
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
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os status</option>
            <option value="realizado">Realizado</option>
            <option value="previsto">Previsto</option>
            <option value="vencido">Vencido</option>
          </select>

          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="todas">Todas as categorias</option>
            <optgroup label="Entradas">
              {CATEGORIAS_ENTRADA.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </optgroup>
            <optgroup label="Saídas">
              {CATEGORIAS_SAIDA.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </optgroup>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          {(searchTerm || filterTipo !== 'todos' || filterStatus !== 'todos' || filterCategoria !== 'todas' || startDate || endDate) && (
            <button
              onClick={clearFilters}
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
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Categoria</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Descrição</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Valor</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
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
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Nenhum lançamento encontrado
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {new Date(entry.data_lancamento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                        entry.tipo === 'entrada'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {entry.tipo === 'entrada' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {entry.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">{entry.categoria}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{entry.descricao}</td>
                    <td className={`py-3 px-4 text-sm text-right font-semibold ${
                      entry.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(Number(entry.valor))}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        entry.status === 'realizado'
                          ? 'bg-blue-100 text-blue-800'
                          : entry.status === 'previsto'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {entry.status === 'realizado' ? 'Realizado' : entry.status === 'previsto' ? 'Previsto' : 'Vencido'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openModal(entry.tipo, entry)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
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
                {editingEntry ? 'Editar Lançamento' : `Nova ${formData.tipo === 'entrada' ? 'Entrada' : 'Saída'}`}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingEntry(null);
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
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'entrada' | 'saida', categoria: '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={!!editingEntry}
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {(formData.tipo === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
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
                  placeholder="Ex: Pagamento ref. Janeiro/2026"
                />
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
                    Data <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.data_lancamento}
                    onChange={(e) => setFormData({ ...formData, data_lancamento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="realizado">Realizado</option>
                    <option value="previsto">Previsto</option>
                    <option value="vencido">Vencido</option>
                  </select>
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
                  setEditingEntry(null);
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
                {editingEntry ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
