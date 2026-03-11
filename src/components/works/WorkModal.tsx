import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Work } from '../../types/work';
import { conktColors } from '../../styles/colors';
import WorkDadosTab from './WorkDadosTab';
import WorkEnderecoTab from './WorkEnderecoTab';
import WorkPastaTab from './WorkPastaTab';

interface WorkModalProps {
  work: Work | null;
  onClose: () => void;
  onNavigateHome?: () => void;
  onSave?: () => void;
}

type TabType = 'dados' | 'endereco' | 'pasta';

export default function WorkModal({ work: initialWork, onClose, onNavigateHome, onSave }: WorkModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dados');
  const [work, setWork] = useState<Partial<Work>>(
    initialWork || {
      status: 'pre_obra',
      billing_address_type: 'obra',
      work_days: [],
    }
  );
  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState<string>('');

  useEffect(() => {
    if (work.client_id) {
      loadClientName();
    }
  }, [work.client_id]);

  const loadClientName = async () => {
    if (!work.client_id) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('name')
        .eq('id', work.client_id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setClientName(data.name);
      }
    } catch (error) {
      console.error('Error loading client name:', error);
    }
  };

  const handleChange = (updates: Partial<Work>) => {
    setWork((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (!user || !work.name) {
      alert('Preencha os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      if (initialWork?.id) {
        const { error } = await supabase
          .from('works')
          .update({
            ...work,
            updated_at: new Date().toISOString(),
          })
          .eq('id', initialWork.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('works')
          .insert({
            ...work,
            user_id: user.id,
          });

        if (error) throw error;
      }

      // Chama onSave se fornecido para recarregar dados
      if (onSave) {
        await onSave();
      }

      onClose();
    } catch (error) {
      console.error('Error saving work:', error);
      alert('Erro ao salvar obra');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'dados' as TabType, label: 'Dados' },
    { id: 'endereco' as TabType, label: 'Endereço' },
    { id: 'pasta' as TabType, label: 'Pasta' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-bold" style={{ color: conktColors.primary.blue }}>
              {initialWork ? `Obra: ${work.name || 'Sem nome'}` : 'Nova Obra'}
              {clientName && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  - Cliente: {clientName}
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="border-b">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors rounded-t-lg ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={
                  activeTab === tab.id
                    ? { backgroundColor: conktColors.primary.blue }
                    : {}
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dados' && (
            <WorkDadosTab work={work} onChange={handleChange} onNavigateHome={onNavigateHome} />
          )}
          {activeTab === 'endereco' && (
            <WorkEnderecoTab work={work} onChange={handleChange} onNavigateHome={onNavigateHome} />
          )}
          {activeTab === 'pasta' && (
            <WorkPastaTab clientId={work.client_id} onNavigateHome={onNavigateHome} />
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={work.status === 'em_andamento'}
                onChange={(e) =>
                  handleChange({ status: e.target.checked ? 'em_andamento' : 'pre_obra' })
                }
                className="w-4 h-4"
                style={{ accentColor: conktColors.primary.blue }}
              />
              <span className="text-sm font-medium text-gray-700">Em andamento</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="btn-cancel"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
              style={{ backgroundColor: conktColors.primary.blue }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
