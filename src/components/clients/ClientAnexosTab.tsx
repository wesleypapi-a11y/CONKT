import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, FileText, Download, FolderPlus, Folder, FolderOpen } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { ClientAttachment, ClientFolder } from '../../types/client';
import { useAuth } from '../../contexts/AuthContext';

interface ClientAnexosTabProps {
  clientId: string | null;
  onNavigateHome?: () => void;
}

export default function ClientAnexosTab({ clientId}: ClientAnexosTabProps) {
  const { user } = useAuth();
  const [folders, setFolders] = useState<ClientFolder[]>([]);
  const [attachments, setAttachments] = useState<ClientAttachment[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (clientId) {
      loadFolders();
      loadAttachments();
    }
  }, [clientId]);

  const loadFolders = async () => {
    if (!clientId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_folders')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttachments = async () => {
    if (!clientId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_attachments')
        .select('*')
        .eq('client_id', clientId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error loading attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !clientId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('client_folders')
        .insert({
          client_id: clientId,
          name: newFolderName.trim()
        });

      if (error) throw error;

      setNewFolderName('');
      setShowNewFolderInput(false);
      await loadFolders();
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Erro ao criar pasta');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Deseja realmente excluir esta pasta? Todos os arquivos dentro dela também serão excluídos.')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('client_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }

      await loadFolders();
      await loadAttachments();
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('Erro ao excluir pasta');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !clientId || !user) return;

    if (!selectedFolderId) {
      alert('Selecione uma pasta primeiro');
      return;
    }

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${clientId}/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('client-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('client-files')
          .getPublicUrl(fileName);

        const { error: dbError } = await supabase
          .from('client_attachments')
          .insert({
            client_id: clientId,
            folder_id: selectedFolderId,
            file_name: file.name,
            file_url: publicUrl,
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
      console.error('Error uploading files:', error);
      alert('Erro ao fazer upload dos arquivos');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachment: ClientAttachment) => {
    if (!confirm('Deseja realmente excluir este anexo?')) return;

    setLoading(true);
    try {
      const filePath = attachment.file_url.split('/').slice(-3).join('/');

      const { error: storageError } = await supabase.storage
        .from('client-files')
        .remove([filePath]);

      if (storageError) console.error('Storage error:', storageError);

      const { error: dbError } = await supabase
        .from('client_attachments')
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

  if (!clientId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Salve o cliente primeiro para adicionar anexos
      </div>
    );
  }

  const filteredAttachments = selectedFolderId
    ? attachments.filter(att => att.folder_id === selectedFolderId)
    : [];

  return (
    <div className="space-y-4 relative">
      <div className="flex gap-4">
        <div className="w-64 border border-gray-200 rounded-lg overflow-hidden bg-white">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Pastas</h3>
            <button
              onClick={() => setShowNewFolderInput(true)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              style={{ color: conktColors.primary.blue }}
              title="Nova Pasta"
            >
              <FolderPlus className="w-5 h-5" />
            </button>
          </div>

          <div className="p-2 max-h-96 overflow-y-auto">
            {showNewFolderInput && (
              <div className="mb-2 p-2 border border-gray-300 rounded">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nome da pasta"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded mb-2 focus:outline-none focus:ring-2"
                  style={{}}
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                    className="flex-1 px-2 py-1 text-xs text-white rounded hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: conktColors.primary.blue }}
                  >
                    Criar
                  </button>
                  <button
                    onClick={() => {
                      setShowNewFolderInput(false);
                      setNewFolderName('');
                    }}
                    className="btn-cancel flex-1 text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {loading && folders.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">Carregando...</div>
            ) : folders.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">Nenhuma pasta criada</p>
              </div>
            ) : (
              <div className="space-y-1">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                      selectedFolderId === folder.id
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {selectedFolderId === folder.id ? (
                        <FolderOpen className="w-4 h-4" style={{ color: conktColors.primary.blue }} />
                      ) : (
                        <Folder className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {folder.name}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id);
                      }}
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      title="Excluir pasta"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          {selectedFolderId && (
            <>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors mb-4"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  backgroundColor: uploading ? '#f3f4f6' : '#fafafa'
                }}
              >
                <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-1">
                  {uploading ? 'Enviando arquivos...' : 'Clique para adicionar arquivos nesta pasta'}
                </p>
                <p className="text-xs text-gray-500">
                  Todos os tipos de arquivo são aceitos
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading || loading}
                />
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-700">
                    Arquivos - {folders.find(f => f.id === selectedFolderId)?.name}
                  </h3>
                </div>

                {loading && filteredAttachments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Carregando...</div>
                ) : filteredAttachments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-orange-600 font-medium mb-1">Nenhum arquivo nesta pasta</p>
                    <p className="text-sm text-gray-500">
                      Use a área acima para fazer upload de arquivos
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {attachment.file_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(attachment.file_size)} • {' '}
                              {new Date(attachment.uploaded_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={attachment.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteAttachment(attachment)}
                            disabled={loading}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {!selectedFolderId && (
            <div className="border border-gray-200 rounded-lg p-8 text-center bg-white">
              <Folder className="w-16 h-16 mx-auto mb-3 text-gray-900" />
              <p className="text-gray-600 font-medium mb-1">Selecione uma pasta</p>
              <p className="text-sm text-gray-500">
                Escolha uma pasta ao lado para visualizar ou adicionar arquivos
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
