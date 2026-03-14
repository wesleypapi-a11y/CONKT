import { useState, useEffect } from 'react';
import { Plus, Search, CreditCard as Edit, Trash2, Calendar, ArrowLeft, FileDown } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { Schedule } from '../../types/schedule';
import { Work } from '../../types/work';
import { useAuth } from '../../contexts/AuthContext';
import ScheduleWorkModal from './ScheduleWorkModal';
import ScheduleTemplateImportModal from './ScheduleTemplateImportModal';

interface SchedulesListProps {
  onNavigateHome: () => void;
  onEditSchedule: (scheduleId: string) => void;
}

export default function SchedulesList({ onNavigateHome, onEditSchedule }: SchedulesListProps) {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [workModalOpen, setWorkModalOpen] = useState(false);
  const [templateImportModalOpen, setTemplateImportModalOpen] = useState(false);

  useEffect(() => {
    loadSchedules();
    loadWorks();
  }, []);

  useEffect(() => {
    filterSchedules();
  }, [searchTerm, schedules]);

  const loadSchedules = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('works')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setWorks(data as Work[] || []);
    } catch (error) {
      console.error('Error loading works:', error);
    }
  };

  const filterSchedules = () => {
    if (!searchTerm.trim()) {
      setFilteredSchedules(schedules);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = schedules.filter(schedule => {
      const work = works.find(w => w.id === schedule.work_id);
      return (
        schedule.name.toLowerCase().includes(term) ||
        schedule.description.toLowerCase().includes(term) ||
        work?.name.toLowerCase().includes(term)
      );
    });

    setFilteredSchedules(filtered);
  };

  const handleAddSchedule = () => {
    setWorkModalOpen(true);
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Deseja realmente excluir este cronograma? Todas as tarefas associadas serão perdidas.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
      await loadSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Erro ao excluir cronograma');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkSelected = async (workId: string) => {
    setWorkModalOpen(false);
    onEditSchedule(workId);
  };

  const getWorkName = (workId: string) => {
    return works.find(w => w.id === workId)?.name || '-';
  };

  return (
    <div className="flex flex-col h-full relative">
      <button
        onClick={onNavigateHome}
        className="absolute top-0 left-0 z-10 px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
        style={{
          backgroundColor: arcoColors.primary.blue,
          color: '#000000'
        }}
        title="Voltar"
      >
        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="hidden sm:inline">Voltar</span>
      </button>

      <div className="mb-4 pl-24 sm:pl-32">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar cronogramas..."
              className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{}}
            />
          </div>

          <button
            onClick={() => setTemplateImportModalOpen(true)}
            className="px-3 sm:px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md text-sm"
            style={{
              backgroundColor: arcoColors.primary.amber,
              color: '#000000',
              border: '2px solid #000000'
            }}
          >
            <FileDown className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Importar Template</span>
            <span className="sm:hidden">Template</span>
          </button>

          <button
            onClick={handleAddSchedule}
            className="px-3 sm:px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm"
            style={{
              backgroundColor: '#10B981',
              color: '#000000'
            }}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Novo Cronograma</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col min-h-0">
        {loading && schedules.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Carregando...
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
            <Calendar className="w-16 h-16 mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">Nenhum cronograma encontrado</p>
            <p className="text-sm text-gray-400">
              {searchTerm
                ? 'Tente ajustar os filtros de busca'
                : 'Clique em "Novo Cronograma" para começar'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block flex-1 overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Obra
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Início
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Fim
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSchedules.map((schedule) => (
                    <tr key={schedule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="w-5 h-5 mr-2 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {schedule.name}
                            </div>
                            {schedule.description && (
                              <div className="text-sm text-gray-500">
                                {schedule.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {getWorkName(schedule.work_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {schedule.start_date ? new Date(schedule.start_date).toLocaleDateString('pt-BR') : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {schedule.end_date ? new Date(schedule.end_date).toLocaleDateString('pt-BR') : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onEditSchedule(schedule.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Excluir"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden flex-1 overflow-auto p-3 space-y-3">
              {filteredSchedules.map((schedule) => (
                <div key={schedule.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{schedule.name}</h3>
                        {schedule.description && (
                          <p className="text-xs text-gray-500">{schedule.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEditSchedule(schedule.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="text-gray-600">
                      <span className="font-medium">Obra:</span> {getWorkName(schedule.work_id)}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Início:</span>{' '}
                      {schedule.start_date ? new Date(schedule.start_date).toLocaleDateString('pt-BR') : '-'}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Fim:</span>{' '}
                      {schedule.end_date ? new Date(schedule.end_date).toLocaleDateString('pt-BR') : '-'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {workModalOpen && (
        <ScheduleWorkModal
          isOpen={workModalOpen}
          onClose={() => setWorkModalOpen(false)}
          onWorkSelected={handleWorkSelected}
        />
      )}

      {templateImportModalOpen && (
        <ScheduleTemplateImportModal
          isOpen={templateImportModalOpen}
          onClose={() => setTemplateImportModalOpen(false)}
          onImportComplete={() => {
            setTemplateImportModalOpen(false);
            loadSchedules();
          }}
        />
      )}
    </div>
  );
}
