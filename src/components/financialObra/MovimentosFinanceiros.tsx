import { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Search, X, Eye, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { getEmpresaContext } from '../../utils/empresaContext';

export function MovimentosFinanceiros({ workId }: { workId?: string }) {
  const [movements, setMovements] = useState<any[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { showAlert } = useAlert();

  useEffect(() => {
    loadMovements();
  }, [workId]);

  useEffect(() => {
    applyFilters();
  }, [movements, searchTerm, filterTipo, startDate, endDate]);

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
          work:works(nome),
          document:financial_documents(descricao, numero_documento),
          bank_account:financial_bank_accounts(banco, numero_conta)
        `)
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('data_movimento', { ascending: false });

      if (workId) {
        query = query.eq('work_id', workId);
      }

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
        (m.descricao && m.descricao.toLowerCase().includes(term)) ||
        (m.document?.descricao && m.document.descricao.toLowerCase().includes(term))
      );
    }

    if (filterTipo !== 'todos') {
      filtered = filtered.filter(m => m.tipo === filterTipo);
    }

    if (startDate) {
      filtered = filtered.filter(m => m.data_movimento >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(m => m.data_movimento <= endDate);
    }

    setFilteredMovements(filtered);
  };

  const calculateTotals = () => {
    const entradas = filteredMovements
      .filter(m => m.tipo === 'entrada')
      .reduce((sum, m) => sum + Number(m.valor), 0);

    const saidas = filteredMovements
      .filter(m => m.tipo === 'saida')
      .reduce((sum, m) => sum + Number(m.valor), 0);

    const saldo = entradas - saidas;

    return { entradas, saidas, saldo };
  };

  const downloadComprovante = async (path: string, descricao: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('financial-documents')
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = descricao;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      showAlert('Erro ao baixar comprovante', 'error');
      console.error(error);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Movimentos Financeiros</h2>
        <p className="text-gray-600 mt-1">Pagamentos e recebimentos realizados</p>
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
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os tipos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
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

          {(searchTerm || filterTipo !== 'todos' || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterTipo('todos');
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
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Documento</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Obra</th>
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
                      {new Date(mov.data_movimento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                        mov.tipo === 'entrada'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {mov.tipo === 'entrada' ? <ArrowUpCircle size={12} /> : <ArrowDownCircle size={12} />}
                        {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {mov.descricao || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {mov.document?.descricao || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">{mov.work?.nome || '-'}</td>
                    <td className={`py-3 px-4 text-sm text-right font-semibold ${
                      mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(Number(mov.valor))}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        {mov.comprovante_path && (
                          <button
                            onClick={() => downloadComprovante(mov.comprovante_path, mov.descricao)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Baixar comprovante"
                          >
                            <Download size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
