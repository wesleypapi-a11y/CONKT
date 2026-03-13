import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';

interface ScheduleTask {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  progress: number;
  status: string;
}

interface ClientScheduleViewProps {
  workId: string;
}

export default function ClientScheduleView({ workId }: ClientScheduleViewProps) {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    avgProgress: 0
  });

  useEffect(() => {
    loadScheduleData();
  }, [workId]);

  const loadScheduleData = async () => {
    setLoading(true);
    try {
      const { data: scheduleData } = await supabase
        .from('schedules')
        .select('id')
        .eq('work_id', workId)
        .maybeSingle();

      if (!scheduleData) {
        setLoading(false);
        return;
      }

      const { data: tasksData } = await supabase
        .from('schedule_tasks')
        .select('*')
        .eq('schedule_id', scheduleData.id)
        .order('start_date');

      const tasks = tasksData || [];
      setTasks(tasks);

      const completed = tasks.filter(t => t.progress >= 100).length;
      const inProgress = tasks.filter(t => t.progress > 0 && t.progress < 100).length;
      const notStarted = tasks.filter(t => t.progress === 0).length;
      const avgProgress = tasks.length > 0
        ? tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length
        : 0;

      setStats({
        total: tasks.length,
        completed,
        inProgress,
        notStarted,
        avgProgress
      });
    } catch (error) {
      console.error('Erro ao carregar cronograma:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (progress: number) => {
    if (progress >= 100) return { bg: 'bg-green-100', text: 'text-green-700', label: 'Concluída' };
    if (progress > 0) return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Em Andamento' };
    return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Não Iniciada' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Carregando cronograma...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Nenhum cronograma disponível para esta obra.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total de Atividades</h3>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Concluídas</h3>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Em Andamento</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Progresso Médio</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.avgProgress.toFixed(1)}%</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Atividades do Cronograma</h2>
          <p className="text-sm text-gray-600 mt-1">Acompanhe o andamento das atividades da obra</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Atividade</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Início</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Término</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Progresso</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tasks.map((task) => {
                const statusConfig = getStatusColor(task.progress);
                return (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-800">{task.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {new Date(task.start_date).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {new Date(task.end_date).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-semibold text-gray-800">{task.progress}%</span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${task.progress}%`,
                              backgroundColor: task.progress >= 100 ? '#10b981' : conktColors.primary.blue
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                        {statusConfig.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
