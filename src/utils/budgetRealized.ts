import { supabase } from '../lib/supabase';

export interface BudgetRealizedEntry {
  budget_id: string;
  phase_id: string;
  subphase_id?: string;
  purchase_order_id: string;
  order_item_index: number;
  amount: number;
  description: string;
  created_by: string;
}

export async function addBudgetRealizedFromOrder(
  orderId: string,
  workId: string,
  items: any[],
  phaseId: string | null,
  subphaseId: string | null,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[BudgetRealized] Adicionando realizado para pedido:', orderId);

    const { data: budgetData, error: budgetError } = await supabase
      .from('budgets')
      .select('id')
      .eq('work_id', workId)
      .eq('status', 'approved')
      .maybeSingle();

    if (budgetError) {
      console.error('[BudgetRealized] Erro ao buscar orçamento:', budgetError);
      return { success: false, error: budgetError.message };
    }

    if (!budgetData) {
      console.log('[BudgetRealized] Nenhum orçamento aprovado encontrado para a obra');
      return { success: true };
    }

    const entries: BudgetRealizedEntry[] = items.map((item, index) => ({
      budget_id: budgetData.id,
      phase_id: item.phase_id || phaseId || '',
      subphase_id: item.subphase_id || subphaseId || null,
      purchase_order_id: orderId,
      order_item_index: index,
      amount: item.total_price || 0,
      description: item.description || '',
      created_by: userId
    }));

    const validEntries = entries.filter(entry => entry.phase_id);

    if (validEntries.length === 0) {
      console.log('[BudgetRealized] Nenhum item com fase definida para lançar no realizado');
      return { success: true };
    }

    const { error: insertError } = await supabase
      .from('budget_realized')
      .insert(validEntries);

    if (insertError) {
      console.error('[BudgetRealized] Erro ao inserir entradas:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log(`[BudgetRealized] ${validEntries.length} entradas adicionadas com sucesso`);
    return { success: true };
  } catch (error: any) {
    console.error('[BudgetRealized] Erro inesperado:', error);
    return { success: false, error: error.message || 'Erro desconhecido' };
  }
}

export async function removeBudgetRealizedFromOrder(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[BudgetRealized] Removendo realizado para pedido:', orderId);

    const { data, error: selectError } = await supabase
      .from('budget_realized')
      .select('id')
      .eq('purchase_order_id', orderId)
      .is('deleted_at', null);

    if (selectError) {
      console.error('[BudgetRealized] Erro ao buscar entradas:', selectError);
      return { success: false, error: selectError.message };
    }

    if (!data || data.length === 0) {
      console.log('[BudgetRealized] Nenhuma entrada encontrada para remover');
      return { success: true };
    }

    const { error: deleteError } = await supabase
      .from('budget_realized')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: null,
        deletion_reason: 'Pedido excluído'
      })
      .eq('purchase_order_id', orderId)
      .is('deleted_at', null);

    if (deleteError) {
      console.error('[BudgetRealized] Erro ao excluir entradas:', deleteError);
      return { success: false, error: deleteError.message };
    }

    console.log(`[BudgetRealized] ${data.length} entradas removidas com sucesso`);
    return { success: true };
  } catch (error: any) {
    console.error('[BudgetRealized] Erro inesperado:', error);
    return { success: false, error: error.message || 'Erro desconhecido' };
  }
}

export async function updateBudgetRealizedFromOrder(
  orderId: string,
  workId: string,
  items: any[],
  phaseId: string | null,
  subphaseId: string | null,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[BudgetRealized] Atualizando realizado para pedido:', orderId);
  console.log('[BudgetRealized] Work ID:', workId);
  console.log('[BudgetRealized] Items recebidos:', items.length);
  items.forEach((item, idx) => {
    console.log(`[BudgetRealized] Item ${idx}: phase=${item.phase_id}, subphase=${item.subphase_id}, valor=${item.total_price}`);
  });

  if (!workId) {
    console.error('[BudgetRealized] ❌ Work ID não fornecido, cancelando atualização');
    return { success: false, error: 'Work ID é obrigatório' };
  }

  if (!items || items.length === 0) {
    console.warn('[BudgetRealized] Nenhum item fornecido, removendo entradas antigas');
    return await removeBudgetRealizedFromOrder(orderId);
  }

  console.log('[BudgetRealized] PASSO 1: Preparando novas entradas...');

  const { data: budgetData, error: budgetError } = await supabase
    .from('budgets')
    .select('id')
    .eq('work_id', workId)
    .eq('status', 'approved')
    .maybeSingle();

  if (budgetError) {
    console.error('[BudgetRealized] ❌ Erro ao buscar orçamento:', budgetError);
    return { success: false, error: budgetError.message };
  }

  if (!budgetData) {
    console.log('[BudgetRealized] Nenhum orçamento aprovado encontrado, não atualiza realizado');
    return { success: true };
  }

  const entries: BudgetRealizedEntry[] = items.map((item, index) => ({
    budget_id: budgetData.id,
    phase_id: item.phase_id || phaseId || '',
    subphase_id: item.subphase_id || subphaseId || null,
    purchase_order_id: orderId,
    order_item_index: index,
    amount: item.total_price || 0,
    description: item.description || '',
    created_by: userId
  }));

  const validEntries = entries.filter(entry => entry.phase_id);

  if (validEntries.length === 0) {
    console.log('[BudgetRealized] Nenhum item com fase definida, removendo entradas antigas');
    return await removeBudgetRealizedFromOrder(orderId);
  }

  console.log('[BudgetRealized] PASSO 2: Removendo entradas antigas...');
  const removeResult = await removeBudgetRealizedFromOrder(orderId);
  if (!removeResult.success) {
    console.error('[BudgetRealized] ❌ Falha ao remover entradas antigas');
    return removeResult;
  }

  console.log('[BudgetRealized] PASSO 3: Inserindo novas entradas...');
  const { error: insertError } = await supabase
    .from('budget_realized')
    .insert(validEntries);

  if (insertError) {
    console.error('[BudgetRealized] ❌ Erro ao inserir entradas:', insertError);
    return { success: false, error: insertError.message };
  }

  console.log('[BudgetRealized] ✅ Realizado atualizado com sucesso!');
  console.log(`[BudgetRealized] ${validEntries.length} entradas adicionadas`);
  return { success: true };
}

