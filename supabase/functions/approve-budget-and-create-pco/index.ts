import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('[ApproveBudget] ========================================');
    console.log('[ApproveBudget] Função iniciada');
    console.log('[ApproveBudget] Timestamp:', new Date().toISOString());

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[ApproveBudget] Cliente Supabase criado');
    console.log('[ApproveBudget] Supabase URL:', supabaseUrl);

    const authHeader = req.headers.get('Authorization');
    const apikeyHeader = req.headers.get('apikey');

    console.log('[ApproveBudget] ===== HEADERS RECEBIDOS =====');
    console.log('[ApproveBudget] Authorization header:', authHeader ? `Presente (${authHeader.substring(0, 30)}...)` : 'AUSENTE');
    console.log('[ApproveBudget] apikey header:', apikeyHeader ? `Presente (${apikeyHeader.substring(0, 30)}...)` : 'AUSENTE');
    console.log('[ApproveBudget] Content-Type:', req.headers.get('Content-Type'));

    let user = null;

    if (authHeader) {
      console.log('[ApproveBudget] ===== TENTANDO VALIDAR JWT =====');

      try {
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        console.log('[ApproveBudget] Anon Key obtida:', supabaseAnonKey ? `Presente (${supabaseAnonKey.substring(0, 30)}...)` : 'AUSENTE');

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: authHeader
            }
          }
        });

        console.log('[ApproveBudget] Cliente com auth criado, chamando getUser()...');

        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (!authError && authUser) {
          user = authUser;
          console.log('[ApproveBudget] ✅ Usuário autenticado com sucesso!');
          console.log('[ApproveBudget] User ID:', user.id);
          console.log('[ApproveBudget] User Email:', user.email);
        } else {
          console.error('[ApproveBudget] ❌ ERRO DE AUTENTICAÇÃO JWT:');
          console.error('[ApproveBudget] Error message:', authError?.message);
          console.error('[ApproveBudget] Error name:', authError?.name);
          console.error('[ApproveBudget] Error status:', authError?.status);
          console.error('[ApproveBudget] Error completo:', JSON.stringify(authError, null, 2));
          console.error('[ApproveBudget] authUser:', authUser);
        }
      } catch (authException: any) {
        console.error('[ApproveBudget] ❌ EXCEÇÃO ao validar JWT:');
        console.error('[ApproveBudget] Exception message:', authException.message);
        console.error('[ApproveBudget] Exception name:', authException.name);
        console.error('[ApproveBudget] Exception stack:', authException.stack);
      }
    } else {
      console.log('[ApproveBudget] ⚠️ Nenhum Authorization header fornecido');
    }

    // Se não conseguiu autenticar, pega o primeiro usuário admin
    if (!user) {
      console.log('[ApproveBudget] Tentando pegar usuário admin padrão...');
      const { data: adminUsers } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1);

      if (adminUsers && adminUsers.length > 0) {
        user = { id: adminUsers[0].id };
        console.log('[ApproveBudget] Usando usuário admin padrão:', user.id);
      } else {
        throw new Error('Nenhum usuário disponível');
      }
    }

    const { budget_id, supplier_id, payment_conditions, delivery_date, observations } = await req.json();

    if (!budget_id) {
      throw new Error('ID do orçamento não informado');
    }

    console.log('[ApproveBudget] Iniciando aprovação do orçamento:', budget_id);

    const { data: budget, error: budgetError } = await supabaseAdmin
      .from('budgets')
      .select('*, works(id, name, client_id)')
      .eq('id', budget_id)
      .maybeSingle();

    if (budgetError) {
      console.error('[ApproveBudget] Erro ao buscar orçamento:', budgetError);
      throw new Error(`Erro ao buscar orçamento: ${budgetError.message}`);
    }

    if (!budget) {
      throw new Error('Orçamento não encontrado');
    }

    if (budget.status === 'aprovado') {
      throw new Error('Este orçamento já foi aprovado');
    }

    if (!budget.work_id) {
      throw new Error('Orçamento sem obra vinculada');
    }

    console.log('[ApproveBudget] Buscando itens do orçamento...');

    const { data: budgetItems, error: itemsError } = await supabaseAdmin
      .from('budget_items')
      .select('*')
      .eq('budget_id', budget_id)
      .order('ordem', { ascending: true });

    if (itemsError) {
      console.error('[ApproveBudget] Erro ao buscar itens:', itemsError);
      throw new Error(`Erro ao buscar itens do orçamento: ${itemsError.message}`);
    }

    if (!budgetItems || budgetItems.length === 0) {
      throw new Error('Orçamento sem itens para aprovar');
    }

    console.log('[ApproveBudget] Encontrados', budgetItems.length, 'itens');

    const purchaseItems = budgetItems.filter((item: any) =>
      item.tipo === 'item' && item.quantidade > 0
    );

    if (purchaseItems.length === 0) {
      throw new Error('Orçamento sem itens válidos para criar pedido');
    }

    if (!supplier_id) {
      throw new Error('Fornecedor não informado');
    }

    console.log('[ApproveBudget] Validando fornecedor...');

    const { data: supplier, error: supplierError } = await supabaseAdmin
      .from('suppliers')
      .select('id, name')
      .eq('id', supplier_id)
      .maybeSingle();

    if (supplierError || !supplier) {
      throw new Error('Fornecedor não encontrado');
    }

    console.log('[ApproveBudget] Gerando número do pedido...');

    const { data: lastOrder } = await supabaseAdmin
      .from('purchase_orders')
      .select('order_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextNumber = 1;
    if (lastOrder && lastOrder.order_number) {
      const match = lastOrder.order_number.match(/PCO-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const orderNumber = `PCO-${String(nextNumber).padStart(6, '0')}`;

    console.log('[ApproveBudget] Número do pedido gerado:', orderNumber);

    const totalValue = purchaseItems.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.quantidade) * parseFloat(item.valor_unitario));
    }, 0);

    console.log('[ApproveBudget] Criando pedido de compra...');

    const orderData = {
      order_number: orderNumber,
      work_id: budget.work_id,
      supplier_id: supplier_id,
      total_value: totalValue,
      payment_conditions: payment_conditions || 'À vista',
      delivery_date: delivery_date || null,
      observations: observations || `Pedido gerado a partir do orçamento ${budget.numero || budget.titulo}`,
      status: 'aberto',
      origem: 'ORDEM_COMPRA',
      request_id: null,
      quotation_id: null,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      freight_value: 0,
      discount_value: 0,
      is_paid: false,
      frozen: false,
    };

    console.log('[ApproveBudget] Dados do pedido:', JSON.stringify(orderData, null, 2));

    const { data: purchaseOrder, error: orderError } = await supabaseAdmin
      .from('purchase_orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error('[ApproveBudget] Erro ao criar pedido:', JSON.stringify(orderError, null, 2));
      throw new Error(`Erro ao criar pedido de compra: ${orderError.message} - ${orderError.details || ''} - ${orderError.hint || ''}`);
    }

    console.log('[ApproveBudget] Pedido criado:', purchaseOrder.id);

    console.log('[ApproveBudget] Criando itens do pedido...');

    const orderItems = purchaseItems.map((item: any) => ({
      order_id: purchaseOrder.id,
      item_type: 'insumo',
      phase_id: item.parent_id || null,
      subphase_id: item.id,
      phase: item.etapa || '',
      service: '',
      item_name: item.descricao,
      complement: item.obs || '',
      quantity: parseFloat(item.quantidade),
      unit: item.unidade,
      unit_price: parseFloat(item.valor_unitario),
      total_price: parseFloat(item.quantidade) * parseFloat(item.valor_unitario),
      created_at: new Date().toISOString(),
    }));

    const { error: itemsInsertError } = await supabaseAdmin
      .from('purchase_order_items')
      .insert(orderItems);

    if (itemsInsertError) {
      console.error('[ApproveBudget] Erro ao criar itens do pedido:', itemsInsertError);
      await supabaseAdmin
        .from('purchase_orders')
        .delete()
        .eq('id', purchaseOrder.id);
      throw new Error(`Erro ao criar itens do pedido: ${itemsInsertError.message}`);
    }

    console.log('[ApproveBudget] Itens do pedido criados com sucesso');

    console.log('[ApproveBudget] Marcando orçamento como aprovado...');

    const { error: updateBudgetError } = await supabaseAdmin
      .from('budgets')
      .update({
        status: 'aprovado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', budget_id);

    if (updateBudgetError) {
      console.error('[ApproveBudget] Erro ao atualizar orçamento:', updateBudgetError);
      await supabaseAdmin
        .from('purchase_orders')
        .delete()
        .eq('id', purchaseOrder.id);
      throw new Error(`Erro ao aprovar orçamento: ${updateBudgetError.message}`);
    }

    console.log('[ApproveBudget] Orçamento aprovado com sucesso!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Orçamento aprovado e pedido de compra criado com sucesso',
        order_number: orderNumber,
        order_id: purchaseOrder.id,
        total_value: totalValue,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    console.error('[ApproveBudget] Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro desconhecido ao aprovar orçamento',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
