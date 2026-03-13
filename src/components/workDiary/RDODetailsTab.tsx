import { useState, useEffect } from 'react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { WorkDiary } from '../../types/workDiary';
import { Work } from '../../types/work';

interface RDODetailsTabProps {
  rdo: Partial<WorkDiary>;
}

export default function RDODetailsTab({ rdo }: RDODetailsTabProps) {
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rdo.work_id) {
      loadWork();
    }
  }, [rdo.work_id]);

  const loadWork = async () => {
    if (!rdo.work_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .eq('id', rdo.work_id)
        .maybeSingle();

      if (error) throw error;
      setWork(data);
    } catch (error) {
      console.error('Error loading work:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateElapsedDays = () => {
    if (!work?.start_date || !rdo.report_date) return 0;
    const startDate = new Date(work.start_date);
    const reportDate = new Date(rdo.report_date);
    const diffTime = reportDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const calculateRemainingDays = () => {
    if (!work?.duration) return 0;
    const elapsed = calculateElapsedDays();
    return Math.max(0, work.duration - elapsed);
  };

  const getDayOfWeek = () => {
    if (!rdo.report_date) return '-';
    const date = new Date(rdo.report_date);
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return days[date.getDay()];
  };

  if (!rdo.work_id) {
    return (
      <div className="text-center py-8 text-gray-500">
        Selecione uma obra na aba "Informações" para visualizar os detalhes
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Carregando detalhes...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4" style={{ color: conktColors.text.primary }}>
          Detalhes do relatório
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Relatório n°
            </label>
            <input
              type="text"
              value={rdo.report_number || '-'}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data
            </label>
            <input
              type="text"
              value={rdo.report_date ? new Date(rdo.report_date).toLocaleDateString('pt-BR') : '-'}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dia da semana
            </label>
            <input
              type="text"
              value={getDayOfWeek()}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              N° do contrato
            </label>
            <input
              type="text"
              value={work?.cno || '-'}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Obra
            </label>
            <input
              type="text"
              value={work?.name || '-'}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prazo contratual (dias)
            </label>
            <input
              type="text"
              value={work?.duration || '-'}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endereço
            </label>
            <input
              type="text"
              value={work?.work_address ?
                `${work.work_address}${work.work_number ? ', ' + work.work_number : ''}${work.work_neighborhood ? ' - ' + work.work_neighborhood : ''}`
                : '-'}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prazo decorrido (dias)
            </label>
            <input
              type="text"
              value={calculateElapsedDays()}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prazo a vencer (dias)
            </label>
            <input
              type="text"
              value={calculateRemainingDays()}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contratante
            </label>
            <input
              type="text"
              value={work?.contractor || '-'}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsável
            </label>
            <input
              type="text"
              value={work?.work_manager || '-'}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
            />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Estes detalhes são calculados automaticamente com base na obra selecionada e na data do relatório.
          Para alterar estas informações, edite o cadastro da obra.
        </p>
      </div>
    </div>
  );
}
