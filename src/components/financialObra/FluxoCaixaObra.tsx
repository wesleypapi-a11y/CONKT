import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { getEmpresaContext } from '../../utils/empresaContext';

export function FluxoCaixaObra({ workId }: { workId?: string }) {
  const [cashflowData, setCashflowData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { showAlert } = useAlert();

  useEffect(() => {
    loadCashflow();
  }, [workId, startDate, endDate]);

  const loadCashflow = async () => {
    try {
      setLoading(true);
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        setLoading(false);
        return;
      }

      let docsQuery = supabase
        .from('financial_documents')
        .select('*')
        .eq('empresa_id', empresaId)
        .is('deleted_at', null);

      let movsQuery = supabase
        .from('financial_movements')
        .select('*')
        .eq('empresa_id', empresaId)
        .is('deleted_at', null);

      if (workId) {
        docsQuery = docsQuery.eq('work_id', workId);
        movsQuery = movsQuery.eq('work_id', workId);
      }

      if (startDate) {
        docsQuery = docsQuery.gte('due_date', startDate);
        movsQuery = movsQuery.gte('movement_date', startDate);
      }

      if (endDate) {
        docsQuery = docsQuery.lte('due_date', endDate);
        movsQuery = movsQuery.lte('movement_date', endDate);
      }

      const [docsRes, movsRes] = await Promise.all([
        docsQuery,
        movsQuery
      ]);

      if (docsRes.error) throw docsRes.error;
      if (movsRes.error) throw movsRes.error;

      const docs = docsRes.data || [];
      const movs = movsRes.data || [];

      const combined: any[] = [];

      docs.forEach(doc => {
        combined.push({
          data: doc.due_date,
          tipo: doc.transaction_type === 'receita' ? 'entrada' : 'saida',
          valor: Number(doc.amount),
          descricao: doc.description || doc.document_number,
          realizado: doc.status === 'pago',
          origem: 'documento'
        });
      });

      movs.forEach(mov => {
        combined.push({
          data: mov.movement_date,
          tipo: mov.movement_type === 'entrada' ? 'entrada' : 'saida',
          valor: Number(mov.amount),
          descricao: mov.description,
          realizado: true,
          origem: 'movimento'
        });
      });

      combined.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

      let saldoAcumulado = 0;
      const cashflow = combined.map(item => {
        if (item.realizado) {
          saldoAcumulado += item.tipo === 'entrada' ? item.valor : -item.valor;
        }
        return {
          ...item,
          saldoAcumulado
        };
      });

      setCashflowData(cashflow);
    } catch (error: any) {
      showAlert('Erro ao carregar fluxo de caixa', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = () => {
    const previstoEntradas = cashflowData
      .filter(item => !item.realizado && item.tipo === 'entrada')
      .reduce((sum, item) => sum + item.valor, 0);

    const previstoSaidas = cashflowData
      .filter(item => !item.realizado && item.tipo === 'saida')
      .reduce((sum, item) => sum + item.valor, 0);

    const realizadoEntradas = cashflowData
      .filter(item => item.realizado && item.tipo === 'entrada')
      .reduce((sum, item) => sum + item.valor, 0);

    const realizadoSaidas = cashflowData
      .filter(item => item.realizado && item.tipo === 'saida')
      .reduce((sum, item) => sum + item.valor, 0);

    const saldoAtual = realizadoEntradas - realizadoSaidas;
    const resultadoProjetado = (realizadoEntradas + previstoEntradas) - (realizadoSaidas + previstoSaidas);

    return {
      saldoAtual,
      previstoEntradas,
      previstoSaidas,
      resultadoProjetado
    };
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const summary = calculateSummary();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Fluxo de Caixa da Obra</h2>
        <p className="text-gray-600 mt-1">Comparação entre previsto e realizado</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Saldo Atual</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(summary.saldoAtual)}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Receitas Previstas</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(summary.previstoEntradas)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Despesas Previstas</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(summary.previstoSaidas)}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <TrendingDown className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${summary.resultadoProjetado >= 0 ? 'border-green-500' : 'border-orange-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Resultado Projetado</p>
              <p className={`text-2xl font-bold mt-1 ${summary.resultadoProjetado >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {formatCurrency(summary.resultadoProjetado)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 self-end"
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
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Descrição</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Entradas</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Saídas</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Saldo</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : cashflowData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Nenhum lançamento financeiro encontrado
                  </td>
                </tr>
              ) : (
                cashflowData.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {new Date(item.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">{item.descricao}</td>
                    <td className="py-3 px-4 text-sm text-right text-green-600 font-semibold">
                      {item.tipo === 'entrada' ? formatCurrency(item.valor) : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-red-600 font-semibold">
                      {item.tipo === 'saida' ? formatCurrency(item.valor) : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-800 font-bold">
                      {formatCurrency(item.saldoAcumulado)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        item.realizado ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.realizado ? 'Realizado' : 'Previsto'}
                      </span>
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
