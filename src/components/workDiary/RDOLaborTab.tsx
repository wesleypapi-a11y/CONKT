import { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { WorkDiaryLabor } from '../../types/workDiary';

interface RDOLaborTabProps {
  rdoId: string;
}

export default function RDOLaborTab({ rdoId }: RDOLaborTabProps) {
  const [notes, setNotes] = useState('');
  const [laborList, setLaborList] = useState<WorkDiaryLabor[]>([]);
  const [laborForm, setLaborForm] = useState({ name: '', quantity: 1, observation: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [rdoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [notesData, laborData] = await Promise.all([
        supabase.from('work_diaries').select('labor_notes').eq('id', rdoId).maybeSingle(),
        supabase.from('work_diary_labor').select('*').eq('work_diary_id', rdoId).order('created_at', { ascending: true })
      ]);

      if (notesData.data) {
        setNotes(notesData.data.labor_notes || '');
      }
      setLaborList(laborData.data || []);
    } catch (error) {
      console.error('Error loading labor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('work_diaries')
        .update({ labor_notes: notes })
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

  const addLabor = async () => {
    if (!laborForm.name.trim()) {
      alert('Preencha o nome');
      return;
    }

    try {
      const { error } = await supabase
        .from('work_diary_labor')
        .insert({
          work_diary_id: rdoId,
          name: laborForm.name,
          quantity: laborForm.quantity,
          observation: laborForm.observation || null
        });

      if (error) throw error;
      setLaborForm({ name: '', quantity: 1, observation: '' });
      await loadData();
    } catch (error) {
      console.error('Error adding labor:', error);
      alert('Erro ao adicionar mão de obra');
    }
  };

  const deleteLabor = async (id: string) => {
    if (!confirm('Deseja realmente excluir este item?')) return;

    try {
      const { error } = await supabase.from('work_diary_labor').delete().eq('id', id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting labor:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4" style={{ color: conktColors.text }}>
          Mão de obra
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
            placeholder="Escreva observações gerais sobre mão de obra..."
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
          <h4 className="text-md font-semibold mb-4 text-gray-800">Adicionar Trabalhador</h4>

          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={laborForm.name}
                  onChange={(e) => setLaborForm({ ...laborForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{}}
                  placeholder="Nome do trabalhador"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={laborForm.quantity}
                  onChange={(e) => setLaborForm({ ...laborForm, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{}}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                <input
                  type="text"
                  value={laborForm.observation}
                  onChange={(e) => setLaborForm({ ...laborForm, observation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{}}
                  placeholder="Observações..."
                />
              </div>
            </div>
            <button
              onClick={addLabor}
              className="px-4 py-2 rounded-md text-white font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: conktColors.primary.blue }}
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          {laborList.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Lista de Trabalhadores ({laborList.length})</h4>
              {laborList.map((labor) => (
                <div key={labor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{labor.name}</p>
                    <p className="text-sm text-gray-600">Quantidade: {labor.quantity}</p>
                    {labor.observation && <p className="text-xs text-gray-500 mt-1">{labor.observation}</p>}
                  </div>
                  <button
                    onClick={() => deleteLabor(labor.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
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
