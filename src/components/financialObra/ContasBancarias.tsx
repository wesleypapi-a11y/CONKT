import { useState, useEffect } from 'react';
import { Building2, Plus, Search, X, CreditCard as Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { getEmpresaContext } from '../../utils/empresaContext';

interface BankAccountModalData {
  banco: string;
  agencia: string;
  numero_conta: string;
  tipo_conta: 'Corrente' | 'Poupança' | 'Investimento';
  saldo_inicial: string;
  work_id: string;
  observacoes: string;
}

const TIPOS_CONTA = ['Corrente', 'Poupança', 'Investimento'];

export function ContasBancarias({ workId }: { workId?: string }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [works, setWorks] = useState<any[]>([]);

  const [formData, setFormData] = useState<BankAccountModalData>({
    banco: '',
    agencia: '',
    numero_conta: '',
    tipo_conta: 'Corrente',
    saldo_inicial: '0',
    work_id: workId || '',
    observacoes: ''
  });

  const { showAlert } = useAlert();

  useEffect(() => {
    loadAccounts();
    loadWorks();
  }, [workId]);

  useEffect(() => {
    applyFilters();
  }, [accounts, searchTerm]);

  const loadWorks = async () => {
    try {
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) return;

      const { data } = await supabase
        .from('works')
        .select('id, nome')
        .eq('empresa_id', empresaId)
        .is('deleted_at', null);

      setWorks(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar obras:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        setLoading(false);
        return;
      }

      let query = supabase
        .from('financial_bank_accounts')
        .select('*, work:works(nome)')
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (workId) {
        query = query.eq('work_id', workId);
      }

      const { data, error } = await query;

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
        acc.banco.toLowerCase().includes(term) ||
        acc.numero_conta.toLowerCase().includes(term)
      );
    }

    setFilteredAccounts(filtered);
  };

  const handleSave = async () => {
    try {
      if (!formData.banco || !formData.numero_conta) {
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
        work_id: formData.work_id || null,
        banco: formData.banco,
        agencia: formData.agencia || null,
        numero_conta: formData.numero_conta,
        tipo_conta: formData.tipo_conta,
        saldo_inicial: Number(formData.saldo_inicial),
        saldo_atual: editingAccount ? undefined : Number(formData.saldo_inicial),
        observacoes: formData.observacoes || null,
        created_by: user?.id
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('financial_bank_accounts')
          .update(accountData)
          .eq('id', editingAccount.id);

        if (error) throw error;
        showAlert('Conta atualizada com sucesso', 'success');
      } else {
        const { error } = await supabase
          .from('financial_bank_accounts')
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
        .from('financial_bank_accounts')
        .update({ ativa: !currentStatus })
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
        .from('financial_bank_accounts')
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
        banco: account.banco,
        agencia: account.agencia || '',
        numero_conta: account.numero_conta,
        tipo_conta: account.tipo_conta,
        saldo_inicial: String(account.saldo_inicial),
        work_id: account.work_id || '',
        observacoes: account.observacoes || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      banco: '',
      agencia: '',
      numero_conta: '',
      tipo_conta: 'Corrente',
      saldo_inicial: '0',
      work_id: workId || '',
      observacoes: ''
    });
    setEditingAccount(null);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Banco</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Agência</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Conta</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Obra</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Saldo Atual</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    Nenhuma conta encontrada
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-semibold text-gray-700">{acc.banco}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{acc.agencia || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{acc.numero_conta}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{acc.tipo_conta}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{acc.work?.nome || 'Geral'}</td>
                    <td className="py-3 px-4 text-sm text-right font-bold text-gray-800">
                      {formatCurrency(Number(acc.saldo_atual))}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(acc.id, acc.ativa)}
                        className="flex items-center gap-1"
                      >
                        {acc.ativa ? (
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
                  Banco <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.banco}
                  onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Banco do Brasil, Itaú, Bradesco"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agência
                  </label>
                  <input
                    type="text"
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número da Conta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.numero_conta}
                    onChange={(e) => setFormData({ ...formData, numero_conta: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="00000-0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Conta <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.tipo_conta}
                    onChange={(e) => setFormData({ ...formData, tipo_conta: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {TIPOS_CONTA.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Saldo Inicial
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.saldo_inicial}
                    onChange={(e) => setFormData({ ...formData, saldo_inicial: e.target.value })}
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
                    Obra Vinculada
                  </label>
                  <select
                    value={formData.work_id}
                    onChange={(e) => setFormData({ ...formData, work_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={!!workId}
                  >
                    <option value="">Geral (Empresa)</option>
                    {works.map(work => (
                      <option key={work.id} value={work.id}>{work.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
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
