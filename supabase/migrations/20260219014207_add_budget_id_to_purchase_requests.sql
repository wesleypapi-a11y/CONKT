/*
  # Add budget_id to purchase_requests

  1. Changes
    - Add `budget_id` column to `purchase_requests` table
    - Add foreign key constraint to budgets table
    - This allows linking requests directly to a budget
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_requests' AND column_name = 'budget_id'
  ) THEN
    ALTER TABLE purchase_requests ADD COLUMN budget_id uuid REFERENCES budgets(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_purchase_requests_budget_id ON purchase_requests(budget_id);
  END IF;
END $$;
