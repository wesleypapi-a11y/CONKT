/*
  # Remove composição field from budget_items

  1. Changes
    - Remove the `composicao` column from `budget_items` table as it's no longer needed
  
  2. Notes
    - This is a safe operation as the column is being removed
    - Data in this column will be permanently deleted
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_items' AND column_name = 'composicao'
  ) THEN
    ALTER TABLE budget_items DROP COLUMN composicao;
  END IF;
END $$;
