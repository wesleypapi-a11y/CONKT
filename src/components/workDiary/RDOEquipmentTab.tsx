import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { WorkDiaryEquipment } from '../../types/workDiary';
import { useAuth } from '../../contexts/AuthContext';

interface RDOEquipmentTabProps {
  rdoId: string | null;
}

export default function RDOEquipmentTab({ rdoId }: RDOEquipmentTabProps) {
  const { user } = useAuth();
  const [equipmentList, setEquipmentList] = useState<WorkDiaryEquipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState('');

  useEffect(() => {
    if (rdoId) {
      loadEquipment();
    }
  }, [rdoId]);

  const loadEquipment = async () => {
    if (!rdoId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_diary_equipment')
        .select('*')
        .eq('work_diary_id', rdoId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setEquipmentList(data || []);
    } catch (error) {
      console.error('Error loading equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!rdoId || !user || !name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('work_diary_equipment')
        .insert({
          work_diary_id: rdoId,
          user_id: user.id,
          name: name.trim(),
          quantity,
          observation: observation.trim()
        });

      if (error) throw error;

      setName('');
      setQuantity(1);
      setObservation('');
      await loadEquipment();
    } catch (error) {
      console.error('Error adding equipment:', error);
      alert('Erro ao adicionar equipamento');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este item?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('work_diary_equipment')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadEquipment();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      alert('Erro ao excluir equipamento');
    } finally {
      setLoading(false);
    }
  };

  if (!rdoId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Salve o RDO primeiro para adicionar equipamentos
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Equipamento
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do equipamento"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantidade
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observação
          </label>
          <textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Observações..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleAdd}
          disabled={loading || !name.trim()}
          className="px-4 py-2 rounded-md text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: conktColors.primary.blue }}
        >
          Adicionar
        </button>

        <div className="mt-6 overflow-x-auto">
          {loading && equipmentList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : equipmentList.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 font-medium">Nenhum equipamento adicionado</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Equipamento
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Quantidade
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Observação
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {equipmentList.map((equipment) => (
                  <tr key={equipment.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3 text-gray-700">
                      {equipment.name}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-gray-700">
                      {equipment.quantity}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-gray-600 text-sm">
                      {equipment.observation || '-'}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(equipment.id)}
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
      </div>
    </div>
  );
}
