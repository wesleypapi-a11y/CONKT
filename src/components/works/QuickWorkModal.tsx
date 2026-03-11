import { useState, useRef } from 'react';
import { X, Upload, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface QuickWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkCreated?: (workId: string) => void;
  onSave?: () => void;
  clientId?: string;
}

export default function QuickWorkModal({ isOpen, onClose, onWorkCreated, onSave, clientId }: QuickWorkModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    status: 'planejamento',
    observation: '',
    start_date: '',
    area: '',
    work_address: '',
    work_number: '',
    work_neighborhood: '',
    work_complement: '',
    work_city: '',
    work_state: '',
    work_cep: '',
    photo_url: '',
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('client-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('client-files')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, photo_url: urlData.publicUrl }));
      setPhotoPreview(urlData.publicUrl);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Erro ao fazer upload da foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !user) {
      alert('Nome da obra é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const { data: work, error } = await supabase
        .from('works')
        .insert([
          {
            name: formData.name,
            category: formData.category || null,
            status: formData.status || 'planejamento',
            observation: formData.observation || null,
            start_date: formData.start_date || null,
            area: formData.area ? parseFloat(formData.area) : null,
            work_address: formData.work_address || null,
            work_number: formData.work_number || null,
            work_neighborhood: formData.work_neighborhood || null,
            work_complement: formData.work_complement || null,
            work_city: formData.work_city || null,
            work_state: formData.work_state || null,
            work_zip_code: formData.work_cep || null,
            photo_url: formData.photo_url || null,
            client_id: clientId || null,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (onWorkCreated && work) {
        onWorkCreated(work.id);
      }

      if (onSave) {
        onSave();
      }

      alert('Obra cadastrada com sucesso!');
      handleClose();
    } catch (error) {
      console.error('Error creating work:', error);
      alert('Erro ao cadastrar obra');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      category: '',
      status: 'planejamento',
      observation: '',
      start_date: '',
      area: '',
      work_address: '',
      work_number: '',
      work_neighborhood: '',
      work_complement: '',
      work_city: '',
      work_state: '',
      work_cep: '',
      photo_url: '',
    });
    setPhotoPreview('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={20} />
            <h2 className="text-base font-semibold">Cadastro Rápido de Obra</h2>
          </div>
          <button onClick={handleClose} className="text-white hover:bg-blue-700 p-1 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Obra *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                placeholder="Ex: Residência João Silva"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
              >
                <option value="">Selecione</option>
                <option value="residencial">Residencial</option>
                <option value="comercial">Comercial</option>
                <option value="industrial">Industrial</option>
                <option value="infraestrutura">Infraestrutura</option>
                <option value="reforma">Reforma</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
              >
                <option value="planejamento">Planejamento</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="pausada">Pausada</option>
                <option value="concluida">Concluída</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Início
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Área (m²)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              value={formData.observation}
              onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
              placeholder="Observações sobre a obra"
              rows={2}
            />
          </div>

          <div className="border-t pt-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Endereço da Obra</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    value={formData.work_address}
                    onChange={(e) => setFormData({ ...formData, work_address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                    placeholder="Ex: Rua das Flores"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    value={formData.work_number}
                    onChange={(e) => setFormData({ ...formData, work_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                    placeholder="123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={formData.work_neighborhood}
                    onChange={(e) => setFormData({ ...formData, work_neighborhood: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                    placeholder="Ex: Centro"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={formData.work_complement}
                    onChange={(e) => setFormData({ ...formData, work_complement: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                    placeholder="Ex: Apto 101"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.work_city}
                    onChange={(e) => setFormData({ ...formData, work_city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                    placeholder="Ex: São Paulo"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={formData.work_state}
                    onChange={(e) => setFormData({ ...formData, work_state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                    placeholder="Ex: SP"
                    maxLength={2}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={formData.work_cep}
                    onChange={(e) => setFormData({ ...formData, work_cep: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                    placeholder="00000-000"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto da Obra
            </label>
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded border border-gray-300"
                />
                <button
                  onClick={() => {
                    setPhotoPreview('');
                    setFormData({ ...formData, photo_url: '' });
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-12 border-2 border-dashed border-gray-300 rounded hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-blue-600"
              >
                <Upload size={32} />
                <span className="text-sm font-medium">
                  {uploading ? 'Enviando...' : 'Clique para fazer upload da foto'}
                </span>
              </button>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 px-4 py-3 flex justify-end gap-2 bg-gray-50">
          <button
            onClick={handleClose}
            className="btn-cancel text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Salvar Obra'}
          </button>
        </div>
      </div>
    </div>
  );
}
