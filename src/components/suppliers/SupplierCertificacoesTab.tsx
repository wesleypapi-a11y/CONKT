import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, FileText, Download } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { SupplierCertification } from '../../types/supplier';
import { useAuth } from '../../contexts/AuthContext';

interface SupplierCertificacoesTabProps {
  supplierId: string | null;
}

export default function SupplierCertificacoesTab({ supplierId }: SupplierCertificacoesTabProps) {
  const { user } = useAuth();
  const [certifications, setCertifications] = useState<SupplierCertification[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (supplierId) {
      loadCertifications();
    }
  }, [supplierId]);

  const loadCertifications = async () => {
    if (!supplierId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('supplier_certifications')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCertifications(data || []);
    } catch (error) {
      console.error('Error loading certifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !supplierId || !user) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${supplierId}/certifications/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('supplier-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('supplier_certifications')
          .insert({
            supplier_id: supplierId,
            user_id: user.id,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            file_type: file.type,
            expiration_date: expirationDate || null
          });

        if (dbError) throw dbError;
      }

      await loadCertifications();
      setExpirationDate('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading certification:', error);
      alert('Erro ao fazer upload da certificação');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCertification = async (certification: SupplierCertification) => {
    if (!confirm('Deseja realmente excluir esta certificação?')) return;

    setLoading(true);
    try {
      const { error: storageError } = await supabase.storage
        .from('supplier-files')
        .remove([certification.file_path]);

      if (storageError) console.error('Storage error:', storageError);

      const { error: dbError } = await supabase
        .from('supplier_certifications')
        .delete()
        .eq('id', certification.id);

      if (dbError) throw dbError;

      await loadCertifications();
    } catch (error) {
      console.error('Error deleting certification:', error);
      alert('Erro ao excluir certificação');
    } finally {
      setLoading(false);
    }
  };

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('supplier-files')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isExpired = (expirationDate?: string) => {
    if (!expirationDate) return false;
    return new Date(expirationDate) < new Date();
  };

  const isExpiringSoon = (expirationDate?: string) => {
    if (!expirationDate) return false;
    const expDate = new Date(expirationDate);
    const today = new Date();
    const daysUntilExpiration = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiration > 0 && daysUntilExpiration <= 30;
  };

  if (!supplierId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Salve o fornecedor primeiro para adicionar certificações
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Adicionar Certificação</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data de validade (opcional)
            </label>
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{}}
            />
          </div>
        </div>

        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          style={{
            backgroundColor: uploading ? '#f3f4f6' : 'white'
          }}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 mb-1">
            {uploading ? 'Enviando arquivos...' : 'Clique para adicionar certificados'}
          </p>
          <p className="text-xs text-gray-500">
            PDF, imagens e outros documentos
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
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-700">Certificações</h3>
        </div>

        {loading && certifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : certifications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-orange-600 font-medium mb-1">Nenhuma certificação cadastrada</p>
            <p className="text-sm text-gray-500">
              Use o formulário acima para adicionar certificados
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {certifications.map((certification) => (
              <div
                key={certification.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {certification.file_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatFileSize(certification.file_size)}</span>
                      <span>•</span>
                      <span>{new Date(certification.created_at).toLocaleDateString('pt-BR')}</span>
                      {certification.expiration_date && (
                        <>
                          <span>•</span>
                          <span
                            className={`font-medium ${
                              isExpired(certification.expiration_date)
                                ? 'text-red-600'
                                : isExpiringSoon(certification.expiration_date)
                                ? 'text-orange-600'
                                : 'text-green-600'
                            }`}
                          >
                            {isExpired(certification.expiration_date)
                              ? 'Vencido'
                              : `Validade: ${new Date(certification.expiration_date).toLocaleDateString('pt-BR')}`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={getFileUrl(certification.file_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDeleteCertification(certification)}
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Sobre certificações:</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Mantenha certificados ISO, licenças e outras qualificações atualizadas</li>
          <li>Certificações vencidas aparecerão destacadas em vermelho</li>
          <li>Certificações próximas do vencimento (30 dias) aparecerão em laranja</li>
          <li>Configure alertas para renovação de certificados importantes</li>
        </ul>
      </div>
    </div>
  );
}
