import { useState, useEffect } from 'react';
import { Trash2, Calendar, DollarSign, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ContractInstallment, Contract } from '../../types/contract';

interface ContractParcelasTabProps {
  contractId: string | null;
  refreshKey?: number;
}

export default function ContractParcelasTab({ contractId, refreshKey }: ContractParcelasTabProps) {
  const [installments, setInstallments] = useState<ContractInstallment[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ContractInstallment>>({});
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedInstallments, setSelectedInstallments] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (contractId) {
      loadContract();
      loadInstallments();
    }
  }, [contractId, refreshKey]);

  const loadContract = async () => {
    if (!contractId) return;

    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .maybeSingle();

      if (error) throw error;
      setContract(data);
    } catch (error) {
      console.error('Error loading contract:', error);
    }
  };

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

  const handleUpdateStatus = async (installmentId: string, newStatus: string) => {
    try {
      const installment = installments.find(i => i.id === installmentId);
      if (!installment) {
        alert('Parcela não encontrada');
        return;
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
      }

      const { error } = await supabase
        .from('contract_installments')
        .update(updateData)
        .eq('id', installmentId);

      if (error) throw error;

      // Se marcou como pago E tem contrato vinculado, criar pedido
      if (newStatus === 'pago' && contract) {
        await createPurchaseOrderFromInstallment(installment);
      }

      await loadInstallments();
      alert('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert(`Erro: ${error instanceof Error ? error.message : 'Erro ao atualizar status'}`);
    }
  };

  const createPurchaseOrderFromInstallment = async (installment: ContractInstallment) => {
    if (!contract) {
      console.error('Contrato não carregado');
      return;
    }

    if (!contract.work_id) {
      console.error('Contrato sem obra vinculada');
      alert('Erro: Contrato sem obra vinculada. Não foi possível criar o pedido.');
      return;
    }

    if (!contract.supplier_id) {
      console.error('Contrato sem fornecedor');
      alert('Erro: Contrato sem fornecedor. Não foi possível criar o pedido.');
      return;
    }

    try {
      const { count } = await supabase
        .from('purchase_orders')
        .select('id', { count: 'exact', head: true })
        .like('order_number', 'PC-%');

      const orderNumber = `PC-${String((count || 0) + 1).padStart(5, '0')}`;

      // Criar pedido com fase e subfase do contrato
      const { data: newOrder, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          order_number: orderNumber,
          supplier_id: contract.supplier_id,
          work_id: contract.work_id,
          phase_id: contract.budget_phase_id,
          subphase_id: contract.budget_subphase_id,
          total_value: installment.amount,
          delivery_address: '',
          payment_conditions: `Parcela ${installment.installment_number}/${contract.installments_count} - Contrato ${contract.contract_number}`,
          observations: `Pagamento referente à parcela ${installment.installment_number} do contrato ${contract.contract_number}`,
          status: 'pendente',
          is_paid: true,
          payment_date: installment.paid_date || new Date().toISOString().split('T')[0],
          frozen: false
        })
        .select()
        .single();

      if (orderError) {
        console.error('[CreateOrder] Erro ao criar pedido:', orderError);
        throw orderError;
      }

      // Atualizar parcela com o número do PC
      await supabase
        .from('contract_installments')
        .update({ purchase_order_number: orderNumber })
        .eq('id', installment.id);

      // Criar item do pedido
      const { error: itemError } = await supabase
        .from('purchase_order_items')
        .insert({
          order_id: newOrder.id,
          item_type: 'servico',
          item_name: `Parcela ${installment.installment_number}/${contract.installments_count} - ${contract.scope || 'Serviço'}`,
          complement: `Contrato ${contract.contract_number}`,
          quantity: 1,
          unit: 'UN',
          unit_price: installment.amount,
          total_price: installment.amount,
          phase_id: contract.budget_phase_id,
          subphase_id: contract.budget_subphase_id
        });

      if (itemError) {
        console.error('[CreateOrder] Erro ao criar item:', itemError);
        throw itemError;
      }

      // Criar lançamento no realizado (se houver orçamento)
      if (contract.budget_id && contract.budget_phase_id && contract.budget_subphase_id) {
        const { data: orderItemData } = await supabase
          .from('purchase_order_items')
          .select('id')
          .eq('order_id', newOrder.id)
          .single();

        if (orderItemData) {
          const { error: realizedError } = await supabase
            .from('budget_realized')
            .insert({
              budget_id: contract.budget_id,
              phase_id: contract.budget_phase_id,
              subphase_id: contract.budget_subphase_id,
              purchase_order_id: newOrder.id,
              purchase_order_item_id: orderItemData.id,
              amount: installment.amount,
              description: `Contrato ${contract.contract_number} - Parcela ${installment.installment_number}`,
              created_by: contract.user_id
            });

          if (realizedError) {
            console.error('[CreateOrder] Erro ao lançar no realizado:', realizedError);
          }
        }
      }

      alert(`✅ Parcela marcada como paga e Pedido ${orderNumber} criado com sucesso!`);

      await loadInstallments();
    } catch (error) {
      console.error('[CreateOrder] Erro ao criar pedido:', error);
      alert(`Parcela marcada como paga, mas houve erro ao criar pedido: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleToggleSelect = (installmentId: string) => {
    const newSelected = new Set(selectedInstallments);
    if (newSelected.has(installmentId)) {
      newSelected.delete(installmentId);
    } else {
      newSelected.add(installmentId);
    }
    setSelectedInstallments(newSelected);
  };

  const handleToggleSelectAll = () => {
    if (selectedInstallments.size === filteredInstallments.length) {
      setSelectedInstallments(new Set());
    } else {
      setSelectedInstallments(new Set(filteredInstallments.map(i => i.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedInstallments.size === 0) {
      alert('Nenhuma parcela selecionada');
      return;
    }

    if (!confirm(`Deseja realmente excluir ${selectedInstallments.size} parcela(s) selecionada(s)?`)) return;

    try {
      const { error } = await supabase
        .from('contract_installments')
        .delete()
        .in('id', Array.from(selectedInstallments));

      if (error) throw error;
      setSelectedInstallments(new Set());
      await loadInstallments();
    } catch (error) {
      console.error('Error deleting installments:', error);
      alert('Erro ao excluir parcelas');
    }
  };

  const handleGenerateInstallments = async () => {
    if (!contract || !contractId) {
      alert('Contrato não encontrado');
      return;
    }

    if (!contract.first_due_date) {
      alert('Por favor, defina o vencimento da 1ª parcela na aba "Pagamento"');
      return;
    }

    if (installments.length > 0) {
      if (!confirm('Já existem parcelas cadastradas. Deseja apagá-las e gerar novamente?')) {
        return;
      }
      try {
        const { error } = await supabase
          .from('contract_installments')
          .delete()
          .eq('contract_id', contractId);

        if (error) throw error;
      } catch (error) {
        console.error('Error deleting existing installments:', error);
        alert('Erro ao apagar parcelas existentes');
        return;
      }
    }

    setGenerating(true);
    try {
      const installmentsCount = contract.installments_count || 1;
      const totalValue = contract.total_value || 0;
      const installmentValue = totalValue / installmentsCount;
      const recurrenceDays = contract.recurrence_days || 30;

      const firstDueDate = new Date(contract.first_due_date + 'T00:00:00');

      const installmentsToCreate = [];
      for (let i = 0; i < installmentsCount; i++) {
        const dueDate = new Date(firstDueDate);
        dueDate.setDate(dueDate.getDate() + (i * recurrenceDays));

        installmentsToCreate.push({
          contract_id: contractId,
          installment_number: i + 1,
          due_date: dueDate.toISOString().split('T')[0],
          amount: i === installmentsCount - 1
            ? totalValue - (installmentValue * (installmentsCount - 1))
            : installmentValue,
          status: 'pendente',
          notes: ''
        });
      }

      const { error } = await supabase
        .from('contract_installments')
        .insert(installmentsToCreate);

      if (error) throw error;

      alert('Parcelas geradas com sucesso!');
      await loadInstallments();
    } catch (error) {
      console.error('Error generating installments:', error);
      alert('Erro ao gerar parcelas');
    } finally {
      setGenerating(false);
    }
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

  const filteredInstallments = statusFilter === 'todos'
    ? installments
    : installments.filter(i => i.status === statusFilter);

  const totalPaid = installments
    .filter(i => i.status === 'pago')
    .reduce((sum, i) => sum + (i.paid_amount || i.amount), 0);

  const totalPending = installments
    .filter(i => i.status !== 'pago')
    .reduce((sum, i) => sum + i.amount, 0);

  if (!contractId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Salve o contrato primeiro para gerenciar parcelas
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Total Pago</p>
              <p className="text-2xl font-bold text-green-900">
                R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Check className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">Total Pendente</p>
              <p className="text-2xl font-bold text-yellow-900">
                R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total de Parcelas</p>
              <p className="text-2xl font-bold text-blue-900">{installments.length}</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filtrar por Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            style={{}}
          >
            <option value="todos">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="parcial">Parcial</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          {selectedInstallments.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              title={`Excluir ${selectedInstallments.size} parcela(s) selecionada(s)`}
            >
              <Trash2 className="w-4 h-4" />
              Excluir Selecionadas ({selectedInstallments.size})
            </button>
          )}

          <button
            onClick={handleGenerateInstallments}
            disabled={generating || !contract}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Gerando...' : installments.length > 0 ? 'Regenerar Parcelas' : 'Gerar Parcelas'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Carregando...</div>
      ) : filteredInstallments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">Nenhuma parcela cadastrada</p>
          <p className="text-sm mb-4">
            {contract?.first_due_date
              ? 'Clique no botão "Gerar Parcelas" acima para criar as parcelas automaticamente'
              : 'Defina o vencimento da 1ª parcela na aba "Pagamento" e depois clique em "Gerar Parcelas"'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={filteredInstallments.length > 0 && selectedInstallments.size === filteredInstallments.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parcela</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago em</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Pago</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PC</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInstallments.map((installment) => (
                <tr key={installment.id} className={`hover:bg-gray-50 ${isOverdue(installment.due_date, installment.status) ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedInstallments.has(installment.id)}
                      onChange={() => handleToggleSelect(installment.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {installment.installment_number}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {editingId === installment.id ? (
                      <input
                        type="date"
                        value={editForm.due_date || ''}
                        onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      <>
                        {new Date(installment.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        {isOverdue(installment.due_date, installment.status) && (
                          <span className="ml-2 text-red-600 text-xs">Atrasada</span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {editingId === installment.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.amount || 0}
                        onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                        className="w-24 px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      `R$ ${installment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {editingId === installment.id ? (
                      <select
                        value={editForm.status || ''}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ContractInstallment['status'] })}
                        className="px-2 py-1 border border-gray-300 rounded"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                        <option value="parcial">Parcial</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(installment.status)}`}>
                        {getStatusLabel(installment.status)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {installment.paid_date ? new Date(installment.paid_date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {installment.paid_amount ? `R$ ${installment.paid_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    {installment.purchase_order_number ? (
                      <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                        {installment.purchase_order_number}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
