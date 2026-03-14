import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { SupplierVendor } from '../../types/supplier';

interface SupplierVendedoresTabProps {
  supplierId: string | null;
}

export default function SupplierVendedoresTab({ supplierId }: SupplierVendedoresTabProps) {
  const [vendors, setVendors] = useState<SupplierVendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: '',
    phone: '',
    mobile: '',
    email: '',
    observation: ''
  });

  useEffect(() => {
    if (supplierId) {
      loadVendors();
    }
  }, [supplierId]);

  const loadVendors = async () => {
    if (!supplierId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('supplier_vendors')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVendor = async () => {
    if (!supplierId || !newVendor.name.trim()) {
      alert('Nome do vendedor é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('supplier_vendors')
        .insert({
          supplier_id: supplierId,
          ...newVendor
        });

      if (error) throw error;

      setNewVendor({
        name: '',
        phone: '',
        mobile: '',
        email: '',
        observation: ''
      });

      await loadVendors();
    } catch (error) {
      console.error('Error adding vendor:', error);
      alert('Erro ao adicionar vendedor');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!confirm('Deseja realmente excluir este vendedor?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('supplier_vendors')
        .delete()
        .eq('id', vendorId);

      if (error) throw error;
      await loadVendors();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      alert('Erro ao excluir vendedor');
    } finally {
      setLoading(false);
    }
  };

  if (!supplierId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Salve o fornecedor primeiro para adicionar vendedores
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newVendor.name}
              onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              placeholder="Nome do vendedor"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input
              type="text"
              value={newVendor.phone}
              onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              placeholder="(00) 0000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
            <input
              type="text"
              value={newVendor.mobile}
              onChange={(e) => setNewVendor({ ...newVendor, mobile: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={newVendor.email}
              onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              placeholder="vendedor@email.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
            <input
              type="text"
              value={newVendor.observation}
              onChange={(e) => setNewVendor({ ...newVendor, observation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              placeholder="Observações sobre o vendedor"
            />
          </div>
        </div>

        <button
          onClick={handleAddVendor}
          disabled={loading || !newVendor.name.trim()}
          className="px-4 py-2 rounded-md text-white font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: arcoColors.primary.blue }}
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-700">Vendedores</h3>
        </div>

        {loading && vendors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhum vendedor cadastrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Celular
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    E-mail
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Obs.
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{vendor.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{vendor.phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{vendor.mobile || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{vendor.email || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{vendor.observation || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDeleteVendor(vendor.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
