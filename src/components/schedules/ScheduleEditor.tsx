import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { Schedule, ScheduleTask, ScheduleHoliday } from '../../types/schedule';
import { Work } from '../../types/work';
import { useAuth } from '../../contexts/AuthContext';
import ScheduleTaskTable from './ScheduleTaskTable';
import ScheduleGoals from './ScheduleGoals';

interface ScheduleEditorProps {
  scheduleId: string;
  onBack: () => void;
}

type TabType = 'cronograma' | 'metas';

export default function ScheduleEditor({ scheduleId, onBack }: ScheduleEditorProps) {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [work, setWork] = useState<Work | null>(null);
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [holidays, setHolidays] = useState<ScheduleHoliday[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('cronograma');

  useEffect(() => {
    loadSchedule();
    loadTasks();
    loadHolidays();
  }, [scheduleId]);

  const loadSchedule = async () => {
    try {
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('*')
        .eq('id', scheduleId)
        .maybeSingle();

      if (scheduleError) throw scheduleError;

      if (scheduleData) {
        setSchedule(scheduleData);

        const { data: workData, error: workError } = await supabase
          .from('works')
          .select('*')
          .eq('id', scheduleData.work_id)
          .maybeSingle();

        if (workError) throw workError;
        if (workData) setWork(workData);
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
      alert('Erro ao carregar cronograma');
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedule_tasks')
        .select('*')
        .eq('schedule_id', scheduleId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHolidays = async () => {
    try {
      const { data, error } = await supabase
        .from('schedule_holidays')
        .select('*')
        .eq('schedule_id', scheduleId)
        .order('holiday_date', { ascending: true });

      if (error) throw error;
      setHolidays(data || []);
    } catch (error) {
      console.error('Error loading holidays:', error);
    }
  };

  

  if (!schedule) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: conktColors.primary.blue }}
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{schedule.name}</h1>
            {work && (
              <p className="text-sm text-gray-500">Obra: {work.name}</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-white">
        <div className="flex gap-1 px-4">
          <button
            onClick={() => setActiveTab('cronograma')}
            className={`px-6 py-3 text-sm font-medium transition-colors rounded-t-lg ${
              activeTab === 'cronograma'
                ? 'text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={activeTab === 'cronograma' ? { backgroundColor: conktColors.primary.blue } : {}}
          >
            Cronograma
          </button>
          <button
            onClick={() => setActiveTab('metas')}
            className={`px-6 py-3 text-sm font-medium transition-colors rounded-t-lg ${
              activeTab === 'metas'
                ? 'text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={activeTab === 'metas' ? { backgroundColor: conktColors.primary.blue } : {}}
          >
            Metas
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-gray-50">
        {activeTab === 'cronograma' && (
          <ScheduleTaskTable
            schedule={schedule}
            tasks={tasks}
            holidays={holidays}
            onTasksChange={loadTasks}
            onBack={onBack}
          />
        )}
        {activeTab === 'metas' && (
          <ScheduleGoals
            schedule={schedule}
            tasks={tasks}
            holidays={holidays}
          />
        )}
      </div>
    </div>
  );
}
