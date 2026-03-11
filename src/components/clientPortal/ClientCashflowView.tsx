import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';

interface CashflowEntry {
  id: string;
  date: string;
  description: string;
  value: number;
  type: 'receita' | 'despesa';
  status: string;
}

interface ClientCashflowViewProps {
  workId: string;
}

export default function ClientCashflowView({ workId }: ClientCashflowViewProps) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<CashflowEntry[]>([]);
  const [stats, setStats] = useState({
    totalReceitas: 0,
    totalDespesas: 0,
    saldo: 0,
    receitasCount: 0,
    despesasCount: 0
  });
  const [filterMonth, setFilterMonth] = useState<string>('');

  useEffect(() => {
    loadCashflowData();
  }, [workId]);

  const loadCashflowData = async () => {
    setLoading(true);
    try {
      const entries: CashflowEntry[] = [];

      const { data: installmentsData } = await supabase
        .from('contract_installments')
        .select(`
          *,
          contracts!inner(work_id)
        `)
        .eq('contracts.work_id', workId)
        .is('deleted_at', null);

      installmentsData?.forEach((inst: any) => {
        entries.push({
          id: inst.id,
          date: inst.due_date,
          description: `Parcela de Contrato ${inst.installment_number}`,
          value: inst.value,
          type: 'receita',
          status: inst.status
        });
      });

      const { data: purchaseOrdersData } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('work_id', workId)
        .is('deleted_at', null);

      purchaseOrdersData?.forEach((order: any) => {
        entries.push({
          id: order.id,
          date: order.created_at,
          description: `Pedido de Compra - ${order.order_number}`,
          value: order.total_value,
          type: 'despesa',
          status: order.status
        });
      });

      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEntries(entries);

      const totalReceitas = entries
        .filter(e => e.type === 'receita')
        .reduce((sum, e) => sum + e.value, 0);

      const totalDespesas = entries
        .filter(e => e.type === 'despesa')
        .reduce((sum, e) => sum + e.value, 0);

      setStats({
        totalReceitas,
        totalDespesas,
        saldo: totalReceitas - totalDespesas,
        receitasCount: entries.filter(e => e.type === 'receita').length,
        despesasCount: entries.filter(e => e.type === 'despesa').length
      });
    } catch (error) {
      console.error('Erro ao carregar fluxo de caixa:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = filterMonth
    ? entries.filter(entry => entry.date.startsWith(filterMonth))
    : entries;

  const months = Array.from(new Set(entries.map(e => e.date.substring(0, 7)))).sort().reverse();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Carregando fluxo de caixa...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Nenhuma movimentação financeira disponível para esta obra.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total de Receitas</h3>
            <div className="p-2 rounded-lg bg-green-100">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {stats.totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-xs text-gray-500 mt-1">{stats.receitasCount} lançamentos</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total de Despesas</h3>
            <div className="p-2 rounded-lg bg-red-100">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {stats.totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-xs text-gray-500 mt-1">{stats.despesasCount} lançamentos</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Saldo</h3>
            <div className={`p-2 rounded-lg ${stats.saldo >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
              <DollarSign className={`w-5 h-5 ${stats.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${stats.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            {stats.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-xs text-gray-500 mt-1">Receitas - Despesas</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Filtrar por mês</h3>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os meses</option>
            {months.map(month => (
              <option key={month} value={month}>
                {new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Movimentações Financeiras</h2>
          <p className="text-sm text-gray-600 mt-1">Histórico de receitas e despesas da obra</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Descrição</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Valor</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Nenhuma movimentação encontrada para o filtro selecionado
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {new Date(entry.date).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-800">{entry.description}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {entry.type === 'receita' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <TrendingUp className="w-3 h-3" />
                          Receita
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          <TrendingDown className="w-3 h-3" />
                          Despesa
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-semibold ${entry.type === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.type === 'receita' ? '+' : '-'} {entry.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        entry.status === 'pago' || entry.status === 'recebido'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {entry.status === 'pago' || entry.status === 'recebido' ? 'Quitado' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> O fluxo de caixa apresenta uma visão simplificada das movimentações financeiras da obra, incluindo parcelas de contratos (receitas) e pedidos de compra (despesas).
        </p>
      </div>
    </div>
  );
}
