/*
  # Fix cascade delete for quotations

  ## Summary
  Esta migração corrige a foreign key de quotations.request_id para permitir
  exclusão em cascata de cotações quando uma solicitação de compra for excluída.

  ## Changes
  1. Remove constraint antiga de quotations.request_id (SET NULL)
  2. Adiciona nova constraint com ON DELETE CASCADE
  3. Remove constraint antiga de quotation_items.request_item_id se existir
  4. Adiciona nova constraint com ON DELETE CASCADE

  ## Why
  Quando uma solicitação de compra é excluída, todas as cotações relacionadas
  devem ser excluídas também, pois não fazem sentido sem a solicitação.

  ## Security
  - Mantém RLS habilitado
  - Não altera políticas de segurança
*/

-- Verificar e atualizar constraint de quotations.request_id
DO $$
BEGIN
  -- Remover constraint antiga se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'quotations_request_id_fkey' 
    AND table_name = 'quotations'
  ) THEN
    ALTER TABLE quotations DROP CONSTRAINT quotations_request_id_fkey;
  END IF;
  
  -- Adicionar nova constraint com CASCADE
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'quotations_request_id_fkey' 
    AND table_name = 'quotations'
  ) THEN
    ALTER TABLE quotations
      ADD CONSTRAINT quotations_request_id_fkey
      FOREIGN KEY (request_id)
      REFERENCES purchase_requests(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Verificar e atualizar constraint de quotation_items.request_item_id se a coluna existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotation_items' AND column_name = 'request_item_id'
  ) THEN
    -- Remover constraint antiga se existir
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'quotation_items_request_item_id_fkey' 
      AND table_name = 'quotation_items'
    ) THEN
      ALTER TABLE quotation_items DROP CONSTRAINT quotation_items_request_item_id_fkey;
    END IF;
    
    -- Adicionar nova constraint com CASCADE
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'quotation_items_request_item_id_fkey' 
      AND table_name = 'quotation_items'
    ) THEN
      ALTER TABLE quotation_items
        ADD CONSTRAINT quotation_items_request_item_id_fkey
        FOREIGN KEY (request_item_id)
        REFERENCES purchase_request_items(id)
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;