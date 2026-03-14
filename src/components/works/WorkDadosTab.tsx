import { useState, useRef, useEffect } from 'react';
import { Upload, Camera, UserPlus } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { Work } from '../../types/work';
import { Client } from '../../types/client';
import { useAuth } from '../../contexts/AuthContext';

interface WorkDadosTabProps {
  work: Partial<Work>;
  onChange: (updates: Partial<Work>) => void;
  onNavigateHome?: () => void;
}

export default function WorkDadosTab({ work, onChange}: WorkDadosTabProps) {
  const { user } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientProducts, setClientProducts] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showQuickClientModal, setShowQuickClientModal] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickClientEmail, setQuickClientEmail] = useState('');
  const [quickClientPhone, setQuickClientPhone] = useState('');
  const [savingClient, setSavingClient] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (work.client_id) {
      loadClientProducts();
      loadClientWorkData();
    }
  }, [work.client_id]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClients(data as Client[] || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const generateWorkName = (clientName: string): string => {
    const names = clientName.trim().split(' ');
    const initials = names
      .filter(name => name.length > 0)
      .map(name => name.charAt(0).toUpperCase())
      .join('');
    const year = new Date().getFullYear().toString().slice(-2);
    return `${initials}${year}`;
  };

  const loadClientProducts = async () => {
    if (!work.client_id) return;

    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('name')
        .eq('id', work.client_id)
        .maybeSingle();

      if (clientError) throw clientError;

      const { data: productData, error: productError } = await supabase
        .from('client_products')
        .select('product_type, plano_category')
        .eq('client_id', work.client_id)
        .maybeSingle();

      if (productError && productError.code !== 'PGRST116') throw productError;

      if (clientData && !work.name) {
        const suggestedName = generateWorkName(clientData.name);
        onChange({ name: suggestedName });
      }

      if (productData) {
        let productName = productData.product_type;
        if (productData.plano_category) {
          productName = `${productData.product_type} - ${productData.plano_category}`;
        }
        setClientProducts([productName]);

        if (!work.category) {
          onChange({ category: productName });
        }
      } else {
        setClientProducts([]);
      }
    } catch (error) {
      console.error('Error loading client products:', error);
    }
  };

  const loadClientWorkData = async () => {
    if (!work.client_id) return;

    try {
      // Buscar a última obra do cliente
      const { data: lastWork, error: workError } = await supabase
        .from('works')
        .select('work_address, work_number, work_neighborhood, work_complement, work_zip_code, work_state, work_city, work_manager, contractor')
        .eq('client_id', work.client_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (workError && workError.code !== 'PGRST116') throw workError;

      const updates: Partial<Work> = {};

      if (lastWork) {
        // Se existe uma obra anterior, preencher com os dados dela
        if (!work.work_address && lastWork.work_address) updates.work_address = lastWork.work_address;
        if (!work.work_number && lastWork.work_number) updates.work_number = lastWork.work_number;
        if (!work.work_neighborhood && lastWork.work_neighborhood) updates.work_neighborhood = lastWork.work_neighborhood;
        if (!work.work_complement && lastWork.work_complement) updates.work_complement = lastWork.work_complement;
        if (!work.work_zip_code && lastWork.work_zip_code) updates.work_zip_code = lastWork.work_zip_code;
        if (!work.work_state && lastWork.work_state) updates.work_state = lastWork.work_state;
        if (!work.work_city && lastWork.work_city) updates.work_city = lastWork.work_city;
        if (!work.work_manager && lastWork.work_manager) updates.work_manager = lastWork.work_manager;
        if (!work.contractor && lastWork.contractor) updates.contractor = lastWork.contractor;
      } else {
        // Se não existe obra anterior, buscar dados do cliente
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('address, number, neighborhood, complement, zip_code, state, city')
          .eq('id', work.client_id)
          .maybeSingle();

        if (clientError) throw clientError;

        if (clientData) {
          if (!work.work_address && clientData.address) updates.work_address = clientData.address;
          if (!work.work_number && clientData.number) updates.work_number = clientData.number;
          if (!work.work_neighborhood && clientData.neighborhood) updates.work_neighborhood = clientData.neighborhood;
          if (!work.work_complement && clientData.complement) updates.work_complement = clientData.complement;
          if (!work.work_zip_code && clientData.zip_code) updates.work_zip_code = clientData.zip_code;
          if (!work.work_state && clientData.state) updates.work_state = clientData.state;
          if (!work.work_city && clientData.city) updates.work_city = clientData.city;
        }
      }

      // Aplicar as atualizações apenas se houver campos para atualizar
      if (Object.keys(updates).length > 0) {
        onChange(updates);
      }
    } catch (error) {
      console.error('Error loading client work data:', error);
    }
  };

  const handleQuickClientSave = async () => {
    if (!quickClientName.trim()) {
      alert('Digite o nome do cliente');
      return;
    }

    setSavingClient(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: quickClientName.trim(),
          email: quickClientEmail.trim() || null,
          phone: quickClientPhone.trim() || null,
          user_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar lista de clientes
      await loadClients();

      // Selecionar o novo cliente
      onChange({ client_id: data.id });

      // Fechar modal e limpar campos
      setShowQuickClientModal(false);
      setQuickClientName('');
      setQuickClientEmail('');
      setQuickClientPhone('');

      alert('Cliente cadastrado com sucesso!');
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Erro ao cadastrar cliente');
    } finally {
      setSavingClient(false);
    }
  };

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
            {work.photo_url ? (
              <>
                <img
                  src={work.photo_url}
                  alt="Obra"
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
              Vincular Cliente <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={work.client_id || ''}
                onChange={(e) => onChange({ client_id: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{  }}
              >
                <option value="">Selecione um cliente...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowQuickClientModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                style={{
                  backgroundColor: arcoColors.primary.green,
                  color: '#000000'
                }}
                title="Cadastrar cliente rápido"
              >
                <UserPlus size={18} />
                Cadastrar
              </button>
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da obra <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={work.name || ''}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{  }}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de produto</label>
            <select
              value={work.category || ''}
              onChange={(e) => onChange({ category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            >
              <option value="">Selecione...</option>
              {clientProducts.map((product, index) => (
                <option key={index} value={product}>
                  {product}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Situação</label>
            <select
              value={work.status || 'pre_obra'}
              onChange={(e) => onChange({ status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            >
              <option value="pre_obra">Pré obra</option>
              <option value="em_andamento">Em andamento</option>
              <option value="em_orcamento">Em orçamento</option>
              <option value="finalizada">Finalizada</option>
              <option value="pos_obra">Pós-obra</option>
            </select>
          </div>

          <div></div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
            <textarea
              value={work.observation || ''}
              onChange={(e) => onChange({ observation: e.target.value })}
              rows={4}
              maxLength={4000}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none"
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {(work.observation || '').length}/4000 caracteres
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-base font-semibold mb-3" style={{ color: arcoColors.text.primary }}>
          Período
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data início</label>
            <input
              type="date"
              value={work.start_date || ''}
              onChange={(e) => onChange({ start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duração</label>
            <input
              type="number"
              value={work.duration || ''}
              onChange={(e) => onChange({ duration: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mês(es)</label>
            <select
              value={work.duration_unit || 'meses'}
              onChange={(e) => onChange({ duration_unit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            >
              <option value="dias">Dias</option>
              <option value="meses">Meses</option>
              <option value="anos">Anos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data fim</label>
            <input
              type="date"
              value={work.end_date || ''}
              onChange={(e) => onChange({ end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-base font-semibold mb-3" style={{ color: arcoColors.text.primary }}>
          Outras informações
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNO</label>
            <input
              type="text"
              value={work.cno || ''}
              onChange={(e) => onChange({ cno: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Área m²</label>
            <input
              type="number"
              step="0.01"
              value={work.area || ''}
              onChange={(e) => onChange({ area: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empreiteiro</label>
            <input
              type="text"
              value={work.contractor || ''}
              onChange={(e) => onChange({ contractor: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resp. técnico</label>
            <input
              type="text"
              value={work.technical_manager || ''}
              onChange={(e) => onChange({ technical_manager: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ART nº</label>
            <input
              type="text"
              value={work.art_number || ''}
              onChange={(e) => onChange({ art_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resp. obra</label>
            <input
              type="text"
              value={work.work_manager || ''}
              onChange={(e) => onChange({ work_manager: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Modal de Cadastro Rápido de Cliente */}
      {showQuickClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4" style={{ color: arcoColors.primary.blue }}>
              Cadastro Rápido de Cliente
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={quickClientName}
                  onChange={(e) => setQuickClientName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{  }}
                  placeholder="Nome do cliente"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={quickClientEmail}
                  onChange={(e) => setQuickClientEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{  }}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={quickClientPhone}
                  onChange={(e) => setQuickClientPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{  }}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleQuickClientSave}
                disabled={savingClient || !quickClientName.trim()}
                className="flex-1 px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: arcoColors.primary.green,
                  color: '#000000'
                }}
              >
                {savingClient ? 'Salvando...' : 'Salvar Cliente'}
              </button>

              <button
                onClick={() => {
                  setShowQuickClientModal(false);
                  setQuickClientName('');
                  setQuickClientEmail('');
                  setQuickClientPhone('');
                }}
                disabled={savingClient}
                className="btn-cancel flex-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
