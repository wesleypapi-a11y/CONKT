/*
  # Add Phase and Subphase to Quotations and Purchase Orders

  1. Changes
    - Add `phase_id` column to `quotations` table
    - Add `subphase_id` column to `quotations` table
    - Add `phase_id` column to `purchase_orders` table
    - Add `subphase_id` column to `purchase_orders` table
    - Add foreign key constraints referencing `budget_items`

  2. Purpose
    - Enable cost center tracking (Fase/Subfase) throughout the purchase flow
    - Cost center should travel: Purchase Request → Quotation → Purchase Order
    - Ensures consistency and traceability of budget allocation

  3. Notes
    - Fields are nullable to support existing records
    - Foreign keys reference budget_items table (where phases/subphases are stored)
    - No cascading deletes to preserve historical data
*/

-- Add phase_id and subphase_id to quotations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'phase_id'
  ) THEN
    ALTER TABLE quotations ADD COLUMN phase_id uuid REFERENCES budget_items(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'subphase_id'
  ) THEN
    ALTER TABLE quotations ADD COLUMN subphase_id uuid REFERENCES budget_items(id);
  END IF;
END $$;

-- Add phase_id and subphase_id to purchase_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'phase_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN phase_id uuid REFERENCES budget_items(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'subphase_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN subphase_id uuid REFERENCES budget_items(id);
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quotations_phase_id ON quotations(phase_id);
CREATE INDEX IF NOT EXISTS idx_quotations_subphase_id ON quotations(subphase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_phase_id ON purchase_orders(phase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_subphase_id ON purchase_orders(subphase_id);