import { useState, useEffect } from 'react';
import { Check, Calendar, CreditCard as Edit, Trash2, X, Save } from 'lucide-react';
import { Contract, ContractInstallment } from '../../types/contract';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';

interface ContractPagamentoTabProps {
  contract: Partial<Contract>;
  setContract: React.Dispatch<React.SetStateAction<Partial<Contract>>>;
  contractId?: string;
  validationErrors?: {[key: string]: boolean};
  onInstallmentUpdate?: () => void;
}

export default function ContractPagamentoTab({ contract, setContract, contractId, validationErrors = {}, onInstallmentUpdate }: ContractPagamentoTabProps) {
  const { showSuccess, showError, AlertComponent } = useAlert();
  const [installments, setInstallments] = useState<ContractInstallment[]>([]);
  const [loading, setLoading] = useState(false);
  const [budgetPhases, setBudgetPhases] = useState<any[]>([]);
  const [budgetSubphases, setBudgetSubphases] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ContractInstallment>>({});

  useEffect(() => {
    if (contractId && contract.payment_method === 'parcelado') {
      loadInstallments();
    }
  }, [contractId, contract.payment_method]);

  useEffect(() => {
    if (contract.work_id) {
      loadBudgetFromWork();
    } else {
      setBudgetPhases([]);
      setBudgetSubphases([]);
    }
  }, [contract.work_id]);

  useEffect(() => {
    if (contract.budget_phase_id) {
      loadBudgetSubphases();
    } else {
      setBudgetSubphases([]);
    }
  }, [contract.budget_phase_id]);

  const loadInstallments = async () => {
    if (!contractId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contract_installments')
        .select('*')
        .eq('contract_id', contractId)
        .order('installment_number', { ascending: true });

      if (error) throw error;
      setInstallments(data || []);
    } catch (error) {
      console.error('Error loading installments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBudgetFromWork = async () => {
    if (!contract.work_id) return;

    try {
      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .select('id')
        .eq('work_id', contract.work_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (budgetError) throw budgetError;

      if (budget) {
        await loadBudgetPhases(budget.id);
      } else {
        setBudgetPhases([]);
      }
    } catch (error) {
      console.error('Error loading budget from work:', error);
      setBudgetPhases([]);
    }
  };

  const loadBudgetPhases = async (budgetId: string) => {
    try {
      const { data, error } = await supabase
        .from('budget_items')
        .select('id, descricao, etapa')
        .eq('budget_id', budgetId)
        .eq('tipo', 'macro')
        .is('parent_id', null)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('Error loading phases:', error);
        setBudgetPhases([]);
        return;
      }

      setBudgetPhases(data || []);
    } catch (error) {
      console.error('Error loading budget phases:', error);
      setBudgetPhases([]);
    }
  };

  const loadBudgetSubphases = async () => {
    if (!contract.budget_phase_id) return;

    try {
      const { data, error } = await supabase
        .from('budget_items')
        .select('id, descricao')
        .eq('parent_id', contract.budget_phase_id)
        .eq('tipo', 'item')
        .order('ordem', { ascending: true });

      if (error) throw error;
      setBudgetSubphases(data || []);
    } catch (error) {
      console.error('Error loading budget subphases:', error);
    }
  };

  const handleToggleInstallmentPaid = async (installmentId: string, currentStatus: string) => {
    let createdOrderNumber: string | null = null;
    try {
      const newStatus = currentStatus === 'pago' ? 'pendente' : 'pago';
      const installment = installments.find(i => i.id === installmentId);

      if (!installment) {
        showError('Parcela não encontrada');
        return;
      }

      if (newStatus === 'pago') {
        if (!contractId) {
          showError('Contrato não encontrado');
          return;
        }

        const { data: fullContract, error: contractError } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', contractId)
          .single();

        if (contractError || !fullContract) {
          showError('Erro ao carregar dados do contrato');
          console.error('Error loading contract:', contractError);
          return;
        }

        if (!fullContract.budget_phase_id) {
          showError('Por favor, selecione a Fase do Orçamento antes de marcar como pago');
          return;
        }

        if (!fullContract.supplier_id) {
          showError('Este contrato não possui fornecedor vinculado');
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          showError('Usuário não autenticado');
          return;
        }

        const { count } = await supabase
          .from('purchase_orders')
          .select('id', { count: 'exact', head: true })
          .like('order_number', 'PC-%');

        const orderNumber = `PC-${String((count || 0) + 1).padStart(5, '0')}`;
        const paidAmount = installment.paid_amount || installment.amount;
        const paidDate = new Date().toISOString().split('T')[0];

        const purchaseOrderData = {
          order_number: orderNumber,
          supplier_id: fullContract.supplier_id,
          work_id: fullContract.work_id || null,
          total_value: paidAmount,
          delivery_address: '',
          delivery_date: paidDate,
          payment_conditions: `Pagamento referente à parcela ${installment.installment_number} do contrato ${fullContract.contract_number}`,
          observations: `Pedido gerado automaticamente pelo pagamento da parcela ${installment.installment_number}`,
          status: 'aprovado',
          requester_id: user.id,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          frozen: false,
          phase_id: fullContract.budget_phase_id,
          subphase_id: fullContract.budget_subphase_id || null,
          payment_date: paidDate,
          is_paid: true,
          responsible_id: user.id,
          freight_value: 0,
          discount_value: 0,
          notes: `Contrato: ${fullContract.contract_number || ''} - Parcela ${installment.installment_number}`
        };

        const { data: newOrder, error: orderError } = await supabase
          .from('purchase_orders')
          .insert(purchaseOrderData)
          .select()
          .single();

        if (orderError) {
          console.error('Error creating purchase order:', orderError);
          showError('Erro ao criar pedido de compra: ' + orderError.message);
          return;
        }

        createdOrderNumber = orderNumber;

        const orderItemData = {
          order_id: newOrder.id,
          item_type: 'servico',
          phase: '',
          service: `Pagamento Parcela ${installment.installment_number}`,
          item_name: `Parcela ${installment.installment_number} - Contrato ${fullContract.contract_number || ''}`,
          complement: `Vencimento: ${new Date(installment.due_date).toLocaleDateString('pt-BR')}`,
          quantity: 1,
          unit: 'UN',
          unit_price: paidAmount,
          total_price: paidAmount,
          phase_id: fullContract.budget_phase_id,
          subphase_id: fullContract.budget_subphase_id || null
        };

        const { error: itemError } = await supabase
          .from('purchase_order_items')
          .insert(orderItemData)
          .select()
          .single();

        if (itemError) {
          console.error('Error creating order item:', itemError);
          await supabase.from('purchase_orders').delete().eq('id', newOrder.id);
          showError('Erro ao criar item do pedido: ' + itemError.message);
          return;
        }
      }

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'pago') {
        updateData.paid_date = new Date().toISOString().split('T')[0];
        if (!installment.paid_amount) {
          updateData.paid_amount = installment.amount;
        }
        if (createdOrderNumber) {
          updateData.purchase_order_number = createdOrderNumber;
        }
      } else {
        updateData.paid_date = null;
        updateData.paid_amount = null;
        updateData.purchase_order_number = null;
      }

      const { error } = await supabase
        .from('contract_installments')
        .update(updateData)
        .eq('id', installmentId);

      if (error) throw error;

      if (newStatus === 'pago') {
        if (createdOrderNumber) {
          showSuccess(`Parcela marcada como paga!\n\nPedido de Compra criado com sucesso: ${createdOrderNumber}\n\nVocê pode visualizar o pedido na aba "Compras > Pedidos".`);
        } else {
          showSuccess('Parcela marcada como paga!');
        }
      } else {
        showSuccess('Parcela desmarcada como paga');
      }

      await loadInstallments();

      // Notificar que a parcela foi atualizada
      if (onInstallmentUpdate) {
        onInstallmentUpdate();
      }
    } catch (error) {
      console.error('Error updating installment:', error);
      showError('Erro ao atualizar parcela: ' + (error as any)?.message || 'Erro desconhecido');
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'parcial': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pago': return 'Pago';
      case 'pendente': return 'Pendente';
      case 'parcial': return 'Parcial';
      default: return status;
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'pago') return false;
    return new Date(dueDate) < new Date();
  };

  const handleEdit = (installment: ContractInstallment) => {
    setEditingId(installment.id);
    setEditForm({
      due_date: installment.due_date,
      amount: installment.amount,
      paid_amount: installment.paid_amount,
      paid_date: installment.paid_date
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('contract_installments')
        .update({
          due_date: editForm.due_date,
          amount: editForm.amount,
          paid_amount: editForm.paid_amount,
          paid_date: editForm.paid_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;

      setEditingId(null);
      setEditForm({});
      await loadInstallments();
      showSuccess('Parcela atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating installment:', error);
      showError('Erro ao atualizar parcela');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = async (installmentId: string) => {
    if (!confirm('Deseja realmente excluir esta parcela?')) return;

    try {
      const { error } = await supabase
        .from('contract_installments')
        .delete()
        .eq('id', installmentId);

      if (error) throw error;

      await loadInstallments();
      showSuccess('Parcela excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting installment:', error);
      showError('Erro ao excluir parcela');
    }
  };

  return (
    <div className="space-y-6">
      <AlertComponent />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor Total do Contrato <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={contract.total_value || ''}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                setContract(prev => ({ ...prev, total_value: value }));
              }}
              placeholder="0.00"
              className={`w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                validationErrors.total_value ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
              }`}
              required
            />
            {validationErrors.total_value && (
              <p className="text-red-500 text-sm mt-1">O valor deve ser maior que zero</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Forma de Pagamento
          </label>
          <select
            value={contract.payment_method || ''}
            onChange={(e) => setContract(prev => ({ ...prev, payment_method: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            style={{}}
          >
            <option value="">Selecione</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="transferencia">Transferência Bancária</option>
            <option value="cheque">Cheque</option>
            <option value="boleto">Boleto Bancário</option>
            <option value="cartao_credito">Cartão de Crédito</option>
            <option value="cartao_debito">Cartão de Débito</option>
            <option value="parcelado">Parcelado</option>
            <option value="permuta">Permuta</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número de Parcelas
          </label>
          <input
            type="number"
            min="1"
            value={contract.installments_count || 1}
            onChange={(e) => setContract(prev => ({ ...prev, installments_count: parseInt(e.target.value) || 1 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            style={{}}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vencimento da 1ª Parcela
          </label>
          <input
            type="date"
            value={contract.first_due_date || ''}
            onChange={(e) => setContract(prev => ({ ...prev, first_due_date: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            style={{}}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recorrência (Dias entre parcelas)
          </label>
          <input
            type="number"
            min="1"
            value={contract.recurrence_days || 30}
            onChange={(e) => setContract(prev => ({ ...prev, recurrence_days: parseInt(e.target.value) || 30 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            style={{}}
            placeholder="30"
          />
          <p className="text-xs text-gray-500 mt-1">Ex: 7 dias, 15 dias, 30 dias</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor da Parcela (Calculado)
          </label>
          <input
            type="text"
            value={contract.total_value && contract.installments_count
              ? formatCurrency(contract.total_value / contract.installments_count)
              : 'R$ 0,00'}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
          />
        </div>
      </div>

      {contract.work_id && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Apropriação do Contrato</h3>
          <p className="text-sm text-gray-600 mb-4">
            Vincule este contrato a uma fase e subfase do orçamento da obra para facilitar o controle financeiro.
          </p>

          {budgetPhases.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Atenção:</strong> Esta obra não possui orçamento cadastrado ou o orçamento não possui fases. Para apropriar o contrato, primeiro crie um orçamento com fases para a obra.
              </p>
              <p className="text-xs text-yellow-700 mt-2">
                Debug: work_id = {contract.work_id}, fases carregadas = {budgetPhases.length}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fase do Orçamento
                </label>
                <select
                  value={contract.budget_phase_id || ''}
                  onChange={(e) => {
                    setContract(prev => ({
                      ...prev,
                      budget_phase_id: e.target.value || undefined,
                      budget_subphase_id: undefined
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{}}
                >
                  <option value="">Selecione uma fase</option>
                  {budgetPhases.map(phase => (
                    <option key={phase.id} value={phase.id}>
                      {phase.etapa} - {phase.descricao}
                    </option>
                  ))}
                </select>
              </div>

              {contract.budget_phase_id && budgetSubphases.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item do Orçamento
                  </label>
                  <select
                    value={contract.budget_subphase_id || ''}
                    onChange={(e) => {
                      setContract(prev => ({
                        ...prev,
                        budget_subphase_id: e.target.value || undefined
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                    style={{}}
                  >
                    <option value="">Selecione um item</option>
                    {budgetSubphases.map(subphase => (
                      <option key={subphase.id} value={subphase.id}>
                        {subphase.descricao}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Resumo do Pagamento</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-700">Valor Total:</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(contract.total_value || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Parcelas:</span>
            <span className="font-semibold text-gray-900">
              {contract.installments_count || 1}x de {contract.total_value && contract.installments_count
                ? formatCurrency(contract.total_value / contract.installments_count)
                : 'R$ 0,00'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Forma de Pagamento:</span>
            <span className="font-semibold text-gray-900">
              {contract.payment_method ? contract.payment_method.charAt(0).toUpperCase() + contract.payment_method.slice(1).replace('_', ' ') : '-'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Dica:</strong> As parcelas serão criadas automaticamente na aba "Parcelas" após salvar o contrato.
          Você poderá ajustar as datas e valores individuais de cada parcela conforme necessário.
        </p>
      </div>

      {contract.payment_method === 'parcelado' && contractId && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Parcelas do Contrato
          </h3>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando parcelas...</div>
          ) : installments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhuma parcela criada ainda.</p>
              <p className="text-sm mt-2">As parcelas serão criadas automaticamente ao salvar o contrato.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {installments.map((installment) => (
                <div
                  key={installment.id}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                    editingId === installment.id
                      ? 'bg-blue-50 border-blue-300'
                      : installment.status === 'pago'
                      ? 'bg-green-50 border-green-200'
                      : isOverdue(installment.due_date, installment.status)
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {editingId === installment.id ? (
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900">
                          Parcela {installment.installment_number}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Vencimento
                          </label>
                          <input
                            type="date"
                            value={editForm.due_date || ''}
                            onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Valor da Parcela
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.amount || 0}
                            onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Data do Pagamento
                          </label>
                          <input
                            type="date"
                            value={editForm.paid_date || ''}
                            onChange={(e) => setEditForm({ ...editForm, paid_date: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Valor Pago
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.paid_amount || 0}
                            onChange={(e) => setEditForm({ ...editForm, paid_amount: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={handleSaveEdit}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          Salvar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 flex-1">
                      <button
                        onClick={() => handleToggleInstallmentPaid(installment.id, installment.status)}
                        disabled={editingId !== null}
                        className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                          installment.status === 'pago'
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-green-500'
                        } ${editingId !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {installment.status === 'pago' && <Check className="w-4 h-4 text-gray-900" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-semibold text-gray-900">
                            Parcela {installment.installment_number}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(installment.status)}`}>
                            {getStatusLabel(installment.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Vencimento: {new Date(installment.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            {isOverdue(installment.due_date, installment.status) && (
                              <span className="ml-1 text-red-600 font-medium">Atrasada</span>
                            )}
                          </span>
                          {installment.paid_date && (
                            <span className="text-green-600">
                              Pago em: {new Date(installment.paid_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(installment.amount)}
                        </div>
                        {installment.paid_amount && installment.paid_amount !== installment.amount && (
                          <div className="text-sm text-green-600">
                            Pago: {formatCurrency(installment.paid_amount)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(installment)}
                          disabled={editingId !== null}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Editar parcela"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(installment.id)}
                          disabled={editingId !== null}
                          className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Excluir parcela"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-200">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium mb-1">Total Pago</p>
                  <p className="text-xl font-bold text-green-900">
                    {formatCurrency(
                      installments
                        .filter(i => i.status === 'pago')
                        .reduce((sum, i) => sum + (i.paid_amount || i.amount), 0)
                    )}
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-600 font-medium mb-1">Total Pendente</p>
                  <p className="text-xl font-bold text-yellow-900">
                    {formatCurrency(
                      installments
                        .filter(i => i.status !== 'pago')
                        .reduce((sum, i) => sum + i.amount, 0)
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
