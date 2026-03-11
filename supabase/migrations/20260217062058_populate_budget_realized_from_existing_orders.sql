/*
  # Popular budget_realized com pedidos existentes

  1. Problema
    - Pedidos de compra existem mas não têm lançamentos no budget_realized
    - A tabela budget_realized está vazia
    - Valores realizados não aparecem no orçamento
    
  2. Solução
    - Inserir lançamentos no budget_realized para todos os pedidos existentes
    - Apenas para itens que têm phase_id
    - Apenas para obras que têm orçamento aprovado
    - Apenas para pedidos não excluídos
    
  3. Notas
    - Usa CTE com ROW_NUMBER() para gerar order_item_index
    - Ignora itens sem phase_id
    - Associa ao orçamento aprovado da obra
*/

-- Popular budget_realized com itens de pedidos existentes
WITH numbered_items AS (
  SELECT 
    po.id as purchase_order_id,
    po.responsible_id,
    po.created_at as order_created_at,
    pr.work_id,
    poi.id as item_id,
    poi.phase_id,
    poi.subphase_id,
    poi.total_price,
    poi.item_name,
    (ROW_NUMBER() OVER (PARTITION BY po.id ORDER BY poi.created_at)) - 1 as order_item_index
  FROM purchase_orders po
  INNER JOIN purchase_requests pr ON po.request_id = pr.id
  INNER JOIN purchase_order_items poi ON poi.order_id = po.id
  WHERE po.deleted_at IS NULL
    AND poi.deleted_at IS NULL
    AND poi.phase_id IS NOT NULL
)
INSERT INTO budget_realized (
  budget_id,
  phase_id,
  subphase_id,
  purchase_order_id,
  order_item_index,
  amount,
  description,
  created_at,
  created_by
)
SELECT 
  b.id as budget_id,
  ni.phase_id,
  ni.subphase_id,
  ni.purchase_order_id,
  ni.order_item_index,
  COALESCE(ni.total_price, 0) as amount,
  COALESCE(ni.item_name, '') as description,
  ni.order_created_at as created_at,
  ni.responsible_id as created_by
FROM numbered_items ni
INNER JOIN budgets b ON b.work_id = ni.work_id AND b.status = 'approved'
WHERE NOT EXISTS (
  SELECT 1 FROM budget_realized br2 
  WHERE br2.purchase_order_id = ni.purchase_order_id 
    AND br2.order_item_index = ni.order_item_index
);
