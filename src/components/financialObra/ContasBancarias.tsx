import { useState, useEffect } from 'react';
import { Building2, Plus, Search, X, CreditCard as Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { getEmpresaContext } from '../../utils/empresaContext';

interface BankAccountModalData {
  name: string;
  bank_name: string;
  account_number: string;
  account_type: 'corrente' | 'poupanca' | 'investimento';
  initial_balance: string;
  notes: string;
}

const ACCOUNT_TYPES = [
  { value: 'corrente', label: 'Corrente' },
  { value: 'poupanca', label: 'Poupança' },
  { value: 'investimento', label: 'Investimento' }
];

export function ContasBancarias({ workId }: { workId?: string }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<BankAccountModalData>({
    name: '',
    bank_name: '',
    account_number: '',
    account_type: 'corrente',
    initial_balance: '0',
    notes: ''
  });

  const { showAlert } = useAlert();

  useEffect(() => {
    loadAccounts();
  }, [workId]);

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
        .from('bank_accounts')
        .select('*')
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAccounts(data || []);
    } catch (error: any) {
      showAlert('Erro ao carregar contas', 'error');
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
        acc.bank_name?.toLowerCase().includes(term) ||
        acc.name?.toLowerCase().includes(term) ||
        acc.account_number?.toLowerCase().includes(term)
      );
    }

    setFilteredAccounts(filtered);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.bank_name || !formData.account_number) {
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
        name: formData.name,
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        account_type: formData.account_type,
        initial_balance: Number(formData.initial_balance),
        current_balance: editingAccount ? undefined : Number(formData.initial_balance),
        notes: formData.notes || null,
        created_by: user?.id
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('bank_accounts')
          .update(accountData)
          .eq('id', editingAccount.id);

        if (error) throw error;
        showAlert('Conta atualizada com sucesso', 'success');
      } else {
        const { error } = await supabase
          .from('bank_accounts')
          .insert(accountData);

        if (error) throw error;
        showAlert('Conta criada com sucesso', 'success');
      }

      setShowModal(false);
      setEditingAccount(null);
      resetForm();
      loadAccounts();
    } catch (error: any) {
      showAlert('Erro ao salvar conta', 'error');
      console.error(error);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      showAlert(`Conta ${!currentStatus ? 'ativada' : 'desativada'} com sucesso`, 'success');
      loadAccounts();
    } catch (error: any) {
      showAlert('Erro ao alterar status da conta', 'error');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta conta?')) return;

    try {
      const { error } = await supabase
        .from('bank_accounts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      showAlert('Conta excluída com sucesso', 'success');
      loadAccounts();
    } catch (error: any) {
      showAlert('Erro ao excluir conta', 'error');
      console.error(error);
    }
  };

  const openModal = (account?: any) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        bank_name: account.bank_name,
        account_number: account.account_number,
        account_type: account.account_type,
        initial_balance: String(account.initial_balance),
        notes: account.notes || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      bank_name: '',
      account_number: '',
      account_type: 'corrente',
      initial_balance: '0',
      notes: ''
    });
    setEditingAccount(null);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const calculateTotalBalance = () => {
    return filteredAccounts
      .filter(acc => acc.is_active)
      .reduce((sum, acc) => sum + Number(acc.current_balance || 0), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Contas Bancárias</h2>
          <p className="text-gray-600 mt-1">Gerenciamento de contas bancárias</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          Nova Conta
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
        <p className="text-sm text-gray-600">Saldo Total das Contas Ativas</p>
        <p className="text-3xl font-bold text-blue-600 mt-1">{formatCurrency(calculateTotalBalance())}</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por banco ou número da conta..."
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
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Banco</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Conta</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Saldo Atual</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Nenhuma conta encontrada
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-semibold text-gray-700">{acc.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{acc.bank_name}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{acc.account_number}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {ACCOUNT_TYPES.find(t => t.value === acc.account_type)?.label || acc.account_type}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-bold text-gray-800">
                      {formatCurrency(Number(acc.current_balance || 0))}
                    </td>
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
                {editingAccount ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Conta <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Conta Principal, Conta Obra X"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banco <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Banco do Brasil, Itaú, Bradesco"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número da Conta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="00000-0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Conta <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value as any })}
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
                  Saldo Inicial
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.initial_balance}
                  onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0,00"
                  disabled={!!editingAccount}
                />
                {editingAccount && (
                  <p className="text-xs text-gray-500 mt-1">Saldo inicial não pode ser alterado</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Informações adicionais..."
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
