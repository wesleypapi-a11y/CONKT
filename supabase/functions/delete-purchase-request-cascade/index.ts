import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DeleteRequestPayload {
  request_id: string;
  user_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('[DeleteRequest] ========================================');
    console.log('[DeleteRequest] Função iniciada');
    console.log('[DeleteRequest] Timestamp:', new Date().toISOString());

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[DeleteRequest] Cliente Supabase criado');

    const authHeader = req.headers.get('Authorization');
    const apikeyHeader = req.headers.get('apikey');

    console.log('[DeleteRequest] ===== HEADERS RECEBIDOS =====');
    console.log('[DeleteRequest] Authorization header:', authHeader ? `Presente (${authHeader.substring(0, 30)}...)` : 'AUSENTE');
    console.log('[DeleteRequest] apikey header:', apikeyHeader ? `Presente (${apikeyHeader.substring(0, 30)}...)` : 'AUSENTE');

    let user = null;

    if (authHeader) {
      console.log('[DeleteRequest] ===== TENTANDO VALIDAR JWT =====');
      try {
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: authHeader
            }
          }
        });

        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (!authError && authUser) {
          user = authUser;
          console.log('[DeleteRequest] ✅ Usuário autenticado:', user.id);
        } else {
          console.error('[DeleteRequest] ❌ ERRO JWT:', authError?.message);
        }
      } catch (authException: any) {
        console.error('[DeleteRequest] ❌ EXCEÇÃO JWT:', authException.message);
      }
    }

    const { request_id, user_id }: DeleteRequestPayload = await req.json();

    if (!request_id || !user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'request_id e user_id são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const deletedAt = new Date().toISOString();

    const { data: quotations, error: quotError } = await supabaseAdmin
      .from('quotations')
      .select('id')
      .eq('request_id', request_id)
      .is('deleted_at', null);

    if (quotError) {
      throw new Error(`Erro ao buscar cotações: ${quotError.message}`);
    }

    const quotationIds = quotations?.map(q => q.id) || [];

    if (quotationIds.length > 0) {
      const { data: orders, error: orderError } = await supabaseAdmin
        .from('purchase_orders')
        .select('id')
        .in('quotation_id', quotationIds)
        .is('deleted_at', null);

      if (orderError) {
        throw new Error(`Erro ao buscar pedidos: ${orderError.message}`);
      }

      const orderIds = orders?.map(o => o.id) || [];

      if (orderIds.length > 0) {
        for (const order of orders || []) {
          const { error: realizedError } = await supabaseAdmin
            .from('budget_realized')
            .update({
              deleted_at: deletedAt,
              deleted_by: user_id,
              deletion_reason: 'Exclusão em cascata do pedido'
            })
            .eq('purchase_order_id', order.id)
            .is('deleted_at', null);

          if (realizedError) {
            console.error('Erro ao remover realizado:', realizedError);
          }
        }

        const { error: ordersDeleteError } = await supabaseAdmin
          .from('purchase_orders')
          .update({
            deleted_at: deletedAt,
            deleted_by: user_id,
            deletion_reason: 'Exclusão em cascata da solicitação'
          })
          .in('id', orderIds);

        if (ordersDeleteError) {
          throw new Error(`Erro ao excluir pedidos: ${ordersDeleteError.message}`);
        }
      }

      const { error: quotItemsError } = await supabaseAdmin
        .from('quotation_items')
        .update({
          deleted_at: deletedAt,
          deleted_by: user_id
        })
        .in('quotation_id', quotationIds);

      if (quotItemsError) {
        throw new Error(`Erro ao excluir itens de cotação: ${quotItemsError.message}`);
      }

      const { error: quotDeleteError } = await supabaseAdmin
        .from('quotations')
        .update({
          deleted_at: deletedAt,
          deleted_by: user_id,
          deletion_reason: 'Exclusão em cascata da solicitação'
        })
        .in('id', quotationIds);

      if (quotDeleteError) {
        throw new Error(`Erro ao excluir cotações: ${quotDeleteError.message}`);
      }
    }

    const { error: reqItemsError } = await supabaseAdmin
      .from('purchase_request_items')
      .update({
        deleted_at: deletedAt,
        deleted_by: user_id
      })
      .eq('request_id', request_id);

    if (reqItemsError) {
      throw new Error(`Erro ao excluir itens de solicitação: ${reqItemsError.message}`);
    }

    const { error: reqDeleteError } = await supabaseAdmin
      .from('purchase_requests')
      .update({
        deleted_at: deletedAt,
        deleted_by: user_id,
        deletion_reason: 'Excluído pelo usuário'
      })
      .eq('id', request_id);

    if (reqDeleteError) {
      throw new Error(`Erro ao excluir solicitação: ${reqDeleteError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Solicitação e registros vinculados excluídos com sucesso',
        deleted: {
          quotations: quotationIds.length,
          request_id
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro na exclusão em cascata:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
