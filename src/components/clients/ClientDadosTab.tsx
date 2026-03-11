import { useState, useRef } from 'react';
import { Upload, Camera } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { Client, ClientType } from '../../types/client';
import { useAuth } from '../../contexts/AuthContext';

interface ClientDadosTabProps {
  client: Partial<Client>;
  onChange: (updates: Partial<Client>) => void;
  onNavigateHome?: () => void;
}

export default function ClientDadosTab({ client, onChange}: ClientDadosTabProps) {
  const { user } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('client-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('client-files')
        .getPublicUrl(fileName);

      onChange({ photo_url: publicUrl });
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Erro ao fazer upload da foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="space-y-4 relative">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <div
            className="relative w-28 h-28 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-gray-400 transition-colors"
            style={{ backgroundColor: '#f9fafb' }}
            onClick={() => fileInputRef.current?.click()}
          >
            {client.photo_url ? (
              <>
                <img
                  src={client.photo_url}
                  alt="Cliente"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-gray-900" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 text-gray-400">
                <Upload className="w-6 h-6" />
                <span className="text-xs">Foto</span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handlePhotoUpload}
            className="hidden"
            disabled={uploadingPhoto}
          />
          {uploadingPhoto && (
            <span className="text-xs text-gray-500">Enviando...</span>
          )}
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={client.name || ''}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{}}
              required
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="fisica"
                  checked={client.type === 'fisica'}
                  onChange={(e) => {
                    const newType = e.target.value as ClientType;
                    onChange({
                      type: newType,
                      birth_date: '',
                      marital_status: '',
                      profession: '',
                      nationality: ''
                    });
                  }}
                  className="w-4 h-4"
                  style={{ accentColor: conktColors.primary.blue }}
                />
                <span className="text-sm text-gray-700">Pessoa física</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="juridica"
                  checked={client.type === 'juridica'}
                  onChange={(e) => {
                    const newType = e.target.value as ClientType;
                    onChange({
                      type: newType,
                      birth_date: '',
                      marital_status: '',
                      profession: '',
                      nationality: ''
                    });
                  }}
                  className="w-4 h-4"
                  style={{ accentColor: conktColors.primary.blue }}
                />
                <span className="text-sm text-gray-700">Pessoa jurídica</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {client.type === 'juridica' ? 'CNPJ' : 'CPF'}
            </label>
            <input
              type="text"
              value={client.cpf_cnpj || ''}
              onChange={(e) => onChange({ cpf_cnpj: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {client.type === 'juridica' ? 'IE' : 'RG'}
            </label>
            <input
              type="text"
              value={client.rg_ie || ''}
              onChange={(e) => onChange({ rg_ie: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          {client.type === 'fisica' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dt. nasc.</label>
                <input
                  type="date"
                  value={client.birth_date || ''}
                  onChange={(e) => onChange({ birth_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nacionalidade</label>
                <input
                  type="text"
                  value={client.nationality || ''}
                  onChange={(e) => onChange({ nationality: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil</label>
                <select
                  value={client.marital_status || ''}
                  onChange={(e) => onChange({ marital_status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                >
                  <option value="">Selecione...</option>
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viúvo(a)">Viúvo(a)</option>
                  <option value="União Estável">União Estável</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profissão</label>
                <input
                  type="text"
                  value={client.profession || ''}
                  onChange={(e) => onChange({ profession: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                />
              </div>
            </>
          )}

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
            <textarea
              value={client.observation || ''}
              onChange={(e) => onChange({ observation: e.target.value })}
              rows={3}
              maxLength={4000}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none"
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {(client.observation || '').length}/4000 caracteres
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-base font-semibold mb-3" style={{ color: conktColors.text.primary }}>Contato</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input
              type="text"
              value={client.phone || ''}
              onChange={(e) => onChange({ phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
            <input
              type="text"
              value={client.mobile || ''}
              onChange={(e) => onChange({ mobile: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={client.email || ''}
              onChange={(e) => onChange({ email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-base font-semibold mb-3" style={{ color: conktColors.text.primary }}>Endereço</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
            <input
              type="text"
              value={client.zip_code || ''}
              onChange={(e) => onChange({ zip_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
            <input
              type="text"
              value={client.address || ''}
              onChange={(e) => onChange({ address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
            <input
              type="text"
              value={client.number || ''}
              onChange={(e) => onChange({ number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
            <input
              type="text"
              value={client.neighborhood || ''}
              onChange={(e) => onChange({ neighborhood: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
            <input
              type="text"
              value={client.complement || ''}
              onChange={(e) => onChange({ complement: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <input
              type="text"
              value={client.state || ''}
              onChange={(e) => onChange({ state: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input
              type="text"
              value={client.city || ''}
              onChange={(e) => onChange({ city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
