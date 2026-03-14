import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Image as ImageIcon, Camera } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { WorkDiaryPhoto } from '../../types/workDiary';
import { useAuth } from '../../contexts/AuthContext';

interface RDOPhotosTabProps {
  rdoId: string | null;
}

export default function RDOPhotosTab({ rdoId }: RDOPhotosTabProps) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<WorkDiaryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<WorkDiaryPhoto | null>(null);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (rdoId) {
      loadPhotos();
    }
  }, [rdoId]);

  const loadPhotos = async () => {
    if (!rdoId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_diary_photos')
        .select('*')
        .eq('work_diary_id', rdoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const maxDimension = 1920;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.8
          );
        };
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !rdoId || !user) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!file.type.startsWith('image/')) {
          alert(`Arquivo ${file.name} não é uma imagem`);
          continue;
        }

        const compressedFile = await compressImage(file);

        const timestamp = Date.now();
        const fileName = `work_diaries/${rdoId}/photos/${timestamp}_${compressedFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from('work-diary-photos')
          .upload(fileName, compressedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('work-diary-photos')
          .getPublicUrl(fileName);

        const { error: dbError } = await supabase
          .from('work_diary_photos')
          .insert({
            work_diary_id: rdoId,
            user_id: user.id,
            file_name: compressedFile.name,
            file_path: publicUrl,
            file_size: compressedFile.size
          });

        if (dbError) throw dbError;
      }

      await loadPhotos();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Erro ao fazer upload das fotos');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateDescription = async () => {
    if (!selectedPhoto) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('work_diary_photos')
        .update({ description })
        .eq('id', selectedPhoto.id);

      if (error) throw error;

      setSelectedPhoto(null);
      setDescription('');
      await loadPhotos();
    } catch (error) {
      console.error('Error updating description:', error);
      alert('Erro ao atualizar descrição');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (photo: WorkDiaryPhoto) => {
    if (!confirm('Deseja realmente excluir esta foto?')) return;

    setLoading(true);
    try {
      const filePath = photo.file_path.split('/').slice(-4).join('/');

      const { error: storageError } = await supabase.storage
        .from('work-diary-photos')
        .remove([filePath]);

      if (storageError) console.error('Storage error:', storageError);

      const { error: dbError } = await supabase
        .from('work_diary_photos')
        .delete()
        .eq('id', photo.id);

      if (dbError) throw dbError;

      await loadPhotos();
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Erro ao excluir foto');
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
        Salve o RDO primeiro para adicionar fotos
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4" style={{ color: arcoColors.text.primary }}>
          Fotos
        </h3>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading || loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Tirar Foto</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Upload Foto</span>
          </button>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading || loading}
          />

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading || loading}
          />
        </div>

        {uploading && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 text-center">Enviando fotos...</p>
          </div>
        )}

        {loading && photos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : photos.length === 0 ? (
          <div className="text-center py-8">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 font-medium mb-1">Nenhuma foto adicionada</p>
            <p className="text-sm text-gray-500">
              Use a área acima para fazer upload de fotos
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-48 overflow-hidden bg-gray-100 flex items-center justify-center">
                  <img
                    src={photo.file_path}
                    alt={photo.file_name}
                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => window.open(photo.file_path, '_blank')}
                  />
                </div>

                <div className="p-3">
                  <p className="text-sm font-medium text-gray-700 truncate mb-1">
                    {photo.file_name}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    {formatFileSize(photo.file_size)} • {new Date(photo.created_at).toLocaleDateString('pt-BR')}
                  </p>

                  {photo.description && (
                    <p className="text-sm text-gray-600 mb-2 italic">
                      "{photo.description}"
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedPhoto(photo);
                        setDescription(photo.description || '');
                      }}
                      className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Descrição
                    </button>
                    <button
                      onClick={() => handleDelete(photo)}
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

      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h4 className="font-semibold text-gray-700 mb-3">Adicionar descrição</h4>
            <img
              src={selectedPhoto.file_path}
              alt={selectedPhoto.file_name}
              className="w-full h-48 object-cover rounded-lg mb-3"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none mb-3"
              placeholder="Descrição da foto..."
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
                  setSelectedPhoto(null);
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
