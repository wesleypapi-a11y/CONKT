import { useState, useEffect } from 'react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { WorkDiary } from '../../types/workDiary';
import { Work } from '../../types/work';
import { useAuth } from '../../contexts/AuthContext';

interface RDOInfoTabProps {
  rdo: Partial<WorkDiary>;
  onChange: (updates: Partial<WorkDiary>) => void;
}

export default function RDOInfoTab({ rdo, onChange }: RDOInfoTabProps) {
  const { user } = useAuth();
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(false);
  const [copyFromLast, setCopyFromLast] = useState(false);
  const [copyFromSpecific, setCopyFromSpecific] = useState(false);
  const [specificDate, setSpecificDate] = useState('');

  useEffect(() => {
    if (user) {
      loadWorks();
    }
  }, [user]);

  const loadWorks = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'em_andamento')
        .order('name', { ascending: true });

      if (error) throw error;
      setWorks(data || []);
    } catch (error) {
      console.error('Error loading works:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyFromLast = async () => {
    if (!rdo.work_id || !copyFromLast) return;

    try {
      const { data: lastRdo, error } = await supabase
        .from('work_diaries')
        .select('*')
        .eq('work_id', rdo.work_id)
        .order('report_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (lastRdo) {
        onChange({
          morning_weather: lastRdo.morning_weather,
          morning_condition: lastRdo.morning_condition,
          afternoon_weather: lastRdo.afternoon_weather,
          afternoon_condition: lastRdo.afternoon_condition,
          night_weather: lastRdo.night_weather,
          night_condition: lastRdo.night_condition,
          contractor: lastRdo.contractor,
          responsible: lastRdo.responsible
        });
        alert('Informações copiadas do último relatório!');
      } else {
        alert('Nenhum relatório anterior encontrado');
      }
    } catch (error) {
      console.error('Error copying from last:', error);
      alert('Erro ao copiar informações');
    }
  };

  const handleCopyFromSpecific = async () => {
    if (!rdo.work_id || !copyFromSpecific || !specificDate) return;

    try {
      const { data: specificRdo, error } = await supabase
        .from('work_diaries')
        .select('*')
        .eq('work_id', rdo.work_id)
        .eq('report_date', specificDate)
        .maybeSingle();

      if (error) throw error;
      if (specificRdo) {
        onChange({
          morning_weather: specificRdo.morning_weather,
          morning_condition: specificRdo.morning_condition,
          afternoon_weather: specificRdo.afternoon_weather,
          afternoon_condition: specificRdo.afternoon_condition,
          night_weather: specificRdo.night_weather,
          night_condition: specificRdo.night_condition,
          contractor: specificRdo.contractor,
          responsible: specificRdo.responsible
        });
        alert('Informações copiadas do relatório específico!');
      } else {
        alert('Nenhum relatório encontrado para esta data');
      }
    } catch (error) {
      console.error('Error copying from specific:', error);
      alert('Erro ao copiar informações');
    }
  };

  useEffect(() => {
    if (copyFromLast) {
      handleCopyFromLast();
    }
  }, [copyFromLast]);

  useEffect(() => {
    if (copyFromSpecific && specificDate) {
      handleCopyFromSpecific();
    }
  }, [copyFromSpecific, specificDate]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4" style={{ color: conktColors.text }}>
          Informações do relatório
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Selecione a obra <span className="text-red-500">*</span>
            </label>
            <select
              value={rdo.work_id || ''}
              onChange={(e) => onChange({ work_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{}}
              disabled={loading}
            >
              <option value="">Selecione uma obra...</option>
              {works.map((work) => (
                <option key={work.id} value={work.id}>
                  {work.name}
                </option>
              ))}
            </select>
            {works.length === 0 && !loading && (
              <p className="text-xs text-orange-600 mt-1">
                Nenhuma obra em andamento encontrada
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data do relatório <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={rdo.report_date || ''}
              onChange={(e) => onChange({ report_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{}}
            />
          </div>

          <div></div>

          <div className="md:col-span-2 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={copyFromLast}
                onChange={(e) => {
                  setCopyFromLast(e.target.checked);
                  if (e.target.checked) {
                    setCopyFromSpecific(false);
                  }
                }}
                className="w-4 h-4 rounded"
                style={{ accentColor: conktColors.primary.blue }}
                disabled={!rdo.work_id}
              />
              <span className="text-sm font-medium text-gray-700">
                Copiar informações do último relatório
              </span>
            </label>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyFromSpecific}
                  onChange={(e) => {
                    setCopyFromSpecific(e.target.checked);
                    if (e.target.checked) {
                      setCopyFromLast(false);
                    }
                  }}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: conktColors.primary.blue }}
                  disabled={!rdo.work_id}
                />
                <span className="text-sm font-medium text-gray-700">
                  Copiar de um relatório específico (data)
                </span>
              </label>
              {copyFromSpecific && (
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 text-sm"
                  style={{}}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
