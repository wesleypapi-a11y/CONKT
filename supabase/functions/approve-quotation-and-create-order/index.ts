import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[ApproveQuotation] Iniciando aprovação...');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autenticação não fornecido');
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Token inválido ou expirado. Faça login novamente.');
    }

    console.log('[ApproveQuotation] Usuário autenticado:', user.email);

    const { quotation_id } = await req.json();

    if (!quotation_id) {
      throw new Error('ID da cotação não informado');
    }

    console.log('[ApproveQuotation] Aprovando cotação:', quotation_id);

    const { data: quotation, error: quotationError } = await supabaseAdmin
      .from('quotations')
      .select('*, quotation_items(*)')
      .eq('id', quotation_id)
      .maybeSingle();

    if (quotationError || !quotation) {
      throw new Error('Cotação não encontrada');
    }

    // Permitir reaprovar se necessário (não bloquear)
    if (quotation.approved && quotation.status === 'aprovada') {
      console.log('[ApproveQuotation] ⚠️ Cotação já aprovada, mas permitindo reprocessamento');
    }

    console.log('[ApproveQuotation] Cotação encontrada');

    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('purchase_requests')
      .select('*')
      .eq('id', quotation.request_id)
      .maybeSingle();

    if (requestError || !requestData) {
      throw new Error('Solicitação de compra não encontrada');
    }

    console.log('[ApproveQuotation] Solicitação encontrada');

    const { data: requestItems, error: requestItemsError } = await supabaseAdmin
      .from('purchase_request_items')
      .select('*')
      .eq('request_id', quotation.request_id);

    if (requestItemsError || !requestItems) {
      throw new Error('Itens da solicitação não encontrados');
    }

    console.log('[ApproveQuotation] Itens encontrados:', requestItems.length);

    const { error: updateQuotationError } = await supabaseAdmin
      .from('quotations')
      .update({
        status: 'aprovada',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', quotation_id);

    if (updateQuotationError) {
      throw new Error('Erro ao atualizar status da cotação');
    }

    console.log('[ApproveQuotation] Cotação aprovada');

    const { error: rejectOthersError } = await supabaseAdmin
      .from('quotations')
      .update({ status: 'rejeitada' })
      .eq('request_id', quotation.request_id)
      .neq('id', quotation_id)
      .in('status', ['pendente', 'pending', 'submitted']);

    if (rejectOthersError) {
      console.error('[ApproveQuotation] Erro ao rejeitar outras cotações:', rejectOthersError);
    }

    const orderItems = requestItems.map((requestItem: any) => {
      const quotationItem = quotation.quotation_items.find((qi: any) => qi.request_item_id === requestItem.id);

      // Garantir que sempre há um nome válido
      const itemName = requestItem.description || requestItem.item_name || requestItem.name || `Item ${requestItem.id}`;

      const item = {
        request_item_id: requestItem.id,
        item_type: requestItem.item_type || 'insumo',
        item_name: itemName.trim(),
        complement: requestItem.complement || '',
        quantity: Number(requestItem.quantity) || 1,
        unit: requestItem.unit || 'un',
        unit_price: Number(quotationItem?.unit_price) || 0,
        total_price: Number(quotationItem?.total_price) || 0,
        phase_id: requestItem.phase_id || null,
        subphase_id: requestItem.subphase_id || null
      };

      console.log('[ApproveQuotation] Item mapeado:', JSON.stringify(item, null, 2));
      return item;
    });

    console.log('[ApproveQuotation] Total de itens mapeados:', orderItems.length);

    const payload = {
      work_id: requestData.work_id,
      supplier_id: quotation.supplier_id,
      phase_id: requestData.phase_id || null,
      subphase_id: requestData.subphase_id || null,
      payment_conditions: quotation.payment_conditions || '',
      freight_value: 0,
      discount_value: 0,
      delivery_address: requestData.delivery_address || '',
      observations: quotation.observations || '',
      notes: `PC criado a partir da aprovação da cotação ${quotation.id} da solicitação ${requestData.request_number}`,
      items: orderItems,
      origem: 'ORDEM_COMPRA',
      request_id: quotation.request_id,
      quotation_id: quotation_id,
      budget_id: requestData.budget_id || null,
      user_id: user.id
    };

    console.log('[ApproveQuotation] Chamando create-purchase-order...');

    const createOrderUrl = `${supabaseUrl}/functions/v1/create-purchase-order`;

    const createOrderResponse = await fetch(createOrderUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const createOrderResult = await createOrderResponse.json();

    if (!createOrderResponse.ok || !createOrderResult.success) {
      console.error('[ApproveQuotation] Erro ao criar PC:', createOrderResult);
      throw new Error(createOrderResult.error || 'Erro ao criar pedido de compra');
    }

    console.log('[ApproveQuotation] PC criado:', createOrderResult.order.order_number);

    // Atualizar status da solicitação para 'aprovado' após criar o pedido
    const { error: updateRequestError } = await supabaseAdmin
      .from('purchase_requests')
      .update({
        status: 'aprovado',
        updated_at: new Date().toISOString()
      })
      .eq('id', quotation.request_id);

    if (updateRequestError) {
      console.error('[ApproveQuotation] Erro ao atualizar status da solicitação:', updateRequestError);
      // Não bloqueia o fluxo, apenas loga o erro
    } else {
      console.log('[ApproveQuotation] Status da solicitação atualizado para aprovado');
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: createOrderResult.order,
        message: `Cotação aprovada e pedido ${createOrderResult.order.order_number} criado com sucesso`
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    console.error('[ApproveQuotation] Erro:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao aprovar cotação'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
