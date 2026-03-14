import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Plus, CreditCard as Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { getEmpresaContext } from '../../utils/empresaContext';

export function PrevisaoFinanceira({ workId }: { workId?: string }) {
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [works, setWorks] = useState<any[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState(workId || '');

  const { showAlert } = useAlert();

  useEffect(() => {
    loadForecasts();
    if (!workId) loadWorks();
  }, [selectedYear, selectedWorkId]);

  const loadWorks = async () => {
    try {
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) return;

      const { data } = await supabase
        .from('works')
        .select('id, nome')
        .eq('empresa_id', empresaId)
        .is('deleted_at', null);

      setWorks(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar obras:', error);
    }
  };

  const loadForecasts = async () => {
    try {
      setLoading(true);
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        setLoading(false);
        return;
      }

      if (!selectedWorkId && workId) {
        setSelectedWorkId(workId);
      }

      if (!selectedWorkId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('financial_forecasts')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('work_id', selectedWorkId)
        .eq('ano', selectedYear)
        .is('deleted_at', null)
        .order('mes');

      if (error) throw error;

      const allMonths = Array.from({ length: 12 }, (_, i) => {
        const existing = data?.find(f => f.mes === i + 1);
        return existing || {
          mes: i + 1,
          ano: selectedYear,
          entradas_previstas: 0,
          saidas_previstas: 0,
          saldo_previsto: 0
        };
      });

      let saldoAcumulado = 0;
      const forecastsWithBalance = allMonths.map(f => {
        saldoAcumulado += Number(f.entradas_previstas) - Number(f.saidas_previstas);
        return {
          ...f,
          saldoAcumulado
        };
      });

      setForecasts(forecastsWithBalance);
    } catch (error: any) {
      showAlert('Erro ao carregar previsões', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateForecast = async (mes: number, field: string, value: number) => {
    try {
      const { empresaId } = await getEmpresaContext();
      if (!empresaId || !selectedWorkId) return;

      const { data: { user } } = await supabase.auth.getUser();

      const existing = forecasts.find(f => f.mes === mes);

      const forecastData = {
        empresa_id: empresaId,
        work_id: selectedWorkId,
        mes,
        ano: selectedYear,
        entradas_previstas: field === 'entradas_previstas' ? value : (existing?.entradas_previstas || 0),
        saidas_previstas: field === 'saidas_previstas' ? value : (existing?.saidas_previstas || 0),
        saldo_previsto: 0,
        created_by: user?.id
      };

      forecastData.saldo_previsto = forecastData.entradas_previstas - forecastData.saidas_previstas;

      if (existing?.id) {
        const { error } = await supabase
          .from('financial_forecasts')
          .update(forecastData)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('financial_forecasts')
          .insert(forecastData);

        if (error) throw error;
      }

      loadForecasts();
    } catch (error: any) {
      showAlert('Erro ao atualizar previsão', 'error');
      console.error(error);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months[month - 1];
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Previsão Financeira</h2>
        <p className="text-gray-600 mt-1">Projeção mensal de entradas e saídas</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 mb-6">
          {!workId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Obra
              </label>
              <select
                value={selectedWorkId}
                onChange={(e) => setSelectedWorkId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione uma obra...</option>
                {works.map(work => (
                  <option key={work.id} value={work.id}>{work.nome}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ano
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {!selectedWorkId && !workId ? (
          <div className="text-center py-8 text-gray-500">
            Selecione uma obra para visualizar as previsões
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Mês</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Entradas Previstas</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Saídas Previstas</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Saldo do Mês</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Saldo Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : (
                  forecasts.map((forecast) => {
                    const saldoMes = Number(forecast.entradas_previstas) - Number(forecast.saidas_previstas);
                    return (
                      <tr key={forecast.mes} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-semibold text-gray-700">
                          {getMonthName(forecast.mes)}/{selectedYear}
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={forecast.entradas_previstas}
                            onChange={(e) => handleUpdateForecast(forecast.mes, 'entradas_previstas', Number(e.target.value))}
                            className="w-full text-right px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={forecast.saidas_previstas}
                            onChange={(e) => handleUpdateForecast(forecast.mes, 'saidas_previstas', Number(e.target.value))}
                            className="w-full text-right px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className={`py-3 px-4 text-sm text-right font-semibold ${
                          saldoMes >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(saldoMes)}
                        </td>
                        <td className={`py-3 px-4 text-sm text-right font-bold ${
                          forecast.saldoAcumulado >= 0 ? 'text-blue-600' : 'text-orange-600'
                        }`}>
                          {formatCurrency(forecast.saldoAcumulado)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
