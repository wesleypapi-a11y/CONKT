import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../hooks/useAlert';
import {
  FolderPlus,
  Upload,
  Folder,
  FileText,
  Trash2,
  Download,
  ChevronRight,
  Home
} from 'lucide-react';

interface CompanyFolder {
  id: string;
  nome: string;
  parent_id: string | null;
  created_at: string;
  created_by: string;
}

interface CompanyFile {
  name: string;
  id: string;
  created_at: string;
  metadata: {
    size: number;
    mimetype: string;
  };
}

export function CompanyFilesManager() {
  const { user, profile } = useAuth();
  const { showAlert } = useAlert();
  const [folders, setFolders] = useState<CompanyFolder[]>([]);
  const [files, setFiles] = useState<CompanyFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<CompanyFolder[]>([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadFolders();
    loadFiles();
  }, [currentFolderId]);

  const loadFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('company_folders')
        .select('*')
        .is('parent_id', currentFolderId)
        .order('nome');

      if (error) throw error;
      setFolders(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar pastas:', error);
    }
  };

  const loadFiles = async () => {
    try {
      const folderPrefix = currentFolderId ? `${currentFolderId}/` : '';
      const { data, error } = await supabase.storage
        .from('company-files')
        .list(folderPrefix, {
          limit: 100,
          offset: 0,
        });

      if (error) throw error;
      setFiles(data?.filter(file => file.name !== '.emptyFolderPlaceholder') || []);
    } catch (error: any) {
      console.error('Erro ao carregar arquivos:', error);
    }
  };

  const buildFolderPath = async (folderId: string | null) => {
    if (!folderId) {
      setFolderPath([]);
      return;
    }

    const path: CompanyFolder[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const { data } = await supabase
        .from('company_folders')
        .select('*')
        .eq('id', currentId)
        .single();

      if (data) {
        path.unshift(data);
        currentId = data.parent_id;
      } else {
        break;
      }
    }

    setFolderPath(path);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      showAlert('Digite um nome para a pasta', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('company_folders')
        .insert({
          nome: newFolderName,
          parent_id: currentFolderId,
          created_by: user?.id,
        });

      if (error) throw error;

      showAlert('Pasta criada com sucesso!', 'success');
      setNewFolderName('');
      setShowNewFolderModal(false);
      loadFolders();
    } catch (error: any) {
      showAlert('Erro ao criar pasta', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

    if (!allowedTypes.includes(file.type)) {
      showAlert('Apenas arquivos PDF, JPG, JPEG e PNG são permitidos', 'error');
      return;
    }

    setUploading(true);
    try {
      const filePath = currentFolderId
        ? `${currentFolderId}/${file.name}`
        : file.name;

      const { error } = await supabase.storage
        .from('company-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      showAlert('Arquivo enviado com sucesso!', 'success');
      loadFiles();
    } catch (error: any) {
      showAlert('Erro ao enviar arquivo', 'error');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta pasta?')) return;

    try {
      const { error } = await supabase
        .from('company_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      showAlert('Pasta excluída com sucesso!', 'success');
      loadFolders();
    } catch (error: any) {
      showAlert('Erro ao excluir pasta', 'error');
      console.error(error);
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este arquivo?')) return;

    try {
      const filePath = currentFolderId
        ? `${currentFolderId}/${fileName}`
        : fileName;

      const { error } = await supabase.storage
        .from('company-files')
        .remove([filePath]);

      if (error) throw error;

      showAlert('Arquivo excluído com sucesso!', 'success');
      loadFiles();
    } catch (error: any) {
      showAlert('Erro ao excluir arquivo', 'error');
      console.error(error);
    }
  };

  const handleDownloadFile = async (fileName: string) => {
    try {
      const filePath = currentFolderId
        ? `${currentFolderId}/${fileName}`
        : fileName;

      const { data, error } = await supabase.storage
        .from('company-files')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      showAlert('Erro ao baixar arquivo', 'error');
      console.error(error);
    }
  };

  const handleFolderClick = async (folderId: string) => {
    setCurrentFolderId(folderId);
    await buildFolderPath(folderId);
  };

  const handleGoToRoot = () => {
    setCurrentFolderId(null);
    setFolderPath([]);
  };

  const handleGoToFolder = async (folderId: string) => {
    setCurrentFolderId(folderId);
    await buildFolderPath(folderId);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Arquivos da Empresa</h2>
          <p className="text-gray-600 mt-1">Gerencie os documentos internos da empresa</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FolderPlus className="w-5 h-5" />
            Nova Pasta
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
            <Upload className="w-5 h-5" />
            {uploading ? 'Enviando...' : 'Enviar Arquivo'}
            <input
              type="file"
              onChange={handleFileUpload}
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <button
          onClick={handleGoToRoot}
          className="flex items-center gap-1 hover:text-blue-600"
        >
          <Home className="w-4 h-4" />
          Raiz
        </button>
        {folderPath.map((folder, index) => (
          <React.Fragment key={folder.id}>
            <ChevronRight className="w-4 h-4" />
            <button
              onClick={() => handleGoToFolder(folder.id)}
              className="hover:text-blue-600"
            >
              {folder.nome}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Tamanho</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Data</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {/* Folders */}
              {folders.map((folder) => (
                <tr key={folder.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleFolderClick(folder.id)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                    >
                      <Folder className="w-5 h-5" />
                      <span className="font-medium">{folder.nome}</span>
                    </button>
                  </td>
                  <td className="py-3 px-4 text-gray-600">Pasta</td>
                  <td className="py-3 px-4 text-gray-600">-</td>
                  <td className="py-3 px-4 text-gray-600">
                    {new Date(folder.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Excluir pasta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {/* Files */}
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-gray-800">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span>{file.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {file.metadata?.mimetype?.split('/')[1]?.toUpperCase() || 'Arquivo'}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {formatFileSize(file.metadata?.size || 0)}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {new Date(file.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDownloadFile(file.name)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Baixar arquivo"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file.name)}
                        className="text-red-600 hover:text-red-800"
                        title="Excluir arquivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {folders.length === 0 && files.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    Nenhum arquivo ou pasta encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Nova Pasta</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome da pasta"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
              }}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={loading}
              >
                {loading ? 'Criando...' : 'Criar Pasta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
