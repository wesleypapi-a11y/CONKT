import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { Supplier } from '../../types/supplier';
import { useAuth } from '../../contexts/AuthContext';
import SupplierDadosTab from './SupplierDadosTab';
import SupplierDadosBancariosTab from './SupplierDadosBancariosTab';
import SupplierVendedoresTab from './SupplierVendedoresTab';
import SupplierCategoriasTab from './SupplierCategoriasTab';
import SupplierQualidadeTab from './SupplierQualidadeTab';
import SupplierAnexosTab from './SupplierAnexosTab';
import SupplierCertificacoesTab from './SupplierCertificacoesTab';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId?: string;
  onSave: () => void;
}

type TabType = 'dados' | 'dadosBancarios' | 'vendedores' | 'categorias' | 'qualidade' | 'anexos' | 'certificacoes';

export default function SupplierModal({ isOpen, onClose, supplierId, onSave }: SupplierModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dados');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplier, setSupplier] = useState<Partial<Supplier>>({
    name: '',
    type: 'juridica',
    active: true,
    recommended_partner: false
  });

  useEffect(() => {
    if (isOpen && supplierId) {
      loadSupplier();
    } else if (isOpen && !supplierId) {
      setSupplier({
        name: '',
        type: 'juridica',
        active: true,
        recommended_partner: false
      });
      setActiveTab('dados');
    }
  }, [isOpen, supplierId]);

  const loadSupplier = async () => {
    if (!supplierId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplierId)
        .maybeSingle();

      if (error) throw error;
      if (data) setSupplier(data);
    } catch (error) {
      console.error('Error loading supplier:', error);
      alert('Erro ao carregar fornecedor');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!supplier.name?.trim()) {
      alert('Razão social é obrigatória');
      return;
    }

    if (!user) return;

    setSaving(true);
    try {
      if (supplierId) {
        const { error } = await supabase
          .from('suppliers')
          .update({
            ...supplier,
            updated_at: new Date().toISOString()
          })
          .eq('id', supplierId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('suppliers')
          .insert({
            ...supplier,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setSupplier(data);
        }
      }

      onSave();
      if (!supplierId) {
        alert('Fornecedor salvo com sucesso! Agora você pode adicionar dados bancários, vendedores, categorias e anexos.');
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('Erro ao salvar fornecedor');
    } finally {
      setSaving(false);
    }
  };

  const handleSupplierChange = (updates: Partial<Supplier>) => {
    setSupplier(prev => ({ ...prev, ...updates }));
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'dados' as TabType, label: 'Dados' },
    { id: 'dadosBancarios' as TabType, label: 'Dados bancários' },
    { id: 'vendedores' as TabType, label: 'Vendedores' },
    { id: 'categorias' as TabType, label: 'Categorias' },
    { id: 'qualidade' as TabType, label: 'Qualidade' },
    { id: 'anexos' as TabType, label: 'Anexos' },
    { id: 'certificacoes' as TabType, label: 'Certificações' }
  ];

  return (
    <div className="fixed inset-0 lg:left-64 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800">
            {supplier.name || 'Novo Fornecedor'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {supplierId && supplier.created_at && (
          <div className="px-6 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
            Criado em: {new Date(supplier.created_at).toLocaleString('pt-BR')}
          </div>
        )}

        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={activeTab === tab.id ? { backgroundColor: arcoColors.primary.blue } : {}}
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
                  <SupplierDadosTab supplier={supplier} onChange={handleSupplierChange} />
                )}
                {activeTab === 'dadosBancarios' && (
                  <SupplierDadosBancariosTab supplierId={supplier.id || null} />
                )}
                {activeTab === 'vendedores' && (
                  <SupplierVendedoresTab supplierId={supplier.id || null} />
                )}
                {activeTab === 'categorias' && (
                  <SupplierCategoriasTab supplierId={supplier.id || null} />
                )}
                {activeTab === 'qualidade' && (
                  <SupplierQualidadeTab supplierId={supplier.id || null} />
                )}
                {activeTab === 'anexos' && (
                  <SupplierAnexosTab supplierId={supplier.id || null} />
                )}
                {activeTab === 'certificacoes' && (
                  <SupplierCertificacoesTab supplierId={supplier.id || null} />
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200 rounded-b-xl">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={supplier.active}
              onChange={(e) => handleSupplierChange({ active: e.target.checked })}
              className="w-4 h-4 rounded"
              style={{ accentColor: arcoColors.primary.blue }}
            />
            <span className="text-sm font-medium text-gray-700">Ativo</span>
          </label>

          <button
            onClick={handleSave}
            disabled={saving || !supplier.name?.trim()}
            className="px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            style={{ backgroundColor: arcoColors.primary.blue }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
