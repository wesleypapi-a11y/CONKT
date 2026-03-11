import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, FileText, Download } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { ContractAttachment } from '../../types/contract';
import { useAuth } from '../../contexts/AuthContext';

interface ContractAnexosTabProps {
  contractId: string | null;
}

export default function ContractAnexosTab({ contractId }: ContractAnexosTabProps) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<ContractAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileType, setFileType] = useState<string>('outro');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (contractId) {
      loadAttachments();
    }
  }, [contractId]);

  const loadAttachments = async () => {
    if (!contractId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contract_attachments')
        .select('*')
        .eq('contract_id', contractId)
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
    if (!files || files.length === 0 || !contractId || !user) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const timestamp = Date.now();
        const fileName = `contracts/${user.id}/${contractId}/${timestamp}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('contract-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('contract-attachments')
          .getPublicUrl(fileName);

        const { error: dbError } = await supabase
          .from('contract_attachments')
          .insert({
            contract_id: contractId,
            file_name: file.name,
            file_path: publicUrl,
            file_size: file.size,
            file_type: fileType,
            created_by: user.id
          });

        if (dbError) throw dbError;
      }

      await loadAttachments();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFileType('outro');
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Erro ao fazer upload dos arquivos');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachment: ContractAttachment) => {
    if (!confirm('Deseja realmente excluir este arquivo?')) return;

    setLoading(true);
    try {
      const filePath = attachment.file_path.split('/').slice(-4).join('/');

      const { error: storageError } = await supabase.storage
        .from('contract-attachments')
        .remove([filePath]);

      if (storageError) console.error('Storage error:', storageError);

      const { error: dbError } = await supabase
        .from('contract_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      await loadAttachments();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Erro ao excluir arquivo');
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

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'escopo': return 'Escopo';
      case 'proposta': return 'Proposta';
      case 'orcamento': return 'Orçamento';
      case 'outro': return 'Outro';
      default: return type;
    }
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'escopo': return 'bg-blue-100 text-blue-800';
      case 'proposta': return 'bg-green-100 text-green-800';
      case 'orcamento': return 'bg-yellow-100 text-yellow-800';
      case 'outro': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!contractId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Salve o contrato primeiro para adicionar anexos
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4" style={{ color: conktColors.text }}>
          Anexos do Contrato
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Arquivo
            </label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{}}
            >
              <option value="escopo">Escopo</option>
              <option value="proposta">Proposta</option>
              <option value="orcamento">Orçamento</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload de Arquivo
            </label>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {uploading ? 'Enviando...' : 'Selecionar Arquivo'}
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading || loading}
            />
          </div>
        </div>

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
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-8 h-8 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {attachment.file_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getFileTypeColor(attachment.file_type)}`}>
                        {getFileTypeLabel(attachment.file_type)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(attachment.file_size)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(attachment.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.open(attachment.file_path, '_blank')}
                    className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(attachment)}
                    disabled={loading}
                    className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Excluir"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
