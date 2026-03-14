import { useState, useEffect } from 'react';
import { Users, Eye, TrendingUp, Calendar, FileText, BarChart3, DollarSign, Plus, Trash2, CreditCard as Edit, Lock, Unlock } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import ClientPortalAccessModal from './ClientPortalAccessModal';
import ClientPortalView from './ClientPortalView';

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Work {
  id: string;
  name: string;
  client_id: string;
}

interface PortalAccess {
  id: string;
  client_id: string;
  work_id: string;
  access_email: string;
  is_active: boolean;
  modules_enabled: {
    budget: boolean;
    schedule: boolean;
    diary: boolean;
    dashboard: boolean;
    cashflow: boolean;
  };
  created_at: string;
  client_name?: string;
  work_name?: string;
}

export default function ClientPortalManager() {
  const [view, setView] = useState<'list' | 'portal'>('list');
  const [accesses, setAccesses] = useState<PortalAccess[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccess, setEditingAccess] = useState<PortalAccess | null>(null);
  const [selectedAccess, setSelectedAccess] = useState<PortalAccess | null>(null);
  const [filterClient, setFilterClient] = useState<string>('');
  const [filterWork, setFilterWork] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAccesses(),
        loadClients(),
        loadWorks()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAccesses = async () => {
    const { data, error } = await supabase
      .from('client_portal_access')
      .select(`
        *,
        clients:client_id(name),
        works:work_id(name)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar acessos:', error);
      return;
    }

    setAccesses((data || []).map((item: any) => ({
      ...item,
      client_name: item.clients?.name,
      work_name: item.works?.name
    })));
  };

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, email')
      .is('deleted_at', null)
      .order('name');

    if (error) {
      console.error('Erro ao carregar clientes:', error);
      return;
    }

    setClients(data || []);
  };

  const loadWorks = async () => {
    const { data, error } = await supabase
      .from('works')
      .select('id, name, client_id')
      .is('deleted_at', null)
      .order('name');

    if (error) {
      console.error('Erro ao carregar obras:', error);
      return;
    }

    setWorks(data || []);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este acesso ao portal?')) return;

    const { error } = await supabase
      .from('client_portal_access')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Erro ao remover acesso:', error);
      alert('Erro ao remover acesso');
      return;
    }

    loadAccesses();
  };

  const handleToggleActive = async (access: PortalAccess) => {
    const { error } = await supabase
      .from('client_portal_access')
      .update({ is_active: !access.is_active })
      .eq('id', access.id);

    if (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status do acesso');
      return;
    }

    loadAccesses();
  };

  const filteredAccesses = accesses.filter(access => {
    if (filterClient && access.client_id !== filterClient) return false;
    if (filterWork && access.work_id !== filterWork) return false;
    return true;
  });

  if (view === 'portal' && selectedAccess) {
    return (
      <ClientPortalView
        access={selectedAccess}
        onBack={() => {
          setView('list');
          setSelectedAccess(null);
        }}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-7 h-7" style={{ color: arcoColors.primary.blue }} />
              Portal do Cliente
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Gerencie o acesso dos clientes às informações das suas obras
            </p>
          </div>
          <button
            onClick={() => {
              setEditingAccess(null);
              setShowModal(true);
            }}
            className="px-4 py-2 rounded-md text-white flex items-center gap-2 font-medium"
            style={{ backgroundColor: arcoColors.primary.blue }}
          >
            <Plus className="w-5 h-5" />
            Novo Acesso
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Acessos</p>
                <p className="text-2xl font-bold text-gray-800">{accesses.length}</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Acessos Ativos</p>
                <p className="text-2xl font-bold text-green-600">
                  {accesses.filter(a => a.is_active).length}
                </p>
              </div>
              <Unlock className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Acessos Inativos</p>
                <p className="text-2xl font-bold text-red-600">
                  {accesses.filter(a => !a.is_active).length}
                </p>
              </div>
              <Lock className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtros</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os clientes</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Obra</label>
              <select
                value={filterWork}
                onChange={(e) => setFilterWork(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas as obras</option>
                {works
                  .filter(w => !filterClient || w.client_id === filterClient)
                  .map(work => (
                    <option key={work.id} value={work.id}>{work.name}</option>
                  ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterClient('');
                  setFilterWork('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Obra</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Email de Acesso</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Módulos Habilitados</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredAccesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Nenhum acesso encontrado
                  </td>
                </tr>
              ) : (
                filteredAccesses.map((access) => (
                  <tr key={access.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800">{access.client_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{access.work_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{access.access_email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {access.modules_enabled.budget && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Orçamento
                          </span>
                        )}
                        {access.modules_enabled.schedule && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Cronograma
                          </span>
                        )}
                        {access.modules_enabled.diary && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Diário
                          </span>
                        )}
                        {access.modules_enabled.dashboard && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            Dashboard
                          </span>
                        )}
                        {access.modules_enabled.cashflow && (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Fluxo de Caixa
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(access)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          access.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {access.is_active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedAccess(access);
                            setView('portal');
                          }}
                          className="p-1 hover:bg-blue-100 rounded text-blue-600"
                          title="Visualizar Portal"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingAccess(access);
                            setShowModal(true);
                          }}
                          className="p-1 hover:bg-yellow-100 rounded text-yellow-600"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(access.id)}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ClientPortalAccessModal
          access={editingAccess}
          clients={clients}
          works={works}
          onClose={() => {
            setShowModal(false);
            setEditingAccess(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingAccess(null);
            loadAccesses();
          }}
        />
      )}
    </div>
  );
}