export async function syncAllPurchaseOrdersToRealized(
  userId: string
): Promise<{ success: boolean; synced: number; error?: string }> {
  try {
    console.log('[BudgetRealized] Iniciando sincronização de todos os pedidos...');

    const { data: orders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        order_number,
        request_id,
        purchase_requests(work_id)
      `)
      .is('deleted_at', null);

    if (ordersError) {
      console.error('[BudgetRealized] Erro ao buscar pedidos:', ordersError);
      return { success: false, synced: 0, error: ordersError.message };
    }

    let syncedCount = 0;

    for (const order of orders || []) {
      const workId = (order as any).purchase_requests?.work_id;

      if (!workId) {
        console.log(`[BudgetRealized] Pedido ${(order as any).order_number} sem obra associada, pulando...`);
        continue;
      }

      const { data: existing } = await supabase
        .from('budget_realized')
        .select('id')
        .eq('purchase_order_id', order.id)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();

      if (existing) {
        console.log(`[BudgetRealized] Pedido ${(order as any).order_number} já sincronizado, pulando...`);
        continue;
      }

      const { data: items, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select('item_name, quantity, unit, unit_price, total_price, phase_id, subphase_id')
        .eq('order_id', order.id)
        .is('deleted_at', null);

      if (itemsError) {
        console.error(`[BudgetRealized] Erro ao buscar itens do pedido ${(order as any).order_number}:`, itemsError);
        continue;
      }

      if (!items || items.length === 0) {
        console.log(`[BudgetRealized] Pedido ${(order as any).order_number} sem itens, pulando...`);
        continue;
      }

      const itemsWithPhase = items.filter(item => item.phase_id);

      if (itemsWithPhase.length === 0) {
        console.log(`[BudgetRealized] Pedido ${(order as any).order_number} sem itens com fase definida, pulando...`);
        continue;
      }

      const itemsForRealized = itemsWithPhase.map(item => ({
        description: item.item_name || '',
        phase_id: item.phase_id,
        subphase_id: item.subphase_id,
        total_price: item.total_price || 0
      }));

      console.log(`[BudgetRealized] Sincronizando pedido ${(order as any).order_number} com ${itemsForRealized.length} itens...`);

      const result = await addBudgetRealizedFromOrder(
        order.id,
        workId,
        itemsForRealized,
        null,
        null,
        userId
      );

      if (result.success) {
        syncedCount++;
        console.log(`[BudgetRealized] ✅ Pedido ${(order as any).order_number} sincronizado`);
      } else {
        console.error(`[BudgetRealized] ❌ Falha ao sincronizar pedido ${(order as any).order_number}:`, result.error);
      }
    }

    console.log(`[BudgetRealized] Sincronização concluída: ${syncedCount} pedido(s) sincronizado(s)`);
    return { success: true, synced: syncedCount };
  } catch (error: any) {
    console.error('[BudgetRealized] Erro inesperado na sincronização:', error);
    return { success: false, synced: 0, error: error.message || 'Erro desconhecido' };
  }
}

export async function getBudgetRealizedTotals(
  budgetId: string
): Promise<{ [key: string]: number }> {
  try {
    const { data, error } = await supabase
      .from('budget_realized')
      .select('phase_id, subphase_id, amount')
      .eq('budget_id', budgetId)
      .is('deleted_at', null);

    if (error) {
      console.error('[BudgetRealized] Erro ao buscar totais:', error);
      return {};
    }

    const totals: { [key: string]: number } = {};

    (data || []).forEach(entry => {
      const key = entry.subphase_id || entry.phase_id;
      if (key) {
        totals[key] = (totals[key] || 0) + (entry.amount || 0);
      }
    });

    return totals;
  } catch (error) {
    console.error('[BudgetRealized] Erro inesperado ao buscar totais:', error);
    return {};
  }
}
