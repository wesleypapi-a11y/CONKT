import { useState, useEffect } from 'react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { Work, BillingAddressType } from '../../types/work';
import { Client } from '../../types/client';

interface WorkEnderecoTabProps {
  work: Partial<Work>;
  onChange: (updates: Partial<Work>) => void;
  onNavigateHome?: () => void;
}

export default function WorkEnderecoTab({ work, onChange}: WorkEnderecoTabProps) {
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    if (work.client_id) {
      loadClientAddress();
    }
  }, [work.client_id]);

  const loadClientAddress = async () => {
    if (!work.client_id) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', work.client_id)
        .maybeSingle();

      if (error) throw error;
      setClient(data);
    } catch (error) {
      console.error('Error loading client:', error);
    }
  };

  const handleCopyClientAddress = () => {
    if (!client) return;

    onChange({
      work_zip_code: client.zip_code,
      work_address: client.address,
      work_number: client.number,
      work_neighborhood: client.neighborhood,
      work_complement: client.complement,
      work_state: client.state,
      work_city: client.city,
    });
  };

  const handleBillingAddressTypeChange = (type: BillingAddressType) => {
    onChange({ billing_address_type: type });

    if (type === 'obra') {
      onChange({
        billing_zip_code: work.work_zip_code,
        billing_address: work.work_address,
        billing_number: work.work_number,
        billing_neighborhood: work.work_neighborhood,
        billing_complement: work.work_complement,
        billing_state: work.work_state,
        billing_city: work.work_city,
      });
    } else if (type === 'cliente' && client) {
      onChange({
        billing_zip_code: client.zip_code,
        billing_address: client.address,
        billing_number: client.number,
        billing_neighborhood: client.neighborhood,
        billing_complement: client.complement,
        billing_state: client.state,
        billing_city: client.city,
      });
    }
  };

  return (
    <div className="space-y-6 relative">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold" style={{ color: conktColors.text.primary }}>
            Endereço da obra
          </h3>
          {client && (
            <button
              onClick={handleCopyClientAddress}
              className="text-sm px-3 py-1 rounded hover:bg-gray-100 transition-colors"
              style={{ color: conktColors.primary.blue }}
            >
              Copiar endereço do cliente
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
            <input
              type="text"
              value={work.work_zip_code || ''}
              onChange={(e) => onChange({ work_zip_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
            <input
              type="text"
              value={work.work_address || ''}
              onChange={(e) => onChange({ work_address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
            <input
              type="text"
              value={work.work_number || ''}
              onChange={(e) => onChange({ work_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
            <input
              type="text"
              value={work.work_neighborhood || ''}
              onChange={(e) => onChange({ work_neighborhood: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
            <input
              type="text"
              value={work.work_complement || ''}
              onChange={(e) => onChange({ work_complement: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <input
              type="text"
              value={work.work_state || ''}
              onChange={(e) => onChange({ work_state: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input
              type="text"
              value={work.work_city || ''}
              onChange={(e) => onChange({ work_city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-base font-semibold mb-3" style={{ color: conktColors.text.primary }}>
          Endereço de cobrança
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Usar o mesmo de:
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="billing_address_type"
                value="obra"
                checked={work.billing_address_type === 'obra'}
                onChange={(e) => handleBillingAddressTypeChange(e.target.value as BillingAddressType)}
                className="w-4 h-4"
                style={{ accentColor: conktColors.primary.blue }}
              />
              <span className="text-sm text-gray-700">Obra</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="billing_address_type"
                value="cliente"
                checked={work.billing_address_type === 'cliente'}
                onChange={(e) => handleBillingAddressTypeChange(e.target.value as BillingAddressType)}
                className="w-4 h-4"
                style={{ accentColor: conktColors.primary.blue }}
              />
              <span className="text-sm text-gray-700">Cliente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="billing_address_type"
                value="empresa"
                checked={work.billing_address_type === 'empresa'}
                onChange={(e) => handleBillingAddressTypeChange(e.target.value as BillingAddressType)}
                className="w-4 h-4"
                style={{ accentColor: conktColors.primary.blue }}
              />
              <span className="text-sm text-gray-700">Empresa</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="billing_address_type"
                value="outro"
                checked={work.billing_address_type === 'outro'}
                onChange={(e) => handleBillingAddressTypeChange(e.target.value as BillingAddressType)}
                className="w-4 h-4"
                style={{ accentColor: conktColors.primary.blue }}
              />
              <span className="text-sm text-gray-700">Outro</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
            <input
              type="text"
              value={work.billing_zip_code || ''}
              onChange={(e) => onChange({ billing_zip_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
            <input
              type="text"
              value={work.billing_address || ''}
              onChange={(e) => onChange({ billing_address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
            <input
              type="text"
              value={work.billing_number || ''}
              onChange={(e) => onChange({ billing_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
            <input
              type="text"
              value={work.billing_neighborhood || ''}
              onChange={(e) => onChange({ billing_neighborhood: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
            <input
              type="text"
              value={work.billing_complement || ''}
              onChange={(e) => onChange({ billing_complement: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <input
              type="text"
              value={work.billing_state || ''}
              onChange={(e) => onChange({ billing_state: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input
              type="text"
              value={work.billing_city || ''}
              onChange={(e) => onChange({ billing_city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
