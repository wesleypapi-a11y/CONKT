/*
  # Adicionar coluna frozen aos pedidos de compra

  1. Alterações
    - Adiciona coluna `frozen` (boolean) à tabela purchase_orders
    - Define valor padrão como false
    - Pedidos congelados não podem ser editados ou deletados

  2. Uso
    - Quando um pedido é aprovado ou processado, pode ser congelado
    - Similar ao sistema de cotações
*/

-- Adicionar coluna frozen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'frozen'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN frozen boolean DEFAULT false;
  END IF;
END $$;
