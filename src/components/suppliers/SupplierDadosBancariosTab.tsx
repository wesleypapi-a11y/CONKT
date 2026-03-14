import { useState, useEffect } from 'react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { SupplierBankInfo } from '../../types/supplier';

interface SupplierDadosBancariosTabProps {
  supplierId: string | null;
}

export default function SupplierDadosBancariosTab({ supplierId }: SupplierDadosBancariosTabProps) {
  const [loading, setLoading] = useState(false);
  const [bankInfo, setBankInfo] = useState<Partial<SupplierBankInfo>>({
    bank: '',
    agency: '',
    account: '',
    pix_key: '',
    additional_info: ''
  });

  useEffect(() => {
    if (supplierId) {
      loadBankInfo();
    }
  }, [supplierId]);

  const loadBankInfo = async () => {
    if (!supplierId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('supplier_bank_info')
        .select('*')
        .eq('supplier_id', supplierId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setBankInfo(data);
      }
    } catch (error) {
      console.error('Error loading bank info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!supplierId) {
      alert('Salve o fornecedor primeiro');
      return;
    }

    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('supplier_bank_info')
        .select('id')
        .eq('supplier_id', supplierId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('supplier_bank_info')
          .update(bankInfo)
          .eq('supplier_id', supplierId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('supplier_bank_info')
          .insert({
            supplier_id: supplierId,
            ...bankInfo
          });

        if (error) throw error;
      }

      alert('Dados bancários salvos com sucesso!');
      await loadBankInfo();
    } catch (error) {
      console.error('Error saving bank info:', error);
      alert('Erro ao salvar dados bancários');
    } finally {
      setLoading(false);
    }
  };

  if (!supplierId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Salve o fornecedor primeiro para adicionar dados bancários
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
          <input
            type="text"
            value={bankInfo.bank || ''}
            onChange={(e) => setBankInfo({ ...bankInfo, bank: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            placeholder="Nome do banco"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Agência</label>
          <input
            type="text"
            value={bankInfo.agency || ''}
            onChange={(e) => setBankInfo({ ...bankInfo, agency: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            placeholder="0000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Conta</label>
          <input
            type="text"
            value={bankInfo.account || ''}
            onChange={(e) => setBankInfo({ ...bankInfo, account: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            placeholder="00000-0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chave Pix</label>
          <input
            type="text"
            value={bankInfo.pix_key || ''}
            onChange={(e) => setBankInfo({ ...bankInfo, pix_key: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Dados bancários adicionais</label>
          <textarea
            value={bankInfo.additional_info || ''}
            onChange={(e) => setBankInfo({ ...bankInfo, additional_info: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none"
            placeholder="Outras informações bancárias relevantes..."
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 rounded-md text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: arcoColors.primary.blue }}
        >
          {loading ? 'Salvando...' : 'Salvar dados bancários'}
        </button>
      </div>
    </div>
  );
}
