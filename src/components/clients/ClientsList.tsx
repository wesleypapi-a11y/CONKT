import { useState, useEffect } from 'react';
import { Plus, Search, CreditCard as Edit, Trash2, User, Home } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { Client } from '../../types/client';
import { useAuth } from '../../contexts/AuthContext';
import ClientModal from './ClientModal';

interface ClientsListProps {
  onNavigateHome: () => void;
}

export default function ClientsList({ onNavigateHome }: ClientsListProps) {
  const { user, profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();

  useEffect(() => {
    loadClients();
  }, [profile?.empresa_id]);

  useEffect(() => {
    filterClients();
  }, [searchTerm, clients]);

  const loadClients = async () => {
    if (!user || !profile?.empresa_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    if (!searchTerm.trim()) {
      setFilteredClients(clients);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = clients.filter(client =>
      client.name.toLowerCase().includes(term) ||
      client.cpf_cnpj?.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term) ||
      client.phone?.toLowerCase().includes(term) ||
      client.mobile?.toLowerCase().includes(term)
    );
    setFilteredClients(filtered);
  };

  const handleAddClient = () => {
    setSelectedClientId(undefined);
    setModalOpen(true);
  };

  const handleEditClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setModalOpen(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    setLoading(true);
    try {
      const { data: obras, error: checkError } = await supabase
        .from('works')
        .select('id, name')
        .eq('client_id', clientId)
        .is('deleted_at', null);

      if (checkError) throw checkError;

      const obrasCount = obras?.length || 0;
      const obrasMsg = obrasCount > 0
        ? ` ATENÇÃO: ${obrasCount} obra(s) vinculada(s) também será(ão) excluída(s).`
        : '';

      if (!confirm(`Deseja realmente excluir este cliente?${obrasMsg}\n\nEsta ação não pode ser desfeita.`)) {
        setLoading(false);
        return;
      }

      if (obrasCount > 0) {
        const { error: deleteWorksError } = await supabase
          .from('works')
          .delete()
          .eq('client_id', clientId);

        if (deleteWorksError) throw deleteWorksError;
      }

      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
      alert('Cliente excluído com sucesso!');
      await loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Erro ao excluir cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedClientId(undefined);
  };

  const handleModalSave = () => {
    loadClients();
  };

  return (
    <div className="flex flex-col h-full relative">
      <button
        onClick={onNavigateHome}
        className="absolute top-0 right-0 z-10 p-2 sm:p-3 rounded-lg shadow-lg hover:shadow-xl transition-all"
        style={{
          backgroundColor: arcoColors.primary.blue,
          color: '#000000'
        }}
        title="Voltar ao Início"
      >
        <Home className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4 pr-12 sm:pr-0">
        <div className="relative flex-1 max-w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar..."
            className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            style={{}}
          />
        </div>

        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={handleAddClient}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm"
            style={{
              backgroundColor: arcoColors.primary.blue,
              color: '#1F2937'
            }}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Novo Cliente</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col min-h-0">
        {loading && clients.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">Carregando clientes...</div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <User className="w-12 h-12 mb-3 text-gray-400" />
            <p className="text-gray-600 mb-1">
              {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </p>
            {!searchTerm && (
              <p className="text-sm text-gray-500">
                Comece adicionando seu primeiro cliente
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-auto flex-1">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      CPF/CNPJ
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
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {client.photo_url ? (
                            <img
                              src={client.photo_url}
                              alt={client.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-100"
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium border-2 border-gray-100"
                              style={{ backgroundColor: arcoColors.primary.blue }}
                            >
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-900">{client.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{client.cpf_cnpj || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{client.email || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            client.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {client.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClient(client.id)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
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

            {/* Mobile Card View */}
            <div className="md:hidden overflow-auto flex-1 p-3 space-y-3">
              {filteredClients.map((client) => (
                <div key={client.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {client.photo_url ? (
                        <img
                          src={client.photo_url}
                          alt={client.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-medium border-2 border-gray-100"
                          style={{ backgroundColor: arcoColors.primary.blue }}
                        >
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{client.name}</h3>
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full mt-1 ${
                            client.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {client.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditClient(client.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    {client.cpf_cnpj && (
                      <p className="text-gray-600">
                        <span className="font-medium">CPF/CNPJ:</span> {client.cpf_cnpj}
                      </p>
                    )}
                    {client.email && (
                      <p className="text-gray-600">
                        <span className="font-medium">Email:</span> {client.email}
                      </p>
                    )}
                    {client.mobile && (
                      <p className="text-gray-600">
                        <span className="font-medium">Celular:</span> {client.mobile}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <ClientModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        clientId={selectedClientId}
        onSave={handleModalSave}
        onNavigateHome={onNavigateHome}
      />
    </div>
  );
}
