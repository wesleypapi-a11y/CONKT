import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit, Trash2, CreditCard, Eye, EyeOff } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { BankAccount } from '../../types/financial';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../hooks/useAlert';

export default function BankAccountsManager() {
  const { user } = useAuth();
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    bank_name: '',
    account_type: 'conta_corrente' as 'conta_corrente' | 'poupanca' | 'investimento',
    agency: '',
    account_number: '',
    initial_balance: 0,
    status: 'ativa' as 'ativa' | 'inativa',
    notes: '',
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      showAlert('Erro ao carregar contas bancárias');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAccount) {
        const { error } = await supabase
          .from('bank_accounts')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingAccount.id);

        if (error) throw error;
        showAlert('Conta atualizada com sucesso!', 'success');
      } else {
        const { error } = await supabase
          .from('bank_accounts')
          .insert({
            ...formData,
            current_balance: formData.initial_balance,
            created_by: user?.id,
          });

        if (error) throw error;
        showAlert('Conta criada com sucesso!', 'success');
      }

      setShowModal(false);
      resetForm();
      loadAccounts();
    } catch (error: any) {
      console.error('Erro ao salvar conta:', error);
      showAlert(error.message || 'Erro ao salvar conta');
    }
  };

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      bank_name: account.bank_name,
      account_type: account.account_type,
      agency: account.agency || '',
      account_number: account.account_number || '',
      initial_balance: account.initial_balance,
      status: account.status,
      notes: account.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    showConfirm(
      'Tem certeza que deseja excluir esta conta bancária?',
      async () => {
        try {
          const { error } = await supabase
            .from('bank_accounts')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

          if (error) throw error;
          showAlert('Conta excluída com sucesso!', 'success');
          loadAccounts();
        } catch (error) {
          console.error('Erro ao excluir conta:', error);
          showAlert('Erro ao excluir conta');
        }
      }
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      bank_name: '',
      account_type: 'conta_corrente',
      agency: '',
      account_number: '',
      initial_balance: 0,
      status: 'ativa',
      notes: '',
    });
    setEditingAccount(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const accountTypeLabels = {
    conta_corrente: 'Conta Corrente',
    poupanca: 'Poupança',
    investimento: 'Investimento',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AlertComponent />

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold" style={{ color: arcoColors.primary.blue }}>
          Contas Bancárias
        </h2>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
          style={{ backgroundColor: arcoColors.primary.blue }}
        >
          <Plus className="w-5 h-5" />
          Nova Conta
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Nenhuma conta bancária cadastrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(account => (
            <div key={account.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" style={{ color: arcoColors.primary.blue }} />
                  <h3 className="font-semibold text-gray-900">{account.name}</h3>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    account.status === 'ativa'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {account.status === 'ativa' ? 'Ativa' : 'Inativa'}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Banco:</span>
                  <span className="ml-2 font-medium">{account.bank_name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Tipo:</span>
                  <span className="ml-2 font-medium">{accountTypeLabels[account.account_type]}</span>
                </div>
                {account.agency && (
                  <div>
                    <span className="text-gray-600">Agência:</span>
                    <span className="ml-2 font-medium">{account.agency}</span>
                  </div>
                )}
                {account.account_number && (
                  <div>
                    <span className="text-gray-600">Conta:</span>
                    <span className="ml-2 font-medium">{account.account_number}</span>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <span className="text-gray-600">Saldo Atual:</span>
                  <div className="text-lg font-bold" style={{ color: arcoColors.primary.blue }}>
                    {formatCurrency(account.current_balance)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                <button
                  onClick={() => handleEdit(account)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border rounded hover:bg-gray-50"
                  style={{ color: arcoColors.primary.blue, borderColor: arcoColors.primary.blue }}
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="px-3 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold" style={{ color: arcoColors.primary.blue }}>
                {editingAccount ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Conta *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Banco *
                  </label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Conta *
                  </label>
                  <select
                    value={formData.account_type}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        account_type: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="conta_corrente">Conta Corrente</option>
                    <option value="poupanca">Poupança</option>
                    <option value="investimento">Investimento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ativa">Ativa</option>
                    <option value="inativa">Inativa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agência</label>
                  <input
                    type="text"
                    value={formData.agency}
                    onChange={e => setFormData({ ...formData, agency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conta</label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Saldo Inicial *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.initial_balance}
                    onChange={e =>
                      setFormData({ ...formData, initial_balance: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white rounded-lg"
                  style={{ backgroundColor: arcoColors.primary.blue }}
                >
                  {editingAccount ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
