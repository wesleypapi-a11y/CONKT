import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Video as VideoIcon } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { WorkDiaryVideo } from '../../types/workDiary';
import { useAuth } from '../../contexts/AuthContext';

interface RDOVideosTabProps {
  rdoId: string | null;
}

export default function RDOVideosTab({ rdoId }: RDOVideosTabProps) {
  const { user } = useAuth();
  const [videos, setVideos] = useState<WorkDiaryVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<WorkDiaryVideo | null>(null);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const MAX_VIDEO_DURATION = 60; // 60 segundos

  useEffect(() => {
    if (rdoId) {
      loadVideos();
    }
  }, [rdoId]);

  const loadVideos = async () => {
    if (!rdoId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_diary_videos')
        .select('*')
        .eq('work_diary_id', rdoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateVideoDuration = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = Math.floor(video.duration);
        resolve(duration <= MAX_VIDEO_DURATION);
      };

      video.onerror = () => {
        resolve(false);
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !rdoId || !user) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!file.type.startsWith('video/')) {
          alert(`Arquivo ${file.name} não é um vídeo`);
          continue;
        }

        if (file.size > MAX_FILE_SIZE) {
          alert(`Arquivo ${file.name} excede o tamanho máximo de 100MB`);
          continue;
        }

        const isValidDuration = await validateVideoDuration(file);
        if (!isValidDuration) {
          alert(`O vídeo ${file.name} excede a duração máxima de ${MAX_VIDEO_DURATION} segundos`);
          continue;
        }

        const timestamp = Date.now();
        const fileName = `work_diaries/${rdoId}/videos/${timestamp}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('work-diary-videos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('work-diary-videos')
          .getPublicUrl(fileName);

        const { error: dbError } = await supabase
          .from('work_diary_videos')
          .insert({
            work_diary_id: rdoId,
            user_id: user.id,
            file_name: file.name,
            file_path: publicUrl,
            file_size: file.size
          });

        if (dbError) throw dbError;
      }

      await loadVideos();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading videos:', error);
      alert('Erro ao fazer upload dos vídeos');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateDescription = async () => {
    if (!selectedVideo) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('work_diary_videos')
        .update({ description })
        .eq('id', selectedVideo.id);

      if (error) throw error;

      setSelectedVideo(null);
      setDescription('');
      await loadVideos();
    } catch (error) {
      console.error('Error updating description:', error);
      alert('Erro ao atualizar descrição');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (video: WorkDiaryVideo) => {
    if (!confirm('Deseja realmente excluir este vídeo?')) return;

    setLoading(true);
    try {
      const filePath = video.file_path.split('/').slice(-4).join('/');

      const { error: storageError } = await supabase.storage
        .from('work-diary-videos')
        .remove([filePath]);

      if (storageError) console.error('Storage error:', storageError);

      const { error: dbError } = await supabase
        .from('work_diary_videos')
        .delete()
        .eq('id', video.id);

      if (dbError) throw dbError;

      await loadVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Erro ao excluir vídeo');
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

  if (!rdoId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Salve o RDO primeiro para adicionar vídeos
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4" style={{ color: arcoColors.text.primary }}>
          Vídeos
        </h3>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading || loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <VideoIcon className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Gravar Vídeo</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Upload Vídeo</span>
          </button>

          <input
            ref={cameraInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading || loading}
          />

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading || loading}
          />
        </div>

        {uploading && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 text-center">Enviando vídeos...</p>
          </div>
        )}

        {loading && videos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : videos.length === 0 ? (
          <div className="text-center py-8">
            <VideoIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 font-medium mb-1">Nenhum vídeo adicionado</p>
            <p className="text-sm text-gray-500">
              Use a área acima para fazer upload de vídeos
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map((video) => (
              <div
                key={video.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="bg-gray-100">
                  <video
                    src={video.file_path}
                    controls
                    className="w-full h-64 object-contain"
                  >
                    Seu navegador não suporta a tag de vídeo.
                  </video>
                </div>

                <div className="p-3">
                  <p className="text-sm font-medium text-gray-700 truncate mb-1">
                    {video.file_name}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    {formatFileSize(video.file_size)} • {new Date(video.created_at).toLocaleDateString('pt-BR')}
                  </p>

                  {video.description && (
                    <p className="text-sm text-gray-600 mb-2 italic">
                      "{video.description}"
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedVideo(video);
                        setDescription(video.description || '');
                      }}
                      className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Descrição
                    </button>
                    <button
                      onClick={() => handleDelete(video)}
                      disabled={loading}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h4 className="font-semibold text-gray-700 mb-3">Adicionar descrição</h4>
            <p className="text-sm text-gray-600 mb-3">{selectedVideo.file_name}</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none mb-3"
              placeholder="Descrição do vídeo..."
              style={{}}
            />
            <div className="flex gap-2">
              <button
                onClick={handleUpdateDescription}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-md text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: arcoColors.primary.blue }}
              >
                Salvar
              </button>
              <button
                onClick={() => {
                  setSelectedVideo(null);
                  setDescription('');
                }}
                className="btn-cancel flex-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
