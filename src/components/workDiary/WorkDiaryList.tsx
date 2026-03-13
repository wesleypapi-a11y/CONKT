import { useState, useEffect } from 'react';
import { Plus, Home, FileText, ArrowLeft, CreditCard as Edit2, Trash2, Camera, Video, Paperclip } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { Work } from '../../types/work';
import { WorkDiary } from '../../types/workDiary';
import { Client } from '../../types/client';
import { useAuth } from '../../contexts/AuthContext';
import RDOModal from './RDOModal';
import WorkModal from '../works/WorkModal';
import WorkOverview from './WorkOverview';

interface RDOWithCounts extends WorkDiary {
  photos_count: number;
  videos_count: number;
  attachments_count: number;
}

interface WorkDiaryListProps {
  onNavigateHome: () => void;
}

type ViewMode = 'works' | 'work-overview' | 'rdos' | 'rdo-form';

export default function WorkDiaryList({ onNavigateHome }: WorkDiaryListProps) {
  const { user } = useAuth();
  const [works, setWorks] = useState<Work[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(false);
  const [rdoModalOpen, setRdoModalOpen] = useState(false);
  const [workModalOpen, setWorkModalOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [selectedWorkId, setSelectedWorkId] = useState<string | undefined>();
  const [selectedRdoId, setSelectedRdoId] = useState<string | undefined>();
  const [rdos, setRdos] = useState<RDOWithCounts[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('works');
  const [rdoViewOnly, setRdoViewOnly] = useState(false);

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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorks(data || []);

      const clientIds = [...new Set(data?.filter(w => w.client_id).map(w => w.client_id) as string[])];
      if (clientIds.length > 0) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('*')
          .in('id', clientIds);

        if (clientsData) {
          const clientsMap: Record<string, Client> = {};
          clientsData.forEach(client => {
            clientsMap[client.id] = client;
          });
          setClients(clientsMap);
        }
      }
    } catch (error) {
      console.error('Error loading works:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRdos = async (workId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_diaries')
        .select('*')
        .eq('work_id', workId)
        .order('report_date', { ascending: false });

      if (error) throw error;

      const rdosWithCounts = await Promise.all(
        (data || []).map(async (rdo) => {
          const [photosResult, videosResult, attachmentsResult] = await Promise.all([
            supabase.from('work_diary_photos').select('id', { count: 'exact', head: true }).eq('work_diary_id', rdo.id),
            supabase.from('work_diary_videos').select('id', { count: 'exact', head: true }).eq('work_diary_id', rdo.id),
            supabase.from('work_diary_attachments').select('id', { count: 'exact', head: true }).eq('work_diary_id', rdo.id)
          ]);

          return {
            ...rdo,
            photos_count: photosResult.count || 0,
            videos_count: videosResult.count || 0,
            attachments_count: attachmentsResult.count || 0
          };
        })
      );

      setRdos(rdosWithCounts);
    } catch (error) {
      console.error('Error loading RDOs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkClick = (work: Work) => {
    setSelectedWork(work);
    setSelectedWorkId(work.id);
    setViewMode('work-overview');
  };

  const handleAddWork = () => {
    setSelectedWork(null);
    setWorkModalOpen(true);
  };

  const handleEditWork = () => {
    if (selectedWork) {
      setWorkModalOpen(true);
    }
  };

  const handleAddRDO = () => {
    setSelectedRdoId(undefined);
    setRdoViewOnly(false);
    setRdoModalOpen(true);
  };

  const handleRdoClick = (rdoId: string, viewOnly: boolean = false) => {
    setSelectedRdoId(rdoId);
    setRdoViewOnly(viewOnly);
    setRdoModalOpen(true);
  };

  const handleBackToWorks = () => {
    setViewMode('works');
    setSelectedWork(null);
    setSelectedWorkId(undefined);
    setRdos([]);
  };

  const handleWorkSave = async () => {
    // Sempre recarrega a lista de obras para sincronizar a foto
    await loadWorks();

    // Se estiver na view de RDOs ou work-overview, também recarrega a obra selecionada
    if ((viewMode === 'rdos' || viewMode === 'work-overview') && selectedWorkId) {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .eq('id', selectedWorkId)
        .single();

      if (!error && data) {
        setSelectedWork(data);
      }
    }
  };

  const handleWorkModalClose = () => {
    setWorkModalOpen(false);
  };

  const handleRdoModalClose = () => {
    setRdoModalOpen(false);
    setSelectedRdoId(undefined);
    if (selectedWorkId) {
      loadRdos(selectedWorkId);
    }
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

  const getRdoStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'preenchendo': 'Preenchendo',
      'revisar': 'Revisar',
      'aprovado': 'Aprovado',
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  // View: WorkOverview da obra selecionada
  if (viewMode === 'work-overview' && selectedWork) {
    return (
      <>
        <WorkOverview
          work={selectedWork}
          onNavigateBack={() => setViewMode('works')}
          onEditWork={() => setWorkModalOpen(true)}
          onDeleteWork={async () => {
            try {
              const { error } = await supabase
                .from('works')
                .delete()
                .eq('id', selectedWork.id);

              if (error) throw error;

              alert('Obra excluída com sucesso!');
              setViewMode('works');
              loadWorks();
            } catch (error) {
              console.error('Error deleting work:', error);
              alert('Erro ao excluir obra');
            }
          }}
          onViewAllReports={() => {
            if (selectedWorkId) {
              loadRdos(selectedWorkId);
            }
            setViewMode('rdos');
          }}
          onOpenReport={(rdoId) => {
            setSelectedRdoId(rdoId);
            setRdoModalOpen(true);
          }}
        />

        {workModalOpen && (
          <WorkModal
            work={selectedWork}
            onClose={handleWorkModalClose}
            onNavigateHome={onNavigateHome}
            onSave={handleWorkSave}
          />
        )}

        {rdoModalOpen && (
          <RDOModal
            isOpen={rdoModalOpen}
            onClose={handleRdoModalClose}
            rdoId={selectedRdoId}
            preSelectedWorkId={selectedWorkId}
            viewOnly={rdoViewOnly}
          />
        )}
      </>
    );
  }

  // View: Lista de RDOs da obra selecionada
  if (viewMode === 'rdos' && selectedWork) {
    return (
      <div className="flex flex-col h-full relative">
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

        {/* Header da lista de RDOs */}
        <div className="flex items-center justify-between gap-4 mb-4 pr-16">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToWorks}
              className="px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
              style={{
                backgroundColor: conktColors.neutral.gray300,
                color: '#1F2937'
              }}
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </button>

            <h2 className="text-2xl font-bold text-gray-800">
              RDOs - {selectedWork.name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEditWork}
              className="p-2 rounded-md hover:opacity-90 transition-opacity"
              style={{
                backgroundColor: conktColors.primary.blue,
                color: '#000000'
              }}
              title="Editar Obra"
            >
              <Edit2 className="w-5 h-5" />
            </button>

            <button
              onClick={async () => {
                if (selectedWork && confirm('Deseja realmente excluir esta obra?')) {
                  try {
                    const { error } = await supabase
                      .from('works')
                      .delete()
                      .eq('id', selectedWork.id);

                    if (error) throw error;

                    alert('Obra excluída com sucesso!');
                    setViewMode('works');
                    loadWorks();
                  } catch (error) {
                    console.error('Error deleting work:', error);
                    alert('Erro ao excluir obra');
                  }
                }
              }}
              className="p-2 rounded-md hover:opacity-90 transition-opacity"
              style={{
                backgroundColor: '#ef4444',
                color: '#000000'
              }}
              title="Excluir Obra"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <button
              onClick={handleAddRDO}
              className="px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
              style={{
                backgroundColor: conktColors.primary.green,
                color: '#000000'
              }}
            >
              <Plus className="w-5 h-5" />
              Novo RDO
            </button>
          </div>
        </div>

        {/* Lista de RDOs */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500">Carregando RDOs...</div>
          ) : rdos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <FileText className="w-12 h-12 mb-3 text-gray-400" />
              <p className="text-gray-600 mb-1">Nenhum RDO cadastrado</p>
              <p className="text-sm text-gray-500 mb-4">
                Comece adicionando o primeiro RDO desta obra
              </p>
              <button
                onClick={handleAddRDO}
                className="px-6 py-3 rounded-md font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                style={{
                  backgroundColor: conktColors.primary.green,
                  color: '#000000'
                }}
              >
                <Plus className="w-5 h-5" />
                Novo RDO
              </button>
            </div>
          ) : (
            <div className="overflow-auto flex-1 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rdos.map((rdo) => (
                  <div
                    key={rdo.id}
                    className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:shadow-2xl hover:border-blue-300 transition-all duration-300 cursor-pointer relative group"
                    onClick={() => handleRdoClick(rdo.id, true)}
                  >
                    <div className="absolute top-3 right-3 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRdoClick(rdo.id, false);
                        }}
                        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg transition-colors"
                        title="Editar RDO"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm('Deseja realmente excluir este RDO?')) {
                            try {
                              const { error } = await supabase
                                .from('work_diaries')
                                .delete()
                                .eq('id', rdo.id);

                              if (error) throw error;

                              alert('RDO excluído com sucesso!');
                              if (selectedWorkId) {
                                loadRdos(selectedWorkId);
                              }
                            } catch (error) {
                              console.error('Error deleting RDO:', error);
                              alert('Erro ao excluir RDO');
                            }
                          }
                        }}
                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-colors"
                        title="Excluir RDO"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div
                      className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-gray-900"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold">
                          #{rdo.report_number}
                        </span>
                        <div
                          className="px-3 py-1 rounded-full text-xs font-bold bg-white bg-opacity-20 backdrop-blur-sm"
                        >
                          {getRdoStatusLabel(rdo.status)}
                        </div>
                      </div>
                      <div className="text-sm opacity-90">
                        {formatDate(rdo.report_date)}
                      </div>
                      <div className="text-xs opacity-75 mt-1">
                        {rdo.day_of_week}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center justify-around py-3 bg-gray-50 rounded-lg">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <Camera size={18} className="text-blue-500" />
                            <span className="text-lg font-bold text-gray-800">
                              {rdo.photos_count}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">Fotos</span>
                        </div>

                        <div className="w-px h-8 bg-gray-300"></div>

                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <Video size={18} className="text-purple-500" />
                            <span className="text-lg font-bold text-gray-800">
                              {rdo.videos_count}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">Vídeos</span>
                        </div>

                        <div className="w-px h-8 bg-gray-300"></div>

                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <Paperclip size={18} className="text-green-500" />
                            <span className="text-lg font-bold text-gray-800">
                              {rdo.attachments_count}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">Anexos</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>Dias decorridos: <strong>{rdo.elapsed_days || 0}</strong></span>
                          <span>Restantes: <strong>{rdo.remaining_days || 0}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {workModalOpen && (
          <WorkModal
            work={selectedWork}
            onClose={handleWorkModalClose}
            onNavigateHome={onNavigateHome}
            onSave={handleWorkSave}
          />
        )}

        {rdoModalOpen && (
          <RDOModal
            isOpen={rdoModalOpen}
            onClose={handleRdoModalClose}
            rdoId={selectedRdoId}
            preSelectedWorkId={selectedWorkId}
            viewOnly={rdoViewOnly}
          />
        )}
      </div>
    );
  }

  // View: Lista de Obras (view padrão)
  return (
    <div className="flex flex-col h-full relative">
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

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={handleAddWork}
          className="px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{
            backgroundColor: conktColors.primary.blue,
            color: '#1F2937'
          }}
        >
          <Plus className="w-5 h-5" />
          Obra
        </button>

        <button
          onClick={handleAddRDO}
          className="px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-all shadow-md"
          style={{
            backgroundColor: conktColors.primary.green,
            color: '#000000'
          }}
        >
          <Plus className="w-5 h-5" />
          RDO
        </button>
      </div>

      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">Carregando obras...</div>
        ) : works.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <FileText className="w-12 h-12 mb-3 text-gray-400" />
            <p className="text-gray-600 mb-1">Nenhuma obra cadastrada</p>
            <p className="text-sm text-gray-500">
              Comece adicionando sua primeira obra
            </p>
          </div>
        ) : (
          <div className="overflow-auto flex-1 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {works.map((work) => (
                <div
                  key={work.id}
                  className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-gray-300 transition-all duration-200 flex flex-col"
                >
                  <div className="h-48 overflow-hidden bg-gray-100 flex items-center justify-center relative group">
                    {work.photo_url ? (
                      <img
                        src={work.photo_url}
                        alt={work.name}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => handleWorkClick(work)}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-white text-3xl font-bold cursor-pointer"
                        style={{ backgroundColor: conktColors.primary.blue }}
                        onClick={() => handleWorkClick(work)}
                      >
                        {work.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Ícones de ação no canto superior direito */}
                    <div className="absolute top-2 right-2 flex gap-2 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWork(work);
                          setWorkModalOpen(true);
                        }}
                        className="p-2 rounded-lg shadow-lg hover:shadow-xl transition-all"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" style={{ color: conktColors.primary.blue }} />
                      </button>

                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm('Deseja realmente excluir esta obra?')) {
                            try {
                              const { error } = await supabase
                                .from('works')
                                .delete()
                                .eq('id', work.id);

                              if (error) throw error;

                              alert('Obra excluída com sucesso!');
                              loadWorks();
                            } catch (error) {
                              console.error('Error deleting work:', error);
                              alert('Erro ao excluir obra');
                            }
                          }
                        }}
                        className="p-2 rounded-lg shadow-lg hover:shadow-xl transition-all"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
                      </button>
                    </div>

                  </div>

                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">
                      {work.client_id && clients[work.client_id] ? clients[work.client_id].name : work.name}
                    </h3>

                    {work.work_address && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                        {work.work_address}
                      </p>
                    )}

                    <div className="mt-auto pt-2">
                      <span
                        className="inline-block px-3 py-1 text-xs font-semibold rounded-full text-white"
                        style={{ backgroundColor: getStatusColor(work.status) }}
                      >
                        {getStatusLabel(work.status)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {workModalOpen && (
        <WorkModal
          work={selectedWork}
          onClose={handleWorkModalClose}
          onNavigateHome={onNavigateHome}
          onSave={handleWorkSave}
        />
      )}

      {rdoModalOpen && (
        <RDOModal
          isOpen={rdoModalOpen}
          onClose={handleRdoModalClose}
          preSelectedWorkId={selectedWorkId}
          viewOnly={rdoViewOnly}
        />
      )}
    </div>
  );
}
