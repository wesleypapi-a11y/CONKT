import { useState, useEffect } from 'react';
import { X, Upload, Download, Trash2, FileSpreadsheet, AlertCircle, Pencil, Check, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  file_path: string;
  is_default: boolean;
  created_at: string;
}

interface ScheduleTemplateImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function ScheduleTemplateImportModal({
  isOpen,
  onClose,
  onImportComplete
}: ScheduleTemplateImportModalProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'upload'>('list');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedule_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const validFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          validFiles.push(file);
        }
      }

      if (validFiles.length === 0) {
        setError('Por favor, selecione arquivos Excel (.xlsx ou .xls)');
        return;
      }

      setSelectedFiles(validFiles);
      if (validFiles.length === 1) {
        setTemplateName(validFiles[0].name.replace(/\.(xlsx|xls)$/, ''));
      } else {
        setTemplateName('');
      }
      setError('');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !user) {
      setError('Por favor, selecione pelo menos um arquivo');
      return;
    }

    if (selectedFiles.length > 1 && !templateName.trim()) {
      setError('Por favor, defina um nome para o lote de templates');
      return;
    }

    setUploading(true);
    setError('');

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const file of selectedFiles) {
        try {
          const fileName = `${user.id}/${Date.now()}_${file.name}`;

          const { error: uploadError } = await supabase.storage
            .from('schedule-templates')
            .upload(fileName, file);

          if (uploadError) {
            console.error(`Erro no upload de ${file.name}:`, uploadError);
            errorCount++;
            continue;
          }

          const templateNameToUse = selectedFiles.length === 1
            ? templateName.trim()
            : (templateName.trim() ? `${templateName.trim()} - ${file.name.replace(/\.(xlsx|xls)$/i, '')}` : file.name.replace(/\.(xlsx|xls)$/i, ''));

          const { error: insertError } = await supabase
            .from('schedule_templates')
            .insert({
              name: templateNameToUse,
              description: templateDescription.trim(),
              file_path: fileName,
              is_default: setAsDefault,
            });

          if (insertError) {
            console.error(`Erro ao salvar ${file.name}:`, insertError);
            errorCount++;
            continue;
          }

          successCount++;
        } catch (fileErr: any) {
          console.error(`Erro ao processar ${file.name}:`, fileErr);
          errorCount++;
        }
      }

      setSelectedFiles([]);
      setTemplateName('');
      setTemplateDescription('');
      setSetAsDefault(false);
      setActiveTab('list');
      await loadTemplates();

      if (errorCount === 0) {
        alert(`${successCount} template(s) importado(s) com sucesso!`);
      } else {
        alert(`${successCount} template(s) importado(s) com sucesso.\n${errorCount} arquivo(s) com erro.`);
      }
    } catch (err: any) {
      console.error('Erro completo:', err);
      setError(err.message || 'Erro ao fazer upload dos templates');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (template: ScheduleTemplate) => {
    if (template.is_default) {
      alert('Não é possível excluir templates padrão do sistema');
      return;
    }

    if (!confirm(`Deseja realmente excluir o template "${template.name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      const { error: storageError } = await supabase.storage
        .from('schedule-templates')
        .remove([template.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('schedule_templates')
        .delete()
        .eq('id', template.id);

      if (dbError) throw dbError;

      alert('Template excluído com sucesso!');
      await loadTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      alert('Erro ao excluir template');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (template: ScheduleTemplate) => {
    try {
      const { data, error } = await supabase.storage
        .from('schedule-templates')
        .download(template.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = template.name + '.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading template:', err);
      alert('Erro ao baixar template');
    }
  };

  const handleEditDescription = (template: ScheduleTemplate) => {
    setEditingId(template.id);
    setEditingDescription(template.description || '');
  };

  const handleSaveDescription = async (templateId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('schedule_templates')
        .update({ description: editingDescription.trim() })
        .eq('id', templateId);

      if (error) throw error;

      setEditingId(null);
      setEditingDescription('');
      await loadTemplates();
    } catch (err) {
      console.error('Error updating description:', err);
      alert('Erro ao atualizar descrição');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingDescription('');
  };

  const handleToggleDefault = async (templateId: string, currentDefault: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('schedule_templates')
        .update({ is_default: !currentDefault })
        .eq('id', templateId);

      if (error) throw error;
      await loadTemplates();
    } catch (err) {
      console.error('Error toggling default:', err);
      alert('Erro ao atualizar template padrão');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Templates de Cronograma</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex gap-4 px-6">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'list'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Templates Cadastrados
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'upload'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Importar Novo Template
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'upload' ? (
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Template {selectedFiles.length === 1 && '*'}
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder={selectedFiles.length > 1 ? "Prefixo para os templates (ex: Cronograma Obra)" : "Ex: Cronograma Padrão, Cronograma Comercial..."}
                />
                {selectedFiles.length > 1 && (
                  <p className="text-sm text-gray-500 mt-1">
                    O nome do arquivo será adicionado automaticamente a cada template
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Descrição opcional do template..."
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <input
                  type="checkbox"
                  id="setAsDefault"
                  checked={setAsDefault}
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="setAsDefault" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Definir como template padrão
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arquivos Excel * {selectedFiles.length > 0 && `(${selectedFiles.length} selecionado(s))`}
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-3"
                  >
                    <Upload size={48} className="text-gray-400" />
                    <div>
                      <p className="text-gray-700 font-medium">
                        Clique para selecionar arquivo(s)
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Arquivos Excel (.xlsx ou .xls) - Múltipla seleção permitida
                      </p>
                    </div>
                  </label>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          <FileSpreadsheet className="text-green-600" size={20} />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || (selectedFiles.length === 1 && !templateName.trim()) || uploading}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {uploading
                  ? `Importando ${selectedFiles.length} template(s)...`
                  : `Importar ${selectedFiles.length} Template(s)`}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Carregando...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12">
                  <FileSpreadsheet size={64} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 mb-2">Nenhum template cadastrado</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Importar primeiro template
                  </button>
                </div>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className={`rounded-lg p-4 flex items-center justify-between transition-colors ${
                      template.is_default
                        ? 'bg-blue-50 border-2 border-blue-300'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        template.is_default ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        <FileSpreadsheet className={template.is_default ? 'text-blue-600' : 'text-green-600'} size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-800">{template.name}</h3>
                          {template.is_default && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-200 text-blue-800 text-xs font-semibold rounded-full">
                              <Star size={12} fill="currentColor" />
                              Padrão
                            </span>
                          )}
                        </div>
                        {editingId === template.id ? (
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="text"
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              className="flex-1 px-3 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900"
                              placeholder="Digite a descrição..."
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveDescription(template.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Salvar"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                              title="Cancelar"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <>
                            {template.description && (
                              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                            )}
                          </>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(template.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleDefault(template.id, template.is_default)}
                        className={`p-2 rounded-lg transition-colors ${
                          template.is_default
                            ? 'text-yellow-600 hover:bg-yellow-50'
                            : 'text-gray-400 hover:bg-gray-200'
                        }`}
                        title={template.is_default ? 'Remover como padrão' : 'Marcar como padrão'}
                      >
                        <Star size={20} fill={template.is_default ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={() => handleEditDescription(template)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar descrição"
                        disabled={editingId === template.id}
                      >
                        <Pencil size={20} />
                      </button>
                      <button
                        onClick={() => handleDownload(template)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Baixar template"
                      >
                        <Download size={20} />
                      </button>
                      {!template.is_default && (
                        <button
                          onClick={() => handleDelete(template)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir template"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
