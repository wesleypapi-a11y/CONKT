/*
  # Add Budget Item Columns

  1. Changes
    - Add `composicao` column to budget_items (text field)
    - Add `orcamento` column to budget_items (text field)
    - Add `etapa` column to budget_items (text field)
    - Add `obs` column to budget_items (text field for observations)
    
  2. Notes
    - These fields allow more detailed budget item tracking
    - All fields are optional (nullable)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_items' AND column_name = 'composicao'
  ) THEN
    ALTER TABLE budget_items ADD COLUMN composicao text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_items' AND column_name = 'orcamento'
  ) THEN
    ALTER TABLE budget_items ADD COLUMN orcamento text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_items' AND column_name = 'etapa'
  ) THEN
    ALTER TABLE budget_items ADD COLUMN etapa text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_items' AND column_name = 'obs'
  ) THEN
    ALTER TABLE budget_items ADD COLUMN obs text;
  END IF;
END $$;