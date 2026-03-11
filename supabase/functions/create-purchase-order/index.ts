import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OrderItem {
  item_type: string;
  item_name: string;
  complement?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  phase_id?: string | null;
  subphase_id?: string | null;
}

interface CreateOrderPayload {
  work_id: string;
  supplier_id: string;
  phase_id?: string | null;
  subphase_id?: string | null;
  payment_conditions?: string;
  freight_value?: number;
  discount_value?: number;
  delivery_address?: string;
  observations?: string;
  notes?: string;
  items: OrderItem[];
  origem?: string;
  request_id?: string | null;
  quotation_id?: string | null;
  budget_id?: string | null;
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Cabeçalho Authorization ausente');
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    const isServiceRoleKey = token === supabaseServiceKey;

    let authenticatedUserId: string | null = null;

    if (isServiceRoleKey) {
      console.log('[CreatePurchaseOrder] Chamada autenticada com SERVICE_ROLE_KEY');
    } else {
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

      if (authError || !user) {
        throw new Error('Usuário não autenticado');
      }

      authenticatedUserId = user.id;
      console.log('[CreatePurchaseOrder] Usuário autenticado:', user.email);
    }

    const payload: CreateOrderPayload = await req.json();
    console.log('[CreatePurchaseOrder] Payload recebido:', JSON.stringify(payload, null, 2));

    const {
      work_id,
      supplier_id,
      phase_id,
      subphase_id,
      payment_conditions,
      freight_value = 0,
      discount_value = 0,
      delivery_address = '',
      observations = '',
      notes = '',
      items,
      origem = 'CONTRATO',
      request_id = null,
      quotation_id = null,
      budget_id = null,
      user_id
    } = payload;

    if (!work_id) {
      throw new Error('Obra (work_id) é obrigatória');
    }

    if (!supplier_id) {
      throw new Error('Fornecedor (supplier_id) é obrigatório');
    }

    if (!items || items.length === 0) {
      throw new Error('Pelo menos um item é obrigatório');
    }

    // Log detalhado dos itens para debug
    console.log('[CreatePurchaseOrder] Validando itens...');
    items.forEach((item, index) => {
      console.log(`[CreatePurchaseOrder] Item ${index}:`, {
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        has_name: !!item.item_name,
        qty_positive: item.quantity > 0,
        price_valid: item.unit_price >= 0
      });
    });

    // Validação mais flexível - apenas verifica se tem nome
    if (items.some(item => !item.item_name || !item.item_name.trim())) {
      throw new Error('Todos os itens devem ter um nome');
    }

    console.log('[CreatePurchaseOrder] Gerando número PC...');

    const { data: lastOrder } = await supabase
      .from('purchase_orders')
      .select('order_number')
      .ilike('order_number', 'PC-%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextNumber = 1;
    if (lastOrder?.order_number) {
      const match = lastOrder.order_number.match(/PC-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const orderNumber = `PC-${String(nextNumber).padStart(5, '0')}`;
    console.log('[CreatePurchaseOrder] Número gerado:', orderNumber);

    const totalValue = items.reduce((sum, item) => sum + (item.total_price || 0), 0) + freight_value - discount_value;

    console.log('[CreatePurchaseOrder] Criando pedido...');

    const { data: newOrder, error: orderError } = await supabase
      .from('purchase_orders')
      .insert({
        order_number: orderNumber,
        work_id,
        supplier_id,
        phase_id: phase_id || null,
        subphase_id: subphase_id || null,
        total_value: totalValue,
        freight_value,
        discount_value,
        delivery_address,
        payment_conditions: payment_conditions || '',
        observations: observations || '',
        notes: notes || '',
        status: 'aprovado',
        responsible_id: user_id,
        frozen: false,
        is_paid: false,
        approved_by: user_id,
        approved_at: new Date().toISOString(),
        origem: origem,
        request_id: request_id,
        budget_id: budget_id
      })
      .select()
      .single();

    if (orderError) {
      console.error('[CreatePurchaseOrder] Erro ao criar pedido:', orderError);
      throw new Error(`Erro ao criar pedido: ${orderError.message}`);
    }

    console.log('[CreatePurchaseOrder] Pedido criado:', newOrder.id);

    console.log('[CreatePurchaseOrder] Criando itens...');

    const orderItems = items.map((item) => ({
      order_id: newOrder.id,
      item_type: item.item_type || 'insumo',
      item_name: item.item_name,
      complement: item.complement || '',
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      total_price: item.total_price,
      phase_id: item.phase_id || null,
      subphase_id: item.subphase_id || null
    }));

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('[CreatePurchaseOrder] Erro ao criar itens:', itemsError);

      await supabase.from('purchase_orders').delete().eq('id', newOrder.id);

      throw new Error(`Erro ao criar itens do pedido: ${itemsError.message}`);
    }

    console.log('[CreatePurchaseOrder] Itens criados com sucesso');

    if (quotation_id) {
      console.log('[CreatePurchaseOrder] Atualizando cotação...');
      await supabase
        .from('quotations')
        .update({
          approved: true,
          approved_by: user_id,
          approved_at: new Date().toISOString(),
          status: 'aprovada',
          frozen: true
        })
        .eq('id', quotation_id);
    }

    console.log('[CreatePurchaseOrder] Pedido criado com sucesso!');

    return new Response(
      JSON.stringify({
        success: true,
        order: newOrder,
        message: `Pedido ${orderNumber} criado com sucesso`
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    console.error('[CreatePurchaseOrder] Erro:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao criar pedido'
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
