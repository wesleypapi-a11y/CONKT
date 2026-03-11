/*
  # Fix cascade delete for purchase orders

  ## Summary
  Esta migração corrige as foreign keys relacionadas a purchase_orders para permitir
  exclusão em cascata, garantindo que ao excluir um pedido, todos os registros
  relacionados sejam excluídos automaticamente.

  ## Changes
  1. Atualiza foreign key de financial_entries.purchase_order_id
     - Remove constraint antiga (NO ACTION)
     - Adiciona nova constraint com ON DELETE CASCADE
     
  2. Verifica e atualiza purchase_order_items se necessário
     - Remove constraint antiga se existir
     - Adiciona nova constraint com ON DELETE CASCADE

  ## Security
  - Mantém RLS habilitado
  - Não altera políticas de segurança
*/

-- 1. Atualizar constraint de financial_entries
ALTER TABLE financial_entries 
  DROP CONSTRAINT IF EXISTS financial_entries_purchase_order_id_fkey;

ALTER TABLE financial_entries
  ADD CONSTRAINT financial_entries_purchase_order_id_fkey
  FOREIGN KEY (purchase_order_id)
  REFERENCES purchase_orders(id)
  ON DELETE CASCADE;

-- 2. Verificar e atualizar purchase_order_items se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'purchase_order_items'
  ) THEN
    ALTER TABLE purchase_order_items 
      DROP CONSTRAINT IF EXISTS purchase_order_items_order_id_fkey;
    
    ALTER TABLE purchase_order_items
      ADD CONSTRAINT purchase_order_items_order_id_fkey
      FOREIGN KEY (order_id)
      REFERENCES purchase_orders(id)
      ON DELETE CASCADE;
  END IF;
END $$;
