import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit, Trash2, Building2 } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { FinancialAccount } from '../../types/financial';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../hooks/useAlert';

export default function FinancialAccountsManager() {
  const { user } = useAuth();
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'operacional' as 'operacional' | 'administrativo' | 'investimento' | 'financeiro',
    work_id: '',
    status: 'ativa' as 'ativa' | 'inativa',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accountsRes, worksRes] = await Promise.all([
        supabase
          .from('financial_accounts')
          .select(`
            *,
            works!financial_accounts_work_id_fkey(id, nome)
          `)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('works')
          .select('id, nome')
          .is('deleted_at', null)
          .order('nome')
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (worksRes.error) throw worksRes.error;

      const formattedAccounts = (accountsRes.data || []).map(acc => ({
        ...acc,
        work_name: acc.works?.nome,
      }));

      setAccounts(formattedAccounts);
      setWorks(worksRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showAlert('Erro ao carregar contas gerenciais');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dataToSave = {
        ...formData,
        work_id: formData.work_id || null,
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('financial_accounts')
          .update({
            ...dataToSave,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingAccount.id);

        if (error) throw error;
        showAlert('Conta atualizada com sucesso!', 'success');
      } else {
        const { error } = await supabase
          .from('financial_accounts')
          .insert({
            ...dataToSave,
            created_by: user?.id,
          });

        if (error) throw error;
        showAlert('Conta criada com sucesso!', 'success');
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar conta:', error);
      showAlert(error.message || 'Erro ao salvar conta');
    }
  };

  const handleEdit = (account: FinancialAccount) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      work_id: account.work_id || '',
      status: account.status,
      notes: account.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    showConfirm(
      'Tem certeza que deseja excluir esta conta gerencial?',
      async () => {
        try {
          const { error } = await supabase
            .from('financial_accounts')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

          if (error) throw error;
          showAlert('Conta excluída com sucesso!', 'success');
          loadData();
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
      type: 'operacional',
      work_id: '',
      status: 'ativa',
      notes: '',
    });
    setEditingAccount(null);
  };

  const typeLabels = {
    operacional: 'Operacional',
    administrativo: 'Administrativo',
    investimento: 'Investimento',
    financeiro: 'Financeiro',
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
          Contas Gerenciais
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
          <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Nenhuma conta gerencial cadastrada</p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Obra Vinculada</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {accounts.map(account => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" style={{ color: arcoColors.primary.blue }} />
                      <span className="font-medium">{account.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{typeLabels[account.type]}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {account.work_name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        account.status === 'ativa'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {account.status === 'ativa' ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(account)}
                        className="p-1 hover:bg-blue-50 rounded"
                        style={{ color: arcoColors.primary.blue }}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="p-1 hover:bg-red-50 rounded text-red-600"
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold" style={{ color: arcoColors.primary.blue }}>
                {editingAccount ? 'Editar Conta Gerencial' : 'Nova Conta Gerencial'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={formData.type}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        type: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="operacional">Operacional</option>
                    <option value="administrativo">Administrativo</option>
                    <option value="investimento">Investimento</option>
                    <option value="financeiro">Financeiro</option>
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vincular à Obra (Opcional)
                </label>
                <select
                  value={formData.work_id}
                  onChange={e => setFormData({ ...formData, work_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nenhuma</option>
                  {works.map(work => (
                    <option key={work.id} value={work.id}>
                      {work.nome}
                    </option>
                  ))}
                </select>
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
