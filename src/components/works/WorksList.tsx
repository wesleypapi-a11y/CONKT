import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Home } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Work } from '../../types/work';
import { conktColors } from '../../styles/colors';
import WorkModal from './WorkModal';

interface WorksListProps {
  onNavigateHome?: () => void;
}

export default function WorksList({ onNavigateHome }: WorksListProps) {
  const { user } = useAuth();
  const [works, setWorks] = useState<Work[]>([]);
  const [filteredWorks, setFilteredWorks] = useState<Work[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);

  useEffect(() => {
    if (user) {
      loadWorks();
    }
  }, [user]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredWorks(works);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredWorks(
        works.filter(
          (work) =>
            work.name.toLowerCase().includes(term) ||
            work.category?.toLowerCase().includes(term) ||
            work.status.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, works]);

  const loadWorks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorks(data || []);
      setFilteredWorks(data || []);
    } catch (error) {
      console.error('Error loading works:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewWork = () => {
    setSelectedWork(null);
    setIsModalOpen(true);
  };

  const handleEditWork = (work: Work) => {
    setSelectedWork(work);
    setIsModalOpen(true);
  };

  const handleDeleteWork = async (work: Work) => {
    if (!confirm(`Tem certeza que deseja arquivar a obra "${work.name}"?\n\nA obra será removida da lista mas seus dados serão mantidos.`)) return;

    try {
      const { error } = await supabase
        .from('works')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', work.id);

      if (error) {
        console.error('Error deleting work:', error);
        const errorMessage = error.message || 'Erro desconhecido';
        const errorDetails = error.details || '';
        const errorHint = error.hint || '';

        let fullMessage = `Erro ao arquivar obra:\n\n${errorMessage}`;
        if (errorDetails) fullMessage += `\n\nDetalhes: ${errorDetails}`;
        if (errorHint) fullMessage += `\n\nDica: ${errorHint}`;

        alert(fullMessage);
        return;
      }

      loadWorks();
      alert('Obra arquivada com sucesso!');
    } catch (error: any) {
      console.error('Error deleting work:', error);
      const errorMessage = error?.message || error?.toString() || 'Erro desconhecido';
      alert(`Erro ao arquivar obra:\n\n${errorMessage}`);
    }
  };

  const handleSaveWork = async () => {
    await loadWorks();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedWork(null);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pre_obra': 'Pré obra',
      'em_andamento': 'Em andamento',
      'em_orcamento': 'Em orçamento',
      'finalizada': 'Finalizada',
      'pos_obra': 'Pós-obra',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pre_obra': '#f59e0b',
      'em_andamento': '#10b981',
      'em_orcamento': '#3b82f6',
      'finalizada': '#6b7280',
      'pos_obra': '#8b5cf6',
    };
    return colors[status] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 relative">
        {onNavigateHome && (
          <button
            onClick={onNavigateHome}
            className="absolute top-0 right-0 z-10 p-3 rounded-lg shadow-lg hover:shadow-xl transition-all"
            style={{
              backgroundColor: conktColors.primary.blue,
              color: '#000000'
            }}
            title="Voltar ao Início"
          >
            <Home className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Pesquisar obras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{ borderColor: conktColors.primary.blue }}
            />
          </div>

          <button
            onClick={handleNewWork}
            className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
            style={{ backgroundColor: conktColors.primary.blue }}
          >
            <Plus size={20} />
            Nova Obra
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome da Obra
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo de produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Início
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredWorks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {searchTerm ? 'Nenhuma obra encontrada' : 'Nenhuma obra cadastrada'}
                  </td>
                </tr>
              ) : (
                filteredWorks.map((work) => (
                  <tr key={work.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {work.photo_url ? (
                          <img
                            src={work.photo_url}
                            alt={work.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded flex items-center justify-center text-white font-semibold"
                            style={{ backgroundColor: conktColors.primary.blue }}
                          >
                            {work.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{work.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {work.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-2 py-1 text-xs font-medium rounded-full text-white"
                        style={{ backgroundColor: getStatusColor(work.status) }}
                      >
                        {getStatusLabel(work.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {work.start_date
                        ? new Date(work.start_date).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditWork(work)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteWork(work)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <WorkModal
          work={selectedWork}
          onClose={handleCloseModal}
          onNavigateHome={onNavigateHome}
          onSave={handleSaveWork}
        />
      )}
    </>
  );
}
