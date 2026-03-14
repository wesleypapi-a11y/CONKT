import { useState, useEffect } from 'react';
import { Plus, Search, CreditCard as Edit, Trash2, Briefcase, Home } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { Supplier } from '../../types/supplier';
import { useAuth } from '../../contexts/AuthContext';
import SupplierModal from './SupplierModal';

interface SuppliersListProps {
  onNavigateHome: () => void;
}

export default function SuppliersList({ onNavigateHome }: SuppliersListProps) {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | undefined>();

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    filterSuppliers();
  }, [searchTerm, suppliers]);

  const loadSuppliers = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSuppliers = () => {
    if (!searchTerm.trim()) {
      setFilteredSuppliers(suppliers);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(term) ||
      supplier.fantasy_name?.toLowerCase().includes(term) ||
      supplier.document?.toLowerCase().includes(term) ||
      supplier.email?.toLowerCase().includes(term) ||
      supplier.phone?.toLowerCase().includes(term) ||
      supplier.mobile?.toLowerCase().includes(term)
    );
    setFilteredSuppliers(filtered);
  };

  const handleAddSupplier = () => {
    setSelectedSupplierId(undefined);
    setModalOpen(true);
  };

  const handleEditSupplier = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setModalOpen(true);
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!confirm('Deseja realmente excluir este fornecedor? Todos os dados relacionados serão perdidos.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId);

      if (error) throw error;
      await loadSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Erro ao excluir fornecedor');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedSupplierId(undefined);
  };

  const handleModalSave = () => {
    loadSuppliers();
  };

  return (
    <div className="flex flex-col h-full relative">
      <button
        onClick={onNavigateHome}
        className="absolute top-0 right-0 z-10 p-3 rounded-lg shadow-lg hover:shadow-xl transition-all"
        style={{
          backgroundColor: arcoColors.primary.blue,
          color: '#000000'
        }}
        title="Voltar ao Início"
      >
        <Home className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por CNPJ, nome popular ou razão social..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            style={{}}
          />
        </div>

        <button
          onClick={handleAddSupplier}
          className="px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{
            backgroundColor: arcoColors.primary.blue,
            color: '#1F2937'
          }}
        >
          <Plus className="w-5 h-5" />
          Novo Fornecedor
        </button>
      </div>

      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col min-h-0">
        {loading && suppliers.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">Carregando fornecedores...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Briefcase className="w-12 h-12 mb-3 text-gray-400" />
            <p className="text-gray-600 mb-1">
              {searchTerm ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
            </p>
            {!searchTerm && (
              <p className="text-sm text-gray-500">
                Comece adicionando seu primeiro fornecedor
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Razão Social
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Nome Popular
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    CNPJ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {supplier.photo_url ? (
                          <img
                            src={supplier.photo_url}
                            alt={supplier.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-100"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium border-2 border-gray-100"
                            style={{ backgroundColor: arcoColors.primary.blue }}
                          >
                            {supplier.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-900">{supplier.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{supplier.fantasy_name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{supplier.document || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{supplier.email || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          supplier.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {supplier.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditSupplier(supplier.id)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SupplierModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        supplierId={selectedSupplierId}
        onSave={handleModalSave}
      />
    </div>
  );
}
