/*
  # Adicionar work_id à tabela purchase_orders

  1. Alterações
    - Adiciona coluna `work_id` (uuid, nullable) à tabela `purchase_orders`
    - Adiciona foreign key para a tabela `works`
    - Permite que pedidos de compra sejam vinculados diretamente a obras (útil para contratos)

  2. Notas
    - A coluna é nullable porque pedidos podem vir de solicitações (que já têm obra via request_id)
      ou diretamente de contratos
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'work_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN work_id uuid REFERENCES works(id);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_work_id ON purchase_orders(work_id);
  END IF;
END $$;
