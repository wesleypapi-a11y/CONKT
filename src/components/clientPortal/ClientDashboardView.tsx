import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Clock, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';

interface ClientDashboardViewProps {
  workId: string;
}

export default function ClientDashboardView({ workId }: ClientDashboardViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    budgetTotal: 0,
    budgetRealized: 0,
    budgetPercentage: 0,
    scheduleProgress: 0,
    totalTasks: 0,
    completedTasks: 0,
    diaryEntries: 0,
    lastUpdate: null as string | null,
    workStatus: 'andamento'
  });

  useEffect(() => {
    loadDashboardData();
  }, [workId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('total_value')
        .eq('work_id', workId)
        .eq('status', 'aprovado')
        .maybeSingle();

      const { data: realizedData } = await supabase
        .from('budget_realized')
        .select('total_value')
        .eq('work_id', workId)
        .is('deleted_at', null);

      const totalRealized = realizedData?.reduce((sum: number, item: any) => sum + (item.total_value || 0), 0) || 0;

      const { data: scheduleData } = await supabase
        .from('schedule_tasks')
        .select('progress')
        .eq('schedule_id', workId);

      const avgProgress = scheduleData && scheduleData.length > 0
        ? scheduleData.reduce((sum: number, task: any) => sum + (task.progress || 0), 0) / scheduleData.length
        : 0;

      const { count: totalTasks } = await supabase
        .from('schedule_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('schedule_id', workId);

      const { count: completedTasks } = await supabase
        .from('schedule_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('schedule_id', workId)
        .gte('progress', 100);

      const { count: diaryEntries } = await supabase
        .from('work_diaries')
        .select('*', { count: 'exact', head: true })
        .eq('work_id', workId)
        .is('deleted_at', null);

      const { data: lastDiaryData } = await supabase
        .from('work_diaries')
        .select('date')
        .eq('work_id', workId)
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: workData } = await supabase
        .from('works')
        .select('status')
        .eq('id', workId)
        .maybeSingle();

      setData({
        budgetTotal: budgetData?.total_value || 0,
        budgetRealized: totalRealized,
        budgetPercentage: budgetData?.total_value ? (totalRealized / budgetData.total_value) * 100 : 0,
        scheduleProgress: avgProgress,
        totalTasks: totalTasks || 0,
        completedTasks: completedTasks || 0,
        diaryEntries: diaryEntries || 0,
        lastUpdate: lastDiaryData?.date || null,
        workStatus: workData?.status || 'andamento'
      });
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Carregando informações...</p>
      </div>
    );
  }

  const statusColors: Record<string, { bg: string; text: string; icon: any }> = {
    'planejamento': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
    'andamento': { bg: 'bg-green-100', text: 'text-green-700', icon: TrendingUp },
    'pausada': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertCircle },
    'concluida': { bg: 'bg-gray-100', text: 'text-gray-700', icon: CheckCircle }
  };

  const statusConfig = statusColors[data.workStatus] || statusColors['andamento'];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${statusConfig.bg}`}>
              <StatusIcon className={`w-6 h-6 ${statusConfig.text}`} />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Status da Obra</h3>
          <p className="text-2xl font-bold text-gray-800 capitalize">{data.workStatus}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Orçamento Realizado</h3>
          <p className="text-2xl font-bold text-gray-800">{data.budgetPercentage.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {data.budgetRealized.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de{' '}
            {data.budgetTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Progresso do Cronograma</h3>
          <p className="text-2xl font-bold text-gray-800">{data.scheduleProgress.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {data.completedTasks} de {data.totalTasks} tarefas concluídas
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-green-100">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Registros de Diário</h3>
          <p className="text-2xl font-bold text-gray-800">{data.diaryEntries}</p>
          <p className="text-xs text-gray-500 mt-1">
            {data.lastUpdate
              ? `Última atualização: ${new Date(data.lastUpdate).toLocaleDateString('pt-BR')}`
              : 'Nenhuma atualização'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Progresso do Orçamento</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Valor Orçado</span>
                <span className="font-semibold text-gray-800">
                  {data.budgetTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full"
                  style={{
                    width: '100%',
                    backgroundColor: conktColors.primary.blue
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Valor Realizado</span>
                <span className="font-semibold text-gray-800">
                  {data.budgetRealized.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full"
                  style={{
                    width: `${Math.min(data.budgetPercentage, 100)}%`,
                    backgroundColor: data.budgetPercentage > 100 ? '#ef4444' : '#10b981'
                  }}
                />
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Saldo Disponível</span>
                <span className={`font-semibold ${data.budgetTotal - data.budgetRealized >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(data.budgetTotal - data.budgetRealized).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Progresso do Cronograma</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Tarefas Totais</span>
                <span className="font-semibold text-gray-800">{data.totalTasks}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full"
                  style={{
                    width: '100%',
                    backgroundColor: conktColors.primary.purple
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Tarefas Concluídas</span>
                <span className="font-semibold text-gray-800">{data.completedTasks}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-green-500"
                  style={{
                    width: data.totalTasks > 0 ? `${(data.completedTasks / data.totalTasks) * 100}%` : '0%'
                  }}
                />
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Progresso Médio</span>
                <span className="font-semibold text-purple-600">{data.scheduleProgress.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Informação:</strong> Este painel apresenta um resumo simplificado da sua obra. Use as abas acima para ver informações detalhadas de orçamento, cronograma, diário de obras e fluxo de caixa.
        </p>
      </div>
    </div>
  );
}
