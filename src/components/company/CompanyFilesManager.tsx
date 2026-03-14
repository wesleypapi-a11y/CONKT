import { useState, useEffect } from 'react';
import { FileText, Upload, Search, Download, Trash2, FolderOpen, File, FileImage, FileSpreadsheet, X, Eye, CreditCard as Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { getEmpresaContext } from '../../utils/empresaContext';

interface CompanyFile {
  id: string;
  nome: string;
  categoria?: string;
  descricao?: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
}

const CATEGORIAS = [
  'Contrato Social',
  'Cartão CNPJ',
  'Certificados',
  'Logos e Identidade Visual',
  'Documentos Fiscais',
  'Comprovantes',
  'Procurações',
  'Outros'
];

export function CompanyFilesManager() {
  const [files, setFiles] = useState<CompanyFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<CompanyFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    categoria: 'Outros',
    descricao: '',
    file: null as File | null
  });

  const { showAlert } = useAlert();

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [files, searchTerm, filterCategoria]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const { empresaId } = await getEmpresaContext();

      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('company_files')
        .select('*')
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFiles(data || []);
    } catch (error: any) {
      showAlert('Erro ao carregar arquivos', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...files];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(f =>
        f.nome.toLowerCase().includes(term) ||
        (f.descricao && f.descricao.toLowerCase().includes(term)) ||
        (f.categoria && f.categoria.toLowerCase().includes(term))
      );
    }

    if (filterCategoria !== 'todas') {
      filtered = filtered.filter(f => f.categoria === filterCategoria);
    }

    setFilteredFiles(filtered);
  };

  const getCategoryCounts = () => {
    const counts: { [key: string]: number } = {};
    CATEGORIAS.forEach(cat => {
      counts[cat] = files.filter(f => f.categoria === cat).length;
    });
    return counts;
  };

  const handleUpload = async () => {
    try {
      if (!formData.file || !formData.nome) {
        showAlert('Selecione um arquivo e preencha o nome', 'error');
        return;
      }

      setUploading(true);
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        setUploading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const fileExt = formData.file.name.split('.').pop();
      const fileName = `${empresaId}/${Date.now()}_${formData.file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('company-files')
        .upload(fileName, formData.file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('company_files')
        .insert({
          empresa_id: empresaId,
          nome: formData.nome,
          categoria: formData.categoria,
          descricao: formData.descricao || null,
          file_path: fileName,
          file_type: formData.file.type,
          file_size: formData.file.size,
          uploaded_by: user?.id
        });

      if (dbError) throw dbError;

      showAlert('Arquivo enviado com sucesso', 'success');
      setShowModal(false);
      resetForm();
      loadFiles();
    } catch (error: any) {
      showAlert('Erro ao enviar arquivo', 'error');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: CompanyFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('company-files')
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.nome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showAlert('Download iniciado', 'success');
    } catch (error: any) {
      showAlert('Erro ao fazer download', 'error');
      console.error(error);
    }
  };

  const handleDelete = async (file: CompanyFile) => {
    if (!confirm(`Deseja realmente excluir o arquivo "${file.nome}"?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('company-files')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('company_files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', file.id);

      if (dbError) throw dbError;

      showAlert('Arquivo excluído com sucesso', 'success');
      loadFiles();
    } catch (error: any) {
      showAlert('Erro ao excluir arquivo', 'error');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      categoria: 'Outros',
      descricao: '',
      file: null
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <File size={20} className="text-gray-400" />;
    if (fileType.startsWith('image/')) return <FileImage size={20} className="text-blue-500" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet size={20} className="text-green-500" />;
    if (fileType.includes('pdf')) return <FileText size={20} className="text-red-500" />;
    return <File size={20} className="text-gray-400" />;
  };

  const categoryCounts = getCategoryCounts();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Arquivos da Empresa</h2>
          <p className="text-gray-600 mt-1">Documentos e arquivos organizados</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Upload size={18} />
          Enviar Arquivo
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CATEGORIAS.slice(0, 4).map(categoria => (
          <div
            key={categoria}
            className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilterCategoria(categoria)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">{categoria}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{categoryCounts[categoria] || 0}</p>
              </div>
              <FolderOpen className="text-blue-500" size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome, categoria ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="todas">Todas as categorias</option>
            {CATEGORIAS.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {(searchTerm || filterCategoria !== 'todas') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterCategoria('todas');
              }}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <X size={18} />
              Limpar
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 w-12"></th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Categoria</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Descrição</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Tamanho</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Data de Envio</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Nenhum arquivo encontrado
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => (
                  <tr key={file.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      {getFileIcon(file.file_type)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 font-medium">{file.nome}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {file.categoria || 'Outros'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{file.descricao || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{formatFileSize(file.file_size)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(file.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(file)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Enviar Arquivo</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Arquivo <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setFormData({
                      ...formData,
                      file,
                      nome: file ? file.name : ''
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {formData.file && (
                  <p className="text-xs text-gray-500 mt-1">
                    Tamanho: {formatFileSize(formData.file.size)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Arquivo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Contrato Social 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIAS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Informações adicionais sobre o arquivo..."
                />
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
