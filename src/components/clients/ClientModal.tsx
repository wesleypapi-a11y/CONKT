import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { Client } from '../../types/client';
import { useAuth } from '../../contexts/AuthContext';
import ClientDadosTab from './ClientDadosTab';
import ClientContatosTab from './ClientContatosTab';
import ClientProdutoTab from './ClientProdutoTab';
import ClientAnexosTab from './ClientAnexosTab';
import ClientAcessosTab from './ClientAcessosTab';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  onSave: () => void;
  onNavigateHome?: () => void;
}

type TabType = 'dados' | 'contatos' | 'produto' | 'anexos' | 'acessos';

export default function ClientModal({ isOpen, onClose, clientId, onSave, onNavigateHome }: ClientModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dados');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState<Partial<Client>>({
    name: '',
    type: 'fisica',
    active: true
  });

  useEffect(() => {
    if (isOpen && clientId) {
      loadClient();
    } else if (isOpen && !clientId) {
      setClient({
        name: '',
        type: 'fisica',
        active: true
      });
      setActiveTab('dados');
    }
  }, [isOpen, clientId]);

  const loadClient = async () => {
    if (!clientId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .maybeSingle();

      if (error) throw error;
      if (data) setClient(data);
    } catch (error) {
      console.error('Error loading client:', error);
      alert('Erro ao carregar cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!client.name?.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    if (!user) return;

    setSaving(true);
    try {
      const clientData = { ...client };

      if (clientData.type === 'juridica') {
        clientData.birth_date = undefined;
        clientData.marital_status = undefined;
        clientData.profession = undefined;
        clientData.nationality = undefined;
      }

      if (clientId) {
        const { error } = await supabase
          .from('clients')
          .update({
            ...clientData,
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('clients')
          .insert({
            ...clientData,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setClient(data);

          const { error: workError } = await supabase
            .from('works')
            .insert({
              user_id: user.id,
              client_id: data.id,
              name: `Obra - ${data.name}`,
              status: 'pre_obra',
              work_address: data.address,
              work_number: data.number,
              work_neighborhood: data.neighborhood,
              work_complement: data.complement,
              work_zip_code: data.zip_code,
              work_state: data.state,
              work_city: data.city,
            });

          if (workError) {
            console.error('Error creating pre-work:', workError);
          }
        }
      }

      onSave();
      if (!clientId) {
        alert('Cliente salvo com sucesso! Um pré-cadastro de obra foi criado automaticamente. Agora você pode adicionar contatos e anexos.');
      }
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Erro ao salvar cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleClientChange = (updates: Partial<Client>) => {
    setClient(prev => ({ ...prev, ...updates }));
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'dados' as TabType, label: 'Dados' },
    { id: 'contatos' as TabType, label: 'Contatos' },
    { id: 'produto' as TabType, label: 'Produto' },
    { id: 'anexos' as TabType, label: 'Anexos' },
    { id: 'acessos' as TabType, label: 'Acessos' }
  ];

  return (
    <div className="fixed inset-0 lg:left-64 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800">
            {client.name || 'Novo Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {clientId && client.created_at && (
          <div className="px-6 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
            Criado em: {new Date(client.created_at).toLocaleString('pt-BR')}
          </div>
        )}

        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={activeTab === tab.id ? { backgroundColor: conktColors.primary.blue } : {}}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 scrollbar-hide">
          <div className="px-6 py-6">
            {loading ? (
              <div className="flex items-center justify-center h-64 text-gray-500">Carregando...</div>
            ) : (
              <>
                {activeTab === 'dados' && (
                  <ClientDadosTab client={client} onChange={handleClientChange} onNavigateHome={onNavigateHome} />
                )}
                {activeTab === 'contatos' && (
                  <ClientContatosTab clientId={client.id || null} onNavigateHome={onNavigateHome} />
                )}
                {activeTab === 'produto' && (
                  <ClientProdutoTab clientId={client.id || null} client={client} onNavigateHome={onNavigateHome} />
                )}
                {activeTab === 'anexos' && (
                  <ClientAnexosTab clientId={client.id || null} onNavigateHome={onNavigateHome} />
                )}
                {activeTab === 'acessos' && (
                  <ClientAcessosTab clientId={client.id || null} onNavigateHome={onNavigateHome} />
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200 rounded-b-xl">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={client.active}
              onChange={(e) => handleClientChange({ active: e.target.checked })}
              className="w-4 h-4 rounded"
              style={{ accentColor: conktColors.primary.blue }}
            />
            <span className="text-sm font-medium text-gray-700">Ativo</span>
          </label>

          <button
            onClick={handleSave}
            disabled={saving || !client.name?.trim()}
            className="px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            style={{ backgroundColor: conktColors.primary.blue }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
