import { useState, useEffect } from 'react';
import { FileText, Calendar, Users, Sun, Cloud, CloudRain, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DiaryEntry {
  id: string;
  date: string;
  weather: string;
  temperature: string;
  activities_description: string;
  observations: string;
  labor_count: number;
  photos: string[];
  created_at: string;
}

interface ClientDiaryViewProps {
  workId: string;
}

export default function ClientDiaryView({ workId }: ClientDiaryViewProps) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [filterMonth, setFilterMonth] = useState<string>('');

  useEffect(() => {
    loadDiaryEntries();
  }, [workId]);

  const loadDiaryEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_diaries')
        .select('*')
        .eq('work_id', workId)
        .is('deleted_at', null)
        .order('date', { ascending: false });

      if (error) throw error;

      setEntries(data || []);
    } catch (error) {
      console.error('Erro ao carregar diário de obras:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (weather: string) => {
    if (weather?.toLowerCase().includes('chuva')) return <CloudRain className="w-5 h-5 text-blue-600" />;
    if (weather?.toLowerCase().includes('nublado')) return <Cloud className="w-5 h-5 text-gray-600" />;
    return <Sun className="w-5 h-5 text-yellow-600" />;
  };

  const filteredEntries = filterMonth
    ? entries.filter(entry => entry.date.startsWith(filterMonth))
    : entries;

  const months = Array.from(new Set(entries.map(e => e.date.substring(0, 7)))).sort().reverse();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Carregando diário de obras...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Nenhum registro de diário disponível para esta obra.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Filtrar por mês</h3>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os meses</option>
            {months.map(month => (
              <option key={month} value={month}>
                {new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => setSelectedEntry(entry)}
              className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer transition-all ${
                selectedEntry?.id === entry.id
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-800">
                    {new Date(entry.date).toLocaleDateString('pt-BR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                {getWeatherIcon(entry.weather)}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {entry.labor_count || 0} funcionários
                </div>
                {entry.photos && entry.photos.length > 0 && (
                  <div className="flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    {entry.photos.length} fotos
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedEntry ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
              <div className="border-b pb-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-gray-800">
                    {new Date(selectedEntry.date).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </h2>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    {getWeatherIcon(selectedEntry.weather)}
                    <span>{selectedEntry.weather}</span>
                  </div>
                  {selectedEntry.temperature && (
                    <span>{selectedEntry.temperature}°C</span>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{selectedEntry.labor_count || 0} funcionários</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Atividades Realizadas</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedEntry.activities_description || 'Nenhuma atividade registrada.'}
                </p>
              </div>

              {selectedEntry.observations && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Observações</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedEntry.observations}
                  </p>
                </div>
              )}

              {selectedEntry.photos && selectedEntry.photos.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Fotos ({selectedEntry.photos.length})</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedEntry.photos.map((photo, index) => (
                      <div key={index} className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={photo}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500">
                  Registro criado em {new Date(selectedEntry.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Selecione um registro à esquerda para ver os detalhes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
