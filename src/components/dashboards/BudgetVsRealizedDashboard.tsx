import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface BudgetData {
  phase_id: string;
  phase_name: string;
  budgeted: number;
  realized: number;
  balance: number;
}

interface Props {
  workId: string;
  dateRange: { start: string; end: string };
}

export default function BudgetVsRealizedDashboard({ workId, dateRange }: Props) {
  const [data, setData] = useState<BudgetData[]>([]);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState({
    budgeted: 0,
    realized: 0,
    balance: 0,
    percentage: 0
  });

  useEffect(() => {
    if (workId) {
      loadData();
    }
  }, [workId, dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('id')
        .eq('work_id', workId)
        .maybeSingle();

      if (budgetError) throw budgetError;
      if (!budgetData) {
        setData([]);
        setTotals({ budgeted: 0, realized: 0, balance: 0, percentage: 0 });
        return;
      }

      const budgetId = budgetData.id;

      const { data: itemsData, error: itemsError } = await supabase
        .from('budget_items')
        .select('*')
        .eq('budget_id', budgetId)
        .eq('tipo', 'macro')
        .is('parent_id', null)
        .order('ordem', { ascending: true });

      if (itemsError) throw itemsError;

      const { data: realizedData, error: realizedError } = await supabase
        .from('budget_realized')
        .select('phase_id, amount')
        .eq('budget_id', budgetId)
        .is('deleted_at', null);

      if (realizedError) throw realizedError;

      const realizedByPhase = (realizedData || []).reduce((acc, item) => {
        acc[item.phase_id] = (acc[item.phase_id] || 0) + item.amount;
        return acc;
      }, {} as Record<string, number>);

      const phaseData: BudgetData[] = (itemsData || []).map(item => {
        const budgeted = item.valor_total || 0;
        const realized = realizedByPhase[item.id] || 0;
        const balance = budgeted - realized;

        return {
          phase_id: item.id,
          phase_name: item.descricao,
          budgeted,
          realized,
          balance
        };
      });

      const totalBudgeted = phaseData.reduce((sum, p) => sum + p.budgeted, 0);
      const totalRealized = phaseData.reduce((sum, p) => sum + p.realized, 0);
      const totalBalance = totalBudgeted - totalRealized;
      const percentage = totalBudgeted > 0 ? (totalRealized / totalBudgeted) * 100 : 0;

      setData(phaseData);
      setTotals({
        budgeted: totalBudgeted,
        realized: totalRealized,
        balance: totalBalance,
        percentage
      });
    } catch (error) {
      console.error('Error loading budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxValue = Math.max(...data.map(d => Math.max(d.budgeted, d.realized)), 1);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-blue-600" />
        Orçado vs Realizado por Fase
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium mb-1">Orçado Total</p>
          <p className="text-2xl font-bold text-blue-900">
            R$ {totals.budgeted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium mb-1">Realizado Total</p>
          <p className="text-2xl font-bold text-green-900">
            R$ {totals.realized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className={`border rounded-lg p-4 ${totals.balance >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-sm font-medium mb-1 ${totals.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Saldo Total
          </p>
          <p className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-green-900' : 'text-red-900'}`}>
            R$ {totals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-medium mb-1">% Realizado</p>
          <p className="text-2xl font-bold text-purple-900">
            {totals.percentage.toFixed(1)}%
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Carregando dados...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p>Nenhum dado de orçamento disponível para esta obra</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((item) => (
            <div key={item.phase_id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{item.phase_name}</h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600">
                    Saldo: <span className={`font-bold ${item.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {item.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-24">Orçado:</span>
                  <div className="flex-1 h-8 bg-gray-100 rounded-md overflow-hidden relative">
                    <div
                      className="h-full bg-blue-500 flex items-center justify-end px-3 text-white text-sm font-medium"
                      style={{ width: `${(item.budgeted / maxValue) * 100}%` }}
                    >
                      {item.budgeted > 0 && `R$ ${item.budgeted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-24">Realizado:</span>
                  <div className="flex-1 h-8 bg-gray-100 rounded-md overflow-hidden relative">
                    <div
                      className="h-full bg-green-500 flex items-center justify-end px-3 text-white text-sm font-medium"
                      style={{ width: `${(item.realized / maxValue) * 100}%` }}
                    >
                      {item.realized > 0 && `R$ ${item.realized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-2 text-sm text-gray-500 text-right">
                {item.budgeted > 0 ? ((item.realized / item.budgeted) * 100).toFixed(1) : 0}% realizado
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
