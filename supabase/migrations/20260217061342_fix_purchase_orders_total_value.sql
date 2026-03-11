/*
  # Corrigir valores totais dos pedidos de compra

  1. Problema
    - Pedidos de compra estavam sendo criados com total_value = 0
    - Bug: código usava quotation.total_amount em vez de quotation.total_value
    
  2. Solução
    - Recalcular total_value de todos os pedidos existentes
    - Somar os valores dos itens (purchase_order_items.total_price)
    - Garantir que pedidos futuros terão valores corretos
    
  3. Notas
    - Apenas pedidos não excluídos serão atualizados
    - Valores são calculados a partir dos itens vinculados
*/

-- Atualizar total_value dos pedidos existentes somando seus itens
UPDATE purchase_orders po
SET total_value = COALESCE(
  (
    SELECT SUM(poi.total_price)
    FROM purchase_order_items poi
    WHERE poi.order_id = po.id
      AND poi.deleted_at IS NULL
  ),
  0
)
WHERE po.deleted_at IS NULL
  AND (po.total_value = 0 OR po.total_value IS NULL);
