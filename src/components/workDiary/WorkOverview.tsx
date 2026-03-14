import React, { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, Video, Paperclip, ArrowLeft, CreditCard as Edit2, Trash2, AlertTriangle, MessageSquare, Printer } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { Work } from '../../types/work';
import { supabase } from '../../lib/supabase';
import { generateRDOPDF, generateBatchRDOPDF } from '../../utils/rdoPdfGenerator';

interface WorkOverviewProps {
  work: Work;
  onNavigateBack: () => void;
  onOpenReport: (rdoId: string) => void;
}

type MenuItemType = 'overview' | 'reports' | 'photos' | 'videos' | 'attachments' | 'occurrences' | 'comments';

interface Stats {
  works: number;
  reports: number;
  photos: number;
  videos: number;
  attachments: number;
  occurrences: number;
  comments: number;
}

const WorkOverview: React.FC<WorkOverviewProps> = ({
  work,
  onNavigateBack,
  onOpenReport
}) => {
  const [activeMenu, setActiveMenu] = useState<MenuItemType>('overview');
  const [stats, setStats] = useState<Stats>({
    works: 1,
    reports: 0,
    photos: 0,
    videos: 0,
    attachments: 0,
    occurrences: 0,
    comments: 0
  });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadStats();
  }, [work.id]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { count: rdoCount } = await supabase
        .from('work_diaries')
        .select('*', { count: 'exact', head: true })
        .eq('work_id', work.id);

      const { data: rdos } = await supabase
        .from('work_diaries')
        .select('id')
        .eq('work_id', work.id);

      const rdoIds = rdos?.map(rdo => rdo.id) || [];

      if (rdoIds.length === 0) {
        setStats({
          works: 1,
          reports: rdoCount || 0,
          photos: 0,
          videos: 0,
          attachments: 0,
          occurrences: 0,
          comments: 0
        });
        setLoading(false);
        return;
      }

      const { count: photosCount } = await supabase
        .from('work_diary_photos')
        .select('*', { count: 'exact', head: true })
        .in('work_diary_id', rdoIds);

      const { count: videosCount } = await supabase
        .from('work_diary_videos')
        .select('*', { count: 'exact', head: true })
        .in('work_diary_id', rdoIds);

      const { count: attachmentsCount } = await supabase
        .from('work_diary_attachments')
        .select('*', { count: 'exact', head: true })
        .in('work_diary_id', rdoIds);

      const { count: occurrencesCount } = await supabase
        .from('work_diary_occurrences')
        .select('*', { count: 'exact', head: true })
        .in('work_diary_id', rdoIds);

      const { count: commentsCount } = await supabase
        .from('work_diary_comments')
        .select('*', { count: 'exact', head: true })
        .in('work_diary_id', rdoIds);

      setStats({
        works: 1,
        reports: rdoCount || 0,
        photos: photosCount || 0,
        videos: videosCount || 0,
        attachments: attachmentsCount || 0,
        occurrences: occurrencesCount || 0,
        comments: commentsCount || 0
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  

  return (
    <div style={{ height: '100vh', backgroundColor: '#f8f9fa', overflowY: 'auto' }}>
      {/* Botão Voltar */}
      <div style={{ padding: '20px' }}>
        <button
          onClick={onNavigateBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: '#4285f4',
            color: arcoColors.neutral.white,
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(66, 133, 244, 0.2)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#357ae8';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(66, 133, 244, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#4285f4';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(66, 133, 244, 0.2)';
          }}
        >
          <ArrowLeft size={18} />
          Voltar
        </button>
      </div>

      {/* Área Principal */}
      <div style={{ padding: '0 40px 40px 40px' }}>
        <h1
          style={{
            margin: '0 0 40px 0',
            fontSize: '28px',
            fontWeight: 700,
            color: arcoColors.neutral.gray900
          }}
        >
          Visão Geral
        </h1>


        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: arcoColors.neutral.gray400 }}>
            Carregando...
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '16px'
              }}
            >
            {/* Card Total de RDOs */}
            <div
              onClick={() => setActiveMenu('reports')}
              style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                borderRadius: '12px',
                padding: '20px',
                color: arcoColors.neutral.white,
                boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(168, 85, 247, 0.3)';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FileText size={20} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, opacity: 0.9 }}>
                  Total de RDOs
                </div>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700 }}>{stats.reports}</div>
            </div>

            {/* Card Total de Fotos */}
            <div
              onClick={() => setActiveMenu('photos')}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '12px',
                padding: '20px',
                color: arcoColors.neutral.white,
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <ImageIcon size={20} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, opacity: 0.9 }}>
                  Total de Fotos
                </div>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700 }}>{stats.photos}</div>
            </div>

            {/* Card Total de Vídeos */}
            <div
              onClick={() => setActiveMenu('videos')}
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                borderRadius: '12px',
                padding: '20px',
                color: arcoColors.neutral.white,
                boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(249, 115, 22, 0.3)';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Video size={20} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, opacity: 0.9 }}>
                  Total de Vídeos
                </div>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700 }}>{stats.videos}</div>
            </div>

            {/* Card Total de Anexos */}
            <div
              onClick={() => setActiveMenu('attachments')}
              style={{
                background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                borderRadius: '12px',
                padding: '20px',
                color: arcoColors.neutral.white,
                boxShadow: '0 2px 8px rgba(236, 72, 153, 0.3)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(236, 72, 153, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(236, 72, 153, 0.3)';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Paperclip size={20} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, opacity: 0.9 }}>
                  Total de Anexos
                </div>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700 }}>{stats.attachments}</div>
            </div>

            {/* Card Total de Ocorrências */}
            <div
              onClick={() => setActiveMenu('occurrences')}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '12px',
                padding: '20px',
                color: arcoColors.neutral.white,
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(245, 158, 11, 0.3)';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <AlertTriangle size={20} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, opacity: 0.9 }}>
                  Total de Ocorrências
                </div>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700 }}>{stats.occurrences}</div>
            </div>

            {/* Card Total de Comentários */}
            <div
              onClick={() => setActiveMenu('comments')}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: '12px',
                padding: '20px',
                color: arcoColors.neutral.white,
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <MessageSquare size={20} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, opacity: 0.9 }}>
                  Total de Comentários
                </div>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700 }}>{stats.comments}</div>
            </div>
            </div>

            {/* Filtro de Período - Mostrar apenas quando algum card for clicado */}
            {activeMenu !== 'overview' && (
              <div
                style={{
                  marginTop: '32px',
                  padding: '24px',
                  backgroundColor: arcoColors.neutral.white,
                  borderRadius: '12px',
                  border: `1px solid ${arcoColors.neutral.gray200}`,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}
              >
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: arcoColors.neutral.gray900, marginBottom: '16px' }}>
                Filtrar por Período
              </h3>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: arcoColors.neutral.gray700, marginBottom: '8px' }}>
                    Data Inicial
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${arcoColors.neutral.gray300}`,
                      fontSize: '14px',
                      color: arcoColors.neutral.gray900,
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                  />
                </div>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: arcoColors.neutral.gray700, marginBottom: '8px' }}>
                    Data Final
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${arcoColors.neutral.gray300}`,
                      fontSize: '14px',
                      color: arcoColors.neutral.gray900,
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                  />
                </div>
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: arcoColors.neutral.gray100,
                    color: arcoColors.neutral.gray700,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = arcoColors.neutral.gray200;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = arcoColors.neutral.gray100;
                  }}
                >
                  Limpar Filtros
                </button>
              </div>
              </div>
            )}

            {/* Exibir conteúdo baseado no menu ativo */}
            {activeMenu === 'reports' && (
              <div style={{ marginTop: '40px' }}>
                <ReportsView workId={work.id} startDate={startDate} endDate={endDate} onOpenReport={onOpenReport} />
              </div>
            )}

            {activeMenu === 'photos' && (
              <div style={{ marginTop: '40px' }}>
                <PhotosView workId={work.id} startDate={startDate} endDate={endDate} />
              </div>
            )}

            {activeMenu === 'videos' && (
              <div style={{ marginTop: '40px' }}>
                <VideosView workId={work.id} startDate={startDate} endDate={endDate} />
              </div>
            )}

            {activeMenu === 'attachments' && (
              <div style={{ marginTop: '40px' }}>
                <AttachmentsView workId={work.id} startDate={startDate} endDate={endDate} />
              </div>
            )}

            {activeMenu === 'occurrences' && (
              <div style={{ marginTop: '40px' }}>
                <OccurrencesView workId={work.id} startDate={startDate} endDate={endDate} />
              </div>
            )}

            {activeMenu === 'comments' && (
              <div style={{ marginTop: '40px' }}>
                <CommentsView workId={work.id} startDate={startDate} endDate={endDate} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const ReportsView: React.FC<{ workId: string; startDate: string; endDate: string; onOpenReport: (rdoId: string) => void }> = ({ workId, startDate, endDate, onOpenReport }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedReports, setGroupedReports] = useState<Record<string, any[]>>({});
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadReports();
  }, [workId, startDate, endDate]);

  const toggleReportSelection = (reportId: string) => {
    const newSelected = new Set(selectedReports);
    if (newSelected.has(reportId)) {
      newSelected.delete(reportId);
    } else {
      newSelected.add(reportId);
    }
    setSelectedReports(newSelected);
  };

  const handleDeleteReport = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este RDO?')) {
      try {
        const { error } = await supabase
          .from('work_diaries')
          .delete()
          .eq('id', reportId);

        if (error) throw error;
        loadReports();
      } catch (error) {
        console.error('Erro ao excluir RDO:', error);
        alert('Erro ao excluir o RDO');
      }
    }
  };

  const handlePrintReport = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await generateRDOPDF(reportId);
  };

  const toggleSelectAll = () => {
    if (selectedReports.size === reports.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(reports.map(r => r.id)));
    }
  };

  const handlePrintBatch = async () => {
    if (selectedReports.size === 0) {
      alert('Selecione pelo menos um RDO para imprimir');
      return;
    }
    await generateBatchRDOPDF(Array.from(selectedReports));
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data: reportsData, error: reportsError } = await supabase
        .from('work_diaries')
        .select('*')
        .eq('work_id', workId)
        .order('report_date', { ascending: false });

      if (reportsError) throw reportsError;

      let filteredReports = reportsData || [];

      if (startDate || endDate) {
        filteredReports = filteredReports.filter((report) => {
          const reportDate = new Date(report.report_date);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;

          if (start && reportDate < start) return false;
          if (end) {
            const endOfDay = new Date(end);
            endOfDay.setHours(23, 59, 59, 999);
            if (reportDate > endOfDay) return false;
          }
          return true;
        });
      }

      const rdoIds = filteredReports.map(r => r.id);

      let photoCounts: Record<string, number> = {};
      let videoCounts: Record<string, number> = {};
      let attachmentCounts: Record<string, number> = {};

      if (rdoIds.length > 0) {
        const [photosData, videosData, attachmentsData] = await Promise.all([
          supabase.from('work_diary_photos').select('work_diary_id').in('work_diary_id', rdoIds),
          supabase.from('work_diary_videos').select('work_diary_id').in('work_diary_id', rdoIds),
          supabase.from('work_diary_attachments').select('work_diary_id').in('work_diary_id', rdoIds)
        ]);

        photosData.data?.forEach(p => {
          photoCounts[p.work_diary_id] = (photoCounts[p.work_diary_id] || 0) + 1;
        });

        videosData.data?.forEach(v => {
          videoCounts[v.work_diary_id] = (videoCounts[v.work_diary_id] || 0) + 1;
        });

        attachmentsData.data?.forEach(a => {
          attachmentCounts[a.work_diary_id] = (attachmentCounts[a.work_diary_id] || 0) + 1;
        });
      }

      const reportsWithCounts = filteredReports.map(report => ({
        ...report,
        photos_count: photoCounts[report.id] || 0,
        videos_count: videoCounts[report.id] || 0,
        attachments_count: attachmentCounts[report.id] || 0
      }));

      setReports(reportsWithCounts);

      const grouped = reportsWithCounts.reduce((acc: Record<string, any[]>, report) => {
        const date = new Date(report.report_date).toLocaleDateString('pt-BR');
        if (!acc[date]) acc[date] = [];
        acc[date].push(report);
        return acc;
      }, {});

      setGroupedReports(grouped);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: arcoColors.neutral.gray400 }}>Carregando RDOs...</div>;
  }

  if (reports.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <FileText size={48} style={{ margin: '0 auto 16px', color: arcoColors.neutral.gray400 }} />
        <p style={{ color: arcoColors.neutral.gray600, fontSize: '16px', fontWeight: 600 }}>Nenhum RDO encontrado</p>
        <p style={{ color: arcoColors.neutral.gray500, fontSize: '14px', marginTop: '8px' }}>
          Os RDOs criados para esta obra aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: arcoColors.neutral.gray900, margin: 0 }}>
          Todos os RDOs da Obra
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={toggleSelectAll}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#4285f4',
              color: arcoColors.neutral.white,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#357ae8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4285f4';
            }}
          >
            {selectedReports.size === reports.length && reports.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </button>
          <button
            onClick={handlePrintBatch}
            disabled={selectedReports.size === 0}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: selectedReports.size === 0 ? arcoColors.neutral.gray300 : '#f59e0b',
              color: arcoColors.neutral.white,
              fontSize: '14px',
              fontWeight: 600,
              cursor: selectedReports.size === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (selectedReports.size > 0) {
                e.currentTarget.style.backgroundColor = '#d97706';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedReports.size > 0) {
                e.currentTarget.style.backgroundColor = '#f59e0b';
              }
            }}
          >
            Imprimir em Lote ({selectedReports.size})
          </button>
        </div>
      </div>
      {Object.keys(groupedReports).map(date => (
        <div key={date} style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: arcoColors.neutral.gray700, marginBottom: '12px', paddingBottom: '8px', borderBottom: `2px solid ${arcoColors.neutral.gray200}` }}>
            {date}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', backgroundColor: arcoColors.neutral.gray200, borderRadius: '8px', overflow: 'hidden' }}>
            {groupedReports[date].map((report, index) => (
              <div
                key={report.id}
                style={{
                  padding: '14px 16px',
                  backgroundColor: arcoColors.neutral.white,
                  borderTop: index > 0 ? `1px solid ${arcoColors.neutral.gray200}` : 'none',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedReports.has(report.id)}
                  onChange={() => toggleReportSelection(report.id)}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: '#4285f4'
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: arcoColors.neutral.gray900 }}>
                      RDO #{report.report_number}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 400, color: arcoColors.neutral.gray600 }}>
                      {new Date(report.report_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ImageIcon size={14} style={{ color: '#4285f4' }} />
                      <span style={{ fontSize: '12px', fontWeight: 500, color: arcoColors.neutral.gray700 }}>
                        {report.photos_count}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Video size={14} style={{ color: '#9333ea' }} />
                      <span style={{ fontSize: '12px', fontWeight: 500, color: arcoColors.neutral.gray700 }}>
                        {report.videos_count}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Paperclip size={14} style={{ color: '#10b981' }} />
                      <span style={{ fontSize: '12px', fontWeight: 500, color: arcoColors.neutral.gray700 }}>
                        {report.attachments_count}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => onOpenReport(report.id)}
                    style={{
                      padding: '6px',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: 'transparent',
                      color: '#4285f4',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e3f2fd';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={(e) => handlePrintReport(report.id, e)}
                    style={{
                      padding: '6px',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: 'transparent',
                      color: '#f59e0b',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fef3c7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Printer size={18} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteReport(report.id, e)}
                    style={{
                      padding: '6px',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: 'transparent',
                      color: '#dc2626',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fee2e2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const PhotosView: React.FC<{ workId: string; startDate: string; endDate: string }> = ({ workId, startDate, endDate }) => {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedPhotos, setGroupedPhotos] = useState<Record<string, any[]>>({});

  useEffect(() => {
    loadPhotos();
  }, [workId, startDate, endDate]);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const { data: rdos, error: rdoError } = await supabase
        .from('work_diaries')
        .select('id')
        .eq('work_id', workId);

      if (rdoError) throw rdoError;

      if (!rdos || rdos.length === 0) {
        setPhotos([]);
        setGroupedPhotos({});
        setLoading(false);
        return;
      }

      const rdoIds = rdos.map(rdo => rdo.id);

      const { data: photosData, error: photosError } = await supabase
        .from('work_diary_photos')
        .select('*')
        .in('work_diary_id', rdoIds)
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;

      let filteredPhotos = photosData || [];

      if (startDate || endDate) {
        filteredPhotos = filteredPhotos.filter((photo) => {
          const photoDate = new Date(photo.created_at);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;

          if (start && photoDate < start) return false;
          if (end) {
            const endOfDay = new Date(end);
            endOfDay.setHours(23, 59, 59, 999);
            if (photoDate > endOfDay) return false;
          }
          return true;
        });
      }

      setPhotos(filteredPhotos);

      const grouped = filteredPhotos.reduce((acc: Record<string, any[]>, photo) => {
        const date = new Date(photo.created_at).toLocaleDateString('pt-BR');
        if (!acc[date]) acc[date] = [];
        acc[date].push(photo);
        return acc;
      }, {});

      setGroupedPhotos(grouped);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: arcoColors.neutral.gray400 }}>Carregando fotos...</div>;
  }

  if (photos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <ImageIcon size={48} style={{ margin: '0 auto 16px', color: arcoColors.neutral.gray400 }} />
        <p style={{ color: arcoColors.neutral.gray600, fontSize: '16px', fontWeight: 600 }}>Nenhuma foto encontrada</p>
        <p style={{ color: arcoColors.neutral.gray500, fontSize: '14px', marginTop: '8px' }}>
          As fotos adicionadas aos RDOs desta obra aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: arcoColors.neutral.gray900, marginBottom: '24px' }}>
        Todas as Fotos da Obra
      </h2>
      {Object.keys(groupedPhotos).map(date => (
        <div key={date} style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: arcoColors.neutral.gray700, marginBottom: '16px', borderBottom: `2px solid ${arcoColors.neutral.gray200}`, paddingBottom: '8px' }}>
            {date}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {groupedPhotos[date].map(photo => (
              <div
                key={photo.id}
                style={{
                  border: `1px solid ${arcoColors.neutral.gray200}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => window.open(photo.file_path, '_blank')}
              >
                <img
                  src={photo.file_path}
                  alt={photo.file_name}
                  style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                />
                <div style={{ padding: '12px' }}>
                  <p style={{ fontSize: '12px', color: arcoColors.neutral.gray600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {photo.file_name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const VideosView: React.FC<{ workId: string; startDate: string; endDate: string }> = ({ workId, startDate, endDate }) => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedVideos, setGroupedVideos] = useState<Record<string, any[]>>({});

  useEffect(() => {
    loadVideos();
  }, [workId, startDate, endDate]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const { data: rdos, error: rdoError } = await supabase
        .from('work_diaries')
        .select('id')
        .eq('work_id', workId);

      if (rdoError) throw rdoError;

      if (!rdos || rdos.length === 0) {
        setVideos([]);
        setGroupedVideos({});
        setLoading(false);
        return;
      }

      const rdoIds = rdos.map(rdo => rdo.id);

      const { data: videosData, error: videosError } = await supabase
        .from('work_diary_videos')
        .select('*')
        .in('work_diary_id', rdoIds)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;

      let filteredVideos = videosData || [];

      if (startDate || endDate) {
        filteredVideos = filteredVideos.filter((video) => {
          const videoDate = new Date(video.created_at);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;

          if (start && videoDate < start) return false;
          if (end) {
            const endOfDay = new Date(end);
            endOfDay.setHours(23, 59, 59, 999);
            if (videoDate > endOfDay) return false;
          }
          return true;
        });
      }

      setVideos(filteredVideos);

      const grouped = filteredVideos.reduce((acc: Record<string, any[]>, video) => {
        const date = new Date(video.created_at).toLocaleDateString('pt-BR');
        if (!acc[date]) acc[date] = [];
        acc[date].push(video);
        return acc;
      }, {});

      setGroupedVideos(grouped);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: arcoColors.neutral.gray400 }}>Carregando vídeos...</div>;
  }

  if (videos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <Video size={48} style={{ margin: '0 auto 16px', color: arcoColors.neutral.gray400 }} />
        <p style={{ color: arcoColors.neutral.gray600, fontSize: '16px', fontWeight: 600 }}>Nenhum vídeo encontrado</p>
        <p style={{ color: arcoColors.neutral.gray500, fontSize: '14px', marginTop: '8px' }}>
          Os vídeos adicionados aos RDOs desta obra aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: arcoColors.neutral.gray900, marginBottom: '24px' }}>
        Todos os Vídeos da Obra
      </h2>
      {Object.keys(groupedVideos).map(date => (
        <div key={date} style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: arcoColors.neutral.gray700, marginBottom: '16px', borderBottom: `2px solid ${arcoColors.neutral.gray200}`, paddingBottom: '8px' }}>
            {date}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {groupedVideos[date].map(video => (
              <div
                key={video.id}
                style={{
                  border: `1px solid ${arcoColors.neutral.gray200}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  padding: '16px',
                  backgroundColor: arcoColors.neutral.white
                }}
              >
                <video
                  controls
                  style={{ width: '100%', borderRadius: '4px', marginBottom: '12px' }}
                >
                  <source src={video.file_path} type="video/mp4" />
                </video>
                <p style={{ fontSize: '12px', color: arcoColors.neutral.gray600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {video.file_name}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const AttachmentsView: React.FC<{ workId: string; startDate: string; endDate: string }> = ({ workId, startDate, endDate }) => {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedAttachments, setGroupedAttachments] = useState<Record<string, any[]>>({});

  useEffect(() => {
    loadAttachments();
  }, [workId, startDate, endDate]);

  const loadAttachments = async () => {
    setLoading(true);
    try {
      const { data: rdos, error: rdoError } = await supabase
        .from('work_diaries')
        .select('id')
        .eq('work_id', workId);

      if (rdoError) throw rdoError;

      if (!rdos || rdos.length === 0) {
        setAttachments([]);
        setGroupedAttachments({});
        setLoading(false);
        return;
      }

      const rdoIds = rdos.map(rdo => rdo.id);

      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('work_diary_attachments')
        .select('*')
        .in('work_diary_id', rdoIds)
        .order('created_at', { ascending: false });

      if (attachmentsError) throw attachmentsError;

      let filteredAttachments = attachmentsData || [];

      if (startDate || endDate) {
        filteredAttachments = filteredAttachments.filter((attachment) => {
          const attachmentDate = new Date(attachment.created_at);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;

          if (start && attachmentDate < start) return false;
          if (end) {
            const endOfDay = new Date(end);
            endOfDay.setHours(23, 59, 59, 999);
            if (attachmentDate > endOfDay) return false;
          }
          return true;
        });
      }

      setAttachments(filteredAttachments);

      const grouped = filteredAttachments.reduce((acc: Record<string, any[]>, attachment) => {
        const date = new Date(attachment.created_at).toLocaleDateString('pt-BR');
        if (!acc[date]) acc[date] = [];
        acc[date].push(attachment);
        return acc;
      }, {});

      setGroupedAttachments(grouped);
    } catch (error) {
      console.error('Error loading attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: arcoColors.neutral.gray400 }}>Carregando anexos...</div>;
  }

  if (attachments.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <Paperclip size={48} style={{ margin: '0 auto 16px', color: arcoColors.neutral.gray400 }} />
        <p style={{ color: arcoColors.neutral.gray600, fontSize: '16px', fontWeight: 600 }}>Nenhum anexo encontrado</p>
        <p style={{ color: arcoColors.neutral.gray500, fontSize: '14px', marginTop: '8px' }}>
          Os anexos adicionados aos RDOs desta obra aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: arcoColors.neutral.gray900, marginBottom: '24px' }}>
        Todos os Anexos da Obra
      </h2>
      {Object.keys(groupedAttachments).map(date => (
        <div key={date} style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: arcoColors.neutral.gray700, marginBottom: '16px', borderBottom: `2px solid ${arcoColors.neutral.gray200}`, paddingBottom: '8px' }}>
            {date}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            {groupedAttachments[date].map(attachment => (
              <div
                key={attachment.id}
                style={{
                  border: `1px solid ${arcoColors.neutral.gray200}`,
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: arcoColors.neutral.white,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => window.open(attachment.file_path, '_blank')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: arcoColors.neutral.gray100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Paperclip size={20} style={{ color: arcoColors.neutral.gray600 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: arcoColors.neutral.gray900, margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {attachment.file_name}
                    </p>
                    <p style={{ fontSize: '12px', color: arcoColors.neutral.gray500, margin: 0 }}>
                      {formatFileSize(attachment.file_size)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const OccurrencesView: React.FC<{ workId: string; startDate: string; endDate: string }> = ({ workId, startDate, endDate }) => {
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedOccurrences, setGroupedOccurrences] = useState<Record<string, any[]>>({});

  useEffect(() => {
    loadOccurrences();
  }, [workId, startDate, endDate]);

  const loadOccurrences = async () => {
    setLoading(true);
    try {
      const { data: rdos, error: rdoError } = await supabase
        .from('work_diaries')
        .select('id')
        .eq('work_id', workId);

      if (rdoError) throw rdoError;

      if (!rdos || rdos.length === 0) {
        setOccurrences([]);
        setGroupedOccurrences({});
        setLoading(false);
        return;
      }

      const rdoIds = rdos.map(rdo => rdo.id);

      const { data: occurrencesData, error: occurrencesError } = await supabase
        .from('work_diary_occurrences')
        .select('*')
        .in('work_diary_id', rdoIds)
        .order('created_at', { ascending: false });

      if (occurrencesError) throw occurrencesError;

      let filteredOccurrences = occurrencesData || [];

      if (startDate || endDate) {
        filteredOccurrences = filteredOccurrences.filter((occurrence) => {
          const occurrenceDate = new Date(occurrence.created_at);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;

          if (start && occurrenceDate < start) return false;
          if (end) {
            const endOfDay = new Date(end);
            endOfDay.setHours(23, 59, 59, 999);
            if (occurrenceDate > endOfDay) return false;
          }
          return true;
        });
      }

      setOccurrences(filteredOccurrences);

      const grouped = filteredOccurrences.reduce((acc: Record<string, any[]>, occurrence) => {
        const date = new Date(occurrence.created_at).toLocaleDateString('pt-BR');
        if (!acc[date]) acc[date] = [];
        acc[date].push(occurrence);
        return acc;
      }, {});

      setGroupedOccurrences(grouped);
    } catch (error) {
      console.error('Error loading occurrences:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: arcoColors.neutral.gray400 }}>Carregando ocorrências...</div>;
  }

  if (occurrences.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <AlertTriangle size={48} style={{ margin: '0 auto 16px', color: arcoColors.neutral.gray400 }} />
        <p style={{ color: arcoColors.neutral.gray600, fontSize: '16px', fontWeight: 600 }}>Nenhuma ocorrência encontrada</p>
        <p style={{ color: arcoColors.neutral.gray500, fontSize: '14px', marginTop: '8px' }}>
          As ocorrências adicionadas aos RDOs desta obra aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: arcoColors.neutral.gray900, marginBottom: '24px' }}>
        Todas as Ocorrências da Obra
      </h2>
      {Object.keys(groupedOccurrences).map(date => (
        <div key={date} style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: arcoColors.neutral.gray700, marginBottom: '16px', paddingBottom: '12px', borderBottom: `2px solid ${arcoColors.neutral.gray200}` }}>
            {date}
          </h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            {groupedOccurrences[date].map((occurrence) => (
              <div
                key={occurrence.id}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: arcoColors.neutral.white,
                  border: `1px solid ${arcoColors.neutral.gray200}`,
                  transition: 'all 0.2s',
                  cursor: 'default'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: arcoColors.neutral.gray900, margin: '0 0 8px 0' }}>
                      {occurrence.title || 'Sem título'}
                    </p>
                    <p style={{ fontSize: '13px', color: arcoColors.neutral.gray600, margin: 0, lineHeight: '1.5' }}>
                      {occurrence.description || 'Sem descrição'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const CommentsView: React.FC<{ workId: string; startDate: string; endDate: string }> = ({ workId, startDate, endDate }) => {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedComments, setGroupedComments] = useState<Record<string, any[]>>({});

  useEffect(() => {
    loadComments();
  }, [workId, startDate, endDate]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const { data: rdos, error: rdoError } = await supabase
        .from('work_diaries')
        .select('id')
        .eq('work_id', workId);

      if (rdoError) throw rdoError;

      if (!rdos || rdos.length === 0) {
        setComments([]);
        setGroupedComments({});
        setLoading(false);
        return;
      }

      const rdoIds = rdos.map(rdo => rdo.id);

      const { data: commentsData, error: commentsError } = await supabase
        .from('work_diary_comments')
        .select('*')
        .in('work_diary_id', rdoIds)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      let filteredComments = commentsData || [];

      if (startDate || endDate) {
        filteredComments = filteredComments.filter((comment) => {
          const commentDate = new Date(comment.created_at);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;

          if (start && commentDate < start) return false;
          if (end) {
            const endOfDay = new Date(end);
            endOfDay.setHours(23, 59, 59, 999);
            if (commentDate > endOfDay) return false;
          }
          return true;
        });
      }

      setComments(filteredComments);

      const grouped = filteredComments.reduce((acc: Record<string, any[]>, comment) => {
        const date = new Date(comment.created_at).toLocaleDateString('pt-BR');
        if (!acc[date]) acc[date] = [];
        acc[date].push(comment);
        return acc;
      }, {});

      setGroupedComments(grouped);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: arcoColors.neutral.gray400 }}>Carregando comentários...</div>;
  }

  if (comments.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <MessageSquare size={48} style={{ margin: '0 auto 16px', color: arcoColors.neutral.gray400 }} />
        <p style={{ color: arcoColors.neutral.gray600, fontSize: '16px', fontWeight: 600 }}>Nenhum comentário encontrado</p>
        <p style={{ color: arcoColors.neutral.gray500, fontSize: '14px', marginTop: '8px' }}>
          Os comentários adicionados aos RDOs desta obra aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: arcoColors.neutral.gray900, marginBottom: '24px' }}>
        Todos os Comentários da Obra
      </h2>
      {Object.keys(groupedComments).map(date => (
        <div key={date} style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: arcoColors.neutral.gray700, marginBottom: '16px', paddingBottom: '12px', borderBottom: `2px solid ${arcoColors.neutral.gray200}` }}>
            {date}
          </h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            {groupedComments[date].map((comment) => (
              <div
                key={comment.id}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: arcoColors.neutral.white,
                  border: `1px solid ${arcoColors.neutral.gray200}`,
                  transition: 'all 0.2s',
                  cursor: 'default'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MessageSquare size={20} style={{ color: '#3b82f6' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', color: arcoColors.neutral.gray600, margin: 0, lineHeight: '1.5' }}>
                      {comment.comment || 'Sem comentário'}
                    </p>
                    {comment.author && (
                      <p style={{ fontSize: '12px', color: arcoColors.neutral.gray500, margin: '8px 0 0 0', fontStyle: 'italic' }}>
                        — {comment.author}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default WorkOverview;
