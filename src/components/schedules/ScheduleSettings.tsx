import { useState } from 'react';
import { Plus, Trash2, Calendar, Check } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { Schedule, ScheduleHoliday } from '../../types/schedule';

interface ScheduleSettingsProps {
  schedule: Schedule;
  holidays: ScheduleHoliday[];
  onUpdate: () => void;
}

export default function ScheduleSettings({ schedule, holidays, onUpdate }: ScheduleSettingsProps) {
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleToggleWeekends = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('schedules')
        .update({
          consider_weekends: !schedule.consider_weekends,
          updated_at: new Date().toISOString()
        })
        .eq('id', schedule.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('Erro ao atualizar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!newHolidayDate || !newHolidayName.trim()) {
      alert('Preencha a data e o nome do feriado');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('schedule_holidays')
        .insert({
          schedule_id: schedule.id,
          holiday_date: newHolidayDate,
          name: newHolidayName
        });

      if (error) throw error;

      setNewHolidayDate('');
      setNewHolidayName('');
      onUpdate();
    } catch (error) {
      console.error('Error adding holiday:', error);
      alert('Erro ao adicionar feriado');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    if (!confirm('Deseja realmente excluir este feriado?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('schedule_holidays')
        .delete()
        .eq('id', holidayId);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      alert('Erro ao excluir feriado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Calendário</h3>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="considerWeekends"
              checked={schedule.consider_weekends}
              onChange={handleToggleWeekends}
              disabled={saving}
              className="w-4 h-4 rounded border-gray-300 focus:ring-2"
              style={{ accentColor: conktColors.primary.blue }}
            />
            <label htmlFor="considerWeekends" className="ml-3 text-sm font-medium text-gray-700">
              Considerar finais de semana nos cálculos
            </label>
          </div>

          <div className="text-sm text-gray-600">
            {schedule.consider_weekends ? (
              <div className="flex items-start gap-2 text-blue-700 bg-blue-50 p-3 rounded-md">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  Sábados e domingos estão sendo considerados como dias úteis para o cálculo de duração das tarefas.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-gray-700 bg-gray-50 p-3 rounded-md">
                <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  Apenas dias úteis (segunda a sexta) estão sendo considerados para o cálculo de duração das tarefas.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Feriados</h3>

        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{  }}
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Feriado</label>
              <input
                type="text"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                placeholder="Ex: Natal"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{  }}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddHoliday}
                disabled={saving}
                className="w-full px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#10B981', color: '#000000' }}
              >
                <Plus className="w-4 h-4" />
                Adicionar Feriado
              </button>
            </div>
          </div>
        </div>

        {holidays.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Nenhum feriado cadastrado</p>
            <p className="text-sm text-gray-400 mt-1">
              Feriados cadastrados não serão considerados como dias úteis
            </p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feriado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {holidays.map((holiday) => (
                  <tr key={holiday.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {new Date(holiday.holiday_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{holiday.name}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteHoliday(holiday.id)}
                        disabled={saving}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
