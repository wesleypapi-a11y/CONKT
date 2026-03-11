import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MonthlyFlow {
  month: string;
  paid: number;
  scheduled: number;
}

interface Props {
  workId: string;
}

export default function CashFlowDashboard({ workId }: Props) {
  const [data, setData] = useState<MonthlyFlow[]>([]);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState({ paid: 0, scheduled: 0 });

  useEffect(() => {
    if (workId) {
      loadData();
    }
  }, [workId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6);

      const { data: orders, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('paid_date, total_value, status')
        .eq('work_id', workId)
        .is('deleted_at', null)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (ordersError) throw ordersError;

      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('id')
        .eq('work_id', workId);

      if (contractsError) throw contractsError;

      const contractIds = (contracts || []).map(c => c.id);

      let installments: any[] = [];
      if (contractIds.length > 0) {
        const { data: installmentsData, error: installmentsError } = await supabase
          .from('contract_installments')
          .select('due_date, amount, paid_amount, status, paid_date')
          .in('contract_id', contractIds)
          .gte('due_date', startDate.toISOString().split('T')[0])
          .lte('due_date', endDate.toISOString().split('T')[0]);

        if (installmentsError) throw installmentsError;
        installments = installmentsData || [];
      }

      const monthlyData: Record<string, MonthlyFlow> = {};

      for (let i = -6; i <= 6; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() + i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

        monthlyData[monthKey] = {
          month: monthLabel,
          paid: 0,
          scheduled: 0
        };
      }

      (orders || []).forEach(order => {
        if (order.paid_date) {
          const monthKey = order.paid_date.substring(0, 7);
          if (monthlyData[monthKey]) {
            if (order.status === 'pago') {
              monthlyData[monthKey].paid += order.total_value;
            } else {
              monthlyData[monthKey].scheduled += order.total_value;
            }
          }
        }
      });

      installments.forEach(inst => {
        const dateToUse = inst.status === 'pago' && inst.paid_date ? inst.paid_date : inst.due_date;
        const monthKey = dateToUse.substring(0, 7);
        if (monthlyData[monthKey]) {
          const amount = inst.paid_amount || inst.amount;
          if (inst.status === 'pago') {
            monthlyData[monthKey].paid += amount;
          } else {
            monthlyData[monthKey].scheduled += amount;
          }
        }
      });

      const sortedData = Object.keys(monthlyData)
        .sort()
        .map(key => monthlyData[key]);

      const totalPaid = sortedData.reduce((sum, m) => sum + m.paid, 0);
      const totalScheduled = sortedData.reduce((sum, m) => sum + m.scheduled, 0);

      setData(sortedData);
      setTotals({ paid: totalPaid, scheduled: totalScheduled });
    } catch (error) {
      console.error('Error loading cash flow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxValue = Math.max(...data.map(d => Math.max(d.paid, d.scheduled)), 1);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Calendar className="w-6 h-6 text-blue-600" />
        Fluxo de Pagamentos (Caixa)
      </h2>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Carregando dados...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-600 font-medium">Total Pago (12 meses)</p>
              </div>
              <p className="text-2xl font-bold text-green-900">
                R$ {totals.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-blue-600 font-medium">Total Previsto (12 meses)</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                R$ {totals.scheduled.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {data.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>Nenhum dado de fluxo de caixa disponível</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((month, index) => {
                const total = month.paid + month.scheduled;
                const hasPaid = month.paid > 0;
                const hasScheduled = month.scheduled > 0;

                if (!hasPaid && !hasScheduled) return null;

                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 capitalize">{month.month}</h3>
                      <span className="text-sm text-gray-600">
                        Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {hasPaid && (
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 w-20">Pago:</span>
                          <div className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden relative">
                            <div
                              className="h-full bg-green-500 flex items-center justify-end px-3 text-white text-xs font-medium"
                              style={{ width: `${(month.paid / maxValue) * 100}%` }}
                            >
                              {month.paid > 0 && `R$ ${month.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            </div>
                          </div>
                        </div>
                      )}

                      {hasScheduled && (
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 w-20">Previsto:</span>
                          <div className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden relative">
                            <div
                              className="h-full bg-blue-500 flex items-center justify-end px-3 text-white text-xs font-medium"
                              style={{ width: `${(month.scheduled / maxValue) * 100}%` }}
                            >
                              {month.scheduled > 0 && `R$ ${month.scheduled.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Este gráfico mostra os últimos 6 meses e os próximos 6 meses de fluxo de caixa baseado em pedidos pagos e parcelas de contratos.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
