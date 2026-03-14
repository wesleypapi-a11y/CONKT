import { useState, useEffect } from 'react';
import { FolderTree, Plus, Search, X, CreditCard as Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { getEmpresaContext } from '../../utils/empresaContext';

interface AccountModalData {
  code: string;
  name: string;
  type: 'receita' | 'despesa' | 'ativo' | 'passivo';
  parent_id: string;
  description: string;
}

const ACCOUNT_TYPES = [
  { value: 'receita', label: 'Receita' },
  { value: 'despesa', label: 'Despesa' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'passivo', label: 'Passivo' }
];

export function CentroCustos() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<AccountModalData>({
    code: '',
    name: '',
    type: 'despesa',
    parent_id: '',
    description: ''
  });

  const { showAlert } = useAlert();

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [accounts, searchTerm]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('financial_accounts')
        .select(`
          *,
          parent:financial_accounts!parent_id(name)
        `)
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('code');

      if (error) throw error;

      setAccounts(data || []);
    } catch (error: any) {
      showAlert('Erro ao carregar contas gerenciais', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...accounts];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(acc =>
        acc.name?.toLowerCase().includes(term) ||
        acc.code?.toLowerCase().includes(term)
      );
    }

    setFilteredAccounts(filtered);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.code) {
        showAlert('Preencha todos os campos obrigatórios', 'error');
        return;
      }

      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const accountData = {
        empresa_id: empresaId,
        code: formData.code,
        name: formData.name,
        type: formData.type,
        parent_id: formData.parent_id || null,
        description: formData.description || null,
        created_by: user?.id
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('financial_accounts')
          .update(accountData)
          .eq('id', editingAccount.id);

        if (error) throw error;
        showAlert('Conta gerencial atualizada com sucesso', 'success');
      } else {
        const { error } = await supabase
          .from('financial_accounts')
          .insert(accountData);

        if (error) throw error;
        showAlert('Conta gerencial criada com sucesso', 'success');
      }

      setShowModal(false);
      setEditingAccount(null);
      resetForm();
      loadAccounts();
    } catch (error: any) {
      showAlert('Erro ao salvar conta gerencial', 'error');
      console.error(error);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('financial_accounts')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      showAlert(`Conta ${!currentStatus ? 'ativada' : 'desativada'} com sucesso`, 'success');
      loadAccounts();
    } catch (error: any) {
      showAlert('Erro ao alterar status', 'error');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta conta gerencial?')) return;

    try {
      const { error } = await supabase
        .from('financial_accounts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      showAlert('Conta gerencial excluída com sucesso', 'success');
      loadAccounts();
    } catch (error: any) {
      showAlert('Erro ao excluir conta gerencial', 'error');
      console.error(error);
    }
  };

  const openModal = (account?: any) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        code: account.code,
        name: account.name,
        type: account.type,
        parent_id: account.parent_id || '',
        description: account.description || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      type: 'despesa',
      parent_id: '',
      description: ''
    });
    setEditingAccount(null);
  };

  const parentAccounts = accounts.filter(acc => !acc.parent_id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Plano de Contas Gerencial</h2>
          <p className="text-gray-600 mt-1">Classificação de receitas e despesas</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          Nova Conta
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <X size={18} />
              Limpar
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Código</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Conta Pai</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Nenhuma conta gerencial encontrada
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-semibold text-gray-700">{acc.code}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{acc.name}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        acc.type === 'receita' ? 'bg-green-100 text-green-800' :
                        acc.type === 'despesa' ? 'bg-red-100 text-red-800' :
                        acc.type === 'ativo' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {ACCOUNT_TYPES.find(t => t.value === acc.type)?.label || acc.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{acc.parent?.name || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(acc.id, acc.is_active)}
                        className="inline-block"
                      >
                        {acc.is_active ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            <ToggleRight size={14} className="mr-1" />
                            Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            <ToggleLeft size={14} className="mr-1" />
                            Inativa
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openModal(acc)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(acc.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                {editingAccount ? 'Editar Conta Gerencial' : 'Nova Conta Gerencial'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingAccount(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 1.1.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {ACCOUNT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Material de Construção"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conta Pai
                </label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nenhuma (Conta Raiz)</option>
                  {parentAccounts.filter(acc => acc.id !== editingAccount?.id).map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Descreva o que esta conta gerencial engloba..."
                />
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingAccount(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingAccount ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
