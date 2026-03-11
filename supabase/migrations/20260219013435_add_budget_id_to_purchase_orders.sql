/*
  # Add budget_id to purchase_orders

  1. Changes
    - Add `budget_id` column to `purchase_orders` table to link orders to budgets
    - Add foreign key constraint to budgets table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'budget_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN budget_id uuid REFERENCES budgets(id) ON DELETE SET NULL;
  END IF;
END $$;
