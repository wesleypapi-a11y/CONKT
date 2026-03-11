/*
  # Fix cascade delete for purchase requests

  ## Summary
  Esta migração corrige a foreign key de purchase_orders.request_id para permitir
  exclusão de solicitações de compra. Ao invés de CASCADE, usamos SET NULL para
  preservar o histórico dos pedidos de compra mesmo após a exclusão da solicitação.

  ## Changes
  1. Atualiza foreign key de purchase_orders.request_id
     - Remove constraint antiga (NO ACTION)
     - Adiciona nova constraint com ON DELETE SET NULL
     - Assim, pedidos de compra não são perdidos ao deletar solicitação

  ## Security
  - Mantém RLS habilitado
  - Não altera políticas de segurança
*/

-- Atualizar constraint de purchase_orders.request_id
ALTER TABLE purchase_orders 
  DROP CONSTRAINT IF EXISTS purchase_orders_request_id_fkey;

ALTER TABLE purchase_orders
  ADD CONSTRAINT purchase_orders_request_id_fkey
  FOREIGN KEY (request_id)
  REFERENCES purchase_requests(id)
  ON DELETE SET NULL;

-- Permitir que request_id seja nulo
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' 
    AND column_name = 'request_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE purchase_orders ALTER COLUMN request_id DROP NOT NULL;
  END IF;
END $$;
