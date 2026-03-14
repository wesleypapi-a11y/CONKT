import { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { WorkDiaryActivity } from '../../types/workDiary';

interface RDOActivitiesTabProps {
  rdoId: string;
}

export default function RDOActivitiesTab({ rdoId }: RDOActivitiesTabProps) {
  const [notes, setNotes] = useState('');
  const [activitiesList, setActivitiesList] = useState<WorkDiaryActivity[]>([]);
  const [activityForm, setActivityForm] = useState({ description: '', progress: 0, observation: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [rdoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [notesData, activitiesData] = await Promise.all([
        supabase.from('work_diaries').select('activities_notes').eq('id', rdoId).maybeSingle(),
        supabase.from('work_diary_activities').select('*').eq('work_diary_id', rdoId).order('created_at', { ascending: true })
      ]);

      if (notesData.data) {
        setNotes(notesData.data.activities_notes || '');
      }
      setActivitiesList(activitiesData.data || []);
    } catch (error) {
      console.error('Error loading activities data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('work_diaries')
        .update({ activities_notes: notes })
        .eq('id', rdoId);

      if (error) throw error;
      alert('Observações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Erro ao salvar observações');
    } finally {
      setSaving(false);
    }
  };

  const addActivity = async () => {
    if (!activityForm.description.trim()) {
      alert('Preencha a descrição');
      return;
    }

    try {
      const { error } = await supabase
        .from('work_diary_activities')
        .insert({
          work_diary_id: rdoId,
          description: activityForm.description,
          progress: activityForm.progress || null,
          observation: activityForm.observation || null
        });

      if (error) throw error;
      setActivityForm({ description: '', progress: 0, observation: '' });
      await loadData();
    } catch (error) {
      console.error('Error adding activity:', error);
      alert('Erro ao adicionar atividade');
    }
  };

  const deleteActivity = async (id: string) => {
    if (!confirm('Deseja realmente excluir este item?')) return;

    try {
      const { error } = await supabase.from('work_diary_activities').delete().eq('id', id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4" style={{ color: arcoColors.text.primary }}>
          Atividades
        </h3>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações gerais
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none"
            style={{}}
            placeholder="Escreva observações gerais sobre as atividades..."
          />
          <button
            onClick={handleSaveNotes}
            disabled={saving}
            className="mt-2 px-4 py-2 rounded-md text-white font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: arcoColors.primary.blue }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Observações'}
          </button>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-semibold mb-4 text-gray-800">Adicionar Atividade</h4>

          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{}}
                  placeholder="Descrição da atividade"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Progresso (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={activityForm.progress}
                  onChange={(e) => setActivityForm({ ...activityForm, progress: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{}}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                <input
                  type="text"
                  value={activityForm.observation}
                  onChange={(e) => setActivityForm({ ...activityForm, observation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{}}
                  placeholder="Observações..."
                />
              </div>
            </div>
            <button
              onClick={addActivity}
              className="px-4 py-2 rounded-md text-white font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: arcoColors.primary.blue }}
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          {activitiesList.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Lista de Atividades ({activitiesList.length})</h4>
              {activitiesList.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{activity.description}</p>
                    {activity.progress !== null && activity.progress !== undefined && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${activity.progress}%`,
                                backgroundColor: arcoColors.primary.blue
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{activity.progress}%</span>
                        </div>
                      </div>
                    )}
                    {activity.observation && <p className="text-xs text-gray-500 mt-1">{activity.observation}</p>}
                  </div>
                  <button
                    onClick={() => deleteActivity(activity.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors ml-3"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
