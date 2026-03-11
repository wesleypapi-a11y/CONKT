import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  order_item_id: string;
  phase_id: string;
  subphase_id: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Criar cliente admin para operações
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Validar autenticação com cliente user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[UpdateAllocation] ❌ Authorization header ausente');
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'UNAUTHORIZED',
          details: 'Authorization header missing'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Extrair token
    const token = authHeader.replace('Bearer ', '');

    // Criar cliente com token do usuário para validação
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Validar usuário
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      console.error('[UpdateAllocation] ❌ Token inválido:', authError?.message);
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'UNAUTHORIZED',
          details: `Invalid or expired token: ${authError?.message || 'No user found'}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    console.log('[UpdateAllocation] ✅ Usuário autenticado:', user.id);

    // Usar cliente admin para operações no banco
    const supabase = supabaseAdmin;

    const payload: RequestPayload = await req.json();
    console.log('[UpdateAllocation] Recebida requisição:', payload);

    const { order_item_id, phase_id, subphase_id } = payload;

    if (!order_item_id || !phase_id) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'VALIDATION',
          details: 'order_item_id e phase_id são obrigatórios'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('[UpdateAllocation] PASSO 1: Buscar informações do item...');
    const { data: orderItem, error: itemError } = await supabase
      .from('purchase_order_items')
      .select('id, order_id, item_name, total_price')
      .eq('id', order_item_id)
      .is('deleted_at', null)
      .maybeSingle();

    if (itemError) {
      console.error('[UpdateAllocation] Erro ao buscar item:', itemError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'DATABASE_ERROR',
          details: `Erro ao buscar item: ${itemError.message}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    if (!orderItem) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'NOT_FOUND',
          details: 'Item não encontrado ou foi excluído'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    console.log('[UpdateAllocation] Item encontrado:', orderItem.item_name);

    console.log('[UpdateAllocation] PASSO 2: Buscar pedido e obra...');
    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .select('id, work_id, request_id')
      .eq('id', orderItem.order_id)
      .is('deleted_at', null)
      .maybeSingle();

    if (orderError || !order) {
      console.error('[UpdateAllocation] Erro ao buscar pedido:', orderError);
      throw new Error('Pedido não encontrado');
    }

    let workId = order.work_id;

    if (!workId && order.request_id) {
      console.log('[UpdateAllocation] work_id não encontrado no pedido, buscando via request...');
      const { data: request, error: requestError } = await supabase
        .from('purchase_requests')
        .select('work_id')
        .eq('id', order.request_id)
        .maybeSingle();

      if (request?.work_id) {
        workId = request.work_id;
      }
    }

    if (!workId) {
      throw new Error('Obra não encontrada para este pedido');
    }

    console.log('[UpdateAllocation] Obra encontrada:', workId);

    console.log('[UpdateAllocation] PASSO 3: Buscar orçamento da obra (qualquer status)...');
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('id')
      .eq('work_id', workId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (budgetError) {
      console.error('[UpdateAllocation] Erro ao buscar orçamento:', budgetError);
      console.warn('[UpdateAllocation] ⚠️ Continuando sem orçamento...');
    }

    const budgetId = budget?.id || null;

    if (budgetId) {
      console.log('[UpdateAllocation] Orçamento encontrado:', budgetId);
    } else {
      console.warn('[UpdateAllocation] ⚠️ Nenhum orçamento encontrado - apropriação será salva apenas no pedido');
    }

    console.log('[UpdateAllocation] PASSO 4: Atualizar purchase_order_items...');
    const { error: updateItemError } = await supabase
      .from('purchase_order_items')
      .update({
        phase_id: phase_id,
        subphase_id: subphase_id
      })
      .eq('id', order_item_id);

    if (updateItemError) {
      console.error('[UpdateAllocation] Erro ao atualizar item:', updateItemError);
      throw new Error(`Erro ao atualizar item: ${updateItemError.message}`);
    }

    console.log('[UpdateAllocation] ✅ Item atualizado com sucesso');

    console.log('[UpdateAllocation] PASSO 5: Atualizar budget_realized...');

    // Só atualiza budget_realized se houver um orçamento
    if (budgetId) {
      const { data: existingRealized, error: realizedSearchError } = await supabase
        .from('budget_realized')
        .select('id, amount')
        .eq('purchase_order_item_id', order_item_id)
        .is('deleted_at', null)
        .maybeSingle();

      if (realizedSearchError) {
        console.error('[UpdateAllocation] Erro ao buscar realizado:', realizedSearchError);
        throw new Error(`Erro ao buscar realizado: ${realizedSearchError.message}`);
      }

      if (existingRealized) {
        console.log('[UpdateAllocation] Realizado existente encontrado, atualizando...');

        const { error: updateRealizedError } = await supabase
          .from('budget_realized')
          .update({
            phase_id: phase_id,
            subphase_id: subphase_id,
            amount: orderItem.total_price
          })
          .eq('id', existingRealized.id);

        if (updateRealizedError) {
          console.error('[UpdateAllocation] Erro ao atualizar realizado:', updateRealizedError);
          throw new Error(`Erro ao atualizar realizado: ${updateRealizedError.message}`);
        }

        console.log('[UpdateAllocation] ✅ Realizado atualizado com sucesso');
      } else {
        console.log('[UpdateAllocation] Nenhum realizado encontrado, criando novo...');

        const { error: insertRealizedError } = await supabase
          .from('budget_realized')
          .insert({
            budget_id: budgetId,
            phase_id: phase_id,
            subphase_id: subphase_id,
            purchase_order_id: orderItem.order_id,
            purchase_order_item_id: order_item_id,
            order_item_index: 0,
            amount: orderItem.total_price,
            description: orderItem.item_name,
            created_by: user.id
          });

        if (insertRealizedError) {
          console.error('[UpdateAllocation] Erro ao inserir realizado:', insertRealizedError);
          throw new Error(`Erro ao inserir realizado: ${insertRealizedError.message}`);
        }

        console.log('[UpdateAllocation] ✅ Novo realizado criado com sucesso');
      }
    } else {
      console.log('[UpdateAllocation] ⚠️ Sem orçamento - pulando atualização do budget_realized');
    }

    console.log('[UpdateAllocation] 🎉 APROPRIAÇÃO ATUALIZADA COM SUCESSO!');

    return new Response(
      JSON.stringify({
        ok: true,
        success: true,
        message: 'Apropriação atualizada com sucesso! O Realizado foi atualizado automaticamente.'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[UpdateAllocation] ❌ ERRO:', error);

    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const errorDetails = error instanceof Error ? error.stack : String(error);

    console.error('[UpdateAllocation] Stack trace:', errorDetails);

    return new Response(
      JSON.stringify({
        ok: false,
        error: 'INTERNAL',
        details: errorMessage,
        stack: errorDetails
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
});
