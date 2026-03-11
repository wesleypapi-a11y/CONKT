import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertCircle, PieChart } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface BudgetSummary {
  total_cinza: number;
  total_acabamento: number;
  total_obra: number;
  custo_m2_cinza: number;
  custo_m2_acabamento: number;
  custo_m2_obra: number;
  realizado_cinza: number;
  realizado_acabamento: number;
  realizado_total: number;
  area_total: number;
}

interface PhaseData {
  phase_name: string;
  budgeted: number;
  realized: number;
  percentage: number;
}

interface Props {
  workId: string;
}

export default function BudgetOverviewDashboard({ workId }: Props) {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [phaseData, setPhaseData] = useState<PhaseData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCharts, setShowCharts] = useState(true);

  useEffect(() => {
    if (workId) {
      loadData();
    }
  }, [workId]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('[BudgetOverview] Buscando orçamento para work_id:', workId);

      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('work_id', workId)
        .maybeSingle();

      if (budgetError) {
        console.error('[BudgetOverview] Erro ao buscar orçamento:', budgetError);
        throw budgetError;
      }

      console.log('[BudgetOverview] Orçamento encontrado:', budgetData);

      if (!budgetData) {
        console.warn('[BudgetOverview] Nenhum orçamento encontrado para work_id:', workId);
        setSummary(null);
        setPhaseData([]);
        return;
      }

      const budgetId = budgetData.id;
      const areasArray = budgetData.areas || [];
      const areaTotal = areasArray.reduce((sum: number, item: any) => sum + (parseFloat(item.area) || 0), 0) || 1;

      const { data: allItemsData, error: itemsError } = await supabase
        .from('budget_items')
        .select('*')
        .eq('budget_id', budgetId)
        .order('ordem', { ascending: true });

      if (itemsError) throw itemsError;

      const macroItems = (allItemsData || []).filter(item => item.tipo === 'macro' && item.parent_id === null);

      const calculateMacroTotal = (macroId: string): number => {
        const children = (allItemsData || []).filter(item => item.parent_id === macroId);
        return children.reduce((sum, child) => {
          if (child.tipo === 'submacro') {
            return sum + calculateMacroTotal(child.id);
          }
          return sum + (child.valor_total || 0);
        }, 0);
      };

      console.log('[BudgetOverview] Total de items:', allItemsData?.length || 0);
      console.log('[BudgetOverview] Macros encontradas:', macroItems.length);

      const { data: realizedData, error: realizedError } = await supabase
        .from('budget_realized')
        .select('phase_id, amount')
        .eq('budget_id', budgetId)
        .is('deleted_at', null);

      if (realizedError) throw realizedError;

      const realizedByPhase = (realizedData || []).reduce((acc, item) => {
        acc[item.phase_id] = (acc[item.phase_id] || 0) + (item.amount || 0);
        return acc;
      }, {} as Record<string, number>);

      let totalCinza = 0;
      let totalAcabamento = 0;
      let realizedCinza = 0;
      let realizedAcabamento = 0;

      const phases: PhaseData[] = macroItems.map(item => {
        const budgeted = calculateMacroTotal(item.id);
        const realized = realizedByPhase[item.id] || 0;
        const percentage = budgeted > 0 ? (realized / budgeted) * 100 : 0;

        const phaseName = (item.descricao || '').toLowerCase();

        // Fases CINZA: infra, estrutura, instalações básicas (exceto instalações complementares)
        const isCinza =
          phaseName.includes('documentaç') ||
          phaseName.includes('custo') && phaseName.includes('indireto') ||
          phaseName.includes('mão de obra') ||
          phaseName.includes('locação') ||
          phaseName.includes('preliminar') ||
          phaseName.includes('estrutura') ||
          phaseName.includes('fundação') ||
          phaseName.includes('cobertura') ||
          phaseName.includes('hidráulica') ||
          phaseName.includes('elétrica') && !phaseName.includes('acabamento');

        if (isCinza) {
          totalCinza += budgeted;
          realizedCinza += realized;
        } else {
          totalAcabamento += budgeted;
          realizedAcabamento += realized;
        }

        return {
          phase_name: item.descricao,
          budgeted,
          realized,
          percentage
        };
      });

      const totalObra = totalCinza + totalAcabamento;
      const realizedTotal = realizedCinza + realizedAcabamento;

      console.log('[BudgetOverview] Resumo calculado:', {
        totalCinza,
        totalAcabamento,
        totalObra,
        realizedTotal
      });

      setSummary({
        total_cinza: totalCinza,
        total_acabamento: totalAcabamento,
        total_obra: totalObra,
        custo_m2_cinza: totalCinza / areaTotal,
        custo_m2_acabamento: totalAcabamento / areaTotal,
        custo_m2_obra: totalObra / areaTotal,
        realizado_cinza: realizedCinza,
        realizado_acabamento: realizedAcabamento,
        realizado_total: realizedTotal,
        area_total: areaTotal
      });

      setPhaseData(phases);
      console.log('[BudgetOverview] ✓ Dados carregados com sucesso');
    } catch (error) {
      console.error('[BudgetOverview] Erro ao carregar dados do orçamento:', error);
      setSummary(null);
      setPhaseData([]);
    } finally {
      setLoading(false);
    }
  };

  const renderPieChart = (percentage: number, color: string) => {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative w-32 h-32">
        <svg className="transform -rotate-90 w-32 h-32">
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="#e5e7eb"
            strokeWidth="12"
            fill="none"
          />
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke={color}
            strokeWidth="12"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{percentage.toFixed(1)}%</span>
        </div>
      </div>
    );
  };

  const renderBarChart = (data: PhaseData[]) => {
    const maxValue = Math.max(...data.map(d => d.budgeted), 1);

    return (
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{item.phase_name}</span>
              <span className="text-sm text-gray-500">{item.percentage.toFixed(1)}%</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 h-8 bg-gray-100 rounded-md overflow-hidden relative">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${(item.budgeted / maxValue) * 100}%` }}
                />
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-xs font-medium text-gray-700">
                    R$ {item.budgeted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="flex-1 h-8 bg-gray-100 rounded-md overflow-hidden relative">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${(item.realized / maxValue) * 100}%` }}
                />
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-xs font-medium text-gray-700">
                    R$ {item.realized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center py-8 text-gray-500">Carregando dados...</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum orçamento encontrado para esta obra
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Para visualizar os dados do orçamento, é necessário criar um orçamento vinculado a esta obra.
          </p>
          <p className="text-xs text-gray-500 mb-6">
            Work ID: {workId}
          </p>
          <div className="flex flex-col items-center gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>Acesse a aba <strong>Orçamentos</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>Crie um novo orçamento</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>Vincule à obra atual</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const percentRealizedCinza = summary.total_cinza > 0 ? (summary.realizado_cinza / summary.total_cinza) * 100 : 0;
  const percentRealizedAcabamento = summary.total_acabamento > 0 ? (summary.realizado_acabamento / summary.total_acabamento) * 100 : 0;
  const percentRealizedTotal = summary.total_obra > 0 ? (summary.realizado_total / summary.total_obra) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-blue-600" />
            RESUMO DO ORÇAMENTO
          </h2>
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <PieChart className="w-4 h-4" />
            {showCharts ? 'Ocultar Gráficos' : 'Mostrar Gráficos'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Total CINZA</h3>
            <p className="text-2xl font-bold text-blue-600 mb-2">
              R$ {summary.total_cinza.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-600 mb-1">CUSTO POR M²</p>
            <p className="text-lg font-semibold text-gray-800">
              R$ {summary.custo_m2_cinza.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-green-600 font-medium mt-2">REALIZADO</p>
            <p className="text-lg font-bold text-green-600">
              R$ {summary.realizado_cinza.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Total ACABAMENTO</h3>
            <p className="text-2xl font-bold text-blue-600 mb-2">
              R$ {summary.total_acabamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-600 mb-1">CUSTO POR M²</p>
            <p className="text-lg font-semibold text-gray-800">
              R$ {summary.custo_m2_acabamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-green-600 font-medium mt-2">REALIZADO</p>
            <p className="text-lg font-bold text-green-600">
              R$ {summary.realizado_acabamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-green-500 text-white rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3">TOTAL DA OBRA</h3>
            <p className="text-2xl font-bold mb-2">
              R$ {summary.total_obra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm mb-1">CUSTO POR M²</p>
            <p className="text-lg font-semibold">
              R$ {summary.custo_m2_obra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm font-medium mt-2">REALIZADO TOTAL</p>
            <p className="text-lg font-bold">
              R$ {summary.realizado_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {showCharts && (
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <PieChart className="w-6 h-6 text-blue-600" />
              Percentual Realizado
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">CINZA</h3>
                {renderPieChart(percentRealizedCinza, '#3b82f6')}
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">Orçado</p>
                  <p className="text-lg font-bold text-blue-600">
                    R$ {summary.total_cinza.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Realizado</p>
                  <p className="text-lg font-bold text-green-600">
                    R$ {summary.realizado_cinza.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">ACABAMENTO</h3>
                {renderPieChart(percentRealizedAcabamento, '#10b981')}
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">Orçado</p>
                  <p className="text-lg font-bold text-blue-600">
                    R$ {summary.total_acabamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Realizado</p>
                  <p className="text-lg font-bold text-green-600">
                    R$ {summary.realizado_acabamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">TOTAL</h3>
                {renderPieChart(percentRealizedTotal, '#8b5cf6')}
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">Orçado</p>
                  <p className="text-lg font-bold text-blue-600">
                    R$ {summary.total_obra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Realizado</p>
                  <p className="text-lg font-bold text-green-600">
                    R$ {summary.realizado_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              Orçado vs Realizado por Fase
            </h2>

            <div className="mb-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-gray-600">Orçado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-gray-600">Realizado</span>
              </div>
            </div>

            {phaseData.length > 0 ? (
              renderBarChart(phaseData)
            ) : (
              <div className="text-center py-8 text-gray-500">
                Nenhuma fase cadastrada
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
