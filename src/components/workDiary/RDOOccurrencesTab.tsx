import { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { WorkDiaryOccurrence } from '../../types/workDiary';

interface RDOOccurrencesTabProps {
  rdoId: string;
}

export default function RDOOccurrencesTab({ rdoId }: RDOOccurrencesTabProps) {
  const [notes, setNotes] = useState('');
  const [occurrencesList, setOccurrencesList] = useState<WorkDiaryOccurrence[]>([]);
  const [occurrenceForm, setOccurrenceForm] = useState({ description: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [rdoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [notesData, occurrencesData] = await Promise.all([
        supabase.from('work_diaries').select('occurrences_notes').eq('id', rdoId).maybeSingle(),
        supabase.from('work_diary_occurrences').select('*').eq('work_diary_id', rdoId).order('created_at', { ascending: true})
      ]);

      if (notesData.data) {
        setNotes(notesData.data.occurrences_notes || '');
      }
      setOccurrencesList(occurrencesData.data || []);
    } catch (error) {
      console.error('Error loading occurrences data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('work_diaries')
        .update({ occurrences_notes: notes })
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

  const addOccurrence = async () => {
    if (!occurrenceForm.description.trim()) {
      alert('Preencha a descrição');
      return;
    }

    try {
      const { error } = await supabase
        .from('work_diary_occurrences')
        .insert({
          work_diary_id: rdoId,
          description: occurrenceForm.description,
          type: occurrenceForm.type || null
        });

      if (error) throw error;
      setOccurrenceForm({ description: '', type: '' });
      await loadData();
    } catch (error) {
      console.error('Error adding occurrence:', error);
      alert('Erro ao adicionar ocorrência');
    }
  };

  const deleteOccurrence = async (id: string) => {
    if (!confirm('Deseja realmente excluir este item?')) return;

    try {
      const { error } = await supabase.from('work_diary_occurrences').delete().eq('id', id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting occurrence:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4" style={{ color: conktColors.text.primary }}>
          Ocorrências
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
            placeholder="Escreva observações gerais sobre ocorrências..."
          />
          <button
            onClick={handleSaveNotes}
            disabled={saving}
            className="mt-2 px-4 py-2 rounded-md text-white font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: conktColors.primary.blue }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Observações'}
          </button>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-semibold mb-4 text-gray-800">Adicionar Ocorrência</h4>

          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={occurrenceForm.description}
                  onChange={(e) => setOccurrenceForm({ ...occurrenceForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none"
                  style={{}}
                  placeholder="Descrição da ocorrência"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <input
                  type="text"
                  value={occurrenceForm.type}
                  onChange={(e) => setOccurrenceForm({ ...occurrenceForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{}}
                  placeholder="Ex: Segurança, Atraso, etc."
                />
              </div>
            </div>
            <button
              onClick={addOccurrence}
              className="px-4 py-2 rounded-md text-white font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: conktColors.primary.blue }}
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          {occurrencesList.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Lista de Ocorrências ({occurrencesList.length})</h4>
              {occurrencesList.map((occurrence) => (
                <div key={occurrence.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-800">{occurrence.description}</p>
                      {occurrence.type && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                          {occurrence.type}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteOccurrence(occurrence.id)}
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
