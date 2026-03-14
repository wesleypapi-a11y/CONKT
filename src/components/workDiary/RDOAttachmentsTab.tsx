import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, FileText, Download, Paperclip, File } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { WorkDiaryAttachment } from '../../types/workDiary';
import { useAuth } from '../../contexts/AuthContext';

interface RDOAttachmentsTabProps {
  rdoId: string | null;
}

export default function RDOAttachmentsTab({ rdoId }: RDOAttachmentsTabProps) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<WorkDiaryAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (rdoId) {
      loadAttachments();
    }
  }, [rdoId]);

  const loadAttachments = async () => {
    if (!rdoId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_diary_attachments')
        .select('*')
        .eq('work_diary_id', rdoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error loading attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !rdoId || !user) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const fileName = `work_diaries/${rdoId}/attachments/${timestamp}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('work-diary-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('work-diary-attachments')
          .getPublicUrl(fileName);

        const { error: dbError } = await supabase
          .from('work_diary_attachments')
          .insert({
            work_diary_id: rdoId,
            user_id: user.id,
            file_name: file.name,
            file_path: publicUrl,
            file_size: file.size,
            file_type: file.type
          });

        if (dbError) throw dbError;
      }

      await loadAttachments();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading attachments:', error);
      alert('Erro ao fazer upload dos anexos');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachment: WorkDiaryAttachment) => {
    if (!confirm('Deseja realmente excluir este anexo?')) return;

    setLoading(true);
    try {
      const filePath = attachment.file_path.split('/').slice(-4).join('/');

      const { error: storageError } = await supabase.storage
        .from('work-diary-attachments')
        .remove([filePath]);

      if (storageError) console.error('Storage error:', storageError);

      const { error: dbError } = await supabase
        .from('work_diary_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      await loadAttachments();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Erro ao excluir anexo');
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

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <FileText className="w-5 h-5 text-gray-400" />;

    if (fileType.startsWith('image/')) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    } else if (fileType.startsWith('video/')) {
      return <FileText className="w-5 h-5 text-purple-500" />;
    } else if (fileType.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return <FileText className="w-5 h-5 text-green-600" />;
    } else {
      return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  if (!rdoId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Salve o RDO primeiro para adicionar anexos
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4" style={{ color: arcoColors.text.primary }}>
          Anexos
        </h3>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
        >
          <Paperclip className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Upload Arquivo</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading || loading}
        />

        {uploading && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 text-center">Enviando arquivos...</p>
          </div>
        )}

        {loading && attachments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 font-medium mb-1">Nenhum anexo adicionado</p>
            <p className="text-sm text-gray-500">
              Use a área acima para fazer upload de arquivos
            </p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Arquivo
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Tamanho
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Data
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {attachments.map((attachment) => (
                  <tr key={attachment.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3">
                      <div className="flex items-center gap-3">
                        {getFileIcon(attachment.file_type)}
                        <span className="text-sm text-gray-700 truncate">
                          {attachment.file_name}
                        </span>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-600">
                      {formatFileSize(attachment.file_size)}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-600">
                      {new Date(attachment.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <a
                          href={attachment.file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(attachment)}
                          disabled={loading}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
