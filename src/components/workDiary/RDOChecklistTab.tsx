import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { WorkDiaryChecklist } from '../../types/workDiary';

interface RDOChecklistTabProps {
  rdoId: string | null;
}

export default function RDOChecklistTab({ rdoId }: RDOChecklistTabProps) {
  const [checklistItems, setChecklistItems] = useState<WorkDiaryChecklist[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    item: '',
    observation: ''
  });

  useEffect(() => {
    if (rdoId) {
      loadChecklist();
    }
  }, [rdoId]);

  const loadChecklist = async () => {
    if (!rdoId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_diary_checklist')
        .select('*')
        .eq('work_diary_id', rdoId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChecklistItems(data || []);
    } catch (error) {
      console.error('Error loading checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!rdoId || !formData.item.trim()) {
      alert('Preencha o item do checklist');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('work_diary_checklist')
        .insert({
          work_diary_id: rdoId,
          item: formData.item,
          checked: false,
          observation: formData.observation || null
        });

      if (error) throw error;

      setFormData({ item: '', observation: '' });
      setShowForm(false);
      await loadChecklist();
    } catch (error) {
      console.error('Error adding checklist item:', error);
      alert('Erro ao adicionar item');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, currentChecked: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('work_diary_checklist')
        .update({ checked: !currentChecked })
        .eq('id', id);

      if (error) throw error;
      await loadChecklist();
    } catch (error) {
      console.error('Error toggling checklist item:', error);
      alert('Erro ao atualizar item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este item?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('work_diary_checklist')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadChecklist();
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      alert('Erro ao excluir item');
    } finally {
      setLoading(false);
    }
  };

  if (!rdoId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Salve o RDO primeiro para adicionar checklist
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: conktColors.text }}>
            Checklist
          </h3>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:opacity-90 transition-opacity text-white"
              style={{ backgroundColor: conktColors.primary.blue }}
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-6 p-4 border border-gray-300 rounded-lg bg-gray-50">
            <h4 className="font-semibold text-gray-700 mb-3">Novo item</h4>
            <div className="grid grid-cols-1 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.item}
                  onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  placeholder="Descrição do item"
                  style={{}}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observação
                </label>
                <textarea
                  value={formData.observation}
                  onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none"
                  placeholder="Observações adicionais..."
                  style={{}}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={loading || !formData.item.trim()}
                className="px-4 py-2 rounded-md text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: conktColors.primary.blue }}
              >
                Salvar
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormData({ item: '', observation: '' });
                }}
                className="btn-cancel"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          {loading && checklistItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : checklistItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 font-medium mb-1">Nenhum item no checklist</p>
              <p className="text-sm text-gray-500">
                Clique em "Adicionar" para incluir itens
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700 w-20">
                    Status
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Item
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Observação
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700 w-24">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {checklistItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3 text-center">
                      <label className="flex items-center justify-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => handleToggle(item.id, item.checked)}
                          disabled={loading}
                          className="w-5 h-5 rounded"
                          style={{ accentColor: conktColors.primary.blue }}
                        />
                      </label>
                    </td>
                    <td className={`border border-gray-300 px-4 py-3 text-gray-700 ${item.checked ? 'line-through text-gray-500' : ''}`}>
                      {item.item}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-gray-600 text-sm">
                      {item.observation || '-'}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={loading}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {checklistItems.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Progresso:</strong> {checklistItems.filter(i => i.checked).length} de {checklistItems.length} itens concluídos
              ({Math.round((checklistItems.filter(i => i.checked).length / checklistItems.length) * 100)}%)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
