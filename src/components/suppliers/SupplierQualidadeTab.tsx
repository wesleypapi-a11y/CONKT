import { useState, useEffect } from 'react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { SupplierQuality } from '../../types/supplier';

interface SupplierQualidadeTabProps {
  supplierId: string | null;
}

export default function SupplierQualidadeTab({ supplierId }: SupplierQualidadeTabProps) {
  const [loading, setLoading] = useState(false);
  const [quality, setQuality] = useState<Partial<SupplierQuality>>({
    rating: 0,
    qualified: false,
    occurrence_history: ''
  });

  useEffect(() => {
    if (supplierId) {
      loadQuality();
    }
  }, [supplierId]);

  const loadQuality = async () => {
    if (!supplierId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('supplier_quality')
        .select('*')
        .eq('supplier_id', supplierId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setQuality(data);
      }
    } catch (error) {
      console.error('Error loading quality:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!supplierId) {
      alert('Salve o fornecedor primeiro');
      return;
    }

    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('supplier_quality')
        .select('id')
        .eq('supplier_id', supplierId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('supplier_quality')
          .update(quality)
          .eq('supplier_id', supplierId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('supplier_quality')
          .insert({
            supplier_id: supplierId,
            ...quality
          });

        if (error) throw error;
      }

      alert('Avaliação de qualidade salva com sucesso!');
      await loadQuality();
    } catch (error) {
      console.error('Error saving quality:', error);
      alert('Erro ao salvar avaliação de qualidade');
    } finally {
      setLoading(false);
    }
  };

  if (!supplierId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Salve o fornecedor primeiro para avaliar a qualidade
      </div>
    );
  }

  const ratings = [];
  for (let i = 0; i <= 5; i += 0.5) {
    ratings.push(i);
  }

  return (
    <div className="space-y-4 relative">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nota de avaliação</label>
          <select
            value={quality.rating || 0}
            onChange={(e) => setQuality({ ...quality, rating: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            style={{}}
          >
            {ratings.map((rating) => (
              <option key={rating} value={rating}>
                {rating.toFixed(1)}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Escala de 0.0 a 5.0
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status de qualificação</label>
          <div className="flex gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="qualified"
                checked={!quality.qualified}
                onChange={() => setQuality({ ...quality, qualified: false })}
                className="w-4 h-4"
                style={{ accentColor: '#ef4444' }}
              />
              <span className="text-sm text-gray-700">Não qualificado</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="qualified"
                checked={quality.qualified}
                onChange={() => setQuality({ ...quality, qualified: true })}
                className="w-4 h-4"
                style={{ accentColor: '#10b981' }}
              />
              <span className="text-sm text-gray-700">Qualificado</span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Histórico de ocorrências
        </label>
        <textarea
          value={quality.occurrence_history || ''}
          onChange={(e) => setQuality({ ...quality, occurrence_history: e.target.value })}
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none"
          placeholder="Registre aqui ocorrências de qualidade, problemas, atrasos, reclamações, elogios e outras observações relevantes sobre o fornecedor..."
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Dicas para avaliação:</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Mantenha um histórico detalhado de todas as interações</li>
          <li>Documente problemas de qualidade e suas resoluções</li>
          <li>Registre prazos de entrega e cumprimento de acordos</li>
          <li>Avalie regularmente e atualize a nota conforme o desempenho</li>
        </ul>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 rounded-md text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: arcoColors.primary.blue }}
        >
          {loading ? 'Salvando...' : 'Salvar avaliação'}
        </button>
      </div>
    </div>
  );
}
