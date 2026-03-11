/*
  # Fix budget_items parent_id foreign key to CASCADE DELETE

  1. Changes
    - Drop existing FK constraint on parent_id
    - Recreate FK with ON DELETE CASCADE
    - This ensures when a macro (parent) is deleted, all its children are also deleted

  2. Security
    - Maintains existing RLS policies
    - No data loss - only changes constraint behavior
*/

-- Drop existing FK constraint if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'budget_items_parent_id_fkey' 
    AND table_name = 'budget_items'
  ) THEN
    ALTER TABLE budget_items DROP CONSTRAINT budget_items_parent_id_fkey;
  END IF;
END $$;

-- Recreate FK with CASCADE DELETE
ALTER TABLE budget_items
  ADD CONSTRAINT budget_items_parent_id_fkey
  FOREIGN KEY (parent_id)
  REFERENCES budget_items(id)
  ON DELETE CASCADE;