/*
  # Adicionar phase_id e subphase_id em purchase_order_items e ajustar budget_realized

  ## Problema
  - purchase_order_items não tem phase_id/subphase_id (centro de custo por item)
  - budget_realized usa order_item_index em vez de FK para purchase_order_item_id

  ## Solução
  
  1. **Adicionar campos em purchase_order_items**
     - phase_id (uuid, FK para budget_items)
     - subphase_id (uuid, FK para budget_items, nullable)
  
  2. **Atualizar budget_realized**
     - Adicionar purchase_order_item_id (uuid, FK para purchase_order_items)
     - Manter order_item_index temporariamente para compatibilidade
  
  3. **Segurança**
     - Manter RLS existente
*/

-- 1. Adicionar phase_id e subphase_id em purchase_order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_items' AND column_name = 'phase_id'
  ) THEN
    ALTER TABLE purchase_order_items 
      ADD COLUMN phase_id uuid REFERENCES budget_items(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_items' AND column_name = 'subphase_id'
  ) THEN
    ALTER TABLE purchase_order_items 
      ADD COLUMN subphase_id uuid REFERENCES budget_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_phase_id ON purchase_order_items(phase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_subphase_id ON purchase_order_items(subphase_id);

-- 3. Adicionar purchase_order_item_id em budget_realized
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'budget_realized' AND column_name = 'purchase_order_item_id'
  ) THEN
    ALTER TABLE budget_realized 
      ADD COLUMN purchase_order_item_id uuid REFERENCES purchase_order_items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Criar índice
CREATE INDEX IF NOT EXISTS idx_budget_realized_purchase_order_item_id ON budget_realized(purchase_order_item_id);

-- 5. Tornar order_item_index nullable (para novos registros usarem purchase_order_item_id)
ALTER TABLE budget_realized 
  ALTER COLUMN order_item_index DROP NOT NULL;
