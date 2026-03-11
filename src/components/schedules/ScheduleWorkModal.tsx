import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Work } from '../../types/work';
import { useAuth } from '../../contexts/AuthContext';
import QuickWorkModal from '../works/QuickWorkModal';

interface ScheduleWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkSelected: (workId: string) => void;
}

export default function ScheduleWorkModal({ isOpen, onClose, onWorkSelected }: ScheduleWorkModalProps) {
  const { user } = useAuth();
  const [works, setWorks] = useState<Work[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState<string>('');
  const [scheduleName, setScheduleName] = useState<string>('');
  const [scheduleDescription, setScheduleDescription] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [workModalOpen, setWorkModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadWorks();
    }
  }, [isOpen]);

  const loadWorks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setWorks(data || []);
    } catch (error) {
      console.error('Error loading works:', error);
    }
  };

  const handleWorkChange = (workId: string) => {
    setSelectedWorkId(workId);

    if (workId) {
      const selectedWork = works.find(w => w.id === workId);
      if (selectedWork) {
        setScheduleName(`Cronograma - ${selectedWork.name}`);
      }
    } else {
      setScheduleName('');
    }
  };

  const getTemplateActivities = (template: string) => {
    const templates: { [key: string]: Array<{ name: string; duration: number }> } = {
      'construcao-residencial': [
        { name: 'Fundação', duration: 15 },
        { name: 'Estrutura', duration: 30 },
        { name: 'Alvenaria', duration: 20 },
        { name: 'Cobertura', duration: 10 },
        { name: 'Instalações Elétricas', duration: 15 },
        { name: 'Instalações Hidráulicas', duration: 15 },
        { name: 'Revestimentos', duration: 25 },
        { name: 'Pintura', duration: 10 },
        { name: 'Acabamentos Finais', duration: 10 }
      ],
      'reforma': [
        { name: 'Demolição', duration: 5 },
        { name: 'Alvenaria e Estrutura', duration: 15 },
        { name: 'Instalações', duration: 10 },
        { name: 'Revestimentos', duration: 20 },
        { name: 'Pintura', duration: 7 },
        { name: 'Acabamentos', duration: 8 }
      ],
      'comercial': [
        { name: 'Fundação', duration: 20 },
        { name: 'Estrutura', duration: 45 },
        { name: 'Alvenaria', duration: 30 },
        { name: 'Cobertura', duration: 15 },
        { name: 'Fachada', duration: 20 },
        { name: 'Instalações', duration: 25 },
        { name: 'Revestimentos', duration: 30 },
        { name: 'Acabamentos', duration: 20 }
      ],
      'infraestrutura': [
        { name: 'Terraplenagem', duration: 10 },
        { name: 'Drenagem', duration: 15 },
        { name: 'Pavimentação', duration: 20 },
        { name: 'Sinalização', duration: 5 },
        { name: 'Acabamentos', duration: 10 }
      ]
    };

    return templates[template] || [];
  };

  const handleCreateSchedule = async () => {
    if (!selectedWorkId) {
      alert('Selecione uma obra');
      return;
    }

    if (!scheduleName.trim()) {
      alert('Informe um nome para o cronograma');
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      const { data: schedule, error } = await supabase
        .from('schedules')
        .insert({
          user_id: user.id,
          work_id: selectedWorkId,
          name: scheduleName,
          description: scheduleDescription,
          consider_weekends: false
        })
        .select()
        .single();

      if (error) throw error;

      if (schedule && selectedTemplate) {
        const templateActivities = getTemplateActivities(selectedTemplate);
        let startDate = new Date();

        for (const activity of templateActivities) {
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + activity.duration);

          await supabase
            .from('schedule_tasks')
            .insert({
              schedule_id: schedule.id,
              name: activity.name,
              duration: activity.duration,
              start_date: startDate.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0],
              progress: 0,
              created_at: new Date().toISOString()
            });

          startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() + 1);
        }
      }

      if (schedule) {
        onWorkSelected(schedule.id);
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Erro ao criar cronograma');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkModalSave = () => {
    loadWorks();
  };

  const handleWorkCreated = async (workId: string) => {
    await loadWorks();
    handleWorkChange(workId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Novo Cronograma
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Nome do Cronograma *
            </label>
            <input
              type="text"
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
              placeholder="Ex: Cronograma Geral da Obra"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 text-gray-900"
              style={{}}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Descrição
            </label>
            <textarea
              value={scheduleDescription}
              onChange={(e) => setScheduleDescription(e.target.value)}
              placeholder="Descrição opcional do cronograma"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none text-gray-900"
              style={{}}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Template
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 text-gray-900"
              style={{}}
            >
              <option value="">Nenhum (Criar do zero)</option>
              <option value="construcao-residencial">Construção Residencial</option>
              <option value="reforma">Reforma</option>
              <option value="comercial">Edifício Comercial</option>
              <option value="infraestrutura">Infraestrutura</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Selecione um template para iniciar com tarefas pré-definidas
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Obra *
            </label>
            <div className="flex gap-2">
              <select
                value={selectedWorkId}
                onChange={(e) => handleWorkChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 text-gray-900"
                style={{}}
              >
                <option value="">Selecione uma obra</option>
                {works.map(work => (
                  <option key={work.id} value={work.id}>{work.name}</option>
                ))}
              </select>
              <button
                onClick={() => setWorkModalOpen(true)}
                className="px-3 py-2 rounded-md font-medium text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#EF4444' }}
                title="Cadastrar Nova Obra"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="btn-cancel"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateSchedule}
            disabled={loading}
            className="px-6 py-2 rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#10B981', color: '#000000' }}
          >
            {loading ? 'Criando...' : 'Criar Cronograma'}
          </button>
        </div>
      </div>

      {workModalOpen && (
        <QuickWorkModal
          isOpen={workModalOpen}
          onClose={() => setWorkModalOpen(false)}
          onWorkCreated={handleWorkCreated}
          onSave={handleWorkModalSave}
        />
      )}
    </div>
  );
}
