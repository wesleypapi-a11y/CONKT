import { useState, useEffect } from 'react';
import { Users, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SupplierData {
  supplier_id: string;
  supplier_name: string;
  totalValue: number;
}

interface Props {
  workId: string;
  dateRange: { start: string; end: string };
}

export default function SuppliersDashboard({ workId, dateRange }: Props) {
  const [data, setData] = useState<SupplierData[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    if (workId) {
      loadData();
    }
  }, [workId, dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: ordersData, error } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          supplier_id,
          total_value,
          created_at,
          suppliers (
            id,
            name
          )
        `)
        .eq('work_id', workId)
        .is('deleted_at', null)
        .gte('created_at', `${dateRange.start}T00:00:00`)
        .lte('created_at', `${dateRange.end}T23:59:59`);

      if (error) throw error;

      const supplierTotals = (ordersData || []).reduce((acc, order: any) => {
        const supplierId = order.supplier_id;
        const supplierName = order.suppliers?.name || 'Fornecedor Desconhecido';

        if (!acc[supplierId]) {
          acc[supplierId] = {
            supplier_id: supplierId,
            supplier_name: supplierName,
            totalValue: 0
          };
        }
        acc[supplierId].totalValue += order.total_value || 0;
        return acc;
      }, {} as Record<string, SupplierData>);

      const sortedData = Object.values(supplierTotals)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10);

      const total = sortedData.reduce((sum, s) => sum + s.totalValue, 0);

      setData(sortedData);
      setTotalValue(total);
    } catch (error) {
      console.error('Error loading suppliers data:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxValue = data.length > 0 ? data[0].totalValue : 1;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Users className="w-6 h-6 text-blue-600" />
        Realizado por Fornecedor (Top 10)
      </h2>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Carregando dados...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p>Nenhum dado de fornecedor disponível para o período</p>
        </div>
      ) : (
        <>
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-600 font-medium mb-1">Total Realizado (Top 10)</p>
            <p className="text-2xl font-bold text-blue-900">
              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="space-y-3">
            {data.map((supplier, index) => {
              const percentage = totalValue > 0 ? (supplier.totalValue / totalValue) * 100 : 0;
              const barWidth = maxValue > 0 ? (supplier.totalValue / maxValue) * 100 : 0;

              return (
                <div key={supplier.supplier_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900">{supplier.supplier_name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        R$ {supplier.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500">{percentage.toFixed(1)}% do total</p>
                    </div>
                  </div>

                  <div className="w-full h-4 bg-gray-100 rounded-md overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {data.length === 10 && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <p className="text-sm text-gray-600">
                <TrendingUp className="w-4 h-4 inline mr-1" />
                Exibindo os 10 fornecedores com maior valor realizado
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
