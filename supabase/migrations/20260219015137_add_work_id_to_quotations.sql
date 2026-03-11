/*
  # Add work_id column to quotations table

  1. Changes
    - Add `work_id` column to quotations table
    - Add foreign key constraint to works table
    - This allows quotations to directly reference the work they belong to
    - The trigger will automatically populate this from the purchase request

  2. Migration Notes
    - Uses IF NOT EXISTS to prevent errors if column already exists
    - Existing quotations will have NULL work_id (will be populated by trigger on next update)
*/

-- Add work_id column to quotations if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'work_id'
  ) THEN
    ALTER TABLE quotations ADD COLUMN work_id uuid REFERENCES works(id);
    CREATE INDEX IF NOT EXISTS idx_quotations_work_id ON quotations(work_id);
  END IF;
END $$;
