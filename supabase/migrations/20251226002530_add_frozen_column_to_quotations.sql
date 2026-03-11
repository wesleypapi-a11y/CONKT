/*
  # Add frozen column to quotations

  1. Changes
    - Add `frozen` boolean column to `quotations` table
    - Default value is false
    - When a quotation is approved, it will be frozen (cannot be edited/deleted)
  
  2. Notes
    - This column helps track which quotations are locked after approval
    - Frozen quotations should not be editable or deletable
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'frozen'
  ) THEN
    ALTER TABLE quotations ADD COLUMN frozen boolean DEFAULT false;
  END IF;
END $$;