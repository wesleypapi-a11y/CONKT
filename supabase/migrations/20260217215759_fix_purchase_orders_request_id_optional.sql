/*
  # Tornar request_id opcional em purchase_orders

  1. Alterações
    - Tornar coluna `request_id` nullable para permitir pedidos diretos (ex: via contratos)
    - Pedidos podem ser criados tanto via solicitações quanto diretamente
  
  2. Motivo
    - Quando marcamos uma parcela de contrato como paga, criamos um pedido direto
    - Esse pedido não tem uma solicitação de compra associada
    - Por isso o request_id deve ser opcional
*/

-- Tornar request_id nullable
ALTER TABLE purchase_orders 
ALTER COLUMN request_id DROP NOT NULL;
