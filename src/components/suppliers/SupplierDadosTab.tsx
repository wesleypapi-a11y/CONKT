import { useState, useRef } from 'react';
import { Upload, Camera } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { Supplier, SupplierType } from '../../types/supplier';
import { useAuth } from '../../contexts/AuthContext';

interface SupplierDadosTabProps {
  supplier: Partial<Supplier>;
  onChange: (updates: Partial<Supplier>) => void;
}

export default function SupplierDadosTab({ supplier, onChange }: SupplierDadosTabProps) {
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
        .from('supplier-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('supplier-files')
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
            {supplier.photo_url ? (
              <>
                <img
                  src={supplier.photo_url}
                  alt="Fornecedor"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="fisica"
                  checked={supplier.type === 'fisica'}
                  onChange={(e) => onChange({ type: e.target.value as SupplierType })}
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
                  checked={supplier.type === 'juridica'}
                  onChange={(e) => onChange({ type: e.target.value as SupplierType })}
                  className="w-4 h-4"
                  style={{ accentColor: conktColors.primary.blue }}
                />
                <span className="text-sm text-gray-700">Pessoa jurídica</span>
              </label>
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Razão social <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={supplier.name || ''}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{}}
              required
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome fantasia/popular</label>
            <input
              type="text"
              value={supplier.fantasy_name || ''}
              onChange={(e) => onChange({ fantasy_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
            <input
              type="text"
              value={supplier.document || ''}
              onChange={(e) => onChange({ document: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">I.E.</label>
            <input
              type="text"
              value={supplier.ie || ''}
              onChange={(e) => onChange({ ie: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div></div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
            <textarea
              value={supplier.observation || ''}
              onChange={(e) => onChange({ observation: e.target.value })}
              rows={3}
              maxLength={4000}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none"
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {(supplier.observation || '').length}/4000 caracteres
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={supplier.recommended_partner || false}
                onChange={(e) => onChange({ recommended_partner: e.target.checked })}
                className="w-4 h-4"
                style={{ accentColor: conktColors.primary.blue }}
              />
              <span className="text-sm text-gray-700">
                Parceiro recomendado (visível no Portal do cliente)
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-base font-semibold mb-3" style={{ color: conktColors.text.primary }}>Contato</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input
              type="text"
              value={supplier.phone || ''}
              onChange={(e) => onChange({ phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
            <input
              type="text"
              value={supplier.mobile || ''}
              onChange={(e) => onChange({ mobile: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={supplier.email || ''}
              onChange={(e) => onChange({ email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <input
              type="text"
              value={supplier.website || ''}
              onChange={(e) => onChange({ website: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              placeholder="https://"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-base font-semibold mb-3" style={{ color: conktColors.text.primary }}>Localização</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
            <input
              type="text"
              value={supplier.cep || ''}
              onChange={(e) => onChange({ cep: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
            <input
              type="text"
              value={supplier.address || ''}
              onChange={(e) => onChange({ address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
            <input
              type="text"
              value={supplier.number || ''}
              onChange={(e) => onChange({ number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
            <input
              type="text"
              value={supplier.complement || ''}
              onChange={(e) => onChange({ complement: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
            <input
              type="text"
              value={supplier.neighborhood || ''}
              onChange={(e) => onChange({ neighborhood: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
            <select
              value={supplier.state || ''}
              onChange={(e) => onChange({ state: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            >
              <option value="">Selecione...</option>
              <option value="AC">AC</option>
              <option value="AL">AL</option>
              <option value="AP">AP</option>
              <option value="AM">AM</option>
              <option value="BA">BA</option>
              <option value="CE">CE</option>
              <option value="DF">DF</option>
              <option value="ES">ES</option>
              <option value="GO">GO</option>
              <option value="MA">MA</option>
              <option value="MT">MT</option>
              <option value="MS">MS</option>
              <option value="MG">MG</option>
              <option value="PA">PA</option>
              <option value="PB">PB</option>
              <option value="PR">PR</option>
              <option value="PE">PE</option>
              <option value="PI">PI</option>
              <option value="RJ">RJ</option>
              <option value="RN">RN</option>
              <option value="RS">RS</option>
              <option value="RO">RO</option>
              <option value="RR">RR</option>
              <option value="SC">SC</option>
              <option value="SP">SP</option>
              <option value="SE">SE</option>
              <option value="TO">TO</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input
              type="text"
              value={supplier.city || ''}
              onChange={(e) => onChange({ city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
