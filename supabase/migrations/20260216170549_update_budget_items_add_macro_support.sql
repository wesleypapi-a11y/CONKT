/*
  # Update Budget Items - Add Macro Support

  1. Changes
    - Add `tipo` column to budget_items (macro or item)
    - Add `parent_id` column to budget_items for hierarchical structure
    - Add columns: numero, validade, observacoes to budgets table if not exist
    
  2. Notes
    - Items with tipo='macro' are group headers
    - Items with parent_id reference their parent macro
    - Macros display sum of child items
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_items' AND column_name = 'tipo'
  ) THEN
    ALTER TABLE budget_items ADD COLUMN tipo text DEFAULT 'item' CHECK (tipo IN ('macro', 'item'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_items' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE budget_items ADD COLUMN parent_id uuid REFERENCES budget_items(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'descricao_completa'
  ) THEN
    ALTER TABLE budgets ADD COLUMN descricao_completa text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_budget_items_parent_id ON budget_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_tipo ON budget_items(tipo);